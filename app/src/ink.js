// ink.js — drawing primitives for the Vice Cover Studio poster engine.
// Every helper draws in canvas pixels, taking the cover size (W,H) so the
// same recipe scales to any post size. All shapes are drawn from scratch
// here (no image assets for the lettering or the decorations).

export const FONT = 'ViceCond';

// Rounded-rectangle path (does not fill or stroke by itself).
export function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

// Five-point star path centred at (cx,cy), outer radius r, inner r*0.45.
export function starPath(ctx, cx, cy, r, rot = -Math.PI / 2) {
  const inner = r * 0.45;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : inner;
    const a = rot + (i * Math.PI) / 5;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// A filled star with a dark outline.
export function star(ctx, cx, cy, r, fill = '#ffd21f', stroke = '#111', lw = 0) {
  starPath(ctx, cx, cy, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw > 0) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

// Row of n stars, left-aligned at x, centred vertically at y.
export function starsRow(ctx, x, y, n, size, gap, rot = 0) {
  for (let i = 0; i < n; i++) {
    ctx.save();
    ctx.translate(x + i * (size + gap) + size / 2, y);
    ctx.rotate(rot);
    star(ctx, 0, 0, size / 2, '#ffd21f', '#111', Math.max(1, size * 0.07));
    ctx.restore();
  }
}

// A pill (rounded rect) with fill + optional stroke, then centred text.
export function pill(ctx, x, y, w, h, { fill = '#111', stroke = null, lw = 2, text = '', font = null, color = '#fff', pad = 0 } = {}) {
  rr(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
  if (text) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = font || `900 ${Math.round(h * 0.52)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + h / 2 + h * 0.04);
    ctx.restore();
  }
}

// The VICE CITY badge: black pill, hot-pink rim, pink star, white caps text.
// (x,y) is the top-left of the badge box; it is drawn tilted by `rot`.
export function viceBadge(ctx, x, y, w, h, rot = -0.06) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(rot);
  rr(ctx, -w / 2, -h / 2, w, h, h / 2);
  ctx.fillStyle = '#0d0b16';
  ctx.fill();
  ctx.lineWidth = Math.max(2, h * 0.09);
  ctx.strokeStyle = '#ff2e88';
  ctx.stroke();
  const sr = h * 0.30;
  star(ctx, -w / 2 + h * 0.52, 0, sr, '#ff2e88', null, 0);
  ctx.fillStyle = '#fff';
  ctx.font = `900 ${Math.round(h * 0.52)}px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('VICE CITY', -w / 2 + h * 0.95, h * 0.05);
  ctx.restore();
}

// Big poster title. `lines` is an array of strings. Each line is drawn three
// times: a cyan copy offset down-right (the chromatic fringe), a thick black
// stroke, then the fill (solid colour or a vertical gradient). A slight
// horizontal shear fakes the italic poster slant.
export function bigTitle(ctx, lines, cx, topY, size, { fill = '#fff', grad = null, stroke = '#0d0b16', lw = null, fringe = '#19c8e8', fringeDx = 0.045, fringeDy = 0.05, shear = -0.10, lineGap = 1.02 } = {}) {
  const sw = lw ?? size * 0.14;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.lineJoin = 'round';
  lines.forEach((line, i) => {
    const y = topY + i * size * lineGap;
    // chromatic fringe copy
    ctx.save();
    ctx.translate(cx + size * fringeDx, y + size * fringeDy);
    ctx.transform(1, 0, shear, 1, 0, 0);
    ctx.font = `900 ${Math.round(size)}px ${FONT}`;
    ctx.fillStyle = fringe;
    ctx.fillText(line, 0, 0);
    ctx.restore();
    // black outline + fill
    ctx.save();
    ctx.translate(cx, y);
    ctx.transform(1, 0, shear, 1, 0, 0);
    ctx.font = `900 ${Math.round(size)}px ${FONT}`;
    ctx.lineWidth = sw;
    ctx.strokeStyle = stroke;
    ctx.strokeText(line, 0, 0);
    if (grad) {
      const g = ctx.createLinearGradient(0, 0, 0, size * lines.length);
      grad.forEach(([stop, col]) => g.addColorStop(stop, col));
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = fill;
    }
    ctx.fillText(line, 0, 0);
    ctx.restore();
  });
  ctx.restore();
}

// The VICE PD bar: pink segment, black centre with white text, cyan segment.
export function vicePDBar(ctx, x, y, w, h) {
  const seg = w * 0.16;
  ctx.fillStyle = '#ff2e88';
  ctx.fillRect(x, y, seg, h);
  ctx.fillStyle = '#0d0b16';
  ctx.fillRect(x + seg, y, w - 2 * seg, h);
  ctx.fillStyle = '#19c8e8';
  ctx.fillRect(x + w - seg, y, seg, h);
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.font = `900 ${Math.round(h * 0.5)}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('VICE PD', x + w / 2, y + h / 2 + h * 0.04);
  ctx.restore();
}

// A palm-tree silhouette. (x,y) is the base of the trunk, s is the height.
// The trunk leans by `lean` (radians, + leans right). The fronds are thin
// strokes fanning from the crown and drooping at the tips, so they read as
// separate leaves, not one solid blob.
export function palm(ctx, x, y, s, lean = 0.12, color = '#0d0b16') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  // trunk: a gently tapering curved quad
  ctx.beginPath();
  ctx.moveTo(-s * 0.022, 0);
  ctx.quadraticCurveTo(-s * 0.008, -s * 0.55, s * 0.04, -s * 0.92);
  ctx.lineTo(s * 0.07, -s * 0.92);
  ctx.quadraticCurveTo(s * 0.04, -s * 0.5, s * 0.032, 0);
  ctx.closePath();
  ctx.fill();
  // fronds: 7 thin arcs fanning from the crown, drooping at the tips
  const crownX = s * 0.055;
  const crownY = -s * 0.92;
  ctx.lineWidth = Math.max(1.5, s * 0.014);
  ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI * (0.06 + (i / 6) * 0.88); // from near-horizontal left to right
    const len = s * (0.38 + (i % 2) * 0.07);
    const tipX = crownX + Math.cos(a) * len;
    const tipY = crownY + Math.sin(a) * len * 0.5 + s * 0.16;
    const midX = crownX + Math.cos(a) * len * 0.55;
    const midY = crownY + Math.sin(a) * len * 0.30 - s * 0.08;
    ctx.beginPath();
    ctx.moveTo(crownX, crownY);
    ctx.quadraticCurveTo(midX, midY, tipX, tipY);
    ctx.stroke();
  }
  ctx.restore();
}

// A row of small crowd silhouettes along the bottom edge.
export function crowd(ctx, x, y, w, count, h) {
  ctx.fillStyle = '#0d0b16';
  const gap = w / count;
  for (let i = 0; i < count; i++) {
    const cx = x + gap * (i + 0.5);
    const r = h * 0.30;
    ctx.beginPath();
    ctx.arc(cx, y + r, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - r * 1.15, y + h);
    ctx.quadraticCurveTo(cx - r * 1.05, y + r * 1.6, cx, y + r * 1.5);
    ctx.quadraticCurveTo(cx + r * 1.05, y + r * 1.6, cx + r * 1.15, y + h);
    ctx.closePath();
    ctx.fill();
  }
}

// A side-profile sports-car silhouette with a glowing window.
export function carSide(ctx, x, y, w, h) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#0d0b16';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.78);
  ctx.lineTo(w * 0.06, h * 0.42);
  ctx.quadraticCurveTo(w * 0.30, h * 0.30, w * 0.48, h * 0.30);
  ctx.quadraticCurveTo(w * 0.68, h * 0.28, w * 0.82, h * 0.44);
  ctx.quadraticCurveTo(w * 0.96, h * 0.52, w, h * 0.62);
  ctx.lineTo(w, h * 0.78);
  ctx.closePath();
  ctx.fill();
  // wheels
  ctx.beginPath();
  ctx.arc(w * 0.22, h * 0.80, h * 0.20, 0, Math.PI * 2);
  ctx.arc(w * 0.78, h * 0.80, h * 0.20, 0, Math.PI * 2);
  ctx.fill();
  // window glow
  ctx.fillStyle = '#19c8e8';
  ctx.beginPath();
  ctx.moveTo(w * 0.34, h * 0.36);
  ctx.lineTo(w * 0.50, h * 0.36);
  ctx.lineTo(w * 0.62, h * 0.48);
  ctx.lineTo(w * 0.34, h * 0.48);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// A front-view car silhouette: a wide low body, a sloped cyan windshield,
// two headlights and two wheels. (x,y) is the top-left of the bounding box.
export function carFront(ctx, x, y, w, h) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#0d0b16';
  // body: wide at the bottom, narrower at the roof
  ctx.beginPath();
  ctx.moveTo(w * 0.06, h * 0.55);
  ctx.lineTo(w * 0.16, h * 0.16);
  ctx.lineTo(w * 0.84, h * 0.16);
  ctx.lineTo(w * 0.94, h * 0.55);
  ctx.lineTo(w * 0.97, h * 0.82);
  ctx.lineTo(w * 0.03, h * 0.82);
  ctx.closePath();
  ctx.fill();
  // windshield (cyan), sloped
  ctx.fillStyle = '#19c8e8';
  ctx.beginPath();
  ctx.moveTo(w * 0.23, h * 0.22);
  ctx.lineTo(w * 0.77, h * 0.22);
  ctx.lineTo(w * 0.70, h * 0.48);
  ctx.lineTo(w * 0.30, h * 0.48);
  ctx.closePath();
  ctx.fill();
  // headlights
  ctx.fillStyle = '#e8f6ff';
  ctx.fillRect(w * 0.09, h * 0.60, w * 0.13, h * 0.09);
  ctx.fillRect(w * 0.78, h * 0.60, w * 0.13, h * 0.09);
  // wheels
  ctx.fillStyle = '#0d0b16';
  ctx.beginPath();
  ctx.arc(w * 0.17, h * 0.86, h * 0.14, 0, Math.PI * 2);
  ctx.arc(w * 0.83, h * 0.86, h * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// A full moon: pale disc, a few craters, soft halo.
export function moon(ctx, cx, cy, r) {
  const halo = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 2.6);
  halo.addColorStop(0, 'rgba(255, 244, 200, 0.55)');
  halo.addColorStop(1, 'rgba(255, 244, 200, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(214, 196, 140, 0.85)';
  const craters = [[-0.3, -0.2, 0.16], [0.25, 0.1, 0.12], [-0.05, 0.35, 0.10], [0.35, -0.3, 0.08]];
  for (const [dx, dy, cr] of craters) {
    ctx.beginPath();
    ctx.arc(cx + dx * r, cy + dy * r, cr * r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// A small yellow "$" sticker, slightly rotated.
export function dollar(ctx, x, y, s, rot = 0.15) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  rr(ctx, -s / 2, -s / 2, s, s, s * 0.18);
  ctx.fillStyle = '#ffd21f';
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.font = `900 ${Math.round(s * 0.72)}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('$', 0, s * 0.04);
  ctx.restore();
}

// A tiny two-stroke bird mark (a "v" in the sky), as seen in the reference.
export function birdMark(ctx, x, y, s, rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.strokeStyle = '#0d0b16';
  ctx.lineWidth = Math.max(1.5, s * 0.14);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-s / 2, 0);
  ctx.quadraticCurveTo(-s * 0.12, -s * 0.28, 0, 0);
  ctx.quadraticCurveTo(s * 0.12, -s * 0.28, s / 2, 0);
  ctx.stroke();
  ctx.restore();
}

// White four-point sparkle (used in the night sky).
export function sparkle(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.quadraticCurveTo(s * 0.18, -s * 0.18, s, 0);
  ctx.quadraticCurveTo(s * 0.18, s * 0.18, 0, s);
  ctx.quadraticCurveTo(-s * 0.18, s * 0.18, -s, 0);
  ctx.quadraticCurveTo(-s * 0.18, -s * 0.18, 0, -s);
  ctx.fill();
  ctx.restore();
}
