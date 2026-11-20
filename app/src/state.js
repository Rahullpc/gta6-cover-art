// state.js — the shared cover state and the four one-click presets
// for Vice Cover Studio v26.

import { tilingById } from './layouts.js';

export const SHEET_SIZES = {
  square: { id: 'square', name: 'Square', w: 1080, h: 1080 },
  portrait: { id: 'portrait', name: 'Portrait', w: 1080, h: 1350 },
  landscape: { id: 'landscape', name: 'Landscape', w: 1920, h: 1080 },
};

export const ROLL_ORDER = ['boulevard', 'pier', 'porsche', 'summer'];

export function newStudio() {
  const studio = {
    photos: [], // { img, name, focus? }
    layout: 'sunsetHero',
    grade: 'sunset',
    intensity: 0.92,
    size: 'landscape',
    title: 'SUNSET HEIST',
    subtitle: 'A VICE CITY STORY',
    placement: 'bottom',
    titleColour: 'white',
    titleScale: 1,
    stickers: { vice: true, leonida: false, stars: true, palm: false },
    crops: {}, // layoutId -> [crop]
    selected: -1,
    concept: 'Sunset Beach Heist',
  };
  studio.cropsFor = function (layoutId) {
    const tiling = tilingById(layoutId);
    const count = tiling.panels(1920, 1080).length;
    let list = this.crops[layoutId];
    if (!list || list.length !== count) {
      list = freshCrops(layoutId, this.photos.length || 4);
      this.crops[layoutId] = list;
    }
    return list;
  };
  return studio;
}

// Fresh crops for a tiling: photos round-robin by slot, zoom 1, centred pan.
export function freshCrops(layoutId, photoCount) {
  const tiling = tilingById(layoutId);
  const count = tiling.panels(1920, 1080).length;
  const n = Math.max(1, photoCount);
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({ photo: i % n, zoom: 1, panX: 0, panY: 0, kind: 'face' });
  }
  return out;
}

// Crop shorthand: [photoName, zoom, panX, panY, kind, aimX, aimY]
function cropsFrom(order, specs, photoCount) {
  const n = Math.max(1, photoCount);
  return specs.map(s => {
    const idx = order.indexOf(s[0]);
    return {
      photo: (idx < 0 ? 0 : idx) % n,
      zoom: s[1] || 1,
      panX: s[2] || 0,
      panY: s[3] || 0,
      kind: s[4] || 'face',
      aimX: s[5], aimY: s[6],
    };
  });
}

export const PRESETS = {
  'Sunset Beach Heist': {
    layout: 'sunsetHero', grade: 'sunset', intensity: 0.92, size: 'landscape',
    title: 'SUNSET HEIST', subtitle: 'A VICE CITY STORY', colour: 'white', scale: 1,
    stickers: { vice: true, leonida: false, stars: true, palm: false },
    order: ['boulevard', 'pier', 'summer', 'porsche'],
    crops: [
      ['summer', 1.6, -0.3, 0, 'face'],
      ['pier', 1.28, -0.25, 0, 'face'],
      ['porsche', 3.4, 0, 0, 'face'],
      ['summer', 2.2, 0, 0, 'scene', 0.25, 0.62],
      ['pier', 2.8, 0, 0, 'scene', 0.12, 0.35],
    ],
  },
  'Neon Night Drive': {
    layout: 'cinema', grade: 'neonNight', intensity: 1.0, size: 'landscape',
    title: 'NEON NIGHT DRIVE', subtitle: 'AFTER DARK IN LEONIDA', colour: 'gold', scale: 0.94,
    stickers: { vice: true, leonida: false, stars: true, palm: false },
    order: ['boulevard', 'pier', 'summer', 'porsche'],
    crops: [
      ['boulevard', 1.08, 0, 0, 'face'],
      ['pier', 1.28, -0.25, 0, 'face'],
      ['porsche', 2.6, 0, 0, 'face'],
      ['boulevard', 3, 0, 0, 'scene', 0.18, 0.9],
      ['pier', 2.6, 0, 0, 'scene', 0.9, 0.62],
      ['boulevard', 2.8, 0, 0, 'scene', 0.12, 0.35],
    ],
  },
  'Vice Strip': {
    layout: 'viceStrip', grade: 'vicePink', intensity: 0.92, size: 'portrait',
    title: 'VICE STRIP', subtitle: 'FIVE MOMENTS - ONE CITY', colour: 'white', scale: 1.02,
    stickers: { vice: true, leonida: true, stars: false, palm: true },
    order: ['summer', 'porsche', 'boulevard', 'pier'],
    crops: [
      ['summer', 1, 0, 0, 'face'],
      ['boulevard', 1.2, 0, 0, 'face'],
      ['summer', 1.05, 0, 0, 'face'],
      ['porsche', 1.11, 0, 0, 'face'],
      ['pier', 1.3, 0, 0, 'face'],
    ],
  },
  'Golden Hour Duo': {
    layout: 'comicQuad', grade: 'goldenHour', intensity: 0.88, size: 'square',
    title: 'GOLDEN HOUR', subtitle: 'LEONIDA SUMMER', colour: 'gold', scale: 1,
    stickers: { vice: false, leonida: true, stars: true, palm: false },
    order: ['boulevard', 'pier', 'summer', 'porsche'],
    crops: [
      ['boulevard', 1.05, 0, 0, 'face'],
      ['pier', 1.24, -0.3, 0, 'face'],
      ['boulevard', 2.8, 0, 0, 'scene', 0.12, 0.35],
      ['boulevard', 3, 0, 0, 'scene', 0.18, 0.9],
      ['porsche', 2.6, 0, -0.5, 'face'],
      ['summer', 2.2, 0, 0, 'scene', 0.25, 0.62],
    ],
  },
};

// Apply a preset to a studio (mutates and returns it). Keeps the user's
// own photos when they have any; loads the sample roll only when the
// roll is empty (the caller supplies loadSamples for that case).
export function usePreset(studio, name, loadSamples) {
  const c = PRESETS[name];
  if (!c) return studio;
  if (studio.photos.length === 0 && loadSamples) loadSamples(studio);
  // Reorder the roll to the preset's order when the roll holds the samples.
  const byName = {};
  for (const p of studio.photos) byName[p.name.replace(/\.[^.]+$/, '')] = p;
  const ordered = [];
  for (const n of c.order) if (byName[n]) ordered.push(byName[n]);
  for (const p of studio.photos) if (!ordered.includes(p)) ordered.push(p);
  if (ordered.length > 0) studio.photos = ordered;
  studio.layout = c.layout;
  studio.grade = c.grade;
  studio.intensity = c.intensity;
  studio.size = c.size;
  studio.title = c.title;
  studio.subtitle = c.subtitle;
  studio.titleColour = c.colour;
  studio.titleScale = c.scale;
  studio.stickers = { ...c.stickers };
  studio.crops[c.layout] = cropsFrom(c.order, c.crops, studio.photos.length || 4);
  studio.concept = name;
  studio.selected = -1;
  return studio;
}

// Clone a studio shallowly (photos shared) for probes and tests.
export function copyStudio(studio) {
  const copy = newStudio();
  Object.assign(copy, studio, {
    photos: studio.photos.slice(),
    stickers: { ...studio.stickers },
    crops: Object.fromEntries(Object.entries(studio.crops).map(([k, v]) => [k, v.map(c => ({ ...c }))])),
  });
  return copy;
}
