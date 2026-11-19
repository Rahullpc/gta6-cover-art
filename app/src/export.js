// PNG export: render the cover at a post size on a fresh canvas and download
// it. The same renderCover() call paints the live preview, so the exported
// file matches what the editor shows, pixel for pixel.

import { renderToCanvas } from './cover.js';
import { SIZES, sizeById } from './state.js';

/** Render + download one PNG. Resolves with the filename once saved. */
export function exportPNG(state, sizeId) {
  const size = sizeById(sizeId);
  const canvas = renderToCanvas(state, sizeId);
  const name = `vice-cover-${size.w}x${size.h}.png`;
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('PNG encoding failed'));
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      resolve(name);
    }, 'image/png');
  });
}

/** Download all three post sizes, one after another. */
export async function exportAll(state, onEach) {
  const names = [];
  for (const size of SIZES) {
    const name = await exportPNG(state, size.id);
    names.push(name);
    if (onEach) onEach(name);
    await new Promise((r) => setTimeout(r, 400));
  }
  return names;
}

/** Test/screenshot hook: the exported PNG as a data URL, no download. */
export function exportDataURL(state, sizeId) {
  return renderToCanvas(state, sizeId).toDataURL('image/png');
}