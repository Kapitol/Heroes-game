# The gauntlet

Measuring apparatus for the build/critique loop on the rig.

The bar is `art/warrior-walk.png` (4 strides × 5 tiers) and `art/warrior-combat.png`
— the same warrior, the same camera, the same five armour tiers, hand-painted
correct. The rig exists to replace those sheets, and it has replaced them when a
judge shown the two side by side, unlabelled, cannot pick out the rig.

Everything in this directory serves that one sentence. Nothing here decides
whether the rig is good; it decides what the judge is looking at, and makes sure
the judge cannot tell which is which until after they have said.

---

## `shot.mjs` — a frame of the rigged hero

```bash
node tools/gauntlet/shot.mjs --tier 3 --state walk --frame 1
node tools/gauntlet/shot.mjs --tier 5 --state idle --frame 0 --out gold-idle.png
```

Writes a transparent PNG into this directory. Default name is
`rig-t<tier>-<state>-f<frame>.png`.

| flag | default | what it is |
|---|---|---|
| `--tier` | 1 | 1–5. Wears that band in all five slots. |
| `--state` | walk | `rest`, `idle`, `walk`, or `attack`. |
| `--frame` / `--frames` | 0 / 4 | Phase is `frame / frames`. Four is the number of strides in `warrior-walk.png`, so frame numbers are the sheet's columns. |
| `--w` `--h` | 480 720 | Canvas size, in real pixels. |
| `--fh` | 560 | Figure height, crown to sole. |
| `--by` | 0.94 | Ground line, as a fraction of `h`. |
| `--bg` | `none` | Transparent. Give a CSS colour to fill. |
| `--art` `--stick` `--travel` | 1 0 0 | Toggles. `--stick 1` shows the skeleton. |
| `--base` | `http://localhost:8137` | The dev server. **It must already be running.** |

`--state attack` works the moment `ANIMS.attack` exists in `js/rig.js`. Until
then it falls back to the rest pose rather than throwing, because a missing
animation is a thing to see rather than a stack trace.

**How it stays deterministic.** All of that is query string on `tools/rig.html`
— `?shot=1&tier=…&state=…&frame=…` — and shot mode there stops the animation
clock, pins device pixel ratio to 1, hides the editor and sizes the canvas from
the URL. The pixels come back through `canvas.toDataURL`, not a page screenshot,
so nothing about the machine's display leaks into the file. And it waits on
`body[data-ready="1"]`, which the page raises only after a frame has been drawn
with every requested armour sheet decoded — a shutter on a timer catches a naked
skeleton and wastes the round.

The same URLs open in a browser. `shot.mjs` prints the one it used.

## `compare.mjs` — the blind lineup

```bash
node tools/gauntlet/compare.mjs --rig rig-t3-walk-f1.png --tier 3 --frame 1 --name t3-f1
```

Writes `compare-<name>.png` and `compare-<name>.json`.

The PNG is the rig frame and one cell of `art/warrior-walk.png`, side by side,
scaled so both figures are the same painted height, on the same background, with
**no labels of any kind** and in an order decided by a coin toss.

`compare-<name>.json` is the answer key: which side is which, which cell was cut,
and how many cells the slicer found. **Do not open it until the verdict is
written down.** It is the only record; the image, the filename and the order
carry nothing.

| flag | default | |
|---|---|---|
| `--rig` | — | The PNG from `shot.mjs`, relative to this directory. Required. |
| `--tier` | 1 | 1–5. The sheet's row. |
| `--frame` | 0 | 0–3. The sheet's column. |
| `--sheet` | `art/warrior-walk.png` | Any sheet; give `--cols` and `--rows` if it is not 4 × 5. |
| `--target` | 560 | Matched figure height in pixels. |
| `--name` | `t<tier>-f<frame>` | Names the output pair. |
| `--swap` | random | `0` or `1` pins the order, to reproduce an old round. |

The bar cell is cut **inside the page, by `js/atlas.js`** — the same chroma key,
the same content trim, the same reading order the game uses. A comparison
against a differently-cut bar is a comparison against something nobody ever
sees. Cell index is `(tier − 1) × 4 + frame`; the tool warns if the slicer
returns a cell count other than `cols × rows`, because a stray speck of paint
shifts every tier after it and that has cost this project two sessions already.

Both sides are matched on *painted* height — the alpha bounding box, not the
file's dimensions — because the rig writes a small figure inside a large
transparent canvas, and matching frames rather than figures would leave the
judge comparing sizes neither side is claiming anything about.

## `progress.html` — the live board

<http://localhost:8137/tools/gauntlet/progress.html>

Every round, newest first: the piece, the round number, the comparison image,
the verdict, and the named gap. It polls every four seconds and does not need
reloading.

### The round contract

A round is **two writes**, in this order:

1. `tools/gauntlet/round-<piece>-<n>.json`
2. its filename appended to the array in `tools/gauntlet/index.json`

```json
{
  "piece":   "warrior-walk",
  "round":   1,
  "image":   "compare-t3-f1.png",
  "verdict": "rig wins",
  "gap":     "One sentence naming what is still wrong.",
  "notes":   "Anything longer."
}
```

- `image` is relative to this directory.
- `verdict` is exactly one of `"rig wins"`, `"bar wins"`, `"tie"`.
- `gap` is one sentence. It is the most valuable field in the file: it is what
  the next round is for.
- `index.json` is a flat array of filenames, e.g.
  `["round-warrior-walk-1.json", "round-warrior-walk-2.json"]`. Create it if it
  does not exist. Append; do not rewrite the order. A name appearing twice is
  fine — the page keeps its latest position.

The index exists because `serve.js` serves files and lists directories for
nobody, so the page has no other way to know what is here.

`fixtures/` holds two example rounds in the right shape. They are not in the
index and the page does not read them — copy one up a level and append its name
if you want to see the board populated.

**Writing it is allowed to go wrong.** The page is built for being read while it
is being written: a missing `index.json` shows the empty state, a truncated one
leaves the last good read on screen, a round file caught mid-write keeps the card
it already had, and a name in the index with no file behind it gets one small red
line rather than taking the page down. Nothing is ever cleared before its
replacement has been built.
