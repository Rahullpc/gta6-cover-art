// main.js — boot for Vice Cover Studio v26: build the studio, wire the
// editor, wait for the display font, then run a screenshot scene when
// the URL asks for one, or load the four samples with the default preset.
import { newStudio, PRESETS, usePreset, freshCrops } from './state.js';
import { newEditor, loadSamplesNow } from './editor.js';
import { paintCover, exportCanvas, framingAudit, SHEET_SIZES } from './cover.js';
import { pngDataURL } from './export.js';
import { playShot } from './shots.js';
import { TILINGS, tilingById, panelRects } from './layouts.js';
import { frameFor, focusFor, verdictFor } from './framing.js';

const studio = newStudio();
const canvas = document.getElementById('previewCanvas');
const editor = newEditor(studio, canvas);

async function boot() {
  const params = new URLSearchParams(location.search);
  try { await document.fonts.load(`900 40px 'Noto Sans Condensed Black'`); } catch (e) {}
  try { await document.fonts.ready; } catch (e) {}
  if (params.has('shot')) {
    await playShot(studio, editor, params);
  } else {
    await editor.loadSamples();
    usePreset(studio, 'Sunset Beach Heist');
    editor.repaint();
    editor.status('Sample photos loaded — click any panel to crop, then export.');
  }
  // Test hook: everything an automated check needs.
  window.__test = {
    state: studio, editor,
    render: paintCover, renderExport: exportCanvas, exportDataURL: pngDataURL,
    framing: { computeFrame: frameFor, resolveFocus: focusFor, classifyFrame: verdictFor },
    layouts: TILINGS, layoutById: tilingById, layoutPanels: panelRects,
    defaultCrops: freshCrops, concepts: PRESETS,
    applyConcept: (name) => usePreset(studio, name),
    activeCrops: () => studio.cropsFor(studio.layout),
    framingReport: () => framingAudit(studio, PRESETS),
    loadSamplesSync: () => loadSamplesNow(studio),
  };
}

boot();
