// framing.js — v2's face-safe cropping engine.
//
// The v1 renderer blind-filled each panel and let arbitrary pans slice heads
// at the edges (both shipped samples keep their faces in the upper third).
// v2 replaces that with a small geometry kernel that knows where each head
// lives and guarantees one invariant for every panel: the face is either
// COMPLETELY inside the visible window or COMPLETELY outside it. A half-cut
// head is never an allowed outcome.
//
// How the invariant is kept:
//   * every photo carries a focus box (crown-to-chin plus a little headroom);
//     the samples have measured boxes, uploads get a fast skin-tone estimate;
//   * normal panels use a cover crop whose pan range is clamped to the span
//     that keeps the whole box on screen, and the zoom eases itself down when
//     a panel is too tight to hold the head;
//   * panels too extreme for any cover crop fall back to a blurred stretched
//     backdrop with a sharp copy sized so the entire head fits with margin;
//   * detail panels (car / street / sky moments) aim away from the head, and a
//     guard slides the window clear of the face — or contains it whole, or
//     defers to the face-safe crop — so "absent" never degrades into "cut".
//
// Everything here is pure math on image pixels. The renderer consumes the
// returned frame and the editor inverts it for dragging, which is what makes
// preview, drag and export agree with each other.

export const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));

// Head boxes measured on the two bundled samples, in photo fractions. They
// hug the actual head (hair or hat crown down to the chin) so big panels can
// still use a full-bleed cover crop instead of dropping into blur-fill.
//   boulevard.jpg (544x720): crown ~0.09, chin ~0.38, face centre x ~0.62
//   pier.jpg      (720x720): hat crown ~0.02, beard ~0.38, face centre x ~0.40
export const SAMPLE_FOCUS = {
  boulevard: { x: 0.62, y: 0.235, w: 0.36, h: 0.3 },
  pier: { x: 0.4, y: 0.2, w: 0.42, h: 0.38 },
};

// Unknown portrait: assume a head sitting in the upper centre of the frame.
const FALLBACK_FOCUS = { x: 0.5, y: 0.24, w: 0.46, h: 0.38 };

/**
 * Cheap skin-tone head finder for uploads. Shrink the photo to a 48px-wide
 * grid, score each pixel with a classic RGB skin heuristic, weight the top of
 * the frame heavier (a face beats a hand), then derive a weighted centroid and
 * spread. Returns null when the skin signal is too weak or too dominant to
 * trust, letting the caller use the fallback box instead.
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
    let mass = 0;
    let mx = 0;
    let my = 0;
    let mxx = 0;
    let myy = 0;
    for (let row = 0; row < gh; row++) {
      for (let col = 0; col < gw; col++) {
        const o = (row * gw + col) * 4;
        const r = px[o];
        const g = px[o + 1];
        const b = px[o + 2];
        const hi = Math.max(r, g, b);
        const lo = Math.min(r, g, b);
        const looksLikeSkin =
          r > 60 && g > 30 && b > 15 && r > g && r > b && r - g > 10 && hi - lo > 12 && r < 250;
        if (!looksLikeSkin) continue;
        const weight = 1.6 - row / gh; // faces live higher than hands
        mass += weight;
        mx += weight * col;
        my += weight * row;
        mxx += weight * col * col;
        myy += weight * row * row;
      }
    }
    const cells = gw * gh;
    if (mass < cells * 0.02 || mass > cells * 0.6) return null;
    const cx = mx / mass / gw;
    const cy = my / mass / gh;
    const varX = Math.max(0.0004, mxx / mass / gw / gw - cx * cx);
    const varY = Math.max(0.0004, myy / mass / gh / gh - cy * cy);
    const boxW = clamp(Math.sqrt(varX) * 4.2, 0.24, 0.7);
    const boxH = clamp(Math.sqrt(varY) * 4.6, 0.26, 0.66);
    return { x: clamp(cx, 0.2, 0.8), y: clamp(cy, 0.12, 0.5), w: boxW, h: boxH };
  } catch {
    return null;
  }
}

/** Resolve the focus box of a photo entry ({ img, name, focus? }). */
export function focusOf(photo) {
  if (photo.focus) return photo.focus;
  const key = String(photo.name || '').replace(/^samples\//, '').replace(/\.[a-z]+$/i, '');
  if (SAMPLE_FOCUS[key]) return SAMPLE_FOCUS[key];
  const guessed = detectFocus(photo.img);
  photo.focus = guessed || FALLBACK_FOCUS;
  return photo.focus;
}

// Headroom around the focus box, expressed as a share of the box itself.
// Deliberately modest: large panels should stay full-bleed and busy, not blur.
const PAD_TOP = 0.1;
const PAD_SIDE = 0.08;
const PAD_BOTTOM = 0.05;

// The padded head rectangle in image pixels, clamped to the photo. A head
// flush against the top edge has no pixels above it, so the padding must not
// invent area outside the frame — that would make "whole" unreachable and
// wrongly report a cut.
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

// Where the head should sit inside a panel: upper third, so the scene action
// (skyline, car, crowd, sea) owns the lower two-thirds clear of the face.
const anchorFor = (panel) => ({ ax: 0.5, ay: panel.hero ? 0.34 : 0.32 });

// Sub-pixel slack so a head flush against an image edge is not called "cut"
// by floating-point drift while the zoom is being eased to fit.
const EPS = 0.5;

// Classify a window against the head rectangle: 'whole' | 'absent' | 'cut'.
function classify(left, top, winW, winH, head) {
  const touchesX = left < head.x1 - EPS && left + winW > head.x0 + EPS;
  const touchesY = top < head.y1 - EPS && top + winH > head.y0 + EPS;
  if (!touchesX || !touchesY) return 'absent';
  const holdsX = left <= head.x0 + EPS && left + winW >= head.x1 - EPS;
  const holdsY = top <= head.y0 + EPS && top + winH >= head.y1 - EPS;
  return holdsX && holdsY ? 'whole' : 'cut';
}

// Pan range that keeps the whole head inside a window of the given size.
// Returns the clamped base position plus the +/- travel for pan in [-1, 1].
function guardedPan(head, winW, winH, iw, ih, ax, ay) {
  const loX = clamp(head.x1 - winW, 0, Math.max(0, iw - winW));
  const hiX = clamp(head.x0, 0, Math.max(0, iw - winW));
  const loY = clamp(head.y1 - winH, 0, Math.max(0, ih - winH));
  const hiY = clamp(head.y0, 0, Math.max(0, ih - winH));
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

/**
 * Decide how a photo is drawn into a panel.
 * edit = { zoom, panX, panY, detail?, aimX?, aimY? }.
 * Result: { mode, bg, scale, left, top, baseLeft, baseTop, rangeX, rangeY } —
 * left/top are the sharp layer's window origin in image pixels, scale converts
 * image pixels to panel pixels, and pan [-1,1] travels base +/- range.
 */
export function computeFrame(img, panel, edit, focus) {
  const head = headRect(img, focus);
  if (edit.detail) return awayFrame(img, panel, edit, head);
  return guardedCover(img, panel, edit, head);
}

// Face-safe cover crop: pan is clamped so the whole head stays on screen; the
// zoom eases down when the panel is too small; blur-fill is the last resort.
function guardedCover(img, panel, edit, head) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const pw = panel.w;
  const ph = panel.h;
  const zoom = clamp(edit.zoom ?? 1, 1, 4);
  const panX = clamp(edit.panX ?? 0, -1, 1);
  const panY = clamp(edit.panY ?? 0, -1, 1);
  const { ax, ay } = anchorFor(panel);

  const coverScale = Math.max(pw / iw, ph / ih);
  let scale = coverScale * zoom;
  let winW = pw / scale;
  let winH = ph / scale;

  if (winW < head.w || winH < head.h) {
    // The requested zoom cannot hold the head. Try easing down to a fit that
    // still covers the panel; if even that fails, switch to the blur backdrop.
    const fitScale = Math.min(pw / head.w, ph / head.h);
    if (fitScale >= coverScale) {
      scale = fitScale;
      winW = pw / scale;
      winH = ph / scale;
    } else {
      return blurBackdrop(head, iw, ih, panel, zoom, panX, panY, ax, ay);
    }
  }

  const pan = guardedPan(head, winW, winH, iw, ih, ax, ay);
  const left = clamp(pan.baseLeft + panX * pan.rangeX, pan.minX, pan.maxX);
  const top = clamp(pan.baseTop + panY * pan.rangeY, pan.minY, pan.maxY);
  return {
    mode: 'cover',
    bg: false,
    scale,
    left,
    top,
    baseLeft: pan.baseLeft,
    baseTop: pan.baseTop,
    rangeX: pan.rangeX,
    rangeY: pan.rangeY,
  };
}

// Pan range for the blur backdrop. Unlike the cover crop, the window here can
// be LARGER than the photo (the sharp copy is smaller than the panel), so the
// range is NOT clamped to image bounds — negative origins are legal and let the
// head sit where the anchor wants while the blurred copy fills the rest.
function freePan(head, winW, winH, ax, ay) {
  const loX = head.x1 - winW;
  const hiX = head.x0;
  const loY = head.y1 - winH;
  const hiY = head.y0;
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

// Extreme panel shape: a soft stretched copy fills the panel while a sharp
// copy is scaled so the entire head fits with margin. The head's share of the
// panel depends on role and shape — a hero fills the height (big, dominant),
// a wide non-hero strip keeps it near 60% so the lower half stays free for
// scene action, and tall columns let it fill the width.
function blurBackdrop(head, iw, ih, panel, zoom, panX, panY, ax, ay) {
  const pw = panel.w;
  const ph = panel.h;
  const fitW = pw / head.w;
  const fitH = ph / head.h;
  const wide = pw > ph;
  const heightShare = panel.hero ? 0.94 : 0.6;
  const base = wide ? Math.min(fitW, fitH * heightShare) : Math.min(fitW * 0.9, fitH);
  const cap = wide ? Math.min(fitW, fitH * heightShare) : Math.min(fitW, fitH);
  const scale = Math.min(base * zoom, cap);
  const winW = pw / scale;
  const winH = ph / scale;

  const pan = freePan(head, winW, winH, ax, ay);
  const left = clamp(pan.baseLeft + panX * pan.rangeX, pan.minX, pan.maxX);
  const top = clamp(pan.baseTop + panY * pan.rangeY, pan.minY, pan.maxY);
  return {
    mode: 'blur',
    bg: true,
    scale,
    left,
    top,
    baseLeft: pan.baseLeft,
    baseTop: pan.baseTop,
    rangeX: pan.rangeX,
    rangeY: pan.rangeY,
  };
}

// Detail panel: aim at a point away from the head, then guard the window so
// the face ends up whole or absent. If the aim lands on the face, slide the
// window clear along whichever axis needs the least travel; if clearing is
// impossible but the head fits, contain it whole; otherwise defer to the
// face-safe cover crop. A clipped face is never the outcome.
function awayFrame(img, panel, edit, head) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const pw = panel.w;
  const ph = panel.h;
  const zoom = clamp(edit.zoom ?? 1, 1, 4);
  const panX = clamp(edit.panX ?? 0, -1, 1);
  const panY = clamp(edit.panY ?? 0, -1, 1);
  const scale = Math.max(pw / iw, ph / ih) * zoom;
  const winW = pw / scale;
  const winH = ph / scale;
  const aimX = (edit.aimX ?? 0.5) * iw;
  const aimY = (edit.aimY ?? 0.5) * ih;
  const hiX = Math.max(0, iw - winW);
  const hiY = Math.max(0, ih - winH);
  const baseLeft = clamp(aimX - winW / 2, 0, hiX);
  const baseTop = clamp(aimY - winH / 2, 0, hiY);
  const rangeX = hiX / 2;
  const rangeY = hiY / 2;
  let left = clamp(baseLeft + panX * rangeX, 0, hiX);
  let top = clamp(baseTop + panY * rangeY, 0, hiY);

  if (classify(left, top, winW, winH, head) === 'cut') {
    const escapes = [
      { left: clamp(head.x1, 0, hiX), top }, // push the head out to the left
      { left: clamp(head.x0 - winW, 0, hiX), top }, // push it out to the right
      { left, top: clamp(head.y1, 0, hiY) }, // push it out above
      { left, top: clamp(head.y0 - winH, 0, hiY) }, // push it out below
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
 * Convert a pointer drag (already in image pixels) into a new pan for the
 * current frame. The editor uses this so dragging recomposes a panel without
 * ever being able to shove a face out of frame.
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
