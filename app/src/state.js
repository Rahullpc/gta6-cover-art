// Cover state for Vice Cover Studio: post size, layout, grade, caption,
// stickers, the photo roll and every panel's own crop. Also the four
// one-click concepts that take a photo to a finished cover in two clicks.

import { defaultEdits, layoutById } from './layouts.js';

export const SIZES = [
  { id: 'square', name: 'Square post', w: 1080, h: 1080 },
  { id: 'portrait', name: 'Portrait post', w: 1080, h: 1350 },
  { id: 'landscape', name: 'Landscape post', w: 1920, h: 1080 },
];

export function sizeById(id) {
  return SIZES.find((s) => s.id === id) ?? SIZES[0];
}

// The two sample photos shipped with the app (made for make.fun, free to use).
export const SAMPLE_PHOTOS = ['boulevard', 'pier'];

/**
 * One-click concepts. `crops` lists per-panel photo transforms in panel order
 * (hero first): which photo, zoom, and pan in -1..1. `photos` names the samples
 * the concept loads when the user has not uploaded their own yet.
 */
export const PRESETS = [
  {
    id: 'sunset-heist',
    name: 'Sunset Beach Heist',
    layout: 'sunset-hero',
    grade: 'sunset',
    intensity: 0.9,
    size: 'landscape',
    title: 'SUNSET HEIST',
    subtitle: 'A VICE CITY STORY',
    titlePos: 'bottom',
    titleColor: 'white',
    titleScale: 1,
    stickers: { viceCity: true, leonida: false, stars: true, palm: false },
    photos: ['boulevard', 'pier'],
    crops: [
      { photo: 0, zoom: 1.12, panX: 0.05, panY: -0.15 },
      { photo: 1, zoom: 1.7, panX: 0, panY: -0.45 },
      { photo: 1, zoom: 2.2, panX: -0.3, panY: 0.55 },
      { photo: 0, zoom: 2.1, panX: 0.6, panY: -0.75 },
      { photo: 1, zoom: 1.35, panX: 0, panY: 0.25 },
      { photo: 0, zoom: 2.3, panX: -0.62, panY: 0.15 },
    ],
  },
  {
    id: 'neon-night',
    name: 'Neon Night Drive',
    layout: 'cinema',
    grade: 'teal-noir',
    intensity: 1,
    size: 'landscape',
    title: 'NEON NIGHT DRIVE',
    subtitle: 'AFTER DARK IN LEONIDA',
    titlePos: 'center',
    titleColor: 'gold',
    titleScale: 0.94,
    stickers: { viceCity: true, leonida: false, stars: true, palm: false },
    photos: ['boulevard', 'pier'],
    crops: [
      { photo: 0, zoom: 1.3, panX: 0, panY: -0.2 },
      { photo: 1, zoom: 1.8, panX: -0.2, panY: -0.5 },
      { photo: 0, zoom: 2.6, panX: 0.4, panY: 0.5 },
      { photo: 0, zoom: 2.2, panX: 0.55, panY: -0.75 },
      { photo: 1, zoom: 1.8, panX: -0.7, panY: 0.15 },
      { photo: 0, zoom: 2.5, panX: -0.6, panY: 0.1 },
    ],
  },
  {
    id: 'vice-strip',
    name: 'Vice Strip',
    layout: 'five-vert',
    grade: 'vice-pink',
    intensity: 0.9,
    size: 'portrait',
    title: 'VICE STRIP',
    subtitle: 'FIVE MOMENTS - ONE CITY',
    titlePos: 'center',
    titleColor: 'white',
    titleScale: 1.02,
    stickers: { viceCity: true, leonida: true, stars: false, palm: true },
    photos: ['boulevard'],
    crops: [
      { photo: 0, zoom: 1.9, panX: 0.6, panY: 0.05 },
      { photo: 0, zoom: 2.4, panX: 0.5, panY: -0.75 },
      { photo: 0, zoom: 1.15, panX: 0.1, panY: -0.1 },
      { photo: 0, zoom: 2.6, panX: -0.65, panY: 0.15 },
      { photo: 0, zoom: 2.0, panX: 0.3, panY: -0.55 },
    ],
  },
  {
    id: 'golden-duo',
    name: 'Golden Hour Duo',
    layout: 'quad',
    grade: 'golden-hour',
    intensity: 0.85,
    size: 'square',
    title: 'GOLDEN HOUR',
    subtitle: 'LEONIDA SUMMER',
    titlePos: 'center',
    titleColor: 'gold',
    titleScale: 1,
    stickers: { viceCity: false, leonida: true, stars: true, palm: false },
    photos: ['boulevard', 'pier'],
    crops: [
      { photo: 0, zoom: 1.3, panX: 0, panY: -0.3 },
      { photo: 1, zoom: 1.6, panX: 0, panY: -0.4 },
      { photo: 0, zoom: 2.2, panX: -0.6, panY: 0.1 },
      { photo: 0, zoom: 2.3, panX: 0.5, panY: -0.7 },
      { photo: 1, zoom: 2.4, panX: -0.2, panY: 0.6 },
      { photo: 1, zoom: 1.4, panX: 0, panY: 0.3 },
    ],
  },
];

export function presetById(id) {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[0];
}

/** A blank cover, ready for the default concept. */
export function createState() {
  return {
    size: 'landscape',
    layout: 'sunset-hero',
    grade: 'sunset',
    intensity: 0.9,
    title: 'SUNSET HEIST',
    subtitle: 'A VICE CITY STORY',
    titlePos: 'bottom',
    titleColor: 'white',
    titleScale: 1,
    stickers: { viceCity: true, leonida: false, stars: true, palm: false },
    photos: [], // [{ img, name }]
    cropsByLayout: {}, // layoutId -> [{ photo, zoom, panX, panY }]
    selectedPanel: -1,
    lastPreset: '',
  };
}

/** The crop list for the layout on screen right now (created on first use). */
export function activeEdits(state) {
  const layout = layoutById(state.layout);
  if (!state.cropsByLayout[state.layout]) {
    state.cropsByLayout[state.layout] = defaultEdits(layout, state.photos.length);
  }
  return state.cropsByLayout[state.layout];
}

/**
 * Apply a concept. The user's own photos are kept when they have any;
 * otherwise the caller loads the concept's samples first.
 */
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
    panX: c.panX,
    panY: c.panY,
  }));
  state.selectedPanel = -1;
}

/** Shared clamp for the editor and the renderer. */
export function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}