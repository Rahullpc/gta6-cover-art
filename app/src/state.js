// state.js — the shared cover state and the four one-click concepts (v3).
//
// A concept is the two-click path from photo to finished cover: it loads the
// sample photos (only when the user has none of their own), then sets layout,
// grade, caption, stickers and a per-panel crop list in one shot.
//
// Crop philosophy (carried from v2): hero/story panels use the framing engine's
// head anchor so the face stays whole; detail panels aim at the car / street /
// sky with `detail: true`, putting the face fully OUT of frame instead of
// half-cut. Every panel shows either a complete face or pure scenery.
//
// v3 ships FOUR samples (boulevard, pier, porsche, summer) and casts the two new
// photos into the concepts: summer headlines Sunset Beach Heist and the Vice
// Strip hero column; porsche takes the tight vignette in Sunset Heist / Neon
// Night / Golden Duo and the Vice Strip street column. Faces sit in the top rows,
// clear of the bottom title band; porsche's small head gets a high zoom so it
// reads instead of becoming a dot.

import { defaultEdits, layoutById } from './layouts.js';
import { clamp } from './framing.js';

export { clamp };

export const SIZES = [
  { id: 'square', name: 'Square post', w: 1080, h: 1080 },
  { id: 'portrait', name: 'Portrait post', w: 1080, h: 1350 },
  { id: 'landscape', name: 'Landscape post', w: 1920, h: 1080 },
];

export const sizeById = (id) => SIZES.find((s) => s.id === id) ?? SIZES[0];

// The four sample photos shipped with the app (free to use; the two new ones are
// the boss's own photos, approved for bundling).
export const SAMPLE_PHOTOS = ['boulevard', 'pier', 'porsche', 'summer'];

// Crop shorthand. `portrait` keeps the whole head in frame — the framing engine
// clamps zoom and pan to the face-safe range around the head anchor. `moment` is
// a scenery beat aimed away from the head; the whole-or-absent guard means these
// read as action, never as portraits.
const portrait = (photo, zoom = 1, panX = 0, panY = 0) => ({ photo, zoom, panX, panY });
const moment = (photo, zoom, aimX, aimY) => ({ photo, zoom, panX: 0, panY: 0, detail: true, aimX, aimY });

// A concept fills in the shared caption/sticker defaults so each entry below
// only states what makes it distinct.
const concept = (spec) => ({
  titlePos: 'bottom',
  titleColor: 'white',
  titleScale: 1,
  intensity: 0.92,
  stickers: { viceCity: true, leonida: false, stars: true, palm: false },
  ...spec,
});

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
    // sunset-hero slots: hero, skyline, vignette (faces) + car/beach/street.
    // summer owns the hero; porsche's small head takes a tight vignette zoom.
    crops: [
      portrait(2, 1.6, -0.3, 0),
      portrait(1, 1.28, -0.25, 0),
      portrait(3, 3.4),
      moment(0, 3, 0.18, 0.9),
      moment(2, 2.2, 0.25, 0.62),
      moment(1, 2.8, 0.12, 0.35),
    ],
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
    crops: [
      portrait(0, 1.08),
      portrait(1, 1.28, -0.25, 0),
      portrait(3, 2.6),
      moment(0, 3, 0.18, 0.9),
      moment(1, 2.6, 0.9, 0.62),
      moment(0, 2.8, 0.12, 0.35),
    ],
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
    crops: [
      portrait(0, 1),
      portrait(2, 1.2),
      portrait(0, 1.05),
      portrait(1, 1.11),
      portrait(3, 1.3),
    ],
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
    crops: [
      portrait(0, 1.05),
      portrait(1, 1.24, -0.3, 0),
      moment(0, 2.8, 0.12, 0.35),
      moment(0, 3, 0.18, 0.9),
      portrait(3, 2.6, 0, -0.5),
      moment(2, 2.2, 0.25, 0.62),
    ],
  }),
];

export const presetById = (id) => PRESETS.find((p) => p.id === id) ?? PRESETS[0];

/** A blank cover, pre-set to the default concept's look. */
export function createState() {
  return {
    size: 'landscape',
    layout: 'sunset-hero',
    grade: 'sunset',
    intensity: 0.92,
    title: 'SUNSET HEIST',
    subtitle: 'A VICE CITY STORY',
    titlePos: 'bottom',
    titleColor: 'white',
    titleScale: 1,
    stickers: { viceCity: true, leonida: false, stars: true, palm: false },
    photos: [], // entries: { img, name, focus? }
    cropsByLayout: {}, // layoutId -> [{ photo, zoom, panX, panY, detail?, aimX?, aimY? }]
    selectedPanel: -1,
    lastPreset: '',
  };
}

/** The crop list for the layout currently on screen (lazily created). */
export function activeEdits(state) {
  const layout = layoutById(state.layout);
  if (!state.cropsByLayout[state.layout]) {
    state.cropsByLayout[state.layout] = defaultEdits(layout, state.photos.length);
  }
  return state.cropsByLayout[state.layout];
}

/** Apply a concept. The user's own photos are kept when they have any. */
export function applyPreset(state, preset) {
  state.layout = preset.layout;
  state.grade = preset.grade;
  state.intensity = preset.intensity;
  state.size = preset.size;
  state.title = preset.title;
  state.subtitle = preset.subtitle;
  state.titlePos = preset.titlePos;
  state.titleColor = preset.titleColor;
  state.titleScale = preset.titleScale;
  state.stickers = { ...preset.stickers };
  state.lastPreset = preset.id;
  const n = Math.max(1, state.photos.length);
  state.cropsByLayout[preset.layout] = preset.crops.map((c) => ({
    photo: c.photo % n,
    zoom: c.zoom,
    panX: c.panX ?? 0,
    panY: c.panY ?? 0,
    detail: !!c.detail,
    aimX: c.aimX,
    aimY: c.aimY,
  }));
  state.selectedPanel = -1;
}
