// lettering.js — the giant comic caption (v6; rendering unchanged from v2..v5).
//
// An ALL-CAPS display title plus a sub-caption line: white by default, fat black
// outline, magenta + cyan double drop-shadow. The title auto-shrinks and wraps
// into at most two balanced lines inside a safe margin, and is painted LAST so
// it bleeds across panel borders without being covered by them. No overflow, no
// clipped words, a slightly tighter skew and shadow.
//
// The two-pass shape holds (measure the block, then ink it), split into small
// fit/place/paint helpers. Every size, offset and colour is identical to v4/v5 —
// the v6 fix removes the skyline buildings from the scene layer, never the
// caption.

const DISPLAY = '"Vice Display", "Arial Black", sans-serif';

const COLOR_ROWS = [
  ['white', 'White', '#FFFFFF'],
  ['sunset', 'Sunset', '#FF7A18'],
  ['gold', 'Neon Gold', '#FFD60A'],
  ['pink', 'Hot Pink', '#FF6EC7'],
  ['cyan', 'Cyan', '#00E5FF'],
];
export const TITLE_COLORS = COLOR_ROWS.map(([id, name, swatch]) => ({ id, name, swatch }));

// Two colour ids are vertical gradients rather than flat fills.
const RAMPS = {
  sunset: [[0, '#FFD60A'], [0.5, '#FF7A18'], [1, '#FF2E88']],
  gold: [[0, '#FFF3A0'], [1, '#FF9E00']],
};

// Resolve a colour id to a fill style spanning the title block.
function fillFor(ctx, id, yTop, yBottom) {
  const ramp = RAMPS[id];
  if (!ramp) {
    const flat = TITLE_COLORS.find((c) => c.id === id);
    return flat ? flat.swatch : '#FFFFFF';
  }
  const grad = ctx.createLinearGradient(0, yTop, 0, yBottom);
  for (const [at, color] of ramp) grad.addColorStop(at, color);
  return grad;
}

// Break a long title into two balanced lines at the space nearest the middle.
function balancedSplit(text) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 2) return [text];
  let bestCut = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i += 1) {
    const leftLen = words.slice(0, i).join(' ').length;
    const rightLen = words.slice(i).join(' ').length;
    const diff = Math.abs(leftLen - rightLen);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestCut = i;
    }
  }
  return [words.slice(0, bestCut).join(' '), words.slice(bestCut).join(' ')];
}

// Shrink the point size until one line (or two balanced lines) fits maxW.
function fitTitle(ctx, text, maxW, startPx, minPx) {
  const candidates = [[text], balancedSplit(text)];
  let px = startPx;
  while (px > minPx) {
    ctx.font = `900 ${px}px ${DISPLAY}`;
    const hit = candidates.find((lines) => lines.every((ln) => ctx.measureText(ln).width <= maxW));
    if (hit) return { lines: hit, px };
    px *= 0.93;
  }
  ctx.font = `900 ${minPx}px ${DISPLAY}`;
  return { lines: candidates[1], px: minPx };
}

// Vertical placement for the requested position (top / center / bottom), held
// inside a safe margin so the block never clips at the cover edge.
function placeBlock(h, blockH, pos) {
  const anchors = { top: h * 0.06 + blockH / 2, bottom: h * 0.94 - blockH / 2, center: h * 0.5 };
  const want = anchors[pos] ?? anchors.center;
  return Math.min(h * 0.97 - blockH / 2, Math.max(h * 0.03 + blockH / 2, want));
}

// Measure the whole caption block: fitted title lines, point sizes, placement.
function measureCaption(ctx, state, w, h) {
  const title = (state.title ?? '').trim().toUpperCase();
  const sub = (state.subtitle ?? '').trim().toUpperCase();
  const maxW = w * 0.9;
  const startPx = h * 0.16 * (state.titleScale ?? 1);
  const fitted = title ? fitTitle(ctx, title, maxW, startPx, h * 0.05) : { lines: [], px: startPx * 0.4 };
  const px = fitted.px;
  const subPx = Math.max(h * 0.028, px * 0.24);
  const subGap = px * 0.28;
  const blockH = fitted.lines.length * px + (sub ? subGap + subPx : 0);
  const centerY = placeBlock(h, blockH, state.titlePos);
  const firstBaseline = centerY - blockH / 2 + px * 0.82;
  return { title, sub, maxW, fitted, px, subPx, subGap, blockH, centerY, firstBaseline };
}

// One title line: hard cyan + magenta shadows, fat black outline, bold fill.
function paintLine(ctx, line, cx, y, px, fill) {
  const cyanX = cx + px * 0.1, cyanY = y + px * 0.13;
  const pinkX = cx + px * 0.055, pinkY = y + px * 0.075;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,229,255,0.5)';
  ctx.fillText(line, cyanX, cyanY);
  ctx.fillStyle = 'rgba(255,46,136,0.9)';
  ctx.fillText(line, pinkX, pinkY);
  ctx.lineWidth = px * 0.17;
  ctx.strokeStyle = '#0D001A';
  ctx.strokeText(line, cx, y);
  ctx.fillStyle = fill;
  ctx.fillText(line, cx, y);
  ctx.restore();
}

// The sub-caption: letter-spaced, auto-shrunk, on a dark pill so it reads
// anywhere. Measurement happens before letterSpacing is applied, exactly as v3.
function paintSub(ctx, m, w, h) {
  let sPx = m.subPx;
  const spacing = () => sPx * 0.2;
  ctx.font = `900 ${sPx}px ${DISPLAY}`;
  let subW = ctx.measureText(m.sub).width + spacing() * m.sub.length;
  while (subW > m.maxW && sPx > h * 0.02) {
    sPx *= 0.93;
    ctx.font = `900 ${sPx}px ${DISPLAY}`;
    subW = ctx.measureText(m.sub).width + spacing() * m.sub.length;
  }
  const subY = m.firstBaseline + (m.fitted.lines.length - 1) * m.px + m.subGap + sPx * 0.8;
  ctx.letterSpacing = `${spacing()}px`;
  const padX = sPx * 0.7;
  const pillW = Math.min(m.maxW, subW + padX * 2);
  const pillH = sPx * 1.7;
  const pillX = w / 2 - pillW / 2;
  const pillY = subY - sPx * 1.15;
  ctx.fillStyle = 'rgba(13,0,26,0.72)';
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, pillH * 0.5);
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, h * 0.002);
  ctx.strokeStyle = 'rgba(255,46,136,0.6)';
  ctx.stroke();
  ctx.lineJoin = 'round';
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  const textX = w / 2 + spacing() / 2;
  ctx.lineWidth = sPx * 0.12;
  ctx.strokeStyle = '#0D001A';
  ctx.strokeText(m.sub, textX, subY);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(m.sub, textX, subY);
  ctx.letterSpacing = '0px';
}

/**
 * Draw the whole caption block, centred horizontally with a slight poster skew
 * and held inside a safe margin so nothing clips at the cover edge.
 */
export function drawCaption(ctx, state, w, h) {
  const m = measureCaption(ctx, state, w, h);
  if (!m.title && !m.sub) return;
  ctx.save();
  ctx.translate(w / 2, m.centerY);
  ctx.transform(1, 0, -0.08, 1, 0, 0);
  ctx.translate(-w / 2, -m.centerY);
  const yTop = m.firstBaseline - m.px;
  const yBottom = m.firstBaseline + (m.fitted.lines.length - 1) * m.px;
  const fill = fillFor(ctx, state.titleColor, yTop, yBottom);
  m.fitted.lines.forEach((ln, i) => paintLine(ctx, ln, w / 2, m.firstBaseline + i * m.px, m.px, fill));
  if (m.sub) paintSub(ctx, m, w, h);
  ctx.restore();
}
