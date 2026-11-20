// main.js — bootstrap: shot mode or the editor, whichever the URL asks for.
import { bootEditor, runShotMode } from './studio.js';

(async () => {
  const params = new URLSearchParams(location.search);
  if (params.get('shot')) {
    // In shot mode the studio still needs the photos loaded first.
    const { bootForShot } = await import('./studio.js');
    await bootForShot();
  } else {
    await bootEditor();
  }
})();
