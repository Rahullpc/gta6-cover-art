// editor.js — wires every control to the shared state, manages the photo roll
// (upload, drag-drop, samples), per-panel crop/zoom/drag, and the live preview.
// The preview is the export render scaled to fit the stage, so it is always
// identical to the PNG the export buttons write.
//
// v2: dragging inverts the face-safe framing engine (framing.js), so a drag can
// recompose a panel but can never push a face out of frame. The control rail is
// compact and uses a visible scrollbar so every section is reachable at 720px.

import { LAYOUTS, layoutById } from './layouts.js';
import { GRADES, gradeById } from './grades.js';
import { TITLE_COLORS } from './lettering.js';
import { PRESETS, SIZES, SAMPLE_PHOTOS, applyPreset, activeEdits, clamp, sizeById } from './state.js';
import { computeFrame, focusOf, panFromDelta } from './framing.js';
import { renderCover } from './cover.js';
import { exportPNG, exportAll } from './export.js';

const $ = (id) => document.getElementById(id);

/** Load an image element from a URL (sample path or object URL). */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${url}`));
    img.src = url;
  });
}

export function initEditor(state) {
  const preview = $('preview');
  const wrap = $('canvasWrap');
  const pctx = preview.getContext('2d');
  let fit = { x: 0, y: 0, scale: 1 };
  let renderQueued = false;
  let drag = null;

  /* ---------------------------------------------------------- rendering */

  function requestRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      paintPreview();
    });
  }

  function paintPreview() {
    const size = sizeById(state.size);
    const dpr = window.devicePixelRatio || 1;
    const cssW = wrap.clientWidth;
    const cssH = wrap.clientHeight;
    if (cssW < 10 || cssH < 10) return;
    preview.width = Math.round(cssW * dpr);
    preview.height = Math.round(cssH * dpr);
    preview.style.width = `${cssW}px`;
    preview.style.height = `${cssH}px`;
    const off = document.createElement('canvas');
    off.width = size.w;
    off.height = size.h;
    renderCover(off.getContext('2d'), state, size.w, size.h, { selection: state.selectedPanel });
    const scale = Math.min(cssW / size.w, cssH / size.h);
    const dw = size.w * scale;
    const dh = size.h * scale;
    fit = { x: (cssW - dw) / 2, y: (cssH - dh) / 2, scale };
    pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    pctx.fillStyle = '#0B0512';
    pctx.fillRect(0, 0, cssW, cssH);
    pctx.imageSmoothingQuality = 'high';
    pctx.drawImage(off, fit.x, fit.y, dw, dh);
    $('stageInfo').textContent = `${size.w} × ${size.h} · ${layoutById(state.layout).name} · ${gradeById(state.grade).name}`;
  }

  new ResizeObserver(requestRender).observe(wrap);

  /* ------------------------- custom rail scrollbar (always visible, draggable) */

  const scroller = $('railScroll');
  const track = $('railTrack');
  const thumb = $('railThumb');
  function syncRailThumb() {
    const max = scroller.scrollHeight - scroller.clientHeight;
    if (max <= 2) {
      track.style.display = 'none';
      return;
    }
    track.style.display = '';
    const th = Math.max(48, (scroller.clientHeight / scroller.scrollHeight) * track.clientHeight);
    thumb.style.height = `${th}px`;
    thumb.style.top = `${(scroller.scrollTop / max) * (track.clientHeight - th)}px`;
  }
  scroller.addEventListener('scroll', syncRailThumb);
  new ResizeObserver(syncRailThumb).observe(scroller);
  let thumbDrag = null;
  thumb.addEventListener('pointerdown', (e) => {
    thumbDrag = { y: e.clientY, top: scroller.scrollTop };
    thumb.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  thumb.addEventListener('pointermove', (e) => {
    if (!thumbDrag) return;
    const max = scroller.scrollHeight - scroller.clientHeight;
    const travel = Math.max(1, track.clientHeight - thumb.clientHeight);
    scroller.scrollTop = thumbDrag.top + ((e.clientY - thumbDrag.y) / travel) * max;
  });
  const endThumbDrag = () => {
    thumbDrag = null;
  };
  thumb.addEventListener('pointerup', endThumbDrag);
  thumb.addEventListener('pointercancel', endThumbDrag);
  syncRailThumb();

  /* ------------------------------------------------------------- photos */

  async function addFiles(files) {
    const room = 5 - state.photos.length;
    const list = [...files].filter((f) => f.type.startsWith('image/')).slice(0, room);
    for (const file of list) {
      const url = URL.createObjectURL(file);
      try {
        const img = await loadImage(url);
        state.photos.push({ img, name: file.name });
      } catch {
        URL.revokeObjectURL(url);
      }
    }
    refreshPhotoList();
    requestRender();
  }

  async function loadSamples(names = SAMPLE_PHOTOS) {
    for (const name of names) {
      if (state.photos.some((p) => p.name === `samples/${name}.jpg`)) continue;
      if (state.photos.length >= 5) break;
      const img = await loadImage(`samples/${name}.jpg`);
      state.photos.push({ img, name: `samples/${name}.jpg` });
    }
    refreshPhotoList();
    requestRender();
  }

  /** Replace the whole roll with the named samples (used by shot scenes). */
  async function resetPhotos(names) {
    state.photos = [];
    state.cropsByLayout = {};
    await loadSamples(names);
  }

  function refreshPhotoList() {
    const ul = $('photoList');
    ul.textContent = '';
    state.photos.forEach((photo, i) => {
      const li = document.createElement('li');
      const img = document.createElement('img');
      img.src = photo.img.src;
      img.alt = photo.name;
      const span = document.createElement('span');
      span.textContent = photo.name.replace(/^samples\//, '').replace(/\.[a-z]+$/i, '');
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'thumb-del';
      del.textContent = '×';
      del.title = 'Remove photo';
      del.addEventListener('click', () => {
        state.photos.splice(i, 1);
        for (const edits of Object.values(state.cropsByLayout)) {
          for (const e of edits) e.photo = state.photos.length ? e.photo % state.photos.length : 0;
        }
        refreshPhotoList();
        refreshPanelControls();
        requestRender();
      });
      li.append(img, span, del);
      ul.appendChild(li);
    });
    $('photoCount').textContent = `${state.photos.length}/5`;
    refreshPanelControls();
  }

  $('fileInput').addEventListener('change', (e) => {
    addFiles(e.target.files);
    e.target.value = '';
  });
  const dropZone = $('dropZone');
  ['dragenter', 'dragover'].forEach((ev) =>
    dropZone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropZone.classList.add('over');
    }),
  );
  ['dragleave', 'drop'].forEach((ev) =>
    dropZone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropZone.classList.remove('over');
    }),
  );
  dropZone.addEventListener('drop', (e) => addFiles(e.dataTransfer.files));
  $('samplesBtn').addEventListener('click', () => loadSamples());

  /* ------------------------------------------------------------ presets */

  const presetRow = $('presetRow');
  for (const preset of PRESETS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preset-btn';
    btn.dataset.preset = preset.id;
    btn.textContent = preset.name;
    btn.addEventListener('click', async () => {
      if (state.photos.length === 0) await loadSamples(preset.photos);
      applyPreset(state, preset);
      syncControls();
      requestRender();
      setStatus(`Preset applied: ${preset.name}. Hit an export button when it looks right.`);
    });
    presetRow.appendChild(btn);
  }

  /* ------------------------------------------------------------ layouts */

  const layoutRow = $('layoutRow');
  for (const layout of LAYOUTS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'layout-btn';
    btn.dataset.layout = layout.id;
    btn.title = layout.blurb;
    const thumb = document.createElement('canvas');
    thumb.width = 56;
    thumb.height = 38;
    const c = thumb.getContext('2d');
    const g = c.createLinearGradient(0, 0, 56, 38);
    g.addColorStop(0, '#FF2E88');
    g.addColorStop(1, '#2B0A4A');
    c.fillStyle = g;
    c.fillRect(0, 0, 56, 38);
    c.strokeStyle = '#0D001A';
    c.lineWidth = 2;
    for (const p of layout.panels(56, 38)) c.strokeRect(p.x + 1, p.y + 1, p.w - 2, p.h - 2);
    const label = document.createElement('span');
    label.textContent = layout.name;
    btn.append(thumb, label);
    btn.addEventListener('click', () => {
      state.layout = layout.id;
      state.selectedPanel = -1;
      activeEdits(state);
      syncControls();
      requestRender();
    });
    layoutRow.appendChild(btn);
  }

  /* ------------------------------------------------------------- grades */

  const gradeRow = $('gradeRow');
  for (const grade of GRADES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'grade-btn';
    btn.dataset.grade = grade.id;
    const sw = document.createElement('i');
    sw.style.background = `linear-gradient(135deg, ${grade.swatch[0]}, ${grade.swatch[1]})`;
    const label = document.createElement('span');
    label.textContent = grade.name;
    btn.append(sw, label);
    btn.addEventListener('click', () => {
      state.grade = grade.id;
      syncControls();
      requestRender();
    });
    gradeRow.appendChild(btn);
  }
  $('gradeIntensity').addEventListener('input', (e) => {
    state.intensity = Number(e.target.value) / 100;
    $('gradeIntensityVal').textContent = `${e.target.value}%`;
    requestRender();
  });

  /* ------------------------------------------------------------ caption */

  $('titleInput').addEventListener('input', (e) => {
    state.title = e.target.value;
    requestRender();
  });
  $('subInput').addEventListener('input', (e) => {
    state.subtitle = e.target.value;
    requestRender();
  });
  $('titlePos').addEventListener('change', (e) => {
    state.titlePos = e.target.value;
    requestRender();
  });
  $('titleSize').addEventListener('input', (e) => {
    state.titleScale = Number(e.target.value) / 100;
    $('titleSizeVal').textContent = `${e.target.value}%`;
    requestRender();
  });
  const colorRow = $('colorRow');
  for (const color of TITLE_COLORS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'color-btn';
    btn.dataset.color = color.id;
    btn.title = color.name;
    btn.style.background = color.swatch;
    btn.addEventListener('click', () => {
      state.titleColor = color.id;
      syncControls();
      requestRender();
    });
    colorRow.appendChild(btn);
  }

  /* ----------------------------------------------------------- stickers */

  const stickerMap = { stViceCity: 'viceCity', stLeonida: 'leonida', stStars: 'stars', stPalm: 'palm' };
  for (const [id, key] of Object.entries(stickerMap)) {
    $(id).addEventListener('change', (e) => {
      state.stickers[key] = e.target.checked;
      requestRender();
    });
  }

  /* -------------------------------------------------------- panel edits */

  function panelRects() {
    const size = sizeById(state.size);
    return layoutById(state.layout).panels(size.w, size.h);
  }

  function refreshPanelControls() {
    const sel = state.selectedPanel;
    const panels = panelRects();
    const box = $('panelControls');
    if (sel < 0 || !panels[sel]) {
      box.hidden = true;
      $('panelHint').hidden = false;
      return;
    }
    box.hidden = false;
    $('panelHint').hidden = true;
    $('panelLabel').textContent = `Panel ${sel + 1} of ${panels.length} — drag on the cover, scroll to zoom`;
    const photoSel = $('panelPhoto');
    photoSel.textContent = '';
    state.photos.forEach((photo, i) => {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = `${i + 1} · ${photo.name.replace(/^samples\//, '').replace(/\.[a-z]+$/i, '')}`;
      photoSel.appendChild(opt);
    });
    const edit = activeEdits(state)[sel];
    photoSel.value = String(edit.photo % Math.max(1, state.photos.length));
    $('panelZoom').value = String(Math.round(edit.zoom * 100));
    $('panelZoomVal').textContent = `${edit.zoom.toFixed(2)}×`;
  }

  function selectPanel(idx) {
    state.selectedPanel = idx;
    refreshPanelControls();
    requestRender();
  }

  $('panelPhoto').addEventListener('change', (e) => {
    const edit = activeEdits(state)[state.selectedPanel];
    if (!edit) return;
    edit.photo = Number(e.target.value);
    requestRender();
  });
  $('panelZoom').addEventListener('input', (e) => {
    const edit = activeEdits(state)[state.selectedPanel];
    if (!edit) return;
    edit.zoom = Number(e.target.value) / 100;
    $('panelZoomVal').textContent = `${edit.zoom.toFixed(2)}×`;
    requestRender();
  });
  $('panelReset').addEventListener('click', () => {
    const edit = activeEdits(state)[state.selectedPanel];
    if (!edit) return;
    edit.zoom = 1;
    edit.panX = 0;
    edit.panY = 0;
    refreshPanelControls();
    requestRender();
  });

  /* ------------------------------------------- pointer: select + drag */

  function coverPoint(e) {
    const rect = preview.getBoundingClientRect();
    const size = sizeById(state.size);
    const x = (e.clientX - rect.left - fit.x) / fit.scale;
    const y = (e.clientY - rect.top - fit.y) / fit.scale;
    return { x, y, inside: x >= 0 && y >= 0 && x <= size.w && y <= size.h };
  }

  function hitPanel(pt) {
    return panelRects().findIndex((p) => pt.x >= p.x && pt.x <= p.x + p.w && pt.y >= p.y && pt.y <= p.y + p.h);
  }

  function frameFor(idx) {
    const p = panelRects()[idx];
    const edit = activeEdits(state)[idx];
    const photo = state.photos[edit.photo % Math.max(1, state.photos.length)];
    if (!photo) return null;
    return computeFrame(photo.img, p, edit, focusOf(photo));
  }

  preview.addEventListener('pointerdown', (e) => {
    const pt = coverPoint(e);
    if (!pt.inside) return;
    const idx = hitPanel(pt);
    if (idx < 0) return;
    if (idx !== state.selectedPanel) selectPanel(idx);
    // On a user click, bring the crop controls into view on the short rail.
    $('panelSection').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    const frame = frameFor(idx);
    if (!frame) return;
    drag = { idx, startX: e.clientX, startY: e.clientY, frame };
    preview.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  preview.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const edit = activeEdits(state)[drag.idx];
    const dxImg = (e.clientX - drag.startX) / fit.scale / drag.frame.scale;
    const dyImg = (e.clientY - drag.startY) / fit.scale / drag.frame.scale;
    const pan = panFromDelta(drag.frame, dxImg, dyImg);
    edit.panX = pan.panX;
    edit.panY = pan.panY;
    requestRender();
  });
  const endDrag = () => {
    drag = null;
  };
  preview.addEventListener('pointerup', endDrag);
  preview.addEventListener('pointercancel', endDrag);
  preview.addEventListener('wheel', (e) => {
    if (state.selectedPanel < 0) return;
    e.preventDefault();
    const edit = activeEdits(state)[state.selectedPanel];
    edit.zoom = clamp(edit.zoom * Math.exp(-e.deltaY * 0.0012), 1, 4);
    refreshPanelControls();
    requestRender();
  }, { passive: false });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.selectedPanel >= 0) selectPanel(-1);
  });

  /* ------------------------------------------------------------- export */

  const sizeRow = $('sizeRow');
  for (const size of SIZES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'size-btn';
    btn.dataset.size = size.id;
    btn.textContent = `${size.w}×${size.h}`;
    btn.title = size.name;
    btn.addEventListener('click', () => {
      state.size = size.id;
      syncControls();
      requestRender();
    });
    sizeRow.appendChild(btn);
  }

  const exportRow = $('exportRow');
  for (const size of SIZES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'export-btn';
    btn.dataset.export = size.id;
    btn.textContent = `PNG ${size.w}×${size.h}`;
    btn.addEventListener('click', async () => {
      state.size = size.id;
      syncControls();
      requestRender();
      const name = await exportPNG(state, size.id);
      setStatus(`Saved ${name}`);
    });
    exportRow.appendChild(btn);
  }

  function setStatus(msg) {
    $('status').textContent = msg;
  }

  $('exportAll').addEventListener('click', async () => {
    setStatus('Exporting all three sizes…');
    const names = await exportAll(state, (name) => setStatus(`Saved ${name}`));
    setStatus(`Saved ${names.length} PNGs: ${names.join(', ')}`);
  });

  /* ---------------------------------------------------------- sync UI */

  function syncControls() {
    $('titleInput').value = state.title;
    $('subInput').value = state.subtitle;
    $('titlePos').value = state.titlePos;
    $('titleSize').value = String(Math.round(state.titleScale * 100));
    $('titleSizeVal').textContent = `${Math.round(state.titleScale * 100)}%`;
    $('gradeIntensity').value = String(Math.round(state.intensity * 100));
    $('gradeIntensityVal').textContent = `${Math.round(state.intensity * 100)}%`;
    for (const [id, key] of Object.entries(stickerMap)) $(id).checked = state.stickers[key];
    for (const btn of presetRow.children) btn.classList.toggle('active', btn.dataset.preset === state.lastPreset);
    for (const btn of layoutRow.children) btn.classList.toggle('active', btn.dataset.layout === state.layout);
    for (const btn of gradeRow.children) btn.classList.toggle('active', btn.dataset.grade === state.grade);
    for (const btn of colorRow.children) btn.classList.toggle('active', btn.dataset.color === state.titleColor);
    for (const btn of sizeRow.children) btn.classList.toggle('active', btn.dataset.size === state.size);
    refreshPanelControls();
  }

  syncControls();
  requestRender();

  return { requestRender, loadSamples, resetPhotos, addFiles, syncControls, setStatus, selectPanel };
}