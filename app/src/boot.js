// boot.js — entry point. Two modes:
//   * editor (default): the full Vice Cover Studio UI.
//   * shot mode (?shot=1-cover|2-editor|3-cover|4-cover): renders one fixed
//     view full-page so screenshots are reproducible. The cover shots draw
//     the exported cover itself; the editor shot shows the studio with a
//     sample photo loaded.

import { RECIPES, renderCover } from './covers.js';
import { createStudio, SAMPLES, EXPORT_SIZES } from './studio.js';

const params = new URLSearchParams(location.search);
const shot = params.get('shot') || '';

function loadFont() {
  const f = '"NotoSans-CondensedBlack"';
  return Promise.all([
    document.fonts.load(`900 100px ${f}`),
    document.fonts.load(`900 40px ${f}`),
  ]).catch(() => undefined).then(() => document.fonts.ready.catch(() => undefined));
}

function loadImages(keys) {
  const jobs = keys.map((key) => new Promise((resolve) => {
    const sample = SAMPLES.find((s) => s.key === key);
    if (!sample) return resolve(null);
    const img = new Image();
    img.onload = () => resolve([key, img]);
    img.onerror = () => resolve(null);
    img.src = sample.src;
  }));
  return Promise.all(jobs).then((pairs) => {
    const out = {};
    for (const p of pairs) if (p) out[p[0]] = p[1];
    return out;
  });
}

async function renderShotCover(recipeId, w, h) {
  document.body.classList.add('shot-mode');
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.id = 'shot-canvas';
  document.body.appendChild(canvas);
  await loadFont();
  const photos = await loadImages(['summer', 'pier', 'boulevard', 'porsche']);
  const ctx = canvas.getContext('2d');
  renderCover(ctx, recipeId, w, h, photos, RECIPES[recipeId].grade);
  window.__viceReady = true;
}

async function bootEditor() {
  const preview = document.getElementById('preview');
  const studio = createStudio(preview);
  window.__vice = {
    studio,
    exportPNG: (w, h) => studio.exportPNG(w, h),
    exportAll: () => studio.exportAll(),
    recipes: Object.keys(RECIPES),
    sizes: EXPORT_SIZES,
    framing: () => studio.framingReport(),
    setRecipe: (id) => studio.setRecipe(id),
  };

  // ---- wire the sidebar controls ----
  const $ = (id) => document.getElementById(id);

  // concept buttons
  document.querySelectorAll('[data-concept]').forEach((btn) => {
    btn.addEventListener('click', () => {
      studio.setRecipe(btn.dataset.concept);
      document.querySelectorAll('[data-concept]').forEach((b) => b.classList.toggle('active', b === btn));
      syncCaption();
    });
  });

  // grade buttons
  document.querySelectorAll('[data-grade]').forEach((btn) => {
    btn.addEventListener('click', () => {
      studio.setGrade(btn.dataset.grade);
      document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('active', b === btn));
    });
  });

  // layout buttons
  document.querySelectorAll('[data-layout]').forEach((btn) => {
    btn.addEventListener('click', () => {
      studio.setLayout(btn.dataset.layout);
      document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('active', b === btn));
    });
  });

  // caption inputs
  const titleInput = $('caption-title');
  const subInput = $('caption-sub');
  function syncCaption() {
    titleInput.value = studio.state.title;
    subInput.value = studio.state.subtitle;
  }
  titleInput.addEventListener('input', () => { studio.state.title = titleInput.value; studio.drawPreview(); });
  subInput.addEventListener('input', () => { studio.state.subtitle = subInput.value; studio.drawPreview(); });

  // export buttons
  document.querySelectorAll('[data-export]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [w, h] = btn.dataset.export.split('x').map(Number);
      studio.downloadPNG(w, h);
    });
  });
  $('export-all').addEventListener('click', () => {
    for (const s of EXPORT_SIZES) studio.downloadPNG(s.w, s.h);
  });

  // photo upload: file input + drag & drop
  const fileInput = $('photo-input');
  $('browse-btn').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    for (const f of fileInput.files) await studio.addPhotoFile(f);
    refreshPhotoList();
  });
  const dropZone = $('drop-zone');
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag'));
  dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag');
    for (const f of e.dataTransfer.files) await studio.addPhotoFile(f);
    refreshPhotoList();
  });
  $('samples-btn').addEventListener('click', async () => {
    await studio.loadSamples();
    refreshPhotoList();
  });

  function refreshPhotoList() {
    const list = $('photo-list');
    list.innerHTML = '';
    const shown = [...SAMPLES, ...Object.keys(studio.state.photos)
      .filter((k) => !SAMPLES.some((s) => s.key === k))
      .map((k) => ({ key: k, label: 'Uploaded photo', src: '' }))];
    for (const s of shown) {
      const img = studio.state.photos[s.key];
      if (!img) continue;
      const chip = document.createElement('div');
      chip.className = 'photo-chip';
      const thumb = document.createElement('img');
      thumb.src = img.src;
      thumb.alt = s.label;
      const name = document.createElement('span');
      name.textContent = s.label;
      const x = document.createElement('span');
      x.className = 'x';
      x.textContent = '×';
      x.title = 'Remove photo';
      x.addEventListener('click', () => {
        delete studio.state.photos[s.key];
        studio.drawPreview();
        refreshPhotoList();
      });
      chip.appendChild(thumb);
      chip.appendChild(name);
      chip.appendChild(x);
      list.appendChild(chip);
    }
    $('photo-count').textContent = `${Object.keys(studio.state.photos).length}/5`;
  }

  // footer info
  studio.onChange((st) => {
    const recipe = RECIPES[st.recipe];
    $('size-info').textContent = `${recipe.size[0]} × ${recipe.size[1]} · ${recipe.name} · ${st.title} · ${Object.keys(st.photos).length} photos`;
  });

  await loadFont();
  await studio.loadSamples();
  refreshPhotoList();
  syncCaption();
  studio.drawPreview();
  window.__viceReady = true;
}

if (shot === '1-cover') {
  renderShotCover('sunset', 1280, 720);
} else if (shot === '3-cover') {
  renderShotCover('strip', 1024, 1280);
} else if (shot === '4-cover') {
  renderShotCover('neon', 1280, 720);
} else {
  // 2-editor and the default view: the full studio UI
  bootEditor();
}
