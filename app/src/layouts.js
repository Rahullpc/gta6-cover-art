// layouts.js — six comic-poster tilings (v3, geometry unchanged from v2).
//
// Rules the tilings keep:
//   * panels tile the cover exactly — neighbours share edge coordinates, so
//     there are no gaps and no overlaps;
//   * 5-6 deliberately unequal panels, never an even grid;
//   * slot 0 is the hero and owns ~40-50% of the area so the cover reads fast;
//   * every panel carries a `scene` tag telling the renderer which vector action
//     to ink over the graded photo;
//   * borders stay straight and crisp — asymmetry comes from panel sizes.
//
// The tilings are built from three combinators (a single slab, a weighted axis
// split, and an uneven 2x2 block) so each layout reads as a short composition.

const isWide = (w, h) => w / h > 1.2;

// One panel slab. `hero` marks the dominant face panel for the framing anchor.
const slab = (slot, scene, x, y, w, h, hero = false) => ({ slot, scene, x, y, w, h, hero });

// Split a rect along one axis by uneven weights; consecutive slabs share exact
// edge coordinates, which is what keeps the tiling gap-free.
function splitAxis(x, y, w, h, weights, scenes, axis, firstSlot) {
  const total = weights.reduce((a, b) => a + b, 0);
  const out = [];
  let cursor = axis === 'x' ? x : y;
  weights.forEach((weight, i) => {
    const span = ((axis === 'x' ? w : h) * weight) / total;
    out.push(
      axis === 'x'
        ? slab(firstSlot + i, scenes[i], cursor, y, span, h)
        : slab(firstSlot + i, scenes[i], x, cursor, w, span),
    );
    cursor += span;
  });
  return out;
}

// An uneven 2x2 story block: unequal column widths AND row heights, so it never
// reads as a plain grid. Slots run row-major from firstSlot.
function quadBlock(x, y, w, h, scenes, firstSlot) {
  const colW = [w * 0.56, w * 0.44];
  const rowH = [h * 0.54, h * 0.46];
  const out = [];
  let yy = y;
  for (let r = 0; r < 2; r++) {
    let xx = x;
    for (let c = 0; c < 2; c++) {
      out.push(slab(firstSlot + r * 2 + c, scenes[r * 2 + c], xx, yy, colW[c], rowH[r]));
      xx += colW[c];
    }
    yy += rowH[r];
  }
  return out;
}

// The bottom action strip shared by the hero layouts: car / beach / street.
const actionStrip = (y, h, w, weights, firstSlot) =>
  splitAxis(0, y, w, h, weights, ['car', 'beach', 'street'], 'x', firstSlot);

export const LAYOUTS = [
  {
    id: 'sunset-hero',
    name: 'Sunset Hero',
    blurb: 'Big hero top-left, skyline + vignette right, a car / beach / street strip below.',
    panels(w, h) {
      if (isWide(w, h)) {
        return [
          slab(0, 'hero', 0, 0, w * 0.64, h * 0.66, true),
          slab(1, 'skyline', w * 0.64, 0, w * 0.36, h * 0.36),
          slab(2, 'vignette', w * 0.64, h * 0.36, w * 0.36, h * 0.3),
          ...actionStrip(h * 0.66, h * 0.34, w, [40, 32, 28], 3),
        ];
      }
      return [
        slab(0, 'hero', 0, 0, w, h * 0.46, true),
        slab(1, 'skyline', 0, h * 0.46, w * 0.56, h * 0.26),
        slab(2, 'vignette', w * 0.56, h * 0.46, w * 0.44, h * 0.26),
        ...actionStrip(h * 0.72, h * 0.28, w, [40, 32, 28], 3),
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
          slab(0, 'hero', w * 0.5, 0, w * 0.5, h, true),
          ...quadBlock(0, 0, w * 0.5, h * 0.76, ['beach', 'street', 'skyline', 'car'], 1),
          slab(5, 'vignette', 0, h * 0.76, w * 0.5, h * 0.24),
        ];
      }
      return [
        slab(0, 'hero', 0, 0, w, h * 0.44, true),
        ...quadBlock(0, h * 0.44, w, h * 0.38, ['skyline', 'beach', 'street', 'vignette'], 1),
        slab(5, 'car', 0, h * 0.82, w, h * 0.18),
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
      const scenes = ['beach', 'car', 'hero', 'street', 'skyline'];
      return splitAxis(0, 0, w, h, [22, 16, 30, 18, 14], scenes, 'x', 0).map((p, i) =>
        i === 2 ? { ...p, hero: true } : p,
      );
    },
  },
  {
    id: 'triptych',
    name: 'Triptych',
    blurb: 'A wide hero framed by two tall sides split in two, plus a footer.',
    panels(w, h) {
      return [
        slab(0, 'hero', w * 0.26, 0, w * 0.48, h * 0.8, true),
        slab(1, 'skyline', 0, 0, w * 0.26, h * 0.52),
        slab(2, 'car', 0, h * 0.52, w * 0.26, h * 0.48),
        slab(3, 'beach', w * 0.74, 0, w * 0.26, h * 0.52),
        slab(4, 'street', w * 0.74, h * 0.52, w * 0.26, h * 0.48),
        slab(5, 'vignette', w * 0.26, h * 0.8, w * 0.48, h * 0.2),
      ];
    },
  },
  {
    id: 'quad',
    name: 'Comic Quad',
    blurb: 'A dominant hero corner with five unequal story panels around it.',
    panels(w, h) {
      return [
        slab(0, 'hero', 0, 0, w * 0.6, h * 0.66, true),
        slab(1, 'skyline', w * 0.6, 0, w * 0.4, h * 0.34),
        slab(2, 'street', w * 0.6, h * 0.34, w * 0.4, h * 0.32),
        slab(3, 'car', 0, h * 0.66, w * 0.34, h * 0.34),
        slab(4, 'vignette', w * 0.34, h * 0.66, w * 0.26, h * 0.34),
        slab(5, 'beach', w * 0.6, h * 0.66, w * 0.4, h * 0.34),
      ];
    },
  },
  {
    id: 'cinema',
    name: 'Cinema Strip',
    blurb: 'A widescreen hero between a top duo and a bottom trio of stills.',
    panels(w, h) {
      return [
        slab(0, 'hero', 0, h * 0.26, w, h * 0.5, true),
        slab(1, 'skyline', 0, 0, w * 0.62, h * 0.26),
        slab(2, 'vignette', w * 0.62, 0, w * 0.38, h * 0.26),
        ...actionStrip(h * 0.76, h * 0.24, w, [44, 30, 26], 3),
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
  return layout.panels(1000, 1000).map((p) => ({ photo: p.slot % n, zoom: 1, panX: 0, panY: 0 }));
}
