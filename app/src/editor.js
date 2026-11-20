// Vice Nights editor — wires the controls to the live preview canvas.
//
// State lives in one object; every control mutates it and calls render().
// Dragging the preview pans the photo; the zoom slider scales it; the
// theme buttons swap the whole diagonal concept (photo, colours, lean).
// Export draws the same cover at full size on an offscreen canvas.

import { PHOTOS, SIZES, THEMES, themeById, photoById } from './themes.js';
import { drawCover } from './render.js';

const PREVIEW_MAX = 760;

export function createEditor(doc) {
  const $ = (id) => doc.getElementById(id);
  const canvas = $('preview');
  const ctx = canvas.getContext('2d');

  const state = {
    theme: THEMES[0],
    photoId: THEMES[0].photo,
    img: null,
    customImg: null,
    title: THEMES[0].title,
    subtitle: THEMES[0].subtitle,
    tagline: THEMES[0].tagline,
    zoom: 1,
    panX: 0,
    panY: 0,
    size: SIZES[0],
  };

  function previewSize() {
    const { w, h } = state.size;
    const s = Math.min(1, PREVIEW_MAX / Math.max(w, h));
    return { w: Math.round(w * s), h: Math.round(h * s), scale: s };
  }

  function render() {
    if (!state.img) return;
    const { w, h, scale } = previewSize();
    canvas.width = w;
    canvas.height = h;
    // Pan/zoom are in full-size coordinates; scale them for the preview.
    const opts = {
      title: state.title,
      subtitle: state.subtitle,
      tagline: state.tagline,
      zoom: state.zoom,
      panX: state.panX * scale,
      panY: state.panY * scale,
    };
    drawCover(ctx, state.theme, state.img, opts, w, h);
    const st = $('status');
    if (st) {
      st.textContent = `${state.theme.name} · ${state.size.label} · ${state.photoId === 'custom' ? 'foto sendiri' : photoById(state.photoId).label}`;
    }
  }

  function loadPhoto(id) {
    return new Promise((resolve, reject) => {
      const photo = photoById(id);
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = photo.file;
    });
  }

  async function setTheme(id) {
    state.theme = themeById(id);
    state.photoId = state.theme.photo;
    state.title = state.theme.title;
    state.subtitle = state.theme.subtitle;
    state.tagline = state.theme.tagline;
    state.zoom = 1;
    state.panX = 0;
    state.panY = 0;
    state.img = await loadPhoto(state.photoId);
    syncInputs();
    render();
  }

  async function setPhoto(id) {
    state.photoId = id;
    state.img = await loadPhoto(id);
    state.zoom = 1;
    state.panX = 0;
    state.panY = 0;
    render();
  }

  function setCustomPhoto(img) {
    state.photoId = 'custom';
    state.customImg = img;
    state.img = img;
    state.zoom = 1;
    state.panX = 0;
    state.panY = 0;
    render();
  }

  function syncInputs() {
    const t = $('titleIn');
    const s = $('subIn');
    const g = $('tagIn');
    if (t) t.value = state.title.replace(/\n/g, ' ');
    if (s) s.value = state.subtitle;
    if (g) g.value = state.tagline;
  }

  function buildButtons() {
    const tr = $('themeRow');
    if (tr) {
      tr.innerHTML = '';
      for (const t of THEMES) {
        const b = doc.createElement('button');
        b.type = 'button';
        b.className = 'chip';
        b.textContent = t.name;
        b.style.setProperty('--sw', t.colours.from);
        b.onclick = () => setTheme(t.id);
        tr.appendChild(b);
      }
    }
    const pr = $('photoRow');
    if (pr) {
      pr.innerHTML = '';
      for (const p of PHOTOS) {
        const b = doc.createElement('button');
        b.type = 'button';
        b.className = 'chip';
        b.textContent = p.label;
        b.onclick = () => setPhoto(p.id);
        pr.appendChild(b);
      }
    }
    const sr = $('sizeRow');
    if (sr) {
      sr.innerHTML = '';
      for (const s of SIZES) {
        const b = doc.createElement('button');
        b.type = 'button';
        b.className = 'chip';
        b.textContent = s.label;
        b.onclick = () => {
          state.size = s;
          render();
        };
        sr.appendChild(b);
      }
    }
  }

  function bindInputs() {
    const t = $('titleIn');
    if (t) t.addEventListener('input', () => {
      // One line becomes the first title line; a second word group after
      // a dash becomes the second line, so the two-line stack is kept.
      const words = t.value.trim().split(/\s+/).filter(Boolean);
      const half = Math.ceil(words.length / 2);
      state.title = words.slice(0, half).join(' ').toUpperCase()
        + (words.length > 1 ? '\n' + words.slice(half).join(' ').toUpperCase() : '');
      render();
    });
    const s = $('subIn');
    if (s) s.addEventListener('input', () => { state.subtitle = s.value.toUpperCase(); render(); });
    const g = $('tagIn');
    if (g) g.addEventListener('input', () => { state.tagline = g.value; render(); });
    const z = $('zoomIn');
    if (z) z.addEventListener('input', () => {
      state.zoom = Number(z.value);
      const zv = $('zoomVal');
      if (zv) zv.textContent = `${Math.round(state.zoom * 100)}%`;
      render();
    });
    const up = $('upload');
    if (up) up.addEventListener('change', () => {
      const file = up.files && up.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => setCustomPhoto(img);
        img.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });
    const eb = $('exportBtn');
    if (eb) eb.addEventListener('click', () => exportPNG());
    const rb = $('resetBtn');
    if (rb) rb.addEventListener('click', () => {
      state.zoom = 1;
      state.panX = 0;
      state.panY = 0;
      if (z) z.value = '1';
      render();
    });
  }

  // Drag the preview to pan the photo (in full-size coordinates).
  function bindDrag() {
    let dragging = false;
    let lx = 0;
    let ly = 0;
    canvas.addEventListener('pointerdown', (e) => {
      dragging = true;
      lx = e.clientX;
      ly = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const { scale } = previewSize();
      state.panX += (e.clientX - lx) / scale;
      state.panY += (e.clientY - ly) / scale;
      lx = e.clientX;
      ly = e.clientY;
      render();
    });
    canvas.addEventListener('pointerup', () => { dragging = false; });
    canvas.addEventListener('pointercancel', () => { dragging = false; });
  }

  // Full-size export. Returns { dataUrl, w, h } for tests, and also
  // triggers a download in a real browser.
  async function exportPNG(sizeId) {
    const size = sizeId ? SIZES.find((s) => s.id === sizeId) ?? state.size : state.size;
    const off = doc.createElement('canvas');
    off.width = size.w;
    off.height = size.h;
    const octx = off.getContext('2d');
    drawCover(octx, state.theme, state.img, {
      title: state.title,
      subtitle: state.subtitle,
      tagline: state.tagline,
      zoom: state.zoom,
      panX: state.panX,
      panY: state.panY,
    }, size.w, size.h);
    const dataUrl = off.toDataURL('image/png');
    if (!sizeId) {
      const a = doc.createElement('a');
      a.href = dataUrl;
      a.download = `vice-nights-${state.theme.id}-${size.w}x${size.h}.png`;
      a.click();
    }
    return { dataUrl, w: size.w, h: size.h };
  }

  buildButtons();
  bindInputs();
  bindDrag();

  return {
    state,
    render,
    setTheme,
    setPhoto,
    exportPNG,
    // Test hook: render one theme at one size and hand back the PNG.
    async shot(themeId, sizeId) {
      await setTheme(themeId);
      const size = SIZES.find((s) => s.id === sizeId) ?? state.size;
      state.size = size;
      render();
      return exportPNG(sizeId);
    },
  };
}
