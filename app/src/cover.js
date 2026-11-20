// cover.js — the single renderer behind the live preview AND the PNG export
// (v5). One code path, one set of seeded canvas calls: what the editor shows is
// exactly what the export writes.
//
// Pipeline: panels (face-safe photo via framing.js + bold grade + scene action
// + halftone) -> crisp comic borders -> foreground palms -> grain -> stickers
// -> giant caption lettering -> (editor-only) selection highlight. The framing
// engine guarantees each panel shows a whole face or none; this renderer just
// draws the frame it is handed.
//
// v5 art direction: the retro synthwave sun is gone from every day-grade sky.
// heroArt and skylineArt no longer call any sun painter — the sky shows the
// graded photo underneath, with birds / plane / skyline / palms still inked on
// top. Night grades keep their moon and sparkles exactly as before. The other
// v4 change holds: Sunset Hero's bottom strip is beach + street (no car panel),
// while the car scene art still serves every layout that carries a car slot.

import { layoutById } from './layouts.js';
import { gradeById, paintGrade } from './grades.js';
import { activeEdits, clamp, sizeById } from './state.js';
import { computeFrame, focusOf } from './framing.js';
import { drawCaption } from './lettering.js';
import {
  drawMoon, drawStars, drawPalm, drawBirds, drawPlane, drawSkyline,
  drawCar, drawBeachScene, drawStreetScene, drawVignette, drawMoney,
  drawHalftone, drawPanelHalftone, drawGrain, drawPanelBorders,
  stickerViceCity, stickerLeonida, stickerStars, stickerPalm, drawPlaceholder,
} from './decor.js';

const DISPLAY_FONT = '"Vice Display", "Arial Black", sans-serif';

// Grades that read as night: their skies get a moon and sparkles, never a sun.
const NIGHT_GRADES = new Set(['neon-night', 'teal-noir', 'ultraviolet']);

// Draw a photo into a panel using its face-safe frame. A blur-fill panel first
// gets a soft stretched copy of the photo so there are never bare gaps.
function drawPanelPhoto(ctx, img, p, frame) {
  if (frame.bg) {
    ctx.save();
    const blurPx = Math.max(6, Math.min(p.w, p.h) * 0.04);
    ctx.filter = `blur(${blurPx}px) saturate(1.2) brightness(0.7)`;
    const over = 1.12; // overscan so blurred edges never show transparency
    const ox = p.x - (p.w * (over - 1)) / 2;
    const oy = p.y - (p.h * (over - 1)) / 2;
    ctx.drawImage(img, ox, oy, p.w * over, p.h * over);
    ctx.filter = 'none';
    ctx.fillStyle = 'rgba(13,0,26,0.35)';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.restore();
  }
  const dw = img.naturalWidth * frame.scale;
  const dh = img.naturalHeight * frame.scale;
  const dx = p.x - frame.left * frame.scale;
  const dy = p.y - frame.top * frame.scale;
  ctx.drawImage(img, dx, dy, dw, dh);
}

// The vector action inked over a panel's graded photo, dispatched by scene tag.
// Faces sit in the upper third (framing.js), so scene action pins to the top
// corners and the lower half — never across the face itself. v5: day skies are
// sun-free; only birds, the plane, the skyline and palms remain up there.

function heroArt(ctx, p, idx, night, m, seed) {
  if (night) {
    drawMoon(ctx, p.x + p.w * 0.86, p.y + p.h * 0.14, m * 0.1);
    drawStars(ctx, p.x + p.w * 0.05, p.y + p.h * 0.03, p.w * 0.9, p.h * 0.16, 10, seed);
  } else {
    drawBirds(ctx, p.x + p.w * 0.05, p.y + p.h * 0.04, p.w * 0.3, p.h * 0.12, 4, seed);
  }
  drawPalm(ctx, p.x + p.w * 0.03, p.y + p.h * 0.995, p.h * 0.4, 0.1);
  drawMoney(ctx, p.x + p.w * 0.66, p.y + p.h * 0.86, p.w * 0.3, p.h * 0.12, 2, seed + 1);
}

function skylineArt(ctx, p, idx, night, m, seed) {
  if (night) {
    drawStars(ctx, p.x + p.w * 0.05, p.y + p.h * 0.03, p.w * 0.9, p.h * 0.18, 7, seed + 4);
    drawSkyline(ctx, p.x, p.y + p.h * 0.56, p.w, p.h * 0.44, seed);
  } else {
    drawSkyline(ctx, p.x, p.y + p.h * 0.58, p.w, p.h * 0.42, seed);
    drawBirds(ctx, p.x + p.w * 0.4, p.y + p.h * 0.05, p.w * 0.4, p.h * 0.12, 3, seed + 2);
    drawPlane(ctx, p.x + p.w * 0.66, p.y + p.h * 0.12, m * 0.1);
  }
}

function carArt(ctx, p) {
  // Keep the car inside the panel: its height is 0.3*width, so cap the width on
  // short panels so it never towers over (and covers) the face.
  const carW = Math.min(p.w * 0.84, (p.h * 0.82) / 0.3);
  const carX = p.x + (p.w - carW) / 2;
  const carY = p.y + p.h - carW * 0.3 - p.h * 0.06;
  drawCar(ctx, carX, carY, carW, '#00E5FF', -0.03);
}

function beachArt(ctx, p, idx, night, m, seed) {
  drawBeachScene(ctx, p.x, p.y, p.w, p.h, seed, night);
}

function streetArt(ctx, p, idx, night, m, seed) {
  drawStreetScene(ctx, p.x, p.y, p.w, p.h, seed);
}

function vignetteArt(ctx, p, idx, night, m, seed) {
  drawVignette(ctx, p.x, p.y, p.w, p.h, idx % 4, seed);
}

const SCENE_ART = {
  hero: heroArt,
  skyline: skylineArt,
  car: carArt,
  beach: beachArt,
  street: streetArt,
  vignette: vignetteArt,
};

function sceneDecor(ctx, p, idx, night) {
  const handler = SCENE_ART[p.scene];
  if (handler) handler(ctx, p, idx, night, Math.min(p.w, p.h), 1000 + idx * 77);
}

// Pass 1 — every panel: face-safe photo (or patterned placeholder), bold grade,
// scene action, halftone. Each panel is clipped to its own rect.
function paintPanels(ctx, panels, edits, photos, grade, k, night) {
  panels.forEach((p, i) => {
    const edit = edits[i] ?? { photo: 0, zoom: 1, panX: 0, panY: 0 };
    const photo = photos.length ? photos[edit.photo % photos.length] : null;
    ctx.save();
    ctx.beginPath();
    ctx.rect(p.x, p.y, p.w, p.h);
    ctx.clip();
    if (photo) {
      const frame = computeFrame(photo.img, p, edit, focusOf(photo));
      ctx.filter = grade.filter(k);
      drawPanelPhoto(ctx, photo.img, p, frame);
      ctx.filter = 'none';
    } else {
      drawPlaceholder(ctx, p.x, p.y, p.w, p.h);
    }
    paintGrade(ctx, p.x, p.y, p.w, p.h, grade, k);
    sceneDecor(ctx, p, i, night);
    drawPanelHalftone(ctx, p, 500 + i * 31);
    ctx.restore();
  });
}

// Dashed cyan outline + a small label chip on the selected panel (editor only).
function drawSelection(ctx, p, idx, s) {
  ctx.save();
  ctx.lineWidth = Math.max(2, s * 0.004);
  ctx.strokeStyle = '#00E5FF';
  ctx.setLineDash([s * 0.02, s * 0.012]);
  ctx.strokeRect(p.x + 2, p.y + 2, p.w - 4, p.h - 4);
  ctx.setLineDash([]);
  const label = `PANEL ${idx + 1}`;
  ctx.font = `900 ${Math.max(14, s * 0.024)}px ${DISPLAY_FONT}`;
  const tw = ctx.measureText(label).width;
  ctx.fillStyle = 'rgba(13,0,26,0.85)';
  ctx.fillRect(p.x + 6, p.y + 6, tw + 20, s * 0.04);
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#00E5FF';
  ctx.fillText(label, p.x + 16, p.y + 6 + s * 0.02);
  ctx.restore();
}

// Sticker dispatch, painted in the established order. v5: `stars` now paints
// the five-star wanted row (decor.js); the badge logos are unchanged.
const STICKER_PAINT = {
  viceCity: stickerViceCity,
  leonida: stickerLeonida,
  stars: stickerStars,
  palm: stickerPalm,
};

/**
 * Render the whole cover into ctx at w x h pixels.
 * opts.selection (panel index) draws the editor highlight; exports omit it.
 */
export function renderCover(ctx, state, w, h, opts = {}) {
  const layout = layoutById(state.layout);
  const grade = gradeById(state.grade);
  const k = clamp(state.intensity ?? 0.9, 0, 1);
  const panels = layout.panels(w, h);
  const edits = activeEdits(state);
  const s = Math.min(w, h);
  const night = NIGHT_GRADES.has(state.grade);

  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0D001A';
  ctx.fillRect(0, 0, w, h);

  paintPanels(ctx, panels, edits, state.photos, grade, k, night);

  // Halftone corners, then the crisp uniform comic borders.
  drawHalftone(ctx, w, h);
  drawPanelBorders(ctx, panels, w, h);
  // Foreground silhouettes in the bottom corners (clear of the faces).
  drawPalm(ctx, w * 0.03, h * 0.995, s * 0.46, 0.15);
  drawPalm(ctx, w * 0.97, h * 0.99, s * 0.3, -0.18);
  // Film grain over everything.
  drawGrain(ctx, w, h);
  // Stickers.
  for (const [key, paint] of Object.entries(STICKER_PAINT)) {
    if (state.stickers[key]) paint(ctx, w, h);
  }
  // Giant caption lettering on top, bleeding across panel edges.
  drawCaption(ctx, state, w, h);
  // Editor-only selection highlight (never exported).
  if (opts.selection >= 0 && panels[opts.selection]) {
    drawSelection(ctx, panels[opts.selection], opts.selection, s);
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