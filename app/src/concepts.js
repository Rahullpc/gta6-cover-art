// concepts.js — the cover recipes, designed from the reference images.
// A recipe has two halves: a LAYOUT (where the photo panels sit) and a
// DRESSING (grade wash, badge, stars, title, pills, silhouettes). Layouts are
// shared: the editor's panel-layout buttons swap the layout while the
// concept keeps its grade and lettering. Geometry is in fractions of the
// canvas so a recipe scales to any post size.

import * as ink from './ink.js';
import { PHOTOS, paintPhoto, coverCrop, faceInside } from './photos.js';

// ---- one photo panel ------------------------------------------------------
// Paints a photo into a rect (cover crop on `focus`) and an optional wash.
function panel(ctx, imgs, spec, W, H) {
  const x = spec.x * W;
  const y = spec.y * H;
  const w = spec.w * W;
  const h = spec.h * H;
  paintPhoto(ctx, imgs, spec.photo, x, y, w, h, spec.focus, spec.keepFace !== false);
  if (spec.wash) {
    if (spec.wash === 'warm') warmWash(ctx, x, y, w, h, 0.9);
    else if (spec.wash === 'warmSoft') warmWash(ctx, x, y, w, h, 0.7);
    else if (spec.wash === 'pink') pinkWash(ctx, x, y, w, h, 0.9);
    else if (spec.wash === 'pinkStrong') pinkWash(ctx, x, y, w, h, 1.5);
    else if (spec.wash === 'magenta') magentaWash(ctx, x, y, w, h);
    else if (spec.wash === 'night') nightTone(ctx, x, y, w, h);
    else if (spec.wash === 'nightDeep') nightDeep(ctx, x, y, w, h);
  }
  return { x, y, w, h };
}

function gutter(ctx, x0, y0, x1, y1) {
  ctx.fillStyle = '#0d0b16';
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
}

// ---- colour washes ---------------------------------------------------------
function warmWash(ctx, x, y, w, h, strength = 1) {
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, `rgba(255, 190, 130, ${0.55 * strength})`);
  g.addColorStop(1, `rgba(255, 90, 60, ${0.45 * strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function pinkWash(ctx, x, y, w, h, strength = 1) {
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, `rgba(255, 80, 170, ${0.6 * strength})`);
  g.addColorStop(1, `rgba(160, 40, 140, ${0.5 * strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

// A heavier magenta grade: a multiply tint (darkens + saturates pink) then
// the soft-light pink. Used for the Vice Strip photos, which read much
// darker and pinker than the raw samples.
function magentaWash(ctx, x, y, w, h) {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgba(195, 70, 145, 0.42)';
  ctx.fillRect(x, y, w, h);
  ctx.globalCompositeOperation = 'soft-light';
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, 'rgba(255, 80, 170, 0.55)');
  g.addColorStop(1, 'rgba(160, 40, 140, 0.5)');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function nightTone(ctx, x, y, w, h) {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgba(28, 90, 130, 0.62)';
  ctx.fillRect(x, y, w, h);
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = 'rgba(10, 20, 60, 0.55)';
  ctx.fillRect(x, y, w, h);
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = 'rgba(40, 180, 220, 0.10)';
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

// A heavier night duotone for the small top-strip panels: the photos read
// as near-silhouettes, as in the reference.
function nightDeep(ctx, x, y, w, h) {
  nightTone(ctx, x, y, w, h);
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgba(8, 30, 70, 0.70)';
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

// ---- layouts (panel arrangements, fractions of W/H) ------------------------
// Each panel: {photo, x, y, w, h, focus?, keepFace?, wash?}
export const LAYOUTS = {
  sunsetHero: {
    name: 'Sunset Hero',
    // The hero photo runs the FULL height of the left column (the pool at
    // the bottom is the same photo continuing, not a separate crop). The
    // horizontal gutter at y=0.618 is drawn over it.
    panels: [
      { photo: 'summer', x: 0, y: 0, w: 0.621, h: 1.0, wash: 'warm' },
      { photo: 'pier', x: 0.621, y: 0, w: 0.379, h: 0.333, wash: 'warmSoft' },
      { photo: 'porsche', x: 0.621, y: 0.333, w: 0.379, h: 0.285, wash: 'warmSoft' },
    ],
    gutters: [
      [0.621, 0, 0.621, 0.618],
      [0.621, 0.333, 1, 0.333],
      [0, 0.618, 1, 0.618],
    ],
  },
  gridHero: {
    name: 'Grid + Hero',
    panels: [
      { photo: 'summer', x: 0, y: 0, w: 1, h: 0.58, wash: 'warm' },
      { photo: 'pier', x: 0, y: 0.58, w: 0.333, h: 0.42, wash: 'warmSoft' },
      { photo: 'porsche', x: 0.333, y: 0.58, w: 0.334, h: 0.42, wash: 'warmSoft' },
      { photo: 'boulevard', x: 0.667, y: 0.58, w: 0.333, h: 0.42, wash: 'warmSoft' },
    ],
    gutters: [
      [0, 0.58, 1, 0.58],
      [0.333, 0.58, 0.333, 1],
      [0.667, 0.58, 0.667, 1],
    ],
  },
  viceStrip: {
    name: 'Vice Strip',
    // Five columns running the FULL height (gutters included); the photos
    // sit in a middle band (y 0.245-0.585) and the pink grade fills the
    // columns above and below them. A full-height cover crop would cut the
    // faces in such narrow strips, so the photos live in the band.
    panels: [
      { photo: 'summer', x: 0.0, y: 0.245, w: 0.2, h: 0.34, wash: 'magenta' },
      { photo: 'boulevard', x: 0.2, y: 0.245, w: 0.2, h: 0.34, focus: { x: 0.42, y: 0.16 }, wash: 'magenta' },
      { photo: 'summer', x: 0.4, y: 0.245, w: 0.2, h: 0.34, wash: 'magenta' },
      { photo: 'porsche', x: 0.6, y: 0.245, w: 0.2, h: 0.34, focus: { x: 0.61, y: 0.22 }, wash: 'magenta' },
      { photo: 'pier', x: 0.8, y: 0.245, w: 0.2, h: 0.34, focus: { x: 0.30, y: 0.24 }, wash: 'magenta' },
    ],
    gutters: [
      [0.2, 0, 0.2, 1],
      [0.4, 0, 0.4, 1],
      [0.6, 0, 0.6, 1],
      [0.8, 0, 0.8, 1],
      [0, 0.245, 1, 0.245],
      [0, 0.585, 1, 0.585],
    ],
  },
  triptych: {
    name: 'Triptych',
    panels: [
      { photo: 'boulevard', x: 0, y: 0, w: 0.333, h: 1, focus: { x: 0.42, y: 0.16 }, wash: 'warm' },
      { photo: 'summer', x: 0.333, y: 0, w: 0.334, h: 1, wash: 'warm' },
      { photo: 'porsche', x: 0.667, y: 0, w: 0.333, h: 1, focus: { x: 0.61, y: 0.22 }, wash: 'warm' },
    ],
    gutters: [
      [0.333, 0, 0.333, 1],
      [0.667, 0, 0.667, 1],
    ],
  },
  comicQuad: {
    name: 'Comic Quad',
    panels: [
      { photo: 'summer', x: 0, y: 0, w: 0.5, h: 0.5, wash: 'warm' },
      { photo: 'pier', x: 0.5, y: 0, w: 0.5, h: 0.5, wash: 'warmSoft' },
      { photo: 'porsche', x: 0, y: 0.5, w: 0.5, h: 0.5, focus: { x: 0.61, y: 0.22 }, wash: 'warmSoft' },
      { photo: 'boulevard', x: 0.5, y: 0.5, w: 0.5, h: 0.5, focus: { x: 0.42, y: 0.16 }, wash: 'warmSoft' },
    ],
    gutters: [
      [0.5, 0, 0.5, 1],
      [0, 0.5, 1, 0.5],
    ],
  },
  cinema: {
    name: 'Cinema Strip',
    panels: [
      { photo: 'pier', x: 0.335, y: 0, w: 0.33, h: 0.25, wash: 'nightDeep' },
      { photo: 'porsche', x: 0.665, y: 0, w: 0.335, h: 0.25, wash: 'nightDeep' },
      { photo: 'boulevard', x: 0, y: 0.25, w: 1, h: 0.49, wash: 'night' },
    ],
    gutters: [
      [0.335, 0, 0.335, 0.25],
      [0.665, 0, 0.665, 0.25],
      [0, 0.25, 1, 0.25],
    ],
  },
};

export const LAYOUT_ORDER = ['sunsetHero', 'gridHero', 'viceStrip', 'triptych', 'comicQuad', 'cinema'];

// Paint a layout's panels (photos + washes + gutters) and return nothing.
function paintLayout(ctx, imgs, layout, W, H) {
  for (const spec of layout.panels) panel(ctx, imgs, spec, W, H);
  const gw = Math.max(3, W * 0.004);
  for (const [x0, y0, x1, y1] of layout.gutters) {
    if (x0 === x1) gutter(ctx, x0 * W - gw / 2, y0 * H, x0 * W + gw / 2, y1 * H);
    else gutter(ctx, x0 * W, y0 * H - gw / 2, x1 * W, y0 * H + gw / 2);
  }
}

// ---- dressings (grade backdrops, titles, decorations) ----------------------

function dressSunset(ctx, imgs, W, H, caps) {
  // bottom-right sunset gradient + sun glow (behind the title band)
  const bx = 0.621 * W;
  const by = 0.618 * H;
  const bw = 0.379 * W;
  const bh = 0.382 * H;
  const sg = ctx.createLinearGradient(bx, by, bx, by + bh);
  sg.addColorStop(0, '#ff9a2e');
  sg.addColorStop(0.55, '#ff5e2e');
  sg.addColorStop(1, '#e8325e');
  ctx.fillStyle = sg;
  ctx.fillRect(bx, by, bw, bh);
  const glow = ctx.createRadialGradient(bx + bw * 0.85, by + bh * 0.78, 4, bx + bw * 0.85, by + bh * 0.78, bw * 0.6);
  glow.addColorStop(0, 'rgba(255, 240, 180, 0.95)');
  glow.addColorStop(0.35, 'rgba(255, 180, 80, 0.55)');
  glow.addColorStop(1, 'rgba(255, 120, 40, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(bx, by, bw, bh);
  // hero decorations
  ink.viceBadge(ctx, W * 0.035, H * 0.035, W * 0.165, H * 0.072, -0.06);
  ink.starsRow(ctx, W * 0.038, H * 0.115, 5, W * 0.020, W * 0.011, 0.05);
  ink.palm(ctx, W * 0.03, H * 0.56, H * 0.30, 0.10);
  ink.birdMark(ctx, W * 0.63, H * 0.055, W * 0.012, 0.1);
  ink.birdMark(ctx, W * 0.66, H * 0.045, W * 0.010, -0.1);
  ink.birdMark(ctx, W * 0.70, H * 0.065, W * 0.009, 0.05);
  ink.dollar(ctx, W * 0.547, H * 0.569, W * 0.016, 0.25);
  ink.dollar(ctx, W * 0.480, H * 0.611, W * 0.014, -0.2);
  ink.dollar(ctx, W * 0.735, H * 0.415, W * 0.013, 0.2);
  ink.dollar(ctx, W * 0.845, H * 0.435, W * 0.012, -0.25);
  ink.vicePDBar(ctx, 0.621 * W + W * 0.01, H * 0.565, 0.379 * W - W * 0.02, H * 0.038);
  // title band (the title straddles the horizontal gutter)
  ink.bigTitle(ctx, caps.title, W * 0.5, H * 0.60, H * 0.15, {
    fill: '#fff',
    fringeDx: 0.05,
    fringeDy: 0.055,
    shear: -0.10,
  });
  ink.pill(ctx, W * 0.415, H * 0.835, W * 0.17, H * 0.052, {
    fill: 'rgba(13, 11, 22, 0.82)',
    text: caps.subtitle,
    font: `900 ${Math.round(H * 0.028)}px ${ink.FONT}`,
  });
  ink.pill(ctx, W * 0.855, H * 0.645, W * 0.075, H * 0.042, {
    fill: 'rgba(13, 11, 22, 0.85)',
    stroke: '#19c8e8',
    lw: Math.max(2, H * 0.003),
    text: 'MOTEL',
    font: `900 ${Math.round(H * 0.024)}px ${ink.FONT}`,
  });
  ink.palm(ctx, W * 0.025, H * 1.0, H * 0.22, -0.08);
  ink.palm(ctx, W * 0.95, H * 0.98, H * 0.20, 0.10);
  ink.crowd(ctx, W * 0.62, H * 0.975, W * 0.36, 9, H * 0.022);
}

// The pink grade behind the strips: a vertical magenta gradient, bright
// at the top and deep at the bottom. Painted BEFORE the strips.
function dressStrip(ctx, W, H) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#e85a9e');
  bg.addColorStop(0.5, '#c94b8f');
  bg.addColorStop(1, '#7a2a6e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  // faint vertical light streaks in the top pink
  ctx.save();
  ctx.globalAlpha = 0.22;
  for (let i = 0; i < 5; i++) {
    const x = W * (0.08 + i * 0.2);
    const g = ctx.createLinearGradient(x, 0, x + W * 0.06, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.5)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, W * 0.06, H * 0.24);
  }
  ctx.restore();
}

function dressStripTop(ctx, imgs, W, H, caps) {
  ink.viceBadge(ctx, W * 0.045, H * 0.035, W * 0.26, H * 0.055, -0.05);
  ink.pill(ctx, W * 0.615, H * 0.022, W * 0.085, H * 0.026, {
    fill: 'rgba(13,11,22,0.85)',
    stroke: '#ff2e88',
    lw: 2,
    text: 'DINER',
    font: `900 ${Math.round(H * 0.014)}px ${ink.FONT}`,
  });
  ink.pill(ctx, W * 0.715, H * 0.048, W * 0.075, H * 0.026, {
    fill: 'rgba(13,11,22,0.85)',
    stroke: '#19c8e8',
    lw: 2,
    text: '24H',
    font: `900 ${Math.round(H * 0.014)}px ${ink.FONT}`,
  });
  ctx.save();
  ctx.translate(W * 0.905, H * 0.075);
  ctx.beginPath();
  ctx.arc(0, 0, W * 0.075, 0, Math.PI * 2);
  ctx.fillStyle = '#0d0b16';
  ctx.fill();
  ctx.lineWidth = W * 0.008;
  ctx.strokeStyle = '#ff8c1a';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, W * 0.062, 0, Math.PI * 2);
  ctx.lineWidth = W * 0.004;
  ctx.strokeStyle = '#19c8e8';
  ctx.stroke();
  ink.star(ctx, 0, -H * 0.018, W * 0.028, '#ffd21f', null, 0);
  ctx.fillStyle = '#fff';
  ctx.font = `900 ${Math.round(H * 0.017)}px ${ink.FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('LEONIDA', 0, H * 0.022);
  ctx.restore();
  ink.birdMark(ctx, W * 0.03, H * 0.10, W * 0.018, 0.1);
  ink.birdMark(ctx, W * 0.06, H * 0.09, W * 0.014, -0.1);
  ink.bigTitle(ctx, caps.title, W * 0.5, H * 0.45, H * 0.145, {
    fill: '#fff',
    fringeDx: 0.045,
    fringeDy: 0.05,
    shear: -0.08,
    lineGap: 0.98,
  });
  ink.pill(ctx, W * 0.10, H * 0.855, W * 0.80, H * 0.052, {
    fill: 'rgba(13, 11, 22, 0.82)',
    stroke: '#ff2e88',
    lw: 2,
    text: caps.subtitle,
    font: `900 ${Math.round(H * 0.026)}px ${ink.FONT}`,
  });
  ink.palm(ctx, W * 0.05, H * 1.0, H * 0.28, -0.10);
  ink.carSide(ctx, W * 0.20, H * 0.945, W * 0.16, H * 0.035);
  ink.dollar(ctx, W * 0.55, H * 0.80, W * 0.024, 0.2);
  ctx.save();
  ctx.translate(W * 0.895, H * 0.945);
  ctx.beginPath();
  ctx.arc(0, 0, W * 0.055, 0, Math.PI * 2);
  ctx.fillStyle = '#0d0b16';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#19c8e8';
  ctx.stroke();
  ctx.restore();
  ink.palm(ctx, W * 0.895, H * 0.975, H * 0.06, 0.05, '#19c8e8');
}

function dressNeon(ctx, imgs, W, H, caps) {
  // dotted dark panel, top-left
  ctx.fillStyle = '#1b1030';
  ctx.fillRect(0, 0, 0.335 * W, 0.25 * H);
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  for (let gx = 0; gx < 0.335 * W; gx += 14) {
    for (let gy = 0; gy < 0.25 * H; gy += 14) {
      ctx.beginPath();
      ctx.arc(gx + 7, gy + 7, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  ink.viceBadge(ctx, W * 0.035, H * 0.035, W * 0.165, H * 0.072, -0.05);
  ink.starsRow(ctx, W * 0.038, H * 0.135, 5, W * 0.026, W * 0.014, 0.05);
  ink.vicePDBar(ctx, 0.665 * W + W * 0.01, H * 0.205, 0.335 * W - W * 0.02, H * 0.038);
  // night sky: sparkles + moon (drawn over the middle photo)
  ink.sparkle(ctx, W * 0.12, H * 0.30, W * 0.004);
  ink.sparkle(ctx, W * 0.20, H * 0.33, W * 0.0035);
  ink.sparkle(ctx, W * 0.47, H * 0.29, W * 0.0035);
  ink.sparkle(ctx, W * 0.55, H * 0.34, W * 0.004);
  ink.sparkle(ctx, W * 0.63, H * 0.30, W * 0.003);
  ink.moon(ctx, W * 0.80, H * 0.35, W * 0.028);
  // title band (drawn before the palm and car, so they sit on top of it)
  const tg = ctx.createLinearGradient(0, 0.74 * H, 0, H);
  tg.addColorStop(0, '#0e1a3a');
  tg.addColorStop(1, '#131c33');
  ctx.fillStyle = tg;
  ctx.fillRect(0, 0.74 * H, W, 0.26 * H);
  ink.palm(ctx, W * 0.06, H * 0.85, H * 0.30, 0.08);
  ink.carFront(ctx, W * 0.05, H * 0.85, W * 0.30, H * 0.13);
  ink.bigTitle(ctx, caps.title, W * 0.5, H * 0.72, H * 0.13, {
    grad: [[0, '#ffe98a'], [0.55, '#ffc93a'], [1, '#ff9d1a']],
    fringeDx: 0.04,
    fringeDy: 0.05,
    shear: -0.10,
  });
  ink.pill(ctx, W * 0.31, H * 0.87, W * 0.28, H * 0.05, {
    fill: 'rgba(13, 11, 22, 0.85)',
    stroke: '#ff2e88',
    lw: 2,
    text: caps.subtitle,
    font: `900 ${Math.round(H * 0.026)}px ${ink.FONT}`,
  });
  ink.pill(ctx, W * 0.915, H * 0.78, W * 0.06, H * 0.04, {
    fill: 'rgba(13, 11, 22, 0.85)',
    stroke: '#19c8e8',
    lw: Math.max(2, H * 0.003),
    text: 'CLUB',
    font: `900 ${Math.round(H * 0.022)}px ${ink.FONT}`,
  });
  ink.dollar(ctx, W * 0.885, H * 0.715, W * 0.016, 0.2);
  ink.crowd(ctx, W * 0.68, H * 0.975, W * 0.30, 8, H * 0.022);
}

function dressDuo(ctx, imgs, W, H, caps) {
  ink.viceBadge(ctx, W * 0.035, H * 0.035, W * 0.165, H * 0.072, -0.06);
  ink.starsRow(ctx, W * 0.038, H * 0.135, 5, W * 0.026, W * 0.014, 0.05);
  const bg = ctx.createLinearGradient(0, 0.66 * H, 0, H);
  bg.addColorStop(0, '#ff7a2e');
  bg.addColorStop(1, '#c22a5e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0.66 * H, W, 0.34 * H);
  ink.bigTitle(ctx, caps.title, W * 0.5, H * 0.69, H * 0.13, {
    fill: '#fff',
    fringeDx: 0.05,
    fringeDy: 0.055,
    shear: -0.10,
  });
  ink.pill(ctx, W * 0.40, H * 0.875, W * 0.20, H * 0.052, {
    fill: 'rgba(13, 11, 22, 0.82)',
    text: caps.subtitle,
    font: `900 ${Math.round(H * 0.028)}px ${ink.FONT}`,
  });
  ink.palm(ctx, W * 0.04, H * 1.0, H * 0.22, -0.08);
  ink.palm(ctx, W * 0.97, H * 0.99, H * 0.20, 0.10);
}

// ---- concepts -------------------------------------------------------------
// A concept pairs a layout with a dressing. `backdrop` (optional) paints
// behind the panels; `dressing` paints on top of them.
export const CONCEPTS = [
  {
    id: 'sunset',
    name: 'Sunset Beach Heist',
    layout: 'sunsetHero',
    titles: { title: ['SUNSET HEIST'], subtitle: 'A VICE CITY STORY' },
    draw: (ctx, imgs, W, H, caps) => {
      paintLayout(ctx, imgs, LAYOUTS.sunsetHero, W, H);
      dressSunset(ctx, imgs, W, H, caps);
    },
    native: [1920, 1080],
  },
  {
    id: 'neon',
    name: 'Neon Night Drive',
    layout: 'cinema',
    titles: { title: ['NEON NIGHT DRIVE'], subtitle: 'AFTER DARK IN LEONIDA' },
    draw: (ctx, imgs, W, H, caps) => {
      paintLayout(ctx, imgs, LAYOUTS.cinema, W, H);
      dressNeon(ctx, imgs, W, H, caps);
    },
    native: [1920, 1080],
  },
  {
    id: 'strip',
    name: 'Vice Strip',
    layout: 'viceStrip',
    titles: { title: ['VICE', 'STRIP'], subtitle: 'FIVE MOMENTS - ONE CITY' },
    draw: (ctx, imgs, W, H, caps) => {
      dressStrip(ctx, W, H);
      paintLayout(ctx, imgs, LAYOUTS.viceStrip, W, H);
      dressStripTop(ctx, imgs, W, H, caps);
    },
    native: [1080, 1350],
  },
  {
    id: 'duo',
    name: 'Golden Hour Duo',
    layout: 'gridHero',
    titles: { title: ['GOLDEN HOUR DUO'], subtitle: 'TWO MOMENTS - ONE CITY' },
    draw: (ctx, imgs, W, H, caps) => {
      // duo uses its own two-photo split, not the gridHero panels
      const gw = Math.max(3, W * 0.004);
      panel(ctx, imgs, { photo: 'boulevard', x: 0, y: 0, w: 0.5, h: 0.66, focus: { x: 0.42, y: 0.16 }, wash: 'warm' }, W, H);
      panel(ctx, imgs, { photo: 'summer', x: 0.5, y: 0, w: 0.5, h: 0.66, wash: 'warm' }, W, H);
      gutter(ctx, 0.5 * W - gw / 2, 0, 0.5 * W + gw / 2, 0.66 * H);
      gutter(ctx, 0, 0.66 * H - gw / 2, W, 0.66 * H + gw / 2);
      dressDuo(ctx, imgs, W, H, caps);
    },
    native: [1920, 1080],
  },
];

export function conceptById(id) {
  return CONCEPTS.find((c) => c.id === id) || CONCEPTS[0];
}

// Render a concept to a canvas of the given size. `caps` carries the
// editable caption ({title: [lines], subtitle}); defaults to the concept's
// own titles. Returns the canvas.
export function renderConcept(concept, imgs, w, h, caps = concept.titles) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  concept.draw(ctx, imgs, w, h, caps);
  return canvas;
}

// Framing self-check: for every face panel a concept paints at a size,
// verify the face stays inside the solved crop. Returns {total, cut, bad}.
export function framingCheck(concept, w, h) {
  const layout = LAYOUTS[concept.layout] || null;
  const panels = layout ? layout.panels : [];
  // duo paints its own panels; list them here for the check
  const list = concept.id === 'duo'
    ? [
        ['boulevard', { w: 0.5 * w, h: 0.66 * h }, { x: 0.42, y: 0.16 }],
        ['summer', { w: 0.5 * w, h: 0.66 * h }, undefined],
      ]
    : panels.filter((p) => p.keepFace !== false).map((p) => [p.photo, { w: p.w * w, h: p.h * h }, p.focus]);
  let total = 0;
  let cut = 0;
  const bad = [];
  for (const [pid, rect, focus] of list) {
    const photo = PHOTOS[pid];
    const crop = coverCrop(photo, rect.w, rect.h, focus);
    total += 1;
    if (!faceInside(photo, crop)) {
      cut += 1;
      bad.push(pid);
    }
  }
  return { total, cut, bad };
}
