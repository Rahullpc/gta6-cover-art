// framing.js — photo framing: a focus-point cover crop.
// A panel shows a window of the photo. The window keeps the panel's aspect,
// is centred on a focus point (a face, a car, the horizon) and its width is
// `zoom` (fraction of the photo width). Smaller zoom = tighter on the face.
// Every focus point below was measured by eye from the sample photos.

export const FACE = {
  summer: { x: 0.72, y: 0.20 },
  pier: { x: 0.33, y: 0.20 },
  boulevard: { x: 0.42, y: 0.14 },
  porsche: { x: 0.63, y: 0.20 },
};

/**
 * Window of the photo (in source pixels) that fills a panel of size
 * (panelW x panelH) with the focus point at panel fraction (fx, fy).
 * zoom = window width as a fraction of the photo width.
 */
export function coverWindow(img, panelW, panelH, fx, fy, zoom) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const panelAspect = panelW / panelH;
  let sw = iw * zoom;
  let sh = sw / panelAspect;
  if (sh > ih) {
    sh = ih;
    sw = sh * panelAspect;
  }
  let sx = fx * iw - sw / 2;
  let sy = fy * ih - sh / 2;
  sx = Math.max(0, Math.min(iw - sw, sx));
  sy = Math.max(0, Math.min(ih - sh, sy));
  return { sx, sy, sw, sh };
}

/** Draw the photo into the panel rect with the focus-point cover crop. */
export function drawCover(ctx, img, rect, fx, fy, zoom) {
  if (!img || !img.width) return;
  const win = coverWindow(img, rect.w, rect.h, fx, fy, zoom);
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, win.sx, win.sy, win.sw, win.sh, rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

/**
 * Where a photo point (px, py) lands inside a panel, as panel fractions.
 * Used by the framing self-check: a face must land inside its panel with
 * margin, never clipped by the panel edge.
 */
export function pointInPanel(img, rect, px, py, fx, fy, zoom) {
  const win = coverWindow(img, rect.w, rect.h, fx, fy, zoom);
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  return {
    x: (px * iw - win.sx) / win.sw,
    y: (py * ih - win.sy) / win.sh,
  };
}

/** Draw a source rect of the photo STRETCHED to fill a dest rect.
 *  src is fractions of the source image {x0,y0,x1,y1}; dest is a panel
 *  rect {x,y,w,h}. Some reference panels are not cover crops: the photo
 *  is stretched (non-uniform scale) so a face lands smaller than any
 *  cover crop allows. The caller clips to the visible band first. */
export function drawStretched(ctx, img, dest, src) {
  if (!img || !img.width) return;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  ctx.drawImage(img,
    src.x0 * iw, src.y0 * ih, (src.x1 - src.x0) * iw, (src.y1 - src.y0) * ih,
    dest.x, dest.y, dest.w, dest.h);
}

/**
 * Where a photo point lands inside a stretched draw, as fractions of the
 * DEST rect (which may extend beyond the visible panel; the caller clips).
 */
export function pointInStretch(img, dest, src, px, py) {
  return {
    x: (px - src.x0) / (src.x1 - src.x0),
    y: (py - src.y0) / (src.y1 - src.y0),
    dest,
  };
}

/**
 * Framing self-check for one cover: every panel's face anchor must sit
 * inside the panel (0.08..0.92 on both axes). Stretch panels carry a
 * `stretch` field {src, dest} and the face is checked against the visible
 * panel rect (dest may extend past it). Returns a list of violations.
 */
export function checkFraming(img, panels) {
  const bad = [];
  for (const p of panels) {
    if (!p.face) continue;
    let pos;
    if (p.stretch) {
      // face position in dest-rect fractions -> absolute px -> panel fractions
      const f = pointInStretch(img[p.photo], p.stretch.dest, p.stretch.src,
        FACE[p.photo].x, FACE[p.photo].y);
      const ax = p.stretch.dest.x + f.x * p.stretch.dest.w;
      const ay = p.stretch.dest.y + f.y * p.stretch.dest.h;
      pos = { x: (ax - p.rect.x) / p.rect.w, y: (ay - p.rect.y) / p.rect.h };
    } else {
      pos = pointInPanel(img[p.photo], p.rect, FACE[p.photo].x, FACE[p.photo].y, p.fx, p.fy, p.zoom);
    }
    if (pos.x < 0.08 || pos.x > 0.92 || pos.y < 0.02 || pos.y > 0.95) {
      bad.push({ panel: p.name, photo: p.photo, x: +pos.x.toFixed(2), y: +pos.y.toFixed(2) });
    }
  }
  return bad;
}
