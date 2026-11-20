// export.js — PNG export through the same renderer as the live preview.
import { renderExport, SIZES } from './cover.js';

function download(canvas, filename, ed) {
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (ed) ed.status(`Exported ${filename}.`);
}

export function exportPNG(state, sizeId, ed) {
  const size = SIZES[sizeId];
  const canvas = renderExport(state, sizeId);
  download(canvas, `vice-cover-${size.w}x${size.h}.png`, ed);
  return canvas;
}

export async function exportAll(state, ed) {
  for (const id of ['square', 'portrait', 'landscape']) {
    exportPNG(state, id, ed);
    await new Promise(r => setTimeout(r, 350));
  }
  if (ed) ed.status('Exported all 3 sizes.');
}

// Data-URL variant of the same path, for tests and screenshots (no download).
export function exportDataURL(state, sizeId) {
  return renderExport(state, sizeId).toDataURL('image/png');
}
