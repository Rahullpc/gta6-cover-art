// grades.js — six bold colour grades for v2.
//
// A grade is a canvas filter applied while the photo is drawn, plus a stack of
// gradient washes composited over the panel. `k` (0..1) is the intensity slider;
// every grade stays loud and saturated at the default — pale is not an option.
//
// v2 fix: Neon Night is now fully cold. v1 left warm skin under a magenta screen
// wash; v2 recolours the whole panel with a 'color' blend (source hue/saturation
// over the photo's luminance) so no warm skin survives, then adds neon magenta /
// cyan only as edge glows. Teal Noir is likewise cool-dominant.

const wash = (r, g, b, a, k) => `rgba(${r},${g},${b},${(a * k).toFixed(3)})`;

function vertical(ctx, x, y, w, h, stops) {
  const g = ctx.createLinearGradient(x, y, x, y + h);
  for (const [at, color] of stops) g.addColorStop(at, color);
  return g;
}

function diagonal(ctx, x, y, w, h, stops) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  for (const [at, color] of stops) g.addColorStop(at, color);
  return g;
}

// Radial neon glow pinned to a corner, fading to nothing toward the centre so
// the face area keeps its grade without a warm cast.
function cornerGlow(ctx, x, y, w, h, cx, cy, radius, color, a, k) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  g.addColorStop(0, wash(...color, a, k));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

export const GRADES = [
  {
    id: 'sunset',
    name: 'Sunset',
    swatch: ['#FF2E88', '#FF7A18'],
    filter: (k) => `saturate(${1 + 0.85 * k}) contrast(${1 + 0.18 * k}) brightness(${1 + 0.05 * k})`,
    paint(ctx, x, y, w, h, k) {
      // Purple crown -> magenta heart -> orange floor: the Vice City sky.
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = vertical(ctx, x, y, w, h, [
        [0, wash(43, 10, 74, 0.6, k)],
        [0.45, wash(255, 46, 136, 0.42, k)],
        [1, wash(255, 122, 24, 0.66, k)],
      ]);
      ctx.fillRect(x, y, w, h);
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = vertical(ctx, x, y + h * 0.55, w, h * 0.45, [
        [0, 'rgba(255,122,24,0)'],
        [1, wash(255, 158, 0, 0.34, k)],
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
      // 1. Deepen into night with a cold multiply.
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = vertical(ctx, x, y, w, h, [
        [0, wash(16, 20, 64, 0.82, k)],
        [0.6, wash(20, 24, 70, 0.66, k)],
        [1, wash(6, 8, 28, 0.86, k)],
      ]);
      ctx.fillRect(x, y, w, h);
      // 2. Recolour EVERYTHING cold: 'color' takes the wash's hue + saturation
      //    and keeps the photo's luminance, so warm skin becomes cold steel.
      ctx.globalCompositeOperation = 'color';
      ctx.fillStyle = wash(20, 120, 210, 0.92, k);
      ctx.fillRect(x, y, w, h);
      // 3. A touch more saturation so the neon reads, still fully cool.
      ctx.globalCompositeOperation = 'saturation';
      ctx.fillStyle = wash(0, 180, 255, 0.4, k);
      ctx.fillRect(x, y, w, h);
      // 4. Neon magenta / cyan only as corner glows — never a warm centre wash.
      ctx.globalCompositeOperation = 'screen';
      const r = Math.max(w, h) * 0.7;
      cornerGlow(ctx, x, y, w, h, x, y, r, [255, 46, 136], 0.3, k);
      cornerGlow(ctx, x, y, w, h, x + w, y + h, r, [0, 229, 255], 0.32, k);
    },
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    swatch: ['#FFD60A', '#FF7A18'],
    filter: (k) => `saturate(${1 + 0.6 * k}) contrast(${1 + 0.14 * k}) sepia(${0.32 * k})`,
    paint(ctx, x, y, w, h, k) {
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = vertical(ctx, x, y, w, h, [
        [0, wash(255, 214, 10, 0.46, k)],
        [0.55, wash(255, 158, 0, 0.38, k)],
        [1, wash(210, 84, 24, 0.52, k)],
      ]);
      ctx.fillRect(x, y, w, h);
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = wash(255, 196, 138, 0.55, k);
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
      ctx.fillStyle = diagonal(ctx, x, y, w, h, [
        [0, wash(255, 46, 136, 0.6, k)],
        [0.55, wash(255, 110, 199, 0.44, k)],
        [1, wash(123, 47, 190, 0.58, k)],
      ]);
      ctx.fillRect(x, y, w, h);
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = wash(255, 46, 136, 0.22, k);
      ctx.fillRect(x, y, w, h);
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = vertical(ctx, x, y, w, h * 0.4, [
        [0, wash(255, 110, 199, 0.28, k)],
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
      ctx.fillStyle = vertical(ctx, x, y, w, h, [
        [0, wash(14, 59, 67, 0.82, k)],
        [0.5, wash(18, 32, 50, 0.68, k)],
        [1, wash(8, 26, 34, 0.86, k)],
      ]);
      ctx.fillRect(x, y, w, h);
      // Cool recolour keeps skin from going warm under the teal.
      ctx.globalCompositeOperation = 'color';
      ctx.fillStyle = wash(20, 110, 130, 0.6, k);
      ctx.fillRect(x, y, w, h);
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = vertical(ctx, x, y + h * 0.6, w, h * 0.4, [
        [0, 'rgba(0,0,0,0)'],
        [1, wash(0, 212, 255, 0.24, k)],
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
      ctx.fillStyle = diagonal(ctx, x, y, w, h, [
        [0, wash(123, 47, 190, 0.6, k)],
        [0.6, wash(255, 46, 136, 0.38, k)],
        [1, wash(43, 10, 74, 0.64, k)],
      ]);
      ctx.fillRect(x, y, w, h);
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = vertical(ctx, x, y + h * 0.65, w, h * 0.35, [
        [0, 'rgba(0,0,0,0)'],
        [1, wash(0, 229, 255, 0.26, k)],
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