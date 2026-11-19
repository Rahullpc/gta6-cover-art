// state.js — the shared cover state and the four one-click concepts.
//
// A concept is the two-click path from photo to finished cover: it loads the
// sample photos (only when the user has none of their own), then sets layout,
// grade, caption, stickers and a per-panel crop list in one shot.
//
// v2 crop philosophy: hero/story panels use the framing engine's head anchor
// so the face stays whole; detail panels aim at the car / street / sky with
// `detail: true`, putting the face fully OUT of frame instead of half-cut.
// Every panel therefore shows either a complete face or pure scenery.

import { defaultEdits, layoutById } from './layouts.js';
import { clamp } from './framing.js';

export { clamp };

export const SIZES = [
  { id: 'square', name: 'Square post', w: 1080, h: 1080 },
  { id: 'portrait', name: 'Portrait post', w: 1080, h: 1350 },
  { id: 'landscape', name: 'Landscape post', w: 1920, h: 1080 },
];

export const sizeById = (id) => SIZES.find((s) => s.id === id) ?? SIZES[0];

// The two sample photos shipped with the app (made for make.fun, free to use).
export const SAMPLE_PHOTOS = ['boulevard', 'pier'];

// Crop shorthand for the concepts below.
// `portrait` keeps the whole head in frame — the framing engine clamps zoom
// and pan to the face-safe range around the head anchor.
const portrait = (photo, zoom = 1, panX = 0, panY = 0) => ({ photo, zoom, panX, panY });
// `moment` is a scenery beat (car / sea / boardwalk) aimed away from the head.
// The whole-or-absent guard means these read as action, never as portraits.
const moment = (photo, zoom, aimX, aimY) => ({ photo, zoom, panX: 0, panY: 0, detail: true, aimX, aimY });

export const PRESETS = [
  {
    id: 'sunset-heist',
    name: 'Sunset Beach Heist',
    layout: 'sunset-hero',
    grade: 'sunset',
    intensity: 0.92,
    size: 'landscape',
    title: 'SUNSET HEIST',
    subtitle: 'A VICE CITY STORY',
    titlePos: 'bottom',
    titleColor: 'white',
    titleScale: 1,
    stickers: { viceCity: true, leonida: false, stars: true, palm: false },
    photos: ['boulevard', 'pier'],
    // sunset-hero slots: hero, skyline, vignette (faces) + car/beach/street scenery.
    crops: [
      portrait(0, 1.05),
      portrait(1, 1.2, -0.3, 0),
      portrait(0, 1.5, 0.45, 0.15),
      moment(0, 3, 0.18, 0.9),
      moment(1, 2.6, 0.9, 0.62),
      moment(0, 2.8, 0.12, 0.35),
    ],
  },
  {
    id: 'neon-night',
    name: 'Neon Night Drive',
    layout: 'cinema',
    grade: 'neon-night',
    intensity: 1,
    size: 'landscape',
    title: 'NEON NIGHT DRIVE',
    subtitle: 'AFTER DARK IN LEONIDA',
    titlePos: 'bottom',
    titleColor: 'gold',
    titleScale: 0.94,
    stickers: { viceCity: true, leonida: false, stars: true, palm: false },
    photos: ['boulevard', 'pier'],
    // cinema slots: hero, skyline, vignette (faces) + car/beach/street scenery.
    crops: [
      portrait(0, 1.08),
      portrait(1, 1.28, -0.25, 0),
      portrait(1, 1.6, 0.4, 0.1),
      moment(0, 3, 0.18, 0.9),
      moment(1, 2.6, 0.9, 0.62),
      moment(0, 2.8, 0.12, 0.35),
    ],
  },
  {
    id: 'vice-strip',
    name: 'Vice Strip',
    layout: 'five-vert',
    grade: 'vice-pink',
    intensity: 0.92,
    size: 'portrait',
    title: 'VICE STRIP',
    subtitle: 'FIVE MOMENTS - ONE CITY',
    titlePos: 'bottom',
    titleColor: 'white',
    titleScale: 1.02,
    stickers: { viceCity: true, leonida: true, stars: false, palm: true },
    photos: ['boulevard'],
    // five-vert: beach, car, hero, street, skyline — one photo re-cropped five
    // ways; every moment keeps the whole face, zoom + pan give each its own frame.
    crops: [
      portrait(0, 1.2, -0.5, 0),
      portrait(0, 1.5, 0.35, 0),
      portrait(0, 1.02),
      portrait(0, 1.4, -0.35, 0),
      portrait(0, 1.3, 0.45, 0),
    ],
  },
  {
    id: 'golden-duo',
    name: 'Golden Hour Duo',
    layout: 'quad',
    grade: 'golden-hour',
    intensity: 0.88,
    size: 'square',
    title: 'GOLDEN HOUR',
    subtitle: 'LEONIDA SUMMER',
    titlePos: 'bottom',
    titleColor: 'gold',
    titleScale: 1,
    stickers: { viceCity: false, leonida: true, stars: true, palm: false },
    photos: ['boulevard', 'pier'],
    // quad slots: hero, skyline, vignette (faces) + street/car/beach scenery.
    crops: [
      portrait(0, 1.05),
      portrait(1, 1.24, -0.3, 0),
      moment(0, 2.8, 0.12, 0.35),
      moment(0, 3, 0.18, 0.9),
      portrait(1, 1.6, 0.35, 0.1),
      moment(1, 2.6, 0.9, 0.62),
    ],
  },
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
