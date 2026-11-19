// layouts.js — six comic poster layouts for v2.
//
// Every layout tiles the cover EXACTLY (panel edges meet on shared lines, no
// gaps and no overlaps) with 5-6 panels of deliberately unequal size. The hero
// is always slot 0 and takes roughly 40-50% of the area so the cover reads in
// two seconds. Each panel carries a `scene` tag telling the renderer which
// vector action to ink over the photo. v2 keeps the asymmetry but drops v1's
// jittered corners — the borders are straight and crisp so the grid looks
// composed, not messy.

const isWide = (w, h) => w / h > 1.2;

// Cut a rect along one axis by uneven weights; panels share exact edges.
function slice(x, y, w, h, weights, scenes, axis, firstSlot) {
  const total = weights.reduce((a, b) => a + b, 0);
  const panels = [];
  let cursor = axis === 'x' ? x : y;
  weights.forEach((weight, i) => {
    const span = ((axis === 'x' ? w : h) * weight) / total;
    panels.push({
      x: axis === 'x' ? cursor : x,
      y: axis === 'x' ? y : cursor,
      w: axis === 'x' ? span : w,
      h: axis === 'x' ? h : span,
      slot: firstSlot + i,
      scene: scenes[i],
    });
    cursor += span;
  });
  return panels;
}

// A 2x2 block with unequal column widths and row heights (never a plain grid).
function storyBlock(x, y, w, h, scenes, firstSlot) {
  const cols = [w * 0.56, w * 0.44];
  const rows = [h * 0.54, h * 0.46];
  const panels = [];
  let yy = y;
  for (let r = 0; r < 2; r++) {
    let xx = x;
    for (let c = 0; c < 2; c++) {
      panels.push({ x: xx, y: yy, w: cols[c], h: rows[r], slot: firstSlot + r * 2 + c, scene: scenes[r * 2 + c] });
      xx += cols[c];
    }
    yy += rows[r];
  }
  return panels;
}

export const LAYOUTS = [
  {
    id: 'sunset-hero',
    name: 'Sunset Hero',
    blurb: 'Big hero top-left, skyline + vignette right, a car / beach / street strip below.',
    panels(w, h) {
      if (isWide(w, h)) {
        return [
          { x: 0, y: 0, w: w * 0.64, h: h * 0.66, slot: 0, scene: 'hero', hero: true },
          { x: w * 0.64, y: 0, w: w * 0.36, h: h * 0.36, slot: 1, scene: 'skyline' },
          { x: w * 0.64, y: h * 0.36, w: w * 0.36, h: h * 0.3, slot: 2, scene: 'vignette' },
          ...slice(0, h * 0.66, w, h * 0.34, [40, 32, 28], ['car', 'beach', 'street'], 'x', 3),
        ];
      }
      return [
        { x: 0, y: 0, w, h: h * 0.46, slot: 0, scene: 'hero', hero: true },
        { x: 0, y: h * 0.46, w: w * 0.56, h: h * 0.26, slot: 1, scene: 'skyline' },
        { x: w * 0.56, y: h * 0.46, w: w * 0.44, h: h * 0.26, slot: 2, scene: 'vignette' },
        ...slice(0, h * 0.72, w, h * 0.28, [40, 32, 28], ['car', 'beach', 'street'], 'x', 3),
      ];
    },
  },
  {
    id: 'grid-hero',
    name: 'Grid + Hero',
    blurb: 'A tall hero beside an uneven 2x2 story block and a vignette footer.',
    panels(w, h) {
      if (isWide(w, h)) {
        return [
          { x: w * 0.5, y: 0, w: w * 0.5, h, slot: 0, scene: 'hero', hero: true },
          ...storyBlock(0, 0, w * 0.5, h * 0.76, ['beach', 'street', 'skyline', 'car'], 1),
          { x: 0, y: h * 0.76, w: w * 0.5, h: h * 0.24, slot: 5, scene: 'vignette' },
        ];
      }
      return [
        { x: 0, y: 0, w, h: h * 0.44, slot: 0, scene: 'hero', hero: true },
        ...storyBlock(0, h * 0.44, w, h * 0.38, ['skyline', 'beach', 'street', 'vignette'], 1),
        { x: 0, y: h * 0.82, w, h: h * 0.18, slot: 5, scene: 'car' },
      ];
    },
  },
  {
    id: 'five-vert',
    name: 'Vice Strip',
    blurb: 'Five unequal slices, one moment each — the classic strip cover.',
    panels(w, h) {
      const weights = [22, 16, 30, 18, 14];
      const scenes = ['beach', 'car', 'hero', 'street', 'skyline'];
      // Five vertical columns of unequal width (the classic strip). Columns
      // suit a portrait photo far better than short horizontal bands: the head
      // fits cleanly and the car vignette stays small instead of towering over
      // the panel and covering the face.
      return slice(0, 0, w, h, weights, scenes, 'x', 0).map((p, i) => ({ ...p, hero: i === 2 }));
    },
  },
  {
    id: 'triptych',
    name: 'Triptych',
    blurb: 'A wide hero framed by two tall sides split in two, plus a footer.',
    panels(w, h) {
      return [
        { x: w * 0.26, y: 0, w: w * 0.48, h: h * 0.8, slot: 0, scene: 'hero', hero: true },
        { x: 0, y: 0, w: w * 0.26, h: h * 0.52, slot: 1, scene: 'skyline' },
        { x: 0, y: h * 0.52, w: w * 0.26, h: h * 0.48, slot: 2, scene: 'car' },
        { x: w * 0.74, y: 0, w: w * 0.26, h: h * 0.52, slot: 3, scene: 'beach' },
        { x: w * 0.74, y: h * 0.52, w: w * 0.26, h: h * 0.48, slot: 4, scene: 'street' },
        { x: w * 0.26, y: h * 0.8, w: w * 0.48, h: h * 0.2, slot: 5, scene: 'vignette' },
      ];
    },
  },
  {
    id: 'quad',
    name: 'Comic Quad',
    blurb: 'A dominant hero corner with five unequal story panels around it.',
    panels(w, h) {
      return [
        { x: 0, y: 0, w: w * 0.6, h: h * 0.66, slot: 0, scene: 'hero', hero: true },
        { x: w * 0.6, y: 0, w: w * 0.4, h: h * 0.34, slot: 1, scene: 'skyline' },
        { x: w * 0.6, y: h * 0.34, w: w * 0.4, h: h * 0.32, slot: 2, scene: 'street' },
        { x: 0, y: h * 0.66, w: w * 0.34, h: h * 0.34, slot: 3, scene: 'car' },
        { x: w * 0.34, y: h * 0.66, w: w * 0.26, h: h * 0.34, slot: 4, scene: 'vignette' },
        { x: w * 0.6, y: h * 0.66, w: w * 0.4, h: h * 0.34, slot: 5, scene: 'beach' },
      ];
    },
  },
  {
    id: 'cinema',
    name: 'Cinema Strip',
    blurb: 'A widescreen hero between a top duo and a bottom trio of stills.',
    panels(w, h) {
      return [
        { x: 0, y: h * 0.26, w, h: h * 0.5, slot: 0, scene: 'hero', hero: true },
        { x: 0, y: 0, w: w * 0.62, h: h * 0.26, slot: 1, scene: 'skyline' },
        { x: w * 0.62, y: 0, w: w * 0.38, h: h * 0.26, slot: 2, scene: 'vignette' },
        ...slice(0, h * 0.76, w, h * 0.24, [44, 30, 26], ['car', 'beach', 'street'], 'x', 3),
      ];
    },
  },
];

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}

/**
 * Fresh crops for a layout: photos round-robin by slot, zoom 1, centred pan.
 * These are face-safe by construction — computeFrame() protects the head even
 * at zoom 1, so a brand-new layout never opens with a cut face.
 */
export function defaultEdits(layout, photoCount) {
  const n = Math.max(1, photoCount);
  return layout.panels(1000, 1000).map((p) => ({
    photo: p.slot % n,
    zoom: 1,
    panX: 0,
    panY: 0,
  }));
}