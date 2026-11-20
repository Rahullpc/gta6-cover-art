// GTA 6 Cover Art v5 — multi-panel cover maker + 4 samples (gta6-cover-art-01), by Tedy.
// Vice Cover Studio turns 1-5 photos + a caption into a GTA-style comic cover and exports PNG
// in three post sizes (1080x1080, 1080x1350, 1920x1080), fully offline in desktop Chrome.
// v5 over v4: two art-direction fixes. (1) The wanted-level sticker is now a full FIVE gold
// stars — a neat, evenly spaced row below the VICE CITY badge (app/src/decor.js stickerStars),
// sized and placed so neighbours, the badge and every face stay clear; the badge's own small
// pink star and the LEONIDA star are logo parts, not wanted stars. (2) The retro striped
// synthwave sun is removed from every day-grade sky (both drawSun call sites and the painter
// itself are gone); skies show the graded photo plus birds/plane/skyline/palms, and the Neon
// Night moon is untouched. Vice Strip keeps stars:false; golden-duo shares the five-star row
// and the sun-free sky, consistently. All v4 guarantees hold: the Sunset Hero strip is beach +
// street (no car panel), four bundled samples (boulevard, pier, porsche, summer) with measured
// head boxes in the face-safe framing engine (app/src/framing.js), faces whole-or-absent
// (never half-cut), crisp comic borders, fully cold Neon Night, and a control rail that
// scrolls cleanly at 1280x720 with a visible draggable thumb.
// A working gta6-cover-art-01 entry (Node 22, standard library only): the app is this directory's app/ folder, plain
// static files a desktop browser loads offline (app/index.html and its ES modules, no library and no network
// request), and the program hands it in. It copies app/ and screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads, with the vendored make.fun library. The four sample photos
// (app/samples/) are free to use: boulevard + pier were made for make.fun with an image model, and porsche +
// summer are the boss's own photos, approved for bundling.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of app
// files, in all, or a path under app/ over 1000 bytes: app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
