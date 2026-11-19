// Six comic-book layouts. Every layout cuts the cover into 5-6 panels of
// DIFFERENT sizes (never an even grid) and tags each panel with a `scene`
// that tells the renderer which vector action to draw over the photo:
// hero, skyline, car, beach, street or vignette. The hero panel is listed
// first and covers roughly 40-50% of the cover so it reads in two seconds.

/** Wide covers branch differently from square/portrait ones. */
function wide(w, h) {
  return w / h > 1.2;
}

/** Split a rect into panels along one axis using uneven weights. */
function split(x, y, w, h, weights, scenes, axis, slotStart) {
  const total = weights.reduce((a, b) => a + b, 0);
  const out = [];
  let at = axis === 'x' ? x : y;
  weights.forEach((weight, i) => {
    const span = ((axis === 'x' ? w : h) * weight) / total;
    out.push({
      x: axis === 'x' ? at : x,
      y: axis === 'x' ? y : at,
      w: axis === 'x' ? span : w,
      h: axis === 'x' ? h : span,
      slot: slotStart + i,
      scene: scenes[i],
    });
    at += span;
  });
  return out;
}

/** Four uneven cells inside a rect (row heights and column widths differ). */
function unevenQuad(x, y, w, h, scenes, slotStart) {
  const cw = [w * 0.55, w * 0.45];
  const rh = [h * 0.52, h * 0.48];
  const out = [];
  let yy = y;
  for (let r = 0; r < 2; r++) {
    let xx = x;
    for (let c = 0; c < 2; c++) {
      out.push({ x: xx, y: yy, w: cw[c], h: rh[r], slot: slotStart + r * 2 + c, scene: scenes[r * 2 + c] });
      xx += cw[c];
    }
    yy += rh[r];
  }
  return out;
}

export const LAYOUTS = [
  {
    id: 'sunset-hero',
    name: 'Sunset Hero',
    blurb: 'Big hero on top, skyline + vignette right, car / beach / street below.',
    panels(w, h) {
      if (wide(w, h)) {
        return [
          { x: 0, y: 0, w: w * 0.66, h: h * 0.6, slot: 0, scene: 'hero', hero: true },
          { x: w * 0.66, y: 0, w: w * 0.34, h: h * 0.34, slot: 1, scene: 'skyline' },
          { x: w * 0.66, y: h * 0.34, w: w * 0.34, h: h * 0.26, slot: 2, scene: 'vignette' },
          ...split(0, h * 0.6, w, h * 0.4, [42, 30, 28], ['car', 'beach', 'street'], 'x', 3),
        ];
      }
      return [
        { x: 0, y: 0, w, h: h * 0.44, slot: 0, scene: 'hero', hero: true },
        { x: 0, y: h * 0.44, w: w * 0.56, h: h * 0.28, slot: 1, scene: 'skyline' },
        { x: w * 0.56, y: h * 0.44, w: w * 0.44, h: h * 0.28, slot: 2, scene: 'vignette' },
        ...split(0, h * 0.72, w, h * 0.28, [40, 32, 28], ['car', 'beach', 'street'], 'x', 3),
      ];
    },
  },
  {
    id: 'grid-hero',
    name: 'Grid + Hero',
    blurb: 'Tall hero beside an uneven 2x2 story grid and a car strip.',
    panels(w, h) {
      if (wide(w, h)) {
        return [
          { x: w * 0.5, y: 0, w: w * 0.5, h, slot: 0, scene: 'hero', hero: true },
          ...unevenQuad(0, 0, w * 0.5, h * 0.78, ['beach', 'street', 'skyline', 'car'], 1),
          { x: 0, y: h * 0.78, w: w * 0.5, h: h * 0.22, slot: 5, scene: 'vignette' },
        ];
      }
      return [
        { x: 0, y: 0, w, h: h * 0.42, slot: 0, scene: 'hero', hero: true },
        ...unevenQuad(0, h * 0.42, w, h * 0.4, ['skyline', 'beach', 'street', 'vignette'], 1),
        { x: 0, y: h * 0.82, w, h: h * 0.18, slot: 5, scene: 'car' },
      ];
    },
  },
  {
    id: 'five-vert',
    name: 'Vice Strip',
    blurb: 'Five unequal slices, one moment each — the classic strip cover.',
    panels(w, h) {
      const weights = [24, 15, 30, 18, 13];
      const scenes = ['beach', 'car', 'hero', 'street', 'skyline'];
      const axis = wide(w, h) ? 'y' : 'x';
      return split(0, 0, w, h, weights, scenes, axis, 0).map((p, i) => ({ ...p, hero: i === 2 }));
    },
  },
  {
    id: 'triptych',
    name: 'Triptych',
    blurb: 'Wide hero framed by two tall sides, each split in two, plus a footer.',
    panels(w, h) {
      return [
        { x: w * 0.25, y: 0, w: w * 0.5, h: h * 0.78, slot: 0, scene: 'hero', hero: true },
        { x: 0, y: 0, w: w * 0.25, h: h * 0.55, slot: 1, scene: 'skyline' },
        { x: 0, y: h * 0.55, w: w * 0.25, h: h * 0.45, slot: 2, scene: 'car' },
        { x: w * 0.75, y: 0, w: w * 0.25, h: h * 0.55, slot: 3, scene: 'beach' },
        { x: w * 0.75, y: h * 0.55, w: w * 0.25, h: h * 0.45, slot: 4, scene: 'street' },
        { x: w * 0.25, y: h * 0.78, w: w * 0.5, h: h * 0.22, slot: 5, scene: 'vignette' },
      ];
    },
  },
  {
    id: 'quad',
    name: 'Comic Quad',
    blurb: 'A dominant hero corner with five unequal story panels around it.',
    panels(w, h) {
      return [
        { x: 0, y: 0, w: w * 0.58, h: h * 0.66, slot: 0, scene: 'hero', hero: true },
        { x: w * 0.58, y: 0, w: w * 0.42, h: h * 0.36, slot: 1, scene: 'skyline' },
        { x: w * 0.58, y: h * 0.36, w: w * 0.42, h: h * 0.3, slot: 2, scene: 'street' },
        { x: 0, y: h * 0.66, w: w * 0.34, h: h * 0.34, slot: 3, scene: 'car' },
        { x: w * 0.34, y: h * 0.66, w: w * 0.24, h: h * 0.34, slot: 4, scene: 'vignette' },
        { x: w * 0.58, y: h * 0.66, w: w * 0.42, h: h * 0.34, slot: 5, scene: 'beach' },
      ];
    },
  },
  {
    id: 'cinema',
    name: 'Cinema Strip',
    blurb: 'Widescreen hero between a top duo and a bottom trio of stills.',
    panels(w, h) {
      return [
        { x: 0, y: h * 0.24, w, h: h * 0.5, slot: 0, scene: 'hero', hero: true },
        { x: 0, y: 0, w: w * 0.62, h: h * 0.24, slot: 1, scene: 'skyline' },
        { x: w * 0.62, y: 0, w: w * 0.38, h: h * 0.24, slot: 2, scene: 'vignette' },
        ...split(0, h * 0.74, w, h * 0.26, [44, 30, 26], ['car', 'beach', 'street'], 'x', 3),
      ];
    },
  },
];

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}

/** Fresh crops for a layout: photos round-robin by slot, no zoom, centered. */
export function defaultEdits(layout, photoCount) {
  const n = Math.max(1, photoCount);
  return layout.panels(1000, 1000).map((p) => ({
    photo: p.slot % n,
    zoom: 1,
    panX: 0,
    panY: 0,
  }));
}