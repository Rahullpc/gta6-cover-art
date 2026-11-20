// photos.js — the sample-photo catalogue and the cover-crop solver.
// Face anchors were measured by eye from the four sample photos; they keep
// every face inside its panel whatever the panel's aspect ratio.

// id, file (under app/), natural size, face box as fractions of the photo,
// and the point the crop centres on (usually the face).
export const PHOTOS = {
  summer: {
    id: 'summer',
    src: 'samples/summer.jpg',
    w: 2048,
    h: 1117,
    face: { x0: 0.66, y0: 0.05, x1: 0.86, y1: 0.35 },
    focus: { x: 0.75, y: 0.20 },
  },
  pier: {
    id: 'pier',
    src: 'samples/pier.jpg',
    w: 720,
    h: 720,
    face: { x0: 0.18, y0: 0.10, x1: 0.45, y1: 0.38 },
    focus: { x: 0.30, y: 0.24 },
  },
  porsche: {
    id: 'porsche',
    src: 'samples/porsche.jpg',
    w: 2048,
    h: 1117,
    face: { x0: 0.55, y0: 0.10, x1: 0.68, y1: 0.35 },
    focus: { x: 0.61, y: 0.22 },
  },
  boulevard: {
    id: 'boulevard',
    src: 'samples/boulevard.jpg',
    w: 544,
    h: 720,
    face: { x0: 0.30, y0: 0.07, x1: 0.55, y1: 0.26 },
    focus: { x: 0.42, y: 0.16 },
  },
};

export const PHOTO_ORDER = ['boulevard', 'pier', 'summer', 'porsche'];

// Solve a cover crop: the largest source rect with the target panel's aspect
// ratio, centred on `focus` as far as the photo bounds allow. When
// `keepFace` is true (the default) the rect is nudged so the face box stays
// inside; detail shots (a pool, a sky) pass false and crop purely on focus.
// Returns the source rect in photo pixels.
export function coverCrop(photo, pw, ph, focus = photo.focus, keepFace = true) {
  const want = pw / ph;
  const have = photo.w / photo.h;
  let sw;
  let sh;
  if (have > want) {
    sh = photo.h;
    sw = sh * want;
  } else {
    sw = photo.w;
    sh = sw / want;
  }
  // centre on the focus point, clamped to the photo
  let sx = focus.x * photo.w - sw / 2;
  let sy = focus.y * photo.h - sh / 2;
  sx = Math.max(0, Math.min(photo.w - sw, sx));
  sy = Math.max(0, Math.min(photo.h - sh, sy));
  // nudge so the whole face box is inside the crop (face panels only)
  if (keepFace) {
    const f = photo.face;
    const fx0 = f.x0 * photo.w;
    const fx1 = f.x1 * photo.w;
    const fy0 = f.y0 * photo.h;
    const fy1 = f.y1 * photo.h;
    if (fx0 < sx) sx = Math.max(0, fx0 - sw * 0.02);
    if (fx1 > sx + sw) sx = Math.min(photo.w - sw, fx1 - sw + sw * 0.02);
    if (fy0 < sy) sy = Math.max(0, fy0 - sh * 0.02);
    if (fy1 > sy + sh) sy = Math.min(photo.h - sh, fy1 - sh + sh * 0.02);
  }
  return { sx, sy, sw, sh };
}

// True when the face box lies fully inside the solved crop.
export function faceInside(photo, crop) {
  const f = photo.face;
  return (
    f.x0 * photo.w >= crop.sx - 0.5 &&
    f.x1 * photo.w <= crop.sx + crop.sw + 0.5 &&
    f.y0 * photo.h >= crop.sy - 0.5 &&
    f.y1 * photo.h <= crop.sy + crop.sh + 0.5
  );
}

// Draw a photo into a target rect with a cover crop on `focus`.
// `imgs` maps photo id -> loaded HTMLImageElement. Pass keepFace=false for
// detail shots that are not meant to show a face.
export function paintPhoto(ctx, imgs, photoId, x, y, w, h, focus, keepFace = true) {
  const photo = PHOTOS[photoId];
  const img = imgs[photoId];
  if (!img) return null;
  const crop = coverCrop(photo, w, h, focus, keepFace);
  ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, x, y, w, h);
  return crop;
}

// Load every sample photo. Resolves to { id: HTMLImageElement }.
export function loadPhotos() {
  return Promise.all(
    Object.values(PHOTOS).map(
      (p) =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve([p.id, img]);
          img.onerror = () => reject(new Error('cannot load ' + p.src));
          img.src = p.src;
        }),
    ),
  ).then((pairs) => Object.fromEntries(pairs));
}
