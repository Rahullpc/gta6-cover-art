// framing.js — the face-safe crop kernel (v5; the geometry is unchanged from
// v3/v4, only the surrounding prose is new).
//
// One rule governs every panel: a head is either fully on screen or fully off
// it — a half-sliced face is never a legal result. The kernel knows where each
// head lives (measured focus boxes for the bundled samples, a skin-tone guess
// for uploads) and shapes the visible window around it:
//
//   * ordinary panels take a cover crop whose pan travel is limited to the span
//     that keeps the whole head visible, easing zoom down when a panel is too
//     tight to hold it;
//   * panels too extreme for any cover crop drop to a blurred stretched plate
//     with a sharp copy scaled so the entire head fits with breathing room;
//   * detail panels aim at the car / street / sky instead of the head, and a
//     guard nudges the window clear of the face (or holds it whole, or hands
//     back to the face-safe crop) so "absent" never decays into "cut".
//
// The math is pure image-pixel geometry; the renderer draws the returned frame
// and the editor inverts it for dragging, keeping preview, drag and export in
// sync. Every numeric expression below is identical to v4, so every frame —
// and therefore every pixel of every photo — is unchanged in v5.

export function clamp(value, lo, hi) {
  return Math.min(hi, Math.max(lo, value));
}

// Measured head boxes for the four bundled samples, in photo fractions.
// x,y mark the box CENTRE; w,h its extent. Each hugs the real head (hair/hat
// crown down to chin) so large panels can stay full-bleed instead of blurring.
//   boulevard.jpg (544x720):   crown ~0.09, chin ~0.38, centre x ~0.62
//   pier.jpg      (720x720):   hat crown ~0.02, beard ~0.38, centre x ~0.40
//   porsche.jpg   (2048x1117): small head, crown ~0.115, chin ~0.24, x ~0.55
//   summer.jpg    (2048x1117): wide afro, crown ~0.04, chin ~0.30, x ~0.66
const FOCUS_ROWS = [
  ['boulevard', 0.62, 0.235, 0.36, 0.3],
  ['pier', 0.4, 0.2, 0.42, 0.38],
  ['porsche', 0.55, 0.18, 0.1, 0.15],
  ['summer', 0.66, 0.17, 0.22, 0.28],
];
export const SAMPLE_FOCUS = Object.fromEntries(
  FOCUS_ROWS.map(([name, x, y, w, h]) => [name, { x, y, w, h }]),
);

// A head assumed to sit in the upper centre when nothing better is known.
const FALLBACK_FOCUS = { x: 0.5, y: 0.24, w: 0.46, h: 0.38 };

// Classic RGB skin heuristic used by the upload head finder.
function looksLikeSkin(r, g, b) {
  if (r <= 60 || g <= 30 || b <= 15) return false;
  if (r <= g || r <= b || r - g <= 10) return false;
  const hi = Math.max(r, g, b);
  const lo = Math.min(r, g, b);
  return hi - lo > 12 && r < 250;
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
    let mass = 0, mx = 0, my = 0, mxx = 0, myy = 0;
    let row = 0;
    while (row < gh) {
      const weight = 1.6 - row / gh; // faces live higher than hands
      let col = 0;
      while (col < gw) {
        const o = (row * gw + col) * 4;
        if (looksLikeSkin(px[o], px[o + 1], px[o + 2])) {
          mass += weight;
          mx += weight * col;
          my += weight * row;
          mxx += weight * col * col;
          myy += weight * row * row;
        }
        col += 1;
      }
      row += 1;
    }
    const cells = gw * gh;
    if (mass < cells * 0.02 || mass > cells * 0.6) return null;
    const cx = mx / mass / gw;
    const cy = my / mass / gh;
    const varX = Math.max(0.0004, mxx / mass / gw / gw - cx * cx);
    const varY = Math.max(0.0004, myy / mass / gh / gh - cy * cy);
    const box = { x: cx, y: cy, w: Math.sqrt(varX) * 4.2, h: Math.sqrt(varY) * 4.6 };
    box.x = clamp(box.x, 0.2, 0.8);
    box.y = clamp(box.y, 0.12, 0.5);
    box.w = clamp(box.w, 0.24, 0.7);
    box.h = clamp(box.h, 0.26, 0.66);
    return box;
  } catch {
    return null;
  }
}

// Strip a samples/ prefix and extension to recover a sample's key.
function sampleKey(name) {
  const raw = String(name || '');
  const unprefixed = raw.replace(/^samples\//, '');
  return unprefixed.replace(/\.[a-z]+$/i, '');
}

/** Resolve the focus box of a photo entry ({ img, name, focus? }). */
export function focusOf(photo) {
  if (!photo.focus) {
    const known = SAMPLE_FOCUS[sampleKey(photo.name)];
    photo.focus = known ?? detectFocus(photo.img) ?? FALLBACK_FOCUS;
  }
  return photo.focus;
}

// Headroom around the focus box as a share of the box itself. Kept modest so
// big panels stay full-bleed and busy rather than dropping into blur.
const PAD_TOP = 0.1;
const PAD_SIDE = 0.08;
const PAD_BOTTOM = 0.05;

// Pad one axis of the head box, clamped to the photo. A head flush against an
// edge has no pixels beyond it, so padding must not invent area outside the
// frame — that would make "whole" unreachable and falsely report cut.
function padSpan(center, extent, loPad, hiPad, limit) {
  const half = extent / 2;
  const lo = clamp(center - half - extent * loPad, 0, limit);
  const hi = clamp(center + half + extent * hiPad, 0, limit);
  return [lo, hi];
}

// The padded head rectangle in image pixels.
function headRect(img, focus) {
  const dims = [img.naturalWidth, img.naturalHeight];
  const centre = [focus.x * dims[0], focus.y * dims[1]];
  const extent = [focus.w * dims[0], focus.h * dims[1]];
  const [x0, x1] = padSpan(centre[0], extent[0], PAD_SIDE, PAD_SIDE, dims[0]);
  const [y0, y1] = padSpan(centre[1], extent[1], PAD_TOP, PAD_BOTTOM, dims[1]);
  return { x0, x1, y0, y1, w: x1 - x0, h: y1 - y0, cx: centre[0], cy: centre[1] };
}

// Where the head sits in a panel: upper third, leaving the lower two-thirds for
// scene action (skyline, car, crowd, sea) clear of the face.
function anchorFor(panel) {
  const ay = panel.hero ? 0.34 : 0.32;
  return { ax: 0.5, ay };
}

// Sub-pixel slack so an edge-flush head is not called "cut" by float drift while
// the zoom eases to fit.
const EPS = 0.5;

function spansOverlap(lo, hi, a0, a1) {
  return lo < a1 - EPS && hi > a0 + EPS;
}

function spansContain(lo, hi, a0, a1) {
  return lo <= a0 + EPS && hi >= a1 - EPS;
}

// Classify a window against the head rectangle: 'whole' | 'absent' | 'cut'.
function classify(left, top, winW, winH, head) {
  const right = left + winW;
  const bottom = top + winH;
  const xHit = spansOverlap(left, right, head.x0, head.x1);
  const yHit = spansOverlap(top, bottom, head.y0, head.y1);
  if (!xHit || !yHit) return 'absent';
  const xIn = spansContain(left, right, head.x0, head.x1);
  const yIn = spansContain(top, bottom, head.y0, head.y1);
  return xIn && yIn ? 'whole' : 'cut';
}

// One axis of the pan-span algebra: legal bounds, the head-centred base origin
// and the +/- travel for pan in [-1, 1].
function axisSpan(lo, hi, centre, anchor, win) {
  const min = Math.min(lo, hi);
  const max = Math.max(lo, hi);
  return { min, max, base: clamp(centre - anchor * win, min, max), range: (max - min) / 2 };
}

// Shared pan-span algebra. The cover crop feeds bounds clamped to the image;
// the blur plate feeds raw bounds (its window may exceed the photo, so negative
// origins are legal). Keeping the clamp at the call site preserves the two
// modes' distinct behaviour — do not unify them.
function panSpan(loX, hiX, loY, hiY, head, winW, winH, ax, ay) {
  const sx = axisSpan(loX, hiX, head.cx, ax, winW);
  const sy = axisSpan(loY, hiY, head.cy, ay, winH);
  return {
    minX: sx.min, maxX: sx.max, minY: sy.min, maxY: sy.max,
    baseLeft: sx.base, baseTop: sy.base,
    rangeX: sx.range, rangeY: sy.range,
  };
}

// Pan bounds that keep the whole head inside a window of the given size, clamped
// to the image so the cover crop never exposes transparency.
function boundPair(loEdge, hiEdge, win, imgSpan) {
  const travel = Math.max(0, imgSpan - win);
  return [clamp(hiEdge - win, 0, travel), clamp(loEdge, 0, travel)];
}

function guardedPan(head, winW, winH, iw, ih, ax, ay) {
  const bx = boundPair(head.x0, head.x1, winW, iw);
  const by = boundPair(head.y0, head.y1, winH, ih);
  return panSpan(bx[0], bx[1], by[0], by[1], head, winW, winH, ax, ay);
}

// Pan bounds for the blur plate: NOT clamped to the image, because the sharp
// copy is smaller than the panel and the window can legally run past the photo.
function freePan(head, winW, winH, ax, ay) {
  const loX = head.x1 - winW;
  const loY = head.y1 - winH;
  return panSpan(loX, head.x0, loY, head.y0, head, winW, winH, ax, ay);
}

// Resolve a pan edit into a concrete window origin within a span.
function placeWindow(pan, panX, panY) {
  const left = clamp(pan.baseLeft + panX * pan.rangeX, pan.minX, pan.maxX);
  const top = clamp(pan.baseTop + panY * pan.rangeY, pan.minY, pan.maxY);
  return { left, top };
}

function readEdit(edit) {
  const z = clamp(edit.zoom ?? 1, 1, 4);
  const px = clamp(edit.panX ?? 0, -1, 1);
  const py = clamp(edit.panY ?? 0, -1, 1);
  return { zoom: z, panX: px, panY: py };
}

// Assemble a frame result from its scale, window origin and pan span.
function frameResult(mode, bg, scale, pos, pan) {
  const out = { mode, bg, scale };
  out.left = pos.left;
  out.top = pos.top;
  out.baseLeft = pan.baseLeft;
  out.baseTop = pan.baseTop;
  out.rangeX = pan.rangeX;
  out.rangeY = pan.rangeY;
  return out;
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

function windowAt(panel, scale) {
  return { winW: panel.w / scale, winH: panel.h / scale };
}

// Face-safe cover crop: pan clamped to keep the whole head on screen, zoom eased
// down when the panel is too small, blur plate as the last resort.
function guardedCover(img, panel, edit, head) {
  const { ax, ay } = anchorFor(panel);
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const { zoom, panX, panY } = readEdit(edit);
  const coverScale = Math.max(panel.w / iw, panel.h / ih);
  let scale = coverScale * zoom;
  let win = windowAt(panel, scale);
  if (win.winW < head.w || win.winH < head.h) {
    // Requested zoom cannot hold the head: ease to a fit that still covers the
    // panel, or switch to the blur plate when even that fails.
    const fitScale = Math.min(panel.w / head.w, panel.h / head.h);
    if (fitScale < coverScale) {
      return blurBackdrop(head, iw, ih, panel, zoom, panX, panY, ax, ay);
    }
    scale = fitScale;
    win = windowAt(panel, scale);
  }
  const pan = guardedPan(head, win.winW, win.winH, iw, ih, ax, ay);
  return frameResult('cover', false, scale, placeWindow(pan, panX, panY), pan);
}

// Extreme panel shape: a soft stretched copy fills the panel while a sharp copy
// is scaled so the whole head fits with margin. The head's share of the panel
// depends on role and shape — a hero fills the height, a wide non-hero strip
// keeps it near 60% so the lower half stays free for action, tall columns fill
// the width.
function blurBackdrop(head, iw, ih, panel, zoom, panX, panY, ax, ay) {
  const wide = panel.w > panel.h;
  const fitW = panel.w / head.w, fitH = panel.h / head.h;
  const heightShare = panel.hero ? 0.94 : 0.6;
  const tallFit = Math.min(fitW, fitH * heightShare);
  const base = wide ? tallFit : Math.min(fitW * 0.9, fitH);
  const cap = wide ? tallFit : Math.min(fitW, fitH);
  const scale = Math.min(base * zoom, cap);
  const winW = panel.w / scale, winH = panel.h / scale;
  const pan = freePan(head, winW, winH, ax, ay);
  return frameResult('blur', true, scale, placeWindow(pan, panX, panY), pan);
}

// Where a detail aim places the window origin along one axis.
function aimOrigin(aim, imgSpan, win, hi) {
  return clamp((aim ?? 0.5) * imgSpan - win / 2, 0, hi);
}

// The four escape moves for a detail window that landed on the face, in
// priority order: head out to the left, right, above, below.
function escapeCandidates(left, top, winW, winH, head, hiX, hiY) {
  const moves = [
    ['x', clamp(head.x1, 0, hiX)],
    ['x', clamp(head.x0 - winW, 0, hiX)],
    ['y', clamp(head.y1, 0, hiY)],
    ['y', clamp(head.y0 - winH, 0, hiY)],
  ];
  return moves.map(([axis, value]) =>
    axis === 'x' ? { left: value, top } : { left, top: value });
}

// Detail panel: aim away from the head, then guard the window so the face ends
// whole or absent. If the aim lands on the face, slide clear along the axis
// needing the least travel; if clearing is impossible but the head fits, hold it
// whole; otherwise defer to the face-safe cover crop. A clipped face never wins.
function awayFrame(img, panel, edit, head) {
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const { zoom, panX, panY } = readEdit(edit);
  const scale = Math.max(panel.w / iw, panel.h / ih) * zoom;
  const winW = panel.w / scale, winH = panel.h / scale;
  const hiX = Math.max(0, iw - winW), hiY = Math.max(0, ih - winH);
  const rangeX = hiX / 2, rangeY = hiY / 2;
  const baseLeft = aimOrigin(edit.aimX, iw, winW, hiX);
  const baseTop = aimOrigin(edit.aimY, ih, winH, hiY);
  let left = clamp(baseLeft + panX * rangeX, 0, hiX);
  let top = clamp(baseTop + panY * rangeY, 0, hiY);

  if (classify(left, top, winW, winH, head) === 'cut') {
    let nearest = null;
    for (const cand of escapeCandidates(left, top, winW, winH, head, hiX, hiY)) {
      if (classify(cand.left, cand.top, winW, winH, head) !== 'absent') continue;
      const travel = Math.abs(cand.left - left) + Math.abs(cand.top - top);
      if (nearest === null || travel < nearest.travel) {
        nearest = { left: cand.left, top: cand.top, travel };
      }
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
  const out = { mode: 'cover', bg: false, scale, left, top };
  return Object.assign(out, { baseLeft, baseTop, rangeX, rangeY });
}

// One axis of the drag inversion: pointer travel (image pixels) -> pan [-1,1].
function panAxis(pos, delta, base, range) {
  const safe = Math.max(range, 1e-6);
  return clamp((pos + delta - base) / safe, -1, 1);
}

/**
 * Convert a pointer drag (already in image pixels) into a new pan for the current
 * frame, so dragging recomposes a panel without ever shoving a face out of frame.
 */
export function panFromDelta(frame, dxImg, dyImg) {
  return {
    panX: panAxis(frame.left, dxImg, frame.baseLeft, frame.rangeX),
    panY: panAxis(frame.top, dyImg, frame.baseTop, frame.rangeY),
  };
}

/**
 * Self-check helper: does a frame's visible window clip the focus box?
 * Returns 'whole' | 'absent' | 'cut' — used by the automated framing test.
 */
export function faceStatus(img, panel, edit, focus) {
  const frame = computeFrame(img, panel, edit, focus);
  const winW = panel.w / frame.scale;
  const winH = panel.h / frame.scale;
  return classify(frame.left, frame.top, winW, winH, headRect(img, focus));
}