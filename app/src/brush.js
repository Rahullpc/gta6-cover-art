// brush.js — canvas drawing primitives for the Vice Cover Studio.
// Every shape is drawn from scratch here: badges, stars, lettering, palms,
// crowd, cars, moon, halftone dots and blurred photo bands.

export const INK = {
  pink: '#FF2E88',
  orange: '#FF7A18',
  purple: '#2B1838',
  cyan: '#00F0FF',
  navy: '#0B1026',
  deepNavy: '#0A1428',
  gold: '#FFC93C',
  starYellow: '#FFD21F',
  white: '#FFFFFF',
  black: '#0A0A0A',
};

function rr(ctx, x, y, w, h, r) {
  const q = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + q, y);
  ctx.arcTo(x + w, y, x + w, y + h, q);
  ctx.arcTo(x + w, y + h, x, y + h, q);
  ctx.arcTo(x, y + h, x, y, q);
  ctx.arcTo(x, y, x + w, y, q);
  ctx.closePath();
}

export function roundRect(ctx, x, y, w, h, r) { rr(ctx, x, y, w, h, r); }

/** Five-pointed star path centred at (cx, cy). */
export function starPath(ctx, cx, cy, rOuter, rInner, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = rot + (i * Math.PI) / 5;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export function fillStar(ctx, cx, cy, r, fill, stroke = null, lw = 0) {
  starPath(ctx, cx, cy, r, r * 0.45);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

/**
 * The VICE CITY badge: dark navy pill, hot-pink rim, pink star + white caps text.
 * (x, y) is the top-left corner; w/h the pill size.
 */
export function drawBadge(ctx, x, y, w, h) {
  rr(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = INK.navy;
  ctx.fill();
  ctx.lineWidth = Math.max(2, h * 0.09);
  ctx.strokeStyle = INK.pink;
  ctx.stroke();
  const starR = h * 0.30;
  const scx = x + h * 0.52;
  const scy = y + h * 0.52;
  fillStar(ctx, scx, scy, starR, INK.pink);
  ctx.fillStyle = INK.white;
  ctx.font = `900 ${Math.round(h * 0.52)}px "NotoSans-CondensedBlack", "Arial Black", sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('VICE CITY', x + h * 0.95, y + h * 0.54);
}

/**
 * Row of five yellow stars. The caller picks the y so the row sits CLEARLY
 * below the badge with a visible gap — never touching the badge rim.
 */
export function drawStarRow(ctx, x, y, w, r) {
  const step = w / 5;
  for (let i = 0; i < 5; i++) {
    fillStar(ctx, x + step * (i + 0.5), y, r, INK.starYellow, INK.black, Math.max(1.5, r * 0.14));
  }
}

/**
 * Big condensed display lettering: cyan fringe offset, then white/gold fill
 * with a thick black outline. `shear` slants the glyphs slightly.
 */
export function drawDisplayText(ctx, text, cx, y, size, opts = {}) {
  const fill = opts.fill || INK.white;
  const strokeW = opts.strokeW ?? Math.max(3, size * 0.09);
  const shear = opts.shear ?? -0.05;
  const fringe = opts.fringe ?? Math.max(2, size * 0.03);
  ctx.save();
  ctx.font = `900 ${Math.round(size)}px "NotoSans-CondensedBlack", "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  // shrink to fit the requested width
  const maxW = opts.maxW || Infinity;
  let scale = 1;
  const tw = ctx.measureText(text).width;
  if (tw > maxW) scale = maxW / tw;
  ctx.translate(cx, y);
  ctx.transform(scale, 0, shear, 1, 0, 0);
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  if (opts.gradient) {
    ctx.fillStyle = opts.gradient;
  } else {
    ctx.fillStyle = fill;
  }
  // cyan fringe copy, offset down-right
  ctx.save();
  ctx.translate(fringe, fringe * 0.7);
  ctx.fillStyle = INK.cyan;
  ctx.globalAlpha = 0.9;
  ctx.fillText(text, 0, 0);
  ctx.restore();
  ctx.lineWidth = strokeW;
  ctx.strokeStyle = INK.black;
  ctx.strokeText(text, 0, 0);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/** Small rounded pill with dark fill, coloured rim and white bold caps text. */
export function drawPill(ctx, cx, y, text, opts = {}) {
  const h = opts.h || 44;
  const pad = opts.pad ?? h * 0.55;
  const rim = opts.rim || INK.cyan;
  const bg = opts.bg || 'rgba(10,10,26,0.88)';
  ctx.font = `900 ${Math.round(h * 0.42)}px "NotoSans-CondensedBlack", "Arial Black", sans-serif`;
  const tw = ctx.measureText(text).width;
  const w = tw + pad * 2;
  const x = cx - w / 2;
  rr(ctx, x, y - h / 2, w, h, h / 2);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.lineWidth = Math.max(2, h * 0.06);
  ctx.strokeStyle = rim;
  ctx.stroke();
  ctx.fillStyle = INK.white;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, y + h * 0.03);
  return { x, y: y - h / 2, w, h };
}

/** Palm silhouette: curved trunk + drooping fronds. */
export function drawPalm(ctx, x, yBase, h, opts = {}) {
  const lean = opts.lean ?? 0.12;
  const col = opts.color || INK.black;
  const trunkW = Math.max(3, h * 0.045);
  ctx.save();
  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.lineCap = 'round';
  // trunk
  ctx.beginPath();
  ctx.moveTo(x, yBase);
  ctx.quadraticCurveTo(x + lean * h * 0.4, yBase - h * 0.55, x + lean * h, yBase - h);
  ctx.lineWidth = trunkW;
  ctx.stroke();
  const tx = x + lean * h;
  const ty = yBase - h;
  // fronds
  const fronds = opts.fronds ?? 7;
  ctx.lineWidth = Math.max(2, h * 0.02);
  for (let i = 0; i < fronds; i++) {
    const a = Math.PI * (0.08 + (i / (fronds - 1)) * 0.84);
    const len = h * (0.30 + 0.10 * Math.sin(i * 2.3));
    const ex = tx + Math.cos(a) * len;
    const ey = ty + Math.sin(a) * len * 0.55 + len * 0.22;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(tx + Math.cos(a) * len * 0.5, ty - len * 0.12, ex, ey);
    ctx.stroke();
  }
  ctx.restore();
}

/** Row of tiny head-and-shoulders crowd silhouettes along the bottom. */
export function drawCrowd(ctx, x, y, w, h) {
  ctx.fillStyle = INK.black;
  const n = Math.max(3, Math.floor(w / (h * 1.6)));
  const step = w / n;
  for (let i = 0; i < n; i++) {
    const cx = x + step * (i + 0.5);
    const r = h * 0.30;
    ctx.beginPath();
    ctx.arc(cx, y + h * 0.34, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - r * 1.5, y + h);
    ctx.quadraticCurveTo(cx, y + h * 0.42, cx + r * 1.5, y + h);
    ctx.closePath();
    ctx.fill();
  }
}

/** Side-profile sports car silhouette with a cyan windshield. */
export function drawCarSide(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = INK.black;
  ctx.beginPath();
  // body: low wedge, nose right
  ctx.moveTo(x, y + h * 0.72);
  ctx.lineTo(x + w * 0.06, y + h * 0.55);
  ctx.lineTo(x + w * 0.30, y + h * 0.42);
  ctx.lineTo(x + w * 0.52, y + h * 0.18);
  ctx.lineTo(x + w * 0.74, y + h * 0.20);
  ctx.lineTo(x + w * 0.94, y + h * 0.45);
  ctx.lineTo(x + w, y + h * 0.55);
  ctx.lineTo(x + w * 0.97, y + h * 0.72);
  ctx.closePath();
  ctx.fill();
  // cyan windshield
  ctx.fillStyle = INK.cyan;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.34, y + h * 0.42);
  ctx.lineTo(x + w * 0.52, y + h * 0.22);
  ctx.lineTo(x + w * 0.70, y + h * 0.24);
  ctx.lineTo(x + w * 0.60, y + h * 0.42);
  ctx.closePath();
  ctx.fill();
  // wheels
  ctx.fillStyle = INK.black;
  for (const wx of [0.22, 0.80]) {
    ctx.beginPath();
    ctx.arc(x + w * wx, y + h * 0.74, h * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }
  // headlight slit
  ctx.fillStyle = INK.white;
  ctx.fillRect(x + w * 0.90, y + h * 0.52, w * 0.07, h * 0.05);
  ctx.restore();
}

/** Full moon: pale disc, soft glow, a few craters. */
export function drawMoon(ctx, cx, cy, r) {
  const glow = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * 2.6);
  glow.addColorStop(0, 'rgba(255,244,200,0.55)');
  glow.addColorStop(1, 'rgba(255,244,200,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFF6CF';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(214,196,150,0.75)';
  const craters = [[-0.3, -0.2, 0.20], [0.25, 0.15, 0.16], [0.05, 0.35, 0.12], [0.35, -0.35, 0.10]];
  for (const [dx, dy, cr] of craters) {
    ctx.beginPath();
    ctx.arc(cx + dx * r, cy + dy * r, cr * r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Halftone dot grid, clipped to the given rect. */
export function drawDots(ctx, x, y, w, h, gap = 16, alpha = 0.14, color = '#FFFFFF') {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  for (let yy = y + gap / 2; yy < y + h; yy += gap) {
    for (let xx = x + gap / 2; xx < x + w; xx += gap) {
      ctx.beginPath();
      ctx.arc(xx, yy, Math.max(1, gap * 0.11), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Small yellow "$" sticker, slightly rotated. */
export function drawDollar(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.18);
  rr(ctx, -s / 2, -s / 2, s, s, s * 0.22);
  ctx.fillStyle = '#FFD21F';
  ctx.fill();
  ctx.lineWidth = Math.max(1, s * 0.06);
  ctx.strokeStyle = INK.black;
  ctx.stroke();
  ctx.fillStyle = INK.black;
  ctx.font = `900 ${Math.round(s * 0.62)}px "NotoSans-CondensedBlack", "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('$', 0, s * 0.04);
  ctx.restore();
}

/** Four-point sparkle. */
export function drawSparkle(ctx, x, y, s, color = '#FFFFFF') {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.quadraticCurveTo(s * 0.18, -s * 0.18, s, 0);
  ctx.quadraticCurveTo(s * 0.18, s * 0.18, 0, s);
  ctx.quadraticCurveTo(-s * 0.18, s * 0.18, -s, 0);
  ctx.quadraticCurveTo(-s * 0.18, -s * 0.18, 0, -s);
  ctx.fill();
  ctx.restore();
}

/** Tiny "m" bird, fully drawn — never half-hidden behind anything. */
export function drawBird(ctx, x, y, s, color = '#111111') {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, s * 0.14);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - s, y + s * 0.25);
  ctx.quadraticCurveTo(x - s * 0.5, y - s * 0.55, x, y + s * 0.1);
  ctx.quadraticCurveTo(x + s * 0.5, y - s * 0.55, x + s, y + s * 0.25);
  ctx.stroke();
  ctx.restore();
}

/**
 * Blurred photo texture band: the photo is shrunk to a thumbnail and drawn
 * back up (cheap heavy blur), then tinted with a gradient so the band reads
 * as rich coloured texture, never flat. Dots are drawn on top.
 */
export function drawBlurBand(ctx, img, x, y, w, h, tintTop, tintBottom) {
  if (!img || !img.width) {
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, tintTop);
    g.addColorStop(1, tintBottom);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    return;
  }
  const thumb = document.createElement('canvas');
  const tw = 48;
  const th = Math.max(4, Math.round(48 * (h / w) * (img.height / img.width) * (w / h)));
  thumb.width = tw;
  thumb.height = Math.max(4, Math.round(tw * (h / w)));
  const tctx = thumb.getContext('2d');
  tctx.drawImage(img, 0, 0, thumb.width, thumb.height);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(thumb, x, y, w, h);
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, tintTop);
  g.addColorStop(1, tintBottom);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/** Thick black comic gutter between panels. */
export function drawGutter(ctx, x, y, w, h) {
  ctx.fillStyle = INK.black;
  ctx.fillRect(x, y, w, h);
}
