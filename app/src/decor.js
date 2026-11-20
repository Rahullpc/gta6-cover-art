// decor.js — all vector art and stickers.
// Every random choice comes from a small seeded generator, so the same cover
// always paints the same pixels. Scene action pins to the top corners and
// the lower half — never across a face.

export function rng(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const INK = '#0D001A';
const PINK = '#FF2E88';
const CYAN = '#00E5FF';
const GOLD = '#FFD60A';
const ORANGE = '#FF7A18';

export function starPath(ctx, cx, cy, r, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = rot + i * Math.PI / 5;
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export function drawStar(ctx, cx, cy, r, fill = GOLD, stroke = INK, lw = 1) {
  starPath(ctx, cx, cy, r);
  ctx.fillStyle = fill; ctx.fill();
  if (lw > 0) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
}

// Four-point sparkle star.
export function sparkle(ctx, cx, cy, r, fill = '#FFFFFF') {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r); ctx.quadraticCurveTo(cx, cy, cx + r, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy + r); ctx.quadraticCurveTo(cx, cy, cx - r, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy - r);
  ctx.fill();
}

export function drawBird(ctx, x, y, s, color = INK) {
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, s * 0.14);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - s, y);
  ctx.quadraticCurveTo(x - s * 0.4, y - s * 0.7, x, y);
  ctx.quadraticCurveTo(x + s * 0.4, y - s * 0.7, x + s, y);
  ctx.stroke();
}

export function drawPlane(ctx, x, y, s, color = '#FFFFFF') {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - s, y);
  ctx.lineTo(x + s * 0.9, y - s * 0.28);
  ctx.lineTo(x + s, y);
  ctx.lineTo(x + s * 0.9, y + s * 0.28);
  ctx.lineTo(x - s * 0.7, y + s * 0.1);
  ctx.lineTo(x - s * 0.55, y + s * 0.5);
  ctx.lineTo(x - s * 0.8, y);
  ctx.lineTo(x - s * 0.55, y - s * 0.5);
  ctx.lineTo(x - s * 0.7, y - s * 0.1);
  ctx.closePath(); ctx.fill();
}

export function drawMoon(ctx, cx, cy, r) {
  const halo = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * 2.4);
  halo.addColorStop(0, 'rgba(255,244,214,0.5)');
  halo.addColorStop(1, 'rgba(255,244,214,0)');
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(cx, cy, r * 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFF6DA';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(214,196,150,0.55)';
  const craters = [[-0.3, -0.2, 0.2], [0.25, 0.15, 0.16], [0.05, -0.4, 0.12], [-0.1, 0.35, 0.14]];
  for (const [dx, dy, rr] of craters) {
    ctx.beginPath(); ctx.arc(cx + dx * r, cy + dy * r, rr * r, 0, Math.PI * 2); ctx.fill();
  }
}

// Palm silhouette: tapered trunk curving to one side, long fronds arcing
// from the top. lean > 0 bends right, flip mirrors it.
export function drawPalm(ctx, bx, by, h, lean = 0.12, flip = false, color = INK) {
  const s = flip ? -1 : 1;
  const topX = bx + lean * h * s, topY = by - h;
  ctx.strokeStyle = color; ctx.fillStyle = color;
  ctx.lineCap = 'round';
  // Trunk: a tapered curve.
  ctx.beginPath();
  ctx.moveTo(bx - h * 0.035, by);
  ctx.quadraticCurveTo(bx + lean * h * 0.4 * s - h * 0.02, by - h * 0.55, topX, topY);
  ctx.lineTo(topX + h * 0.035, topY);
  ctx.quadraticCurveTo(bx + lean * h * 0.4 * s + h * 0.02, by - h * 0.55, bx + h * 0.035, by);
  ctx.closePath(); ctx.fill();
  // Fronds: long arcs fanning from the crown.
  ctx.lineWidth = Math.max(1.5, h * 0.02);
  const fans = [-1.15, -0.8, -0.45, -0.12, 0.22, 0.55, 0.85, 1.1];
  for (const f of fans) {
    const ex = topX + Math.sin(f) * h * 0.42 * s;
    const ey = topY + h * 0.16 + Math.abs(f) * h * 0.16;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(topX + Math.sin(f) * h * 0.3 * s, topY - h * 0.06, ex, ey);
    ctx.stroke();
  }
  // Coconuts.
  ctx.beginPath(); ctx.arc(topX - h * 0.03, topY + h * 0.03, h * 0.028, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(topX + h * 0.035, topY + h * 0.035, h * 0.025, 0, Math.PI * 2); ctx.fill();
}

export function drawMoneyBill(ctx, cx, cy, w, rot = 0) {
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(rot);
  ctx.fillStyle = GOLD;
  ctx.fillRect(-w / 2, -w * 0.28, w, w * 0.56);
  ctx.fillStyle = INK;
  ctx.font = `900 ${w * 0.42}px Arial`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('$', 0, w * 0.02);
  ctx.restore();
}

export function drawCar(ctx, cx, floorY, w) {
  const h = w * 0.30;
  const x0 = cx - w / 2, y0 = floorY - h;
  ctx.save();
  ctx.translate(cx, floorY); ctx.rotate(-0.045); ctx.translate(-cx, -floorY);
  // Underglow.
  ctx.fillStyle = 'rgba(0,229,255,0.35)';
  ctx.beginPath(); ctx.ellipse(cx, floorY + 2, w * 0.52, h * 0.14, 0, 0, Math.PI * 2); ctx.fill();
  // Body.
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.moveTo(x0, floorY - h * 0.22);
  ctx.lineTo(x0 + w * 0.06, floorY - h * 0.30);
  ctx.lineTo(x0 + w * 0.30, floorY - h * 0.62);
  ctx.lineTo(x0 + w * 0.52, floorY - h * 0.95);
  ctx.lineTo(x0 + w * 0.72, floorY - h * 0.95);
  ctx.lineTo(x0 + w * 0.88, floorY - h * 0.55);
  ctx.lineTo(x0 + w * 0.98, floorY - h * 0.28);
  ctx.lineTo(x0 + w, floorY - h * 0.18);
  ctx.lineTo(x0 + w, floorY);
  ctx.lineTo(x0, floorY);
  ctx.closePath(); ctx.fill();
  // Glasshouse, cyan-tinted.
  ctx.fillStyle = 'rgba(0,229,255,0.85)';
  ctx.beginPath();
  ctx.moveTo(x0 + w * 0.33, floorY - h * 0.58);
  ctx.lineTo(x0 + w * 0.52, floorY - h * 0.86);
  ctx.lineTo(x0 + w * 0.70, floorY - h * 0.86);
  ctx.lineTo(x0 + w * 0.82, floorY - h * 0.55);
  ctx.closePath(); ctx.fill();
  // Wheels.
  ctx.fillStyle = '#050505';
  for (const wx of [x0 + w * 0.22, x0 + w * 0.78]) {
    ctx.beginPath(); ctx.arc(wx, floorY - h * 0.05, h * 0.20, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1E2A33';
    ctx.beginPath(); ctx.arc(wx, floorY - h * 0.05, h * 0.10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#050505';
  }
  // Speed lines behind.
  ctx.strokeStyle = 'rgba(0,229,255,0.8)'; ctx.lineWidth = Math.max(1, h * 0.05);
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const yy = floorY - h * (0.35 + i * 0.22);
    ctx.beginPath();
    ctx.moveTo(x0 - w * 0.28, yy);
    ctx.lineTo(x0 - w * 0.08, yy);
    ctx.stroke();
  }
  ctx.restore();
}

// A neon sign that always fits: the font shrinks until the word fits the
// allowed width, and the box hugs the text instead of forcing a tall
// narrow box that the word can never fit.
function neonSign(ctx, x, y, maxW, maxH, word, color) {
  let fs = maxH * 0.55;
  ctx.font = `900 ${fs}px Arial`;
  const fitW = maxW * 0.88;
  const tw = ctx.measureText(word).width;
  if (tw > fitW) { fs *= fitW / tw; ctx.font = `900 ${fs}px Arial`; }
  const bw = Math.min(maxW, ctx.measureText(word).width + fs * 1.0);
  const bh = Math.min(maxH, fs * 1.9);
  ctx.save();
  ctx.shadowColor = color; ctx.shadowBlur = 14;
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(1.5, bh * 0.09);
  ctx.fillStyle = 'rgba(13,0,26,0.85)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, bw, bh, bh * 0.35); else ctx.rect(x, y, bw, bh);
  ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `900 ${fs}px Arial`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(word, x + bw / 2, y + bh * 0.54);
  ctx.restore();
}

function crowdRow(ctx, x, y, w, h, count, rand) {
  ctx.fillStyle = INK;
  for (let i = 0; i < count; i++) {
    const cx = x + (i + 0.5) / count * w + (rand() - 0.5) * w * 0.04;
    const hh = h * (0.75 + rand() * 0.35);
    ctx.beginPath(); ctx.arc(cx, y - hh * 0.72, h * 0.16, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - h * 0.22, y);
    ctx.quadraticCurveTo(cx - h * 0.24, y - hh * 0.62, cx, y - hh * 0.6);
    ctx.quadraticCurveTo(cx + h * 0.24, y - hh * 0.62, cx + h * 0.22, y);
    ctx.closePath(); ctx.fill();
  }
}

// Scene art dispatch by panel tag. rect is {x,y,w,h} in px; seed varies art.
export function drawScene(ctx, tag, rect, night, seed, index) {
  const { x, y, w, h } = rect;
  const rand = rng(seed * 7919 + index * 131 + 7);
  const s = Math.min(w, h);
  if (tag === 'hero') {
    if (night) {
      drawMoon(ctx, x + w * 0.86, y + h * 0.14, s * 0.10);
      for (let i = 0; i < 10; i++) {
        sparkle(ctx, x + w * (0.05 + rand() * 0.85), y + h * (0.02 + rand() * 0.16), s * (0.008 + rand() * 0.01));
      }
    }
    // NOTE: no daytime birds in the hero panel — a bird row here used to
    // sit behind the VICE CITY badge and its wing-tips peeked out above
    // the badge like cut-off letters. Birds live on in skyline/sea scenes.
    drawPalm(ctx, x + w * 0.06, y + h, h * 0.52, 0.14, false);
    drawMoneyBill(ctx, x + w * 0.86, y + h * 0.86, s * 0.075, 0.3);
    drawMoneyBill(ctx, x + w * 0.76, y + h * 0.92, s * 0.06, -0.4);
  } else if (tag === 'skyline') {
    // NO buildings, NO towers, NO skyline row — sky art only.
    if (night) {
      for (let i = 0; i < 7; i++) {
        sparkle(ctx, x + w * (0.08 + rand() * 0.84), y + h * (0.06 + rand() * 0.2), s * (0.008 + rand() * 0.009));
      }
    } else {
      for (let i = 0; i < 3; i++) drawBird(ctx, x + w * (0.12 + i * 0.12 + rand() * 0.04), y + h * (0.10 + rand() * 0.08), s * 0.04);
      drawPlane(ctx, x + w * 0.72, y + h * 0.16, s * 0.05);
    }
  } else if (tag === 'car') {
    const cw = Math.min(w * 0.86, h * 2.4);
    drawCar(ctx, x + w * 0.5, y + h * 0.97, cw);
  } else if (tag === 'beach') {
    const hy = y + h * 0.62;
    const sea = ctx.createLinearGradient(0, hy, 0, y + h);
    if (night) { sea.addColorStop(0, 'rgba(10,16,48,0.55)'); sea.addColorStop(1, 'rgba(6,10,30,0.60)'); }
    else { sea.addColorStop(0, 'rgba(0,229,255,0.28)'); sea.addColorStop(1, 'rgba(43,10,74,0.34)'); }
    ctx.fillStyle = sea;
    ctx.fillRect(x, hy, w, y + h - hy);
    // Light column on the water.
    ctx.fillStyle = night ? 'rgba(0,229,255,0.22)' : 'rgba(255,214,10,0.35)';
    const cxp = x + w * 0.3;
    ctx.beginPath();
    ctx.moveTo(cxp - w * 0.03, hy); ctx.lineTo(cxp + w * 0.03, hy);
    ctx.lineTo(cxp + w * 0.07, y + h); ctx.lineTo(cxp - w * 0.07, y + h);
    ctx.closePath(); ctx.fill();
    // Wavy lines.
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = Math.max(1, s * 0.008);
    for (let i = 0; i < 4; i++) {
      const yy = hy + (i + 1) * (y + h - hy) / 5;
      ctx.beginPath();
      for (let px = 0; px <= 1; px += 0.1) {
        const X = x + px * w, Y = yy + Math.sin(px * 9 + i * 2) * h * 0.008;
        if (px === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
      }
      ctx.stroke();
    }
    // Jetski with rider + wake, left third.
    const jx = x + w * 0.24, jy = hy + h * 0.16;
    ctx.fillStyle = INK;
    ctx.beginPath(); ctx.ellipse(jx, jy, s * 0.045, s * 0.014, -0.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(jx + s * 0.01, jy - s * 0.03, s * 0.012, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = Math.max(1, s * 0.006);
    ctx.beginPath(); ctx.moveTo(jx - s * 0.05, jy + s * 0.02); ctx.lineTo(jx - s * 0.16, jy + s * 0.05); ctx.stroke();
    // Distant sail, right.
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.78, hy + h * 0.10);
    ctx.lineTo(x + w * 0.78, hy + h * 0.02);
    ctx.lineTo(x + w * 0.83, hy + h * 0.10);
    ctx.closePath(); ctx.fill();
    drawPalm(ctx, x + w * 0.96, y + h, h * 0.42, -0.16, true);
    for (let i = 0; i < 3; i++) drawBird(ctx, x + w * (0.08 + i * 0.06), y + h * (0.06 + rand() * 0.03), s * 0.03);
  } else if (tag === 'street') {
    // Sagging wires across the top.
    ctx.strokeStyle = 'rgba(13,0,26,0.9)'; ctx.lineWidth = Math.max(1, s * 0.008);
    for (const wy of [0.10, 0.16]) {
      ctx.beginPath();
      ctx.moveTo(x, y + h * wy);
      ctx.quadraticCurveTo(x + w * 0.5, y + h * (wy + 0.07), x + w, y + h * wy);
      ctx.stroke();
    }
    // Neon signs, tucked into the top corners clear of the face (the face
    // sits centred at about a third of the panel height). Sized from the
    // panel width, so a tall narrow panel still gets a readable sign.
    const words = ['MOTEL', 'BAR', '24H', 'DINER', 'CLUB', 'LIQUOR'];
    const cols = [PINK, CYAN, GOLD];
    const sw = w * 0.30, sh = Math.min(h * 0.16, w * 0.22);
    neonSign(ctx, x + w * 0.04, y + h * 0.03, sw, sh, words[Math.floor(rand() * words.length)], cols[0]);
    neonSign(ctx, x + w * 0.66, y + h * 0.06, sw, sh, words[Math.floor(rand() * words.length)], cols[1]);
    // Street lamp at the right edge, glowing gold bulb.
    const lx = x + w * 0.93, ly = y + h * 0.42;
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, s * 0.012);
    ctx.beginPath(); ctx.moveTo(lx, y + h * 0.95); ctx.lineTo(lx, ly); ctx.stroke();
    const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, s * 0.09);
    glow.addColorStop(0, 'rgba(255,214,10,0.9)'); glow.addColorStop(1, 'rgba(255,214,10,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(lx, ly, s * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = GOLD;
    ctx.beginPath(); ctx.arc(lx, ly, s * 0.025, 0, Math.PI * 2); ctx.fill();
    // Crowd along the bottom.
    crowdRow(ctx, x + w * 0.06, y + h * 0.99, w * 0.8, h * 0.16, 5 + Math.floor(rand() * 4), rand);
    // Neon reflections on the wet road.
    ctx.fillStyle = 'rgba(255,46,136,0.18)';
    ctx.fillRect(x + w * 0.1, y + h * 0.9, w * 0.2, h * 0.05);
    ctx.fillStyle = 'rgba(0,229,255,0.16)';
    ctx.fillRect(x + w * 0.62, y + h * 0.92, w * 0.18, h * 0.04);
  } else if (tag === 'vignette') {
    const variant = index % 4;
    if (variant === 0) {
      // Police helicopter + searchlight cone + birds.
      const hx = x + w * 0.3, hy = y + h * 0.3;
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.ellipse(hx, hy, s * 0.09, s * 0.035, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(hx - s * 0.11, hy - s * 0.012, s * 0.22, s * 0.008);
      ctx.fillRect(hx + s * 0.05, hy - s * 0.05, s * 0.02, s * 0.05);
      const cone = ctx.createLinearGradient(0, hy, 0, y + h * 0.95);
      cone.addColorStop(0, 'rgba(255,244,180,0.4)'); cone.addColorStop(1, 'rgba(255,244,180,0)');
      ctx.fillStyle = cone;
      ctx.beginPath();
      ctx.moveTo(hx - s * 0.02, hy + s * 0.02);
      ctx.lineTo(hx + s * 0.02, hy + s * 0.02);
      ctx.lineTo(hx + s * 0.12, y + h * 0.95);
      ctx.lineTo(hx - s * 0.12, y + h * 0.95);
      ctx.closePath(); ctx.fill();
      drawBird(ctx, x + w * 0.7, y + h * 0.2, s * 0.035);
      drawBird(ctx, x + w * 0.82, y + h * 0.3, s * 0.03);
    } else if (variant === 1) {
      for (let i = 0; i < 7; i++) {
        drawMoneyBill(ctx, x + w * (0.12 + rand() * 0.76), y + h * (0.55 + rand() * 0.35), s * 0.07, (rand() - 0.5) * 1.2);
      }
    } else if (variant === 2) {
      // Police light-bar pill (VICE PD) pinned to the bottom edge, plus
      // three money bills just below the face — never across it.
      const bx = x + w * 0.12, by = y + h * 0.84, bw = w * 0.76, bh = h * 0.14;
      ctx.save();
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, bh / 2); else ctx.rect(bx, by, bw, bh);
      ctx.fillStyle = INK; ctx.fill();
      ctx.fillStyle = PINK;
      ctx.fillRect(bx, by, bw * 0.22, bh);
      ctx.fillStyle = CYAN;
      ctx.fillRect(bx + bw * 0.78, by, bw * 0.22, bh);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `900 ${bh * 0.52}px Arial`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('VICE PD', bx + bw * 0.5, by + bh * 0.54);
      ctx.restore();
      const bills = [[0.14, 0.72, 0.3], [0.38, 0.78, -0.25], [0.68, 0.72, 0.2]];
      for (const [fx, fy, rot] of bills) {
        drawMoneyBill(ctx, x + w * fx, y + h * fy, s * 0.055, rot);
      }
    } else {
      // Duffel bag + money.
      const dx = x + w * 0.5, dy = y + h * 0.78;
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.ellipse(dx, dy, s * 0.13, s * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(dx, dy - s * 0.07, s * 0.035, Math.PI, 0);
      ctx.stroke();
      ctx.lineWidth = Math.max(1.5, s * 0.01);
      for (let i = 0; i < 3; i++) {
        drawMoneyBill(ctx, x + w * (0.2 + i * 0.3), y + h * 0.9, s * 0.055, (rand() - 0.5) * 0.9);
      }
    }
  }
}

// Faint halftone dot pattern over a panel.
export function halftonePanel(ctx, x, y, w, h, alpha = 0.10) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#FFFFFF';
  const step = 12;
  for (let py = y + step / 2; py < y + h; py += step) {
    for (let px = x + step / 2; px < x + w; px += step) {
      ctx.beginPath(); ctx.arc(px, py, 1.1, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

// Halftone dot clusters in the cover corners.
export function halftoneCorners(ctx, W, H) {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  const corners = [[0, 0, 1, 1], [W, 0, -1, 1], [0, H, 1, -1], [W, H, -1, -1]];
  for (const [cx, cy, sx, sy] of corners) {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5 - r; c++) {
        const px = cx + sx * (14 + c * 13);
        const py = cy + sy * (14 + r * 13);
        ctx.beginPath(); ctx.arc(px, py, 2.2, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  ctx.restore();
}

// Fine film grain over everything.
export function grain(ctx, W, H, seed) {
  const rand = rng(seed + 99);
  ctx.save();
  ctx.globalAlpha = 0.05;
  for (let i = 0; i < W * H / 900; i++) {
    ctx.fillStyle = rand() > 0.5 ? '#FFFFFF' : '#000000';
    ctx.fillRect(rand() * W, rand() * H, 1.4, 1.4);
  }
  ctx.restore();
}

// ---- Stickers ----

export function viceCityBadge(ctx, W, H) {
  const S = Math.min(W, H);
  const bw = S * 0.26, bh = S * 0.08;
  const cx = W * 0.045 + bw / 2, cy = H * 0.05 + bh / 2;
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(-0.07);
  ctx.fillStyle = INK;
  ctx.strokeStyle = PINK; ctx.lineWidth = Math.max(2, S * 0.004);
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(-bw / 2, -bh / 2, bw, bh, bh * 0.45); else ctx.rect(-bw / 2, -bh / 2, bw, bh);
  ctx.fill(); ctx.stroke();
  drawStar(ctx, -bw / 2 + bh * 0.55, 0, bh * 0.30, PINK, null, 0);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `900 ${bh * 0.52}px 'Noto Sans Condensed Black', 'Arial Black', sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('VICE CITY', bh * 0.28, bh * 0.03);
  ctx.restore();
}

export function leonidaBadge(ctx, W, H) {
  const S = Math.min(W, H);
  const r = S * 0.075;
  const cx = W - W * 0.055, cy = H * 0.055 + r * 0.4;
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(0.07);
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = Math.max(2, S * 0.006); ctx.strokeStyle = ORANGE;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = Math.max(1, S * 0.003); ctx.strokeStyle = CYAN;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2); ctx.stroke();
  drawStar(ctx, 0, -r * 0.42, r * 0.30, GOLD, null, 0);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `900 ${r * 0.34}px 'Noto Sans Condensed Black', 'Arial Black', sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('LEONIDA', 0, r * 0.32);
  ctx.restore();
}

export function starsRow(ctx, W, H) {
  const S = Math.min(W, H);
  const r = S * 0.019;
  const step = Math.max(W * 0.0375, S * 0.039);
  const y = H * 0.165;
  for (let i = 0; i < 5; i++) {
    drawStar(ctx, W * 0.05 + i * step, y, r, GOLD, INK, Math.max(1, S * 0.002));
  }
}

export function palmBadge(ctx, W, H) {
  const S = Math.min(W, H);
  const r = S * 0.062;
  const cx = W - W * 0.05, cy = H - H * 0.05;
  ctx.save();
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = Math.max(2, S * 0.004); ctx.strokeStyle = CYAN;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.translate(cx, cy + r * 0.28);
  drawPalm(ctx, 0, 0, r * 1.15, 0.1, false, CYAN);
  ctx.restore();
}
