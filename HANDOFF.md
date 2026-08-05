# Handoff

State of play as of the end of the second session. Everything below is on
`main` at `Kapitol/Heroes-game`, working tree clean.

## Run it

```bash
node serve.js 8124
```

| URL | what it does |
|---|---|
| `/index.html` | the game |
| `/index.html?drop=420` | jumps straight into the Coffin Drop and **loops it**, pot 420 |
| `/index.html?spawn=archer` | fills every wave with one monster key |

Both dev hooks exist because the things they reach are otherwise slow to get
to: a given monster may not roll for minutes, and the minigame is four fights
away.

## Where the Coffin Drop got to

Implemented in `js/coffin.js`, self-contained: `start / update / aim / release /
nudge / payout / draw`. `js/game.js` owns the `drop` phase and the input; the
HUD fades out for the duration (`body.minigame` in the CSS).

**The mechanic.** Drag to pick a lane, let go to commit. Falling, the coffin
clips buttress stones (shed 2–4 skulls, lose 26% speed) and chutes (gain speed,
shed nothing). Each slab needs a minimum speed to smash — `NEEDS = [0, 380,
600, 860, 1150]` — and rows are worth ×1…×5 by depth. Payout is
`pot × (skulls / SKULL_PAR) × rowMultiplier`.

**Three balance bugs found and fixed by testing, worth not reintroducing:**

1. An earlier timing-tap version was beaten by blind spam-tapping — it scored
   ×10 without reading anything.
2. A clean lane with no stones smashed all five slabs and paid **◍ 1**: zero
   skulls times anything is zero. Slab breaks now shed 1–2 skulls of their own,
   so depth is worth something without stone.
3. Stone at −45% speed made hitting it — the thing the design wants you to do —
   fatal to depth. It is −26% now.

**Tuning.** `SKULL_PAR = 24` is set so an *unaimed* drop returns roughly the
pot: measured 0.88× / 1.13× / 1.38× over three autopilot drops. A player who
reads the board should reach 2–4×. If the economy feels off later, that
constant is the dial.

## The minigame is painted now

Four sheets arrived and are wired: `shaft-wall.png` (masonry), `shaft-parts.png`
(stone and chute in two sizes, slab intact and smashed), `coffin.png` (upright,
tumbling, burst open) and `skulls.png` (four skulls, four rubble chunks). All
auto-sliced, in reading order, indexed by the constants at the top of
`js/coffin.js`. Every painted path still falls back to the vector one if a sheet
has not decoded, so the first second of a drop is never blank.

Three things worth knowing before changing it:

- **The coffin's anchor changes on landing.** Falling, it is centred on the
  point collisions are measured from; stopped, it sits on the slab. A single
  anchor cannot do both — it either floats or sinks halfway into stone.
- **Slabs are stretched, not scaled.** A slab at its own aspect would be 133px
  tall against floors 118px apart. Stone courses take horizontal stretching;
  the state colour lives on the lip rather than tinting the art.
- **Depth state reads off two sprites**, not a colour: floors already smashed
  through use the broken slab.

## Next session

1. **Reward selection** after the drop.

## Known caveats

- The road is ~34-42fps in the preview pane; the two full-screen pattern fills
  (grass + road) are the likely bulk and still have not been chased.
- **The drop itself now runs at a locked 60.** It used to render the entire
  road underneath a backdrop that buried it — a full world render, ground,
  decals, lighting and all, for something 5% visible. `render.js` returns early
  during the drop, and the shaft backdrop is opaque because it is now the only
  thing clearing the canvas. Measured over 5s samples: 27fps before the art,
  18.6 with it, 60 once the road behind it went.
- `art/road-edges.png` cells 0 and 3 are unused: they face ±x and would serve a
  road running the other way.
- The hero is still vector-drawn against painted enemies — the most visible
  art mismatch left.
