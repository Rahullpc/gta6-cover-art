[![gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Rahullpc/gta6-cover-art/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Rahullpc/gta6-cover-art/reward.svg)](https://make.fun/c/gta6-cover-art-01)

# Vice Nights — Diagonal Split Cover Maker

A web app that turns your photo and a caption into GTA 6-style cover art, in a design of its own: **one full-bleed photo cut by a single diagonal**. One side is your photo, the other is a solid sunset/neon colour panel that carries the title in big slanted type. No grid, no badge, no borrowed artwork.

Enter the bounty: [Make GTA 6 Cover Art — gta6-cover-art-01](https://make.fun/c/gta6-cover-art-01)

## How it works

1. Pick one of four diagonal themes — **Sunset Strip** (orange, rising diagonal), **Neon Tide** (teal, falling diagonal), **Night Drive** (purple, left panel), **Vice Lights** (pink, left panel). Each theme uses a different sample photo and a different diagonal lean.
2. Or load your own photo (upload, or drag it onto the canvas) and crop it: drag to pan, zoom with the slider. The photo is anchored on the face, so the diagonal never cuts it.
3. Write your title, subtitle and tagline — the title re-flows into two slanted lines and rides the diagonal.
4. Pick an export size — **1080 × 1080**, **1080 × 1350** or **1920 × 1080** — and hit **Export PNG**.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Everything is static files under `app/` — no build step, no network request. The app works offline in desktop Chrome. Photos are read on your own machine and never uploaded.

## Files

- `app/index.html` + `app/style.css` — the editor page.
- `app/src/themes.js` — the four diagonal themes (photo, colours, diagonal, face-safe focus point).
- `app/src/render.js` — the canvas renderer (photo, colour zone, glowing seam, slanted title).
- `app/src/editor.js` — editor state, controls, drag/zoom, PNG export.
- `app/src/shots.js` — screenshot mode (`?shot=cover|editor&theme=…&size=…`).
- `app/src/main.js` — boot (font load, editor start).
- `app/samples/` — four sample photos (CC0 / made for the bounty).
- `app/fonts/NotoSans-CondensedBlack.ttf` — display face (SIL Open Font License, see `OFL.txt`).
- `main.ts` — hands the app in (copies `app/` + `screenshots/`, writes `dossier.json`).
- `shots.json` — the four screenshots this entry ships.

## License

MIT — see [LICENSE](LICENSE).
