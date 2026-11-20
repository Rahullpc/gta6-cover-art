// layouts.js — the six poster tilings.
// Every tiling obeys one contract: the panels cover the sheet exactly
// (shared edge coordinates, so no gaps and no overlaps), the hero slot owns
// roughly half the area, and each panel carries a scene tag the renderer
// turns into vector action. All positions are fractions of sheet width/height.

function P(x, y, w, h, tag) { return { x, y, w, h, tag }; }
const wide = (W, H) => W / H > 1.2;

export const LAYOUTS = [
  {
    id: 'sunsetHero', name: 'Sunset Hero',
    panels(W, H) {
      if (wide(W, H)) {
        return [
          P(0, 0, 0.64, 0.66, 'hero'),
          P(0.64, 0, 0.36, 0.36, 'skyline'),
          P(0.64, 0.36, 0.36, 0.30, 'vignette'),
          P(0, 0.66, 0.5333, 0.34, 'beach'),
          P(0.5333, 0.66, 0.4667, 0.34, 'street'),
        ];
      }
      return [
        P(0, 0, 1, 0.46, 'hero'),
        P(0, 0.46, 0.56, 0.26, 'skyline'),
        P(0.56, 0.46, 0.44, 0.26, 'vignette'),
        P(0, 0.72, 0.5333, 0.28, 'beach'),
        P(0.5333, 0.72, 0.4667, 0.28, 'street'),
      ];
    },
  },
  {
    id: 'gridHero', name: 'Grid + Hero',
    panels(W, H) {
      if (wide(W, H)) {
        return [
          P(0.5, 0, 0.5, 1, 'hero'),
          P(0, 0, 0.28, 0.41, 'beach'),
          P(0.28, 0, 0.22, 0.41, 'street'),
          P(0, 0.41, 0.28, 0.35, 'skyline'),
          P(0.28, 0.41, 0.22, 0.35, 'car'),
          P(0, 0.76, 0.5, 0.24, 'vignette'),
        ];
      }
      return [
        P(0, 0, 1, 0.44, 'hero'),
        P(0, 0.44, 0.5, 0.19, 'skyline'),
        P(0.5, 0.44, 0.5, 0.19, 'beach'),
        P(0, 0.63, 0.5, 0.19, 'street'),
        P(0.5, 0.63, 0.5, 0.19, 'vignette'),
        P(0, 0.82, 1, 0.18, 'car'),
      ];
    },
  },
  {
    id: 'viceStrip', name: 'Vice Strip',
    panels(W, H) {
      // Five unequal vertical slices, ratio 22:16:30:18:14; middle is hero.
      const cuts = [0, 0.22, 0.38, 0.68, 0.86, 1];
      const tags = ['beach', 'car', 'hero', 'street', 'skyline'];
      return cuts.slice(0, 5).map((x0, i) => P(x0, 0, cuts[i + 1] - x0, 1, tags[i]));
    },
  },
  {
    id: 'triptych', name: 'Triptych',
    panels(W, H) {
      return [
        P(0.26, 0, 0.48, 0.8, 'hero'),
        P(0, 0, 0.26, 0.52, 'skyline'),
        P(0, 0.52, 0.26, 0.48, 'car'),
        P(0.74, 0, 0.26, 0.52, 'beach'),
        P(0.74, 0.52, 0.26, 0.48, 'street'),
        P(0.26, 0.8, 0.48, 0.2, 'vignette'),
      ];
    },
  },
  {
    id: 'comicQuad', name: 'Comic Quad',
    panels(W, H) {
      return [
        P(0, 0, 0.6, 0.66, 'hero'),
        P(0.6, 0, 0.4, 0.34, 'skyline'),
        P(0.6, 0.34, 0.4, 0.32, 'street'),
        P(0, 0.66, 0.34, 0.34, 'car'),
        P(0.34, 0.66, 0.26, 0.34, 'vignette'),
        P(0.6, 0.66, 0.4, 0.34, 'beach'),
      ];
    },
  },
  {
    id: 'cinema', name: 'Cinema Strip',
    panels(W, H) {
      // Slot order is hero first, like every other layout: the concept
      // crops list the hero first, then the top duo, then the bottom trio.
      return [
        P(0, 0.26, 1, 0.5, 'hero'),
        P(0, 0, 0.62, 0.26, 'skyline'),
        P(0.62, 0, 0.38, 0.26, 'vignette'),
        P(0, 0.76, 0.44, 0.24, 'car'),
        P(0.44, 0.76, 0.30, 0.24, 'beach'),
        P(0.74, 0.76, 0.26, 0.24, 'street'),
      ];
    },
  },
];

export function layoutById(id) {
  return LAYOUTS.find(l => l.id === id) || LAYOUTS[0];
}

// Pixel rectangles for a layout at a concrete sheet size.
export function layoutPanels(layout, W, H) {
  return layout.panels(W, H).map((p, i) => ({
    index: i,
    tag: p.tag,
    x: p.x * W, y: p.y * H, w: p.w * W, h: p.h * H,
  }));
}
