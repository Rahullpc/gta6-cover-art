// grades.js — the six colour tints for Vice Cover Studio v26.
// A tint is two things: a canvas filter applied while the photo draws,
// and an ordered stack of washes laid over the panel afterwards.
// Intensity k runs 0..1; every tint stays saturated and bold at default.
// Night tints (moon + sparkles, never a sun): Neon Night, Teal Noir,
// Ultraviolet. Wash kinds: 'solid', 'linear' (vertical), 'diag'
// (diagonal), 'glow' (radial corner glow). All alphas below are
// multiplied by k.

function withAlpha(c, k) {
  const a = Math.max(0, Math.min(1, c[3] * k));
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

export const TINTS = [
  {
    id: 'sunset', name: 'Sunset', night: false,
    filter: k => `saturate(${1 + 0.85 * k}) contrast(${1 + 0.18 * k}) brightness(${1 + 0.05 * k})`,
    washes: [
      { kind: 'linear', blend: 'overlay', stops: [
        { at: 0, c: [43, 10, 74, 0.60] }, { at: 0.45, c: [255, 46, 136, 0.42] }, { at: 1, c: [255, 122, 24, 0.66] } ] },
      { kind: 'linear', blend: 'screen', region: [0.55, 1], stops: [
        { at: 0, c: [255, 158, 0, 0] }, { at: 1, c: [255, 158, 0, 0.34] } ] },
    ],
  },
  {
    id: 'neonNight', name: 'Neon Night', night: true,
    filter: k => `saturate(${1 + 0.5 * k}) contrast(${1 + 0.42 * k}) brightness(${1 - 0.46 * k})`,
    washes: [
      { kind: 'linear', blend: 'multiply', stops: [
        { at: 0, c: [16, 20, 64, 0.82] }, { at: 0.6, c: [20, 24, 70, 0.66] }, { at: 1, c: [6, 8, 28, 0.86] } ] },
      { kind: 'solid', blend: 'color', c: [20, 120, 210, 0.92] },
      { kind: 'solid', blend: 'saturation', c: [0, 180, 255, 0.40] },
      { kind: 'glow', blend: 'screen', at: [0, 0], c: [255, 46, 136, 0.30], r: 0.7 },
      { kind: 'glow', blend: 'screen', at: [1, 1], c: [0, 229, 255, 0.32], r: 0.7 },
    ],
  },
  {
    id: 'goldenHour', name: 'Golden Hour', night: false,
    filter: k => `saturate(${1 + 0.6 * k}) contrast(${1 + 0.14 * k}) sepia(${0.32 * k})`,
    washes: [
      { kind: 'linear', blend: 'overlay', stops: [
        { at: 0, c: [255, 214, 10, 0.46] }, { at: 0.55, c: [255, 158, 0, 0.38] }, { at: 1, c: [210, 84, 24, 0.52] } ] },
      { kind: 'solid', blend: 'soft-light', c: [255, 196, 138, 0.55] },
    ],
  },
  {
    id: 'vicePink', name: 'Vice Pink', night: false,
    filter: k => `saturate(${1 + 0.9 * k}) contrast(${1 + 0.22 * k})`,
    washes: [
      { kind: 'diag', blend: 'overlay', stops: [
        { at: 0, c: [255, 46, 136, 0.60] }, { at: 0.55, c: [255, 110, 199, 0.44] }, { at: 1, c: [123, 47, 190, 0.58] } ] },
      { kind: 'solid', blend: 'multiply', c: [255, 46, 136, 0.22] },
      { kind: 'linear', blend: 'screen', region: [0, 0.4], stops: [
        { at: 0, c: [255, 110, 199, 0.28] }, { at: 1, c: [255, 110, 199, 0] } ] },
    ],
  },
  {
    id: 'tealNoir', name: 'Teal Noir', night: true,
    filter: k => `saturate(${1 + 0.45 * k}) contrast(${1 + 0.52 * k}) brightness(${1 - 0.44 * k})`,
    washes: [
      { kind: 'linear', blend: 'multiply', stops: [
        { at: 0, c: [14, 59, 67, 0.82] }, { at: 0.5, c: [18, 32, 50, 0.68] }, { at: 1, c: [8, 26, 34, 0.86] } ] },
      { kind: 'solid', blend: 'color', c: [20, 110, 130, 0.60] },
      { kind: 'linear', blend: 'screen', region: [0.6, 1], stops: [
        { at: 0, c: [0, 212, 255, 0] }, { at: 1, c: [0, 212, 255, 0.24] } ] },
      { kind: 'glow', blend: 'screen', at: [1, 0], c: [255, 158, 0, 0.10], r: 0.5 },
    ],
  },
  {
    id: 'ultraviolet', name: 'Ultraviolet', night: true,
    filter: k => `saturate(${1 + 0.75 * k}) contrast(${1 + 0.26 * k}) brightness(${1 - 0.06 * k})`,
    washes: [
      { kind: 'diag', blend: 'overlay', stops: [
        { at: 0, c: [123, 47, 190, 0.60] }, { at: 0.6, c: [255, 46, 136, 0.38] }, { at: 1, c: [43, 10, 74, 0.64] } ] },
      { kind: 'linear', blend: 'screen', region: [0.65, 1], stops: [
        { at: 0, c: [0, 229, 255, 0] }, { at: 1, c: [0, 229, 255, 0.26] } ] },
    ],
  },
];

export function tintById(id) {
  return TINTS.find(g => g.id === id) || TINTS[0];
}

// Paint one wash over rect (x, y, w, h) at intensity k.
export function applyWash(ctx, wash, x, y, w, h, k) {
  const prev = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = wash.blend;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  if (wash.kind === 'solid') {
    ctx.fillStyle = withAlpha(wash.c, k);
    ctx.fillRect(x, y, w, h);
  } else if (wash.kind === 'linear' || wash.kind === 'diag') {
    let y0 = y, y1 = y + h, x0 = x, x1 = x;
    if (wash.region) { y0 = y + wash.region[0] * h; y1 = y + wash.region[1] * h; }
    if (wash.kind === 'diag') { x1 = x + w; }
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    for (const s of wash.stops) g.addColorStop(s.at, withAlpha(s.c, k));
    ctx.fillStyle = g;
    ctx.fillRect(x, y0, w, y1 - y0);
  } else if (wash.kind === 'glow') {
    const R = wash.r * Math.max(w, h);
    const gx = x + wash.at[0] * w, gy = y + wash.at[1] * h;
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, R);
    g.addColorStop(0, withAlpha(wash.c, k));
    g.addColorStop(1, withAlpha([wash.c[0], wash.c[1], wash.c[2], 0], k));
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
  ctx.globalCompositeOperation = prev;
}
