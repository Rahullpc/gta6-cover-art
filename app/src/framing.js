// framing.js — face-safe framing engine.
// One rule: a head is either fully on screen or fully off it. A half-sliced
// face is never a legal result. Every panel goes through computeFrame, so the
// live preview, the drag interaction and the PNG export always agree.

export const FOCUS = {
  boulevard: { cx: 0.62, cy: 0.235, w: 0.36, h: 0.30 },
  pier:      { cx: 0.40, cy: 0.20,  w: 0.42, h: 0.38 },
  porsche:   { cx: 0.55, cy: 0.18,  w: 0.10, h: 0.15 },
  summer:    { cx: 0.66, cy: 0.17,  w: 0.22, h: 0.28 },
};

export const FALLBACK_FOCUS = { cx: 0.5, cy: 0.24, w: 0.46, h: 0.38 };

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

// Padded head rectangle, in photo-fraction coordinates: 10% of height on top,
// 5% at the bottom, 8% of width on each side, clamped to the photo.
export function padFocus(f) {
  const x0 = clamp(f.cx - f.w / 2 - f.w * 0.08, 0, 1);
  const x1 = clamp(f.cx + f.w / 2 + f.w * 0.08, 0, 1);
  const y0 = clamp(f.cy - f.h / 2 - f.h * 0.10, 0, 1);
  const y1 = clamp(f.cy + f.h / 2 + f.h * 0.05, 0, 1);
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

function baseName(name) {
  return String(name || '').split('/').pop().split('.')[0].toLowerCase();
}

// Cheap skin-tone head finder: downscale to a 48px-wide grid, score pixels
// for skin, weight the top of the frame heavier, return the weighted centroid
// and spread, or null when the signal is too weak or too dominant.
export function findHeadBySkin(img) {
  try {
    if (typeof document === 'undefined') return null;
    const W = 48, H = Math.max(8, Math.round(48 * img.naturalHeight / img.naturalWidth));
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, W, H);
    const d = g.getImageData(0, 0, W, H).data;
    let sx = 0, sy = 0, sw = 0, n = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const r = d[i], gg = d[i + 1], b = d[i + 2];
        const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
        const skin = r > gg + 8 && r > b + 8 && (r - gg) > 10 && (mx - mn) > 12 && r < 250;
        if (!skin) continue;
        const wgt = 1.6 - (y / H); // top of frame counts more
        sx += (x + 0.5) / W * wgt; sy += (y + 0.5) / H * wgt; sw += wgt; n++;
      }
    }
    if (n < 6 || n > W * H * 0.55) return null;
    const cx = sx / sw, cy = sy / sw;
    return { cx, cy, w: 0.34, h: 0.30 };
  } catch (e) { return null; }
}

// Resolve the focus box for a photo: measured table first, then the skin
// finder, then the upper-centre fallback.
export function resolveFocus(photo) {
  if (!photo) return FALLBACK_FOCUS;
  const key = baseName(photo.name);
  if (FOCUS[key]) return FOCUS[key];
  if (photo.focus) return photo.focus;
  if (photo.img) {
    const found = findHeadBySkin(photo.img);
    if (found) { photo.focus = found; return found; }
  }
  return FALLBACK_FOCUS;
}

// Window size (photo fractions) for a cover crop at a given zoom.
// The window's pixel aspect must equal the panel's aspect, or the photo
// stretches when drawn. So the limiting photo side depends on which is
// relatively wider: the panel or the photo.
function coverWindow(panelW, panelH, zoom, iw, ih) {
  const a = panelW / panelH;
  const pa = iw / ih;
  let ww, wh;
  if (a >= pa) { ww = 1 / zoom; wh = ww * pa / a; }
  else { wh = 1 / zoom; ww = wh * a / pa; }
  return { ww, wh };
}

// The frame computer. Returns the draw recipe for one panel:
// { mode:'cover', sx, sy, sw, sh } — source rect in photo fractions, drawn
// stretched over the whole panel; or
// { mode:'blur', sharp:{sx, sy, sw, sh, dx, dy, dw, dh} } — a blurred
// stretched plate plus a sharp copy placed so the whole head fits.
export function computeFrame(img, panel, crop, focus) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const pw = panel.w, ph = panel.h;
  const head = padFocus(focus);
  const headPx = { x0: head.x0 * iw, y0: head.y0 * ih, x1: head.x1 * iw, y1: head.y1 * ih,
                   w: head.w * iw, h: head.h * ih, cx: head.cx * iw, cy: head.cy * ih };
  const zoom = clamp(crop.zoom || 1, 1, 4);
  const panX = clamp(crop.panX || 0, -1, 1);
  const panY = clamp(crop.panY || 0, -1, 1);
  const heroY = panel.tag === 'hero' ? 0.34 : 0.32; // head height in panel

  if (crop.kind === 'scene') return sceneFrame(iw, ih, pw, ph, crop, headPx, zoom);

  // Face crop: window must contain the whole padded head.
  let win = coverWindow(pw, ph, zoom, iw, ih);
  let ww = win.ww * iw, wh = win.wh * ih;
  // Ease the zoom down until the window can hold the head.
  if (ww < headPx.w || wh < headPx.h) {
    const need = Math.max(headPx.w / (win.ww * iw), headPx.h / (win.wh * ih));
    const z2 = Math.max(1, zoom / need);
    win = coverWindow(pw, ph, z2, iw, ih);
    ww = win.ww * iw; wh = win.wh * ih;
  }
  // If even the zoom-1 window cannot hold the head, the panel is too
  // extreme for any cover crop: drop to the blurred plate.
  const w1 = coverWindow(pw, ph, 1, iw, ih);
  if (w1.ww * iw < headPx.w || w1.wh * ih < headPx.h) {
    return blurFrame(iw, ih, pw, ph, headPx, panel.tag, heroY);
  }
  // Base origin puts the head centred horizontally, at heroY of the height.
  const minX = Math.max(0, headPx.x1 - ww), maxX = Math.min(iw - ww, headPx.x0);
  const minY = Math.max(0, headPx.y1 - wh), maxY = Math.min(ih - wh, headPx.y0);
  let ox = headPx.cx - ww / 2 + panX * ww * 0.25;
  let oy = headPx.cy - heroY * wh + panY * wh * 0.25;
  ox = clamp(ox, Math.min(minX, maxX), Math.max(minX, maxX));
  oy = clamp(oy, Math.min(minY, maxY), Math.max(minY, maxY));
  ox = clamp(ox, 0, Math.max(0, iw - ww));
  oy = clamp(oy, 0, Math.max(0, ih - wh));
  return { mode: 'cover', sx: ox / iw, sy: oy / ih, sw: ww / iw, sh: wh / ih };
}

function sceneFrame(iw, ih, pw, ph, crop, headPx, zoom) {
  const win = coverWindow(pw, ph, zoom, iw, ih);
  const ww = win.ww * iw, wh = win.wh * ih;
  const ax = clamp(crop.aimX ?? 0.5, 0, 1) * iw;
  const ay = clamp(crop.aimY ?? 0.5, 0, 1) * ih;
  let ox = clamp(ax - ww / 2, 0, Math.max(0, iw - ww));
  let oy = clamp(ay - wh / 2, 0, Math.max(0, ih - wh));
  // Guard: nudge the window so the head escapes whole, least move first.
  // Head escapes left  -> window starts at the head's right edge.
  // Head escapes right -> window ends at the head's left edge.
  // Head escapes above -> window starts at the head's bottom edge.
  // Head escapes below -> window ends at the head's top edge.
  const overlapX = ox < headPx.x1 && ox + ww > headPx.x0;
  const overlapY = oy < headPx.y1 && oy + wh > headPx.y0;
  const partial = overlapX && overlapY &&
    !(ox <= headPx.x0 && ox + ww >= headPx.x1 && oy <= headPx.y0 && oy + wh >= headPx.y1);
  if (partial) {
    const moves = [
      { x: headPx.x1, y: oy },            // head escapes left
      { x: headPx.x0 - ww, y: oy },       // head escapes right
      { x: ox, y: headPx.y1 },            // head escapes above
      { x: ox, y: headPx.y0 - wh },       // head escapes below
    ].map(m => ({
      x: clamp(m.x, 0, Math.max(0, iw - ww)),
      y: clamp(m.y, 0, Math.max(0, ih - wh)),
      d: Math.abs(clamp(m.x, 0, Math.max(0, iw - ww)) - ox) + Math.abs(clamp(m.y, 0, Math.max(0, ih - wh)) - oy),
    })).sort((a, b) => a.d - b.d);
    let cleared = false;
    for (const m of moves) {
      const nx = m.x, ny = m.y;
      const still = nx < headPx.x1 && nx + ww > headPx.x0 && ny < headPx.y1 && ny + wh > headPx.y0;
      const headInside = nx <= headPx.x0 && nx + ww >= headPx.x1 && ny <= headPx.y0 && ny + wh >= headPx.y1;
      if (!still || headInside) { ox = nx; oy = ny; cleared = true; break; }
    }
    if (!cleared) {
      // Cannot clear and cannot hold whole: fall back to the face-safe cover.
      return computeFrame({ naturalWidth: iw, naturalHeight: ih },
        { w: pw, h: ph, tag: 'hero' },
        { zoom: 1, panX: 0, panY: 0, kind: 'face' },
        { cx: headPx.cx / iw, cy: headPx.cy / ih, w: headPx.w / iw, h: headPx.h / ih });
    }
  }
  return { mode: 'cover', sx: ox / iw, sy: oy / ih, sw: ww / iw, sh: wh / ih };
}

function blurFrame(iw, ih, pw, ph, headPx, tag, heroY) {
  // Sharp copy scaled so the whole head fits with breathing room.
  // The scale is capped by width as well as height: a tall narrow panel
  // must not blow the head up past its own width.
  let s;
  if (tag === 'hero') s = Math.min((0.94 * ph) / headPx.h, (0.80 * pw) / headPx.w);
  else if (pw / ph > 1.4) s = Math.min((0.60 * ph) / headPx.h, (0.80 * pw) / headPx.w);
  else s = (0.78 * pw) / Math.max(headPx.w, 1);
  const dw = iw * s, dh = ih * s;
  let dx = pw * 0.5 - headPx.cx * s;
  let dy = ph * heroY - headPx.cy * s;
  // Keep the whole head on screen: slide the copy just enough that the
  // padded head box stays inside the panel. When the head is wider or
  // taller than the panel it cannot fit whole, so leave it centred on the
  // head instead of shoving it further out.
  const minDx = -headPx.x0 * s, maxDx = pw - headPx.x1 * s;
  if (minDx <= maxDx) dx = clamp(dx, minDx, maxDx);
  const minDy = -headPx.y0 * s, maxDy = ph - headPx.y1 * s;
  if (minDy <= maxDy) dy = clamp(dy, minDy, maxDy);
  return { mode: 'blur', sharp: { dx, dy, dw, dh } };
}

// Drag inverter: pointer travel in panel pixels becomes a new pan in [-1, 1].
export function dragToPan(crop, panel, dx, dy) {
  return {
    panX: clamp((crop.panX || 0) - 2 * dx / panel.w, -1, 1),
    panY: clamp((crop.panY || 0) - 2 * dy / panel.h, -1, 1),
  };
}

// Self-check: classify a frame's visible window against the head box.
export function classifyFrame(frame, focus) {
  const head = padFocus(focus);
  if (frame.mode === 'blur') return 'whole';
  const wx0 = frame.sx, wy0 = frame.sy, wx1 = frame.sx + frame.sw, wy1 = frame.sy + frame.sh;
  const inside = wx0 <= head.x0 + 1e-6 && wx1 >= head.x1 - 1e-6 &&
                 wy0 <= head.y0 + 1e-6 && wy1 >= head.y1 - 1e-6;
  if (inside) return 'whole';
  const disjoint = wx1 <= head.x0 || wx0 >= head.x1 || wy1 <= head.y0 || wy0 >= head.y1;
  if (disjoint) return 'absent';
  return 'cut';
}
