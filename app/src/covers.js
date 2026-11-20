// covers.js — the four cover recipes and the six panel layouts.
// Geometry was measured from the approved v26 reference images: panel
// fractions, badge/star placement, title positions, moon and palm spots.
// Photos are drawn with the focus-point cover crop from framing.js.

import {
  INK, fillStar, drawBadge, drawStarRow, drawDisplayText, drawPill, drawPalm,
  drawCrowd, drawCarSide, drawMoon, drawDots, drawDollar, drawSparkle,
  drawBird, drawBlurBand, drawGutter,
} from './brush.js';
import { FACE, drawCover, drawStretched, checkFraming } from './framing.js';

export const GRADES = {
  sunset: { name: 'Sunset', top: 'rgba(255,120,40,0.22)', bottom: 'rgba(255,46,136,0.20)' },
  neon: { name: 'Neon Night', top: 'rgba(4,32,54,0.50)', bottom: 'rgba(8,90,110,0.38)' },
  golden: { name: 'Golden Hour', top: 'rgba(255,180,60,0.14)', bottom: 'rgba(255,120,30,0.10)' },
  vice: { name: 'Vice Pink', top: 'rgba(255,46,136,0.16)', bottom: 'rgba(180,40,140,0.14)' },
  teal: { name: 'Teal Noir', top: 'rgba(4,40,60,0.45)', bottom: 'rgba(0,90,110,0.35)' },
};

function gradeWash(ctx, W, H, grade) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, grade.top);
  g.addColorStop(1, grade.bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function vicePdBand(ctx, x, y, w, h) {
  ctx.fillStyle = INK.navy;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = INK.pink;
  ctx.fillRect(x, y, w * 0.16, h);
  ctx.fillStyle = INK.cyan;
  ctx.fillRect(x + w * 0.84, y, w * 0.16, h);
  ctx.fillStyle = INK.white;
  ctx.font = `900 ${Math.round(h * 0.52)}px "NotoSans-CondensedBlack", "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('VICE PD', x + w * 0.5, y + h * 0.54);
}

/** Badge + star row with a CLEAR gap between them (the v28 defect fix). */
function badgeWithStars(ctx, W, H, bx, by, bw, bh, gapFrac) {
  drawBadge(ctx, bx, by, bw, bh);
  const starY = by + bh + gapFrac * H;
  drawStarRow(ctx, bx, starY, bw, Math.min(bw * 0.085, H * 0.022));
}

// ---------------------------------------------------------------- recipe 1

function drawSunset(ctx, W, H, photos, grade) {
  // Grid layout (measured from the v26 reference):
  // row 1 (y 0-0.65): hero left, pier + porsche stacked right
  // row 2 (y 0.65-1): pool band left, sunset gradient block right
  const hero = { x: 0, y: 0, w: 0.645 * W, h: 0.65 * H };
  const pierP = { x: 0.645 * W, y: 0, w: 0.355 * W, h: 0.335 * H };
  const porscheP = { x: 0.645 * W, y: 0.335 * H, w: 0.355 * W, h: 0.315 * H };
  const poolP = { x: 0, y: 0.65 * H, w: 0.645 * W, h: 0.35 * H };
  // Photo crops measured against the v26 reference (iteration 2):
  // hero tighter on the woman (zoom 0.50, face (0.66, 0.30) of the window);
  // pier tighter on the fisherman (0.75, face (0.38, 0.08));
  // porsche tight on the woman + walkie-talkie (0.28, face (0.71, 0.21));
  // pool band is a STRETCH of the left crowd + pool area (no woman).
  // porsche tight on the woman + walkie-talkie, but loose enough that her
  // shoulders and black top stay in frame (zoom 0.47, face (0.78, 0.22))
  drawCover(ctx, photos.summer, hero, 0.66, 0.30, 0.50);
  drawCover(ctx, photos.pier, pierP, 0.38, 0.08, 0.75);
  drawCover(ctx, photos.porsche, porscheP, 0.78, 0.22, 0.47);
  ctx.save();
  ctx.beginPath();
  ctx.rect(poolP.x, poolP.y, poolP.w, poolP.h);
  ctx.clip();
  drawStretched(ctx, photos.summer, poolP, { x0: 0.02, y0: 0.28, x1: 0.57, y1: 0.88 });
  ctx.restore();
  // right-bottom sunset gradient block
  const g = ctx.createLinearGradient(0, 0.65 * H, 0, H);
  g.addColorStop(0, '#FF7A18');
  g.addColorStop(0.55, '#FF2E88');
  g.addColorStop(1, '#7A1E5C');
  ctx.fillStyle = g;
  ctx.fillRect(0.645 * W, 0.65 * H, 0.355 * W, 0.35 * H);
  gradeWash(ctx, W, H, grade);
  // gutters
  const gw = Math.max(4, W * 0.003);
  drawGutter(ctx, 0.645 * W - gw / 2, 0, gw, H);
  drawGutter(ctx, 0.645 * W, 0.335 * H - gw / 2, 0.355 * W, gw);
  drawGutter(ctx, 0, 0.65 * H - gw / 2, W, gw);
  // VICE PD band at the bottom of the porsche panel — BEFORE the title,
  // so the title stays on top of it
  vicePdBand(ctx, 0.645 * W, 0.585 * H, 0.355 * W, 0.065 * H);
  // birds in the pier panel sky — small, whole, far from the badge
  drawBird(ctx, pierP.x + pierP.w * 0.10, pierP.y + pierP.h * 0.16, W * 0.011);
  drawBird(ctx, pierP.x + pierP.w * 0.24, pierP.y + pierP.h * 0.12, W * 0.011);
  drawBird(ctx, pierP.x + pierP.w * 0.38, pierP.y + pierP.h * 0.20, W * 0.010);
  // badge + stars: stars sit clearly BELOW the badge with a real gap
  badgeWithStars(ctx, W, H, 0.045 * W, 0.035 * H, 0.20 * W, 0.075 * H, 0.028);
  // title + pills
  drawDisplayText(ctx, 'SUNSET HEIST', 0.50 * W, 0.71 * H, 0.135 * H, { maxW: 0.62 * W });
  drawPill(ctx, 0.45 * W, 0.845 * H, 'A VICE CITY STORY', { h: 0.042 * H, rim: INK.pink });
  drawPill(ctx, 0.875 * W, 0.685 * H, 'MOTEL', { h: 0.040 * H, rim: INK.cyan });
  // $ stickers
  drawDollar(ctx, 0.505 * W, 0.555 * H, 0.022 * W);
  drawDollar(ctx, 0.560 * W, 0.505 * H, 0.018 * W);
  drawDollar(ctx, 0.685 * W, 0.42 * H, 0.016 * W);
  // palms + crowd + pool lines
  drawPalm(ctx, 0.015 * W, 0.62 * H, 0.34 * H, { lean: 0.10 });
  drawPalm(ctx, 0.035 * W, 0.98 * H, 0.26 * H, { lean: -0.08 });
  drawPalm(ctx, 0.975 * W, 0.97 * H, 0.24 * H, { lean: 0.10 });
  drawCrowd(ctx, 0.62 * W, 0.955 * H, 0.38 * W, 0.045 * H);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = Math.max(1, H * 0.002);
  for (const ly of [0.86, 0.90, 0.94]) {
    ctx.beginPath();
    ctx.moveTo(0.02 * W, ly * H);
    ctx.lineTo(0.62 * W, ly * H);
    ctx.stroke();
  }
}

function sunsetPanels(W, H) {
  return [
    { name: 'hero', photo: 'summer', rect: { x: 0, y: 0, w: 0.645 * W, h: 0.65 * H }, face: true, fx: 0.66, fy: 0.30, zoom: 0.50 },
    { name: 'pier', photo: 'pier', rect: { x: 0.645 * W, y: 0, w: 0.355 * W, h: 0.335 * H }, face: true, fx: 0.38, fy: 0.08, zoom: 0.75 },
    { name: 'porsche', photo: 'porsche', rect: { x: 0.645 * W, y: 0.335 * H, w: 0.355 * W, h: 0.315 * H }, face: true, fx: 0.78, fy: 0.22, zoom: 0.47 },
    // pool band: stretched crowd + pool, no face in the source rect
    { name: 'pool', photo: 'summer', rect: { x: 0, y: 0.65 * H, w: 0.645 * W, h: 0.35 * H }, face: false, stretch: { src: { x0: 0.02, y0: 0.28, x1: 0.57, y1: 0.88 }, dest: { x: 0, y: 0.65 * H, w: 0.645 * W, h: 0.35 * H } } },
  ];
}

// ---------------------------------------------------------------- recipe 2

function drawNeon(ctx, W, H, photos, grade) {
  // top strip: badge panel + two dark-tinted photo panels
  ctx.fillStyle = '#0D1230';
  ctx.fillRect(0, 0, 0.28 * W, 0.25 * H);
  drawDots(ctx, 0, 0, 0.28 * W, 0.25 * H, 14, 0.16);
  const pierT = { x: 0.28 * W, y: 0, w: 0.36 * W, h: 0.25 * H };
  const porscheT = { x: 0.64 * W, y: 0, w: 0.36 * W, h: 0.25 * H };
  // Top strip: tight on the faces (the colour-only optimiser put the
  // windows where no face is — framing violations). Face-based crops:
  drawCover(ctx, photos.pier, pierT, 0.33, 0.20, 0.75);
  drawCover(ctx, photos.porsche, porscheT, 0.71, 0.21, 0.28);
  ctx.fillStyle = 'rgba(4,32,54,0.72)';
  ctx.fillRect(pierT.x, pierT.y, pierT.w, pierT.h);
  ctx.fillStyle = 'rgba(6,30,70,0.72)';
  ctx.fillRect(porscheT.x, porscheT.y, porscheT.w, porscheT.h);
  vicePdBand(ctx, 0.64 * W, 0.185 * H, 0.36 * W, 0.065 * H);
  // middle band: boulevard at night, rich teal (not grey-blue).
  // A cover crop can never make the face small enough (the portrait photo
  // is too narrow for this wide band), so the reference draws the photo
  // STRETCHED: full photo into a dest rect one cover-height tall starting
  // at y 0.279H, clipped to the band. The face lands at band (0.42, 0.34),
  // small and whole, with palms across the full width.
  const mid = { x: 0, y: 0.25 * H, w: W, h: 0.50 * H };
  ctx.save();
  ctx.beginPath();
  ctx.rect(mid.x, mid.y, mid.w, mid.h);
  ctx.clip();
  drawStretched(ctx, photos.boulevard, { x: 0, y: 0.279 * H, w: W, h: H }, { x0: 0, y0: 0, x1: 1, y1: 1 });
  ctx.restore();
  ctx.fillStyle = 'rgba(3,20,40,0.70)';
  ctx.fillRect(mid.x, mid.y, mid.w, mid.h);
  const tg = ctx.createLinearGradient(0, 0.25 * H, 0, 0.75 * H);
  tg.addColorStop(0, 'rgba(0,55,95,0.38)');
  tg.addColorStop(0.6, 'rgba(0,90,118,0.32)');
  tg.addColorStop(1, 'rgba(4,42,80,0.36)');
  ctx.fillStyle = tg;
  ctx.fillRect(mid.x, mid.y, mid.w, mid.h);
  drawDots(ctx, mid.x, mid.y, mid.w, mid.h, 18, 0.08);
  // one drawn palm at the left edge only — the photo's own palms fill the rest
  drawPalm(ctx, 0.05 * W, 0.72 * H, 0.30 * H, { lean: 0.08 });
  // sparkles in the night sky
  for (const [sx, sy, ss] of [[0.15, 0.30, 5], [0.35, 0.28, 4], [0.45, 0.33, 6], [0.55, 0.29, 4], [0.68, 0.31, 5], [0.75, 0.45, 4], [0.90, 0.45, 5], [0.30, 0.55, 4]]) {
    drawSparkle(ctx, sx * W, sy * H, ss * (W / 1280));
  }
  // moon in CLEAN sky at (0.84, 0.34), r 0.028W — matches the reference
  // moon size, clears the cyan divider above it, no palm behind it
  drawMoon(ctx, 0.84 * W, 0.34 * H, 0.028 * W);
  // cyan dividers
  ctx.fillStyle = INK.cyan;
  ctx.fillRect(0, 0.25 * H - 2, W, 3);
  ctx.fillRect(0, 0.75 * H - 2, W, 3);
  // bottom band
  const bg = ctx.createLinearGradient(0, 0.75 * H, 0, H);
  bg.addColorStop(0, '#0A1428');
  bg.addColorStop(1, '#0B1026');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0.75 * H, W, 0.25 * H);
  // badge + stars in the top-left panel
  badgeWithStars(ctx, W, H, 0.035 * W, 0.028 * H, 0.19 * W, 0.085 * H, 0.022);
  // gold title
  const gold = ctx.createLinearGradient(0, 0.68 * H, 0, 0.80 * H);
  gold.addColorStop(0, '#FFE066');
  gold.addColorStop(1, '#FF9E00');
  drawDisplayText(ctx, 'NEON NIGHT DRIVE', 0.50 * W, 0.79 * H, 0.15 * H, { maxW: 0.82 * W, gradient: gold, shear: -0.04 });
  drawCarSide(ctx, 0.02 * W, 0.83 * H, 0.38 * W, 0.13 * H);
  drawPill(ctx, 0.50 * W, 0.90 * H, 'AFTER DARK IN LEONIDA', { h: 0.042 * H, rim: INK.pink });
  drawPill(ctx, 0.93 * W, 0.80 * H, 'CLUB', { h: 0.038 * H, rim: INK.cyan });
  drawDollar(ctx, 0.865 * W, 0.685 * H, 0.020 * W);
  drawCrowd(ctx, 0.55 * W, 0.97 * H, 0.44 * W, 0.03 * H);
}

function neonPanels(W, H) {
  return [
    { name: 'pier-top', photo: 'pier', rect: { x: 0.28 * W, y: 0, w: 0.36 * W, h: 0.25 * H }, face: true, fx: 0.33, fy: 0.20, zoom: 0.75 },
    { name: 'porsche-top', photo: 'porsche', rect: { x: 0.64 * W, y: 0, w: 0.36 * W, h: 0.25 * H }, face: true, fx: 0.71, fy: 0.21, zoom: 0.28 },
    // middle band: stretched boulevard, face at band (0.42, 0.34)
    { name: 'boulevard', photo: 'boulevard', rect: { x: 0, y: 0.25 * H, w: W, h: 0.50 * H }, face: true, stretch: { src: { x0: 0, y0: 0, x1: 1, y1: 1 }, dest: { x: 0, y: 0.279 * H, w: W, h: H } } },
  ];
}

// ---------------------------------------------------------------- recipe 3

function drawLeonida(ctx, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = INK.navy;
  ctx.fill();
  ctx.lineWidth = Math.max(3, r * 0.09);
  ctx.strokeStyle = '#FF7A18';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(2, r * 0.05);
  ctx.strokeStyle = INK.cyan;
  ctx.stroke();
  fillStar(ctx, cx, cy - r * 0.22, r * 0.30, INK.starYellow);
  ctx.fillStyle = INK.white;
  ctx.font = `900 ${Math.round(r * 0.30)}px "NotoSans-CondensedBlack", "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('LEONIDA', cx, cy + r * 0.38);
  ctx.restore();
}

function drawStrip(ctx, W, H, photos, grade) {
  // top band: blurred photo texture + magenta tint + dots (never flat pink)
  drawBlurBand(ctx, photos.boulevard, 0, 0, W, 0.26 * H, 'rgba(255,46,136,0.50)', 'rgba(190,25,105,0.60)');
  drawDots(ctx, 0, 0, 0.30 * W, 0.10 * H, 14, 0.18);
  // thin dark arcs in the top band, right side — subtle
  ctx.strokeStyle = 'rgba(20,0,30,0.32)';
  ctx.lineWidth = Math.max(1.5, W * 0.002);
  ctx.beginPath();
  ctx.moveTo(0.62 * W, 0.10 * H);
  ctx.quadraticCurveTo(0.72 * W, 0.16 * H, 0.78 * W, 0.09 * H);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0.66 * W, 0.16 * H);
  ctx.quadraticCurveTo(0.74 * W, 0.21 * H, 0.80 * W, 0.15 * H);
  ctx.stroke();
  // middle band: five photo columns — crops measured against the v26
  // reference (iteration 2): faces tight and dominant in each column.
  const cols = [
    { photo: 'summer', fx: 0.65, fy: 0.10, zoom: 0.35 },
    { photo: 'boulevard', fx: 0.62, fy: 0.47, zoom: 0.70 },
    { photo: 'summer', fx: 0.61, fy: 0.10, zoom: 0.35 },
    { photo: 'porsche', fx: 0.55, fy: 0.15, zoom: 0.35 },
    { photo: 'pier', fx: 0.33, fy: 0.28, zoom: 0.22 },
  ];
  cols.forEach((c, i) => {
    const rect = { x: (i * 0.20) * W, y: 0.26 * H, w: 0.20 * W, h: 0.28 * H };
    drawCover(ctx, photos[c.photo], rect, c.fx, c.fy, c.zoom);
  });
  // pink wash over the photo band, like the reference (strong magenta cast)
  ctx.fillStyle = 'rgba(255,46,136,0.30)';
  ctx.fillRect(0, 0.26 * H, W, 0.28 * H);
  // bottom band: blurred summer photo + purple tint + dots
  drawBlurBand(ctx, photos.summer, 0, 0.54 * H, W, 0.46 * H, 'rgba(60,18,80,0.55)', 'rgba(40,10,60,0.65)');
  drawDots(ctx, 0, 0.54 * H, W, 0.46 * H, 16, 0.10);
  // gutters
  const gw = Math.max(3, W * 0.004);
  for (let i = 1; i < 5; i++) drawGutter(ctx, i * 0.20 * W - gw / 2, 0.26 * H, gw, 0.28 * H);
  drawGutter(ctx, 0, 0.26 * H - gw / 2, W, gw);
  drawGutter(ctx, 0, 0.54 * H - gw / 2, W, gw);
  // badge (no stars, NO birds anywhere near it)
  drawBadge(ctx, 0.035 * W, 0.045 * H, 0.24 * W, 0.052 * H);
  drawPill(ctx, 0.625 * W, 0.035 * H, 'DINER', { h: 0.032 * H, rim: INK.pink });
  drawPill(ctx, 0.705 * W, 0.062 * H, '24H', { h: 0.032 * H, rim: INK.cyan });
  drawLeonida(ctx, 0.895 * W, 0.075 * H, 0.072 * W);
  // title, two lines
  drawDisplayText(ctx, 'VICE', 0.50 * W, 0.585 * H, 0.175 * W, { maxW: 0.85 * W });
  drawDisplayText(ctx, 'STRIP', 0.50 * W, 0.715 * H, 0.175 * W, { maxW: 0.85 * W });
  // dressing
  drawPalm(ctx, 0.03 * W, 0.92 * H, 0.28 * H, { lean: 0.08 });
  drawPalm(ctx, 0.985 * W, 0.90 * H, 0.20 * H, { lean: -0.10 });
  drawCarSide(ctx, 0.14 * W, 0.955 * H, 0.22 * W, 0.035 * H);
  drawDollar(ctx, 0.52 * W, 0.815 * H, 0.022 * W);
  drawPill(ctx, 0.50 * W, 0.885 * H, 'FIVE MOMENTS - ONE CITY', { h: 0.040 * H, rim: INK.pink });
  // palm icon circle, bottom right — a small self-contained palm mark
  ctx.save();
  ctx.beginPath();
  ctx.arc(0.885 * W, 0.945 * H, 0.052 * W, 0, Math.PI * 2);
  ctx.fillStyle = INK.navy;
  ctx.fill();
  ctx.lineWidth = Math.max(2, W * 0.004);
  ctx.strokeStyle = INK.cyan;
  ctx.stroke();
  ctx.clip();
  const icx = 0.885 * W;
  const icy = 0.945 * H;
  const ir = 0.052 * W;
  ctx.strokeStyle = INK.cyan;
  ctx.lineWidth = Math.max(2, ir * 0.10);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(icx, icy + ir * 0.75);
  ctx.quadraticCurveTo(icx + ir * 0.08, icy, icx, icy - ir * 0.55);
  ctx.stroke();
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * (0.15 + (i / 4) * 0.70);
    ctx.beginPath();
    ctx.moveTo(icx, icy - ir * 0.55);
    ctx.quadraticCurveTo(
      icx + Math.cos(a) * ir * 0.45, icy - ir * 0.55 - ir * 0.18,
      icx + Math.cos(a) * ir * 0.80, icy - ir * 0.55 + Math.sin(a) * ir * 0.35);
    ctx.stroke();
  }
  ctx.restore();
}

function stripPanels(W, H) {
  const cols = [
    { photo: 'summer', fx: 0.65, fy: 0.10, zoom: 0.35 },
    { photo: 'boulevard', fx: 0.62, fy: 0.47, zoom: 0.70 },
    { photo: 'summer', fx: 0.61, fy: 0.10, zoom: 0.35 },
    { photo: 'porsche', fx: 0.55, fy: 0.15, zoom: 0.35 },
    { photo: 'pier', fx: 0.33, fy: 0.28, zoom: 0.22 },
  ];
  return cols.map((c, i) => ({
    name: 'col' + (i + 1), photo: c.photo,
    rect: { x: (i * 0.20) * W, y: 0.26 * H, w: 0.20 * W, h: 0.28 * H },
    face: true, fx: c.fx, fy: c.fy, zoom: c.zoom,
  }));
}

// ---------------------------------------------------------------- recipe 4

function drawDuo(ctx, W, H, photos, grade) {
  const half = { w: 0.5 * W, h: 0.5 * H };
  drawCover(ctx, photos.boulevard, { x: 0, y: 0, ...half }, FACE.boulevard.x, 0.16, 0.85);
  drawCover(ctx, photos.summer, { x: 0.5 * W, y: 0, ...half }, FACE.summer.x, FACE.summer.y, 0.75);
  drawCover(ctx, photos.pier, { x: 0, y: 0.5 * H, ...half }, FACE.pier.x, FACE.pier.y, 0.75);
  drawCover(ctx, photos.porsche, { x: 0.5 * W, y: 0.5 * H, ...half }, 0.60, 0.30, 0.92);
  gradeWash(ctx, W, H, grade);
  const gw = Math.max(4, W * 0.003);
  drawGutter(ctx, 0.5 * W - gw / 2, 0, gw, H);
  drawGutter(ctx, 0, 0.5 * H - gw / 2, W, gw);
  badgeWithStars(ctx, W, H, 0.045 * W, 0.035 * H, 0.20 * W, 0.075 * H, 0.028);
  drawLeonida(ctx, 0.90 * W, 0.09 * H, 0.065 * W);
  drawDisplayText(ctx, 'GOLDEN HOUR', 0.50 * W, 0.55 * H, 0.12 * H, { maxW: 0.70 * W });
  drawPill(ctx, 0.50 * W, 0.88 * H, 'A LEONIDA STORY', { h: 0.042 * H, rim: INK.pink });
  drawPalm(ctx, 0.02 * W, 0.48 * H, 0.26 * H, { lean: 0.10 });
  drawPalm(ctx, 0.98 * W, 0.97 * H, 0.24 * H, { lean: -0.08 });
  drawCrowd(ctx, 0.60 * W, 0.955 * H, 0.38 * W, 0.045 * H);
}

function duoPanels(W, H) {
  const half = { w: 0.5 * W, h: 0.5 * H };
  return [
    { name: 'boulevard', photo: 'boulevard', rect: { x: 0, y: 0, ...half }, face: true, fx: FACE.boulevard.x, fy: 0.16, zoom: 0.85 },
    { name: 'summer', photo: 'summer', rect: { x: 0.5 * W, y: 0, ...half }, face: true, fx: FACE.summer.x, fy: FACE.summer.y, zoom: 0.75 },
    { name: 'pier', photo: 'pier', rect: { x: 0, y: 0.5 * H, ...half }, face: true, fx: FACE.pier.x, fy: FACE.pier.y, zoom: 0.75 },
    { name: 'porsche', photo: 'porsche', rect: { x: 0.5 * W, y: 0.5 * H, ...half }, face: true, fx: 0.60, fy: 0.30, zoom: 0.92 },
  ];
}

// ---------------------------------------------------------------- registry

export const RECIPES = {
  sunset: { id: 'sunset', name: 'Sunset Beach Heist', title: 'SUNSET HEIST', grade: 'sunset', size: [1920, 1080], draw: drawSunset, panels: sunsetPanels },
  neon: { id: 'neon', name: 'Neon Night Drive', title: 'NEON NIGHT DRIVE', grade: 'neon', size: [1920, 1080], draw: drawNeon, panels: neonPanels },
  strip: { id: 'strip', name: 'Vice Strip', title: 'VICE STRIP', grade: 'vice', size: [1080, 1350], draw: drawStrip, panels: stripPanels },
  duo: { id: 'duo', name: 'Golden Hour Duo', title: 'GOLDEN HOUR', grade: 'golden', size: [1920, 1080], draw: drawDuo, panels: duoPanels },
};

export const RECIPE_ORDER = ['sunset', 'neon', 'strip', 'duo'];

/** Render a recipe into the canvas context at W x H. */
export function renderCover(ctx, recipeId, W, H, photos, gradeId) {
  const recipe = RECIPES[recipeId] || RECIPES.sunset;
  const grade = GRADES[gradeId || recipe.grade] || GRADES[recipe.grade];
  ctx.clearRect(0, 0, W, H);
  recipe.draw(ctx, W, H, photos, grade);
  return recipe;
}

/** Framing self-check for a recipe: every panel face inside its panel. */
export function framingCheck(recipeId, W, H, photos) {
  const recipe = RECIPES[recipeId] || RECIPES.sunset;
  return checkFraming(photos, recipe.panels(W, H));
}

// Six panel layouts for the landscape recipes (strip keeps its own).
export const LAYOUTS = [
  { id: 'sunset-hero', name: 'Sunset Hero', note: 'hero + 2 side panels' },
  { id: 'grid-hero', name: 'Grid + Hero', note: 'hero left, 2x2 right' },
  { id: 'vice-strip', name: 'Vice Strip', note: 'five vertical columns' },
  { id: 'triptych', name: 'Triptych', note: 'three equal panels' },
  { id: 'comic-quad', name: 'Comic Quad', note: '2 x 2 grid' },
  { id: 'cinema-strip', name: 'Cinema Strip', note: 'wide top, three below' },
];
