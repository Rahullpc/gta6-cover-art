// Screenshot mode — drives the app from the URL so a screenshot run is
// deterministic: ?shot=cover|editor&theme=<id>&size=<id>&w=<px>&h=<px>.
// ?shot=cover hides every control and fills the viewport with the cover
// alone; ?shot=editor shows the full editor with a photo loaded.
// When the view is drawn, window.__viceReady is set for the driver.

import { SIZES, themeById } from './themes.js';

export async function applyShotMode(editor, doc, win) {
  const q = new URLSearchParams(win.location.search);
  const shot = q.get('shot');
  const themeId = q.get('theme');
  const sizeId = q.get('size');
  const w = Number(q.get('w') ?? 0);
  const h = Number(q.get('h') ?? 0);

  if (themeId) await editor.setTheme(themeId);
  if (sizeId) {
    const size = SIZES.find((s) => s.id === sizeId);
    if (size) editor.state.size = size;
  }
  editor.render();

  if (shot === 'cover') {
    doc.body.classList.add('shot-cover');
    const canvas = doc.getElementById('preview');
    // Size the canvas to the requested shot box (or the viewport),
    // keeping the cover's own aspect ratio.
    const cw = w > 0 ? w : win.innerWidth;
    const ch = h > 0 ? h : win.innerHeight;
    const size = editor.state.size;
    const s = Math.min(cw / size.w, ch / size.h);
    const pw = Math.round(size.w * s);
    const ph = Math.round(size.h * s);
    canvas.width = pw;
    canvas.height = ph;
    canvas.style.width = `${pw}px`;
    canvas.style.height = `${ph}px`;
    const { drawCover } = await import('./render.js');
    const { themeById: byId } = await import('./themes.js');
    const theme = themeById(editor.state.theme.id);
    const ctx = canvas.getContext('2d');
    const st = editor.state;
    drawCover(ctx, theme, st.img, {
      title: st.title,
      subtitle: st.subtitle,
      tagline: st.tagline,
      zoom: st.zoom,
      panX: st.panX * (pw / size.w),
      panY: st.panY * (ph / size.h),
    }, pw, ph);
  }

  win.__viceReady = true;
  return shot;
}
