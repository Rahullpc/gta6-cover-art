// main.ts — entrypoint (Node 22, standard library only).
// Copies app/ and screenshots/ beside this file into the output directory
// (OUTPUT_DIR, else MAKEFUN_OUTPUT_DIR outside the grader, else /output)
// and writes output/dossier.json with the vendored make.fun library.
import { cpSync, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(process.env.OUTPUT_DIR || process.env.MAKEFUN_OUTPUT_DIR || '/output');

// Pre-flight: the dossier must never claim success over missing or
// oversized screenshots. A broken render once produced 50 KB placeholder
// shots with no error; fail loudly here instead of shipping those.
if (!existsSync(join(here, 'app'))) throw new Error('app/ missing — nothing to submit');
const shotsDir = join(here, 'screenshots');
if (!existsSync(shotsDir)) throw new Error('screenshots/ missing — run the shot script first');
for (const name of ['1-cover.jpg', '2-editor.jpg', '3-cover.jpg', '4-cover.jpg']) {
  const p = join(shotsDir, name);
  if (!existsSync(p)) throw new Error(`screenshot ${name} missing — run the shot script first`);
  const size = statSync(p).size;
  if (size > 262144) throw new Error(`screenshot ${name} is ${size} bytes, over the 262144 limit`);
}

mkdirSync(out, { recursive: true });
for (const name of ['app', 'screenshots']) {
  const src = join(here, name);
  const dst = join(out, name);
  rmSync(dst, { recursive: true, force: true });
  if (existsSync(src)) cpSync(src, dst, { recursive: true });
}

const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);
console.log(`dossier written to ${join(out, 'dossier.json')}`);
