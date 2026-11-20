# Vice Cover Studio

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Rahullpc/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Rahullpc/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Vice Cover Studio turns your photos into a GTA 6-style multi-panel comic
cover and exports it as a PNG. Pick one to five photos, choose a layout and
a colour grade, write a caption, and export the cover in Square, Portrait,
or Landscape post sizes. Everything runs fully offline in a desktop browser
from the static files in `app/` — your photos never leave the machine.

Built for the [gta6-cover-art-01 bounty](https://make.fun/bounty/gta6-cover-art-01)
on make.fun. Referral code: `89wzjn6w`.

## Run it locally

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser.

## Export

Load photos (or press **Use samples**), pick a one-click concept, then
press **PNG 1080×1080**, **PNG 1080×1350**, or **PNG 1920×1080** — or
**Export all 3 sizes** to download all three at once. Files are named
`vice-cover-<width>x<height>.png`.

## Features

- Multi-panel comic covers from 1–5 photos
- Face-safe framing: a head is always whole or absent, never half-cut
- Six panel layouts (Sunset Hero, Grid + Hero, Vice Strip, Triptych, Comic Quad, Cinema Strip)
- Six colour grades (Sunset, Neon Night, Golden Hour, Vice Pink, Teal Noir, Ultraviolet)
- Four one-click concepts (Sunset Beach Heist, Neon Night Drive, Vice Strip, Golden Hour Duo)
- Three export sizes (1080×1080, 1080×1350, 1920×1080)
- Caption lettering with placement, size, and colour controls
- Stickers: VICE CITY, LEONIDA, five gold stars, Palm
- Per-panel cropping: click a panel, drag to reposition, scroll to zoom
- Fully offline — no network requests, photos stay on your machine

## Bundled sample photos

- `boulevard.jpg` — woman in a teal SUMMER 96 jersey on a boulevard
- `pier.jpg` — bearded man in a bucket hat on a pier
- `porsche.jpg` — woman with a walkie-talkie by a sports car
- `summer.jpg` — woman with an afro holding a pink drink at sunset

## License

MIT — see LICENSE. The display font (Noto Sans Condensed Black) is
distributed under the SIL Open Font License 1.1 (see `app/fonts/OFL.txt`).
