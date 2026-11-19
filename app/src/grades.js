// grades.js — six loud colour grades, v2 edition.
//
// Each grade is two things: a canvas filter string applied while the photo is
// drawn, and a stack of gradient washes composited over the panel afterwards.
// `k` (0..1) is the intensity slider. Every grade stays saturated and bold at
// the default setting — pale is not on the menu.
//
// The v2 fix lives in Neon Night: v1 screened magenta over the photo and warm
// skin tones survived underneath. v2 recolours the ENTIRE panel with a 'color'
// blend (the wash's hue + saturation over the photo's own luminance), so no
// warm skin can survive; magenta and cyan appear only as corner glows. Teal
// Noir gets the same cool-dominant treatment.

// rgba() with the intensity baked into the alpha channel.
const tint = (r, g, b, a, k) => `rgba(${r},${g},${b},${(a * k).toFixed(3)})`;

function verticalWash(ctx, x, y, w, h, stops) {
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  for (const [at, color] of stops) grad.addColorStop(at, color);
  return grad;
}

function diagonalWash(ctx, x, y, w, h, stops) {
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  for (const [at, color] of stops) grad.addColorStop(at, color);
  return grad;
}

// A radial neon glow pinned to a corner, fading to nothing toward the centre
// so the face area keeps its grade without picking up a warm cast.
function cornerGlow(ctx, x, y, w, h, cx, cy, radius, rgb, alpha, k) {
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  grad.addColorStop(0, tint(...rgb, alpha, k));
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
}

export const GRADES = [
  {
    id: 'sunset',
    name: 'Sunset',
    swatch: ['#FF2E88', '#FF7A18'],
    filter: (k) => `saturate(${1 + 0.85 * k}) contrast(${1 + 0.18 * k}) brightness(${1 + 0.05 * k})`,
    paint(ctx, x, y, w, h, k) {
      // The Vice City sky: purple crown, magenta heart, orange floor.
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = verticalWash(ctx, x, y, w, h, [
        [0, tint(43, 10, 74, 0.6, k)],
        [0.45, tint(255, 46, 136, 0.42, k)],
        [1, tint(255, 122, 24, 0.66, k)],
      ]);
      ctx.fillRect(x, y, w, h);
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = verticalWash(ctx, x, y + h * 0.55, w, h * 0.45, [
        [0, 'rgba(255,122,24,0)'],
        [1, tint(255, 158, 0, 0.34, k)],
      ]);
      ctx.fillRect(x, y, w, h);
    },
  },
  {
    id: 'neon-night',
    name: 'Neon Night',
    swatch: ['#0A1030', '#00E5FF'],
    filter: (k) => `saturate(${1 + 0.5 * k}) contrast(${1 + 0.42 * k}) brightness(${1 - 0.46 * k})`,
    paint(ctx, x, y, w, h, k) {
      // Step 1 — sink the panel into night with a cold multiply.
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = verticalWash(ctx, x, y, w, h, [
        [0, tint(16, 20, 64, 0.82, k)],
        [0.6, tint(20, 24, 70, 0.66, k)],
        [1, tint(6, 8, 28, 0.86, k)],
      ]);
      ctx.fillRect(x, y, w, h);
      // Step 2 — recolour EVERYTHING cold. 'color' keeps the photo's luminance
      // but takes the wash's hue + saturation, turning warm skin to cold steel.
      ctx.globalCompositeOperation = 'color';
      ctx.fillStyle = tint(20, 120, 210, 0.92, k);
      ctx.fillRect(x, y, w, h);
      // Step 3 — push saturation a little further so the neon reads. Still cool.
      ctx.globalCompositeOperation = 'saturation';
      ctx.fillStyle = tint(0, 180, 255, 0.4, k);
      ctx.fillRect(x, y, w, h);
      // Step 4 — magenta / cyan exist only as corner glows, never a warm wash.
      ctx.globalCompositeOperation = 'screen';
      const radius = Math.max(w, h) * 0.7;
      cornerGlow(ctx, x, y, w, h, x, y, radius, [255, 46, 136], 0.3, k);
      cornerGlow(ctx, x, y, w, h, x + w, y + h, radius, [0, 229, 255], 0.32, k);
    },
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    swatch: ['#FFD60A', '#FF7A18'],
    filter: (k) => `saturate(${1 + 0.6 * k}) contrast(${1 + 0.14 * k}) sepia(${0.32 * k})`,
    paint(ctx, x, y, w, h, k) {
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = verticalWash(ctx, x, y, w, h, [
        [0, tint(255, 214, 10, 0.46, k)],
        [0.55, tint(255, 158, 0, 0.38, k)],
        [1, tint(210, 84, 24, 0.52, k)],
      ]);
      ctx.fillRect(x, y, w, h);
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = tint(255, 196, 138, 0.55, k);
      ctx.fillRect(x, y, w, h);
    },
  },
  {
    id: 'vice-pink',
    name: 'Vice Pink',
    swatch: ['#FF2E88', '#FF6EC7'],
    filter: (k) => `saturate(${1 + 0.9 * k}) contrast(${1 + 0.22 * k})`,
    paint(ctx, x, y, w, h, k) {
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = diagonalWash(ctx, x, y, w, h, [
        [0, tint(255, 46, 136, 0.6, k)],
        [0.55, tint(255, 110, 199, 0.44, k)],
        [1, tint(123, 47, 190, 0.58, k)],
      ]);
      ctx.fillRect(x, y, w, h);
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = tint(255, 46, 136, 0.22, k);
      ctx.fillRect(x, y, w, h);
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = verticalWash(ctx, x, y, w, h * 0.4, [
        [0, tint(255, 110, 199, 0.28, k)],
        [1, 'rgba(0,0,0,0)'],
      ]);
      ctx.fillRect(x, y, w, h);
    },
  },
  {
    id: 'teal-noir',
    name: 'Teal Noir',
    swatch: ['#0E3B43', '#00D4FF'],
    filter: (k) => `saturate(${1 + 0.45 * k}) contrast(${1 + 0.52 * k}) brightness(${1 - 0.44 * k})`,
    paint(ctx, x, y, w, h, k) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = verticalWash(ctx, x, y, w, h, [
        [0, tint(14, 59, 67, 0.82, k)],
        [0.5, tint(18, 32, 50, 0.68, k)],
        [1, tint(8, 26, 34, 0.86, k)],
      ]);
      ctx.fillRect(x, y, w, h);
      // Cool recolour so skin cannot go warm under the teal.
      ctx.globalCompositeOperation = 'color';
      ctx.fillStyle = tint(20, 110, 130, 0.6, k);
      ctx.fillRect(x, y, w, h);
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = verticalWash(ctx, x, y + h * 0.6, w, h * 0.4, [
        [0, 'rgba(0,0,0,0)'],
        [1, tint(0, 212, 255, 0.24, k)],
      ]);
      ctx.fillRect(x, y, w, h);
      cornerGlow(ctx, x, y, w, h, x + w, y, Math.max(w, h) * 0.5, [255, 158, 0], 0.1, k);
    },
  },
  {
    id: 'ultraviolet',
    name: 'Ultraviolet',
    swatch: ['#7B2FBE', '#00E5FF'],
    filter: (k) => `saturate(${1 + 0.75 * k}) contrast(${1 + 0.26 * k}) brightness(${1 - 0.06 * k})`,
    paint(ctx, x, y, w, h, k) {
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = diagonalWash(ctx, x, y, w, h, [
        [0, tint(123, 47, 190, 0.6, k)],
        [0.6, tint(255, 46, 136, 0.38, k)],
        [1, tint(43, 10, 74, 0.64, k)],
      ]);
      ctx.fillRect(x, y, w, h);
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = verticalWash(ctx, x, y + h * 0.65, w, h * 0.35, [
        [0, 'rgba(0,0,0,0)'],
        [1, tint(0, 229, 255, 0.26, k)],
      ]);
      ctx.fillRect(x, y, w, h);
    },
  },
];

export const gradeById = (id) => GRADES.find((g) => g.id === id) ?? GRADES[0];

/** Run a grade's wash stack inside the current clip; restores composite op. */
export function paintGrade(ctx, x, y, w, h, grade, k) {
  ctx.save();
  grade.paint(ctx, x, y, w, h, k);
  ctx.restore();
}
