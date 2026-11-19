// framing.js — the face-safe crop engine, new in v2.
//
// v1 cropped panels with a blind cover-fill plus arbitrary pan, which sliced
// the top off portrait photos (both sample faces live in the upper third of
// their frame). v2 instead knows where each photo's head is and frames every
// panel so the face is either fully inside the panel or fully out of it —
// never half-cut at an edge. Three ideas do the work:
//
//   1. A focus box per photo (the head + a little headroom). The two shipped
//      samples carry measured boxes; uploads get a quick skin-tone estimate.
//   2. A cover crop whose pan is clamped to the range that keeps the focus box
//      inside the visible window. When the panel is too short/narrow to hold
//      the head at the requested zoom, the zoom is eased down automatically.
//   3. A blur-fill fallback for extreme panels: a soft stretched copy of the
//      photo fills the panel, and a sharp copy is scaled so the whole head fits
//      with margin. Detail panels (car, street, sky) aim away from the head; a
//      guard nudges the window clear of the face, and if it cannot, the panel
//      falls back to face-safe framing so a face is never clipped.
//
// computeFrame() is pure geometry — the renderer draws from it and the editor
// inverts it for drag, so preview, drag and export all agree.

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Measured head boxes for the bundled samples (fractions of the photo), sized
// to the actual head (hair/hat crown to chin) so a cover crop fits the head
// without triggering blur-fill on large panels.
// boulevard.jpg 544x720: hair crown ~0.09, chin ~0.38, face centre x~0.62.
// pier.jpg 720x720: bucket-hat crown ~0.02, beard ~0.38, face centre x~0.40.
export const SAMPLE_FOCUS = {
  boulevard: { x: 0.62, y: 0.235, w: 0.36, h: 0.3 },
  pier: { x: 0.4, y: 0.2, w: 0.42, h: 0.38 },
};

// A sensible default for an unknown portrait: head in the upper centre.
const FALLBACK_FOCUS = { x: 0.5, y: 0.24, w: 0.46, h: 0.38 };

/**
 * Estimate a head box from skin tones. Downscale to a tiny grid, score pixels
 * with a classic RGB skin rule, weight the upper frame more (faces beat hands),
 * then take a weighted centroid + spread. Returns null when there is too little
 * or too much skin to trust, so the caller falls back to the default box.
 */
export function detectFocus(img) {
  try {
    const gw = 48;
    const gh = Math.max(8, Math.round((gw * img.naturalHeight) / img.naturalWidth));
    const c = document.createElement('canvas');
    c.width = gw;
    c.height = gh;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, gw, gh);
    const data = g.getImageData(0, 0, gw, gh).data;
    let sum = 0, sx = 0, sy = 0, sxx = 0, syy = 0;
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        const i = (y * gw + x) * 4;
        const r = data[i], gg = data[i + 1], b = data[i + 2];
        const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
        const skin = r > 60 && gg > 30 && b > 15 && r > gg && r > b && r - gg > 10 && mx - mn > 12 && r < 250;
        if (!skin) continue;
        const w = 1.6 - y / gh; // bias toward the top of the frame
        sum += w;
        sx += w * x;
        sy += w * y;
        sxx += w * x * x;
        syy += w * y * y;
      }
    }
    const total = gw * gh;
    if (sum < total * 0.02 || sum > total * 0.6) return null;
    const cx = sx / sum / gw;
    const cy = sy / sum / gh;
    const vx = Math.max(0.0004, sxx / sum / gw / gw - cx * cx);
    const vy = Math.max(0.0004, syy / sum / gh / gh - cy * cy);
    const w = clamp(Math.sqrt(vx) * 4.2, 0.24, 0.7);
    const h = clamp(Math.sqrt(vy) * 4.6, 0.26, 0.66);
    return { x: clamp(cx, 0.2, 0.8), y: clamp(cy, 0.12, 0.5), w, h };
  } catch {
    return null;
  }
}

/** Resolve the focus box for a photo entry ({ img, name, focus? }). */
export function focusOf(photo) {
  if (photo.focus) return photo.focus;
  const key = String(photo.name || '').replace(/^samples\//, '').replace(/\.[a-z]+$/i, '');
  if (SAMPLE_FOCUS[key]) return SAMPLE_FOCUS[key];
  const found = detectFocus(photo.img);
  photo.focus = found || FALLBACK_FOCUS;
  return photo.focus;
}

// Headroom padding around the focus box, as a share of the box itself. Kept
// modest so large panels still use a full-bleed cover crop (busy, not blurred).
const PAD_TOP = 0.1, PAD_SIDE = 0.08, PAD_BOTTOM = 0.05;

function focusRect(img, focus) {
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const bw = focus.w * iw, bh = focus.h * ih;
  const cx = focus.x * iw, cy = focus.y * ih;
  // Pad for headroom, then clamp to the image: a head at the very top of the
  // photo has no pixels above it, so padding must not invent area outside the
  // frame (that would make "whole" impossible and falsely report a cut).
  const x0 = clamp(cx - bw / 2 - bw * PAD_SIDE, 0, iw);
  const x1 = clamp(cx + bw / 2 + bw * PAD_SIDE, 0, iw);
  const y0 = clamp(cy - bh / 2 - bh * PAD_TOP, 0, ih);
  const y1 = clamp(cy + bh / 2 + bh * PAD_BOTTOM, 0, ih);
  return { x0, x1, y0, y1, w: x1 - x0, h: y1 - y0, cx, cy };
}

// Where the face should sit inside a panel. Faces sit in the upper third so the
// scene action (skyline, car, crowd, sea) fills the lower two-thirds clear of them.
const anchorFor = (panel) => ({ ax: 0.5, ay: panel.hero ? 0.34 : 0.32 });

// Classify a window against the focus box: 'whole' | 'absent' | 'cut'.
// A sub-pixel tolerance keeps a head flush against an image edge from being
// called "cut" by floating-point drift when the zoom is eased to fit.
const EPS = 0.5;
function classify(left, top, winW, winH, f) {
  const overlapX = left < f.x1 - EPS && left + winW > f.x0 + EPS;
  const overlapY = top < f.y1 - EPS && top + winH > f.y0 + EPS;
  if (!overlapX || !overlapY) return 'absent';
  if (left <= f.x0 + EPS && left + winW >= f.x1 - EPS && top <= f.y0 + EPS && top + winH >= f.y1 - EPS) return 'whole';
  return 'cut';
}

/**
 * Compute how to draw a photo into a panel.
 * edit = { zoom, panX, panY, detail?, aimX?, aimY? }.
 * Returns { mode, bg, scale, left, top, baseLeft, baseTop, rangeX, rangeY }
 * where left/top are the sharp layer's window origin in image pixels, scale is
 * image-px -> panel-px, and pan in [-1,1] maps across base +/- range.
 */
export function computeFrame(img, panel, edit, focus) {
  const f = focusRect(img, focus);
  if (edit.detail) return detailFrame(img, panel, edit, f, focus);
  return safeFrame(img, panel, edit, f);
}

// Face-safe cover crop: clamp pan so the whole head stays visible; ease zoom
// down when the panel is too small, or blur-fill when even cover cannot hold it.
function safeFrame(img, panel, edit, f) {
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const pw = panel.w, ph = panel.h;
  const zoom = clamp(edit.zoom ?? 1, 1, 4);
  const panX = clamp(edit.panX ?? 0, -1, 1);
  const panY = clamp(edit.panY ?? 0, -1, 1);
  const { ax, ay } = anchorFor(panel);

  const cover = Math.max(pw / iw, ph / ih);
  let scale = cover * zoom;
  let winW = pw / scale, winH = ph / scale;

  if (winW < f.w || winH < f.h) {
    const fitScale = Math.min(pw / f.w, ph / f.h);
    if (fitScale >= cover) {
      scale = fitScale;
      winW = pw / scale;
      winH = ph / scale;
    } else {
      return blurFrame(f, iw, ih, panel, zoom, panX, panY, ax, ay);
    }
  }

  const loX = clamp(f.x1 - winW, 0, Math.max(0, iw - winW));
  const hiX = clamp(f.x0, 0, Math.max(0, iw - winW));
  const loY = clamp(f.y1 - winH, 0, Math.max(0, ih - winH));
  const hiY = clamp(f.y0, 0, Math.max(0, ih - winH));
  const minX = Math.min(loX, hiX), maxX = Math.max(loX, hiX);
  const minY = Math.min(loY, hiY), maxY = Math.max(loY, hiY);

  const baseLeft = clamp(f.cx - ax * winW, minX, maxX);
  const baseTop = clamp(f.cy - ay * winH, minY, maxY);
  const rangeX = (maxX - minX) / 2;
  const rangeY = (maxY - minY) / 2;
  const left = clamp(baseLeft + panX * rangeX, minX, maxX);
  const top = clamp(baseTop + panY * rangeY, minY, maxY);
  return { mode: 'cover', bg: false, scale, left, top, baseLeft, baseTop, rangeX, rangeY };
}

// Extreme panel: blur-fill background + a sharp copy scaled to hold the head.
// The face is sized by panel shape and role: a hero fills the panel height (big,
// dominant); a wide non-hero strip keeps the face to ~60% of the height so the
// lower half stays clear for scene action; tall columns let it fill the width.
function blurFrame(f, iw, ih, panel, zoom, panX, panY, ax, ay) {
  const pw = panel.w, ph = panel.h;
  const fitW = pw / f.w, fitH = ph / f.h;
  const wide = pw > ph;
  const heightShare = panel.hero ? 0.94 : 0.6;
  const base = wide ? Math.min(fitW, fitH * heightShare) : Math.min(fitW * 0.9, fitH);
  const cap = wide ? Math.min(fitW, fitH * heightShare) : Math.min(fitW, fitH);
  const scale = Math.min(base * zoom, cap);
  const winW = pw / scale, winH = ph / scale;
  const loX = f.x1 - winW, hiX = f.x0;
  const loY = f.y1 - winH, hiY = f.y0;
  const minX = Math.min(loX, hiX), maxX = Math.max(loX, hiX);
  const minY = Math.min(loY, hiY), maxY = Math.max(loY, hiY);
  const baseLeft = clamp(f.cx - ax * winW, minX, maxX);
  const baseTop = clamp(f.cy - ay * winH, minY, maxY);
  const rangeX = (maxX - minX) / 2;
  const rangeY = (maxY - minY) / 2;
  const left = clamp(baseLeft + panX * rangeX, minX, maxX);
  const top = clamp(baseTop + panY * rangeY, minY, maxY);
  return { mode: 'blur', bg: true, scale, left, top, baseLeft, baseTop, rangeX, rangeY };
}

// Detail panel: aim at a point away from the head. Guard the window so the face
// is whole or absent; if neither is possible at this zoom, fall back to the
// face-safe crop so a face is never clipped.
function detailFrame(img, panel, edit, f, focus) {
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const pw = panel.w, ph = panel.h;
  const zoom = clamp(edit.zoom ?? 1, 1, 4);
  const panX = clamp(edit.panX ?? 0, -1, 1);
  const panY = clamp(edit.panY ?? 0, -1, 1);
  const cover = Math.max(pw / iw, ph / ih);
  const scale = cover * zoom;
  const winW = pw / scale, winH = ph / scale;
  const aimX = (edit.aimX ?? 0.5) * iw;
  const aimY = (edit.aimY ?? 0.5) * ih;
  const hiX = Math.max(0, iw - winW), hiY = Math.max(0, ih - winH);
  const baseLeft = clamp(aimX - winW / 2, 0, hiX);
  const baseTop = clamp(aimY - winH / 2, 0, hiY);
  const rangeX = hiX / 2, rangeY = hiY / 2;
  let left = clamp(baseLeft + panX * rangeX, 0, hiX);
  let top = clamp(baseTop + panY * rangeY, 0, hiY);

  if (classify(left, top, winW, winH, f) === 'cut') {
    // Try to slide the window fully clear of the head along either axis.
    const candidates = [
      { left: clamp(f.x1, 0, hiX), top }, // head to the left, out
      { left: clamp(f.x0 - winW, 0, hiX), top }, // head to the right, out
      { left, top: clamp(f.y1, 0, hiY) }, // head above, out
      { left, top: clamp(f.y0 - winH, 0, hiY) }, // head below, out
    ];
    let best = null;
    for (const c of candidates) {
      if (classify(c.left, c.top, winW, winH, f) === 'absent') {
        const d = Math.abs(c.left - left) + Math.abs(c.top - top);
        if (!best || d < best.d) best = { ...c, d };
      }
    }
    if (best) {
      left = best.left;
      top = best.top;
    } else if (winW >= f.w && winH >= f.h) {
      // Cannot clear it, but it fits: contain the whole head instead.
      left = clamp(f.cx - winW / 2, 0, hiX);
      top = clamp(f.cy - winH / 2, 0, hiY);
    } else {
      // Neither possible at this zoom: defer to the face-safe crop.
      return safeFrame(img, panel, { zoom, panX: 0, panY: 0 }, f);
    }
  }
  return { mode: 'cover', bg: false, scale, left, top, baseLeft, baseTop, rangeX, rangeY };
}

/**
 * Turn a pointer drag (in image pixels) into a new pan for the current frame.
 * Shared by the editor so dragging never pushes a face out of frame.
 */
export function panFromDelta(frame, dxImg, dyImg) {
  const rx = Math.max(frame.rangeX, 1e-6);
  const ry = Math.max(frame.rangeY, 1e-6);
  return {
    panX: clamp((frame.left + dxImg - frame.baseLeft) / rx, -1, 1),
    panY: clamp((frame.top + dyImg - frame.baseTop) / ry, -1, 1),
  };
}

/**
 * Test helper: does a frame's visible window clip the focus box?
 * Returns 'whole' | 'absent' | 'cut'. Used by the framing self-check.
 */
export function faceStatus(img, panel, edit, focus) {
  const fr = computeFrame(img, panel, edit, focus);
  const f = focusRect(img, focus);
  return classify(fr.left, fr.top, panel.w / fr.scale, panel.h / fr.scale, f);
}