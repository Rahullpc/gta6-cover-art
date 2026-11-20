// shots.js — the four screenshot scenes the maker takes.
// 1-cover: the Sunset Hero cover, 1920x1080.
// 2-editor: the editor with a photo loaded, 1280x720.
// 3-cover: the Vice Strip cover, 1080x1350.
// 4-cover: the Neon Night Drive cover, 1920x1080.
// Each scene is opened with ?shot=N; the page sets data-ready="1" once the
// scene has painted, so the screenshot tool knows when to capture.

export const SHOTS = [
  { file: '1-cover.jpg', shot: '1', w: 1920, h: 1080, note: 'Sunset Hero cover' },
  { file: '2-editor.jpg', shot: '2', w: 1280, h: 720, note: 'editor with photos loaded' },
  { file: '3-cover.jpg', shot: '3', w: 1080, h: 1350, note: 'Vice Strip cover' },
  { file: '4-cover.jpg', shot: '4', w: 1920, h: 1080, note: 'Neon Night Drive cover' },
];

export function shotUrl(shot, base = 'http://localhost:8080/') {
  const s = SHOTS.find((x) => x.shot === String(shot));
  if (!s) return base;
  return `${base}?shot=${s.shot}&w=${s.w}&h=${s.h}`;
}
