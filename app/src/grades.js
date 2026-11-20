// grades.js — six loud colour grades (v3, look unchanged from v2).
//
// A grade is two things: a canvas filter string applied while the photo draws,
// and an ordered stack of composite washes laid over the panel afterwards. `k`
// (0..1) is the intensity slider; every grade stays saturated and bold at the
// default — pale is not on the menu.
//
// v3 keeps v2's Neon Night fix: the whole panel is recoloured with a 'color'
// blend (wash hue + saturation over the photo's own luminance) so no warm skin
// survives; magenta/cyan appear only as corner glows. Teal Noir is cool-dominant
// the same way.
//
// Rather than six hand-written paint functions, each grade is declared as data
// (filter coefficients + a list of wash steps) and one interpreter runs the
// steps in order. The canvas calls — and therefore the pixels — are identical.

// rgba() with the intensity baked into the alpha channel.
const tint = (r, g, b, a, k) => `rgba(${r},${g},${b},${(a * k).toFixed(3)})`;

// Compose the photo filter string from coefficients. `bri` may be negative
// (night grades darken); `sep` adds a sepia term instead of brightness.
function filterFrom({ sat, con, bri, sep }, k) {
  const parts = [`saturate(${1 + sat * k})`, `contrast(${1 + con * k})`];
  if (bri !== undefined) parts.push(`brightness(${1 + bri * k})`);
  if (sep !== undefined) parts.push(`sepia(${sep * k})`);
  return parts.join(' ');
}

// A wash step's fill style. `rect` is [fx, fy, fw, fh] in panel fractions; a
// stop colour is either a literal string or an [r,g,b,a] array tinted by k.
function stepFill(ctx, x, y, w, h, step, k) {
  const stopColor = (c) => (Array.isArray(c) ? tint(c[0], c[1], c[2], c[3], k) : c);
  if (step.solid) return stopColor(step.solid);
  if (step.glow) {
    const g = step.glow;
    const cx = x + g.cx * w;
    const cy = y + g.cy * h;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, g.r * Math.max(w, h));
    grad.addColorStop(0, tint(g.rgb[0], g.rgb[1], g.rgb[2], g.a, k));
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    return grad;
  }
  const [fx, fy, fw, fh] = step.rect ?? [0, 0, 1, 1];
  const x0 = x + fx * w;
  const y0 = y + fy * h;
  const grad =
    step.grad === 'd'
      ? ctx.createLinearGradient(x0, y0, x0 + fw * w, y0 + fh * h)
      : ctx.createLinearGradient(x0, y0, x0, y0 + fh * h);
  for (const [at, color] of step.stops) grad.addColorStop(at, stopColor(color));
  return grad;
}

// Run a grade's wash stack inside the current clip, in declared order.
function runSteps(ctx, x, y, w, h, steps, k) {
  for (const step of steps) {
    ctx.globalCompositeOperation = step.op;
    ctx.fillStyle = stepFill(ctx, x, y, w, h, step, k);
    ctx.fillRect(x, y, w, h);
  }
}

export const GRADES = [
  {
    id: 'sunset',
    name: 'Sunset',
    swatch: ['#FF2E88', '#FF7A18'],
    coeff: { sat: 0.85, con: 0.18, bri: 0.05 },
    // The Vice City sky: purple crown, magenta heart, orange floor.
    steps: [
      { op: 'overlay', grad: 'v', stops: [[0, [43, 10, 74, 0.6]], [0.45, [255, 46, 136, 0.42]], [1, [255, 122, 24, 0.66]]] },
      { op: 'screen', grad: 'v', rect: [0, 0.55, 1, 0.45], stops: [[0, 'rgba(255,122,24,0)'], [1, [255, 158, 0, 0.34]]] },
    ],
  },
  {
    id: 'neon-night',
    name: 'Neon Night',
    swatch: ['#0A1030', '#00E5FF'],
    coeff: { sat: 0.5, con: 0.42, bri: -0.46 },
    steps: [
      // 1 — sink the panel into night with a cold multiply.
      { op: 'multiply', grad: 'v', stops: [[0, [16, 20, 64, 0.82]], [0.6, [20, 24, 70, 0.66]], [1, [6, 8, 28, 0.86]]] },
      // 2 — recolour EVERYTHING cold: 'color' keeps luminance, takes wash hue +
      // saturation, turning warm skin to cold steel.
      { op: 'color', solid: [20, 120, 210, 0.92] },
      // 3 — push saturation a little further so the neon reads. Still cool.
      { op: 'saturation', solid: [0, 180, 255, 0.4] },
      // 4 — magenta / cyan exist only as corner glows, never a warm wash.
      { op: 'screen', glow: { cx: 0, cy: 0, r: 0.7, rgb: [255, 46, 136], a: 0.3 } },
      { op: 'screen', glow: { cx: 1, cy: 1, r: 0.7, rgb: [0, 229, 255], a: 0.32 } },
    ],
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    swatch: ['#FFD60A', '#FF7A18'],
    coeff: { sat: 0.6, con: 0.14, sep: 0.32 },
    steps: [
      { op: 'overlay', grad: 'v', stops: [[0, [255, 214, 10, 0.46]], [0.55, [255, 158, 0, 0.38]], [1, [210, 84, 24, 0.52]]] },
      { op: 'soft-light', solid: [255, 196, 138, 0.55] },
    ],
  },
  {
    id: 'vice-pink',
    name: 'Vice Pink',
    swatch: ['#FF2E88', '#FF6EC7'],
    coeff: { sat: 0.9, con: 0.22 },
    steps: [
      { op: 'overlay', grad: 'd', stops: [[0, [255, 46, 136, 0.6]], [0.55, [255, 110, 199, 0.44]], [1, [123, 47, 190, 0.58]]] },
      { op: 'multiply', solid: [255, 46, 136, 0.22] },
      { op: 'screen', grad: 'v', rect: [0, 0, 1, 0.4], stops: [[0, [255, 110, 199, 0.28]], [1, 'rgba(0,0,0,0)']] },
    ],
  },
  {
    id: 'teal-noir',
    name: 'Teal Noir',
    swatch: ['#0E3B43', '#00D4FF'],
    coeff: { sat: 0.45, con: 0.52, bri: -0.44 },
    steps: [
      { op: 'multiply', grad: 'v', stops: [[0, [14, 59, 67, 0.82]], [0.5, [18, 32, 50, 0.68]], [1, [8, 26, 34, 0.86]]] },
      // Cool recolour so skin cannot go warm under the teal.
      { op: 'color', solid: [20, 110, 130, 0.6] },
      { op: 'screen', grad: 'v', rect: [0, 0.6, 1, 0.4], stops: [[0, 'rgba(0,0,0,0)'], [1, [0, 212, 255, 0.24]]] },
      { op: 'screen', glow: { cx: 1, cy: 0, r: 0.5, rgb: [255, 158, 0], a: 0.1 } },
    ],
  },
  {
    id: 'ultraviolet',
    name: 'Ultraviolet',
    swatch: ['#7B2FBE', '#00E5FF'],
    coeff: { sat: 0.75, con: 0.26, bri: -0.06 },
    steps: [
      { op: 'overlay', grad: 'd', stops: [[0, [123, 47, 190, 0.6]], [0.6, [255, 46, 136, 0.38]], [1, [43, 10, 74, 0.64]]] },
      { op: 'screen', grad: 'v', rect: [0, 0.65, 1, 0.35], stops: [[0, 'rgba(0,0,0,0)'], [1, [0, 229, 255, 0.26]]] },
    ],
  },
];

// Attach the live filter + paint functions derived from each grade's data.
for (const grade of GRADES) {
  grade.filter = (k) => filterFrom(grade.coeff, k);
  grade.paint = (ctx, x, y, w, h, k) => runSteps(ctx, x, y, w, h, grade.steps, k);
}

export const gradeById = (id) => GRADES.find((g) => g.id === id) ?? GRADES[0];

/** Run a grade's wash stack inside the current clip; restores composite op. */
export function paintGrade(ctx, x, y, w, h, grade, k) {
  ctx.save();
  grade.paint(ctx, x, y, w, h, k);
  ctx.restore();
}
