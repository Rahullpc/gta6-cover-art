// shots.js — reproducible screenshot scenes.
// ?shot=cover renders the EXPORTED cover full-bleed (the exact export render
// path, blitted to the viewport); ?shot=editor shows the full editor with photos
// loaded. Extra params: photo=<sample>, caption=<title>, sub=<text>,
// preset=<concept id>, size=<post size>. window.__shotReady flips true once
// fonts, photos and paint are done, so a screenshot script can wait on it.

import { applyPreset, presetById, SIZES } from './state.js';

// Two animation frames after the paint, so the compositor has the final pixels.
function markReady() {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      window.__shotReady = true;
    }),
  );
}

// Blit an export-resolution canvas onto the viewport-sized preview canvas.
function blitCover(out) {
  const preview = document.getElementById('preview');
  const dpr = window.devicePixelRatio || 1;
  const cssW = window.innerWidth;
  const cssH = window.innerHeight;
  preview.width = Math.round(cssW * dpr);
  preview.height = Math.round(cssH * dpr);
  preview.style.width = `${cssW}px`;
  preview.style.height = `${cssH}px`;
  const ctx = preview.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#0D001A';
  ctx.fillRect(0, 0, cssW, cssH);
  const scale = Math.min(cssW / out.width, cssH / out.height);
  const dw = out.width * scale;
  const dh = out.height * scale;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(out, (cssW - dw) / 2, (cssH - dh) / 2, dw, dh);
}

export async function runShot(params, api) {
  const { state, editor, renderToCanvas } = api;
  const shot = params.get('shot');
  const preset = presetById(params.get('preset') ?? 'sunset-heist');

  await editor.resetPhotos(preset.photos);
  const extra = params.get('photo');
  if (extra && !preset.photos.includes(extra)) await editor.loadSamples([extra]);
  applyPreset(state, preset);
  const sizeParam = params.get('size');
  if (sizeParam && SIZES.some((s) => s.id === sizeParam)) state.size = sizeParam;
  if (params.get('caption')) state.title = params.get('caption');
  if (params.get('sub')) state.subtitle = params.get('sub');

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    editor.syncControls();
    // The exact export render, drawn to fill the viewport.
    blitCover(renderToCanvas(state, state.size));
    markReady();
    return;
  }

  // Editor scene: keep the whole UI, show the crop controls on panel 1.
  editor.syncControls();
  editor.selectPanel(0);
  editor.setStatus('Sample photos loaded — click any panel to crop, then export.');
  editor.requestRender();
  markReady();
}
