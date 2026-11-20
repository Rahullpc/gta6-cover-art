// main.ts — the entry program (Node 22, standard library only).
// It hands the app in: copies app/ (the offline web app as static files)
// and screenshots/ (the four renders) from beside this file into the output
// directory, then writes /output/dossier.json with the vendored make.fun
// library's buildDossier. The caps are the scorer's own gate caps, so this
// fails exactly where the scorer would refuse the entry.
// Run locally with:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The gate caps (reference/gate.json): only text_max_bytes shapes the bytes;
// the others refuse an entry the scorer would refuse.
const GATE = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

function handIn() {
  mkdirSync(out, { recursive: true });
  cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
  mkdirSync(join(out, 'screenshots'), { recursive: true });
  const shots = join(here, 'screenshots');
  if (existsSync(shots)) cpSync(shots, join(out, 'screenshots'), { recursive: true });
  writeFileSync(join(out, 'dossier.json'), buildDossier(out, GATE));
  console.log(`handed in to ${out}`);
}

handIn();
