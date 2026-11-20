// layouts.js — the six poster tilings for Vice Cover Studio v26.
// Every tiling obeys one contract: the panels cover the sheet exactly
// (shared edge coordinates, so no gaps and no overlaps), the hero slot
// owns roughly half the area, and each panel carries a scene tag the
// renderer turns into vector action. All positions are fractions of
// sheet width/height.

function slot(x, y, w, h, tag) { return { x, y, w, h, tag }; }
const isWide = (W, H) => W / H > 1.2;

export const TILINGS = [
  {
    id: 'sunsetHero', name: 'Sunset Hero',
    panels(W, H) {
      if (isWide(W, H)) {
        return [
          slot(0, 0, 0.64, 0.66, 'hero'),
          slot(0.64, 0, 0.36, 0.36, 'skyline'),
          slot(0.64, 0.36, 0.36, 0.30, 'vignette'),
          slot(0, 0.66, 0.5333, 0.34, 'beach'),
          slot(0.5333, 0.66, 0.4667, 0.34, 'street'),
        ];
      }
      return [
        slot(0, 0, 1, 0.46, 'hero'),
        slot(0, 0.46, 0.56, 0.26, 'skyline'),
        slot(0.56, 0.46, 0.44, 0.26, 'vignette'),
        slot(0, 0.72, 0.5333, 0.28, 'beach'),
        slot(0.5333, 0.72, 0.4667, 0.28, 'street'),
      ];
    },
  },
  {
    id: 'gridHero', name: 'Grid + Hero',
    panels(W, H) {
      if (isWide(W, H)) {
        return [
          slot(0.5, 0, 0.5, 1, 'hero'),
          slot(0, 0, 0.28, 0.41, 'beach'),
          slot(0.28, 0, 0.22, 0.41, 'street'),
          slot(0, 0.41, 0.28, 0.35, 'skyline'),
          slot(0.28, 0.41, 0.22, 0.35, 'car'),
          slot(0, 0.76, 0.5, 0.24, 'vignette'),
        ];
      }
      return [
        slot(0, 0, 1, 0.44, 'hero'),
        slot(0, 0.44, 0.5, 0.19, 'skyline'),
        slot(0.5, 0.44, 0.5, 0.19, 'beach'),
        slot(0, 0.63, 0.5, 0.19, 'street'),
        slot(0.5, 0.63, 0.5, 0.19, 'vignette'),
        slot(0, 0.82, 1, 0.18, 'car'),
      ];
    },
  },
  {
    id: 'viceStrip', name: 'Vice Strip',
    panels(W, H) {
      // Five unequal vertical slices, ratio 22:16:30:18:14; middle is hero.
      const cuts = [0, 0.22, 0.38, 0.68, 0.86, 1];
      const tags = ['beach', 'car', 'hero', 'street', 'skyline'];
      return cuts.slice(0, 5).map((x0, i) => slot(x0, 0, cuts[i + 1] - x0, 1, tags[i]));
    },
  },
  {
    id: 'triptych', name: 'Triptych',
    panels(W, H) {
      return [
        slot(0.26, 0, 0.48, 0.8, 'hero'),
        slot(0, 0, 0.26, 0.52, 'skyline'),
        slot(0, 0.52, 0.26, 0.48, 'car'),
        slot(0.74, 0, 0.26, 0.52, 'beach'),
        slot(0.74, 0.52, 0.26, 0.48, 'street'),
        slot(0.26, 0.8, 0.48, 0.2, 'vignette'),
      ];
    },
  },
  {
    id: 'comicQuad', name: 'Comic Quad',
    panels(W, H) {
      return [
        slot(0, 0, 0.6, 0.66, 'hero'),
        slot(0.6, 0, 0.4, 0.34, 'skyline'),
        slot(0.6, 0.34, 0.4, 0.32, 'street'),
        slot(0, 0.66, 0.34, 0.34, 'car'),
        slot(0.34, 0.66, 0.26, 0.34, 'vignette'),
        slot(0.6, 0.66, 0.4, 0.34, 'beach'),
      ];
    },
  },
  {
    id: 'cinema', name: 'Cinema Strip',
    panels(W, H) {
      // Slot order is hero first, like every other tiling: the concept
      // crops list the hero first, then the top duo, then the bottom trio.
      return [
        slot(0, 0.26, 1, 0.5, 'hero'),
        slot(0, 0, 0.62, 0.26, 'skyline'),
        slot(0.62, 0, 0.38, 0.26, 'vignette'),
        slot(0, 0.76, 0.44, 0.24, 'car'),
        slot(0.44, 0.76, 0.30, 0.24, 'beach'),
        slot(0.74, 0.76, 0.26, 0.24, 'street'),
      ];
    },
  },
];

export function tilingById(id) {
  return TILINGS.find(l => l.id === id) || TILINGS[0];
}

// Pixel rectangles for a tiling at a concrete sheet size.
export function panelRects(tiling, W, H) {
  return tiling.panels(W, H).map((p, i) => ({
    index: i,
    tag: p.tag,
    x: p.x * W, y: p.y * H, w: p.w * W, h: p.h * H,
  }));
}
