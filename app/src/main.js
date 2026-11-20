// main.js — boot: create the state, wire the editor, wait for the display
// font, then run a screenshot scene when the URL asks for one, or load the
// four samples with the default concept.
import { createState, CONCEPTS, applyConcept, cloneState } from './state.js';
import { createEditor, loadSamplesSync } from './editor.js';
import { renderCover, renderExport, framingReport, SIZES } from './cover.js';
import { exportDataURL } from './export.js';
import { runShot } from './shots.js';
import { LAYOUTS, layoutById, layoutPanels } from './layouts.js';
import { defaultCrops } from './state.js';
import { computeFrame, resolveFocus, classifyFrame } from './framing.js';

const state = createState();
const canvas = document.getElementById('previewCanvas');
const editor = createEditor(state, canvas);

async function boot() {
  const params = new URLSearchParams(location.search);
  try { await document.fonts.load(`900 40px 'Noto Sans Condensed Black'`); } catch (e) {}
  try { await document.fonts.ready; } catch (e) {}
  if (params.has('shot')) {
    await runShot(state, editor, params);
  } else {
    await editor.loadSamples();
    applyConcept(state, 'Sunset Beach Heist');
    editor.repaint();
    editor.status('Sample photos loaded — click any panel to crop, then export.');
  }
  // Test hook: everything an automated check needs.
  window.__test = {
    state, editor,
    render: renderCover, renderExport, exportDataURL,
    framing: { computeFrame, resolveFocus, classifyFrame },
    layouts: LAYOUTS, layoutById, layoutPanels,
    defaultCrops, concepts: CONCEPTS,
    applyConcept: (name) => applyConcept(state, name),
    activeCrops: () => state.cropsFor(state.layout),
    framingReport: () => framingReport(cloneState(state), CONCEPTS),
    loadSamplesSync: () => loadSamplesSync(state),
  };
}

boot();
