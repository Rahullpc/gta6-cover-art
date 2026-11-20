// decor.js — the poster's vector art, all Canvas 2D and fully deterministic (v3).
//
// A seeded PRNG drives every scatter (stars, birds, windows, money, crowds) so the
// live preview and the exported PNG are pixel-identical. Each panel gets action:
// striped synthwave sun, palms, neon skyline, a sport car with tire smoke, a beach
// jetski, neon street signs with a crowd, helicopter / money / police / duffel
// vignettes, a tiny plane, halftone dots, film grain, crisp comic borders, badges.
//
// Borders are straight and uniform (neat, not jittered); hero decor is pinned to
// corners / the lower half so it never covers a face, which the framing engine
// seats in the upper third.
//
// v3 reorganises the art into a small drawing vocabulary plus per-scene helpers
// and data tables (the car body is a path-command table, scatters are loops over
// descriptors). The geometry, colours, seeds and composite order are unchanged,
// so the pixels match v2 exactly. Two single-path multi-arc fills (the halftone
// dot tile and the palm nuts) are kept verbatim — splitting them would shift the
// anti-aliasing by a sub-pixel.

const INK = '#0D001A';
const DISPLAY = '"Vice Display", "Arial Black", sans-serif';
const TAU = Math.PI * 2;

/** mulberry32 PRNG: same seed, same poster, every render. */
export function rng(seed) {
  let a = (seed >>> 0) || 1;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------- drawing vocabulary */

const disc = (c, x, y, r) => {
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.fill();
};
const ring = (c, x, y, r) => {
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.stroke();
};
const box = (c, x, y, w, h) => c.fillRect(x, y, w, h);
const seg = (c, x1, y1, x2, y2) => {
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x2, y2);
  c.stroke();
};
const trace = (c, build) => {
  c.beginPath();
  build(c);
  c.closePath();
  c.fill();
};

// A radial gradient fill helper used by the glows below.
function radial(c, x0, y0, r0, x1, y1, r1, stops) {
  const g = c.createRadialGradient(x0, y0, r0, x1, y1, r1);
  for (const [at, color] of stops) g.addColorStop(at, color);
  return g;
}

/* ------------------------------------------------------------------- sun */

// Cut the retro horizontal slits out of the lower half of the sun disc.
function cutSunSlits(c, mid, r, size) {
  c.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 7; i++) {
    box(c, 0, mid + r * (0.04 + i * 0.14), size, r * (0.03 + i * 0.022));
  }
}

/** Big striped synthwave sun with a warm glow, cut on an offscreen canvas. */
export function drawSun(ctx, cx, cy, r, alpha = 0.92) {
  const pad = 6;
  const size = Math.ceil(r * 2 + pad * 2);
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const c = off.getContext('2d');
  const mid = size / 2;
  c.fillStyle = radial(c, mid, mid - r * 0.2, r * 0.1, mid, mid, r, [
    [0, '#FFD60A'],
    [0.55, '#FF9E00'],
    [1, '#FF2E88'],
  ]);
  disc(c, mid, mid, r);
  cutSunSlits(c, mid, r, size);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowColor = '#FF7A18';
  ctx.shadowBlur = r * 0.55;
  ctx.drawImage(off, cx - mid, cy - mid);
  ctx.restore();
}

/* ------------------------------------------------------------------ moon */

/** Pale moon with a cyan halo for night grades, plus a few hard craters. */
export function drawMoon(ctx, cx, cy, r) {
  ctx.save();
  ctx.fillStyle = radial(ctx, cx, cy, r * 0.4, cx, cy, r * 2.4, [
    [0, 'rgba(0,229,255,0.3)'],
    [1, 'rgba(0,229,255,0)'],
  ]);
  disc(ctx, cx, cy, r * 2.4);
  ctx.fillStyle = radial(ctx, cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r, [
    [0, '#F4FBFF'],
    [1, '#9FD8E8'],
  ]);
  disc(ctx, cx, cy, r);
  ctx.fillStyle = 'rgba(13,0,26,0.14)';
  for (const [dx, dy, dr] of [[-0.3, 0.1, 0.18], [0.25, -0.25, 0.12], [0.15, 0.35, 0.1]]) {
    disc(ctx, cx + dx * r, cy + dy * r, dr * r);
  }
  ctx.restore();
}

// A four-point sparkle path centred on (px, py).
function sparkle(c, px, py, r) {
  c.moveTo(px, py - r * 2);
  c.quadraticCurveTo(px, py, px + r * 2, py);
  c.quadraticCurveTo(px, py, px, py + r * 2);
  c.quadraticCurveTo(px, py, px - r * 2, py);
  c.quadraticCurveTo(px, py, px, py - r * 2);
}

/** Tiny four-point stars scattered across a night sky region. */
export function drawStars(ctx, x, y, w, h, n, seed) {
  const rnd = rng(seed);
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  for (let i = 0; i < n; i++) {
    const px = x + rnd() * w;
    const py = y + rnd() * h;
    const r = Math.min(w, h) * (0.006 + rnd() * 0.008);
    ctx.globalAlpha = 0.5 + rnd() * 0.5;
    trace(ctx, (c) => sparkle(c, px, py, r));
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ palm */

// The tapered curved trunk outline.
function palmTrunk(c, baseX, baseY, topX, topY, height, lean, w0, w1) {
  c.moveTo(baseX - w0, baseY);
  c.bezierCurveTo(baseX - w0 + lean * height * 0.35, baseY - height * 0.55, topX - w1 - lean * height * 0.12, topY + height * 0.22, topX - w1, topY);
  c.lineTo(topX + w1, topY);
  c.bezierCurveTo(topX + w1 - lean * height * 0.12, topY + height * 0.22, baseX + w0 + lean * height * 0.35, baseY - height * 0.55, baseX + w0, baseY);
}

// One drooping frond from the crown to its tip.
function palmFrond(c, topX, topY, ang, len) {
  const tipX = topX + Math.cos(ang) * len;
  const tipY = topY + Math.sin(ang) * len * 0.7 + len * 0.2;
  const midX = topX + Math.cos(ang) * len * 0.5;
  const midY = topY + Math.sin(ang) * len * 0.35 - len * 0.1;
  const fat = len * 0.13;
  c.moveTo(topX, topY);
  c.quadraticCurveTo(midX, midY - fat, tipX, tipY);
  c.quadraticCurveTo(midX, midY + fat * 0.55, topX, topY);
}

/** Black palm silhouette: tapered curved trunk, nine drooping fronds, nuts. */
export function drawPalm(ctx, baseX, baseY, height, lean, color = INK) {
  const topX = baseX + lean * height;
  const topY = baseY - height;
  ctx.save();
  ctx.fillStyle = color;
  const w0 = height * 0.048;
  const w1 = height * 0.02;
  trace(ctx, (c) => palmTrunk(c, baseX, baseY, topX, topY, height, lean, w0, w1));
  const fronds = 9;
  for (let i = 0; i < fronds; i++) {
    const t = i / (fronds - 1);
    const ang = ((-168 + t * 156) * Math.PI) / 180;
    const len = height * (0.34 + 0.12 * Math.sin(t * Math.PI));
    trace(ctx, (c) => palmFrond(c, topX, topY, ang, len));
  }
  // Two nuts in ONE path + one fill (kept verbatim for pixel-identical AA).
  ctx.beginPath();
  ctx.arc(topX - height * 0.03, topY + height * 0.04, height * 0.026, 0, TAU);
  ctx.arc(topX + height * 0.032, topY + height * 0.052, height * 0.022, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/* ----------------------------------------------------------------- birds */

/** A scatter of little "m" birds for the sky panels. */
export function drawBirds(ctx, x, y, w, h, n, seed) {
  const rnd = rng(seed);
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.globalAlpha = 0.85;
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const px = x + rnd() * w;
    const py = y + rnd() * h;
    const s = w * (0.02 + rnd() * 0.022);
    ctx.lineWidth = Math.max(1.5, s * 0.2);
    ctx.beginPath();
    ctx.moveTo(px - s, py);
    ctx.quadraticCurveTo(px - s * 0.5, py - s * 0.75, px, py);
    ctx.quadraticCurveTo(px + s * 0.5, py - s * 0.75, px + s, py);
    ctx.stroke();
  }
  ctx.restore();
}

/** A tiny prop plane silhouette crossing the sky (a small story detail). */
export function drawPlane(ctx, cx, cy, s, tilt = -0.08) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(tilt);
  ctx.fillStyle = INK;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.5, s * 0.12, 0, 0, TAU);
  ctx.fill();
  trace(ctx, (c) => {
    c.moveTo(-s * 0.05, 0);
    c.lineTo(-s * 0.28, -s * 0.34);
    c.lineTo(-s * 0.12, 0);
  });
  trace(ctx, (c) => {
    c.moveTo(-s * 0.42, 0);
    c.lineTo(-s * 0.56, -s * 0.2);
    c.lineTo(-s * 0.46, 0);
  });
  ctx.restore();
}

/* --------------------------------------------------------------- skyline */

// Glowing roofline along a tower top.
function towerRoof(c, bx, topY, bw, h, neon) {
  c.save();
  c.strokeStyle = neon;
  c.globalAlpha = 0.9;
  c.lineWidth = Math.max(1.5, h * 0.012);
  c.shadowColor = neon;
  c.shadowBlur = h * 0.04;
  seg(c, bx, topY, bx + bw, topY);
  c.restore();
}

// Lit windows on a loose grid inside a tower.
function towerWindows(c, rnd, bx, topY, bw, baseY, h, neon) {
  const step = Math.max(4, h * 0.035);
  c.fillStyle = neon;
  for (let wy = topY + step; wy < baseY - step * 0.5; wy += step) {
    for (let wx = bx + step * 0.6; wx < bx + bw - step * 0.4; wx += step) {
      if (rnd() < 0.4) {
        c.globalAlpha = 0.45 + rnd() * 0.45;
        box(c, wx, wy, step * 0.32, step * 0.32);
      }
    }
  }
  c.globalAlpha = 1;
}

// Occasional antenna mast with a gold beacon.
function towerMast(c, rnd, bx, topY, bw, h) {
  if (rnd() >= 0.28) return;
  c.strokeStyle = '#FF6EC7';
  c.lineWidth = Math.max(1, h * 0.008);
  seg(c, bx + bw * 0.5, topY, bx + bw * 0.5, topY - h * 0.12);
  c.fillStyle = '#FFD60A';
  disc(c, bx + bw * 0.5, topY - h * 0.12, Math.max(1.5, h * 0.012));
}

/** Neon towers rising from the bottom of a region: rooflines, windows, masts. */
export function drawSkyline(ctx, x, y, w, h, seed) {
  const rnd = rng(seed);
  const baseY = y + h;
  ctx.save();
  let bx = x - w * 0.02;
  while (bx < x + w) {
    const bw = w * (0.06 + rnd() * 0.07);
    const bh = Math.min(h * (0.25 + rnd() * 0.55), bw * 5);
    const neon = rnd() > 0.5 ? '#FF2E88' : '#00E5FF';
    const topY = baseY - bh;
    ctx.fillStyle = INK;
    box(ctx, bx, topY, bw, bh);
    towerRoof(ctx, bx, topY, bw, h, neon);
    towerWindows(ctx, rnd, bx, topY, bw, baseY, h, neon);
    towerMast(ctx, rnd, bx, topY, bw, h);
    bx += bw + w * 0.008;
  }
  ctx.restore();
}

/* ------------------------------------------------------------------- car */

// The body silhouette as a path-command table (fractions of W / H). Replayed
// into a Path2D so the outline is identical to the hand-written path.
const CAR_BODY = [
  ['moveTo', 0.02, 0.6],
  ['lineTo', 0.035, 0.4],
  ['lineTo', 0, 0.34],
  ['lineTo', 0.1, 0.32],
  ['lineTo', 0.12, 0.4],
  ['quadraticCurveTo', 0.2, 0.36, 0.26, 0.22],
  ['quadraticCurveTo', 0.35, 0.08, 0.47, 0.09],
  ['quadraticCurveTo', 0.57, 0.11, 0.64, 0.27],
  ['quadraticCurveTo', 0.81, 0.31, 0.965, 0.41],
  ['quadraticCurveTo', 0.995, 0.45, 0.99, 0.57],
  ['lineTo', 0.9, 0.65],
  ['arc', 0.78, 0.65, 0.115, 0, Math.PI, true],
  ['lineTo', 0.34, 0.65],
  ['arc', 0.22, 0.65, 0.115, 0, Math.PI, true],
];

function carBodyPath(W, H) {
  const body = new Path2D();
  for (const [cmd, ...a] of CAR_BODY) {
    if (cmd === 'arc') body.arc(a[0] * W, a[1] * H, a[2] * W, a[3], a[4], a[5]);
    else if (cmd === 'quadraticCurveTo') body.quadraticCurveTo(a[0] * W, a[1] * H, a[2] * W, a[3] * H);
    else body[cmd](a[0] * W, a[1] * H);
  }
  body.closePath();
  return body;
}

// Tire smoke drifting off the rear.
function carSmoke(c, W, H) {
  const rnd = rng(4242);
  for (let i = 0; i < 5; i++) {
    const px = -W * (0.02 + i * 0.045);
    const py = H * (0.62 - i * 0.05) + rnd() * H * 0.06;
    const pr = W * (0.045 + i * 0.02);
    c.fillStyle = i % 2 ? 'rgba(255,110,199,0.16)' : 'rgba(210,200,220,0.18)';
    disc(c, px, py, pr);
  }
}

// Neon underglow pooled on the ground (screen blend, squashed disc).
function carUnderglow(c, W, H, accent) {
  c.save();
  c.globalCompositeOperation = 'screen';
  c.fillStyle = radial(c, W * 0.5, H * 0.9, W * 0.02, W * 0.5, H * 0.9, W * 0.55, [
    [0, accent === '#00E5FF' ? 'rgba(0,229,255,0.55)' : 'rgba(255,46,136,0.55)'],
    [1, 'rgba(0,0,0,0)'],
  ]);
  c.scale(1, 0.26);
  disc(c, W * 0.5, H * 0.9 / 0.26, W * 0.55);
  c.restore();
}

// Magenta neon tracing the roofline.
function carRoofline(c, W, H) {
  c.save();
  c.strokeStyle = '#FF2E88';
  c.globalAlpha = 0.85;
  c.lineWidth = Math.max(1.5, W * 0.008);
  c.shadowColor = '#FF2E88';
  c.shadowBlur = W * 0.02;
  c.beginPath();
  c.moveTo(W * 0.12, H * 0.4);
  c.quadraticCurveTo(W * 0.2, H * 0.36, W * 0.26, H * 0.22);
  c.quadraticCurveTo(W * 0.35, H * 0.08, W * 0.47, H * 0.09);
  c.quadraticCurveTo(W * 0.57, H * 0.11, W * 0.64, H * 0.27);
  c.quadraticCurveTo(W * 0.81, H * 0.31, W * 0.965, H * 0.41);
  c.stroke();
  c.restore();
}

// Wheels with neon rims.
function carWheels(c, W, H, accent) {
  for (const wx of [W * 0.22, W * 0.78]) {
    c.fillStyle = '#050308';
    disc(c, wx, H * 0.65, W * 0.105);
    c.strokeStyle = accent;
    c.globalAlpha = 0.9;
    c.lineWidth = Math.max(1.2, W * 0.006);
    ring(c, wx, H * 0.65, W * 0.06);
    c.globalAlpha = 1;
  }
}

// Headlight + beam, and the tiny yellow plate up front.
function carFront(c, W, H) {
  c.fillStyle = '#FFD60A';
  trace(c, (p) => {
    p.moveTo(W * 0.955, H * 0.43);
    p.lineTo(W * 0.99, H * 0.46);
    p.lineTo(W * 0.955, H * 0.49);
  });
  const beam = c.createLinearGradient(W * 0.99, 0, W * 1.3, 0);
  beam.addColorStop(0, 'rgba(255,214,10,0.3)');
  beam.addColorStop(1, 'rgba(255,214,10,0)');
  c.fillStyle = beam;
  trace(c, (p) => {
    p.moveTo(W * 0.99, H * 0.44);
    p.lineTo(W * 1.3, H * 0.3);
    p.lineTo(W * 1.3, H * 0.62);
    p.lineTo(W * 0.99, H * 0.5);
  });
  c.fillStyle = '#FFD60A';
  box(c, W * 0.025, H * 0.48, W * 0.09, H * 0.12);
  c.strokeStyle = INK;
  c.lineWidth = Math.max(1, W * 0.003);
  c.strokeRect(W * 0.025, H * 0.48, W * 0.09, H * 0.12);
  c.fillStyle = INK;
  c.font = `900 ${W * 0.05}px ${DISPLAY}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('VICE', W * 0.07, H * 0.545);
}

/** Low sport car facing right, tilted, with underglow, tire smoke, speed
 *  lines, neon rims and a tiny yellow plate. Box: W wide, W*0.3 tall. */
export function drawCar(ctx, x, y, W, accent = '#00E5FF', tilt = -0.045) {
  const H = W * 0.3;
  ctx.save();
  ctx.translate(x + W / 2, y + H / 2);
  ctx.rotate(tilt);
  ctx.translate(-W / 2, -H / 2);
  carSmoke(ctx, W, H);
  // Speed lines behind the car.
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = Math.max(1.5, W * 0.006);
  for (const ly of [0.3, 0.46, 0.6]) seg(ctx, -W * 0.24, H * ly, -W * 0.02, H * ly);
  ctx.globalAlpha = 1;
  carUnderglow(ctx, W, H, accent);
  ctx.fillStyle = INK;
  ctx.fill(carBodyPath(W, H));
  carRoofline(ctx, W, H);
  // Cyan glasshouse.
  ctx.fillStyle = 'rgba(0,229,255,0.3)';
  trace(ctx, (c) => {
    c.moveTo(W * 0.3, H * 0.24);
    c.quadraticCurveTo(W * 0.37, H * 0.13, W * 0.46, H * 0.13);
    c.quadraticCurveTo(W * 0.54, H * 0.14, W * 0.59, H * 0.25);
  });
  carWheels(ctx, W, H, accent);
  carFront(ctx, W, H);
  ctx.restore();
}

/* ------------------------------------------------------------ helicopter */

/** Police helicopter silhouette with a searchlight cone. `s` = body length. */
export function drawHelicopter(ctx, cx, cy, s) {
  ctx.save();
  ctx.translate(cx, cy);
  // Searchlight cone sweeping down.
  const cone = ctx.createLinearGradient(0, s * 0.1, 0, s * 1.5);
  cone.addColorStop(0, 'rgba(255,214,10,0.3)');
  cone.addColorStop(1, 'rgba(255,214,10,0)');
  ctx.fillStyle = cone;
  trace(ctx, (c) => {
    c.moveTo(s * 0.08, s * 0.1);
    c.lineTo(-s * 0.4, s * 1.5);
    c.lineTo(s * 0.6, s * 1.5);
  });
  // Tail boom + fin.
  ctx.fillStyle = INK;
  trace(ctx, (c) => {
    c.moveTo(-s * 0.25, -s * 0.04);
    c.lineTo(-s * 0.62, -s * 0.1);
    c.lineTo(-s * 0.62, -s * 0.02);
    c.lineTo(-s * 0.25, s * 0.06);
  });
  box(ctx, -s * 0.66, -s * 0.2, s * 0.05, s * 0.16);
  // Cabin.
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.32, s * 0.14, 0, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.strokeStyle = '#FF2E88';
  ctx.globalAlpha = 0.8;
  ctx.lineWidth = Math.max(1.5, s * 0.02);
  ctx.shadowColor = '#FF2E88';
  ctx.shadowBlur = s * 0.06;
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.02, s * 0.3, s * 0.12, 0, Math.PI, TAU);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = 'rgba(0,229,255,0.4)';
  ctx.beginPath();
  ctx.ellipse(s * 0.18, -s * 0.02, s * 0.1, s * 0.08, 0, 0, TAU);
  ctx.fill();
  // Rotor disc + mast.
  ctx.fillStyle = 'rgba(13,0,26,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.22, s * 0.52, s * 0.035, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(2, s * 0.03);
  seg(ctx, -s * 0.5, -s * 0.22, s * 0.5, -s * 0.22);
  seg(ctx, 0, -s * 0.14, 0, -s * 0.22);
  // Landing skids.
  ctx.lineWidth = Math.max(1.5, s * 0.02);
  ctx.beginPath();
  ctx.moveTo(-s * 0.22, s * 0.18);
  ctx.lineTo(s * 0.26, s * 0.18);
  ctx.moveTo(-s * 0.12, s * 0.12);
  ctx.lineTo(-s * 0.12, s * 0.18);
  ctx.moveTo(s * 0.14, s * 0.12);
  ctx.lineTo(s * 0.14, s * 0.18);
  ctx.stroke();
  ctx.restore();
}

/* ----------------------------------------------------------------- money */

/** Bills fluttering through a region. */
export function drawMoney(ctx, x, y, w, h, n, seed) {
  const rnd = rng(seed);
  ctx.save();
  for (let i = 0; i < n; i++) {
    const bw = w * (0.08 + rnd() * 0.05);
    const bh = bw * 0.48;
    const px = x + rnd() * (w - bw);
    const py = y + rnd() * (h - bh);
    ctx.save();
    ctx.translate(px + bw / 2, py + bh / 2);
    ctx.rotate((rnd() - 0.5) * 1.1);
    ctx.fillStyle = 'rgba(255,214,10,0.92)';
    box(ctx, -bw / 2, -bh / 2, bw, bh);
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1.2, bw * 0.05);
    ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);
    ring(ctx, 0, 0, bh * 0.3);
    ctx.fillStyle = INK;
    ctx.font = `900 ${bh * 0.5}px ${DISPLAY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 0, bh * 0.03);
    ctx.restore();
  }
  ctx.restore();
}

/** A duffel bag stuffed with cash — the heist prop from the reference art. */
export function drawDuffel(ctx, cx, cy, s) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.roundRect(-s * 0.5, -s * 0.22, s, s * 0.44, s * 0.16);
  ctx.fill();
  // Zipper highlight.
  ctx.strokeStyle = '#00E5FF';
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = Math.max(1.5, s * 0.02);
  seg(ctx, -s * 0.5, -s * 0.02, s * 0.5, -s * 0.02);
  ctx.globalAlpha = 1;
  // Carry handle.
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(2, s * 0.035);
  ctx.beginPath();
  ctx.arc(0, -s * 0.22, s * 0.2, Math.PI, TAU);
  ctx.stroke();
  // Cash spilling from the open top.
  for (const [dx, dy, rot] of [[-0.18, -0.3, -0.3], [0.05, -0.36, 0.2], [0.24, -0.28, 0.5]]) {
    ctx.save();
    ctx.translate(dx * s, dy * s);
    ctx.rotate(rot);
    ctx.fillStyle = '#FFD60A';
    box(ctx, -s * 0.11, -s * 0.05, s * 0.22, s * 0.1);
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1, s * 0.012);
    ctx.strokeRect(-s * 0.11, -s * 0.05, s * 0.22, s * 0.1);
    ctx.restore();
  }
  ctx.restore();
}

/* ------------------------------------------------------------ police bar */

/** A light bar with magenta / cyan lenses and glow rays. */
export function drawPoliceBar(ctx, x, y, w) {
  const bh = w * 0.16;
  const lenses = [[x + w * 0.22, '#FF2E88'], [x + w * 0.78, '#00E5FF']];
  ctx.save();
  for (const [lx, color] of lenses) {
    const rays = ctx.createLinearGradient(lx, y, lx, y - w * 0.5);
    rays.addColorStop(0, color === '#FF2E88' ? 'rgba(255,46,136,0.28)' : 'rgba(0,229,255,0.28)');
    rays.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rays;
    trace(ctx, (c) => {
      c.moveTo(lx - w * 0.06, y);
      c.lineTo(lx - w * 0.22, y - w * 0.5);
      c.lineTo(lx + w * 0.22, y - w * 0.5);
      c.lineTo(lx + w * 0.06, y);
    });
  }
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.roundRect(x, y, w, bh, bh * 0.3);
  ctx.fill();
  for (const [lx, color] of lenses) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = w * 0.12;
    ctx.beginPath();
    ctx.roundRect(lx - w * 0.14, y + bh * 0.18, w * 0.28, bh * 0.64, bh * 0.2);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `900 ${bh * 0.42}px ${DISPLAY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('VICE PD', x + w * 0.5, y + bh * 0.52);
  ctx.restore();
}

/* ----------------------------------------------------------- street scene */

// A neon shop sign whose text shrinks to fit its box so nothing garbles.
function neonSign(ctx, sx, sy, sw, sh, text, neon, m) {
  ctx.save();
  ctx.strokeStyle = neon;
  ctx.lineWidth = Math.max(2, m * 0.012);
  ctx.shadowColor = neon;
  ctx.shadowBlur = m * 0.05;
  ctx.beginPath();
  ctx.roundRect(sx, sy, sw, sh, sh * 0.18);
  ctx.stroke();
  ctx.fillStyle = neon;
  let fs = sh * 0.5;
  ctx.font = `900 ${fs}px ${DISPLAY}`;
  while (ctx.measureText(text).width > sw * 0.86 && fs > 6) {
    fs *= 0.9;
    ctx.font = `900 ${fs}px ${DISPLAY}`;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, sx + sw / 2, sy + sh * 0.54);
  ctx.restore();
}

/** Neon shop signs, hanging wires, a crowd of silhouettes and wet-road glow. */
export function drawStreetScene(ctx, x, y, w, h, seed) {
  const rnd = rng(seed);
  const m = Math.min(w, h);
  const signTexts = ['MOTEL', 'BAR', '24H', 'DINER', 'CLUB', 'LIQUOR'];
  const pick = () => signTexts[Math.floor(rnd() * signTexts.length)];
  ctx.save();
  // Sagging wires across the top.
  ctx.strokeStyle = 'rgba(13,0,26,0.65)';
  ctx.lineWidth = Math.max(1.5, m * 0.008);
  for (const wy of [0.04, 0.09]) {
    ctx.beginPath();
    ctx.moveTo(x, y + h * wy);
    ctx.quadraticCurveTo(x + w * 0.5, y + h * (wy + 0.06), x + w, y + h * wy);
    ctx.stroke();
  }
  const neonA = rnd() > 0.5 ? '#FF2E88' : '#00E5FF';
  const neonB = neonA === '#FF2E88' ? '#FFD60A' : '#FF6EC7';
  const sh = m * 0.13;
  neonSign(ctx, x + w * 0.06, y + h * 0.09, Math.min(w * 0.4, m * 0.42), sh, pick(), neonA, m);
  neonSign(ctx, x + w * 0.62, y + h * 0.07, Math.min(w * 0.3, m * 0.3), sh * 1.5, pick(), neonB, m);
  // Street lamp at the right edge, clear of the centred face.
  const lx = x + w * 0.9;
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(2, m * 0.012);
  ctx.beginPath();
  ctx.moveTo(lx, y + h);
  ctx.lineTo(lx, y + h * 0.5);
  ctx.lineTo(lx + w * 0.05, y + h * 0.5);
  ctx.stroke();
  ctx.save();
  ctx.fillStyle = '#FFD60A';
  ctx.shadowColor = '#FFD60A';
  ctx.shadowBlur = m * 0.04;
  disc(ctx, lx + w * 0.05, y + h * 0.51, Math.max(2, m * 0.018));
  ctx.restore();
  // Crowd of silhouettes along the bottom.
  const n = 5 + Math.floor(rnd() * 4);
  ctx.fillStyle = INK;
  for (let i = 0; i < n; i++) {
    const px = x + w * ((i + 0.5) / n) + (rnd() - 0.5) * w * 0.04;
    const ph = m * (0.1 + rnd() * 0.07);
    const hr = ph * 0.24;
    const baseY = y + h;
    disc(ctx, px, baseY - ph + hr, hr);
    trace(ctx, (c) => {
      c.moveTo(px - ph * 0.34, baseY);
      c.quadraticCurveTo(px - ph * 0.3, baseY - ph * 0.62, px, baseY - ph * 0.66);
      c.quadraticCurveTo(px + ph * 0.3, baseY - ph * 0.62, px + ph * 0.34, baseY);
    });
  }
  // Wet-road neon reflections.
  ctx.globalAlpha = 0.25;
  for (const [rx, neon] of [[x + w * 0.2, neonA], [x + w * 0.78, neonB]]) {
    ctx.fillStyle = neon;
    box(ctx, rx, y + h * 0.92, w * 0.05, h * 0.08);
  }
  ctx.restore();
}

/* ------------------------------------------------------------ beach scene */

// The jetski + rider and its wake. `h` is the panel height (sets the wake width).
function jetski(ctx, jx, jy, js, h) {
  ctx.fillStyle = INK;
  trace(ctx, (c) => {
    c.moveTo(jx - js * 0.5, jy);
    c.quadraticCurveTo(jx - js * 0.2, jy - js * 0.22, jx + js * 0.3, jy - js * 0.16);
    c.lineTo(jx + js * 0.5, jy);
    c.quadraticCurveTo(jx, jy + js * 0.14, jx - js * 0.5, jy);
  });
  disc(ctx, jx - js * 0.05, jy - js * 0.34, js * 0.12);
  trace(ctx, (c) => {
    c.moveTo(jx - js * 0.12, jy - js * 0.24);
    c.quadraticCurveTo(jx, jy - js * 0.3, jx + js * 0.14, jy - js * 0.2);
    c.lineTo(jx + js * 0.1, jy - js * 0.12);
  });
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = Math.max(1.5, h * 0.007);
  ctx.beginPath();
  ctx.moveTo(jx - js * 0.5, jy + js * 0.05);
  ctx.lineTo(jx - js * 1.1, jy + js * 0.22);
  ctx.moveTo(jx - js * 0.5, jy + js * 0.08);
  ctx.lineTo(jx - js * 1.0, jy + js * 0.34);
  ctx.stroke();
}

/** Sea horizon with waves, a jetski and its wake, a distant sail, palm edge. */
export function drawBeachScene(ctx, x, y, w, h, seed, night = false) {
  const rnd = rng(seed);
  const hy = y + h * 0.62; // horizon low, so the sea sits below the face zone
  ctx.save();
  const sea = ctx.createLinearGradient(x, hy, x, y + h * 0.85);
  if (night) {
    sea.addColorStop(0, 'rgba(6,18,40,0.55)');
    sea.addColorStop(1, 'rgba(8,4,26,0.6)');
  } else {
    sea.addColorStop(0, 'rgba(0,212,255,0.28)');
    sea.addColorStop(1, 'rgba(43,10,74,0.34)');
  }
  ctx.fillStyle = sea;
  box(ctx, x, hy, w, h * 0.33);
  // Sun (or moon) reflection column on the water.
  const refl = ctx.createLinearGradient(x, hy, x, y + h * 0.85);
  refl.addColorStop(0, night ? 'rgba(0,229,255,0.3)' : 'rgba(255,214,10,0.35)');
  refl.addColorStop(1, night ? 'rgba(0,229,255,0)' : 'rgba(255,214,10,0)');
  ctx.fillStyle = refl;
  box(ctx, x + w * 0.66, hy, w * 0.09, h * 0.33);
  // Wave lines.
  ctx.strokeStyle = night ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.45)';
  ctx.lineWidth = Math.max(1.5, h * 0.008);
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const wy = hy + h * (0.06 + i * 0.07);
    const wx = x + w * (0.05 + rnd() * 0.2);
    const ww = w * (0.25 + rnd() * 0.3);
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    for (let sx = 0; sx < ww; sx += ww / 4) {
      ctx.quadraticCurveTo(wx + sx + ww / 8, wy - h * 0.015, wx + sx + ww / 4, wy);
    }
    ctx.stroke();
  }
  jetski(ctx, x + w * 0.32, hy + h * 0.08, w * 0.13, h);
  // Distant sail.
  const sx = x + w * 0.82;
  ctx.fillStyle = night ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.85)';
  trace(ctx, (c) => {
    c.moveTo(sx, hy - h * 0.05);
    c.lineTo(sx, hy - h * 0.005);
    c.lineTo(sx + w * 0.035, hy - h * 0.005);
  });
  ctx.fillStyle = INK;
  box(ctx, sx - w * 0.015, hy - h * 0.004, w * 0.06, h * 0.012);
  drawPalm(ctx, x + w * 0.95, y + h * 0.99, Math.min(h * 0.55, w * 0.9), -0.12);
  drawBirds(ctx, x + w * 0.05, y + h * 0.06, w * 0.4, h * 0.2, 3, seed + 5);
  ctx.restore();
}

/* --------------------------------------------------------------- vignette */

// Small filler panels: props sit in the lower half so they never cross the face
// in the upper third. Variant 0 helicopter, 1 money, 2 police bar, 3 duffel.
const VIGNETTES = [
  (ctx, x, y, w, h, m, seed) => {
    drawHelicopter(ctx, x + w * 0.5, y + h * 0.78, m * 0.58);
    drawBirds(ctx, x + w * 0.08, y + h * 0.05, w * 0.3, h * 0.1, 2, seed + 9);
  },
  (ctx, x, y, w, h, m, seed) => {
    drawMoney(ctx, x, y + h * 0.62, w, h * 0.36, 7, seed);
  },
  (ctx, x, y, w, h, m, seed) => {
    drawPoliceBar(ctx, x + w * 0.18, y + h * 0.8, w * 0.64);
    drawMoney(ctx, x + w * 0.1, y + h * 0.62, w * 0.8, h * 0.16, 3, seed + 3);
  },
  (ctx, x, y, w, h, m, seed) => {
    drawDuffel(ctx, x + w * 0.5, y + h * 0.8, m * 0.62);
    drawMoney(ctx, x + w * 0.1, y + h * 0.62, w * 0.8, h * 0.16, 3, seed + 5);
  },
];

export function drawVignette(ctx, x, y, w, h, variant, seed) {
  VIGNETTES[variant % 4](ctx, x, y, w, h, Math.min(w, h), seed);
}

/* -------------------------------------------------- halftone + film grain */

let dotTile = null;
let noiseTile = null;

// 12px tile, two dots in ONE path + one fill (verbatim for pixel-identical AA).
function getDotTile() {
  if (dotTile) return dotTile;
  const t = document.createElement('canvas');
  t.width = 12;
  t.height = 12;
  const c = t.getContext('2d');
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.arc(3, 3, 1.5, 0, TAU);
  c.arc(9, 9, 1.5, 0, TAU);
  c.fill();
  dotTile = t;
  return t;
}

function getNoiseTile() {
  if (noiseTile) return noiseTile;
  const t = document.createElement('canvas');
  t.width = 140;
  t.height = 140;
  const c = t.getContext('2d');
  const img = c.createImageData(140, 140);
  const rnd = rng(20261119);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 22;
  }
  c.putImageData(img, 0, 0);
  noiseTile = t;
  return t;
}

// A radial-faded halftone cluster, composited in 'overlay' mode.
function dotCluster(ctx, cx, cy, r, strength) {
  const size = Math.ceil(r * 2);
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const c = off.getContext('2d');
  c.fillStyle = c.createPattern(getDotTile(), 'repeat');
  box(c, 0, 0, size, size);
  c.globalCompositeOperation = 'destination-in';
  const fade = c.createRadialGradient(r, r, 0, r, r, r);
  fade.addColorStop(0, `rgba(255,255,255,${strength})`);
  fade.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = fade;
  box(c, 0, 0, size, size);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.drawImage(off, cx - r, cy - r);
  ctx.restore();
}

/** Halftone clusters fading in from two opposite corners of the whole cover. */
export function drawHalftone(ctx, w, h) {
  const r = Math.ceil(Math.min(w, h) * 0.45);
  dotCluster(ctx, 0, 0, r, 0.5);
  dotCluster(ctx, w, h, r, 0.5);
}

/** A smaller halftone cluster in one corner of a single panel. */
export function drawPanelHalftone(ctx, p, seed) {
  const rnd = rng(seed);
  const r = Math.ceil(Math.min(p.w, p.h) * 0.34);
  const cx = rnd() > 0.5 ? p.x : p.x + p.w;
  const cy = rnd() > 0.5 ? p.y : p.y + p.h;
  dotCluster(ctx, cx, cy, r, 0.34);
}

/** Uniform film grain over the whole poster. */
export function drawGrain(ctx, w, h) {
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = ctx.createPattern(getNoiseTile(), 'repeat');
  box(ctx, 0, 0, w, h);
  ctx.restore();
}

/* --------------------------------------------------------- panel borders */

/** Crisp, straight, uniform comic borders (no jitter), a neon edge glow on the
 *  hero and one story panel, and a heavier outer frame. Panels tile exactly, so
 *  shared edges read as one clean ink line. */
export function drawPanelBorders(ctx, panels, w, h) {
  const lw = Math.max(4, Math.min(7, Math.min(w, h) * 0.006));
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'miter';
  ctx.lineWidth = lw;
  for (const p of panels) ctx.strokeRect(p.x + lw / 2, p.y + lw / 2, p.w - lw, p.h - lw);
  const hero = panels.find((p) => p.hero) ?? panels[0];
  const story = panels[Math.min(3, panels.length - 1)];
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = lw * 0.45;
  ctx.strokeStyle = '#00E5FF';
  ctx.shadowColor = '#00E5FF';
  ctx.shadowBlur = lw * 2.2;
  seg(ctx, hero.x + lw, hero.y + lw * 0.8, hero.x + hero.w - lw, hero.y + lw * 0.8);
  ctx.strokeStyle = '#FF2E88';
  ctx.shadowColor = '#FF2E88';
  seg(ctx, story.x + lw, story.y + story.h - lw * 0.8, story.x + story.w - lw, story.y + story.h - lw * 0.8);
  ctx.restore();
  ctx.lineWidth = lw * 1.4;
  ctx.strokeRect(0, 0, w, h);
  ctx.restore();
}

/* -------------------------------------------------------------- stickers */

function starPath(ctx, cx, cy, r, points = 5) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = (i * Math.PI) / points - Math.PI / 2;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/** Rotated VICE CITY badge, top-left. */
export function stickerViceCity(ctx, w, h) {
  const s = Math.min(w, h);
  const bw = s * 0.26;
  const bh = s * 0.08;
  ctx.save();
  ctx.translate(w * 0.045 + bw / 2, h * 0.05 + bh / 2);
  ctx.rotate(-0.07);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.roundRect(-bw / 2, -bh / 2, bw, bh, bh * 0.24);
  ctx.fill();
  ctx.lineWidth = Math.max(2, s * 0.005);
  ctx.strokeStyle = '#FF2E88';
  ctx.stroke();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `900 ${bh * 0.5}px ${DISPLAY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('VICE CITY', bw * 0.06, bh * 0.04);
  ctx.fillStyle = '#FF2E88';
  starPath(ctx, -bw * 0.38, 0, bh * 0.24);
  ctx.fill();
  ctx.restore();
}

/** Round LEONIDA badge, top-right. */
export function stickerLeonida(ctx, w, h) {
  const s = Math.min(w, h);
  const r = s * 0.075;
  ctx.save();
  ctx.translate(w - s * 0.1, h * 0.055 + r);
  ctx.rotate(0.07);
  ctx.fillStyle = INK;
  disc(ctx, 0, 0, r);
  ctx.lineWidth = Math.max(2, s * 0.005);
  ctx.strokeStyle = '#FF7A18';
  ring(ctx, 0, 0, r);
  ctx.lineWidth = Math.max(1, s * 0.002);
  ctx.strokeStyle = '#00E5FF';
  ring(ctx, 0, 0, r * 0.82);
  ctx.fillStyle = '#FFD60A';
  starPath(ctx, 0, -r * 0.32, r * 0.3);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `900 ${r * 0.34}px ${DISPLAY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('LEONIDA', 0, r * 0.34);
  ctx.restore();
}

/** Three outlined gold stars below the top-left badge. */
export function stickerStars(ctx, w, h) {
  const s = Math.min(w, h);
  const rnd = rng(777);
  ctx.save();
  for (let i = 0; i < 3; i++) {
    const r = s * (0.022 + rnd() * 0.02);
    const cx = w * (0.05 + rnd() * 0.07);
    const cy = h * (0.12 + rnd() * 0.05);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((rnd() - 0.5) * 0.6);
    starPath(ctx, 0, 0, r);
    ctx.fillStyle = '#FFD60A';
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, s * 0.0035);
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

/** Mini cyan palm badge, bottom-right. */
export function stickerPalm(ctx, w, h) {
  const s = Math.min(w, h);
  const r = s * 0.062;
  const cx = w - s * 0.085;
  const cy = h - s * 0.1;
  ctx.save();
  ctx.fillStyle = INK;
  disc(ctx, cx, cy, r);
  ctx.lineWidth = Math.max(2, s * 0.004);
  ctx.strokeStyle = '#00E5FF';
  ring(ctx, cx, cy, r);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.9, 0, TAU);
  ctx.clip();
  drawPalm(ctx, cx - r * 0.1, cy + r * 0.75, r * 1.3, 0.12, '#00E5FF');
  ctx.restore();
}

/* ----------------------------------------------------------- placeholder */

/** Patterned stand-in for a panel with no photo — never plain grey. */
export function drawPlaceholder(ctx, x, y, w, h) {
  ctx.save();
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, '#2B0A4A');
  g.addColorStop(0.55, '#7B2FBE');
  g.addColorStop(1, '#FF2E88');
  ctx.fillStyle = g;
  box(ctx, x, y, w, h);
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = '#00E5FF';
  ctx.lineWidth = Math.max(3, w * 0.015);
  for (let i = -h; i < w + h; i += Math.max(14, w * 0.08)) {
    seg(ctx, x + i, y + h, x + i + h, y);
  }
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.008);
  ctx.font = `900 ${Math.min(w, h) * 0.07}px ${DISPLAY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeText('ADD PHOTO', x + w / 2, y + h / 2);
  ctx.fillText('ADD PHOTO', x + w / 2, y + h / 2);
  ctx.restore();
}
