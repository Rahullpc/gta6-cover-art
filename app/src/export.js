// export.js — PNG export through the same renderer as the live preview.
import { exportCanvas, SHEET_SIZES } from './cover.js';

function download(canvas, filename, ed) {
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (ed) ed.status(`Exported ${filename}.`);
}

export function savePNG(studio, sizeId, ed) {
  const size = SHEET_SIZES[sizeId];
  const canvas = exportCanvas(studio, sizeId);
  download(canvas, `vice-cover-${size.w}x${size.h}.png`, ed);
  return canvas;
}

export async function saveAll(studio, ed) {
  for (const id of ['square', 'portrait', 'landscape']) {
    savePNG(studio, id, ed);
    await new Promise(r => setTimeout(r, 350));
  }
  if (ed) ed.status('Exported all 3 sizes.');
}

// Data-URL variant of the same path, for tests and screenshots (no download).
export function pngDataURL(studio, sizeId) {
  return exportCanvas(studio, sizeId).toDataURL('image/png');
}
