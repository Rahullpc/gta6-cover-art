// The poster's vector art, all Canvas 2D and all deterministic (seeded RNG),
// so the live preview and the exported PNG are pixel-identical. Every panel
// gets action: striped sun, palms, neon skyline, sport car with tire smoke,
// beach jetski, neon street signs with a crowd, helicopter / money / police
// vignettes, halftone dots, film grain, hand-inked panel borders and badges.

const INK = '#0D001A';
const DISPLAY = '"Vice Display", "Arial Black", sans-serif';

/** xorshift32 PRNG: same seed, same poster, every render. */
export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return function next() {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

/* ------------------------------------------------------------------- sun */

/** Big striped synthwave sun with a warm glow, cut on an offscreen canvas. */
export function drawSun(ctx, cx, cy, r, alpha = 0.92) {
  const pad = 6;
  const size = Math.ceil(r * 2 + pad * 2);
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const c = off.getContext('2d');
  const mid = size / 2;
  const glow = c.createRadialGradient(mid, mid - r * 0.2, r * 0.1, mid, mid, r);
  glow.addColorStop(0, '#FFD60A');
  glow.addColorStop(0.55, '#FF9E00');
  glow.addColorStop(1, '#FF2E88');
  c.fillStyle = glow;
  c.beginPath();
  c.arc(mid, mid, r, 0, Math.PI * 2);
  c.fill();
  c.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 7; i++) {
    const y = mid + r * (0.04 + i * 0.14);
    c.fillRect(0, y, size, r * (0.03 + i * 0.022));
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowColor = '#FF7A18';
  ctx.shadowBlur = r * 0.55;
  ctx.drawImage(off, cx - mid, cy - mid);
  ctx.restore();
}

/* ------------------------------------------------------------------ moon */

/** Pale moon with a cyan halo for the night grades, plus a few hard stars. */
export function drawMoon(ctx, cx, cy, r) {
  ctx.save();
  const halo = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * 2.4);
  halo.addColorStop(0, 'rgba(0,229,255,0.3)');
  halo.addColorStop(1, 'rgba(0,229,255,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 2.4, 0, Math.PI * 2);
  ctx.fill();
  const face = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
  face.addColorStop(0, '#F4FBFF');
  face.addColorStop(1, '#9FD8E8');
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(13,0,26,0.14)';
  for (const [dx, dy, dr] of [[-0.3, 0.1, 0.18], [0.25, -0.25, 0.12], [0.15, 0.35, 0.1]]) {
    ctx.beginPath();
    ctx.arc(cx + dx * r, cy + dy * r, dr * r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
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
    ctx.beginPath();
    ctx.moveTo(px, py - r * 2);
    ctx.quadraticCurveTo(px, py, px + r * 2, py);
    ctx.quadraticCurveTo(px, py, px, py + r * 2);
    ctx.quadraticCurveTo(px, py, px - r * 2, py);
    ctx.quadraticCurveTo(px, py, px, py - r * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ palm */

/** Black palm silhouette: tapered curved trunk, nine drooping fronds, nuts. */
export function drawPalm(ctx, baseX, baseY, height, lean, color = INK) {
  const topX = baseX + lean * height;
  const topY = baseY - height;
  ctx.save();
  ctx.fillStyle = color;
  const w0 = height * 0.048;
  const w1 = height * 0.02;
  ctx.beginPath();
  ctx.moveTo(baseX - w0, baseY);
  ctx.bezierCurveTo(baseX - w0 + lean * height * 0.35, baseY - height * 0.55, topX - w1 - lean * height * 0.12, topY + height * 0.22, topX - w1, topY);
  ctx.lineTo(topX + w1, topY);
  ctx.bezierCurveTo(topX + w1 - lean * height * 0.12, topY + height * 0.22, baseX + w0 + lean * height * 0.35, baseY - height * 0.55, baseX + w0, baseY);
  ctx.closePath();
  ctx.fill();
  const fronds = 9;
  for (let i = 0; i < fronds; i++) {
    const t = i / (fronds - 1);
    const ang = ((-168 + t * 156) * Math.PI) / 180;
    const len = height * (0.34 + 0.12 * Math.sin(t * Math.PI));
    const tipX = topX + Math.cos(ang) * len;
    const tipY = topY + Math.sin(ang) * len * 0.7 + len * 0.2;
    const midX = topX + Math.cos(ang) * len * 0.5;
    const midY = topY + Math.sin(ang) * len * 0.35 - len * 0.1;
    const fat = len * 0.13;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(midX, midY - fat, tipX, tipY);
    ctx.quadraticCurveTo(midX, midY + fat * 0.55, topX, topY);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(topX - height * 0.03, topY + height * 0.04, height * 0.026, 0, Math.PI * 2);
  ctx.arc(topX + height * 0.032, topY + height * 0.052, height * 0.022, 0, Math.PI * 2);
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

/* --------------------------------------------------------------- skyline */

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
    ctx.fillStyle = INK;
    ctx.fillRect(bx, baseY - bh, bw, bh);
    ctx.save();
    ctx.strokeStyle = neon;
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = Math.max(1.5, h * 0.012);
    ctx.shadowColor = neon;
    ctx.shadowBlur = h * 0.04;
    ctx.beginPath();
    ctx.moveTo(bx, baseY - bh);
    ctx.lineTo(bx + bw, baseY - bh);
    ctx.stroke();
    ctx.restore();
    const step = Math.max(4, h * 0.035);
    ctx.fillStyle = neon;
    for (let wy = baseY - bh + step; wy < baseY - step * 0.5; wy += step) {
      for (let wx = bx + step * 0.6; wx < bx + bw - step * 0.4; wx += step) {
        if (rnd() < 0.4) {
          ctx.globalAlpha = 0.45 + rnd() * 0.45;
          ctx.fillRect(wx, wy, step * 0.32, step * 0.32);
        }
      }
    }
    ctx.globalAlpha = 1;
    if (rnd() < 0.28) {
      ctx.strokeStyle = '#FF6EC7';
      ctx.lineWidth = Math.max(1, h * 0.008);
      ctx.beginPath();
      ctx.moveTo(bx + bw * 0.5, baseY - bh);
      ctx.lineTo(bx + bw * 0.5, baseY - bh - h * 0.12);
      ctx.stroke();
      ctx.fillStyle = '#FFD60A';
      ctx.beginPath();
      ctx.arc(bx + bw * 0.5, baseY - bh - h * 0.12, Math.max(1.5, h * 0.012), 0, Math.PI * 2);
      ctx.fill();
    }
    bx += bw + w * 0.008;
  }
  ctx.restore();
}

/* ------------------------------------------------------------------- car */

/** Low sport car facing right, tilted a little, with underglow, tire smoke,
 *  speed lines, neon rims and a tiny yellow plate. Box: W wide, W*0.3 tall. */
export function drawCar(ctx, x, y, W, accent = '#00E5FF', tilt = -0.045) {
  const H = W * 0.3;
  ctx.save();
  ctx.translate(x + W / 2, y + H / 2);
  ctx.rotate(tilt);
  ctx.translate(-W / 2, -H / 2);

  // Tire smoke drifting off the rear.
  const rnd = rng(4242);
  for (let i = 0; i < 5; i++) {
    const px = -W * (0.02 + i * 0.045);
    const py = H * (0.62 - i * 0.05) + rnd() * H * 0.06;
    const pr = W * (0.045 + i * 0.02);
    ctx.fillStyle = i % 2 ? 'rgba(255,110,199,0.16)' : 'rgba(210,200,220,0.18)';
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  }
  // Speed lines.
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = Math.max(1.5, W * 0.006);
  for (const ly of [0.3, 0.46, 0.6]) {
    ctx.beginPath();
    ctx.moveTo(-W * 0.24, H * ly);
    ctx.lineTo(-W * 0.02, H * ly);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Underglow puddle.
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const glow = ctx.createRadialGradient(W * 0.5, H * 0.9, W * 0.02, W * 0.5, H * 0.9, W * 0.55);
  glow.addColorStop(0, accent === '#00E5FF' ? 'rgba(0,229,255,0.55)' : 'rgba(255,46,136,0.55)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.scale(1, 0.26);
  ctx.beginPath();
  ctx.arc(W * 0.5, H * 0.9 / 0.26, W * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Body: spoiler -> cabin -> long hood -> nose, with wheel arches cut out.
  const body = new Path2D();
  body.moveTo(W * 0.02, H * 0.6);
  body.lineTo(W * 0.035, H * 0.4);
  body.lineTo(0, H * 0.34);
  body.lineTo(W * 0.1, H * 0.32);
  body.lineTo(W * 0.12, H * 0.4);
  body.quadraticCurveTo(W * 0.2, H * 0.36, W * 0.26, H * 0.22);
  body.quadraticCurveTo(W * 0.35, H * 0.08, W * 0.47, H * 0.09);
  body.quadraticCurveTo(W * 0.57, H * 0.11, W * 0.64, H * 0.27);
  body.quadraticCurveTo(W * 0.81, H * 0.31, W * 0.965, H * 0.41);
  body.quadraticCurveTo(W * 0.995, H * 0.45, W * 0.99, H * 0.57);
  body.lineTo(W * 0.9, H * 0.65);
  body.arc(W * 0.78, H * 0.65, W * 0.115, 0, Math.PI, true);
  body.lineTo(W * 0.34, H * 0.65);
  body.arc(W * 0.22, H * 0.65, W * 0.115, 0, Math.PI, true);
  body.closePath();
  ctx.fillStyle = INK;
  ctx.fill(body);

  // Magenta rim light along the roof and hood.
  ctx.save();
  ctx.strokeStyle = '#FF2E88';
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = Math.max(1.5, W * 0.008);
  ctx.shadowColor = '#FF2E88';
  ctx.shadowBlur = W * 0.02;
  ctx.beginPath();
  ctx.moveTo(W * 0.12, H * 0.4);
  ctx.quadraticCurveTo(W * 0.2, H * 0.36, W * 0.26, H * 0.22);
  ctx.quadraticCurveTo(W * 0.35, H * 0.08, W * 0.47, H * 0.09);
  ctx.quadraticCurveTo(W * 0.57, H * 0.11, W * 0.64, H * 0.27);
  ctx.quadraticCurveTo(W * 0.81, H * 0.31, W * 0.965, H * 0.41);
  ctx.stroke();
  ctx.restore();

  // Glass.
  ctx.fillStyle = 'rgba(0,229,255,0.3)';
  ctx.beginPath();
  ctx.moveTo(W * 0.3, H * 0.24);
  ctx.quadraticCurveTo(W * 0.37, H * 0.13, W * 0.46, H * 0.13);
  ctx.quadraticCurveTo(W * 0.54, H * 0.14, W * 0.59, H * 0.25);
  ctx.closePath();
  ctx.fill();

  // Wheels with neon rims.
  for (const wx of [W * 0.22, W * 0.78]) {
    ctx.fillStyle = '#050308';
    ctx.beginPath();
    ctx.arc(wx, H * 0.65, W * 0.105, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = Math.max(1.2, W * 0.006);
    ctx.beginPath();
    ctx.arc(wx, H * 0.65, W * 0.06, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Headlight slash + beam.
  ctx.fillStyle = '#FFD60A';
  ctx.beginPath();
  ctx.moveTo(W * 0.955, H * 0.43);
  ctx.lineTo(W * 0.99, H * 0.46);
  ctx.lineTo(W * 0.955, H * 0.49);
  ctx.closePath();
  ctx.fill();
  const beam = ctx.createLinearGradient(W * 0.99, 0, W * 1.3, 0);
  beam.addColorStop(0, 'rgba(255,214,10,0.3)');
  beam.addColorStop(1, 'rgba(255,214,10,0)');
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(W * 0.99, H * 0.44);
  ctx.lineTo(W * 1.3, H * 0.3);
  ctx.lineTo(W * 1.3, H * 0.62);
  ctx.lineTo(W * 0.99, H * 0.5);
  ctx.closePath();
  ctx.fill();

  // Tiny plate.
  ctx.fillStyle = '#FFD60A';
  ctx.fillRect(W * 0.025, H * 0.48, W * 0.09, H * 0.12);
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, W * 0.003);
  ctx.strokeRect(W * 0.025, H * 0.48, W * 0.09, H * 0.12);
  ctx.fillStyle = INK;
  ctx.font = `900 ${W * 0.05}px ${DISPLAY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('VICE', W * 0.07, H * 0.545);
  ctx.restore();
}

/* ------------------------------------------------------------ helicopter */

/** Police helicopter silhouette with a searchlight cone. `s` = body length. */
export function drawHelicopter(ctx, cx, cy, s) {
  ctx.save();
  ctx.translate(cx, cy);
  // Searchlight cone.
  const cone = ctx.createLinearGradient(0, s * 0.1, 0, s * 1.5);
  cone.addColorStop(0, 'rgba(255,214,10,0.3)');
  cone.addColorStop(1, 'rgba(255,214,10,0)');
  ctx.fillStyle = cone;
  ctx.beginPath();
  ctx.moveTo(s * 0.08, s * 0.1);
  ctx.lineTo(-s * 0.4, s * 1.5);
  ctx.lineTo(s * 0.6, s * 1.5);
  ctx.closePath();
  ctx.fill();
  // Tail boom + fin.
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.moveTo(-s * 0.25, -s * 0.04);
  ctx.lineTo(-s * 0.62, -s * 0.1);
  ctx.lineTo(-s * 0.62, -s * 0.02);
  ctx.lineTo(-s * 0.25, s * 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(-s * 0.66, -s * 0.2, s * 0.05, s * 0.16);
  // Body.
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.32, s * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.strokeStyle = '#FF2E88';
  ctx.globalAlpha = 0.8;
  ctx.lineWidth = Math.max(1.5, s * 0.02);
  ctx.shadowColor = '#FF2E88';
  ctx.shadowBlur = s * 0.06;
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.02, s * 0.3, s * 0.12, 0, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  // Cockpit glass.
  ctx.fillStyle = 'rgba(0,229,255,0.4)';
  ctx.beginPath();
  ctx.ellipse(s * 0.18, -s * 0.02, s * 0.1, s * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  // Rotor blur + blade + mast.
  ctx.fillStyle = 'rgba(13,0,26,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.22, s * 0.52, s * 0.035, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(2, s * 0.03);
  ctx.beginPath();
  ctx.moveTo(-s * 0.5, -s * 0.22);
  ctx.lineTo(s * 0.5, -s * 0.22);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.14);
  ctx.lineTo(0, -s * 0.22);
  ctx.stroke();
  // Skids.
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
    ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1.2, bw * 0.05);
    ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);
    ctx.beginPath();
    ctx.arc(0, 0, bh * 0.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.font = `900 ${bh * 0.5}px ${DISPLAY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 0, bh * 0.03);
    ctx.restore();
  }
  ctx.restore();
}

/* ------------------------------------------------------------ police bar */

/** A light bar with magenta / cyan lenses and glow rays. */
export function drawPoliceBar(ctx, x, y, w) {
  const bh = w * 0.16;
  ctx.save();
  for (const [lx, color] of [[x + w * 0.22, '#FF2E88'], [x + w * 0.78, '#00E5FF']]) {
    const rays = ctx.createLinearGradient(lx, y, lx, y - w * 0.5);
    rays.addColorStop(0, color === '#FF2E88' ? 'rgba(255,46,136,0.28)' : 'rgba(0,229,255,0.28)');
    rays.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rays;
    ctx.beginPath();
    ctx.moveTo(lx - w * 0.06, y);
    ctx.lineTo(lx - w * 0.22, y - w * 0.5);
    ctx.lineTo(lx + w * 0.22, y - w * 0.5);
    ctx.lineTo(lx + w * 0.06, y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.roundRect(x, y, w, bh, bh * 0.3);
  ctx.fill();
  for (const [lx, color] of [[x + w * 0.22, '#FF2E88'], [x + w * 0.78, '#00E5FF']]) {
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

/** Neon shop signs, hanging wires, a crowd of silhouettes and wet-road glow.
 *  All detail sizes follow min(w, h) so narrow slices stay readable, and sign
 *  text is shrunk to fit its box — no garbled overflow. */
export function drawStreetScene(ctx, x, y, w, h, seed) {
  const rnd = rng(seed);
  const m = Math.min(w, h);
  const signs = ['MOTEL', 'BAR', '24H', 'DINER', 'CLUB', 'LIQUOR'];
  const pick = () => signs[Math.floor(rnd() * signs.length)];
  ctx.save();
  // Hanging wires.
  ctx.strokeStyle = 'rgba(13,0,26,0.65)';
  ctx.lineWidth = Math.max(1.5, m * 0.008);
  for (const wy of [0.08, 0.16]) {
    ctx.beginPath();
    ctx.moveTo(x, y + h * wy);
    ctx.quadraticCurveTo(x + w * 0.5, y + h * (wy + 0.06), x + w, y + h * wy);
    ctx.stroke();
  }
  // Two neon signs, sized to the panel's short side.
  const neonA = rnd() > 0.5 ? '#FF2E88' : '#00E5FF';
  const neonB = neonA === '#FF2E88' ? '#FFD60A' : '#FF6EC7';
  const sign = (sx, sy, sw, sh, text, neon) => {
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
  };
  const sh = m * 0.13;
  sign(x + w * 0.06, y + h * 0.09, Math.min(w * 0.4, m * 0.42), sh, pick(), neonA);
  sign(x + w * 0.62, y + h * 0.07, Math.min(w * 0.3, m * 0.3), sh * 1.5, pick(), neonB);
  // Street lamp with a warm cone.
  const lx = x + w * 0.52;
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(2, m * 0.012);
  ctx.beginPath();
  ctx.moveTo(lx, y + h);
  ctx.lineTo(lx, y + h * 0.42);
  ctx.lineTo(lx + w * 0.05, y + h * 0.42);
  ctx.stroke();
  ctx.save();
  ctx.fillStyle = '#FFD60A';
  ctx.shadowColor = '#FFD60A';
  ctx.shadowBlur = m * 0.04;
  ctx.beginPath();
  ctx.arc(lx + w * 0.05, y + h * 0.43, Math.max(2, m * 0.018), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Crowd along the bottom, sized to the short side.
  const n = 5 + Math.floor(rnd() * 4);
  ctx.fillStyle = INK;
  for (let i = 0; i < n; i++) {
    const px = x + w * ((i + 0.5) / n) + (rnd() - 0.5) * w * 0.04;
    const ph = m * (0.1 + rnd() * 0.07);
    const hr = ph * 0.24;
    const baseY = y + h;
    ctx.beginPath();
    ctx.arc(px, baseY - ph + hr, hr, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(px - ph * 0.34, baseY);
    ctx.quadraticCurveTo(px - ph * 0.3, baseY - ph * 0.62, px, baseY - ph * 0.66);
    ctx.quadraticCurveTo(px + ph * 0.3, baseY - ph * 0.62, px + ph * 0.34, baseY);
    ctx.closePath();
    ctx.fill();
  }
  // Wet neon reflections at the kerb.
  ctx.globalAlpha = 0.25;
  for (const [rx, neon] of [[x + w * 0.2, neonA], [x + w * 0.78, neonB]]) {
    ctx.fillStyle = neon;
    ctx.fillRect(rx, y + h * 0.92, w * 0.05, h * 0.08);
  }
  ctx.restore();
}

/* ------------------------------------------------------------ beach scene */

/** Sea horizon with waves, a jetski and its wake, a distant sail, palm edge.
 *  `night` darkens the sea and swaps the sun reflection for moonlight. */
export function drawBeachScene(ctx, x, y, w, h, seed, night = false) {
  const rnd = rng(seed);
  const hy = y + h * 0.52;
  ctx.save();
  // Sea wash + reflection column.
  const sea = ctx.createLinearGradient(x, hy, x, y + h * 0.85);
  if (night) {
    sea.addColorStop(0, 'rgba(6,18,40,0.55)');
    sea.addColorStop(1, 'rgba(8,4,26,0.6)');
  } else {
    sea.addColorStop(0, 'rgba(0,212,255,0.28)');
    sea.addColorStop(1, 'rgba(43,10,74,0.34)');
  }
  ctx.fillStyle = sea;
  ctx.fillRect(x, hy, w, h * 0.33);
  const refl = ctx.createLinearGradient(x, hy, x, y + h * 0.85);
  refl.addColorStop(0, night ? 'rgba(0,229,255,0.3)' : 'rgba(255,214,10,0.35)');
  refl.addColorStop(1, night ? 'rgba(0,229,255,0)' : 'rgba(255,214,10,0)');
  ctx.fillStyle = refl;
  ctx.fillRect(x + w * 0.66, hy, w * 0.09, h * 0.33);
  // Wave strokes (moonlit and subtle at night).
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
  // Jetski + rider + wake.
  const jx = x + w * 0.32;
  const jy = hy + h * 0.08;
  const js = w * 0.13;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.moveTo(jx - js * 0.5, jy);
  ctx.quadraticCurveTo(jx - js * 0.2, jy - js * 0.22, jx + js * 0.3, jy - js * 0.16);
  ctx.lineTo(jx + js * 0.5, jy);
  ctx.quadraticCurveTo(jx, jy + js * 0.14, jx - js * 0.5, jy);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(jx - js * 0.05, jy - js * 0.34, js * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(jx - js * 0.12, jy - js * 0.24);
  ctx.quadraticCurveTo(jx, jy - js * 0.3, jx + js * 0.14, jy - js * 0.2);
  ctx.lineTo(jx + js * 0.1, jy - js * 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = Math.max(1.5, h * 0.007);
  ctx.beginPath();
  ctx.moveTo(jx - js * 0.5, jy + js * 0.05);
  ctx.lineTo(jx - js * 1.1, jy + js * 0.22);
  ctx.moveTo(jx - js * 0.5, jy + js * 0.08);
  ctx.lineTo(jx - js * 1.0, jy + js * 0.34);
  ctx.stroke();
  // Distant sail.
  const sx = x + w * 0.82;
  ctx.fillStyle = night ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.moveTo(sx, hy - h * 0.05);
  ctx.lineTo(sx, hy - h * 0.005);
  ctx.lineTo(sx + w * 0.035, hy - h * 0.005);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.fillRect(sx - w * 0.015, hy - h * 0.004, w * 0.06, h * 0.012);
  // Foreground palm at the right edge + birds.
  drawPalm(ctx, x + w * 0.95, y + h * 0.99, Math.min(h * 0.55, w * 0.9), -0.12);
  drawBirds(ctx, x + w * 0.05, y + h * 0.06, w * 0.4, h * 0.2, 3, seed + 5);
  ctx.restore();
}

/* --------------------------------------------------------------- vignette */

/** Small filler panels: 0 helicopter, 1 fluttering money, 2 police light bar. */
export function drawVignette(ctx, x, y, w, h, variant, seed) {
  if (variant === 0) {
    drawHelicopter(ctx, x + w * 0.5, y + h * 0.38, Math.min(w, h) * 0.62);
    drawBirds(ctx, x + w * 0.08, y + h * 0.08, w * 0.3, h * 0.18, 2, seed + 9);
  } else if (variant === 1) {
    drawMoney(ctx, x, y, w, h, 7, seed);
  } else {
    drawPoliceBar(ctx, x + w * 0.18, y + h * 0.6, w * 0.64);
    drawMoney(ctx, x + w * 0.1, y + h * 0.05, w * 0.8, h * 0.4, 3, seed + 3);
  }
}

/* -------------------------------------------------- halftone + film grain */

let dotTile = null;
let noiseTile = null;

function getDotTile() {
  if (dotTile) return dotTile;
  const t = document.createElement('canvas');
  t.width = 12;
  t.height = 12;
  const c = t.getContext('2d');
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.arc(3, 3, 1.5, 0, Math.PI * 2);
  c.arc(9, 9, 1.5, 0, Math.PI * 2);
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

function dotCluster(ctx, cx, cy, r, strength) {
  const size = Math.ceil(r * 2);
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const c = off.getContext('2d');
  c.fillStyle = c.createPattern(getDotTile(), 'repeat');
  c.fillRect(0, 0, size, size);
  c.globalCompositeOperation = 'destination-in';
  const fade = c.createRadialGradient(r, r, 0, r, r, r);
  fade.addColorStop(0, `rgba(255,255,255,${strength})`);
  fade.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = fade;
  c.fillRect(0, 0, size, size);
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
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/* --------------------------------------------------------- panel borders */

/** Thick hand-inked black borders (slightly jittered corners, never perfectly
 *  straight) plus a neon edge glow on the hero and one story panel. */
export function drawPanelBorders(ctx, panels, w, h, seed = 7) {
  const rnd = rng(seed);
  const lw = Math.max(4, Math.min(7, Math.min(w, h) * 0.0055));
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'miter';
  ctx.lineWidth = lw;
  for (const p of panels) {
    const j = () => (rnd() - 0.5) * lw * 0.9;
    ctx.beginPath();
    ctx.moveTo(p.x + lw / 2 + j(), p.y + lw / 2 + j());
    ctx.lineTo(p.x + p.w - lw / 2 + j(), p.y + lw / 2 + j());
    ctx.lineTo(p.x + p.w - lw / 2 + j(), p.y + p.h - lw / 2 + j());
    ctx.lineTo(p.x + lw / 2 + j(), p.y + p.h - lw / 2 + j());
    ctx.closePath();
    ctx.stroke();
  }
  // Neon edge glow: hero top edge cyan, a story panel bottom edge magenta.
  const hero = panels.find((p) => p.hero) ?? panels[0];
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = lw * 0.45;
  ctx.strokeStyle = '#00E5FF';
  ctx.shadowColor = '#00E5FF';
  ctx.shadowBlur = lw * 2.2;
  ctx.beginPath();
  ctx.moveTo(hero.x + lw, hero.y + lw * 0.8);
  ctx.lineTo(hero.x + hero.w - lw, hero.y + lw * 0.8);
  ctx.stroke();
  const story = panels[Math.min(3, panels.length - 1)];
  ctx.strokeStyle = '#FF2E88';
  ctx.shadowColor = '#FF2E88';
  ctx.beginPath();
  ctx.moveTo(story.x + lw, story.y + story.h - lw * 0.8);
  ctx.lineTo(story.x + story.w - lw, story.y + story.h - lw * 0.8);
  ctx.stroke();
  ctx.restore();
  ctx.lineWidth = lw * 1.35;
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
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = Math.max(2, s * 0.005);
  ctx.strokeStyle = '#FF7A18';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(1, s * 0.002);
  ctx.strokeStyle = '#00E5FF';
  ctx.stroke();
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
    const cy = h * (0.17 + rnd() * 0.09);
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
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = Math.max(2, s * 0.004);
  ctx.strokeStyle = '#00E5FF';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.9, 0, Math.PI * 2);
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
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = '#00E5FF';
  ctx.lineWidth = Math.max(3, w * 0.015);
  for (let i = -h; i < w + h; i += Math.max(14, w * 0.08)) {
    ctx.beginPath();
    ctx.moveTo(x + i, y + h);
    ctx.lineTo(x + i + h, y);
    ctx.stroke();
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