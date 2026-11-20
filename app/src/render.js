// Vice Nights renderer — draws one diagonal-split cover on a 2D canvas.
//
// Pipeline, in order: the photo full-bleed (cover-fit, anchored on the
// theme's face point so the face lands in the photo zone), the colour
// zone as a gradient polygon cut by the diagonal, a glowing seam along
// the diagonal, then the title block riding the slant. Nothing is drawn
// in the sky: no birds, no skyline, no badge.

import { diagonal, titleAnchor, zonePolygon } from './themes.js';

const FONT_FACE = '"Vice Nights", "Noto Sans Condensed Black", sans-serif';

// Where the photo lands on the canvas: cover-fit at `zoom`, translated
// so the theme's face point maps to the theme's target point, then
// clamped so the photo still covers the whole canvas (no gaps).
export function placePhoto(theme, img, W, H, zoom, panX, panY) {
  const base = Math.max(W / img.naturalWidth, H / img.naturalHeight);
  const s = base * zoom;
  const dw = img.naturalWidth * s;
  const dh = img.naturalHeight * s;
  // Focus point in canvas space before translation.
  const fx = theme.focus.x * dw;
  const fy = theme.focus.y * dh;
  let ox = theme.target.x * W - fx + panX;
  let oy = theme.target.y * H - fy + panY;
  // Clamp: the photo must cover [0,W] x [0,H].
  ox = Math.min(0, Math.max(W - dw, ox));
  oy = Math.min(0, Math.max(H - dh, oy));
  return { ox, oy, dw, dh };
}

// Is a canvas point inside a polygon (ray casting)? Used by the
// framing check to prove the face box stays out of the colour zone.
export function insidePolygon(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const crosses = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

// Shrink the font until `text` fits `maxW`. Returns the size used.
function fitFont(ctx, text, start, maxW, weight = 900) {
  let size = start;
  ctx.font = `${weight} ${size}px ${FONT_FACE}`;
  while (size > 12 && ctx.measureText(text).width > maxW) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${FONT_FACE}`;
  }
  return size;
}

function drawTitleBlock(ctx, theme, W, H) {
  const a = titleAnchor(theme, W, H);
  const lines = theme.title.split('\n');
  const c = theme.colours;
  // The block runs from 0.84 sizes above the title centre to 1.68
  // below it (title lines, accent bar, subtitle) — 2.52 sizes tall,
  // centred 0.42 sizes below the anchor. Size it so the whole block
  // fits the colour zone, and centre it inside that zone.
  const widest = lines.reduce((m, l) => (l.length > m.length ? l : m), '');
  const widthSize = fitFont(ctx, widest, Math.round(0.115 * W), a.maxW);
  let size;
  let anchorY;
  if (theme.split.side === 'bottom') {
    const d = diagonal(theme, W, H);
    // Diagonal's y at the anchor x (the line is straight).
    const diagY = d.ay + ((d.by - d.ay) * (a.x - d.ax)) / (d.bx - d.ax);
    const depth = H - diagY;
    size = Math.min(widthSize, depth * 0.34);
    anchorY = (diagY + H) / 2 - 0.42 * size;
  } else {
    size = Math.min(widthSize, H * 0.32);
    anchorY = a.y;
  }
  ctx.save();
  ctx.translate(a.x, anchorY);
  ctx.rotate(a.rot);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const gap = size * 0.98;
  const total = gap * (lines.length - 1);
  ctx.shadowColor = 'rgba(10, 5, 25, 0.55)';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = Math.round(size * 0.045);
  ctx.shadowOffsetY = Math.round(size * 0.05);
  ctx.fillStyle = c.title;
  lines.forEach((line, i) => {
    ctx.font = `900 ${size}px ${FONT_FACE}`;
    ctx.fillText(line, 0, -total / 2 + i * gap);
  });
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  // Accent bar + subtitle under the title.
  const barY = total / 2 + size * 0.42;
  const barW = Math.min(a.maxW * 0.5, size * 2.4);
  ctx.fillStyle = c.bar;
  ctx.fillRect(-barW / 2, barY, barW, Math.max(4, size * 0.07));
  const subSize = fitFont(ctx, theme.subtitle, Math.round(size * 0.30), a.maxW * 0.9, 700);
  ctx.font = `700 ${subSize}px ${FONT_FACE}`;
  ctx.fillStyle = c.sub;
  ctx.fillText(theme.subtitle, 0, barY + size * 0.62);
  ctx.restore();
}

// Draw the cover. `opts` carries the live editor state:
// { title, subtitle, tagline, zoom, panX, panY }.
export function drawCover(ctx, theme, img, opts, W, H) {
  const o = opts ?? {};
  const title = o.title ?? theme.title;
  const subtitle = o.subtitle ?? theme.subtitle;
  const zoom = o.zoom ?? 1;
  const panX = o.panX ?? 0;
  const panY = o.panY ?? 0;
  const view = { ...theme, title, subtitle };

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0a0518';
  ctx.fillRect(0, 0, W, H);

  // 1. Photo, full-bleed.
  const p = placePhoto(theme, img, W, H, zoom, panX, panY);
  ctx.drawImage(img, p.ox, p.oy, p.dw, p.dh);

  // 2. Colour zone: gradient polygon below/right of the diagonal.
  const poly = zonePolygon(theme, W, H);
  const grad = theme.split.side === 'bottom'
    ? ctx.createLinearGradient(0, Math.min(poly[0].y, poly[1].y), 0, H)
    : ctx.createLinearGradient(0, 0, Math.max(poly[1].x, poly[2].x), 0);
  grad.addColorStop(0, theme.colours.from);
  grad.addColorStop(1, theme.colours.to);
  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // 3. Seam: a bright line along the diagonal, with a soft glow.
  const d = diagonal(theme, W, H);
  ctx.save();
  ctx.strokeStyle = theme.colours.seam;
  ctx.lineWidth = Math.max(3, W * 0.004);
  ctx.shadowColor = theme.colours.seam;
  ctx.shadowBlur = W * 0.012;
  ctx.beginPath();
  ctx.moveTo(d.ax, d.ay);
  ctx.lineTo(d.bx, d.by);
  ctx.stroke();
  ctx.restore();

  // 4. Title block riding the slant.
  drawTitleBlock(ctx, view, W, H);

  // 5. Tagline, small, in the photo zone opposite the title.
  const tag = o.tagline ?? theme.tagline;
  if (tag) {
    ctx.save();
    ctx.font = `700 ${Math.round(W * 0.028)}px ${FONT_FACE}`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.shadowColor = 'rgba(10,5,25,0.6)';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    if (theme.split.side === 'bottom') {
      ctx.textAlign = 'left';
      ctx.fillText(`“${tag}”`, W * 0.045, H * 0.09);
    } else {
      ctx.textAlign = 'right';
      ctx.fillText(`“${tag}”`, W * 0.955, H * 0.09);
    }
    ctx.restore();
  }
}
