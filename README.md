# Crypt Heroes

An idle march that starts on a sunlit country road and ends somewhere much
worse. The hero walks and fights on their own; you spend the cooldowns, snatch
the gold, and choose what they become.

Vanilla JS + **Canvas 2D** — no WebGL, no 3D, no GPU path. "Isometric" here is
a projection, not a renderer. Measured cost is **0.8 ms/frame** idle and
**1.0 ms** mid-boss-fight against a 16.7 ms budget for 60fps.

Characters, props and every sound are generated at runtime; painted art drops
in on top of the same rig (see **Art**).

## Run it

```bash
node serve.js 8124
```

Then open http://localhost:8124. A server is required — the game uses ES
modules, which browsers refuse to load over `file://`.

## The loop

**March → Encounter → Scramble → (every 3–4 waves) Boon stall → March.**

1. **March.** The hero walks the road. You do nothing; this is the breath
   between fights.
2. **Encounter.** A formation blocks the way and streams in through the gates
   of the road. The hero holds their mark and fights automatically. Your only
   input is *when* to spend each cooldown.
3. **The Coffin Drop.** Survive and the spoils go in a coffin, and the coffin
   goes down a crypt shaft. Drag to choose a lane, let go to drop it. Buttress
   stones bleed its speed, chutes pile speed on, and each slab needs a minimum
   speed to smash through — so how deep it gets, and what multiplier you are
   paid, comes down to one read of the board before you commit. Do nothing and
   it drops on its own after seven seconds and banks whatever it reaches.
4. **Boon stall.** Only at the end of a **section** — 3 or 4 waves — three
   cards come up and each has a **price in gold**. Buy one or walk on and keep
   the purse. Boons compete directly with the armoury for the same gold, which
   is the actual decision. Every third section ends on a boss.

Die and you fall back to the start of the section rather than replaying the
fight that killed you — a boss wave pays nothing on its own, so retrying it
could never fund the gear to beat it. You keep every level, perk and piece of
gear, so each attempt is stronger than the last.

## What you control

| | |
|---|---|
| Skills | tap a rune, or `1`–`4` |
| Gold | drag to aim the coffin, release to drop |
| Boons | buy one of three cards at the end of a section |
| Armoury | the ⚒ globe, or `E` |
| Pause | the ⏸ button, or `P` / `Space` |
| Volume | slider in the menu (☰), remembered between sessions |

That's the whole input surface. There is no movement control by design.

## Abilities

You start with two and can carry **four**. The draft is the only way to widen
the kit, and it always offers an unowned ability while you have a free hand.

| | | |
|---|---|---|
| ⚔ Cleave | 8s | 220% to everything within 3 paces |
| ✚ Mend | 18s | restores 40% of your life |
| ✹ Firebolt | 6s | a bolt that bursts for 280% |
| ⚡ Frenzy | 22s | seven seconds of doubled attack speed |
| ◈ Quake | 14s | 180% in a wide ring, slows, **and staggers anything winding up** |
| ➶ Volley | 11s | five bolts at 90% each, spread across the field |
| ❉ Ward | 20s | halves incoming damage for six seconds |

Quake is the answer card: it breaks a charger mid-dash and knocks a boss back
down its cast bar.

## Enemies that fight differently

The usual complaint about auto-battlers is that every wave is more bodies
walking at you. These approach four different ways:

- **Melee** — close and swing.
- **Ranged** (Bone Archers, Wraiths) — hold at five or six paces and shoot. They
  will not come to you; the hero's leash means you cannot go to them either, so
  something else has to answer them.
- **Chargers** (Hellspawn) — wind up, streak across the road, then have to
  recover. The wind-up is a real window.
- **Exploders** (Bloated Ones) — sprint in and burst on contact *or on death*,
  damaging their own side too.

Waves arrive as named **formations** that unlock as you go: Warband, Rush,
Skirmish, Shield Wall, **Ambush** (spawns behind you as well as ahead), and
Champion (one enormous, gold-haloed elite leading a small pack).

## Bosses

The last wave of every third section, cycling through three with distinct kits:

- **The Butcher** — Slam and Charge.
- **The Bone Warden** — Summons adds, and a Bone Nova.
- **The Flame Ogre** — Fire Nova and Rampage.

Every boss move paints a **telegraph ring on the ground** and fills it over
about a second before it lands. All three enrage below 30% life — faster
attacks, faster moves. A hit you could not have seen coming is not a mechanic.

## Armour you can see

Gear does not just move numbers. The hero's sprite is derived from what they
are wearing, in five armour marks and five weapon marks:

| Blade | | Plate | |
|---|---|---|---|
| +0 | short sword | +0 | leather, bare head |
| +4 | arming sword | +3 | mail and helm |
| +9 | greatsword | +7 | steel with gold trim and a red cloak |
| +15 | greatsword, cold glow | +12 | violet and bright steel |
| +22 | greatsword, burning | +18 | white plate, pale gold |

The armoury lists the Mark you are on, so you know how close the next
re-forging is.

## The road

Five biomes, one every six sections, walking from daylight down into the dark:
**The Boneyard Road** (painted art) → **The Elder Wood** →
**The Broken Gate** (pillars, rubble, banners) → **The Crypt** (walls, sconces,
proper darkness) → **The Inferno**.

## Art

The first biome is drawn from generated assets in `art/`:

| file | role |
|---|---|
| `grass.png` | repeating verge texture |
| `pavement.png` | repeating road texture |
| `props-graveyard.png` | 4×3 sheet of props on magenta |
| `decals.png` | 4×3 sheet of flat road markings |
| `landmarks.png`, `landmarks-2.png` | large rare structures |
| `skeletons.png` | 3×2 creature poses (idle / attack) |
| `archer-anim.png` | walk cycle, collapse, and arrow |
| `road-edges.png` | road/grass transition diamonds (not yet wired) |

**Ground** is two repeating textures. Grass covers the screen; the road is the
same trick clipped to the walkable band, so the two can never disagree about
where the edge is and there is no seam to line up. Both patterns are anchored
to the world origin inside the scene transform, which is what makes them
scroll with the march rather than sliding under it.

**Props** are cut out at load by `js/atlas.js`: the magenta is keyed to
transparent (with the fringe faded and the colour spill pulled back out, or
every sprite gets a pink halo), then each grid cell is trimmed to the pixels
actually in it and given an anchor at the bottom centre of its content — the
point that has to sit on the ground. The engine then scatters them itself from
the tile hash, choosing between the sheet's variants and jittering position and
scale, so the verge never reads as a grid and the road can run forever without
a visible repeat.

**Sheets are auto-sliced.** Generated art rarely lands on an even lattice —
rows come back different heights and columns drift — and a uniform grid then
cuts sprites in half. `sliceAuto` finds the empty gutters instead, so any
spacing works, and as a side effect it skips baked-in row labels because those
sit in the gutters between content.

**The road edge wanders.** A clipped band gives a ruler-straight boundary,
which is the single biggest tell that a road was masked rather than laid, so
the painted edge is offset by two octaves of value noise. Only the paint moves;
the walkable band stays straight.

That separation — tiling ground, engine-placed props — is the whole reason
this works where a single painted scene could not.

### Looking at one creature

Waves are rolled from a weighted roster, so a given monster may not appear for
minutes. `?spawn=archer` fills every wave with one key:

    http://localhost:8124/index.html?spawn=archer

Any key from `MONSTERS` in `js/encounters.js` works; anything else is ignored.

### Working on the minigame

`?drop` skips straight into the Coffin Drop and loops it, so it can be tuned
without fighting a wave for every attempt. `?drop=500` sets the pot:

    http://localhost:8124/index.html?drop=420

## How it's drawn

**Isometric, not 3D.** A tile is a 64×32 diamond; screen position is
`((x−y)·32, (x+y)·16 − z·46)` and depth order is `x + y`. `js/iso.js` is the
whole projection.

**The world is a function, not a map.** The road is a band five tiles wide
running along +x, endless in both directions. Nothing is stored: `propAt(x, y)`
hashes the tile coordinate to decide whether a tree, a fence or a wall stands
there, so scenery never pops or shifts as the camera scrolls and the walk can
go on forever.

**Nothing is a sprite sheet.** `js/sprites.js` draws each character from
primitives against a per-species kit — proportions, palette, weapon, horns,
whether it walks or trails off into smoke. A struck body flushes red by
blending its palette toward red *inside* the silhouette; compositing the flash
on afterwards bleeds it onto the floor.

**Light is screen-space.** Outdoors there is none. Underground, a black layer
gets radial holes punched through it, then a warm additive pass over the
torches. One offscreen canvas, no per-tile cost.

## Files

| | |
|---|---|
| `js/game.js` | phases, combat resolution, saving |
| `js/coffin.js` | the Coffin Drop payout game |
| `js/encounters.js` | monsters, their four AIs, formations, bosses |
| `js/perks.js` | the seven abilities and the ten stacking perks |
| `js/world.js` | the road, the biomes, procedural scenery |
| `js/render.js` | sky, ground, telegraphs, depth pass, lighting |
| `js/sprites.js` | every character, prop and coin, drawn from scratch |
| `js/entities.js` | derived stats, movement, separation |
| `js/iso.js` | the projection and the tile hash |
| `js/ui.js` | globes, runes, armoury, draft cards |
| `js/audio.js` | synthesised sound |

Progress saves to `localStorage` under `cryptheroes.v3`. **Abandon Run** in the
menu wipes it.

## Dropping art in later

The mechanics do not care how anything looks. Replace the body of
`drawActor()` in `js/sprites.js` with a sprite blit and everything else — the
kits, the tiers, the hit flash, the depth sort — keeps working. `drawProp()`
is the same deal for scenery.

**What tiles the engine actually wants**, in priority order:

1. **Repeating ground textures** — one flat, evenly-lit image per surface, no
   objects and no vignette. Any size; the engine scales and tiles.
2. **Prop sheets** — a grid of objects on solid magenta (`#FF00FF`), each
   alone in its cell with clear space around it and no shadow cast onto the
   background. The engine trims and anchors them automatically, so the grid
   does not have to be tidy.
3. **Characters** — the one thing still drawn as vectors. A sheet per species
   would slot into `drawActor()` in `js/sprites.js`; the kits, gear tiers, hit
   flash and depth sorting all keep working around it.

**No baked vignette or corner darkening** in either kind of asset — it bands
visibly once tiled, and the engine applies lighting itself.
