// decor.js — Vice Cover Studio's vector art layer (v6). Everything here is
// deterministic Canvas 2D: a seeded mulberry32 stream drives each scatter, so
// the editor preview and the exported PNG always agree pixel for pixel.
//
// The vocabulary: moon + sparkles for night skies, palms, birds, a prop plane,
// a sport car with tire smoke, a beach jetski, neon street signs with a crowd,
// helicopter / money / police / duffel vignettes, halftone dots, film grain,
// crisp comic borders and the sticker badges.
//
// v6 art direction: the black city-skyline silhouette is retired — the tower
// painter and its roof/window/mast helpers are gone, so no cover inks a row of
// black buildings anywhere. Skyline panels keep only their sky art (sparkles
// at night, birds + plane by day) over the graded photo. The v5 direction
// holds: no striped synthwave sun in day skies, and the wanted-level sticker
// stays a full five-star row (GTA's max heat), laid out as a neat evenly
// spaced line under the VICE CITY badge. The night moon is untouched.
//
// Drawing rules that keep the art face-safe and pixel-stable:
//   * borders are straight and uniform; hero decor pins to corners / the lower
//     half because the framing engine seats faces in the upper third;
//   * the halftone dot tile and the palm nuts each stay ONE path with two arcs
//     and ONE fill — splitting them would shift anti-aliasing by a sub-pixel;
//   * every bezier control point and rnd() consumption order is preserved from
//     v4/v5, so unchanged regions render identically.

const INK = '#0D001A';
const DISPLAY = '"Vice Display", "Arial Black", sans-serif';
const TAU = Math.PI * 2;

/** mulberry32: one seed, one poster, every render. */
export function rng(seed) {
  let a = (seed >>> 0) || 1;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    const u = Math.imul(t ^ (t >>> 7), 61 | t);
    t = (t + u) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------- drawing vocabulary */

// One arc path, reused by the fill and stroke disc helpers below.
function arcPath(c, x, y, r) {
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
}

function fillDisc(c, x, y, r) {
  arcPath(c, x, y, r);
  c.fill();
}

function strokeRing(c, x, y, r) {
  arcPath(c, x, y, r);
  c.stroke();
}

const fillBox = (c, x, y, w, h) => c.fillRect(x, y, w, h);

function strokeSeg(c, x1, y1, x2, y2) {
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x2, y2);
  c.stroke();
}

// Build a closed shape and fill it in one go.
function trace(c, build) {
  c.beginPath();
  build(c);
  c.closePath();
  c.fill();
}

// Radial gradient factory for the glow washes.
function radialFill(c, x0, y0, r0, x1, y1, r1, stops) {
  const g = c.createRadialGradient(x0, y0, r0, x1, y1, r1);
  stops.forEach(([at, color]) => g.addColorStop(at, color));
  return g;
}

/* ------------------------------------------------------------------ moon */

const MOON_HALO = [[0, 'rgba(0,229,255,0.3)'], [1, 'rgba(0,229,255,0)']];
const MOON_BODY = [[0, '#F4FBFF'], [1, '#9FD8E8']];
const CRATERS = [[-0.3, 0.1, 0.18], [0.25, -0.25, 0.12], [0.15, 0.35, 0.1]];

/** Night-grade moon: pale disc, cyan halo, a few hard craters. (v5: kept.) */
export function drawMoon(ctx, cx, cy, r) {
  ctx.save();
  ctx.fillStyle = radialFill(ctx, cx, cy, r * 0.4, cx, cy, r * 2.4, MOON_HALO);
  fillDisc(ctx, cx, cy, r * 2.4);
  const hx = cx - r * 0.3, hy = cy - r * 0.3;
  ctx.fillStyle = radialFill(ctx, hx, hy, r * 0.1, cx, cy, r, MOON_BODY);
  fillDisc(ctx, cx, cy, r);
  ctx.fillStyle = 'rgba(13,0,26,0.14)';
  for (const [dx, dy, dr] of CRATERS) {
    fillDisc(ctx, cx + dx * r, cy + dy * r, dr * r);
  }
  ctx.restore();
}

// Four-point sparkle: four quadratic petals whose tips cycle right, down,
// left, up around the centre control point.
function sparkle(c, px, py, r) {
  const reach = r * 2;
  c.moveTo(px, py - reach);
  const tips = [[px + reach, py], [px, py + reach], [px - reach, py], [px, py - reach]];
  for (const [tx, ty] of tips) {
    c.quadraticCurveTo(px, py, tx, ty);
  }
}

/** Tiny four-point stars sprinkled over a night sky region. */
export function drawStars(ctx, x, y, w, h, n, seed) {
  const rnd = rng(seed);
  const stars = Array.from({ length: n }, () => ({
    px: x + rnd() * w,
    py: y + rnd() * h,
    r: Math.min(w, h) * (0.006 + rnd() * 0.008),
    a: 0.5 + rnd() * 0.5,
  }));
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  for (const s of stars) {
    ctx.globalAlpha = s.a;
    trace(ctx, (c) => sparkle(c, s.px, s.py, s.r));
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ palm */

// Tapered curved trunk. The two bezier sweeps keep the exact v3/v4 geometry —
// note the +w0 on the return sweep's second control point.
function palmTrunk(c, baseX, baseY, topX, topY, height, lean, w0, w1) {
  const bend = lean * height * 0.35;
  const midY = baseY - height * 0.55;
  const neckX = lean * height * 0.12;
  const neckY = topY + height * 0.22;
  c.moveTo(baseX - w0, baseY);
  c.bezierCurveTo(baseX - w0 + bend, midY, topX - w1 - neckX, neckY, topX - w1, topY);
  c.lineTo(topX + w1, topY);
  c.bezierCurveTo(topX + w1 - neckX, neckY, baseX + w0 + bend, midY, baseX + w0, baseY);
}

// One drooping frond, crown to tip and back.
function palmFrond(c, topX, topY, ang, len) {
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const tipX = topX + dx * len;
  const tipY = topY + dy * len * 0.7 + len * 0.2;
  const midX = topX + dx * len * 0.5;
  const midY = topY + dy * len * 0.35 - len * 0.1;
  const fat = len * 0.13;
  const c1y = midY - fat;
  const c2y = midY + fat * 0.55;
  c.moveTo(topX, topY);
  c.quadraticCurveTo(midX, c1y, tipX, tipY);
  c.quadraticCurveTo(midX, c2y, topX, topY);
}

/** Black palm silhouette: curved tapered trunk, nine fronds, two nuts. */
export function drawPalm(ctx, baseX, baseY, height, lean, color = INK) {
  const topX = baseX + lean * height;
  const topY = baseY - height;
  ctx.save();
  ctx.fillStyle = color;
  const w0 = height * 0.048;
  const w1 = height * 0.02;
  trace(ctx, (c) => palmTrunk(c, baseX, baseY, topX, topY, height, lean, w0, w1));
  const frondSpecs = Array.from({ length: 9 }, (_, i) => {
    const t = i / 8;
    return {
      ang: ((-168 + t * 156) * Math.PI) / 180,
      len: height * (0.34 + 0.12 * Math.sin(t * Math.PI)),
    };
  });
  for (const f of frondSpecs) {
    trace(ctx, (c) => palmFrond(c, topX, topY, f.ang, f.len));
  }
  // Both nuts in ONE path + one fill (single-path shape kept for identical AA).
  const nutAx = topX - height * 0.03, nutAy = topY + height * 0.04;
  const nutBx = topX + height * 0.032, nutBy = topY + height * 0.052;
  ctx.beginPath();
  ctx.arc(nutAx, nutAy, height * 0.026, 0, TAU);
  ctx.arc(nutBx, nutBy, height * 0.022, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/* ----------------------------------------------------------------- birds */

/** A scatter of little "m" birds for the day sky. */
export function drawBirds(ctx, x, y, w, h, n, seed) {
  const rnd = rng(seed);
  const flock = Array.from({ length: n }, () => ({
    px: x + rnd() * w,
    py: y + rnd() * h,
    s: w * (0.02 + rnd() * 0.022),
  }));
  ctx.save();
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = INK;
  for (const b of flock) {
    const wing = b.s * 0.5;
    const dip = b.s * 0.75;
    ctx.lineWidth = Math.max(1.5, b.s * 0.2);
    ctx.beginPath();
    ctx.moveTo(b.px - b.s, b.py);
    ctx.quadraticCurveTo(b.px - wing, b.py - dip, b.px, b.py);
    ctx.quadraticCurveTo(b.px + wing, b.py - dip, b.px + b.s, b.py);
    ctx.stroke();
  }
  ctx.restore();
}

/** Tiny prop plane crossing the sky — a small story detail. */
export function drawPlane(ctx, cx, cy, s, tilt = -0.08) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(tilt);
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.5, s * 0.12, 0, 0, TAU);
  ctx.fill();
  const wing = [[-s * 0.05, 0], [-s * 0.28, -s * 0.34], [-s * 0.12, 0]];
  trace(ctx, (c) => {
    c.moveTo(wing[0][0], wing[0][1]);
    c.lineTo(wing[1][0], wing[1][1]);
    c.lineTo(wing[2][0], wing[2][1]);
  });
  const tail = [[-s * 0.42, 0], [-s * 0.56, -s * 0.2], [-s * 0.46, 0]];
  trace(ctx, (c) => {
    c.moveTo(tail[0][0], tail[0][1]);
    c.lineTo(tail[1][0], tail[1][1]);
    c.lineTo(tail[2][0], tail[2][1]);
  });
  ctx.restore();
}

/* ------------------------------------------------------------------- car */

// Body silhouette replayed into a Path2D through fraction mappers; wheel
// arches are anticlockwise arcs, exactly as the hand-written path was.
function carBodyPath(W, H) {
  const px = (fx) => fx * W;
  const py = (fy) => fy * H;
  const body = new Path2D();
  body.moveTo(px(0.02), py(0.6));
  body.lineTo(px(0.035), py(0.4));
  body.lineTo(px(0), py(0.34));
  body.lineTo(px(0.1), py(0.32));
  body.lineTo(px(0.12), py(0.4));
  body.quadraticCurveTo(px(0.2), py(0.36), px(0.26), py(0.22));
  body.quadraticCurveTo(px(0.35), py(0.08), px(0.47), py(0.09));
  body.quadraticCurveTo(px(0.57), py(0.11), px(0.64), py(0.27));
  body.quadraticCurveTo(px(0.81), py(0.31), px(0.965), py(0.41));
  body.quadraticCurveTo(px(0.995), py(0.45), px(0.99), py(0.57));
  body.lineTo(px(0.9), py(0.65));
  body.arc(px(0.78), py(0.65), 0.115 * W, 0, Math.PI, true);
  body.lineTo(px(0.34), py(0.65));
  body.arc(px(0.22), py(0.65), 0.115 * W, 0, Math.PI, true);
  body.closePath();
  return body;
}

// Tire smoke drifting off the rear.
function carSmoke(c, W, H) {
  const rnd = rng(4242);
  const puffs = Array.from({ length: 5 }, (_, i) => ({
    px: -W * (0.02 + i * 0.045),
    py: H * (0.62 - i * 0.05) + rnd() * H * 0.06,
    pr: W * (0.045 + i * 0.02),
    fill: i % 2 ? 'rgba(255,110,199,0.16)' : 'rgba(210,200,220,0.18)',
  }));
  for (const p of puffs) {
    c.fillStyle = p.fill;
    fillDisc(c, p.px, p.py, p.pr);
  }
}

// Neon underglow pooled on the ground (screen blend, squashed disc).
function carUnderglow(c, W, H, accent) {
  c.save();
  c.globalCompositeOperation = 'screen';
  const gx = W * 0.5, gy = H * 0.9;
  const core = accent === '#00E5FF' ? 'rgba(0,229,255,0.55)' : 'rgba(255,46,136,0.55)';
  const stops = [[0, core], [1, 'rgba(0,0,0,0)']];
  c.fillStyle = radialFill(c, gx, gy, W * 0.02, gx, gy, W * 0.55, stops);
  c.scale(1, 0.26);
  fillDisc(c, gx, gy / 0.26, W * 0.55);
  c.restore();
}

// Magenta neon tracing the roofline.
function carRoofline(c, W, H) {
  const px = (fx) => fx * W;
  const py = (fy) => fy * H;
  c.save();
  c.shadowColor = '#FF2E88';
  c.shadowBlur = W * 0.02;
  c.lineWidth = Math.max(1.5, W * 0.008);
  c.globalAlpha = 0.85;
  c.strokeStyle = '#FF2E88';
  c.beginPath();
  c.moveTo(px(0.12), py(0.4));
  c.quadraticCurveTo(px(0.2), py(0.36), px(0.26), py(0.22));
  c.quadraticCurveTo(px(0.35), py(0.08), px(0.47), py(0.09));
  c.quadraticCurveTo(px(0.57), py(0.11), px(0.64), py(0.27));
  c.quadraticCurveTo(px(0.81), py(0.31), px(0.965), py(0.41));
  c.stroke();
  c.restore();
}

// Wheels with neon rims.
function carWheels(c, W, H, accent) {
  const wy = H * 0.65;
  for (const wx of [W * 0.22, W * 0.78]) {
    c.fillStyle = '#050308';
    fillDisc(c, wx, wy, W * 0.105);
    c.lineWidth = Math.max(1.2, W * 0.006);
    c.globalAlpha = 0.9;
    c.strokeStyle = accent;
    strokeRing(c, wx, wy, W * 0.06);
    c.globalAlpha = 1;
  }
}

// Headlight + beam, and the tiny yellow plate up front.
function carFront(c, W, H) {
  const px = (fx) => fx * W;
  const py = (fy) => fy * H;
  c.fillStyle = '#FFD60A';
  trace(c, (p) => {
    p.moveTo(px(0.955), py(0.43));
    p.lineTo(px(0.99), py(0.46));
    p.lineTo(px(0.955), py(0.49));
  });
  const beam = c.createLinearGradient(px(0.99), 0, px(1.3), 0);
  beam.addColorStop(0, 'rgba(255,214,10,0.3)');
  beam.addColorStop(1, 'rgba(255,214,10,0)');
  c.fillStyle = beam;
  trace(c, (p) => {
    p.moveTo(px(0.99), py(0.44));
    p.lineTo(px(1.3), py(0.3));
    p.lineTo(px(1.3), py(0.62));
    p.lineTo(px(0.99), py(0.5));
  });
  const plateX = px(0.025), plateY = py(0.48);
  const plateW = px(0.09), plateH = py(0.12);
  c.fillStyle = '#FFD60A';
  fillBox(c, plateX, plateY, plateW, plateH);
  c.lineWidth = Math.max(1, W * 0.003);
  c.strokeStyle = INK;
  c.strokeRect(plateX, plateY, plateW, plateH);
  c.textBaseline = 'middle';
  c.textAlign = 'center';
  c.font = `900 ${W * 0.05}px ${DISPLAY}`;
  c.fillStyle = INK;
  c.fillText('VICE', px(0.07), py(0.545));
}

/** Low sport car facing right: underglow, tire smoke, speed lines, neon rims,
 *  tiny yellow plate. Box: W wide, W*0.3 tall. */
export function drawCar(ctx, x, y, W, accent = '#00E5FF', tilt = -0.045) {
  const H = W * 0.3;
  ctx.save();
  ctx.translate(x + W / 2, y + H / 2);
  ctx.rotate(tilt);
  ctx.translate(-W / 2, -H / 2);
  carSmoke(ctx, W, H);
  // Speed lines behind the car.
  ctx.lineWidth = Math.max(1.5, W * 0.006);
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = accent;
  const lineX1 = -W * 0.24, lineX2 = -W * 0.02;
  for (const ly of [0.3, 0.46, 0.6]) strokeSeg(ctx, lineX1, H * ly, lineX2, H * ly);
  ctx.globalAlpha = 1;
  carUnderglow(ctx, W, H, accent);
  ctx.fillStyle = INK;
  ctx.fill(carBodyPath(W, H));
  carRoofline(ctx, W, H);
  // Cyan glasshouse.
  const px = (fx) => fx * W;
  const py = (fy) => fy * H;
  ctx.fillStyle = 'rgba(0,229,255,0.3)';
  trace(ctx, (c) => {
    c.moveTo(px(0.3), py(0.24));
    c.quadraticCurveTo(px(0.37), py(0.13), px(0.46), py(0.13));
    c.quadraticCurveTo(px(0.54), py(0.14), px(0.59), py(0.25));
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
  fillBox(ctx, -s * 0.66, -s * 0.2, s * 0.05, s * 0.16);
  // Cabin.
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.32, s * 0.14, 0, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.shadowColor = '#FF2E88';
  ctx.shadowBlur = s * 0.06;
  ctx.lineWidth = Math.max(1.5, s * 0.02);
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = '#FF2E88';
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
  ctx.lineWidth = Math.max(2, s * 0.03);
  ctx.strokeStyle = INK;
  strokeSeg(ctx, -s * 0.5, -s * 0.22, s * 0.5, -s * 0.22);
  strokeSeg(ctx, 0, -s * 0.14, 0, -s * 0.22);
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
  const bills = Array.from({ length: n }, () => {
    const bw = w * (0.08 + rnd() * 0.05);
    const bh = bw * 0.48;
    return {
      bw, bh,
      px: x + rnd() * (w - bw),
      py: y + rnd() * (h - bh),
      rot: (rnd() - 0.5) * 1.1,
    };
  });
  ctx.save();
  for (const b of bills) {
    ctx.save();
    ctx.translate(b.px + b.bw / 2, b.py + b.bh / 2);
    ctx.rotate(b.rot);
    ctx.fillStyle = 'rgba(255,214,10,0.92)';
    fillBox(ctx, -b.bw / 2, -b.bh / 2, b.bw, b.bh);
    ctx.lineWidth = Math.max(1.2, b.bw * 0.05);
    ctx.strokeStyle = INK;
    ctx.strokeRect(-b.bw / 2, -b.bh / 2, b.bw, b.bh);
    strokeRing(ctx, 0, 0, b.bh * 0.3);
    billMark(ctx, b.bh);
    ctx.restore();
  }
  ctx.restore();
}

// The dollar mark centred on a bill.
function billMark(ctx, bh) {
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.font = `900 ${bh * 0.5}px ${DISPLAY}`;
  ctx.fillStyle = INK;
  ctx.fillText('$', 0, bh * 0.03);
}

/** A duffel bag stuffed with cash — the heist prop. */
export function drawDuffel(ctx, cx, cy, s) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.roundRect(-s * 0.5, -s * 0.22, s, s * 0.44, s * 0.16);
  ctx.fill();
  // Zipper highlight.
  ctx.lineWidth = Math.max(1.5, s * 0.02);
  ctx.globalAlpha = 0.7;
  ctx.strokeStyle = '#00E5FF';
  strokeSeg(ctx, -s * 0.5, -s * 0.02, s * 0.5, -s * 0.02);
  ctx.globalAlpha = 1;
  // Carry handle.
  ctx.lineWidth = Math.max(2, s * 0.035);
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.arc(0, -s * 0.22, s * 0.2, Math.PI, TAU);
  ctx.stroke();
  // Cash spilling from the open top.
  const spills = [[-0.18, -0.3, -0.3], [0.05, -0.36, 0.2], [0.24, -0.28, 0.5]];
  for (const [dx, dy, rot] of spills) {
    ctx.save();
    ctx.translate(dx * s, dy * s);
    ctx.rotate(rot);
    ctx.fillStyle = '#FFD60A';
    fillBox(ctx, -s * 0.11, -s * 0.05, s * 0.22, s * 0.1);
    ctx.lineWidth = Math.max(1, s * 0.012);
    ctx.strokeStyle = INK;
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
    const rayColor = color === '#FF2E88' ? 'rgba(255,46,136,0.28)' : 'rgba(0,229,255,0.28)';
    rays.addColorStop(0, rayColor);
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
    ctx.shadowColor = color;
    ctx.shadowBlur = w * 0.12;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(lx - w * 0.14, y + bh * 0.18, w * 0.28, bh * 0.64, bh * 0.2);
    ctx.fill();
    ctx.restore();
  }
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.font = `900 ${bh * 0.42}px ${DISPLAY}`;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('VICE PD', x + w * 0.5, y + bh * 0.52);
  ctx.restore();
}

/* ----------------------------------------------------------- street scene */

// A neon shop sign whose text shrinks to fit its box so nothing garbles.
function neonSign(ctx, sx, sy, sw, sh, text, neon, m) {
  ctx.save();
  ctx.shadowColor = neon;
  ctx.shadowBlur = m * 0.05;
  ctx.lineWidth = Math.max(2, m * 0.012);
  ctx.strokeStyle = neon;
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
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(text, sx + sw / 2, sy + sh * 0.54);
  ctx.restore();
}

/** Neon shop signs, sagging wires, a crowd of silhouettes, wet-road glow. */
export function drawStreetScene(ctx, x, y, w, h, seed) {
  const rnd = rng(seed);
  const m = Math.min(w, h);
  const signTexts = ['MOTEL', 'BAR', '24H', 'DINER', 'CLUB', 'LIQUOR'];
  const pick = () => signTexts[Math.floor(rnd() * signTexts.length)];
  ctx.save();
  // Sagging wires across the top.
  ctx.lineWidth = Math.max(1.5, m * 0.008);
  ctx.strokeStyle = 'rgba(13,0,26,0.65)';
  for (const wy of [0.04, 0.09]) {
    const sag = y + h * (wy + 0.06);
    ctx.beginPath();
    ctx.moveTo(x, y + h * wy);
    ctx.quadraticCurveTo(x + w * 0.5, sag, x + w, y + h * wy);
    ctx.stroke();
  }
  const neonA = rnd() > 0.5 ? '#FF2E88' : '#00E5FF';
  const neonB = neonA === '#FF2E88' ? '#FFD60A' : '#FF6EC7';
  const sh = m * 0.13;
  neonSign(ctx, x + w * 0.06, y + h * 0.09, Math.min(w * 0.4, m * 0.42), sh, pick(), neonA, m);
  neonSign(ctx, x + w * 0.62, y + h * 0.07, Math.min(w * 0.3, m * 0.3), sh * 1.5, pick(), neonB, m);
  // Street lamp at the right edge, clear of the centred face.
  const lx = x + w * 0.9;
  const lampY = y + h * 0.5;
  ctx.lineWidth = Math.max(2, m * 0.012);
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.moveTo(lx, y + h);
  ctx.lineTo(lx, lampY);
  ctx.lineTo(lx + w * 0.05, lampY);
  ctx.stroke();
  ctx.save();
  ctx.shadowColor = '#FFD60A';
  ctx.shadowBlur = m * 0.04;
  ctx.fillStyle = '#FFD60A';
  fillDisc(ctx, lx + w * 0.05, y + h * 0.51, Math.max(2, m * 0.018));
  ctx.restore();
  // Crowd of silhouettes along the bottom.
  const n = 5 + Math.floor(rnd() * 4);
  const crowd = Array.from({ length: n }, (_, i) => ({
    px: x + w * ((i + 0.5) / n) + (rnd() - 0.5) * w * 0.04,
    ph: m * (0.1 + rnd() * 0.07),
  }));
  ctx.fillStyle = INK;
  const baseY = y + h;
  for (const person of crowd) {
    const hr = person.ph * 0.24;
    fillDisc(ctx, person.px, baseY - person.ph + hr, hr);
    const shoulder = person.ph * 0.3;
    const hip = person.ph * 0.34;
    const waistY = baseY - person.ph * 0.62;
    const neckY = baseY - person.ph * 0.66;
    trace(ctx, (c) => {
      c.moveTo(person.px - hip, baseY);
      c.quadraticCurveTo(person.px - shoulder, waistY, person.px, neckY);
      c.quadraticCurveTo(person.px + shoulder, waistY, person.px + hip, baseY);
    });
  }
  // Wet-road neon reflections.
  ctx.globalAlpha = 0.25;
  for (const [rx, neon] of [[x + w * 0.2, neonA], [x + w * 0.78, neonB]]) {
    ctx.fillStyle = neon;
    fillBox(ctx, rx, y + h * 0.92, w * 0.05, h * 0.08);
  }
  ctx.restore();
}

/* ------------------------------------------------------------ beach scene */

// The jetski + rider and its wake. `h` is the panel height (sets wake width).
function jetski(ctx, jx, jy, js, h) {
  ctx.fillStyle = INK;
  trace(ctx, (c) => {
    c.moveTo(jx - js * 0.5, jy);
    c.quadraticCurveTo(jx - js * 0.2, jy - js * 0.22, jx + js * 0.3, jy - js * 0.16);
    c.lineTo(jx + js * 0.5, jy);
    c.quadraticCurveTo(jx, jy + js * 0.14, jx - js * 0.5, jy);
  });
  fillDisc(ctx, jx - js * 0.05, jy - js * 0.34, js * 0.12);
  trace(ctx, (c) => {
    c.moveTo(jx - js * 0.12, jy - js * 0.24);
    c.quadraticCurveTo(jx, jy - js * 0.3, jx + js * 0.14, jy - js * 0.2);
    c.lineTo(jx + js * 0.1, jy - js * 0.12);
  });
  ctx.lineWidth = Math.max(1.5, h * 0.007);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.moveTo(jx - js * 0.5, jy + js * 0.05);
  ctx.lineTo(jx - js * 1.1, jy + js * 0.22);
  ctx.moveTo(jx - js * 0.5, jy + js * 0.08);
  ctx.lineTo(jx - js * 1.0, jy + js * 0.34);
  ctx.stroke();
}

const SEA_DAY = [[0, 'rgba(0,212,255,0.28)'], [1, 'rgba(43,10,74,0.34)']];
const SEA_NIGHT = [[0, 'rgba(6,18,40,0.55)'], [1, 'rgba(8,4,26,0.6)']];

/** Sea horizon with waves, a jetski and wake, a distant sail, palm edge. */
export function drawBeachScene(ctx, x, y, w, h, seed, night = false) {
  const rnd = rng(seed);
  const hy = y + h * 0.62; // horizon low, so the sea sits below the face zone
  const seaBottom = y + h * 0.85;
  ctx.save();
  const sea = ctx.createLinearGradient(x, hy, x, seaBottom);
  for (const [at, color] of night ? SEA_NIGHT : SEA_DAY) sea.addColorStop(at, color);
  ctx.fillStyle = sea;
  fillBox(ctx, x, hy, w, h * 0.33);
  // Light column on the water (warm by day, cyan by night).
  const refl = ctx.createLinearGradient(x, hy, x, seaBottom);
  refl.addColorStop(0, night ? 'rgba(0,229,255,0.3)' : 'rgba(255,214,10,0.35)');
  refl.addColorStop(1, night ? 'rgba(0,229,255,0)' : 'rgba(255,214,10,0)');
  ctx.fillStyle = refl;
  fillBox(ctx, x + w * 0.66, hy, w * 0.09, h * 0.33);
  // Wave lines.
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.5, h * 0.008);
  ctx.strokeStyle = night ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.45)';
  for (let i = 0; i < 4; i += 1) {
    const wy = hy + h * (0.06 + i * 0.07);
    const wx = x + w * (0.05 + rnd() * 0.2);
    const ww = w * (0.25 + rnd() * 0.3);
    const crest = wy - h * 0.015;
    const quarter = ww / 4;
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    let sx = 0;
    while (sx < ww) {
      ctx.quadraticCurveTo(wx + sx + ww / 8, crest, wx + sx + quarter, wy);
      sx += quarter;
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
  fillBox(ctx, sx - w * 0.015, hy - h * 0.004, w * 0.06, h * 0.012);
  drawPalm(ctx, x + w * 0.95, y + h * 0.99, Math.min(h * 0.55, w * 0.9), -0.12);
  drawBirds(ctx, x + w * 0.05, y + h * 0.06, w * 0.4, h * 0.2, 3, seed + 5);
  ctx.restore();
}

/* --------------------------------------------------------------- vignette */

// Small filler panels: props sit in the lower half so they never cross the
// face in the upper third. Variant 0 helicopter, 1 money, 2 police bar, 3 duffel.
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

// 12px tile, two dots in ONE path + one fill (single-path shape kept for
// pixel-identical AA).
function getDotTile() {
  if (dotTile) return dotTile;
  const t = document.createElement('canvas');
  t.width = 12;
  t.height = 12;
  const c = t.getContext('2d');
  c.fillStyle = '#ffffff';
  const d1 = 3, d2 = 9, dr = 1.5;
  c.beginPath();
  c.arc(d1, d1, dr, 0, TAU);
  c.arc(d2, d2, dr, 0, TAU);
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
  let o = 0;
  while (o < img.data.length) {
    const v = Math.floor(rnd() * 255);
    img.data[o] = v;
    img.data[o + 1] = v;
    img.data[o + 2] = v;
    img.data[o + 3] = 22;
    o += 4;
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
  fillBox(c, 0, 0, size, size);
  c.globalCompositeOperation = 'destination-in';
  const fade = c.createRadialGradient(r, r, 0, r, r, r);
  fade.addColorStop(0, `rgba(255,255,255,${strength})`);
  fade.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = fade;
  fillBox(c, 0, 0, size, size);
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
  ctx.globalAlpha = 0.5;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = ctx.createPattern(getNoiseTile(), 'repeat');
  fillBox(ctx, 0, 0, w, h);
  ctx.restore();
}

/* --------------------------------------------------------- panel borders */

/** Crisp straight comic borders (no jitter), a neon edge glow on the hero and
 *  one story panel, and a heavier outer frame. Panels tile exactly, so shared
 *  edges read as one clean ink line. */
export function drawPanelBorders(ctx, panels, w, h) {
  const lw = Math.max(4, Math.min(7, Math.min(w, h) * 0.006));
  ctx.save();
  ctx.lineJoin = 'miter';
  ctx.lineWidth = lw;
  ctx.strokeStyle = INK;
  for (const p of panels) ctx.strokeRect(p.x + lw / 2, p.y + lw / 2, p.w - lw, p.h - lw);
  const hero = panels.find((p) => p.hero) ?? panels[0];
  const story = panels[Math.min(3, panels.length - 1)];
  ctx.save();
  ctx.lineWidth = lw * 0.45;
  ctx.globalAlpha = 0.55;
  ctx.shadowBlur = lw * 2.2;
  ctx.shadowColor = '#00E5FF';
  ctx.strokeStyle = '#00E5FF';
  strokeSeg(ctx, hero.x + lw, hero.y + lw * 0.8, hero.x + hero.w - lw, hero.y + lw * 0.8);
  ctx.shadowColor = '#FF2E88';
  ctx.strokeStyle = '#FF2E88';
  strokeSeg(ctx, story.x + lw, story.y + story.h - lw * 0.8, story.x + story.w - lw, story.y + story.h - lw * 0.8);
  ctx.restore();
  ctx.lineWidth = lw * 1.4;
  ctx.strokeRect(0, 0, w, h);
  ctx.restore();
}

/* -------------------------------------------------------------- stickers */

function starPath(ctx, cx, cy, r, points = 5) {
  const verts = Array.from({ length: points * 2 }, (_, i) => {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = (i * Math.PI) / points - Math.PI / 2;
    return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad];
  });
  ctx.beginPath();
  verts.forEach(([px, py], i) => {
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
}

/** Rotated VICE CITY badge, top-left. Its small pink star is part of the logo
 *  and is NOT one of the five wanted stars below it. */
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
  ctx.strokeStyle = '#FF2E88';
  ctx.lineWidth = Math.max(2, s * 0.005);
  ctx.stroke();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.font = `900 ${bh * 0.5}px ${DISPLAY}`;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('VICE CITY', bw * 0.06, bh * 0.04);
  ctx.fillStyle = '#FF2E88';
  starPath(ctx, -bw * 0.38, 0, bh * 0.24);
  ctx.fill();
  ctx.restore();
}

/** Round LEONIDA badge, top-right (its yellow star is part of the logo). */
export function stickerLeonida(ctx, w, h) {
  const s = Math.min(w, h);
  const r = s * 0.075;
  ctx.save();
  ctx.translate(w - s * 0.1, h * 0.055 + r);
  ctx.rotate(0.07);
  ctx.fillStyle = INK;
  fillDisc(ctx, 0, 0, r);
  ctx.strokeStyle = '#FF7A18';
  ctx.lineWidth = Math.max(2, s * 0.005);
  strokeRing(ctx, 0, 0, r);
  ctx.strokeStyle = '#00E5FF';
  ctx.lineWidth = Math.max(1, s * 0.002);
  strokeRing(ctx, 0, 0, r * 0.82);
  ctx.fillStyle = '#FFD60A';
  starPath(ctx, 0, -r * 0.32, r * 0.3);
  ctx.fill();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.font = `900 ${r * 0.34}px ${DISPLAY}`;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('LEONIDA', 0, r * 0.34);
  ctx.restore();
}

/** v5: the full five-star wanted level — a neat, evenly spaced horizontal row
 *  of outlined gold stars below the VICE CITY badge.
 *
 *  Placement is computed, not scattered:
 *   * the row starts at 0.05w and steps by max(0.0375w, 0.039s), so on wide
 *     sheets it spans ~0.05w..0.20w and on square/portrait sheets the spacing
 *     stays ahead of the star diameter;
 *   * radius = min(0.019s, 0.0167w) keeps neighbours (fill + ink outline) from
 *     touching at every post size;
 *   * the steady baseline at 0.165h sits below the rotated badge's lowest
 *     corner (~0.05h + 0.089s) with clearance, and above the face zone: faces
 *     anchor at panel centre-x, so the left-hand row never crosses a head in
 *     the shipped concepts. No rotation — the row reads as a wanted level. */
export function stickerStars(ctx, w, h) {
  const s = Math.min(w, h);
  const r = Math.min(s * 0.019, w * 0.0167);
  const step = Math.max(w * 0.0375, s * 0.039);
  const cy = h * 0.165;
  ctx.save();
  ctx.fillStyle = '#FFD60A';
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.5, s * 0.0035);
  for (let i = 0; i < 5; i += 1) {
    starPath(ctx, w * 0.05 + i * step, cy, r);
    ctx.fill();
    ctx.stroke();
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
  fillDisc(ctx, cx, cy, r);
  ctx.strokeStyle = '#00E5FF';
  ctx.lineWidth = Math.max(2, s * 0.004);
  strokeRing(ctx, cx, cy, r);
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
  fillBox(ctx, x, y, w, h);
  ctx.strokeStyle = '#00E5FF';
  ctx.globalAlpha = 0.12;
  ctx.lineWidth = Math.max(3, w * 0.015);
  const stride = Math.max(14, w * 0.08);
  for (let i = -h; i < w + h; i += stride) {
    strokeSeg(ctx, x + i, y + h, x + i + h, y);
  }
  ctx.globalAlpha = 0.55;
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.008);
  ctx.font = `900 ${Math.min(w, h) * 0.07}px ${DISPLAY}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.strokeStyle = INK;
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeText('ADD PHOTO', x + w / 2, y + h / 2);
  ctx.fillText('ADD PHOTO', x + w / 2, y + h / 2);
  ctx.restore();
}
