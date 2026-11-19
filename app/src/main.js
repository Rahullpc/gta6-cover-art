// Boot Vice Cover Studio: create the state, wire the editor, wait for the
// bundled display font, then either run a ?shot= screenshot scene or load the
// sample photos with the default concept so the first paint is a full cover.

import { createState, applyPreset, presetById } from './state.js';
import { initEditor } from './editor.js';
import { runShot } from './shots.js';
import { renderToCanvas } from './cover.js';
import { exportDataURL } from './export.js';

const state = createState();
const editor = initEditor(state);

// The bundled OFL display font must be ready before the first lettering pass.
try {
  await document.fonts.load('900 80px "Vice Display"');
  await document.fonts.ready;
} catch {
  // Canvas lettering falls back to Arial Black / sans-serif if the font fails.
}

const params = new URLSearchParams(location.search);
if (params.get('shot')) {
  await runShot(params, { state, editor, renderToCanvas });
} else {
  const preset = presetById('sunset-heist');
  await editor.loadSamples(preset.photos);
  applyPreset(state, preset);
  editor.syncControls();
  editor.requestRender();
  editor.setStatus('2 sample photos + Sunset Beach Heist loaded. Upload your own, or hit a concept.');
}

// Test hook: the live state and the exact export render path.
window.__viceCover = { state, editor, renderToCanvas, exportDataURL };