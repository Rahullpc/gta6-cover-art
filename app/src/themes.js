// Vice Nights: Diagonal Split — the four cover themes.
//
// Every cover is ONE full-bleed photo cut by a single diagonal into two
// zones: a photo zone and a solid colour zone that carries the title.
// The diagonal's side and lean are different per theme, and the colour
// zone is always placed where the photo's face is not, so no face is
// ever cut by the split. No birds, no skyline, no badge — the diagonal
// itself is the poster's identity.

export const SIZES = [
  { id: 'square', label: '1080 × 1080', w: 1080, h: 1080 },
  { id: 'portrait', label: '1080 × 1350', w: 1080, h: 1350 },
  { id: 'wide', label: '1920 × 1080', w: 1920, h: 1080 },
];

export const PHOTOS = [
  { id: 'boulevard', file: 'samples/boulevard.jpg', label: 'Boulevard' },
  { id: 'pier', file: 'samples/pier.jpg', label: 'Pier' },
  { id: 'porsche', file: 'samples/porsche.jpg', label: 'Porsche' },
  { id: 'summer', file: 'samples/summer.jpg', label: 'Summer' },
];

// focus: the face, as a fraction of the photo (x, y). The renderer
// anchors the photo so this point lands in the middle of the photo zone.
// box: the face box, same units — the framing check uses it to prove
// the face is fully visible and outside the colour zone.
export const THEMES = [
  {
    id: 'sunset-strip',
    name: 'Sunset Strip',
    photo: 'boulevard',
    title: 'SUNSET\nSTRIP',
    subtitle: 'A VICE CITY STORY',
    tagline: 'Boulevard Queen',
    focus: { x: 0.52, y: 0.16 },
    box: { x0: 0.43, y0: 0.08, x1: 0.63, y1: 0.25 },
    // Bottom split, rising left -> right. The colour zone is everything
    // below the diagonal; the face sits in the photo zone above it.
    split: { side: 'bottom', lean: 0.12, at: 0.74 },
    colours: { from: '#ff7a18', to: '#e5326e', seam: '#ffd23e', title: '#ffffff', sub: '#ffd23e', bar: '#ffd23e' },
    target: { x: 0.5, y: 0.30 },
  },
  {
    id: 'neon-tide',
    name: 'Neon Tide',
    photo: 'pier',
    title: 'NEON\nTIDE',
    subtitle: 'A VICE CITY STORY',
    tagline: 'Reel It In',
    focus: { x: 0.42, y: 0.20 },
    box: { x0: 0.32, y0: 0.10, x1: 0.54, y1: 0.32 },
    // Bottom split, falling left -> right (mirrors Sunset Strip).
    split: { side: 'bottom', lean: -0.12, at: 0.60 },
    colours: { from: '#00c2a8', to: '#0b3d91', seam: '#37f4ff', title: '#ffffff', sub: '#37f4ff', bar: '#37f4ff' },
    target: { x: 0.5, y: 0.30 },
  },
  {
    id: 'night-drive',
    name: 'Night Drive',
    photo: 'porsche',
    title: 'NIGHT\nDRIVE',
    subtitle: 'A VICE CITY STORY',
    tagline: 'Keys In Hand',
    focus: { x: 0.65, y: 0.18 },
    box: { x0: 0.60, y0: 0.12, x1: 0.70, y1: 0.26 },
    // Left split, leaning right as it falls. The colour zone is the
    // left slice; the car and the face live in the photo zone right.
    split: { side: 'left', lean: 0.08, at: 0.40 },
    colours: { from: '#7b2ff7', to: '#1b1040', seam: '#c77dff', title: '#ffffff', sub: '#c77dff', bar: '#c77dff' },
    target: { x: 0.72, y: 0.42 },
  },
  {
    id: 'vice-lights',
    name: 'Vice Lights',
    photo: 'summer',
    title: 'VICE\nLIGHTS',
    subtitle: 'A VICE CITY STORY',
    tagline: 'Summer 96',
    focus: { x: 0.68, y: 0.17 },
    box: { x0: 0.61, y0: 0.07, x1: 0.76, y1: 0.28 },
    // Left split, leaning left as it falls (mirrors Night Drive).
    split: { side: 'left', lean: -0.08, at: 0.40 },
    colours: { from: '#ff4d9d', to: '#6a1fb5', seam: '#ff8fd1', title: '#ffffff', sub: '#ff8fd1', bar: '#ff8fd1' },
    target: { x: 0.72, y: 0.42 },
  },
];

export function themeById(id) {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function photoById(id) {
  return PHOTOS.find((p) => p.id === id) ?? PHOTOS[0];
}

// The diagonal as two canvas points, for a poster of size W x H.
// bottom: from (0, at*H) to (W, at*H - lean*W) — lean>0 rises to the right.
// left:   from (at*W, 0) to (at*W + lean*W, H) — lean>0 leans right going down.
export function diagonal(theme, W, H) {
  const s = theme.split;
  if (s.side === 'bottom') {
    return { ax: 0, ay: s.at * H, bx: W, by: s.at * H - s.lean * W };
  }
  return { ax: s.at * W, ay: 0, bx: s.at * W + s.lean * W, by: H };
}

// The colour zone as a polygon (canvas points, clockwise).
export function zonePolygon(theme, W, H) {
  const d = diagonal(theme, W, H);
  if (theme.split.side === 'bottom') {
    return [
      { x: d.ax, y: d.ay },
      { x: d.bx, y: d.by },
      { x: W, y: H },
      { x: 0, y: H },
    ];
  }
  return [
    { x: 0, y: 0 },
    { x: d.ax, y: d.ay },
    { x: d.bx, y: d.by },
    { x: 0, y: H },
  ];
}

// The diagonal's slant in radians, for rotating the title to ride it.
// bottom: the line's angle from horizontal. left: from vertical.
export function slant(theme, W, H) {
  const d = diagonal(theme, W, H);
  if (theme.split.side === 'bottom') {
    return Math.atan2(d.by - d.ay, d.bx - d.ax);
  }
  return Math.atan2(d.bx - d.ax, d.by - d.ay);
}

// Where the title block is anchored (canvas fractions), and how wide
// it may run before the type shrinks to fit. For a bottom split the
// anchor's y is worked out by the renderer, which centres the block
// inside the colour zone at this x; for a left split the block is
// centred on this point.
export function titleAnchor(theme, W, H) {
  if (theme.split.side === 'bottom') {
    return { x: 0.5 * W, maxW: 0.86 * W, rot: slant(theme, W, H) };
  }
  return { x: 0.21 * W, y: 0.46 * H, maxW: 0.36 * W, rot: -slant(theme, W, H) };
}
