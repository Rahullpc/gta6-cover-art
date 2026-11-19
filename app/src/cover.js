// The ONE renderer behind both the live preview and the PNG export: same
// canvas calls, same seeded decor, so what you see is exactly what you get.
// Pipeline: panels (photo + grade + scene action + halftone) -> comic borders
// -> foreground palms -> grain -> stickers -> giant caption lettering.

import { layoutById } from './layouts.js';
import { gradeById, paintGrade } from './grades.js';
import { activeEdits, clamp, sizeById } from './state.js';
import { drawCaption } from './lettering.js';
import {
  drawSun,
  drawMoon,
  drawStars,
  drawPalm,
  drawBirds,
  drawSkyline,
  drawCar,
  drawBeachScene,
  drawStreetScene,
  drawVignette,
  drawMoney,
  drawHalftone,
  drawPanelHalftone,
  drawGrain,
  drawPanelBorders,
  stickerViceCity,
  stickerLeonida,
  stickerStars,
  stickerPalm,
  drawPlaceholder,
} from './decor.js';

/** Grades that read as night: the sky gets a moon and stars, not a sunset. */
const NIGHT_GRADES = new Set(['neon-night', 'teal-noir', 'ultraviolet']);

/** Cover-fill one photo into a panel rect with its own zoom and pan. */
function drawPanelPhoto(ctx, img, p, edit) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const zoom = clamp(edit.zoom ?? 1, 1, 4);
  const scale = Math.max(p.w / iw, p.h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const maxX = Math.max(0, (dw - p.w) / 2);
  const maxY = Math.max(0, (dh - p.h) / 2);
  const ox = clamp(edit.panX ?? 0, -1, 1) * maxX;
  const oy = clamp(edit.panY ?? 0, -1, 1) * maxY;
  ctx.drawImage(img, p.x + (p.w - dw) / 2 + ox, p.y + (p.h - dh) / 2 + oy, dw, dh);
}

/** The vector action drawn over a panel's graded photo, by scene tag. */
function sceneDecor(ctx, p, idx, night) {
  const seed = 1000 + idx * 77;
  const m = Math.min(p.w, p.h);
  switch (p.scene) {
    case 'hero': {
      if (night) {
        drawMoon(ctx, p.x + p.w * 0.8, p.y + p.h * 0.22, m * 0.12);
        drawStars(ctx, p.x + p.w * 0.05, p.y + p.h * 0.04, p.w * 0.9, p.h * 0.35, 10, seed);
      } else {
        drawSun(ctx, p.x + p.w * 0.78, p.y + p.h * 0.26, m * 0.22, 0.9);
        drawBirds(ctx, p.x + p.w * 0.06, p.y + p.h * 0.06, p.w * 0.35, p.h * 0.2, 4, seed);
      }
      drawPalm(ctx, p.x + p.w * 0.02, p.y + p.h * 0.995, p.h * 0.42, 0.1);
      drawMoney(ctx, p.x + p.w * 0.62, p.y + p.h * 0.02, p.w * 0.33, p.h * 0.12, 2, seed + 1);
      break;
    }
    case 'skyline': {
      if (night) {
        drawStars(ctx, p.x + p.w * 0.05, p.y + p.h * 0.05, p.w * 0.9, p.h * 0.35, 7, seed + 4);
        drawSkyline(ctx, p.x, p.y + p.h * 0.3, p.w, p.h * 0.7, seed);
      } else {
        drawSun(ctx, p.x + p.w * 0.24, p.y + p.h * 0.42, m * 0.16, 0.85);
        drawSkyline(ctx, p.x, p.y + p.h * 0.45, p.w, p.h * 0.55, seed);
        drawBirds(ctx, p.x + p.w * 0.5, p.y + p.h * 0.08, p.w * 0.4, p.h * 0.16, 3, seed + 2);
      }
      break;
    }
    case 'car': {
      const carW = p.w * 0.84;
      drawCar(ctx, p.x + p.w * 0.08, p.y + p.h - carW * 0.3 - p.h * 0.06, carW, '#00E5FF', -0.03);
      break;
    }
    case 'beach':
      drawBeachScene(ctx, p.x, p.y, p.w, p.h, seed, night);
      break;
    case 'street':
      drawStreetScene(ctx, p.x, p.y, p.w, p.h, seed);
      break;
    case 'vignette':
      drawVignette(ctx, p.x, p.y, p.w, p.h, idx % 3, seed);
      break;
    default:
      break;
  }
}

/**
 * Render the whole cover into `ctx` at w x h pixels.
 * `opts.selection` (panel index) draws the editor highlight; exports omit it.
 */
export function renderCover(ctx, state, w, h, opts = {}) {
  const layout = layoutById(state.layout);
  const grade = gradeById(state.grade);
  const k = clamp(state.intensity ?? 0.9, 0, 1);
  const panels = layout.panels(w, h);
  const edits = activeEdits(state);
  const photos = state.photos;
  const s = Math.min(w, h);
  const night = NIGHT_GRADES.has(state.grade);

  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0D001A';
  ctx.fillRect(0, 0, w, h);

  // 1. Panels: photo (or patterned placeholder), bold grade, scene action.
  panels.forEach((p, i) => {
    const edit = edits[i] ?? { photo: 0, zoom: 1, panX: 0, panY: 0 };
    const photo = photos.length ? photos[edit.photo % photos.length] : null;
    ctx.save();
    ctx.beginPath();
    ctx.rect(p.x, p.y, p.w, p.h);
    ctx.clip();
    if (photo) {
      ctx.filter = grade.filter(k);
      drawPanelPhoto(ctx, photo.img, p, edit);
      ctx.filter = 'none';
    } else {
      drawPlaceholder(ctx, p.x, p.y, p.w, p.h);
    }
    paintGrade(ctx, p.x, p.y, p.w, p.h, grade, k);
    sceneDecor(ctx, p, i, night);
    drawPanelHalftone(ctx, p, 500 + i * 31);
    ctx.restore();
  });

  // 2. Halftone corners, then the thick hand-inked comic borders.
  drawHalftone(ctx, w, h);
  drawPanelBorders(ctx, panels, w, h);

  // 3. Foreground silhouettes overlapping the borders.
  drawPalm(ctx, w * 0.03, h * 0.995, s * 0.5, 0.15);
  drawPalm(ctx, w * 0.97, h * 0.99, s * 0.32, -0.18);

  // 4. Film grain over everything.
  drawGrain(ctx, w, h);

  // 5. Stickers.
  if (state.stickers.viceCity) stickerViceCity(ctx, w, h);
  if (state.stickers.leonida) stickerLeonida(ctx, w, h);
  if (state.stickers.stars) stickerStars(ctx, w, h);
  if (state.stickers.palm) stickerPalm(ctx, w, h);

  // 6. Giant caption lettering on top, bleeding across panel edges.
  drawCaption(ctx, state, w, h);

  // 7. Editor-only selection highlight (never exported).
  if (opts.selection >= 0 && panels[opts.selection]) {
    const p = panels[opts.selection];
    ctx.save();
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = Math.max(2, s * 0.004);
    ctx.setLineDash([s * 0.02, s * 0.012]);
    ctx.strokeRect(p.x + 2, p.y + 2, p.w - 4, p.h - 4);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(13,0,26,0.85)';
    const label = `PANEL ${opts.selection + 1}`;
    ctx.font = `900 ${Math.max(14, s * 0.024)}px "Vice Display", "Arial Black", sans-serif`;
    const tw = ctx.measureText(label).width;
    ctx.fillRect(p.x + 6, p.y + 6, tw + 20, s * 0.04);
    ctx.fillStyle = '#00E5FF';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, p.x + 16, p.y + 6 + s * 0.02);
    ctx.restore();
  }
  ctx.restore();
}

/** Render at one of the three post sizes into a fresh canvas (export path). */
export function renderToCanvas(state, sizeId) {
  const size = sizeById(sizeId);
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  renderCover(canvas.getContext('2d'), state, size.w, size.h);
  return canvas;
}