// main.ts — entrypoint for Vice Cover Studio v26 (Node 22, standard
// library only).
//
// The grader runs this file. It stages the static app and the four
// manifest screenshots into the output directory, then writes the
// dossier the vendored make.fun library builds from that output.
// Output dir: OUTPUT_DIR, else MAKEFUN_OUTPUT_DIR, else /output.
import { cpSync, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(process.env.OUTPUT_DIR || process.env.MAKEFUN_OUTPUT_DIR || '/output');
const SHOT_NAMES = ['1-cover.jpg', '2-editor.jpg', '3-cover.jpg', '4-cover.jpg'];
const SHOT_LIMIT = 262144;

// The dossier must never claim success over a missing or oversized
// screenshot. A broken render once produced 50 KB placeholder shots
// with no error; fail loudly here instead of shipping those.
function checkShots(dir) {
  if (!existsSync(dir)) throw new Error('screenshots/ missing — run the shot script first');
  for (const name of SHOT_NAMES) {
    const p = join(dir, name);
    if (!existsSync(p)) throw new Error(`screenshot ${name} missing — run the shot script first`);
    const bytes = statSync(p).size;
    if (bytes > SHOT_LIMIT) throw new Error(`screenshot ${name} is ${bytes} bytes, over the ${SHOT_LIMIT} limit`);
  }
}

function stageDir(name) {
  const src = join(ROOT, name);
  const dst = join(OUT, name);
  rmSync(dst, { recursive: true, force: true });
  if (existsSync(src)) cpSync(src, dst, { recursive: true });
}

if (!existsSync(join(ROOT, 'app'))) throw new Error('app/ missing — nothing to submit');
checkShots(join(ROOT, 'screenshots'));

mkdirSync(OUT, { recursive: true });
stageDir('app');
stageDir('screenshots');

const dossier = buildDossier(OUT, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(OUT, 'dossier.json'), dossier);
console.log(`dossier written to ${join(OUT, 'dossier.json')}`);
