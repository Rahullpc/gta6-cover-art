// Vice Nights boot — loads the display font, starts the editor, then
// applies screenshot mode when the URL asks for it. The editor object
// is exposed as window.__vice so an automated run can export and verify.

import { createEditor } from './editor.js';
import { applyShotMode } from './shots.js';

async function boot() {
  const editor = createEditor(document);
  window.__vice = editor;

  // The condensed display face lives in app/fonts/; wait for it so the
  // first render (and every screenshot) uses it, not a fallback.
  try {
    await document.fonts.load('900 100px "Vice Nights"');
    await document.fonts.load('700 40px "Vice Nights"');
    await document.fonts.ready;
  } catch {
    // A missing face still renders with the fallback stack.
  }

  await editor.setTheme(editor.state.theme.id);
  await applyShotMode(editor, document, window);
  editor.render();
  window.__viceReady = true;
}

boot();
