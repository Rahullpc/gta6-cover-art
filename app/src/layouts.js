// layouts.js — the six comic-poster layouts, v2 edition.
//
// Design rules carried over from v2:
//   * panels tile the cover EXACTLY — neighbouring edges sit on shared lines,
//     so there are no gaps and no overlaps anywhere;
//   * 5-6 panels of deliberately unequal size, never an even grid;
//   * slot 0 is always the hero and owns roughly 40-50% of the area, so the
//     cover reads within two seconds;
//   * each panel carries a `scene` tag that tells the renderer which vector
//     action to ink over the graded photo;
//   * borders stay straight and crisp (v1's jittered corners are gone) — the
//     asymmetry comes from the panel sizes, not from crooked lines.

const isWide = (w, h) => w / h > 1.2;

// Partition a rect along one axis by uneven weights. Consecutive panels share
// exact edge coordinates, which is what keeps the tiling gap-free.
function cutAxis(x, y, w, h, weights, scenes, axis, firstSlot) {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const out = [];
  let cursor = axis === 'x' ? x : y;
  weights.forEach((weight, i) => {
    const span = ((axis === 'x' ? w : h) * weight) / totalWeight;
    out.push({
      slot: firstSlot + i,
      scene: scenes[i],
      x: axis === 'x' ? cursor : x,
      y: axis === 'x' ? y : cursor,
      w: axis === 'x' ? span : w,
      h: axis === 'x' ? h : span,
    });
    cursor += span;
  });
  return out;
}

// An uneven 2x2 story block: unequal column widths AND row heights, so it
// never reads as a plain grid.
function unevenQuad(x, y, w, h, scenes, firstSlot) {
  const colW = [w * 0.56, w * 0.44];
  const rowH = [h * 0.54, h * 0.46];
  const out = [];
  let yy = y;
  for (let r = 0; r < 2; r++) {
    let xx = x;
    for (let c = 0; c < 2; c++) {
      out.push({
        slot: firstSlot + r * 2 + c,
        scene: scenes[r * 2 + c],
        x: xx,
        y: yy,
        w: colW[c],
        h: rowH[r],
      });
      xx += colW[c];
    }
    yy += rowH[r];
  }
  return out;
}

export const LAYOUTS = [
  {
    id: 'sunset-hero',
    name: 'Sunset Hero',
    blurb: 'Big hero top-left, skyline + vignette right, a car / beach / street strip below.',
    panels(w, h) {
      if (isWide(w, h)) {
        return [
          { slot: 0, scene: 'hero', hero: true, x: 0, y: 0, w: w * 0.64, h: h * 0.66 },
          { slot: 1, scene: 'skyline', x: w * 0.64, y: 0, w: w * 0.36, h: h * 0.36 },
          { slot: 2, scene: 'vignette', x: w * 0.64, y: h * 0.36, w: w * 0.36, h: h * 0.3 },
          ...cutAxis(0, h * 0.66, w, h * 0.34, [40, 32, 28], ['car', 'beach', 'street'], 'x', 3),
        ];
      }
      return [
        { slot: 0, scene: 'hero', hero: true, x: 0, y: 0, w, h: h * 0.46 },
        { slot: 1, scene: 'skyline', x: 0, y: h * 0.46, w: w * 0.56, h: h * 0.26 },
        { slot: 2, scene: 'vignette', x: w * 0.56, y: h * 0.46, w: w * 0.44, h: h * 0.26 },
        ...cutAxis(0, h * 0.72, w, h * 0.28, [40, 32, 28], ['car', 'beach', 'street'], 'x', 3),
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
          { slot: 0, scene: 'hero', hero: true, x: w * 0.5, y: 0, w: w * 0.5, h },
          ...unevenQuad(0, 0, w * 0.5, h * 0.76, ['beach', 'street', 'skyline', 'car'], 1),
          { slot: 5, scene: 'vignette', x: 0, y: h * 0.76, w: w * 0.5, h: h * 0.24 },
        ];
      }
      return [
        { slot: 0, scene: 'hero', hero: true, x: 0, y: 0, w, h: h * 0.44 },
        ...unevenQuad(0, h * 0.44, w, h * 0.38, ['skyline', 'beach', 'street', 'vignette'], 1),
        { slot: 5, scene: 'car', x: 0, y: h * 0.82, w, h: h * 0.18 },
      ];
    },
  },
  {
    id: 'five-vert',
    name: 'Vice Strip',
    blurb: 'Five unequal slices, one moment each — the classic strip cover.',
    panels(w, h) {
      // Five vertical columns of unequal width. Columns suit a portrait photo
      // far better than short horizontal bands: the head fits cleanly and the
      // car vignette stays small instead of towering over the face.
      const weights = [22, 16, 30, 18, 14];
      const scenes = ['beach', 'car', 'hero', 'street', 'skyline'];
      return cutAxis(0, 0, w, h, weights, scenes, 'x', 0).map((p, i) => ({ ...p, hero: i === 2 }));
    },
  },
  {
    id: 'triptych',
    name: 'Triptych',
    blurb: 'A wide hero framed by two tall sides split in two, plus a footer.',
    panels(w, h) {
      return [
        { slot: 0, scene: 'hero', hero: true, x: w * 0.26, y: 0, w: w * 0.48, h: h * 0.8 },
        { slot: 1, scene: 'skyline', x: 0, y: 0, w: w * 0.26, h: h * 0.52 },
        { slot: 2, scene: 'car', x: 0, y: h * 0.52, w: w * 0.26, h: h * 0.48 },
        { slot: 3, scene: 'beach', x: w * 0.74, y: 0, w: w * 0.26, h: h * 0.52 },
        { slot: 4, scene: 'street', x: w * 0.74, y: h * 0.52, w: w * 0.26, h: h * 0.48 },
        { slot: 5, scene: 'vignette', x: w * 0.26, y: h * 0.8, w: w * 0.48, h: h * 0.2 },
      ];
    },
  },
  {
    id: 'quad',
    name: 'Comic Quad',
    blurb: 'A dominant hero corner with five unequal story panels around it.',
    panels(w, h) {
      return [
        { slot: 0, scene: 'hero', hero: true, x: 0, y: 0, w: w * 0.6, h: h * 0.66 },
        { slot: 1, scene: 'skyline', x: w * 0.6, y: 0, w: w * 0.4, h: h * 0.34 },
        { slot: 2, scene: 'street', x: w * 0.6, y: h * 0.34, w: w * 0.4, h: h * 0.32 },
        { slot: 3, scene: 'car', x: 0, y: h * 0.66, w: w * 0.34, h: h * 0.34 },
        { slot: 4, scene: 'vignette', x: w * 0.34, y: h * 0.66, w: w * 0.26, h: h * 0.34 },
        { slot: 5, scene: 'beach', x: w * 0.6, y: h * 0.66, w: w * 0.4, h: h * 0.34 },
      ];
    },
  },
  {
    id: 'cinema',
    name: 'Cinema Strip',
    blurb: 'A widescreen hero between a top duo and a bottom trio of stills.',
    panels(w, h) {
      return [
        { slot: 0, scene: 'hero', hero: true, x: 0, y: h * 0.26, w, h: h * 0.5 },
        { slot: 1, scene: 'skyline', x: 0, y: 0, w: w * 0.62, h: h * 0.26 },
        { slot: 2, scene: 'vignette', x: w * 0.62, y: 0, w: w * 0.38, h: h * 0.26 },
        ...cutAxis(0, h * 0.76, w, h * 0.24, [44, 30, 26], ['car', 'beach', 'street'], 'x', 3),
      ];
    },
  },
];

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}

/**
 * Fresh crops for a layout: photos round-robin by slot, zoom 1, centred pan.
 * Face-safe by construction — computeFrame() protects the head even at zoom 1,
 * so switching to a brand-new layout never opens on a cut face.
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
