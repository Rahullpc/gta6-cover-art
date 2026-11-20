// state.js — the shared cover state and the four one-click concepts (v6).
//
// A concept is the two-click path from photo to finished cover: load the sample
// roll (only when the user has none of their own), then set layout, grade,
// caption, stickers and per-panel crops in one shot.
//
// Crop philosophy: hero/story panels use the framing engine's head anchor so a
// face stays whole; detail panels aim at the car / street / sky with detail:true,
// putting the face fully OUT of frame rather than half-cut. Every panel shows
// either a complete face or pure scenery.
//
// v6 changes no state data: the skyline-buildings removal lives entirely in
// decor.js / cover.js (the `skyline` scene tag still marks the same panels).
// The v5 fixes hold — five wanted stars, no sunset sun — and the v4 geometry
// holds too: Sunset Beach Heist tiles five slots (hero, skyline, vignette,
// beach, street) with no car panel, and the crop cache still regenerates stale
// lists whose length no longer matches the tiling.

import { defaultEdits, layoutById } from './layouts.js';
import { clamp } from './framing.js';

export { clamp };

const SIZE_TABLE = [
  ['square', 'Square post', 1080, 1080],
  ['portrait', 'Portrait post', 1080, 1350],
  ['landscape', 'Landscape post', 1920, 1080],
];
export const SIZES = SIZE_TABLE.map(([id, name, w, h]) => ({ id, name, w, h }));

export function sizeById(id) {
  return SIZES.find((size) => size.id === id) ?? SIZES[0];
}

// The four bundled sample photos (free to use; porsche + summer are the boss's
// own photos, approved for bundling).
export const SAMPLE_PHOTOS = ['boulevard', 'pier', 'porsche', 'summer'];

// Crop builders. A face crop keeps the whole head in frame (the framing engine
// clamps zoom/pan to the face-safe range around the head anchor). A scene crop
// is a scenery beat aimed away from the head; the whole-or-absent guard means
// these read as action, never as portraits.
function faceCrop(photo, zoom, panX, panY) {
  return { photo, zoom: zoom ?? 1, panX: panX ?? 0, panY: panY ?? 0 };
}

function sceneCrop(photo, zoom, aimX, aimY) {
  return { photo, zoom, panX: 0, panY: 0, detail: true, aimX, aimY };
}

// Crops are declared as tagged rows: ['face', photo, zoom, panX?, panY?] or
// ['scene', photo, zoom, aimX, aimY]. Row order is slot order.
function cropList(rows) {
  return rows.map(([kind, photo, zoom, a, b]) =>
    kind === 'scene' ? sceneCrop(photo, zoom, a, b) : faceCrop(photo, zoom, a, b));
}

// Shared concept defaults; each concept below states only what makes it distinct.
const CONCEPT_DEFAULTS = {
  titlePos: 'bottom',
  titleColor: 'white',
  titleScale: 1,
  intensity: 0.92,
  stickers: { viceCity: true, leonida: false, stars: true, palm: false },
};

function concept(spec) {
  const base = { ...CONCEPT_DEFAULTS, stickers: { ...CONCEPT_DEFAULTS.stickers } };
  return Object.assign(base, spec);
}

export const PRESETS = [
  concept({
    id: 'sunset-heist',
    name: 'Sunset Beach Heist',
    layout: 'sunset-hero',
    grade: 'sunset',
    size: 'landscape',
    title: 'SUNSET HEIST',
    subtitle: 'A VICE CITY STORY',
    photos: ['boulevard', 'pier', 'summer', 'porsche'],
    // sunset-hero slots: hero, skyline, vignette (faces) + beach, street.
    // summer owns the hero; porsche's small head takes a tight vignette zoom.
    // No car crop (v4); beach (summer) fills the wider left slot. v5: the sky
    // above the hero no longer carries a sun, and the badge gets five stars.
    // v6: the skyline panel under the pier man's face shows only the graded
    // photo — the black tower row is gone.
    crops: cropList([
      ['face', 2, 1.6, -0.3, 0],
      ['face', 1, 1.28, -0.25, 0],
      ['face', 3, 3.4],
      ['scene', 2, 2.2, 0.25, 0.62],
      ['scene', 1, 2.8, 0.12, 0.35],
    ]),
  }),
  concept({
    id: 'neon-night',
    name: 'Neon Night Drive',
    layout: 'cinema',
    grade: 'neon-night',
    intensity: 1,
    size: 'landscape',
    title: 'NEON NIGHT DRIVE',
    subtitle: 'AFTER DARK IN LEONIDA',
    titleColor: 'gold',
    titleScale: 0.94,
    photos: ['boulevard', 'pier', 'summer', 'porsche'],
    // cinema slots: hero, skyline, vignette (faces) + car/beach/street. The cold
    // grade + hero/skyline are v2's; porsche rides the top-right vignette (row 1,
    // safe from the bottom title) at a zoom that keeps its face readable.
    // v5: the night moon stays; the wanted row below the badge is now five.
    // v6: the top-centre skyline panel keeps its sparkles over the graded photo
    // — no black buildings under the face.
    crops: cropList([
      ['face', 0, 1.08],
      ['face', 1, 1.28, -0.25, 0],
      ['face', 3, 2.6],
      ['scene', 0, 3, 0.18, 0.9],
      ['scene', 1, 2.6, 0.9, 0.62],
      ['scene', 0, 2.8, 0.12, 0.35],
    ]),
  }),
  concept({
    id: 'vice-strip',
    name: 'Vice Strip',
    layout: 'five-vert',
    grade: 'vice-pink',
    size: 'portrait',
    title: 'VICE STRIP',
    subtitle: 'FIVE MOMENTS - ONE CITY',
    titleScale: 1.02,
    stickers: { viceCity: true, leonida: true, stars: false, palm: true },
    photos: ['summer', 'porsche', 'boulevard', 'pier'],
    // five-vert columns: beach, car, hero, street, skyline. summer takes the beach
    // + hero columns, porsche the street column (tight), boulevard the car, pier
    // the skyline. Every face sits in the upper third, clear of the title.
    // stars:false here — no yellow cluster on this cover (unchanged in v5/v6).
    crops: cropList([
      ['face', 0, 1],
      ['face', 2, 1.2],
      ['face', 0, 1.05],
      ['face', 1, 1.11],
      ['face', 3, 1.3],
    ]),
  }),
  concept({
    id: 'golden-duo',
    name: 'Golden Hour Duo',
    layout: 'quad',
    grade: 'golden-hour',
    intensity: 0.88,
    size: 'square',
    title: 'GOLDEN HOUR',
    subtitle: 'LEONIDA SUMMER',
    titleColor: 'gold',
    stickers: { viceCity: false, leonida: true, stars: true, palm: false },
    photos: ['boulevard', 'pier', 'summer', 'porsche'],
    // quad slots: hero, skyline, street, car, vignette, beach. porsche takes the
    // tall vignette (props live in the lower half); summer's pool is the beach beat.
    // v5 side effect (accepted): stars:true means this cover also gets the
    // five-star row, and its day sky loses the sun like every other non-night grade.
    // v6: its skyline panel loses the black towers like every other layout.
    crops: cropList([
      ['face', 0, 1.05],
      ['face', 1, 1.24, -0.3, 0],
      ['scene', 0, 2.8, 0.12, 0.35],
      ['scene', 0, 3, 0.18, 0.9],
      ['face', 3, 2.6, 0, -0.5],
      ['scene', 2, 2.2, 0.25, 0.62],
    ]),
  }),
];

export function presetById(id) {
  return PRESETS.find((preset) => preset.id === id) ?? PRESETS[0];
}

/** A blank cover, pre-set to the default concept's look. */
export function createState() {
  const look = { ...CONCEPT_DEFAULTS, stickers: { ...CONCEPT_DEFAULTS.stickers } };
  return Object.assign(look, {
    size: 'landscape',
    layout: 'sunset-hero',
    grade: 'sunset',
    title: 'SUNSET HEIST',
    subtitle: 'A VICE CITY STORY',
    photos: [], // entries: { img, name, focus? }
    cropsByLayout: {}, // layoutId -> [{ photo, zoom, panX, panY, detail?, aimX?, aimY? }]
    selectedPanel: -1,
    lastPreset: '',
  });
}

/**
 * The crop list for the layout currently on screen (lazily created).
 * Cache guard (v4): a stored list whose length no longer matches the tiling
 * (e.g. a stale six-entry sunset-hero list from before the car panel was
 * removed) is regenerated from the live panels, so a panel never reads the
 * wrong crop.
 */
export function activeEdits(state) {
  const layout = layoutById(state.layout);
  const want = layout.panels(1000, 1000).length;
  const cached = state.cropsByLayout[state.layout];
  if (!cached || cached.length !== want) {
    state.cropsByLayout[state.layout] = defaultEdits(layout, state.photos.length);
  }
  return state.cropsByLayout[state.layout];
}

// Copy one preset crop into a live edit, wrapping the photo index to the roll.
function cloneCrop(c, n) {
  const out = { photo: c.photo % n, zoom: c.zoom, detail: !!c.detail };
  out.panX = c.panX ?? 0;
  out.panY = c.panY ?? 0;
  out.aimX = c.aimX;
  out.aimY = c.aimY;
  return out;
}

const LOOK_FIELDS = ['layout', 'grade', 'intensity', 'size', 'title', 'subtitle', 'titlePos', 'titleColor', 'titleScale'];

/** Apply a concept. The user's own photos are kept when they have any. */
export function applyPreset(state, preset) {
  for (const key of LOOK_FIELDS) state[key] = preset[key];
  state.stickers = { ...preset.stickers };
  state.lastPreset = preset.id;
  const n = Math.max(1, state.photos.length);
  state.cropsByLayout[preset.layout] = preset.crops.map((c) => cloneCrop(c, n));
  state.selectedPanel = -1;
}
