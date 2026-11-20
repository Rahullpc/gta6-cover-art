// studio.js — the editor: state, live preview, export, and shot mode.
// The page shell lives in index.html; this module wires it up.

import * as ink from './ink.js';
import { PHOTOS, PHOTO_ORDER, loadPhotos } from './photos.js';
import { CONCEPTS, LAYOUTS, LAYOUT_ORDER, conceptById, renderConcept, framingCheck } from './concepts.js';

export const SIZES = [
  { id: '1080x1080', label: '1080 × 1080', w: 1080, h: 1080 },
  { id: '1080x1350', label: '1080 × 1350', w: 1080, h: 1350 },
  { id: '1920x1080', label: '1920 × 1080', w: 1920, h: 1080 },
];

const GRADES = [
  { id: 'sunset', name: 'Sunset', from: '#ff7a2e', to: '#e8325e' },
  { id: 'neon', name: 'Neon', from: '#19c8e8', to: '#7a2a6e' },
  { id: 'pink', name: 'Vice Pink', from: '#ff2e88', to: '#7a2a6e' },
  { id: 'gold', name: 'Golden', from: '#ffc93a', to: '#ff7a2e' },
];

// The app state. Caption edits flow into the cover through `caps()`.
export const state = {
  concept: 'sunset',
  layout: 'sunsetHero',
  grade: 'sunset',
  size: '1920x1080',
  title: 'SUNSET HEIST',
  subtitle: 'A VICE CITY STORY',
  tagline: '',
  photos: [...PHOTO_ORDER],
};

export function caps() {
  // The big title is one line for most concepts, two for the strip.
  const lines = state.concept === 'strip' ? state.title.split(/\s+/).length > 1 && state.title.includes(' ')
    ? splitTitle(state.title)
    : [state.title] : [state.title];
  return { title: lines, subtitle: state.subtitle, tagline: state.tagline };
}

function splitTitle(text) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return words;
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
}

let imgs = null;
let preview = null;
let statusEl = null;

function currentConcept() {
  return conceptById(state.concept);
}

function currentSize() {
  return SIZES.find((s) => s.id === state.size) || SIZES[2];
}

// Render the current concept into the preview canvas (scaled to fit).
export function renderPreview() {
  if (!imgs || !preview) return;
  const concept = currentConcept();
  const size = currentSize();
  const off = renderConcept(concept, imgs, size.w, size.h, caps());
  const box = preview.parentElement.getBoundingClientRect();
  const scale = Math.min(box.width / size.w, box.height / size.h, 1);
  preview.width = Math.max(2, Math.round(size.w * scale));
  preview.height = Math.max(2, Math.round(size.h * scale));
  const ctx = preview.getContext('2d');
  ctx.drawImage(off, 0, 0, preview.width, preview.height);
  updateStatus();
}

function updateStatus() {
  if (!statusEl) return;
  const concept = currentConcept();
  const size = currentSize();
  const layout = LAYOUTS[state.layout];
  statusEl.textContent = `${size.w} × ${size.h} · ${layout ? layout.name : concept.name} · ${concept.name} · ${state.photos.length} photos`;
}

// Export the current cover as a PNG download at the chosen size.
export async function exportPNG() {
  const concept = currentConcept();
  const size = currentSize();
  const canvas = renderConcept(concept, imgs, size.w, size.h, caps());
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `vice-cover-${concept.id}-${size.id}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

// Export every concept at every size. Returns a list of {name, blob}.
export async function exportAll() {
  const out = [];
  for (const concept of CONCEPTS) {
    const saved = { ...caps() };
    // each concept exports with its own titles
    const c = { title: concept.titles.title, subtitle: concept.titles.subtitle, tagline: '' };
    for (const size of SIZES) {
      const canvas = renderConcept(concept, imgs, size.w, size.h, c);
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
      out.push({ name: `${concept.id}-${size.id}.png`, blob, concept: concept.id, size: size.id });
    }
    void saved;
  }
  return out;
}

// Build the little pink panel diagrams for the layout buttons.
function miniDiagram(layoutId) {
  const layout = LAYOUTS[layoutId];
  const box = document.createElement('div');
  box.className = 'mini-diagram';
  for (const p of layout.panels) {
    const d = document.createElement('div');
    d.className = 'mini-panel';
    d.style.left = `${p.x * 100}%`;
    d.style.top = `${p.y * 100}%`;
    d.style.width = `${p.w * 100}%`;
    d.style.height = `${p.h * 100}%`;
    box.appendChild(d);
  }
  return box;
}

function buildSidebar() {
  // concept buttons
  const conceptBox = document.getElementById('concept-btns');
  conceptBox.innerHTML = '';
  for (const c of CONCEPTS) {
    const b = document.createElement('button');
    b.className = 'chip' + (state.concept === c.id ? ' active' : '');
    b.textContent = c.name;
    b.onclick = () => {
      state.concept = c.id;
      state.layout = c.layout;
      state.title = c.titles.title.join(' ');
      state.subtitle = c.titles.subtitle;
      syncCaptionInputs();
      syncActiveButtons();
      renderPreview();
    };
    conceptBox.appendChild(b);
  }
  // layout buttons
  const layoutBox = document.getElementById('layout-btns');
  layoutBox.innerHTML = '';
  for (const id of LAYOUT_ORDER) {
    const b = document.createElement('button');
    b.className = 'layout-btn' + (state.layout === id ? ' active' : '');
    b.appendChild(miniDiagram(id));
    const label = document.createElement('span');
    label.textContent = LAYOUTS[id].name;
    b.appendChild(label);
    b.onclick = () => {
      state.layout = id;
      syncActiveButtons();
      renderPreview();
    };
    layoutBox.appendChild(b);
  }
  // grade swatches
  const gradeBox = document.getElementById('grade-swatches');
  gradeBox.innerHTML = '';
  for (const g of GRADES) {
    const b = document.createElement('button');
    b.className = 'swatch' + (state.grade === g.id ? ' active' : '');
    b.style.background = `linear-gradient(135deg, ${g.from}, ${g.to})`;
    b.title = g.name;
    b.onclick = () => {
      state.grade = g.id;
      syncActiveButtons();
      renderPreview();
    };
    gradeBox.appendChild(b);
  }
  // size buttons
  const sizeBox = document.getElementById('size-btns');
  sizeBox.innerHTML = '';
  for (const s of SIZES) {
    const b = document.createElement('button');
    b.className = 'chip' + (state.size === s.id ? ' active' : '');
    b.textContent = s.label;
    b.onclick = () => {
      state.size = s.id;
      syncActiveButtons();
      renderPreview();
    };
    sizeBox.appendChild(b);
  }
}

function syncActiveButtons() {
  document.querySelectorAll('#concept-btns .chip').forEach((b, i) => {
    b.classList.toggle('active', CONCEPTS[i].id === state.concept);
  });
  document.querySelectorAll('#layout-btns .layout-btn').forEach((b, i) => {
    b.classList.toggle('active', LAYOUT_ORDER[i] === state.layout);
  });
  document.querySelectorAll('#grade-swatches .swatch').forEach((b, i) => {
    b.classList.toggle('active', GRADES[i].id === state.grade);
  });
  document.querySelectorAll('#size-btns .chip').forEach((b, i) => {
    b.classList.toggle('active', SIZES[i].id === state.size);
  });
}

function syncCaptionInputs() {
  const t = document.getElementById('cap-title');
  const s = document.getElementById('cap-sub');
  if (t) t.value = state.title;
  if (s) s.value = state.subtitle;
}

function buildThumbs() {
  const box = document.getElementById('thumbs');
  if (!box) return;
  box.innerHTML = '';
  for (const id of state.photos) {
    const p = PHOTOS[id];
    const chip = document.createElement('div');
    chip.className = 'thumb';
    const img = document.createElement('img');
    img.src = p.src;
    img.alt = id;
    const label = document.createElement('span');
    label.textContent = id;
    const x = document.createElement('button');
    x.className = 'thumb-x';
    x.textContent = '×';
    x.onclick = () => {
      state.photos = state.photos.filter((q) => q !== id);
      buildThumbs();
      renderPreview();
    };
    chip.append(img, label, x);
    box.appendChild(chip);
  }
  const count = document.getElementById('photo-count');
  if (count) count.textContent = `${state.photos.length}/5`;
}

// Boot for shot mode: load the font + photos, then paint the shot scene.
// Shot 2 is the editor itself, so it builds the full editor UI.
export async function bootForShot() {
  try {
    const face = new FontFace(ink.FONT, "url('fonts/NotoSans-CondensedBlack.ttf')");
    await face.load();
    document.fonts.add(face);
  } catch (e) {
    console.warn('font load failed, falling back', e);
  }
  imgs = await loadPhotos();
  preview = document.getElementById('preview');
  statusEl = document.getElementById('status');
  const shot = new URLSearchParams(location.search).get('shot');
  if (shot === '2') {
    buildEditorUI();
    return true;
  }
  await runShotMode();
  return true;
}

// Shot mode: ?shot=1..4 renders one scene full-frame for screenshotting.
// 1 = Sunset Hero cover, 2 = the editor, 3 = Vice Strip cover, 4 = Neon Night.
export async function runShotMode() {
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  if (!shot) return false;
  await document.fonts.ready;
  if (shot === '2') {
    document.body.dataset.ready = '1';
    return true; // editor shows as normal
  }
  const map = { 1: 'sunset', 3: 'strip', 4: 'neon' };
  const concept = conceptById(map[shot] || 'sunset');
  const size = SIZES.find((s) => s.w === +params.get('w') || 0) || { w: concept.native[0], h: concept.native[1] };
  const w = +(params.get('w') || concept.native[0]);
  const h = +(params.get('h') || concept.native[1]);
  void size;
  document.body.classList.add('shot-mode');
  const canvas = renderConcept(concept, imgs, w, h, concept.titles);
  canvas.id = 'shot-canvas';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.objectFit = 'contain';
  canvas.style.display = 'block';
  canvas.style.background = '#000';
  document.body.innerHTML = '';
  document.body.appendChild(canvas);
  document.body.dataset.ready = '1';
  return true;
}

// Framing report for the verification step (runs in the page).
export function framingReport() {
  const out = {};
  for (const concept of CONCEPTS) {
    for (const size of SIZES) {
      const r = framingCheck(concept, size.w, size.h);
      out[`${concept.id}-${size.id}`] = r;
    }
  }
  return out;
}

// Build the editor UI (sidebar, thumbnails, caption wiring) and paint the
// first preview. Shared by the normal boot and by shot 2.
function buildEditorUI() {
  buildSidebar();
  buildThumbs();
  syncCaptionInputs();
  const titleInput = document.getElementById('cap-title');
  const subInput = document.getElementById('cap-sub');
  if (titleInput) titleInput.addEventListener('input', () => { state.title = titleInput.value; renderPreview(); });
  if (subInput) subInput.addEventListener('input', () => { state.subtitle = subInput.value; renderPreview(); });
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) exportBtn.addEventListener('click', exportPNG);
  const samplesBtn = document.getElementById('use-samples');
  if (samplesBtn) samplesBtn.addEventListener('click', () => {
    state.photos = [...PHOTO_ORDER];
    buildThumbs();
    renderPreview();
  });
  window.addEventListener('resize', renderPreview);
  renderPreview();
  document.body.dataset.ready = '1';
}

// Boot the editor (normal mode).
export async function bootEditor() {
  // load the display font, then the photos
  try {
    const face = new FontFace(ink.FONT, "url('fonts/NotoSans-CondensedBlack.ttf')");
    await face.load();
    document.fonts.add(face);
  } catch (e) {
    console.warn('font load failed, falling back', e);
  }
  imgs = await loadPhotos();
  preview = document.getElementById('preview');
  statusEl = document.getElementById('status');
  buildEditorUI();
}
