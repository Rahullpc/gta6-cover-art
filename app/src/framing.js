// framing.js — the face-safe crop kernel (v3).
//
// Every panel obeys one rule: a head is either fully on screen or fully off it.
// A half-sliced face is never a legal result. The kernel knows where each head
// lives (a measured focus box per bundled sample, a skin-tone guess for uploads)
// and shapes the visible window around it:
//
//   * ordinary panels take a cover crop whose pan travel is limited to the span
//     that keeps the whole head visible, easing the zoom down when a panel is
//     too tight to hold it;
//   * panels too extreme for any cover crop drop to a blurred stretched plate
//     with a sharp copy scaled so the entire head fits with breathing room;
//   * detail panels aim at the car / street / sky instead of the head, and a
//     guard nudges the window clear of the face (or holds it whole, or hands
//     back to the face-safe crop) so "absent" never decays into "cut".
//
// v3 adds measured boxes for the two new samples (porsche, summer). The math is
// pure image-pixel geometry; the renderer draws the returned frame and the
// editor inverts it for dragging, which keeps preview, drag and export in sync.

export const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));

// Measured head boxes for the four bundled samples, in photo fractions.
// x,y mark the box CENTRE; w,h its extent. Each hugs the real head (hair/hat
// crown down to chin) so large panels can stay full-bleed instead of blurring.
//   boulevard.jpg (544x720):   crown ~0.09, chin ~0.38, centre x ~0.62
//   pier.jpg      (720x720):   hat crown ~0.02, beard ~0.38, centre x ~0.40
//   porsche.jpg   (2048x1117): small head, crown ~0.115, chin ~0.24, x ~0.55
//   summer.jpg    (2048x1117): wide afro, crown ~0.04, chin ~0.30, x ~0.66
export const SAMPLE_FOCUS = {
  boulevard: { x: 0.62, y: 0.235, w: 0.36, h: 0.3 },
  pier: { x: 0.4, y: 0.2, w: 0.42, h: 0.38 },
  porsche: { x: 0.55, y: 0.18, w: 0.1, h: 0.15 },
  summer: { x: 0.66, y: 0.17, w: 0.22, h: 0.28 },
};

// A head assumed to sit in the upper centre when nothing better is known.
const FALLBACK_FOCUS = { x: 0.5, y: 0.24, w: 0.46, h: 0.38 };

// Classic RGB skin heuristic used by the upload head finder.
function skinScore(r, g, b) {
  const hi = Math.max(r, g, b);
  const lo = Math.min(r, g, b);
  return r > 60 && g > 30 && b > 15 && r > g && r > b && r - g > 10 && hi - lo > 12 && r < 250;
}

/**
 * Cheap skin-tone head finder for uploads. Downscale to a 48px-wide grid, score
 * every pixel for skin, weight the top of the frame heavier (a face beats a
 * hand), then take a weighted centroid + spread. Returns null when the signal
 * is too weak or too dominant to trust, so the caller falls back to the box.
 */
export function detectFocus(img) {
  try {
    const gw = 48;
    const gh = Math.max(8, Math.round((gw * img.naturalHeight) / img.naturalWidth));
    const probe = document.createElement('canvas');
    probe.width = gw;
    probe.height = gh;
    const g2 = probe.getContext('2d', { willReadFrequently: true });
    g2.drawImage(img, 0, 0, gw, gh);
    const px = g2.getImageData(0, 0, gw, gh).data;
    const acc = { mass: 0, mx: 0, my: 0, mxx: 0, myy: 0 };
    for (let row = 0; row < gh; row++) {
      const weight = 1.6 - row / gh; // faces live higher than hands
      for (let col = 0; col < gw; col++) {
        const o = (row * gw + col) * 4;
        if (!skinScore(px[o], px[o + 1], px[o + 2])) continue;
        acc.mass += weight;
        acc.mx += weight * col;
        acc.my += weight * row;
        acc.mxx += weight * col * col;
        acc.myy += weight * row * row;
      }
    }
    const cells = gw * gh;
    if (acc.mass < cells * 0.02 || acc.mass > cells * 0.6) return null;
    const cx = acc.mx / acc.mass / gw;
    const cy = acc.my / acc.mass / gh;
    const varX = Math.max(0.0004, acc.mxx / acc.mass / gw / gw - cx * cx);
    const varY = Math.max(0.0004, acc.myy / acc.mass / gh / gh - cy * cy);
    return {
      x: clamp(cx, 0.2, 0.8),
      y: clamp(cy, 0.12, 0.5),
      w: clamp(Math.sqrt(varX) * 4.2, 0.24, 0.7),
      h: clamp(Math.sqrt(varY) * 4.6, 0.26, 0.66),
    };
  } catch {
    return null;
  }
}

// Strip a samples/ prefix and extension to recover a sample's key.
const sampleKey = (name) => String(name || '').replace(/^samples\//, '').replace(/\.[a-z]+$/i, '');

/** Resolve the focus box of a photo entry ({ img, name, focus? }). */
export function focusOf(photo) {
  if (photo.focus) return photo.focus;
  const known = SAMPLE_FOCUS[sampleKey(photo.name)];
  if (known) return known;
  photo.focus = detectFocus(photo.img) || FALLBACK_FOCUS;
  return photo.focus;
}

// Headroom around the focus box as a share of the box itself. Kept modest so
// big panels stay full-bleed and busy rather than dropping into blur.
const PAD_TOP = 0.1;
const PAD_SIDE = 0.08;
const PAD_BOTTOM = 0.05;

// The padded head rectangle in image pixels, clamped to the photo. A head flush
// against an edge has no pixels beyond it, so padding must not invent area
// outside the frame — that would make "whole" unreachable and falsely report cut.
function headRect(img, focus) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const bw = focus.w * iw;
  const bh = focus.h * ih;
  const cx = focus.x * iw;
  const cy = focus.y * ih;
  const x0 = clamp(cx - bw / 2 - bw * PAD_SIDE, 0, iw);
  const x1 = clamp(cx + bw / 2 + bw * PAD_SIDE, 0, iw);
  const y0 = clamp(cy - bh / 2 - bh * PAD_TOP, 0, ih);
  const y1 = clamp(cy + bh / 2 + bh * PAD_BOTTOM, 0, ih);
  return { x0, x1, y0, y1, w: x1 - x0, h: y1 - y0, cx, cy };
}

// Where the head sits in a panel: upper third, leaving the lower two-thirds for
// scene action (skyline, car, crowd, sea) clear of the face.
const anchorFor = (panel) => ({ ax: 0.5, ay: panel.hero ? 0.34 : 0.32 });

// Sub-pixel slack so an edge-flush head is not called "cut" by float drift while
// the zoom eases to fit.
const EPS = 0.5;

const overlaps = (lo, hi, a0, a1) => lo < a1 - EPS && hi > a0 + EPS;
const contains = (lo, hi, a0, a1) => lo <= a0 + EPS && hi >= a1 - EPS;

// Classify a window against the head rectangle: 'whole' | 'absent' | 'cut'.
function classify(left, top, winW, winH, head) {
  const right = left + winW;
  const bottom = top + winH;
  if (!overlaps(left, right, head.x0, head.x1) || !overlaps(top, bottom, head.y0, head.y1)) {
    return 'absent';
  }
  return contains(left, right, head.x0, head.x1) && contains(top, bottom, head.y0, head.y1)
    ? 'whole'
    : 'cut';
}

// Shared pan-span algebra: given the legal left/top bounds, centre the head on
// the anchor and report the +/- travel for pan in [-1, 1]. The cover crop feeds
// this bounds clamped to the image; the blur plate feeds raw bounds (its window
// may exceed the photo, so negative origins are legal). Keeping the clamp at the
// call site is what preserves the two modes' distinct behaviour.
function panSpan(loX, hiX, loY, hiY, head, winW, winH, ax, ay) {
  const minX = Math.min(loX, hiX);
  const maxX = Math.max(loX, hiX);
  const minY = Math.min(loY, hiY);
  const maxY = Math.max(loY, hiY);
  return {
    minX,
    maxX,
    minY,
    maxY,
    baseLeft: clamp(head.cx - ax * winW, minX, maxX),
    baseTop: clamp(head.cy - ay * winH, minY, maxY),
    rangeX: (maxX - minX) / 2,
    rangeY: (maxY - minY) / 2,
  };
}

// Pan bounds that keep the whole head inside a window of the given size, clamped
// to the image so the cover crop never exposes transparency.
function guardedPan(head, winW, winH, iw, ih, ax, ay) {
  const spanX = Math.max(0, iw - winW);
  const spanY = Math.max(0, ih - winH);
  return panSpan(
    clamp(head.x1 - winW, 0, spanX),
    clamp(head.x0, 0, spanX),
    clamp(head.y1 - winH, 0, spanY),
    clamp(head.y0, 0, spanY),
    head, winW, winH, ax, ay,
  );
}

// Pan bounds for the blur plate: NOT clamped to the image, because the sharp
// copy is smaller than the panel and the window can legally run past the photo.
function freePan(head, winW, winH, ax, ay) {
  return panSpan(head.x1 - winW, head.x0, head.y1 - winH, head.y0, head, winW, winH, ax, ay);
}

// Resolve a pan edit into a concrete window origin within a span.
const placeWindow = (pan, panX, panY) => ({
  left: clamp(pan.baseLeft + panX * pan.rangeX, pan.minX, pan.maxX),
  top: clamp(pan.baseTop + panY * pan.rangeY, pan.minY, pan.maxY),
});

const readEdit = (edit) => ({
  zoom: clamp(edit.zoom ?? 1, 1, 4),
  panX: clamp(edit.panX ?? 0, -1, 1),
  panY: clamp(edit.panY ?? 0, -1, 1),
});

/**
 * Decide how a photo is drawn into a panel.
 * edit = { zoom, panX, panY, detail?, aimX?, aimY? }.
 * Result: { mode, bg, scale, left, top, baseLeft, baseTop, rangeX, rangeY } —
 * left/top are the sharp layer's window origin in image pixels, scale converts
 * image pixels to panel pixels, and pan [-1,1] travels base +/- range.
 */
export function computeFrame(img, panel, edit, focus) {
  const head = headRect(img, focus);
  return edit.detail ? awayFrame(img, panel, edit, head) : guardedCover(img, panel, edit, head);
}

// Face-safe cover crop: pan clamped to keep the whole head on screen, zoom eased
// down when the panel is too small, blur plate as the last resort.
function guardedCover(img, panel, edit, head) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const { zoom, panX, panY } = readEdit(edit);
  const { ax, ay } = anchorFor(panel);
  const coverScale = Math.max(panel.w / iw, panel.h / ih);
  let scale = coverScale * zoom;
  let winW = panel.w / scale;
  let winH = panel.h / scale;

  if (winW < head.w || winH < head.h) {
    // Requested zoom cannot hold the head: ease to a fit that still covers the
    // panel, or switch to the blur plate when even that fails.
    const fitScale = Math.min(panel.w / head.w, panel.h / head.h);
    if (fitScale < coverScale) {
      return blurBackdrop(head, iw, ih, panel, zoom, panX, panY, ax, ay);
    }
    scale = fitScale;
    winW = panel.w / scale;
    winH = panel.h / scale;
  }

  const pan = guardedPan(head, winW, winH, iw, ih, ax, ay);
  const { left, top } = placeWindow(pan, panX, panY);
  return { mode: 'cover', bg: false, scale, left, top, baseLeft: pan.baseLeft, baseTop: pan.baseTop, rangeX: pan.rangeX, rangeY: pan.rangeY };
}

// Extreme panel shape: a soft stretched copy fills the panel while a sharp copy
// is scaled so the whole head fits with margin. The head's share of the panel
// depends on role and shape — a hero fills the height, a wide non-hero strip
// keeps it near 60% so the lower half stays free for action, tall columns fill
// the width.
function blurBackdrop(head, iw, ih, panel, zoom, panX, panY, ax, ay) {
  const fitW = panel.w / head.w;
  const fitH = panel.h / head.h;
  const wide = panel.w > panel.h;
  const heightShare = panel.hero ? 0.94 : 0.6;
  const base = wide ? Math.min(fitW, fitH * heightShare) : Math.min(fitW * 0.9, fitH);
  const cap = wide ? Math.min(fitW, fitH * heightShare) : Math.min(fitW, fitH);
  const scale = Math.min(base * zoom, cap);
  const winW = panel.w / scale;
  const winH = panel.h / scale;
  const pan = freePan(head, winW, winH, ax, ay);
  const { left, top } = placeWindow(pan, panX, panY);
  return { mode: 'blur', bg: true, scale, left, top, baseLeft: pan.baseLeft, baseTop: pan.baseTop, rangeX: pan.rangeX, rangeY: pan.rangeY };
}

// Detail panel: aim away from the head, then guard the window so the face ends
// whole or absent. If the aim lands on the face, slide clear along the axis
// needing the least travel; if clearing is impossible but the head fits, hold it
// whole; otherwise defer to the face-safe cover crop. A clipped face never wins.
function awayFrame(img, panel, edit, head) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const { zoom, panX, panY } = readEdit(edit);
  const scale = Math.max(panel.w / iw, panel.h / ih) * zoom;
  const winW = panel.w / scale;
  const winH = panel.h / scale;
  const hiX = Math.max(0, iw - winW);
  const hiY = Math.max(0, ih - winH);
  const baseLeft = clamp((edit.aimX ?? 0.5) * iw - winW / 2, 0, hiX);
  const baseTop = clamp((edit.aimY ?? 0.5) * ih - winH / 2, 0, hiY);
  const rangeX = hiX / 2;
  const rangeY = hiY / 2;
  let left = clamp(baseLeft + panX * rangeX, 0, hiX);
  let top = clamp(baseTop + panY * rangeY, 0, hiY);

  if (classify(left, top, winW, winH, head) === 'cut') {
    const escapes = [
      { left: clamp(head.x1, 0, hiX), top }, // head out to the left
      { left: clamp(head.x0 - winW, 0, hiX), top }, // head out to the right
      { left, top: clamp(head.y1, 0, hiY) }, // head out above
      { left, top: clamp(head.y0 - winH, 0, hiY) }, // head out below
    ];
    let nearest = null;
    for (const cand of escapes) {
      if (classify(cand.left, cand.top, winW, winH, head) !== 'absent') continue;
      const travel = Math.abs(cand.left - left) + Math.abs(cand.top - top);
      if (!nearest || travel < nearest.travel) nearest = { ...cand, travel };
    }
    if (nearest) {
      left = nearest.left;
      top = nearest.top;
    } else if (winW >= head.w && winH >= head.h) {
      left = clamp(head.cx - winW / 2, 0, hiX);
      top = clamp(head.cy - winH / 2, 0, hiY);
    } else {
      return guardedCover(img, panel, { zoom, panX: 0, panY: 0 }, head);
    }
  }
  return { mode: 'cover', bg: false, scale, left, top, baseLeft, baseTop, rangeX, rangeY };
}

/**
 * Convert a pointer drag (already in image pixels) into a new pan for the current
 * frame, so dragging recomposes a panel without ever shoving a face out of frame.
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
 * Self-check helper: does a frame's visible window clip the focus box?
 * Returns 'whole' | 'absent' | 'cut' — used by the automated framing test.
 */
export function faceStatus(img, panel, edit, focus) {
  const frame = computeFrame(img, panel, edit, focus);
  const head = headRect(img, focus);
  return classify(frame.left, frame.top, panel.w / frame.scale, panel.h / frame.scale, head);
}
