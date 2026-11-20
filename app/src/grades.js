// grades.js — six loud colour grades (v4, look unchanged from v2/v3).
//
// A grade is two things: a canvas filter string applied while the photo draws,
// and an ordered stack of composite washes laid over the panel afterwards. `k`
// (0..1) is the intensity slider; every grade stays saturated and bold at the
// default — pale is not on the menu.
//
// The Neon Night fix from v2 holds: the whole panel is recoloured with a 'color'
// blend (wash hue + saturation over the photo's own luminance) so no warm skin
// survives; magenta/cyan appear only as corner glows. Teal Noir is cool-dominant
// the same way.
//
// v4 declares each grade as data (filter coefficients + wash steps in a compact
// tagged shape) and runs them through one interpreter. The canvas calls — and
// therefore the pixels — are identical to v3.

// rgba() with the intensity baked into the alpha channel.
const tint = (r, g, b, a, k) => `rgba(${r},${g},${b},${(a * k).toFixed(3)})`;

// A stop colour is either a literal string or an [r,g,b,a] array tinted by k.
const stopColor = (c, k) => (Array.isArray(c) ? tint(c[0], c[1], c[2], c[3], k) : c);

// Compose the photo filter string from coefficients. `bri` may be negative
// (night grades darken); `sep` adds a sepia term instead of brightness.
function filterFrom(coeff, k) {
  const parts = [`saturate(${1 + coeff.sat * k})`, `contrast(${1 + coeff.con * k})`];
  if (coeff.bri !== undefined) parts.push(`brightness(${1 + coeff.bri * k})`);
  if (coeff.sep !== undefined) parts.push(`sepia(${coeff.sep * k})`);
  return parts.join(' ');
}

// Fill style for a corner glow wash.
function glowStyle(ctx, x, y, w, h, step, k) {
  const cx = x + step.at[0] * w;
  const cy = y + step.at[1] * h;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, step.rad * Math.max(w, h));
  grad.addColorStop(0, tint(step.rgb[0], step.rgb[1], step.rgb[2], step.alpha, k));
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  return grad;
}

// Fill style for a linear wash. `box` is [fx, fy, fw, fh] in panel fractions;
// dir 'd' runs the ramp along the box diagonal, otherwise straight down.
function linearStyle(ctx, x, y, w, h, step, k) {
  const [fx, fy, fw, fh] = step.box ?? [0, 0, 1, 1];
  const x0 = x + fx * w;
  const y0 = y + fy * h;
  const grad = step.dir === 'd'
    ? ctx.createLinearGradient(x0, y0, x0 + fw * w, y0 + fh * h)
    : ctx.createLinearGradient(x0, y0, x0, y0 + fh * h);
  for (const [at, color] of step.ramp) grad.addColorStop(at, stopColor(color, k));
  return grad;
}

// Resolve one wash step's fill style inside the panel rect.
function washStyle(ctx, x, y, w, h, step, k) {
  if (step.kind === 'solid') return stopColor(step.fill, k);
  if (step.kind === 'glow') return glowStyle(ctx, x, y, w, h, step, k);
  return linearStyle(ctx, x, y, w, h, step, k);
}

// Run a grade's wash stack inside the current clip, in declared order.
function runSteps(ctx, x, y, w, h, steps, k) {
  for (const step of steps) {
    ctx.globalCompositeOperation = step.blend;
    ctx.fillStyle = washStyle(ctx, x, y, w, h, step, k);
    ctx.fillRect(x, y, w, h);
  }
}

// Wash constructors keep the grade tables readable.
const linear = (blend, dir, ramp, box) => ({ kind: 'linear', blend, dir, ramp, box });
const solid = (blend, fill) => ({ kind: 'solid', blend, fill });
const glow = (blend, at, rad, rgb, alpha) => ({ kind: 'glow', blend, at, rad, rgb, alpha });

function makeGrade(id, name, swatch, coeff, steps) {
  return { id, name, swatch, coeff, steps };
}

export const GRADES = [
  // The Vice City sky: purple crown, magenta heart, orange floor.
  makeGrade('sunset', 'Sunset', ['#FF2E88', '#FF7A18'], { sat: 0.85, con: 0.18, bri: 0.05 }, [
    linear('overlay', 'v', [[0, [43, 10, 74, 0.6]], [0.45, [255, 46, 136, 0.42]], [1, [255, 122, 24, 0.66]]]),
    linear('screen', 'v', [[0, 'rgba(255,122,24,0)'], [1, [255, 158, 0, 0.34]]], [0, 0.55, 1, 0.45]),
  ]),
  makeGrade('neon-night', 'Neon Night', ['#0A1030', '#00E5FF'], { sat: 0.5, con: 0.42, bri: -0.46 }, [
    // 1 — sink the panel into night with a cold multiply.
    linear('multiply', 'v', [[0, [16, 20, 64, 0.82]], [0.6, [20, 24, 70, 0.66]], [1, [6, 8, 28, 0.86]]]),
    // 2 — recolour EVERYTHING cold: 'color' keeps luminance, takes wash hue +
    // saturation, turning warm skin to cold steel.
    solid('color', [20, 120, 210, 0.92]),
    // 3 — push saturation a little further so the neon reads. Still cool.
    solid('saturation', [0, 180, 255, 0.4]),
    // 4 — magenta / cyan exist only as corner glows, never a warm wash.
    glow('screen', [0, 0], 0.7, [255, 46, 136], 0.3),
    glow('screen', [1, 1], 0.7, [0, 229, 255], 0.32),
  ]),
  makeGrade('golden-hour', 'Golden Hour', ['#FFD60A', '#FF7A18'], { sat: 0.6, con: 0.14, sep: 0.32 }, [
    linear('overlay', 'v', [[0, [255, 214, 10, 0.46]], [0.55, [255, 158, 0, 0.38]], [1, [210, 84, 24, 0.52]]]),
    solid('soft-light', [255, 196, 138, 0.55]),
  ]),
  makeGrade('vice-pink', 'Vice Pink', ['#FF2E88', '#FF6EC7'], { sat: 0.9, con: 0.22 }, [
    linear('overlay', 'd', [[0, [255, 46, 136, 0.6]], [0.55, [255, 110, 199, 0.44]], [1, [123, 47, 190, 0.58]]]),
    solid('multiply', [255, 46, 136, 0.22]),
    linear('screen', 'v', [[0, [255, 110, 199, 0.28]], [1, 'rgba(0,0,0,0)']], [0, 0, 1, 0.4]),
  ]),
  makeGrade('teal-noir', 'Teal Noir', ['#0E3B43', '#00D4FF'], { sat: 0.45, con: 0.52, bri: -0.44 }, [
    linear('multiply', 'v', [[0, [14, 59, 67, 0.82]], [0.5, [18, 32, 50, 0.68]], [1, [8, 26, 34, 0.86]]]),
    // Cool recolour so skin cannot go warm under the teal.
    solid('color', [20, 110, 130, 0.6]),
    linear('screen', 'v', [[0, 'rgba(0,0,0,0)'], [1, [0, 212, 255, 0.24]]], [0, 0.6, 1, 0.4]),
    glow('screen', [1, 0], 0.5, [255, 158, 0], 0.1),
  ]),
  makeGrade('ultraviolet', 'Ultraviolet', ['#7B2FBE', '#00E5FF'], { sat: 0.75, con: 0.26, bri: -0.06 }, [
    linear('overlay', 'd', [[0, [123, 47, 190, 0.6]], [0.6, [255, 46, 136, 0.38]], [1, [43, 10, 74, 0.64]]]),
    linear('screen', 'v', [[0, 'rgba(0,0,0,0)'], [1, [0, 229, 255, 0.26]]], [0, 0.65, 1, 0.35]),
  ]),
];

// Attach the live filter + paint functions derived from each grade's data.
for (const grade of GRADES) {
  grade.filter = (k) => filterFrom(grade.coeff, k);
  grade.paint = (ctx, x, y, w, h, k) => runSteps(ctx, x, y, w, h, grade.steps, k);
}

export function gradeById(id) {
  for (const grade of GRADES) {
    if (grade.id === id) return grade;
  }
  return GRADES[0];
}

/** Run a grade's wash stack inside the current clip; restores composite op. */
export function paintGrade(ctx, x, y, w, h, grade, k) {
  ctx.save();
  grade.paint(ctx, x, y, w, h, k);
  ctx.restore();
}