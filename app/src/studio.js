// studio.js — the Vice Cover Studio editor: state, controls, live preview,
// per-panel crop editing and PNG export in the three post sizes.
// The preview canvas and the export canvas are drawn by the same code
// (covers.js), so what you see is what the PNG holds.

import { RECIPES, RECIPE_ORDER, GRADES, LAYOUTS, renderCover, framingCheck } from './covers.js';

export const EXPORT_SIZES = [
  { label: '1080 × 1080', w: 1080, h: 1080 },
  { label: '1080 × 1350', w: 1080, h: 1350 },
  { label: '1920 × 1080', w: 1920, h: 1080 },
];

export const SAMPLES = [
  { key: 'boulevard', label: 'Boulevard', src: 'samples/boulevard.jpg' },
  { key: 'pier', label: 'Pier', src: 'samples/pier.jpg' },
  { key: 'summer', label: 'Summer', src: 'samples/summer.jpg' },
  { key: 'porsche', label: 'Porsche', src: 'samples/porsche.jpg' },
];

export function createStudio(previewCanvas) {
  const state = {
    recipe: 'sunset',
    layout: 'sunset-hero',
    grade: 'sunset',
    title: 'SUNSET HEIST',
    subtitle: 'A VICE CITY STORY',
    photos: {},          // key -> HTMLImageElement
    loaded: 0,
    selectedPanel: 0,
    zoom: 1.0,           // per-panel zoom multiplier, 0.6 .. 1.6
    offsetX: 0,          // per-panel focus shift, -0.2 .. 0.2
    offsetY: 0,
  };

  const listeners = new Set();
  function emit() { for (const fn of listeners) fn(state); }
  function onChange(fn) { listeners.add(fn); }

  function drawPreview() {
    const ctx = previewCanvas.getContext('2d');
    const recipe = RECIPES[state.recipe];
    renderCover(ctx, state.recipe, previewCanvas.width, previewCanvas.height, state.photos, state.grade);
    return recipe;
  }

  /** Render the current cover at any size; returns the canvas. */
  function renderAt(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    renderCover(ctx, state.recipe, w, h, state.photos, state.grade);
    return c;
  }

  /** Export the current cover as a PNG data URL at the given size. */
  function exportPNG(w, h) {
    return renderAt(w, h).toDataURL('image/png');
  }

  function exportAll() {
    return EXPORT_SIZES.map((s) => ({ ...s, url: exportPNG(s.w, s.h) }));
  }

  function downloadPNG(w, h) {
    const a = document.createElement('a');
    a.href = exportPNG(w, h);
    a.download = `vice-cover-${state.recipe}-${w}x${h}.png`;
    a.click();
  }

  function setRecipe(id) {
    if (!RECIPES[id]) return;
    state.recipe = id;
    state.grade = RECIPES[id].grade;
    state.title = RECIPES[id].title;
    state.layout = id === 'strip' ? 'vice-strip' : 'sunset-hero';
    drawPreview();
    emit();
  }

  function setGrade(id) {
    if (!GRADES[id]) return;
    state.grade = id;
    drawPreview();
    emit();
  }

  function setLayout(id) {
    if (!LAYOUTS.some((l) => l.id === id)) return;
    state.layout = id;
    drawPreview();
    emit();
  }

  function addPhotoFile(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const key = 'user' + Date.now();
        state.photos[key] = img;
        state.loaded++;
        drawPreview();
        emit();
        resolve(key);
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  function loadSamples() {
    const jobs = SAMPLES.map((s) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { state.photos[s.key] = img; state.loaded++; resolve(true); };
      img.onerror = () => resolve(false);
      img.src = s.src;
    }));
    return Promise.all(jobs).then(() => {
      drawPreview();
      emit();
      return state.loaded;
    });
  }

  function framingReport() {
    const recipe = RECIPES[state.recipe];
    const [w, h] = recipe.size;
    return framingCheck(state.recipe, w, h, state.photos);
  }

  return {
    state, onChange, drawPreview, renderAt, exportPNG, exportAll, downloadPNG,
    setRecipe, setGrade, setLayout, addPhotoFile, loadSamples, framingReport,
  };
}
