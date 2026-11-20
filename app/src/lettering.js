// lettering.js — the giant comic caption.
// All-caps display title plus a sub-caption line, painted last with a
// slight poster skew (horizontal shear about -0.08). The title auto-shrinks
// and wraps into at most two balanced lines inside 90% of the sheet width.

const FONT = `'Noto Sans Condensed Black', 'Arial Black', sans-serif`;

function fillFor(ctx, colour, x, y, w, h) {
  switch (colour) {
    case 'sunset': {
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, '#FFD60A'); g.addColorStop(0.5, '#FF7A18'); g.addColorStop(1, '#FF2E88');
      return g;
    }
    case 'gold': {
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, '#FFF3B0'); g.addColorStop(1, '#C9930A');
      return g;
    }
    case 'pink': return '#FF6EC7';
    case 'cyan': return '#00E5FF';
    default: return '#FFFFFF';
  }
}

// Split a title into at most two balanced lines: split at the space nearest
// the middle so the two lines are close in length.
export function splitTitle(title) {
  const words = String(title || '').trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [words.join(' ')];
  const full = words.join(' ');
  const mid = full.length / 2;
  let best = -1, bestD = Infinity;
  let pos = 0;
  for (let i = 0; i < words.length - 1; i++) {
    pos += words[i].length + 1;
    const d = Math.abs(pos - 1 - mid);
    if (d < bestD) { bestD = d; best = i; }
  }
  return [words.slice(0, best + 1).join(' '), words.slice(best + 1).join(' ')];
}

function measureLines(ctx, lines, size) {
  ctx.font = `900 ${size}px ${FONT}`;
  return Math.max(...lines.map(l => ctx.measureText(l).width));
}

// Lay out the title: returns { lines, size, blockH }.
export function layoutTitle(ctx, title, W, H, scale) {
  const maxW = W * 0.9;
  const minSize = H * 0.05;
  let size = H * 0.16 * scale;
  const words = String(title || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return { lines: [], size, blockH: 0 };
  let lines = [words.join(' ')];
  while (size > minSize) {
    ctx.font = `900 ${size}px ${FONT}`;
    if (measureLines(ctx, lines, size) <= maxW) break;
    if (lines.length === 1 && words.length > 1) {
      lines = splitTitle(title);
      if (measureLines(ctx, lines, size) <= maxW) break;
    }
    size *= 0.93;
  }
  const blockH = lines.length * size * 1.02;
  return { lines, size, blockH };
}

export function paintTitle(ctx, title, sub, W, H, opts) {
  const { placement = 'bottom', colour = 'white', scale = 1 } = opts || {};
  const t = String(title || '').trim().toUpperCase();
  const s = String(sub || '').trim().toUpperCase();
  if (!t && !s) return;
  const lay = layoutTitle(ctx, t, W, H, scale);
  const size = lay.size;
  const subSize = Math.max(H * 0.028, size * 0.24);
  const gap = size * 0.28;
  const subH = s ? subSize + H * 0.02 : 0;
  const blockH = lay.blockH + (s ? gap + subH : 0);
  let cy;
  if (placement === 'top') cy = H * 0.06 + blockH / 2;
  else if (placement === 'middle') cy = H * 0.50;
  else cy = H * 0.94 - blockH / 2;
  cy = Math.max(blockH / 2 + H * 0.02, Math.min(H - blockH / 2 - H * 0.02, cy));
  const topY = cy - blockH / 2;

  ctx.save();
  ctx.translate(W / 2, topY);
  ctx.transform(1, 0, -0.08, 1, 0, 0);
  ctx.translate(-W / 2, -topY);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let y = topY;
  for (const line of lay.lines) {
    const ly = y + size * 0.51;
    // Cyan shadow, then magenta shadow, then fat black outline, then fill.
    ctx.font = `900 ${size}px ${FONT}`;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#00E5FF';
    ctx.fillText(line, W / 2 + size * 0.10, ly + size * 0.13);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#FF2E88';
    ctx.fillText(line, W / 2 + size * 0.055, ly + size * 0.075);
    ctx.globalAlpha = 1;
    ctx.lineJoin = 'round';
    ctx.lineWidth = size * 0.17;
    ctx.strokeStyle = '#0D001A';
    ctx.strokeText(line, W / 2, ly);
    ctx.fillStyle = fillFor(ctx, colour, W / 2, ly - size / 2, size, size);
    ctx.fillText(line, W / 2, ly);
    y += size * 1.02;
  }

  if (s) {
    const subY = y + gap + subSize * 0.5;
    ctx.font = `900 ${subSize}px ${FONT}`;
    const tw = ctx.measureText(s.split('').join('\u2009')).width + subSize * 0.9;
    const pillW = Math.min(W * 0.9, tw + subSize * 1.6);
    const pillH = subSize + H * 0.02;
    const px = W / 2 - pillW / 2, py = subY - pillH / 2;
    ctx.fillStyle = 'rgba(13,0,26,0.72)';
    ctx.strokeStyle = 'rgba(255,46,136,0.6)';
    ctx.lineWidth = Math.max(1.5, H * 0.002);
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(px, py, pillW, pillH, pillH / 2); else ctx.rect(px, py, pillW, pillH);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.lineWidth = Math.max(1, subSize * 0.08);
    ctx.strokeStyle = '#0D001A';
    const spaced = s.split('').join('\u2009');
    ctx.strokeText(spaced, W / 2, subY + subSize * 0.04);
    ctx.fillText(spaced, W / 2, subY + subSize * 0.04);
  }
  ctx.restore();
}
