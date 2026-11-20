# Vice Cover Studio — GTA 6 Cover Art

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Rahullpc/gta6-cover-art/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Rahullpc/gta6-cover-art/reward.svg)](https://make.fun/c/gta6-cover-art-01)

An offline web app that turns your photos and a caption into GTA 6-style
cover art — multi-panel posters, bold condensed lettering, Vice City sunset
and neon grades — exported as PNG to share.

Built for the [make.fun GTA 6 Cover Art bounty](https://make.fun/c/gta6-cover-art-01).

## What it does

- Upload 1–5 of your own photos (file picker or drag & drop), or use the
  four built-in samples.
- Four one-click concepts: **Sunset Beach Heist**, **Neon Night Drive**,
  **Vice Strip** (five vertical panels) and **Golden Hour Duo**.
- Six panel layouts, five colour grades, editable two-line caption.
- Face-safe framing: every panel's crop keeps faces inside the frame.
- Export PNG in 1080 × 1080, 1080 × 1350 and 1920 × 1080, one click each
  or all three at once.
- Runs 100% offline from static files under `app/` — no network requests,
  photos never leave your machine.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

## Layout

- `app/index.html` — the studio UI (sidebar controls + live preview).
- `app/style.css` — dark studio theme.
- `app/src/brush.js` — canvas primitives: badges, stars, lettering, palms,
  crowd, cars, moon, halftone dots, blurred photo bands.
- `app/src/framing.js` — focus-point cover crop + face-safe framing check.
- `app/src/covers.js` — the four cover recipes and the layout list.
- `app/src/studio.js` — editor state, preview, export.
- `app/src/boot.js` — entry point + reproducible screenshot mode
  (`?shot=1-cover|2-editor|3-cover|4-cover`).
- `app/fonts/NotoSans-CondensedBlack.ttf` — OFL display font.
- `app/samples/` — four free-to-use sample photos.
- `main.ts` — copies `app/` + `screenshots/` to `/output` and writes the
  dossier with the kit's `buildDossier`.

## License

MIT — see [LICENSE](LICENSE).
