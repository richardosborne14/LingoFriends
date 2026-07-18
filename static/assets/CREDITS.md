# Asset Credits & Licences

Every asset pack imported into `static/assets/` MUST have an entry here
(source URL + licence). Rule from TASK-FUN-00 master plan.

---

## Character sprites — `characters/`

**Source:** [Universal LPC Spritesheet Character Generator](https://github.com/sanderfrenken/Universal-LPC-Spritesheet-Character-Generator)
(individual layer PNGs, `spritesheets/` directory, fetched July 2026).

All sheets share the LPC "universal" frame grid: 64×64px frames, 13 columns.
Walk animation = rows 8–11 (up, left, down, right), 9 columns each.

| Folder | LPC source path | Authors | Licence |
|--------|-----------------|---------|---------|
| `characters/body/*.png` (teen body, 6 skin tones: light, amber, olive, bronze, brown, black) | `body/bodies/teen/` | Benjamin K. Smith (BenCreating), bluecarrot16, TheraHedwig, Evert, MuffinElZangano, Durrani, Pierre Vigier (pvigier), ElizaWy, Matthew Krohn (makrohn), Johannes Sjölund (wulax), Stephen Challener (Redshrike) | CC-BY-SA 3.0 / GPL 3.0 |
| `characters/head/male/*.png`, `characters/head/female/*.png` (human heads, 6 skin tones) | `head/heads/human/{male,female}/` | Benjamin K. Smith (BenCreating), bluecarrot16, Stephen Challener (Redshrike) and LPC contributors | CC-BY-SA 3.0 / GPL 3.0 / OGA-BY 3.0 |
| `characters/hair/cowlick/*.png` | `hair/cowlick/adult/` | bluecarrot16 | CC0 |
| `characters/hair/long_center_part/*.png` | `hair/long_center_part/male/` | bluecarrot16 | CC0 |
| `characters/hair/bob/*.png` | `hair/bob/adult/` | bluecarrot16 | CC0 |
| `characters/shirt/*.png` (teen t-shirt, 8 colours) | `torso/clothes/shortsleeve/tshirt/teen/` | ElizaWy, JaidynReiman | OGA-BY 3.0 |
| `characters/hat/cap.png` (feather cap, blue) | `hat/cloth/feather_cap/adult/blue.png` | bluecarrot16, Thane Brimhall (pennomi), laetissima, Matthew Krohn (makrohn), Johannes Sjölund (wulax) | CC-BY-SA 3.0 / GPL 3.0 / OGA-BY 3.0 |
| `characters/hat/beanie.png` (knit "christmas" hat, blue) | `hat/holiday/christmas/adult/blue.png` | JaidynReiman, Tuomo Untinen | GPL 3.0 / OGA-BY 3.0 |
| `characters/hat/headband.png` (thick headband, yellow) | `hat/headband/thick/adult/yellow.png` | JaidynReiman, bluecarrot16 | OGA-BY 3.0 / CC-BY-SA 3.0 |
| `characters/hat/crown.png` (gold crown) | `hat/formal/crown/adult/crown_gold.png` | bluecarrot16, Lanea Zimmerman (Sharm) | CC-BY-SA 3.0 / GPL 3.0 |

Full per-asset credits (authors, source OGA submissions) are maintained upstream in
the generator repo's `CREDITS.csv` and per-sheet `sheet_definitions/*.json`.

**Attribution requirement:** CC-BY-SA and OGA-BY layers require attribution.
This file plus an in-app credits screen (planned, TASK-FUN-06) satisfies it.
Do NOT import GPL-*only* art (all current sheets are dual/multi-licensed).

---

## Terrain tiles — `tiles/`

**`tiles/terrain_atlas.png`** — [LPC Tile Atlas](https://opengameart.org/content/lpc-tile-atlas)
32×32px tile grid (1024×1024 = 32×32 tiles).
Authors: Lanea Zimmerman (Sharm), Daniel Armstrong (HughSpectrum), Casper Nilsson,
Anamaris & Krusmira, Keith Karnage, Lanea Zimmerman & Tyler Olsen (Roots),
Hyptosis, Bertram, Zabin.
Licence: CC-BY-SA 3.0 / GPL 3.0.

---

## Props — `props/`

**`props/trees-green.png`, `props/trees-pale.png`, `props/trees-dead.png`** —
[LPC Trees](https://opengameart.org/content/lpc-trees) by bluecarrot16.
Licence: CC-BY-SA 3.0 / GPL 3.0.
Colour variants map to tree health tiers (green = healthy, pale = poor, dead = critical).

---

## Licence summary for the app

- CC0 assets: no obligations.
- OGA-BY 3.0: attribution required (this file + credits screen), no share-alike.
- CC-BY-SA 3.0: attribution + share-alike **on the art** (derived/composited
  sprites remain CC-BY-SA; app code is unaffected).
- GPL is never relied upon alone — every GPL-listed asset here is dual-licensed
  and we use it under its CC/OGA licence instead.
