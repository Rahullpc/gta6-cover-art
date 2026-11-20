// state.js — the shared cover state and the four one-click concepts.

import { layoutById } from './layouts.js';

export const SIZES = {
  square: { id: 'square', name: 'Square', w: 1080, h: 1080 },
  portrait: { id: 'portrait', name: 'Portrait', w: 1080, h: 1350 },
  landscape: { id: 'landscape', name: 'Landscape', w: 1920, h: 1080 },
};

export const SAMPLE_ORDER = ['boulevard', 'pier', 'porsche', 'summer'];

export function createState() {
  const state = {
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
  state.cropsFor = function (layoutId) {
    const layout = layoutById(layoutId);
    const count = layout.panels(1920, 1080).length;
    let list = this.crops[layoutId];
    if (!list || list.length !== count) {
      list = defaultCrops(layoutId, this.photos.length || 4);
      this.crops[layoutId] = list;
    }
    return list;
  };
  return state;
}

// Fresh crops for a layout: photos round-robin by slot, zoom 1, centred pan.
export function defaultCrops(layoutId, photoCount) {
  const layout = layoutById(layoutId);
  const count = layout.panels(1920, 1080).length;
  const n = Math.max(1, photoCount);
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({ photo: i % n, zoom: 1, panX: 0, panY: 0, kind: 'face' });
  }
  return out;
}

// Crop shorthand: [photoName, zoom, panX, panY, kind, aimX, aimY]
function buildCrops(order, specs, photoCount) {
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

export const CONCEPTS = {
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

// Apply a concept to a state (mutates and returns it). Keeps the user's own
// photos when they have any; loads the sample roll only when the roll is
// empty (the caller supplies loadSamples for that case).
export function applyConcept(state, name, loadSamples) {
  const c = CONCEPTS[name];
  if (!c) return state;
  if (state.photos.length === 0 && loadSamples) loadSamples(state);
  // Reorder the roll to the concept's order when the roll holds the samples.
  const byName = {};
  for (const p of state.photos) byName[p.name.replace(/\.[^.]+$/, '')] = p;
  const ordered = [];
  for (const n of c.order) if (byName[n]) ordered.push(byName[n]);
  for (const p of state.photos) if (!ordered.includes(p)) ordered.push(p);
  if (ordered.length > 0) state.photos = ordered;
  state.layout = c.layout;
  state.grade = c.grade;
  state.intensity = c.intensity;
  state.size = c.size;
  state.title = c.title;
  state.subtitle = c.subtitle;
  state.titleColour = c.colour;
  state.titleScale = c.scale;
  state.stickers = { ...c.stickers };
  state.crops[c.layout] = buildCrops(c.order, c.crops, state.photos.length || 4);
  state.concept = name;
  state.selected = -1;
  return state;
}

// Clone a state shallowly (photos shared) for probes and tests.
export function cloneState(state) {
  const copy = createState();
  Object.assign(copy, state, {
    photos: state.photos.slice(),
    stickers: { ...state.stickers },
    crops: Object.fromEntries(Object.entries(state.crops).map(([k, v]) => [k, v.map(c => ({ ...c }))])),
  });
  return copy;
}
