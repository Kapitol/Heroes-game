# Handoff

State of play as of the end of the third session. Everything below is on
`main` at `Kapitol/Heroes-game`.

## Skulls are the only currency

**There is no gold.** It is gone from the code, the UI and the copy — the purse,
the armoury, the death tithe, the run stats and every card price are all skulls,
written `☠`. The old vocabulary is not deprecated, it is deleted: `S.skulls`,
`skullMul`, `dropSkulls`, monsters carry a `skulls:` value. If you find the word
"gold" anywhere but the save-loader, it is a bug.

The loop is: **the drop pays skulls into the purse, the card screen spends from
it, and whatever is left stays there** for the next one. Nothing is consumed by
the coffin — its load is still a flat `LOAD = 24` and the payout formula is
untouched, so all the tuning below still holds.

**Skulls scale at 1.05 a stage, not 1.24.** That one exponent is the whole
economy. Cards are priced against a *fixed* ladder — Gold is 800 and stays 800 —
while hp and damage climb forever, so an earnings curve that keeps pace with
difficulty outruns the ladder within a section and makes every card pocket
change. At 1.24 a wave paid five figures by stage 30 and six figures was an
afternoon. At 1.05:

| stage | a wave pays | run total so far |
|---|---|---|
| 1 | 27 | 27 |
| 10 | 247 | 1,212 |
| 20 | 807 | 6,462 |
| 30 | 1,753 | 19,075 |
| 45 | 5,240 | 68,779 |

Maxing every perk to Gold costs 13,535 all in. So 100,000 is reachable at the
far end of a long run and most players will never see it, which is the intent.

Saves written before the change carry a `gold` field; `load()` reads it as
skulls 1:1, because the two were always the same numbers under different names.
That fallback is the one intentional mention of the word left in the source.

## Run it

```bash
node serve.js 8124
```

| URL | what it does |
|---|---|
| `/index.html` | the game |
| `/index.html?drop=420` | jumps into the Coffin Drop with pot 420 and **loops drop → cards → drop** |
| `…?drop=420&purse=0` | the same, starting the throwaway purse at 0 instead of 800 |
| `/index.html?spawn=archer` | fills every wave with one monster key |

Both dev hooks exist because the things they reach are otherwise slow to get
to: a given monster may not roll for minutes, and the minigame is four fights
away. The drop hook loops through the card screen as well, because the cards are
now part of the same beat and picking one is what ends it.

**The drop hook runs on a throwaway purse and `save()` refuses to write while it
is on.** It loops as fast as it can and every pass pays out, so a tuning session
used to farm the real save — which is exactly how the first one reached six
figures. It starts at 800 (enough for a Gold card) or at `&purse=` if given, and
the saved purse is left at whatever it was before the tab opened.

## Pacing: what happens every how many waves

Four counters, all in waves, all constants at the top of `js/game.js`. None of
them hang off the section boundary any more — sections roll 3 or 4 waves, so
anything pinned to them drifted by a third.

| constant | value | what it does |
|---|---|---|
| `WAVES_PER_DROP` | 3 | waves whose spoils fill one coffin |
| `WAVES_PER_DRAFT` | 5 | waves between one set of cards and the next |
| `WAVES_PER_BOSS` | 12 | a boss stands in the road on the 13th encounter |
| `OPENING_PICKS` | 2 | free cards before the first march of a run |

**The drop banks.** Waves one and two of a cycle pay their skulls into `S.pot`
and say so; the third sends the coffin down carrying all of it. The player loses
nothing — it is the same skulls arriving three times heavier — and the drop goes
back to being an event rather than a thing that happens after every fight.

**`WAVES_PER_DRAFT` is the difficulty dial.** As the enemies get harder the hero
needs cards more often, so this comes down. It is the one number to reach for
when the run feels starved.

**The opening hand** deals two free cards before the first fight, because a run
starts with nothing bought and nothing learned — the hardest the game ever is
relative to the hero. Tier 1 is Gray and Gray is free, so it costs nothing and
the purse still starts empty. `openingDone` is saved; runs from before it existed
are treated as having had theirs.

## Bosses, loot and the map

A boss leaves **2–4 armour pieces, 1–3 weapons and bonus skulls**, all collected
for you — there is nothing to walk over in a game with no movement control — and
the ⚒ globe pulses until the panel is opened, since the bag is the only thing
announcing a pile.

**Loot stacks on the armoury, it does not replace it.** The armoury stays the
steady part: levels bought with skulls, driving the hero's visible marks. Loot
is the windfall. Every looted bonus lands in the same stat lines gear and perks
already feed (`heroStats` takes `equipped` as a fourth argument), so nothing
downstream knows where a number came from. Rarity is the same five bands the
cards use — Gray drains away and Gold creeps in as the run deepens. Swapping is
non-destructive: whatever comes off goes back in the bag.

The armoury is built as a character sheet — armour slots left, weapon right, the
hero drawn in the middle from the same routine the road uses, item level, then
attributes, bag, forge, drafted perks.

**When a boss falls the map opens**, after its drop and cards have settled —
choosing a road is the last beat of the reward, not an interruption of it. The
track shows levels walked (struck through), the one just finished (lit) and a
glimpse ahead. Three roads, and they are three different questions rather than
one wearing three coats:

| road | goes to | costs |
|---|---|---|
| Press on | next level | difficulty +1 |
| The deep road | skips a level | difficulty +3, richer |
| Hold here | this level again | difficulty unchanged |

`stage` is what difficulty actually reads from, so the deep road buys its danger
by jumping two extra stages and holding costs nothing but time.

## Levels

A **Level** is the named place the hero is walking through, one per section, from
`LEVELS` in `js/world.js` — Outside of a Town, The Open Road, The Killing Fields,
Dangerous Cave, and on down. It is a *label* layer: the biome underneath it
(art, palette, props) still changes every six sections, because a repaint is
expensive and a name is free. Rewrite or reorder the list without touching a
texture. The road is endless and the list is not, so the last name holds while
the number keeps climbing.

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
2. A clean lane with no stones smashed all five slabs and paid **☠ 1**: zero
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

## The cards, and how they are priced

Three cards come up **after every drop** now, not once a section. `openDraft`
takes where to go afterwards — `'wave'` mid-section, `'section'` at the end of
one — and `closeDraft` routes there, so the same screen serves both. There is
**no clock**: it waits as long as the choice takes, and only taking a card or
walking on ends it. It used to count down and auto-buy the cheapest card, which
spent the run's skulls unasked and made saving impossible.

- **A price belongs to the card, not to when you meet it.** Cost falls out of
  `(id, tier)` alone — Might 3 is 250 whenever it appears, this run or next.
  That is why nothing about pricing is saved: it re-derives identically.
- **Five tiers as named bands**, each with a price *ceiling*:

  | tier | band | ceiling |
  |---|---|---|
  | 1 | Gray | **free** |
  | 2 | Green | 100 |
  | 3 | Blue | 250 |
  | 4 | Purple | 450 |
  | 5 | Gold | 800 |

  The ceiling is not the price. Each card carries a `power` weight of 0…1 and
  lands under it in proportion to what it gives, so Gold is 800 for Might and
  520 for Plating — the number tells you how deep the ladder is *and* what that
  particular perk is worth. Abilities and remedies have no ladder, so they sit
  flat *on* a band: Volley is the Gold one at 800, being five bolts at 90% —
  450% of damage in a single press, the most any skill puts out.

  **Gray being free is load-bearing.** It is what lets the roll filter by
  affordability without ever dealing a dead hand: a player with nothing is still
  shown three cards they can take.
- **Another coffin costs ☠ 50.** `rerollDraft` deals three fresh cards for a
  flat fee. The new offer is rolled against the purse *after* the fee, so what
  comes back is honestly affordable — reroll down to your last few skulls and
  the coffins start turning up Gray. It can never strand anyone, because Gray is
  free: there is always something in the next one. The button greys rather than
  disappears when the fee is out of reach; a control that vanishes reads as a
  bug.
- **Every card offered is affordable.** The roll draws from what the purse
  covers; a card you can't buy is a taunt, not an option. An empty-handed purse
  gets no panel at all rather than a wall of three greyed cards.
- **One card per classification.** Kinds are picked first, then a card inside
  each, so three attack cards can never come up — that would be one choice
  wearing three coats. An unowned ability takes a seat whenever the kit has room.
- **Healing is a real classification now**, not one card. `Renewal` regenerates
  0.5% of maximum life a second, everywhere — mid-fight, on the march, watching a
  coffin fall; `Field Dressing` returns 8% at the moment the last body drops.
  Both are fractions of the *maximum*, so Vigour cannot quietly render them
  worthless. They are sustain rather than rescue, which is why they come up at
  full health while the remedy does not.
- **`Last Rites`** is the one *remedy*: a one-shot full heal, no tier ladder,
  offered only below 90% life. It exists because Vigour raises the maximum
  without filling it, so drafting a bigger pool leaves you proportionally worse
  off until something closes the gap. It leaves no trace on the sheet —
  `applyCard` returns early and `takeCard` applies it, since only `game.js`
  knows the hero's real maximum.

The card icons come off `art/icons-01.png` and `icons-02.png`, keyed and
auto-sliced like everything else, drawn into a small canvas per card because a
chroma-keyed sheet has no URL to give CSS. The glyphs remain as the fallback
until a sheet decodes. **`minCell` matters here:** the debris flying off the
cracked-skull icon sliced as two cells of its own and shifted every index after
it, so `atlas.js` now takes a minimum-area fraction and throws specks away.

## Next session

Nothing outstanding from this one. The Healing classification is filled out and
every icon on every sheet is now spoken for.

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

---

## Where the fourth session left it

**The loop is a place, not a scrolling road.** The camera holds on a *mark*, the
hero walks in from the top, waves after the first spawn on that same ground, and
a one-second lull separates a won wave from what follows. Cards come off the
coffin; a fresh map follows the cards. Phases are `enter · fight · lull · drop ·
draft · map`.

**Skulls buy cards and nothing else.** The Forge is gone. Armour is taken from a
chest the boss leaves — it falls, cracks the ground, opens, and waits to be
clicked. Every run starts in a full Gray kit (`startingKit()` in `items.js`), and
the body's tier is read from what is worn (`wornTier`).

**One character to a run.** The camp is a choosing screen: Warrior and Paladin
are playable, Warlock and Druid are named empty places waiting on art. The class
is fixed once the road is taken and rides in the save.

**Difficulty is measured against the hero** in `js/balance.js`, and that file is
the balance of the game. Two things there are load-bearing and were expensive to
learn:

- Enemy *health* scales with the hero's damage. Enemy *damage* does not scale
  with the hero's toughness, and must not: when both did, every point a player
  bought was cancelled in proportion, and no strategy could outperform any other
  at any setting.
- The stage exponents (`0.14` health, `0.06` damage) are eight times gentler
  than the originals, which were tuned for a game that sold plate in an armoury.

**`tools/sim.mjs` plays the game headlessly** and `tools/sweep.mjs` ranks curve
settings across a grid. Use them before touching a number. Read the verdict off
the **mean**, never the median: depth is bimodal — most runs end at the first
boss, and the ones that get past it run a very long way — so the median sits on
the boss wave for every strategy and hides the whole signal. As of now: mean
depth 42 played for survival, 30 balanced, 11 careless.

**Known-open, in the order I would take them:**

1. **Survivability beats damage far too heavily** — `defense` averages stage 42,
   `damage` averages 11. Card kinds are not close to parity.
2. The road HUD is still a borrowed Diablo skeleton; the camp is the only screen
   doing identity work and it is shown once.
3. The Armoury has nothing you can *do* during a run.
4. `art/camp-inferno.png` is written in PROMPTS.md and does not exist, so the
   camp is still the boneyard's whatever the run has reached.

**Traps found the hard way this session** — all fixed, none worth rediscovering:

- `bossFor()` indexed `BOSSES[-1]` below stage 8 and threw inside the render
  loop. `requestAnimationFrame` was the *last* statement in that loop, so one
  bad frame killed the session and looked exactly like a hang. It is scheduled
  first now and a thrown frame is logged and skipped.
- A wave of shooters could never end: they keep five tiles, the hero is leashed
  to two. The mark walks forward when nothing is reachable.
- Sprites anchored on the centre of their bounding box, so a raised sword threw
  the swing pose 80px off the body. They anchor on the footprint.
- A hairline of background between two boots made the slicer read one sprite as
  two. Sheets with paired objects need a `gutter` in `ICON_SHEETS`.
- `--band-*` tokens were declared in DESIGN.md and never defined in the CSS, so
  the whole tier ladder rendered colourless.
- **A backgrounded browser tab stops `requestAnimationFrame`.** A frozen-looking
  game is a hidden tab until proven otherwise — check `document.hidden` first.

---

## Where the fifth session left it

**The inferno is wired and is the second painted biome.** `world.js` carries its
`art` block; `props-inferno.png` is sliced by content (`propSlice`), not by
lattice, because its rows hold 3, 3, 4 and 2 objects and a grid cuts the shards
in half. Its twelve cells map to the same slot shape the boneyard uses — three
uprights, three tall things, two spills, two boulders, a wall, a bush — so the
two biomes are the same wiring under different names.

Three things the inferno needed that the boneyard did not, all optional and all
off by default elsewhere:

- **`roadShade`.** Its road and its verge are cut from the same black rock and
  measured *eight grey levels apart* — the road simply was not visible. A wash
  over the band, inside the clip, is what makes it a road.
- **`roadInset`.** The painted road is narrower than the walkable one, so the
  lava field gets most of the width. Nothing gameplay-facing reads the paint;
  the hero still has the full band. `decalAt` follows the paint, not the band,
  or road marks scatter out over open ground.
- **`roadFeather`.** There are no transition tiles for this biome and it does
  not want any — it wants the scorch to stop *gradually*. The shade is stroked
  back along its own edge three times, each wider and fainter. Without it the
  clip is the only straight line in the frame and the eye goes straight to it.

`lights` on a biome names which prop the renderer hangs a warm light on —
`sconce` in the crypt, `brazier` in the inferno. A painted biome scatters those
across the whole verge, so the light scan runs out to the treeline instead of
hugging the wall; off-screen lights were already culled and it costs nothing.
Measured: inferno 34fps against the boneyard's 27 on the same frame, because it
lays no edge ribbons.

**`?biome=inferno` pins a biome for the whole run.** A biome is six sections
deep, so looking at the far end of the road used to mean surviving to it. Levels
and fights are untouched — only the palette and the art set.

**Painted actors can animate now.** `sprite.anim` had been declared on the
archer since it was wired and *never drawn* — `drawPaintedFighter` only ever
read the two-pose sheet, so the archer's four-frame walk and four-frame collapse
were dead data. `drawAnimFrame` plays them: walk loops on the same `o.walk`
phase everything else uses, death plays once and holds on the last frame.
Attacking beats walking, or a creature closing the last half-step flickers
between the two every frame.

**The ghoul is the first monster with a real stride.** `SPRITE.ghoul` is on
`zombie` (Rotting Dead) — same stats, same name, same roster slot; it is the
shambling melee corpse the art depicts. Both its sheets are sliced by content:
its reaching pose is half again as wide as its standing one, and a lattice gave
the standing pose a stray foot. The walk is cells `[0, 2, 4]` — strides down the
left column, lunges down the right, which are deliberately unwired.

**The hero's hop is a lean now.** Two poses bounced vertically read as hopping;
the bounce is halved and the body rocks on the stride cycle, pivoting on the
feet. Still two poses — it just stops denying it.

**The warrior is `art/warrior-sprites.png`, four poses by five tiers.** A class
sheet is no longer assumed to be two columns: `cols` and `attacks` on the class
say what it drew, and the sheet's blows alternate on `h.swings` so a long fight
is not one frame on a loop. The fourth pose — a shield guard — is deliberately
unwired; there is no blocking state for it to mean, and a pose that appears for
no reason reads as a glitch.

**A trap worth keeping: never scale a sprite off the cell being drawn.** Cells
are trimmed to their own content, so an overhead swing is a third taller than an
idle — fitting each pose to a fixed height shrank the hero by a quarter every
time they raised the sword. Poses now scale off the row's standing cell and walk
frames off the first frame of the cycle, so one scale holds for the whole set
and a raised sword reaches above the head. Measured on the new sheet: the
overhead pose draws at 74px against the idle's 56, where it used to be forced to
56 flat.

**`tools/hero.html` is the sprite bench** — the hero on his own with the game
stopped, slicing through the real `atlas.js` so a sheet that mis-slices there
mis-slices on the road. Tier row, state, slice boxes, anchors, a frame scrubber,
and an all-cells grid that is the fastest way to spot a miscount. It also plays
the faked walk against a real strip, which is the argument for drawing one.

**The next hero sheets are drawn empty-handed, on purpose.** A blade is rigid —
a grip point and an angle — so it is the one piece of gear this pipeline can
layer, and `icons-weapon.png` already holds all five isolated. The only thing
stopping it is that the current bodies have swords painted into their hands.
PROMPTS.md's *Empty-fist sheets* section is the three warrior sheets redrawn
gripping empty air; generate all three or none, or the hero loses his sword in
the walk cycle and finds it again standing still.

**The walk is drawn now.** `art/warrior-walk.png`, four strides by five tiers,
wired through `sprite.anim` with `tiered: true` — which is what tells
`drawAnimFrame` the rows are armour and not more frames. The ghoul's strip has
neither and still works flat. The bob and lean survive only for sheets with no
strip of their own.

**Every action is a two-frame sheet of its own now** — `warrior-heal`, `-cast`,
`-cry`, `-cleave`, `-stomp`, each 2 × 5, wind-up column and release column. The
engine cuts at `WINDUP` (0.4) so the load is a flicker and the release is what
the eye lands on. `SKILL_POSE` in `game.js` maps the bar onto them.
`warrior-actions.png` was the first pass of three *held* poses; it is still on
disk and no longer referenced by anything.

**A two-frame move resolves on the cut, not on the button.** `onRelease()`
parks the skill's damage, sound, effect and shake on the frame change, so the
foot is down before the shockwave leaves it. It is tied to the pose rather than
to a timer of its own, or the two drift and the ring arrives with the knee still
up. Two guards worth keeping: a pose that ends without ever reaching the cut
still fires, because a skill that ate its cooldown and did nothing is the worst
bug available here; and death fires anything pending rather than dropping it.
Every skill on the bar goes through it — the bolt leaves the hand, the heal
takes, the buff lands and the shockwave breaks all on the frame change.
Measured against their cuts: ward 171/180ms, fire 176/176, cleave 237/200, mend
229/220, quake 259/248, frenzy 284/272 — all inside a frame or two of the mark.

A skill with nothing to hit still refunds *immediately* rather than at the cut:
`fire` and `volley` check for a target up front, drop the pose and hand back the
cooldown. Waiting half a second to say "no target" reads as the button being
broken.

**Quake's ring is thrown 0.45 tiles forward of the hero, its damage is not.**
Centred on the body it reads as something he is standing in; under the boot it
reads as something he did. Nothing gameplay-facing moves because a sprite's leg
did.

**The sword vanishes for the length of a skill and a step.** The new sheets are
empty-fisted and `warrior-sprites.png` still has one painted in. That resolves
when the blade layer goes in or the combat sheet is regenerated, and not before.

**The hero art job, in one list.** All of it is written out in PROMPTS.md under
*Empty-fist sheets*: `warrior-combat` (4 × 5), `warrior-walk` (4 × 5), then a
2 × 5 sheet each for `cast`, `heal`, `cry`, `cleave` and `stomp`. Tiers on every
one of them — the hero must not change armour by starting to walk or by casting.

**Every action is two frames, wind-up and release, and the hit lands on the cut
between them.** An earlier pass specced one sheet of three *held* poses; that
was wrong and the file says so where it used to be. A single frame shown for
half a second is the still the hero already stands in with an effect painted
over it — it never looks like something he did. Ward is the one skill with no
sheet, because it is a brace and the combat sheet already draws one.

Until the walk sheet exists the engine keeps faking a stride out of a bob and a
lean, and it keeps looking like hopping.

**There is music.** `startDrone()` is gone. `audio.js` schedules an endless
piece in D aeolian with a five-second lookahead, behind a `musicGain` that sits
under the effects; `setMusicVolume`/`getMusicVolume` alongside the existing
volume exports. Still no audio files anywhere, which remains the rule.


---

## Where the sixth session left it — the rig

**The hero is a skeleton now, not a picture.** `js/rig.js`. This is the biggest
structural change the project has had and it exists for one reason: *equipment
could not be shown.* Every character sheet draws the whole hero with the armour
baked in, so fifty gloves across five slots and eighteen poses is a number
nobody will ever generate. The cost is in the multiplication, so the rig removes
the multiplication — fifteen bones, art hung on them, animation as keyframes
rather than pictures of the result. **A glove is one image of one hand. A new
animation costs no art at all.**

It is behind `?rig` and nothing else changed. Without the flag the game draws
the painted sheets exactly as before. Do not un-gate it until the `legs` slot
has art, or the hero walks around with a hole where his hips are.

### The two rules the whole file rests on

1. **The skeleton owns proportion; art owns appearance, and neither may be the
   other.** The first version described bones as *boxes cut out of a sprite*,
   which made one table responsible for both — and a box drawn slightly wrong
   silently became a limb of the wrong length. It declared a foot 14% of the
   figure against a shin's 16%, so good boot art faithfully filled a box the
   size of a calf. Lengths are in figure-heights now and can be judged as a
   stick figure with no art loaded.
2. **Nothing sets the hip height.** `plant()` solves the legs, finds the lowest
   sole and drops the whole figure onto it. The bob is a *consequence* of the
   stride. The old version ran a sine alongside the legs and the planted foot
   wandered between 0.03 and 0.124 above the ground — the figure bounced through
   its own feet. Every future animation gets grounding for free.

### `STRIDE`, and why the walk finally works

`STRIDE` (0.904 of figure height per cycle, two steps) is exported so the game
drives the walk phase from **distance covered, not time elapsed** — the only way
feet and ground agree at any speed. `moveToward` accumulates `e.dist` in tiles;
the renderer converts and divides. A slowed hero takes slower steps rather than
skating. The drawn sheet could never do this.

`shift` carries the *residual* — accumulated travel minus the body's steady
advance — so it is periodic and loops. Handing over the raw total made the
figure creep forward and snap back a whole stride each cycle, which measured as
a 0.37 slip in one frame.

### Seven bugs, all found by looking at the stick figure

Worth reading before touching angles. Every one was invisible while the rig was
cut from a finished sprite, because that sprite was already correct.

| What looked wrong | What it was |
|---|---|
| Arm at the origin, figure lost | Transform order ≠ draw order. Parents must be placed before children; drawing is sorted by `z` separately. Two passes. |
| Hero stood half a body to the right | The rig anchored on the cell corner; `drawSprite` anchors on the footprint. Offset by `cell.ax`. |
| Helmet worn on the stomach | The head's `rest` was another half-turn. Angles are *relative to the parent* and the spine already points up. |
| Arms sticking out of the head | Same trap, opposite fix: arms hang off the up-pointing spine and need the half-turn back. |
| One arm, down the middle of the chest | `SPREAD` was applied to root bones only, and arms hang off the spine. Both attached at dead centre. |
| Boots standing on their heels | A foot is the one part not drawn hanging down. `sideways` runs the art's *width* along the bone. |
| Chest and helm facing backwards | `invert` used `scale(1,-1)` — a reflection, which composed with the bone's half turn into a horizontal mirror. It is a rotation now. |

### The walk itself, which took three goes

- **A knee is always negative.** Positive swings the shin in front of the thigh:
  a leg breaking, not a leg walking.
- **The knee's *timing* matters as much as its direction.** The thigh swings as
  a sine; the foot is planted through the half where it falls. Bend on the wrong
  half and the planted foot travels back then forward within one stance — a
  pendulum, and the figure covers no ground. It measured as `STRIDE -0.07`:
  walking backwards, slowly.
- **The ankle cancels everything above it.** Angles are inherited, so a knee
  bent 47° swings the whole boot toe-down. The *bent* leg then measured lower
  than the straight one and the wrong foot took the weight. `ankle: -(thigh +
  knee)` holds the sole parallel to the ground; the only deliberate deviation is
  the toe dropping at push-off.

### Check it before looking at it

```bash
node tools/rigcheck.mjs
```

47 assertions, headless, a tenth of a second — every rig bug this session cost a
round trip of you spotting it and me fixing one thing. All of them are numbers.
The check states them: knees never bend forwards, the planted foot never leaves
the ground or slides, nothing sinks through the floor, the feet take turns, the
crown is the highest point, the hands hang at mid-thigh, the two arms are not in
the same place, and — the two that caught the worst of it — **every bone that
runs upward carries `invert` and every bone that runs flat carries `sideways`**.
A mirrored cuirass and a boot standing on its heel are both that assertion
failing.

Run it after any change to `BONES` or `ANIMS`. It is the cheapest thing in the
project.

### Part art

`tools/rig.html` is the editor: stick figure by default, art as a toggle,
sliders for length / rest angle / where a bone hangs, and Copy to get the bone
table back as code. Judging a walk with armour on it is judging two things at
once, which is why the skeleton is the default.

Four of five slots have art: `helm-01` (1 × 5), `chest-01`, `gloves-01`,
`boots-01` (all 2 × 5). **`legs-01.png` is the missing one** — pelvis and both
thighs — and its prompt is written. It is the sheet where pieces are
deliberately *not* cut square: hips and knees bend furthest, and a square cut at
a bending joint opens a wedge, so the pelvis overlaps both thigh tops and the
thigh ends in a knee cap that overhangs the shin. The neck needs no bridge — the
helm carries the throat and the chest carries the collar.

**A bone owns `length` *and* `thick`, both in figure-heights.** Width used to
come from the art's own aspect ratio, which is the same mistake as the original
boxes wearing two hats: a generously drawn greave came out 0.134 wide against a
human calf's 0.075, so the shins looked like tree trunks — and no redraw would
have fixed it, because the next design would have been whatever width it
happened to be. The picture is squeezed to the limb now, not the reverse.

**The figure still does not look good, and it is not finished.** With all five
slots on it reads as a knight with the pieces in roughly the right places, and
that is all. Known bad, in the order I would take it:

- **Bare flesh shows at the shoulder and above the knee.** Each piece has an
  unarmoured section at its joint end and the parent does not overlap far
  enough to hide it. That is an art-overlap problem, not a bone one — the
  pelvis and knee cap were drawn to bridge, the pauldron and hip were not.
- The helm sits low in the collar; the head may want to hang slightly above the
  spine tip rather than exactly at it.
- Bone lengths are now right on paper (crown lands at exactly 1.000, trunk 0.35,
  legs 0.50) but have never been eyeballed as a whole with all five slots on.
  That pass has not happened.

**Bone lengths are measured against human proportion**, not guessed: thigh
0.25 (human 0.245), shin 0.22 (0.235), foot 0.15 (0.152), upper arm 0.16
(0.172), forearm 0.15 (0.157), hand 0.105 (0.108), spine 0.35 (0.35), head 0.15
(0.15). Widths: thigh 0.105, shin 0.078, hand 0.052, shoulders 0.230. When something looks wrong, measure before
adjusting — the shin "looking too long" was a foot 40% too short.

**`SPREAD` for the arms is derived, not eyeballed:** a torso is drawn 0.236 of
the figure wide *including its shoulders*, so the edges sit at ±0.118 and an arm
0.097 wide must sit half of that inboard — ±0.070. The arms are the opposite
sign to the legs on purpose: the chest art's near armhole faces away from the
direction of travel.

### The prompt lesson, now in ART-BRIEF

**The generator obeys the cell, never the sheet.** An instruction a cell can
satisfy alone gets followed; an instruction about how cells relate to each other
gets ignored, because each is drawn without reference to its neighbours.

| Fails | Works |
|---|---|
| "all five the same height as each other" | "each fills its cell top to bottom" |
| "no sword" | "hands closed, gripping empty air" |
| "cut off at the ankle" | "no foot, no boot, no sabaton, no toe, no heel — a flat horizontal cut" |

Height variance between designs is **not** worth measuring. What matters is
whether the joint is at the cell edge; get that and pieces can differ 25% in
height and still line up, because the stretch lands between the same two joints
either way. Two generations were spent chasing the wrong number.

---

## Also this session

**The town is the first biome.** `art/*-town.png`, a full Area 1 set. The ladder
shifted by one — town 1–6, boneyard 7–12, grove 13–18, gate 19–24, crypt 25–30,
inferno 31+ — so every repaint now arrives six stages later than before. That is
a pacing change, not just art.

`props-town.png` sliced **13 cells instead of 12**: a 6×65 sliver of stray paint,
0.01× the median area, invisible at a glance and silently shifting every prop
slot by one. `propSlice: { auto: true, minCell: 0.12 }` discards it. Check the
cell count on every new prop sheet.

**The camp follows the level.** Each entry in `LEVELS` carries an `area` slug and
every sheet for an area is `<kind>-<area>.png`, so one word names the set. Only
`camp-town` and `camp-boneyard` exist; the other eight fall back to the boneyard
— and the swap only happens *after the image decodes*, because set straight onto
the element a missing file blanks the panel.

**`art/crypt-heroes-logo-01.png`** is the in-game wordmark — tarnished, flat, no
backing plate, and it keys cleanly. The earlier glossy badge is kept for
thumbnails and the app icon, where loud is correct. Not yet wired into the title.

**Known-open, in the order I would take them:**

1. `legs-01.png` — the last part sheet, and the visible hole in the rig.
2. A tuning pass on bone lengths with all five slots present, in the editor.
3. **The band names do not match the materials.** Band 3 is `purple` and the art
   is blue crystal; band 5 is `gold` and the art is bone. Looting a "Gold"
   gauntlet puts bone on your hands. It is a rename, not art, and it is now
   visible on the character rather than buried in a tooltip.
4. The weapon layer. `icons-weapon.png` has five blades isolated already and the
   hero is empty-handed everywhere; it needs a grip anchor per pose.
5. Nine more area art sets; `camp-inferno` in particular, since the inferno is
   reachable and its camp is still a graveyard.

**A trap worth not rediscovering:** debug `setInterval`s left running in the
preview tab look exactly like a game bug. A "constantly shaking screen" was one
of mine pinning the camera every 16ms. Reload the tab after any pinning.

---

## The base layer — direction given at the end of session seven

**The hero wears clothes under the armour, and that is the answer to bare
flesh.** The painted sheets solved every uncovered joint the same way: a
long-sleeved shirt fills the arms where no plate reaches, black trousers fill
the legs. Nothing in those figures is bare skin except the face — the shoulder
and the knee are *cloth*, not gaps.

This changes what a missing armour piece means for the rig. The standing rule
has been "if a slot has no art, draw nothing, because a stretched neighbour is a
lie", and that stays true of *armour*. But the honest filler was never nothing;
it was the shirt. A rig that draws a hole where the painting draws a sleeve is
not being more honest than the painting, it is missing a layer the painting had.

So: **not every joint needs to be covered by armour.** The base layer is drawn
under every slot, always, at every tier, and armour lands on top of it. One
sheet — sleeved torso, arms, legs — buys back every bare-flesh gap at once, and
it removes the pressure to draw a plate for every joint just to avoid a hole.

Two consequences worth having in mind before it is wired:

- It is a layer, not a slot. It is never unequipped, so it needs no band, no
  rarity and no bag entry; it is what the body is made of.
- Once it exists, "bare flesh at the shoulder" stops being an art request and
  becomes a z-order question.

**The painted helmets read as more dangerous than `helm-01.png`.** The horned
and crested silhouettes on the sheets have a profile the new helms do not — the
new ones are competent headgear, the painted ones are a threat. Whatever is
generated next for the head slot should be pushed considerably further in that
direction: horns, crests, and a silhouette that is doing something above the
crown. Judge a helm on its outline at thumbnail size, not on its detail.
