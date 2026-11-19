// The caption lettering: a giant ALL-CAPS comic title plus a sub-caption.
// White by default with a thick black outline and a magenta/cyan double
// drop-shadow. The title auto-shrinks and wraps to at most two balanced
// lines inside a safe margin, and it is painted LAST so it bleeds across
// panel borders without ever being covered by them.

const DISPLAY = '"Vice Display", "Arial Black", sans-serif';

export const TITLE_COLORS = [
  { id: 'white', name: 'White', swatch: '#FFFFFF' },
  { id: 'sunset', name: 'Sunset', swatch: '#FF7A18' },
  { id: 'gold', name: 'Neon Gold', swatch: '#FFD60A' },
  { id: 'pink', name: 'Hot Pink', swatch: '#FF6EC7' },
  { id: 'cyan', name: 'Cyan', swatch: '#00E5FF' },
];

function fillFor(ctx, id, yTop, yBottom) {
  if (id === 'sunset') {
    const g = ctx.createLinearGradient(0, yTop, 0, yBottom);
    g.addColorStop(0, '#FFD60A');
    g.addColorStop(0.5, '#FF7A18');
    g.addColorStop(1, '#FF2E88');
    return g;
  }
  if (id === 'gold') {
    const g = ctx.createLinearGradient(0, yTop, 0, yBottom);
    g.addColorStop(0, '#FFF3A0');
    g.addColorStop(1, '#FF9E00');
    return g;
  }
  return TITLE_COLORS.find((c) => c.id === id)?.swatch ?? '#FFFFFF';
}

/** Break a long title into two balanced lines at the space nearest the middle. */
function balancedSplit(text) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 2) return [text];
  let cut = 1;
  let best = Infinity;
  for (let i = 1; i < words.length; i++) {
    const left = words.slice(0, i).join(' ').length;
    const right = words.slice(i).join(' ').length;
    if (Math.abs(left - right) < best) {
      best = Math.abs(left - right);
      cut = i;
    }
  }
  return [words.slice(0, cut).join(' '), words.slice(cut).join(' ')];
}

/** Shrink the point size until one line (or two balanced lines) fits maxW. */
function fitTitle(ctx, text, maxW, startPx, minPx) {
  const options = [[text], balancedSplit(text)];
  let px = startPx;
  while (px > minPx) {
    ctx.font = `900 ${px}px ${DISPLAY}`;
    for (const lines of options) {
      if (lines.every((ln) => ctx.measureText(ln).width <= maxW)) return { lines, px };
    }
    px *= 0.93;
  }
  ctx.font = `900 ${minPx}px ${DISPLAY}`;
  return { lines: options[1], px: minPx };
}

/** One title line: magenta + cyan hard shadows, fat black outline, bold fill. */
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

/**
 * Draw the whole caption block. `state.titlePos` is top / center / bottom;
 * the block is centered horizontally with a slight poster skew, and kept
 * inside a safe margin so nothing clips at the cover edge.
 */
export function drawCaption(ctx, state, w, h) {
  const title = (state.title ?? '').trim().toUpperCase();
  const sub = (state.subtitle ?? '').trim().toUpperCase();
  if (!title && !sub) return;

  const maxW = w * 0.9;
  const startPx = h * 0.16 * (state.titleScale ?? 1);
  const minPx = h * 0.05;
  const fitted = title ? fitTitle(ctx, title, maxW, startPx, minPx) : { lines: [], px: startPx * 0.4 };
  const px = fitted.px;
  const lineH = px * 1.0;
  const subPx = Math.max(h * 0.028, px * 0.24);
  const subGap = px * 0.28;
  const blockH = fitted.lines.length * lineH + (sub ? subGap + subPx : 0);

  let centerY;
  if (state.titlePos === 'top') centerY = h * 0.06 + blockH / 2;
  else if (state.titlePos === 'bottom') centerY = h * 0.94 - blockH / 2;
  else centerY = h * 0.5;
  centerY = Math.min(h * 0.97 - blockH / 2, Math.max(h * 0.03 + blockH / 2, centerY));

  ctx.save();
  ctx.translate(w / 2, centerY);
  ctx.transform(1, 0, -0.085, 1, 0, 0);
  ctx.translate(-w / 2, -centerY);

  const firstBaseline = centerY - blockH / 2 + px * 0.82;
  const fill = fillFor(ctx, state.titleColor, firstBaseline - px, firstBaseline + (fitted.lines.length - 1) * lineH);
  fitted.lines.forEach((ln, i) => paintLine(ctx, ln, w / 2, firstBaseline + i * lineH, px, fill));

  if (sub) {
    // Sub-caption: letter-spaced, auto-shrunk, on a dark pill so it reads anywhere.
    let sPx = subPx;
    const spacing = () => sPx * 0.2;
    ctx.font = `900 ${sPx}px ${DISPLAY}`;
    let subW = ctx.measureText(sub).width + spacing() * sub.length;
    while (subW > maxW && sPx > h * 0.02) {
      sPx *= 0.93;
      ctx.font = `900 ${sPx}px ${DISPLAY}`;
      subW = ctx.measureText(sub).width + spacing() * sub.length;
    }
    const subY = firstBaseline + (fitted.lines.length - 1) * lineH + subGap + sPx * 0.8;
    ctx.letterSpacing = `${spacing()}px`;
    const padX = sPx * 0.7;
    const pillW = Math.min(maxW, subW + padX * 2);
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
    ctx.strokeText(sub, w / 2 + spacing() / 2, subY);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(sub, w / 2 + spacing() / 2, subY);
    ctx.letterSpacing = '0px';
  }
  ctx.restore();
}