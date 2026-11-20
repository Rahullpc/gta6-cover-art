// cover.js — the single renderer behind the live preview and the PNG
// export for Vice Cover Studio v26. One code path for both, so the saved
// file matches the editor pixel for pixel.

import { panelRects, tilingById } from './layouts.js';
import { tintById, applyWash } from './grades.js';
import { sceneArt, dotPanel, dotCorners, filmGrain,
         badgeVice, badgeLeonida, starRow, badgePalm, paintPalm } from './decor.js';
import { paintCaption } from './lettering.js';
import { frameFor, focusFor, verdictFor } from './framing.js';
import { copyStudio, usePreset } from './state.js';

export const SHEET_SIZES = {
  square: { id: 'square', name: 'Square', w: 1080, h: 1080 },
  portrait: { id: 'portrait', name: 'Portrait', w: 1080, h: 1350 },
  landscape: { id: 'landscape', name: 'Landscape', w: 1920, h: 1080 },
};

function paintEmpty(ctx, panel) {
  const { x, y, w, h } = panel;
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, '#3B0A5E'); g.addColorStop(1, '#FF2E88');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.strokeStyle = 'rgba(0,229,255,0.25)';
  ctx.lineWidth = Math.max(1, Math.min(w, h) * 0.01);
  for (let i = -h; i < w; i += 26) {
    ctx.beginPath(); ctx.moveTo(x + i, y + h); ctx.lineTo(x + i + h, y); ctx.stroke();
  }
  ctx.restore();
  ctx.font = `900 ${Math.min(w, h) * 0.09}px 'Noto Sans Condensed Black', 'Arial Black', sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.012);
  ctx.strokeStyle = '#0D001A';
  ctx.strokeText('ADD PHOTO', x + w / 2, y + h / 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('ADD PHOTO', x + w / 2, y + h / 2);
}

function paintPhoto(ctx, photo, panel, crop, tint, k) {
  const { x, y, w, h } = panel;
  const img = photo.img;
  const focus = focusFor(photo);
  const frame = frameFor(img, { w, h, tag: panel.tag }, crop, focus);
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  if (frame.mode === 'blur') {
    // Soft stretched plate: blurred, slightly saturated, darkened,
    // overscanned 12% so no transparent edges show.
    ctx.filter = `blur(${Math.max(6, Math.min(w, h) * 0.02)}px) saturate(1.2) brightness(0.7)`;
    ctx.drawImage(img, x - w * 0.06, y - h * 0.06, w * 1.12, h * 1.12);
    ctx.filter = 'none';
    ctx.fillStyle = 'rgba(13,0,26,0.35)';
    ctx.fillRect(x, y, w, h);
    const sh = frame.sharp;
    ctx.filter = tint.filter(k);
    ctx.drawImage(img, x + sh.dx, y + sh.dy, sh.dw, sh.dh);
    ctx.filter = 'none';
  } else {
    ctx.filter = tint.filter(k);
    ctx.drawImage(img,
      frame.sx * img.naturalWidth, frame.sy * img.naturalHeight,
      frame.sw * img.naturalWidth, frame.sh * img.naturalHeight,
      x, y, w, h);
    ctx.filter = 'none';
  }
  ctx.restore();
  return frame;
}

export function paintCover(ctx, studio, W, H, opts = {}) {
  const size = SHEET_SIZES[studio.size] || SHEET_SIZES.landscape;
  const tiling = tilingById(studio.layout);
  const panels = panelRects(tiling, W, H);
  const tint = tintById(studio.grade);
  const k = studio.intensity ?? 0.92;
  const crops = studio.cropsFor(studio.layout);
  const seed = 1234;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0D001A';
  ctx.fillRect(0, 0, W, H);

  const frames = [];
  for (let i = 0; i < panels.length; i++) {
    const panel = panels[i];
    const crop = crops[i] || { photo: i, zoom: 1, panX: 0, panY: 0, kind: 'face' };
    const photo = studio.photos[crop.photo];
    ctx.save();
    ctx.beginPath(); ctx.rect(panel.x, panel.y, panel.w, panel.h); ctx.clip();
    let frame = null;
    if (photo && photo.img) {
      frame = paintPhoto(ctx, photo, panel, crop, tint, k);
    } else {
      paintEmpty(ctx, panel);
    }
    frames.push(frame);
    for (const wash of tint.washes) {
      applyWash(ctx, wash, panel.x, panel.y, panel.w, panel.h, k);
    }
    sceneArt(ctx, panel.tag, panel, tint.night, seed, i);
    dotPanel(ctx, panel.x, panel.y, panel.w, panel.h, 0.10);
    ctx.restore();
  }

  // Corner halftone clusters, then the crisp comic borders.
  dotCorners(ctx, W, H);
  const S = Math.min(W, H);
  const lw = Math.max(4, Math.min(7, S * 0.006));
  ctx.lineWidth = lw;
  ctx.strokeStyle = '#0D001A';
  for (const p of panels) ctx.strokeRect(p.x, p.y, p.w, p.h);
  // Cyan accent with glow along the hero panel's top edge.
  const hero = panels.find(p => p.tag === 'hero');
  if (hero) {
    ctx.save();
    ctx.shadowColor = '#00E5FF'; ctx.shadowBlur = 12;
    ctx.strokeStyle = '#00E5FF'; ctx.lineWidth = Math.max(2, S * 0.002);
    ctx.beginPath();
    ctx.moveTo(hero.x, hero.y + lw / 2); ctx.lineTo(hero.x + hero.w, hero.y + lw / 2);
    ctx.stroke();
    ctx.restore();
  }
  // Magenta accent with glow along the bottom edge of the fourth panel.
  if (panels[3]) {
    const p4 = panels[3];
    ctx.save();
    ctx.shadowColor = '#FF2E88'; ctx.shadowBlur = 12;
    ctx.strokeStyle = '#FF2E88'; ctx.lineWidth = Math.max(2, S * 0.002);
    ctx.beginPath();
    ctx.moveTo(p4.x, p4.y + p4.h - lw / 2); ctx.lineTo(p4.x + p4.w, p4.y + p4.h - lw / 2);
    ctx.stroke();
    ctx.restore();
  }
  // Thicker black outer border around the whole sheet.
  ctx.lineWidth = lw * 1.4;
  ctx.strokeStyle = '#0D001A';
  ctx.strokeRect(0, 0, W, H);

  // Two foreground palms in the bottom corners, clear of the faces.
  paintPalm(ctx, W * 0.03, H * 1.0, H * 0.30, 0.16, false);
  paintPalm(ctx, W * 0.97, H * 1.0, H * 0.20, -0.14, true);

  // Fine film grain over everything.
  filmGrain(ctx, W, H, seed);

  // Stickers, in order.
  if (studio.stickers.vice) badgeVice(ctx, W, H);
  if (studio.stickers.leonida) badgeLeonida(ctx, W, H);
  if (studio.stickers.stars) starRow(ctx, W, H);
  if (studio.stickers.palm) badgePalm(ctx, W, H);

  // Giant caption last, so nothing covers it.
  paintCaption(ctx, studio.title, studio.subtitle, W, H, {
    placement: studio.placement, colour: studio.titleColour, scale: studio.titleScale,
  });

  // Editor-only selection outline.
  if (opts.editor && studio.selected >= 0 && panels[studio.selected]) {
    const p = panels[studio.selected];
    ctx.save();
    ctx.setLineDash([10, 6]);
    ctx.strokeStyle = '#00E5FF'; ctx.lineWidth = 2.5;
    ctx.strokeRect(p.x + 3, p.y + 3, p.w - 6, p.h - 6);
    ctx.setLineDash([]);
    const label = `PANEL ${studio.selected + 1}`;
    ctx.font = `900 ${Math.max(11, S * 0.016)}px Arial`;
    const tw = ctx.measureText(label).width + 16;
    ctx.fillStyle = '#00E5FF';
    ctx.fillRect(p.x + 8, p.y + 8, tw, Math.max(18, S * 0.028));
    ctx.fillStyle = '#0D001A';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(label, p.x + 16, p.y + 8 + Math.max(18, S * 0.028) / 2);
    ctx.restore();
  }
  return { panels, frames };
}

// Render at one of the three post sizes into a fresh canvas and return it.
export function exportCanvas(studio, sizeId) {
  const size = SHEET_SIZES[sizeId] || SHEET_SIZES.landscape;
  const canvas = document.createElement('canvas');
  canvas.width = size.w; canvas.height = size.h;
  const ctx = canvas.getContext('2d');
  paintCover(ctx, studio, size.w, size.h, {});
  return canvas;
}

// Framing self-check helper: classify every panel of every preset/size.
export function framingAudit(studio, presets) {
  let total = 0, cut = 0;
  const bad = [];
  for (const name of Object.keys(presets)) {
    const probe = usePreset(copyStudio(studio), name);
    for (const sizeId of Object.keys(SHEET_SIZES)) {
      const size = SHEET_SIZES[sizeId];
      const tiling = tilingById(probe.layout);
      const panels = panelRects(tiling, size.w, size.h);
      const crops = probe.cropsFor(probe.layout);
      for (let i = 0; i < panels.length; i++) {
        const crop = crops[i];
        const photo = probe.photos[crop.photo];
        if (!photo || !photo.img) continue;
        const frame = frameFor(photo.img, panels[i], crop, focusFor(photo));
        const verdict = verdictFor(frame, focusFor(photo));
        total++;
        if (verdict === 'cut') { cut++; bad.push(`${name}/${sizeId}/panel${i + 1}`); }
      }
    }
  }
  // Zoom / pan extremes on hero panels.
  const probe = usePreset(copyStudio(studio), 'Sunset Beach Heist');
  const tiling = tilingById(probe.layout);
  for (const sizeId of Object.keys(SHEET_SIZES)) {
    const size = SHEET_SIZES[sizeId];
    const panels = panelRects(tiling, size.w, size.h);
    const hero = panels.find(p => p.tag === 'hero');
    const photo = probe.photos[0];
    if (!hero || !photo || !photo.img) continue;
    for (const z of [1, 2, 4]) {
      for (const px of [-1, 0, 1]) {
        for (const py of [-1, 0, 1]) {
          const frame = frameFor(photo.img, hero, { zoom: z, panX: px, panY: py, kind: 'face' }, focusFor(photo));
          const verdict = verdictFor(frame, focusFor(photo));
          total++;
          if (verdict === 'cut') { cut++; bad.push(`extreme/${sizeId}/z${z}/p${px},${py}`); }
        }
      }
    }
  }
  return { total, cut, bad };
}
