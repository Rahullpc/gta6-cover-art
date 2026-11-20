// export.js — PNG export (v5). Render the cover at a post size on a fresh canvas
// and hand it to the browser as a download. The very same renderCover() call
// paints the live preview, so the saved file matches the editor pixel for pixel
// — including the v5 five-star wanted row and the sun-free day skies.

import { renderToCanvas } from './cover.js';
import { SIZES, sizeById } from './state.js';

const fileNameFor = (size) => `vice-cover-${size.w}x${size.h}.png`;

// Encode a canvas to a PNG blob and fire a download through a temporary
// object-URL anchor. Resolves with the filename once the click has happened.
function downloadCanvas(canvas, name) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('PNG encoding failed'));
        return;
      }
      const url = URL.createObjectURL(blob);
      const anchor = Object.assign(document.createElement('a'), { href: url, download: name });
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      resolve(name);
    }, 'image/png');
  });
}

/** Render + download one PNG. Resolves with the filename once saved. */
export function exportPNG(state, sizeId) {
  const canvas = renderToCanvas(state, sizeId);
  return downloadCanvas(canvas, fileNameFor(sizeById(sizeId)));
}

/** Download all three post sizes, one after another, reporting each. */
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

/** Test/screenshot hook: the exported PNG as a data URL, with no download. */
export function exportDataURL(state, sizeId) {
  return renderToCanvas(state, sizeId).toDataURL('image/png');
}