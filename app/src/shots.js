// shots.js — reproducible screenshot scenes driven by the URL query
// string for Vice Cover Studio v26.
// ?shot=cover|editor &preset=<concept> &size=<square|portrait|landscape>
// &caption=<title> &sub=<subtitle> &photo=<sample>
// Both scenes share one preparation step; two animation frames after the
// paint, window.__shotReady flips true so a screenshot script can wait
// on it.

import { usePreset } from './state.js';

export async function playShot(studio, ed, params) {
  const preset = params.get('preset') || 'Sunset Beach Heist';
  const size = params.get('size');
  const caption = params.get('caption');
  const sub = params.get('sub');
  const extraPhoto = params.get('photo');
  const shot = params.get('shot') || 'cover';

  if (studio.photos.length === 0) await ed.loadSamples();
  if (extraPhoto) {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = `samples/${extraPhoto}.jpg`; });
    studio.photos.push({ img, name: extraPhoto });
  }
  usePreset(studio, preset);
  if (size && ['square', 'portrait', 'landscape'].includes(size)) studio.size = size;
  if (caption !== null) studio.title = caption;
  if (sub !== null) studio.subtitle = sub;
  studio.selected = -1;
  ed.refreshThumbs(); ed.refreshCropUI();

  if (shot === 'cover') {
    // Render the exported cover at the post size through the exact export
    // path and blit it full-bleed onto the viewport canvas.
    const { exportCanvas, SHEET_SIZES } = await import('./cover.js');
    const sizeDef = SHEET_SIZES[studio.size];
    const cover = exportCanvas(studio, studio.size);
    const cv = ed.canvas;
    const dpr = window.devicePixelRatio || 1;
    const vw = window.innerWidth, vh = window.innerHeight;
    cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
    cv.style.width = vw + 'px'; cv.style.height = vh + 'px';
    const g = cv.getContext('2d');
    g.fillStyle = '#0D001A';
    g.fillRect(0, 0, cv.width, cv.height);
    const s = Math.min(cv.width / sizeDef.w, cv.height / sizeDef.h);
    const dw = sizeDef.w * s, dh = sizeDef.h * s;
    g.drawImage(cover, (cv.width - dw) / 2, (cv.height - dh) / 2, dw, dh);
    document.body.classList.add('shot-cover');
  } else {
    // Editor scene: full editor, samples loaded, first panel selected.
    studio.selected = 0;
    ed.repaint();
    ed.refreshCropUI();
    ed.status('Sample photos loaded — click any panel to crop, then export.');
    document.body.classList.add('shot-editor');
  }

  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  window.__shotReady = true;
}
