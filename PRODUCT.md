# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Players of idle and incremental games, playing in short sessions on **both
phone and desktop, equally**. Neither is the fallback: every control needs a
touch path and a keyboard path, and layouts adapt rather than favour one. The
existing build already reflects this — pointer handling for dragging the coffin,
`1`–`4` and `E`/`P`/`Esc` shortcuts, thumb-reachable globes at the bottom
corners, and safe-area insets.

The job: watch a hero make progress without being micromanaged, and make a
small number of decisions that visibly matter.

## Product Purpose

Crypt Heroes is an idle isometric road crawler. The hero walks a single endless
road, meets a formation, and fights it automatically. The player never moves the
hero.

Success is a run that keeps a player deciding: when to spend a cooldown, which
lane to drop the coffin down, which of three cards to buy, and which road to
take when a boss falls. The goal is **shipping a game people play** — content
capture is not a design constraint on it.

## Positioning

Most idlers ask for nothing between upgrades. This one puts three distinct
decisions in the gap and makes each one legible:

- **The Coffin Drop.** A wave's spoils go down a crypt shaft. Stone shakes
  skulls loose but robs speed; chutes buy depth but shake nothing. Reward and
  depth pull against each other, and the lane is the only input.
- **Cards priced against a fixed ladder.** A card's cost belongs to the card and
  its tier, not to when you meet it, so an expensive card is something to save
  towards rather than a number that inflates out of reach.
- **A fork after every boss.** Press on, take the deep road for more danger and
  more reward, or hold and farm the level again.

## Operating Context

- Runs from a static file server: `node serve.js 8124`. No build step.
- A run persists in `localStorage` under `cryptheroes.v3`; there is no account
  and nothing to sign into.
- Dev hooks that future work should keep working: `?drop=420` loops the drop and
  the card screen on a throwaway purse, `?spawn=<key>` fills every wave with one
  monster, `&purse=<n>` sets the dev purse.
- Art is generated externally (DALL·E) and dropped into `art/`. `ART-BRIEF.md`
  is the standing instruction for producing it.

## Capabilities and Constraints

**Fixed — future work must not quietly undo these:**

- **No movement control.** The hero walks and fights alone. The player's hands
  are on the skills, the drop and the cards, never on the walking. This is the
  product, not a limitation.
- **The magenta art pipeline.** Generated art arrives on `#FF00FF` and is
  chroma-keyed and auto-sliced at load by `js/atlas.js`. Nothing is
  pre-processed offline, because generated art cannot supply transparency or
  true seamless tiles.

**Current but explicitly not locked** — the user did not mark these binding, so
they may be revisited with a reason:

- Vanilla JS and Canvas 2D with no framework, no build step and no dependencies.
- No backend; `localStorage` is the only persistence.

**Confirmed mechanics vocabulary** (used consistently in code, UI and docs):

- **Skulls (`☠`) are the only currency.** There is no gold anywhere.
- **Level** is the named place being walked (one per section, from `LEVELS`).
  **Stage** is the global encounter count and drives every difficulty curve.
  **Section** is a run of 3–4 waves. **Wave** is one encounter.
- Cards run five named tiers — **Gray, Green, Blue, Purple, Gold** — where Gray
  is free and Gold tops out at 800. The same five bands are the rarity ladder
  for loot.
- Pacing is counted in waves: a drop every 3, cards every 5, a boss on the 13th.

## Evidence on Hand

- Playable build in this repository; `HANDOFF.md` carries current state and the
  balance decisions behind it, including bugs found by playtest that must not be
  reintroduced.
- `README.md` documents the loop, the enemy behaviours, the bosses and the art
  pipeline. `ART-BRIEF.md` documents asset generation.
- Painted art in `art/`: the Boneyard Road ground and props, the Coffin Drop
  shaft set, card icons, and the world map.
- **No real players yet, and no telemetry.** There are no retention numbers,
  session lengths, reviews or testimonials. Future work must not invent them.

## Product Principles

1. **The player's hands are on the decisions, never on the walking.** Anything
   that adds moment-to-moment control is the wrong direction.
2. **A number on screen should be a decision, not an invoice.** Costs, tiers and
   difficulty are shown so a player can plan, and are stable enough to plan
   against.
3. **Both hands, both devices.** Every control has a touch path and a keyboard
   path. Neither phone nor desktop is the afterthought.
4. **Legible before rich.** Rules read at a glance — a slab lights green when
   the coffin can smash it, a tier pip is the colour of the band it will become.
5. **Generated art is a source, not a dependency.** Every painted path falls
   back to the vector one, so a missing or slow sheet is never a blank screen.

## Accessibility & Inclusion

- Motion is decorative and must stay optional: `prefers-reduced-motion` already
  disables the card smoke, the loot pulse and the map pin pulse. New motion
  follows the same rule.
- The game is played on a dark ground with small text; contrast on HUD and panel
  text is a live concern. Colour is never the only carrier of a rule — tiers
  pair colour with position, and the drop pairs green with a number.
