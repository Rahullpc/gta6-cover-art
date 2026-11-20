// editor.js — all editor controls and interactions for Vice Cover
// Studio v26.
import { paintCover, exportCanvas } from './cover.js';
import { TILINGS, panelRects, tilingById } from './layouts.js';
import { TINTS } from './grades.js';
import { PRESETS, usePreset, freshCrops } from './state.js';
import { panFromDrag } from './framing.js';
import { savePNG, saveAll, pngDataURL } from './export.js';

const $ = id => document.getElementById(id);

export function newEditor(studio, canvas) {
  const ed = {
    studio, canvas,
    ctx: canvas.getContext('2d'),
    view: { scale: 1, ox: 0, oy: 0, cw: 0, ch: 0 },
    drag: null,
    status: msg => { const el = $('statusLine'); if (el) el.textContent = msg; },
    info: () => {
      const el = $('infoLine');
      if (!el) return;
      const tiling = tilingById(studio.layout);
      const tint = TINTS.find(g => g.id === studio.grade);
      const size = { square: '1080 × 1080', portrait: '1080 × 1350', landscape: '1920 × 1080' }[studio.size];
      el.textContent = `${size} · ${tiling.name} · ${tint ? tint.name : studio.grade} · ${studio.photos.length} photo${studio.photos.length === 1 ? '' : 's'}`;
    },
  };

  ed.fit = function () {
    const wrap = $('stageWrap');
    if (!wrap) return;
    const r = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const cw = Math.max(50, Math.floor(r.width));
    const ch = Math.max(50, Math.floor(r.height));
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
    const size = { square: [1080, 1080], portrait: [1080, 1350], landscape: [1920, 1080] }[studio.size];
    const s = Math.min(cw / size[0], ch / size[1]);
    ed.view = { scale: s * dpr, ox: (cw - size[0] * s) / 2 * dpr, oy: (ch - size[1] * s) / 2 * dpr, cw, ch };
  };

  ed.repaint = function () {
    ed.fit();
    const ctx = ed.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0A0512';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const size = { square: [1080, 1080], portrait: [1080, 1350], landscape: [1920, 1080] }[studio.size];
    const off = document.createElement('canvas');
    off.width = size[0]; off.height = size[1];
    paintCover(off.getContext('2d'), studio, size[0], size[1], { editor: true });
    ctx.drawImage(off, ed.view.ox, ed.view.oy, size[0] * ed.view.scale, size[1] * ed.view.scale);
    ed.info();
  };

  ed.toCover = function (cx, cy) {
    const size = { square: [1080, 1080], portrait: [1080, 1350], landscape: [1920, 1080] }[studio.size];
    return { x: (cx - ed.view.ox) / ed.view.scale, y: (cy - ed.view.oy) / ed.view.scale, w: size[0], h: size[1] };
  };

  ed.pickPanel = function (cx, cy) {
    const p = ed.toCover(cx, cy);
    const tiling = tilingById(studio.layout);
    const panels = panelRects(tiling, p.w, p.h);
    for (let i = panels.length - 1; i >= 0; i--) {
      const r = panels[i];
      if (p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h) return i;
    }
    return -1;
  };

  ed.refreshCropUI = function () {
    const sec = $('cropSection');
    if (!sec) return;
    const sel = studio.selected;
    const tiling = tilingById(studio.layout);
    const panels = panelRects(tiling, 1920, 1080);
    if (sel < 0 || !panels[sel]) {
      $('cropDetail').style.display = 'none';
      $('cropHint').style.display = 'block';
      return;
    }
    $('cropHint').style.display = 'none';
    $('cropDetail').style.display = 'block';
    $('cropLabel').textContent = `Panel ${sel + 1} · ${panels[sel].tag}`;
    const crops = studio.cropsFor(studio.layout);
    const crop = crops[sel];
    const selEl = $('cropPhoto');
    selEl.innerHTML = '';
    studio.photos.forEach((p, i) => {
      const o = document.createElement('option');
      o.value = i; o.textContent = p.name;
      selEl.appendChild(o);
    });
    selEl.value = String(crop.photo);
    $('cropZoom').value = crop.zoom;
    $('cropZoomVal').textContent = crop.zoom.toFixed(2) + '×';
  };

  ed.refreshThumbs = function () {
    const list = $('photoList');
    if (!list) return;
    list.innerHTML = '';
    studio.photos.forEach((p, i) => {
      const chip = document.createElement('div');
      chip.className = 'thumb';
      const im = document.createElement('img');
      im.src = p.img.src; im.alt = p.name;
      const lb = document.createElement('span');
      lb.textContent = p.name;
      const rm = document.createElement('button');
      rm.className = 'thumb-x'; rm.textContent = '×'; rm.title = 'Remove';
      rm.onclick = () => {
        studio.photos.splice(i, 1);
        for (const k of Object.keys(studio.crops)) {
          for (const c of studio.crops[k]) c.photo = c.photo >= studio.photos.length ? 0 : c.photo;
        }
        ed.refreshThumbs(); ed.refreshCropUI(); ed.repaint();
        $('photoCount').textContent = `${studio.photos.length}/5`;
      };
      chip.appendChild(im); chip.appendChild(lb); chip.appendChild(rm);
      list.appendChild(chip);
    });
    $('photoCount').textContent = `${studio.photos.length}/5`;
  };

  ed.loadFiles = function (files) {
    const imgs = [...files].filter(f => f.type.startsWith('image/')).slice(0, 5 - studio.photos.length);
    if (imgs.length === 0) { ed.status('No image files — at most 5 photos.'); return; }
    let pending = imgs.length;
    for (const f of imgs) {
      const img = new Image();
      img.onload = () => {
        studio.photos.push({ img, name: f.name.replace(/\.[^.]+$/, '') });
        if (--pending === 0) {
          studio.crops = {};
          ed.refreshThumbs(); ed.refreshCropUI(); ed.repaint();
          ed.status(`${studio.photos.length} photo${studio.photos.length === 1 ? '' : 's'} loaded.`);
        }
      };
      img.src = URL.createObjectURL(f);
    }
  };

  ed.loadSamples = async function () {
    const names = ['boulevard', 'pier', 'porsche', 'summer'];
    studio.photos = [];
    for (const n of names) {
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = `samples/${n}.jpg`; });
      studio.photos.push({ img, name: n });
    }
    studio.crops = {};
    ed.refreshThumbs(); ed.refreshCropUI(); ed.repaint();
    ed.status('Sample photos loaded — click any panel to crop, then export.');
  };

  // ---- wire the rail ----
  function buildPresets() {
    const box = $('conceptRow');
    box.innerHTML = '';
    for (const name of Object.keys(PRESETS)) {
      const b = document.createElement('button');
      b.className = 'concept-btn' + (studio.concept === name ? ' active' : '');
      b.textContent = name;
      b.onclick = async () => {
        if (studio.photos.length === 0) await loadSamplesNow(studio);
        usePreset(studio, name);
        document.querySelectorAll('.concept-btn').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        syncCaptionUI(); syncTintUI(); syncTilingUI(); syncStickerUI(); syncSizeUI();
        ed.refreshThumbs(); ed.refreshCropUI(); ed.repaint();
        ed.status(`Concept applied: ${name}.`);
      };
      box.appendChild(b);
    }
  }

  function buildTilings() {
    const box = $('layoutRow');
    box.innerHTML = '';
    for (const l of TILINGS) {
      const b = document.createElement('button');
      b.className = 'layout-btn' + (studio.layout === l.id ? ' active' : '');
      const cv = document.createElement('canvas');
      cv.width = 72; cv.height = 48;
      const g = cv.getContext('2d');
      g.fillStyle = '#241239'; g.fillRect(0, 0, 72, 48);
      g.fillStyle = '#FF2E88';
      for (const p of l.panels(72, 48)) g.fillRect(p.x * 72 + 1, p.y * 48 + 1, p.w * 72 - 2, p.h * 48 - 2);
      const lb = document.createElement('span');
      lb.textContent = l.name;
      b.appendChild(cv); b.appendChild(lb);
      b.onclick = () => {
        studio.layout = l.id;
        studio.selected = -1;
        document.querySelectorAll('.layout-btn').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        ed.refreshCropUI(); ed.repaint();
        ed.status(`Layout: ${l.name}.`);
      };
      box.appendChild(b);
    }
  }

  function buildTints() {
    const box = $('gradeRow');
    box.innerHTML = '';
    const swatches = {
      sunset: ['#FF2E88', '#FF7A18'], neonNight: ['#00E5FF', '#141E46'],
      goldenHour: ['#FFD60A', '#D25418'], vicePink: ['#FF2E88', '#7B2FBE'],
      tealNoir: ['#14B8A6', '#08222A'], ultraviolet: ['#7B2FBE', '#2B0A4A'],
    };
    for (const g of TINTS) {
      const b = document.createElement('button');
      b.className = 'grade-btn' + (studio.grade === g.id ? ' active' : '');
      const sw = document.createElement('span');
      sw.className = 'swatch';
      sw.style.background = `linear-gradient(90deg, ${swatches[g.id][0]}, ${swatches[g.id][1]})`;
      const lb = document.createElement('span');
      lb.textContent = g.name;
      b.appendChild(sw); b.appendChild(lb);
      b.onclick = () => {
        studio.grade = g.id;
        document.querySelectorAll('.grade-btn').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        ed.repaint();
        ed.status(`Grade: ${g.name}.`);
      };
      box.appendChild(b);
    }
  }

  function syncCaptionUI() {
    $('titleInput').value = studio.title;
    $('subInput').value = studio.subtitle;
    $('placeSelect').value = studio.placement;
    $('sizeSlider').value = Math.round(studio.titleScale * 100);
    document.querySelectorAll('.colour-sw').forEach(el => {
      el.classList.toggle('active', el.dataset.colour === studio.titleColour);
    });
  }
  function syncTintUI() {
    document.querySelectorAll('.grade-btn').forEach((el, i) => {
      el.classList.toggle('active', TINTS[i].id === studio.grade);
    });
    $('intensitySlider').value = Math.round(studio.intensity * 100);
    $('intensityVal').textContent = Math.round(studio.intensity * 100) + '%';
  }
  function syncTilingUI() {
    document.querySelectorAll('.layout-btn').forEach((el, i) => {
      el.classList.toggle('active', TILINGS[i].id === studio.layout);
    });
  }
  function syncStickerUI() {
    $('stVice').checked = studio.stickers.vice;
    $('stLeonida').checked = studio.stickers.leonida;
    $('stStars').checked = studio.stickers.stars;
    $('stPalm').checked = studio.stickers.palm;
  }
  function syncSizeUI() {
    document.querySelectorAll('.size-btn').forEach(el => {
      el.classList.toggle('active', el.dataset.size === studio.size);
    });
  }

  function wireStatic() {
    $('browseBtn').onclick = () => $('fileInput').click();
    $('fileInput').addEventListener('change', e => { ed.loadFiles(e.target.files); e.target.value = ''; });
    $('samplesBtn').onclick = () => ed.loadSamples();
    const dz = $('dropZone');
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('over'));
    dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('over'); ed.loadFiles(e.dataTransfer.files); });
    $('titleInput').addEventListener('input', e => { studio.title = e.target.value.slice(0, 48); ed.repaint(); });
    $('subInput').addEventListener('input', e => { studio.subtitle = e.target.value.slice(0, 60); ed.repaint(); });
    $('placeSelect').addEventListener('change', e => { studio.placement = e.target.value; ed.repaint(); });
    $('sizeSlider').addEventListener('input', e => { studio.titleScale = e.target.value / 100; ed.repaint(); });
    document.querySelectorAll('.colour-sw').forEach(el => {
      el.onclick = () => {
        studio.titleColour = el.dataset.colour;
        document.querySelectorAll('.colour-sw').forEach(x => x.classList.remove('active'));
        el.classList.add('active');
        ed.repaint();
      };
    });
    $('intensitySlider').addEventListener('input', e => {
      studio.intensity = e.target.value / 100;
      $('intensityVal').textContent = e.target.value + '%';
      ed.repaint();
    });
    $('stVice').addEventListener('change', e => { studio.stickers.vice = e.target.checked; ed.repaint(); });
    $('stLeonida').addEventListener('change', e => { studio.stickers.leonida = e.target.checked; ed.repaint(); });
    $('stStars').addEventListener('change', e => { studio.stickers.stars = e.target.checked; ed.repaint(); });
    $('stPalm').addEventListener('change', e => { studio.stickers.palm = e.target.checked; ed.repaint(); });
    $('cropPhoto').addEventListener('change', e => {
      const crops = studio.cropsFor(studio.layout);
      crops[studio.selected].photo = Number(e.target.value);
      ed.repaint();
    });
    $('cropZoom').addEventListener('input', e => {
      const crops = studio.cropsFor(studio.layout);
      crops[studio.selected].zoom = Number(e.target.value);
      $('cropZoomVal').textContent = Number(e.target.value).toFixed(2) + '×';
      ed.repaint();
    });
    $('cropReset').onclick = () => {
      const crops = studio.cropsFor(studio.layout);
      crops[studio.selected] = { photo: studio.selected % Math.max(1, studio.photos.length), zoom: 1, panX: 0, panY: 0, kind: 'face' };
      ed.refreshCropUI(); ed.repaint();
      ed.status('Crop reset.');
    };
    document.querySelectorAll('.size-btn').forEach(el => {
      el.onclick = () => {
        studio.size = el.dataset.size;
        syncSizeUI(); ed.repaint();
      };
    });
    $('expSquare').onclick = () => savePNG(studio, 'square', ed);
    $('expPortrait').onclick = () => savePNG(studio, 'portrait', ed);
    $('expLandscape').onclick = () => savePNG(studio, 'landscape', ed);
    $('expAll').onclick = () => saveAll(studio, ed);
  }

  function wireCanvas() {
    canvas.addEventListener('pointerdown', e => {
      const r = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const idx = ed.pickPanel((e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr);
      if (idx < 0) { studio.selected = -1; ed.refreshCropUI(); ed.repaint(); return; }
      studio.selected = idx;
      ed.drag = { x: e.clientX, y: e.clientY, moved: false };
      ed.refreshCropUI();
      const sec = $('cropSection');
      if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      ed.repaint();
    });
    canvas.addEventListener('pointermove', e => {
      if (!ed.drag || studio.selected < 0) return;
      const dx = e.clientX - ed.drag.x, dy = e.clientY - ed.drag.y;
      if (Math.abs(dx) + Math.abs(dy) < 2 && !ed.drag.moved) return;
      ed.drag.moved = true;
      const crops = studio.cropsFor(studio.layout);
      const crop = crops[studio.selected];
      const tiling = tilingById(studio.layout);
      const size = { square: [1080, 1080], portrait: [1080, 1350], landscape: [1920, 1080] }[studio.size];
      const panels = panelRects(tiling, size[0], size[1]);
      const panel = panels[studio.selected];
      const pan = panFromDrag(crop, panel, dx / ed.view.scale * (window.devicePixelRatio || 1), dy / ed.view.scale * (window.devicePixelRatio || 1));
      crop.panX = pan.panX; crop.panY = pan.panY;
      ed.drag.x = e.clientX; ed.drag.y = e.clientY;
      ed.repaint();
    });
    window.addEventListener('pointerup', () => { ed.drag = null; });
    canvas.addEventListener('wheel', e => {
      if (studio.selected < 0) return;
      e.preventDefault();
      const crops = studio.cropsFor(studio.layout);
      const crop = crops[studio.selected];
      crop.zoom = Math.max(1, Math.min(4, crop.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
      $('cropZoom').value = crop.zoom;
      $('cropZoomVal').textContent = crop.zoom.toFixed(2) + '×';
      ed.repaint();
    }, { passive: false });
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && studio.selected >= 0) {
        studio.selected = -1; ed.refreshCropUI(); ed.repaint();
      }
    });
    new ResizeObserver(() => ed.repaint()).observe($('stageWrap'));
  }

  buildPresets(); buildTilings(); buildTints(); wireStatic(); wireCanvas();
  syncCaptionUI(); syncTintUI(); syncStickerUI(); syncSizeUI();
  ed.refreshThumbs(); ed.refreshCropUI();
  return ed;
}

// Synchronous sample loader used when a preset needs the roll now.
export async function loadSamplesNow(studio) {
  const names = ['boulevard', 'pier', 'porsche', 'summer'];
  studio.photos = [];
  for (const n of names) {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = `samples/${n}.jpg`; });
    studio.photos.push({ img, name: n });
  }
  studio.crops = {};
}
