// Six bold colour grades. Each grade is a canvas filter applied while the
// photo is drawn plus a stack of gradient washes composited over the panel.
// `k` (0..1) is the intensity slider; every grade stays saturated and loud
// at the default 0.9 — pale is not an option. Palette: Vice City sunset.

/** rgba() string with the alpha scaled by the intensity slider. */
function wash(r, g, b, a, k) {
  return `rgba(${r},${g},${b},${(a * k).toFixed(3)})`;
}

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

export const GRADES = [
  {
    id: 'sunset',
    name: 'Sunset',
    swatch: ['#FF2E88', '#FF7A18'],
    filter: (k) => `saturate(${1 + 0.8 * k}) contrast(${1 + 0.16 * k}) brightness(${1 + 0.04 * k})`,
    paint(ctx, x, y, w, h, k) {
      // Purple crown -> magenta heart -> orange floor, the Vice sky.
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = vertical(ctx, x, y, w, h, [
        [0, wash(43, 10, 74, 0.58, k)],
        [0.45, wash(255, 46, 136, 0.4, k)],
        [1, wash(255, 122, 24, 0.64, k)],
      ]);
      ctx.fillRect(x, y, w, h);
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = vertical(ctx, x, y + h * 0.55, w, h * 0.45, [
        [0, 'rgba(255,122,24,0)'],
        [1, wash(255, 158, 0, 0.32, k)],
      ]);
      ctx.fillRect(x, y, w, h);
    },
  },
  {
    id: 'neon-night',
    name: 'Neon Night',
    swatch: ['#2B0A4A', '#00E5FF'],
    filter: (k) => `saturate(${1 + 0.55 * k}) contrast(${1 + 0.38 * k}) brightness(${1 - 0.42 * k})`,
    paint(ctx, x, y, w, h, k) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = vertical(ctx, x, y, w, h, [
        [0, wash(18, 8, 58, 0.8, k)],
        [0.6, wash(43, 10, 74, 0.6, k)],
        [1, wash(8, 4, 26, 0.82, k)],
      ]);
      ctx.fillRect(x, y, w, h);
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = diagonal(ctx, x, y, w, h, [
        [0, wash(255, 46, 136, 0.3, k)],
        [0.5, 'rgba(0,0,0,0)'],
        [1, wash(0, 229, 255, 0.3, k)],
      ]);
      ctx.fillRect(x, y, w, h);
    },
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    swatch: ['#FFD60A', '#FF7A18'],
    filter: (k) => `saturate(${1 + 0.55 * k}) contrast(${1 + 0.12 * k}) sepia(${0.3 * k})`,
    paint(ctx, x, y, w, h, k) {
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = vertical(ctx, x, y, w, h, [
        [0, wash(255, 214, 10, 0.44, k)],
        [0.55, wash(255, 158, 0, 0.36, k)],
        [1, wash(210, 84, 24, 0.5, k)],
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
    filter: (k) => `saturate(${1 + 0.85 * k}) contrast(${1 + 0.2 * k})`,
    paint(ctx, x, y, w, h, k) {
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = diagonal(ctx, x, y, w, h, [
        [0, wash(255, 46, 136, 0.58, k)],
        [0.55, wash(255, 110, 199, 0.42, k)],
        [1, wash(123, 47, 190, 0.56, k)],
      ]);
      ctx.fillRect(x, y, w, h);
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = wash(255, 46, 136, 0.22, k);
      ctx.fillRect(x, y, w, h);
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = vertical(ctx, x, y, w, h * 0.4, [
        [0, wash(255, 110, 199, 0.26, k)],
        [1, 'rgba(0,0,0,0)'],
      ]);
      ctx.fillRect(x, y, w, h);
    },
  },
  {
    id: 'teal-noir',
    name: 'Teal Noir',
    swatch: ['#0E3B43', '#FF9E00'],
    filter: (k) => `saturate(${1 + 0.4 * k}) contrast(${1 + 0.5 * k}) brightness(${1 - 0.45 * k})`,
    paint(ctx, x, y, w, h, k) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = vertical(ctx, x, y, w, h, [
        [0, wash(14, 59, 67, 0.8, k)],
        [0.5, wash(20, 30, 48, 0.65, k)],
        [1, wash(8, 26, 34, 0.85, k)],
      ]);
      ctx.fillRect(x, y, w, h);
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = vertical(ctx, x, y, w, h * 0.5, [
        [0, wash(255, 158, 0, 0.16, k)],
        [1, 'rgba(0,0,0,0)'],
      ]);
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = vertical(ctx, x, y + h * 0.6, w, h * 0.4, [
        [0, 'rgba(0,0,0,0)'],
        [1, wash(0, 212, 255, 0.22, k)],
      ]);
      ctx.fillRect(x, y, w, h);
    },
  },
  {
    id: 'ultraviolet',
    name: 'Ultraviolet',
    swatch: ['#7B2FBE', '#00E5FF'],
    filter: (k) => `saturate(${1 + 0.7 * k}) contrast(${1 + 0.25 * k}) brightness(${1 - 0.05 * k})`,
    paint(ctx, x, y, w, h, k) {
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = diagonal(ctx, x, y, w, h, [
        [0, wash(123, 47, 190, 0.58, k)],
        [0.6, wash(255, 46, 136, 0.36, k)],
        [1, wash(43, 10, 74, 0.62, k)],
      ]);
      ctx.fillRect(x, y, w, h);
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = vertical(ctx, x, y + h * 0.65, w, h * 0.35, [
        [0, 'rgba(0,0,0,0)'],
        [1, wash(0, 229, 255, 0.24, k)],
      ]);
      ctx.fillRect(x, y, w, h);
    },
  },
];

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) ?? GRADES[0];
}

/** Run a grade's wash stack inside the current clip; restores composite op. */
export function paintGrade(ctx, x, y, w, h, grade, k) {
  ctx.save();
  grade.paint(ctx, x, y, w, h, k);
  ctx.restore();
}