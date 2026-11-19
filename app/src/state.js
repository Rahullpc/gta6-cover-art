// state.js — the cover's shared state plus the four one-click concepts.
//
// A concept takes a photo to a finished cover in two clicks: it loads samples
// (only if the user has none), then sets layout, grade, caption, stickers and a
// per-panel crop list. v2 crops are face-safe: hero/story panels use the framing
// engine's head anchor, while detail panels aim at the car / street / sky with
// `detail:true` so the face is fully out of frame rather than half-cut.

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

// Crop shorthand. `face` panels keep the whole head in frame (the framing engine
// clamps zoom + pan to a face-safe range). `scene` panels aim at a car / sea /
// boardwalk moment away from the head; the whole-or-absent guard guarantees the
// face is never half-cut, so v2 shows either a whole face or pure scenery —
// never a headless torso.
const face = (photo, zoom = 1, panX = 0, panY = 0) => ({ photo, zoom, panX, panY });
// A scenery moment (car / sea / boardwalk) aimed away from the head; the framing
// guard keeps the face whole-or-absent, so these read as action, not portraits.
const scene = (photo, zoom, aimX, aimY) => ({ photo, zoom, panX: 0, panY: 0, detail: true, aimX, aimY });

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
    // sunset-hero: hero, skyline, vignette (faces) + car / beach / street scenery.
    crops: [
      face(0, 1.05),
      face(1, 1.2, -0.3, 0),
      face(0, 1.5, 0.45, 0.15),
      scene(0, 3, 0.18, 0.9),
      scene(1, 2.6, 0.9, 0.62),
      scene(0, 2.8, 0.12, 0.35),
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
    // cinema: hero, skyline, vignette (faces) + car / beach / street scenery.
    crops: [
      face(0, 1.08),
      face(1, 1.28, -0.25, 0),
      face(1, 1.6, 0.4, 0.1),
      scene(0, 3, 0.18, 0.9),
      scene(1, 2.6, 0.9, 0.62),
      scene(0, 2.8, 0.12, 0.35),
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
    // five-vert: beach, car, hero, street, skyline — one photo, re-cropped,
    // every moment keeps the whole face; zoom + pan give each its own framing.
    crops: [
      face(0, 1.2, -0.5, 0),
      face(0, 1.5, 0.35, 0),
      face(0, 1.02),
      face(0, 1.4, -0.35, 0),
      face(0, 1.3, 0.45, 0),
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
    // quad: hero, skyline, vignette (faces) + street / car / beach scenery.
    crops: [
      face(0, 1.05),
      face(1, 1.24, -0.3, 0),
      scene(0, 2.8, 0.12, 0.35),
      scene(0, 3, 0.18, 0.9),
      face(1, 1.6, 0.35, 0.1),
      scene(1, 2.6, 0.9, 0.62),
    ],
  },
];

export const presetById = (id) => PRESETS.find((p) => p.id === id) ?? PRESETS[0];

/** A blank cover ready for the default concept. */
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
    photos: [], // [{ img, name, focus? }]
    cropsByLayout: {}, // layoutId -> [{ photo, zoom, panX, panY, detail?, aimX?, aimY? }]
    selectedPanel: -1,
    lastPreset: '',
  };
}

/** The crop list for the layout on screen now (created on first use). */
export function activeEdits(state) {
  const layout = layoutById(state.layout);
  if (!state.cropsByLayout[state.layout]) {
    state.cropsByLayout[state.layout] = defaultEdits(layout, state.photos.length);
  }
  return state.cropsByLayout[state.layout];
}

/** Apply a concept, keeping the user's own photos when they have any. */
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