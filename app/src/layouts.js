// layouts.js — the poster tilings for Vice Cover Studio (v6, geometry unchanged
// from v4/v5).
//
// Every tiling obeys the same contract: panels cover the sheet exactly (shared
// edge coordinates, so no gaps and no overlaps), the hero slot owns roughly
// half the area, and each panel carries a scene tag the renderer turns into
// vector action. Borders stay straight; the asymmetry lives in panel sizes.
//
// The v4 geometry holds: Sunset Hero's bottom strip is beach + street only
// (weights 32:28, the old shares renormalised after the car panel was removed),
// so the beach photo extends left into the freed space. Cinema keeps its
// three-panel car/beach/street strip. v6 changes no coordinates — the skyline
// buildings were removed renderer-side; the `skyline` scene tag still marks
// those panels, which now show only their graded photo plus sky art.
//
// Building blocks: a panel record, a weighted axis run, an uneven 2x2 story
// block, and a fraction-table helper for the fixed compositions.

const isWide = (w, h) => w / h > 1.2;

function panel(slot, scene, x, y, w, h, hero) {
  return { slot, scene, x, y, w, h, hero: !!hero };
}

// Fixed compositions are declared as fraction tables [slot, scene, fx, fy, fw,
// fh, hero?] and scaled to the sheet here. Multiplying fraction-first keeps the
// arithmetic commutative with the old width-first form.
function fromFractions(specs, w, h) {
  return specs.map(([slot, scene, fx, fy, fw, fh, hero]) =>
    panel(slot, scene, fx * w, fy * h, fw * w, fh * h, hero));
}

// Weighted run along one axis. Spans are computed first, then laid end to end
// from the rect's origin; consecutive panels share exact edge coordinates.
function axisRun(rect, weights, scenes, axis, firstSlot) {
  const total = weights.reduce((a, b) => a + b, 0);
  const along = axis === 'x' ? rect.w : rect.h;
  const spans = weights.map((wt) => (along * wt) / total);
  const origin = axis === 'x' ? rect.x : rect.y;
  const starts = spans.map((_, i) => spans.slice(0, i).reduce((a, b) => a + b, origin));
  return scenes.map((scene, i) => {
    const slot = firstSlot + i;
    return axis === 'x'
      ? panel(slot, scene, starts[i], rect.y, spans[i], rect.h)
      : panel(slot, scene, rect.x, starts[i], rect.w, spans[i]);
  });
}

// Uneven 2x2 story block: unequal columns AND rows, row-major slot numbering.
function storyQuad(x, y, w, h, scenes, firstSlot) {
  const cols = [w * 0.56, w * 0.44];
  const rows = [h * 0.54, h * 0.46];
  const cells = [];
  for (const r of [0, 1]) {
    for (const c of [0, 1]) cells.push([r, c]);
  }
  return cells.map(([r, c]) => {
    const px = x + (c ? cols[0] : 0);
    const py = y + (r ? rows[0] : 0);
    return panel(firstSlot + r * 2 + c, scenes[r * 2 + c], px, py, cols[c], rows[r]);
  });
}

// The Sunset Hero action strip — beach then street, no car (v4). Weights 32:28
// are the old beach:street shares renormalised over the full width.
const beachStreetStrip = (top, tall, w) =>
  axisRun({ x: 0, y: top, w, h: tall }, [32, 28], ['beach', 'street'], 'x', 3);

// The three-panel car/beach/street strip still used by the Cinema layout.
const cinemaStrip = (top, tall, w) =>
  axisRun({ x: 0, y: top, w, h: tall }, [44, 30, 26], ['car', 'beach', 'street'], 'x', 3);

export const LAYOUTS = [
  {
    id: 'sunset-hero',
    name: 'Sunset Hero',
    blurb: 'Dominant hero top-left, skyline and vignette on the right, beach + street strip below (no car panel).',
    panels(w, h) {
      if (isWide(w, h)) {
        const faces = fromFractions([
          [0, 'hero', 0, 0, 0.64, 0.66, true],
          [1, 'skyline', 0.64, 0, 0.36, 0.36],
          [2, 'vignette', 0.64, 0.36, 0.36, 0.3],
        ], w, h);
        return [...faces, ...beachStreetStrip(h * 0.66, h * 0.34, w)];
      }
      const faces = fromFractions([
        [0, 'hero', 0, 0, 1, 0.46, true],
        [1, 'skyline', 0, 0.46, 0.56, 0.26],
        [2, 'vignette', 0.56, 0.46, 0.44, 0.26],
      ], w, h);
      return [...faces, ...beachStreetStrip(h * 0.72, h * 0.28, w)];
    },
  },
  {
    id: 'grid-hero',
    name: 'Grid + Hero',
    blurb: 'Tall hero beside an uneven 2x2 story block, vignette footer underneath.',
    panels(w, h) {
      if (isWide(w, h)) {
        const hero = panel(0, 'hero', w * 0.5, 0, w * 0.5, h, true);
        const block = storyQuad(0, 0, w * 0.5, h * 0.76, ['beach', 'street', 'skyline', 'car'], 1);
        const footer = panel(5, 'vignette', 0, h * 0.76, w * 0.5, h * 0.24);
        return [hero, ...block, footer];
      }
      const hero = panel(0, 'hero', 0, 0, w, h * 0.44, true);
      const block = storyQuad(0, h * 0.44, w, h * 0.38, ['skyline', 'beach', 'street', 'vignette'], 1);
      const footer = panel(5, 'car', 0, h * 0.82, w, h * 0.18);
      return [hero, ...block, footer];
    },
  },
  {
    id: 'five-vert',
    name: 'Vice Strip',
    blurb: 'Five unequal vertical slices, one moment each — the classic strip cover.',
    panels(w, h) {
      // Columns suit portrait photos: heads fit cleanly and the car vignette
      // stays compact instead of towering over a face.
      const scenes = ['beach', 'car', 'hero', 'street', 'skyline'];
      const columns = axisRun({ x: 0, y: 0, w, h }, [22, 16, 30, 18, 14], scenes, 'x', 0);
      columns[2].hero = true;
      return columns;
    },
  },
  {
    id: 'triptych',
    name: 'Triptych',
    blurb: 'Wide central hero framed by two tall sides split in two, plus a footer.',
    panels(w, h) {
      return fromFractions([
        [0, 'hero', 0.26, 0, 0.48, 0.8, true],
        [1, 'skyline', 0, 0, 0.26, 0.52],
        [2, 'car', 0, 0.52, 0.26, 0.48],
        [3, 'beach', 0.74, 0, 0.26, 0.52],
        [4, 'street', 0.74, 0.52, 0.26, 0.48],
        [5, 'vignette', 0.26, 0.8, 0.48, 0.2],
      ], w, h);
    },
  },
  {
    id: 'quad',
    name: 'Comic Quad',
    blurb: 'A dominant hero corner with five unequal story panels around it.',
    panels(w, h) {
      return fromFractions([
        [0, 'hero', 0, 0, 0.6, 0.66, true],
        [1, 'skyline', 0.6, 0, 0.4, 0.34],
        [2, 'street', 0.6, 0.34, 0.4, 0.32],
        [3, 'car', 0, 0.66, 0.34, 0.34],
        [4, 'vignette', 0.34, 0.66, 0.26, 0.34],
        [5, 'beach', 0.6, 0.66, 0.4, 0.34],
      ], w, h);
    },
  },
  {
    id: 'cinema',
    name: 'Cinema Strip',
    blurb: 'Widescreen hero between a top duo and a bottom trio of stills.',
    panels(w, h) {
      const top = fromFractions([
        [0, 'hero', 0, 0.26, 1, 0.5, true],
        [1, 'skyline', 0, 0, 0.62, 0.26],
        [2, 'vignette', 0.62, 0, 0.38, 0.26],
      ], w, h);
      return [...top, ...cinemaStrip(h * 0.76, h * 0.24, w)];
    },
  },
];

export function layoutById(id) {
  return LAYOUTS.find((layout) => layout.id === id) ?? LAYOUTS[0];
}

/**
 * Fresh crops for a layout: photos round-robin by slot, zoom 1, centred pan.
 * Face-safe by construction — computeFrame() protects the head even at zoom 1,
 * so switching to a brand-new layout never opens on a cut face. The panel count
 * comes from the tiling itself, so it always matches the layout (Sunset Hero
 * yields five crops, not six).
 */
export function defaultEdits(layout, photoCount) {
  const n = Math.max(1, photoCount);
  return layout.panels(1000, 1000).map((p) => ({
    photo: p.slot % n, zoom: 1, panX: 0, panY: 0,
  }));
}
