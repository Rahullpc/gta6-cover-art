// lettering.js — the giant comic caption (v3, rendering unchanged from v2).
//
// An ALL-CAPS display title plus a sub-caption line: white by default, fat black
// outline, magenta + cyan double drop-shadow. The title auto-shrinks and wraps
// into at most two balanced lines inside a safe margin, and is painted LAST so it
// bleeds across panel borders without being covered by them. No overflow, no
// clipped words, a slightly tighter skew and shadow.
//
// v3 splits the work into a measure pass (fit the title, lay out the block) and a
// paint pass (ink the lines + the sub-caption pill), instead of one long routine.

const DISPLAY = '"Vice Display", "Arial Black", sans-serif';

export const TITLE_COLORS = [
  { id: 'white', name: 'White', swatch: '#FFFFFF' },
  { id: 'sunset', name: 'Sunset', swatch: '#FF7A18' },
  { id: 'gold', name: 'Neon Gold', swatch: '#FFD60A' },
  { id: 'pink', name: 'Hot Pink', swatch: '#FF6EC7' },
  { id: 'cyan', name: 'Cyan', swatch: '#00E5FF' },
];

// Resolve a colour id to a fill style; two ids are vertical gradients.
function fillFor(ctx, id, yTop, yBottom) {
  const ramps = {
    sunset: [[0, '#FFD60A'], [0.5, '#FF7A18'], [1, '#FF2E88']],
    gold: [[0, '#FFF3A0'], [1, '#FF9E00']],
  };
  if (!ramps[id]) return TITLE_COLORS.find((c) => c.id === id)?.swatch ?? '#FFFFFF';
  const grad = ctx.createLinearGradient(0, yTop, 0, yBottom);
  for (const [at, color] of ramps[id]) grad.addColorStop(at, color);
  return grad;
}

// Break a long title into two balanced lines at the space nearest the middle.
function balancedSplit(text) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 2) return [text];
  let bestCut = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const diff = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length);
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
    for (const lines of candidates) {
      if (lines.every((ln) => ctx.measureText(ln).width <= maxW)) return { lines, px };
    }
    px *= 0.93;
  }
  ctx.font = `900 ${minPx}px ${DISPLAY}`;
  return { lines: candidates[1], px: minPx };
}

// One title line: hard cyan + magenta shadows, fat black outline, bold fill.
function paintLine(ctx, line, cx, y, px, fill) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.fillStyle = 'rgba(0,229,255,0.5)';
  ctx.fillText(line, cx + px * 0.1, y + px * 0.13);
  ctx.fillStyle = 'rgba(255,46,136,0.9)';
  ctx.fillText(line, cx + px * 0.055, y + px * 0.075);
  ctx.strokeStyle = '#0D001A';
  ctx.lineWidth = px * 0.17;
  ctx.strokeText(line, cx, y);
  ctx.fillStyle = fill;
  ctx.fillText(line, cx, y);
  ctx.restore();
}

// Measure the whole caption block: fitted title lines, point sizes, and the
// vertical placement for the requested position (top / center / bottom).
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
  const anchors = { top: h * 0.06 + blockH / 2, bottom: h * 0.94 - blockH / 2, center: h * 0.5 };
  const centerY = Math.min(h * 0.97 - blockH / 2, Math.max(h * 0.03 + blockH / 2, anchors[state.titlePos] ?? anchors.center));
  return { title, sub, maxW, fitted, px, subPx, subGap, blockH, centerY, firstBaseline: centerY - blockH / 2 + px * 0.82 };
}

// The sub-caption: letter-spaced, auto-shrunk, on a dark pill so it reads anywhere.
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
  ctx.fillStyle = 'rgba(13,0,26,0.72)';
  ctx.beginPath();
  ctx.roundRect(w / 2 - pillW / 2, subY - sPx * 1.15, pillW, pillH, pillH * 0.5);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,46,136,0.6)';
  ctx.lineWidth = Math.max(1.5, h * 0.002);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#0D001A';
  ctx.lineWidth = sPx * 0.12;
  ctx.strokeText(m.sub, w / 2 + spacing() / 2, subY);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(m.sub, w / 2 + spacing() / 2, subY);
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
  const fill = fillFor(ctx, state.titleColor, m.firstBaseline - m.px, m.firstBaseline + (m.fitted.lines.length - 1) * m.px);
  m.fitted.lines.forEach((ln, i) => paintLine(ctx, ln, w / 2, m.firstBaseline + i * m.px, m.px, fill));
  if (m.sub) paintSub(ctx, m, w, h);
  ctx.restore();
}
