# Prompts

Every prompt on this page is finished. Copy one, paste it into DALL·E, save the
PNG into `art/` under the filename in its heading. Nothing to substitute, no
rules block to append, no table to look up.

`ART-BRIEF.md` is the companion: it explains *why* each prompt is shaped the way
it is and what breaks when a line is dropped. Read it when a generation comes
back wrong. Read this one when you just want art.

Ask for **1024×1024** unless the heading says otherwise.

## Contents

- [Loot icons](#wanted-next--loot-icons) — the four sheets wanted now
- [The hero](#the-hero)
- [The other three classes](#the-other-three-classes) — Paladin, Warlock, Druid
- [Combat states](#combat-states--the-four-column-sheets) — four poses per class
- [A monster](#a-monster)
- The ten areas, six prompts each:
  1. [Outside of a Town](#area-1--outside-of-a-town) — `town`
  2. [The Open Road](#area-2--the-open-road) — `openroad`
  3. [The Killing Fields](#area-3--the-killing-fields) — `fields`
  4. [Dangerous Cave](#area-4--dangerous-cave) — `cave`
  5. [The Elder Wood](#area-5--the-elder-wood) — `wood`
  6. [The Broken Gate](#area-6--the-broken-gate) — `gate`
  7. [The Sunken Chapel](#area-7--the-sunken-chapel) — `chapel`
  8. [The Crypt](#area-8--the-crypt) — `crypt`
  9. [The Bone Halls](#area-9--the-bone-halls) — `bonehalls`
  10. [The Inferno](#area-10--the-inferno) — `inferno`

Each area gives you: verge texture, path texture, prop sheet, decals, landmarks,
camp backdrop. Areas 1 and 3 are the ones to do first — area 1 is where every
new player starts, area 3 is where the road stops being pleasant.

---

## Wanted next — loot icons

Five cells per sheet, worst to best. The cell index is the item's rarity band,
so the order is not cosmetic: the fifth icon is the Gold one.

### `art/icons-cuirass.png`

```
A flat single row of five a fantasy chest cuirass on a solid pure magenta background
(#FF00FF), dark-gothic pixel art style, chunky readable pixels.

The same piece of equipment five times, ascending in quality left to right:
worn brown leather; dull grey steel; ornate gold with horned flourishes;
blackened steel with glowing blue crystal inlays; pale carved bone.

All five at the same scale and the same angle, seen three-quarter from the
front, lit identically from the upper left, floating on nothing — no ground,
no base, no shadow, no hand or body holding them.

Very wide empty magenta gutters between them.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

### `art/icons-gauntlets.png`

```
A flat single row of five a pair of fantasy gauntlets on a solid pure magenta background
(#FF00FF), dark-gothic pixel art style, chunky readable pixels.

The same piece of equipment five times, ascending in quality left to right:
worn brown leather; dull grey steel; ornate gold with horned flourishes;
blackened steel with glowing blue crystal inlays; pale carved bone.

All five at the same scale and the same angle, seen three-quarter from the
front, lit identically from the upper left, floating on nothing — no ground,
no base, no shadow, no hand or body holding them.

Very wide empty magenta gutters between them.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

### `art/icons-greaves.png`

```
A flat single row of five a pair of fantasy leg greaves with boots on a solid pure magenta background
(#FF00FF), dark-gothic pixel art style, chunky readable pixels.

The same piece of equipment five times, ascending in quality left to right:
worn brown leather; dull grey steel; ornate gold with horned flourishes;
blackened steel with glowing blue crystal inlays; pale carved bone.

All five at the same scale and the same angle, seen three-quarter from the
front, lit identically from the upper left, floating on nothing — no ground,
no base, no shadow, no hand or body holding them.

Very wide empty magenta gutters between them.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

### `art/icons-weapon.png`

```
A flat single row of five a fantasy straight sword, blade pointing up on a solid pure magenta background
(#FF00FF), dark-gothic pixel art style, chunky readable pixels.

The same piece of equipment five times, ascending in quality left to right:
worn brown leather; dull grey steel; ornate gold with horned flourishes;
blackened steel with glowing blue crystal inlays; pale carved bone.

All five at the same scale and the same angle, seen three-quarter from the
front, lit identically from the upper left, floating on nothing — no ground,
no base, no shadow, no hand or body holding them.

Very wide empty magenta gutters between them.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

---

## The hero

Already generated as `art/Pixel-Warrior.png`. Kept so it can be reproduced
exactly if it ever needs redoing.

### `art/Pixel-Warrior.png` — 2 columns × 5 rows

```
A flat 2-column by 5-row grid of a fantasy warrior on a solid pure magenta
background (#FF00FF), dark-gothic pixel art style, chunky readable pixels.

Every row is the SAME character in a different armour set, in this order top
to bottom: worn brown leather; dull grey steel plate; ornate gold plate with
horned helm; blackened plate with glowing blue crystal inlays; pale bone
armour with a horned skull helm.

Left column: standing idle, weight settled, sword lowered.
Right column: mid-attack, sword swung forward.

All ten poses are the same character at the same scale and the same height,
facing right, seen from a slight elevation, lit identically from the upper
left, standing on nothing — no ground, no base, no shadow.

Very wide empty magenta gutters between every row and column.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

---

## The other three classes

The party is four: Warrior, Paladin, Warlock, Druid. The Warrior exists; these
three are named places at the fire waiting on a sheet, and the moment one lands
under the filename below, `CLASSES` in `entities.js` picks it up.

Same shape as the Warrior sheet in every case — two columns of idle and attack,
five rows of armour tier, in the same order — so the row index stays
`armourTierOf(gear.armor)` for every class. The five tiers are described in each
class's own materials, but they stay the same five rungs: leather, steel, gold,
crystal, bone. **Keep that ladder**: a Gold helm has to look Gold on all four of
them, or the loot ladder stops reading.

### `art/Pixel-Paladin.png` — 2 columns × 5 rows

```
A flat 2-column by 5-row grid of a fantasy paladin in heavy plate with a tall tower shield and a war
hammer on a solid pure magenta
background (#FF00FF), dark-gothic pixel art style, chunky readable pixels.

Every row is the SAME character in a different armour set, in this order top
to bottom: worn brown leather over a plain tabard; dull grey steel plate; ornate gold
plate with a winged helm; blackened plate with glowing blue crystal inlays;
pale bone armour with a horned skull helm.

Left column: standing idle, shield grounded, hammer lowered.
Right column: mid-attack, hammer swung forward, shield braced.

All ten poses are the same character at the same scale and the same height,
facing right, seen from a slight elevation, lit identically from the upper
left, standing on nothing — no ground, no base, no shadow.

Very wide empty magenta gutters between every row and column.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

### `art/Pixel-Warlock.png` — 2 columns × 5 rows

```
A flat 2-column by 5-row grid of a fantasy warlock in a hooded robe carrying a gnarled staff, gaunt and
hollow-eyed on a solid pure magenta
background (#FF00FF), dark-gothic pixel art style, chunky readable pixels.

Every row is the SAME character in a different armour set, in this order top
to bottom: worn brown homespun robes; grey robes with steel-studded leather; gold
embroidered robes with a horned circlet; blackened robes with glowing blue
crystal inlays; pale bone-plated robes with a horned skull mask.

Left column: standing idle, staff held upright at their side, robes hanging still.
Right column: mid-cast, staff thrust forward, free hand splayed.

All ten poses are the same character at the same scale and the same height,
facing right, seen from a slight elevation, lit identically from the upper
left, standing on nothing — no ground, no base, no shadow.

Very wide empty magenta gutters between every row and column.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

### `art/Pixel-Druid.png` — 2 columns × 5 rows

```
A flat 2-column by 5-row grid of a fantasy druid in hide and bark armour with an antlered headdress,
carrying a gnarled wooden stave on a solid pure magenta
background (#FF00FF), dark-gothic pixel art style, chunky readable pixels.

Every row is the SAME character in a different armour set, in this order top
to bottom: worn brown hide and rough bark; grey weathered bark bound with steel;
gold-leafed bark with a gilded antler crown; blackened bark with glowing
blue crystal growths; pale bone and antler armour with a horned skull.

Left column: standing idle, stave planted, weight settled.
Right column: mid-attack, stave swung forward.

All ten poses are the same character at the same scale and the same height,
facing right, seen from a slight elevation, lit identically from the upper
left, standing on nothing — no ground, no base, no shadow.

Very wide empty magenta gutters between every row and column.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```
---

## Combat states — the four-column sheets

The class sheets above are **two** columns: idle and one swing. That is enough
to fight with and not enough to fight *differently* — every perk build swings
the same way. These are the same sheets widened to **four** columns, so a hero
reads as the build they took.

| Column | State | When the engine draws it |
|---|---|---|
| 0 | idle | standing, between swings |
| 1 | light swing | the ordinary attack |
| 2 | heavy swing | the attack of a hero built for damage — Might, Brutal, Keen |
| 3 | guard | struck, blocking, or built for defence — Plating, Stoicism |

Rows stay the five armour tiers, in the same order, so the cell index is
`row * 4 + column` and the row is still `wornTier(equipped)`.

**Keep the feet planted in the same place in all four poses.** The engine
anchors a sprite by the middle of its footprint, so a pose that shifts its
stance shifts the whole figure on screen — this is the one thing that will look
broken if it is wrong.

Replace `COMBATANT` with the class line from the section above (the warrior with
their sword, the paladin behind the tower shield, and so on) and `SETS` with
that class's five tier descriptions.

```
A flat 4-column by 5-row grid of COMBATANT on a solid pure magenta background
(#FF00FF), dark-gothic pixel art style, chunky readable pixels.

Every row is the SAME character in a different armour set, in this order top
to bottom: SETS.

Left to right, the four columns are four poses of that same character:
1. standing idle, weight settled, weapon lowered.
2. a light attack, weapon swung forward at waist height.
3. a heavy attack, weapon raised high overhead in both hands, body turned
   into the blow.
4. braced to take a hit, weapon low and shoulder forward behind a guard.

All twenty poses are the same character at the same scale and the same
height, facing right, seen from a slight elevation, lit identically from the
upper left, standing on nothing — no ground, no base, no shadow. The feet
stay in the same position in all four poses.

Very wide empty magenta gutters between every row and column.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

Sheets can be dropped in a class at a time — `cols` is per sheet, so a
four-column Paladin and a two-column Warrior coexist happily and the two-column
one simply keeps swinging the one way it knows.

## A monster

One sheet per creature. Two poses only — the engine adds the walk bob, the
facing flip, the hit flash and the death fade. Swap the creature description on
the first line and nowhere else.

### `art/ghoul-town.png` — 2 columns × 1 row

```
A flat 2-column grid of a hunched grave-ghoul with long clawed arms and
tattered burial rags on a solid pure magenta background (#FF00FF),
dark-gothic style.

Left column: standing idle, weight settled, arms down.
Right column: mid-attack, claws swung forward.

Both poses are the same creature at the same scale, facing right, seen
from a slight elevation, lit identically from the upper left, standing on
nothing — no ground, no base, no shadow.

Wide empty magenta gutters between the columns.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

---

## Area 1 — Outside of a Town

### `art/grass-town.png` — the verge

```
A seamless repeating top-down texture of trodden farm grass, pale and dry, with bare patches of earth.
Photographic detail, evenly lit from directly above, completely flat with no
depth. Fills the entire square edge to edge.

No objects, no plants, no rocks large enough to notice, no focal point of
any kind — anything an eye can land on becomes a visible grid when this
repeats. No text. No vignette, no corner darkening, no lighting gradient,
no shadows. Uniform brightness across the whole image.
```

### `art/road-town.png` — the path

```
A seamless repeating top-down texture of a packed dirt cart track with worn wheel ruts.
Photographic detail, evenly lit from directly above, completely flat with no
depth. Fills the entire square edge to edge.

No objects, no plants, no rocks large enough to notice, no focal point of
any kind — anything an eye can land on becomes a visible grid when this
repeats. No text. No vignette, no corner darkening, no lighting gradient,
no shadows. Uniform brightness across the whole image.
```

### `art/props-town.png` — 4 × 3, twelve props

Cell order is wired into `world.js`. Do not reorder it.

```
A flat 4x3 grid of twelve fantasy game props on a solid pure magenta
background (#FF00FF), dark-gothic style, the outskirts of a farming village.

Left to right, top to bottom:
1-3. three different bare wind-bent farmland trees
4-6. three different wooden wayside posts, one carrying a ragged scarecrow
7-8. a broken hay bale and a pile of dropped farm tools
9-10. two boulders
11. a length of wooden farm fence
12. a low scrub bush

Every object is upright, seen from a slight elevation, lit identically
from the upper left, and stands on nothing — no ground, no base, no
shadow beneath it. Wide empty magenta gutters between every row and
column, at least 12% of the image width.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

### `art/decals-town.png` — 4 × 3, flat ground marks

```
A flat 4x3 grid of twelve top-down ground markings on a solid pure
magenta background (#FF00FF), for a packed dirt cart track with worn wheel ruts.

Twelve different marks: cracks, scuffs, moss patches, gravel scatter,
dried stains, puddles, ruts, and worn patches. Each is completely flat,
seen from directly above, as if painted onto the ground itself — no
height, no objects, no shadows, nothing standing up.

Wide empty magenta gutters between every row and column.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

### `art/landmarks-town.png` — 2 × 2, four big pieces

```
A flat 2x2 grid of four large fantasy structures on a solid pure magenta
background (#FF00FF), dark-gothic style, the outskirts of a farming village.

Four different landmarks, each tall and imposing, seen from a slight
elevation, lit identically from the upper left, standing on nothing —
no ground, no base, no shadow.

Very wide empty magenta gutters between them.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

### `art/camp-town.png` — the camp backdrop, **1792×1024**

Not on magenta, and no gutters — a painted backdrop, never keyed and never
sliced. The centre must stay empty: the engine paints the fire, the cookpot and
the party there.

```
A single wide painted scene of an abandoned camp on the outskirts of a farming village at night, dark-gothic
fantasy, muted and desaturated, seen from a slight elevation looking down —
the same three-quarter view as an isometric game.

The centre of the clearing is BARE, EMPTY trodden ground: no fire, no fire
pit, no logs, no ring of stones, nothing standing in the middle. The whole
scene is lit as if by a single low campfire sitting on that empty ground —
warm orange light raking outward across the ground from the lower centre,
everything falling to near-black within a short distance of it.

Around the edges of the clearing, in silhouette against that firelight:
a sagging canvas tent, a bedroll and a pack, a hay cart, a stack of
firewood, a leaning wooden fence line, farm tools propped against a post,
bare trees, and a village palisade on the horizon.

The upper third is dark empty night sky above the horizon line. The bottom
fifth of the image fades to solid near-black.

Near-black ground, one warm light source only, no other light. No people, no
characters, no figures, no skeletons, no animals. No text, letters, numbers,
labels, logos or watermarks. No UI, frames or borders. No magenta.
```

---

## Area 2 — The Open Road

### `art/grass-openroad.png` — the verge

```
A seamless repeating top-down texture of coarse wild grass and weeds, dry and unkempt.
Photographic detail, evenly lit from directly above, completely flat with no
depth. Fills the entire square edge to edge.

No objects, no plants, no rocks large enough to notice, no focal point of
any kind — anything an eye can land on becomes a visible grid when this
repeats. No text. No vignette, no corner darkening, no lighting gradient,
no shadows. Uniform brightness across the whole image.
```

### `art/road-openroad.png` — the path

```
A seamless repeating top-down texture of old flagstones, cracked and grown through with grass.
Photographic detail, evenly lit from directly above, completely flat with no
depth. Fills the entire square edge to edge.

No objects, no plants, no rocks large enough to notice, no focal point of
any kind — anything an eye can land on becomes a visible grid when this
repeats. No text. No vignette, no corner darkening, no lighting gradient,
no shadows. Uniform brightness across the whole image.
```

### `art/props-openroad.png` — 4 × 3, twelve props

Cell order is wired into `world.js`. Do not reorder it.

```
A flat 4x3 grid of twelve fantasy game props on a solid pure magenta
background (#FF00FF), dark-gothic style, a long abandoned highway.

Left to right, top to bottom:
1-3. three different dead roadside trees with bare crooked limbs
4-6. three different stone wayside crosses and worn milestones
7-8. a fallen signpost and a scatter of dead brush
9-10. two boulders
11. a length of dry-stone wall
12. a low scrub bush

Every object is upright, seen from a slight elevation, lit identically
from the upper left, and stands on nothing — no ground, no base, no
shadow beneath it. Wide empty magenta gutters between every row and
column, at least 12% of the image width.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

### `art/decals-openroad.png` — 4 × 3, flat ground marks

```
A flat 4x3 grid of twelve top-down ground markings on a solid pure
magenta background (#FF00FF), for old flagstones, cracked and grown through with grass.

Twelve different marks: cracks, scuffs, moss patches, gravel scatter,
dried stains, puddles, ruts, and worn patches. Each is completely flat,
seen from directly above, as if painted onto the ground itself — no
height, no objects, no shadows, nothing standing up.

Wide empty magenta gutters between every row and column.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

### `art/landmarks-openroad.png` — 2 × 2, four big pieces

```
A flat 2x2 grid of four large fantasy structures on a solid pure magenta
background (#FF00FF), dark-gothic style, a long abandoned highway.

Four different landmarks, each tall and imposing, seen from a slight
elevation, lit identically from the upper left, standing on nothing —
no ground, no base, no shadow.

Very wide empty magenta gutters between them.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

### `art/camp-openroad.png` — the camp backdrop, **1792×1024**

Not on magenta, and no gutters — a painted backdrop, never keyed and never
sliced. The centre must stay empty: the engine paints the fire, the cookpot and
the party there.

```
A single wide painted scene of an abandoned camp beside an old highway shrine at night, dark-gothic
fantasy, muted and desaturated, seen from a slight elevation looking down —
the same three-quarter view as an isometric game.

The centre of the clearing is BARE, EMPTY trodden ground: no fire, no fire
pit, no logs, no ring of stones, nothing standing in the middle. The whole
scene is lit as if by a single low campfire sitting on that empty ground —
warm orange light raking outward across the ground from the lower centre,
everything falling to near-black within a short distance of it.

Around the edges of the clearing, in silhouette against that firelight:
a sagging canvas tent, a bedroll and a pack, a stone wayside cross, a
stack of firewood, a wooden handcart, a toppled milestone, dry-stone
walling, bare dead trees, and a ruined roadside shrine on the horizon.

The upper third is dark empty night sky above the horizon line. The bottom
fifth of the image fades to solid near-black.

Near-black ground, one warm light source only, no other light. No people, no
characters, no figures, no skeletons, no animals. No text, letters, numbers,
labels, logos or watermarks. No UI, frames or borders. No magenta.
```

---

## Area 3 — The Killing Fields

### `art/grass-fields.png` — the verge

```
A seamless repeating top-down texture of churned mud and trampled grass, waterlogged in places.
Photographic detail, evenly lit from directly above, completely flat with no
depth. Fills the entire square edge to edge.

No objects, no plants, no rocks large enough to notice, no focal point of
any kind — anything an eye can land on becomes a visible grid when this
repeats. No text. No vignette, no corner darkening, no lighting gradient,
no shadows. Uniform brightness across the whole image.
```

### `art/road-fields.png` — the path

```
A seamless repeating top-down texture of deep mud thick with standing water.
Photographic detail, evenly lit from directly above, completely flat with no
depth. Fills the entire square edge to edge.

No objects, no plants, no rocks large enough to notice, no focal point of
any kind — anything an eye can land on becomes a visible grid when this
repeats. No text. No vignette, no corner darkening, no lighting gradient,
no shadows. Uniform brightness across the whole image.
```

### `art/props-fields.png` — 4 × 3, twelve props

Cell order is wired into `world.js`. Do not reorder it.

```
A flat 4x3 grid of twelve fantasy game props on a solid pure magenta
background (#FF00FF), dark-gothic style, an old battlefield.

Left to right, top to bottom:
1-3. three different torn war banners on broken poles
4-6. three different shields planted upright as grave markers
7-8. a bundle of broken spears and a scatter of discarded armour
9-10. two boulders
11. a length of sharpened defensive stakes
12. a low scrub bush

Every object is upright, seen from a slight elevation, lit identically
from the upper left, and stands on nothing — no ground, no base, no
shadow beneath it. Wide empty magenta gutters between every row and
column, at least 12% of the image width.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

### `art/decals-fields.png` — 4 × 3, flat ground marks

```
A flat 4x3 grid of twelve top-down ground markings on a solid pure
magenta background (#FF00FF), for deep mud thick with standing water.

Twelve different marks: cracks, scuffs, moss patches, gravel scatter,
dried stains, puddles, ruts, and worn patches. Each is completely flat,
seen from directly above, as if painted onto the ground itself — no
height, no objects, no shadows, nothing standing up.

Wide empty magenta gutters between every row and column.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

### `art/landmarks-fields.png` — 2 × 2, four big pieces

```
A flat 2x2 grid of four large fantasy structures on a solid pure magenta
background (#FF00FF), dark-gothic style, an old battlefield.

Four different landmarks, each tall and imposing, seen from a slight
elevation, lit identically from the upper left, standing on nothing —
no ground, no base, no shadow.

Very wide empty magenta gutters between them.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

### `art/camp-fields.png` — the camp backdrop, **1792×1024**

Not on magenta, and no gutters — a painted backdrop, never keyed and never
sliced. The centre must stay empty: the engine paints the fire, the cookpot and
the party there.

```
A single wide painted scene of an abandoned camp on an old battlefield at night, dark-gothic
fantasy, muted and desaturated, seen from a slight elevation looking down —
the same three-quarter view as an isometric game.

The centre of the clearing is BARE, EMPTY trodden ground: no fire, no fire
pit, no logs, no ring of stones, nothing standing in the middle. The whole
scene is lit as if by a single low campfire sitting on that empty ground —
warm orange light raking outward across the ground from the lower centre,
everything falling to near-black within a short distance of it.

Around the edges of the clearing, in silhouette against that firelight:
a sagging canvas tent, a bedroll and a pack, broken spears and shields
stuck in the mud, a stack of firewood, a wooden handcart, torn war banners
on poles, bare dead trees, and a low earth rampart on the horizon.

The upper third is dark empty night sky above the horizon line. The bottom
fifth of the image fades to solid near-black.

Near-black ground, one warm light source only, no other light. No people, no
characters, no figures, no skeletons, no animals. No text, letters, numbers,
labels, logos or watermarks. No UI, frames or borders. No magenta.
```

---

## Area 4 — Dangerous Cave

### `art/grass-cave.png` — the verge

```
A seamless repeating top-down texture of bare wet rock and loose gravel.
Photographic detail, evenly lit from directly above, completely flat with no
depth. Fills the entire square edge to edge.

No objects, no plants, no rocks large enough to notice, no focal point of
any kind — anything an eye can land on becomes a visible grid when this
repeats. No text. No vignette, no corner darkening, no lighting gradient,
no shadows. Uniform brightness across the whole image.
```

### `art/road-cave.png` — the path

```
A seamless repeating top-down texture of a worn damp stone floor.
Photographic detail, evenly lit from directly above, completely flat with no
depth. Fills the entire square edge to edge.

No objects, no plants, no rocks large enough to notice, no focal point of
any kind — anything an eye can land on becomes a visible grid when this
repeats. No text. No vignette, no corner darkening, no lighting gradient,
no shadows. Uniform brightness across the whole image.
```

### `art/props-cave.png` — 4 × 3, twelve props

Cell order is wired into `world.js`. Do not reorder it.

```
A flat 4x3 grid of twelve fantasy game props on a solid pure magenta
background (#FF00FF), dark-gothic style, a deep cave.

Left to right, top to bottom:
1-3. three different tall stalagmites
4-6. three different old timber pit-props driven upright
7-8. a fall of shattered rock and a broken mine cart wheel
9-10. two boulders
11. a length of rough hewn timber shoring
12. a low scrub bush

Every object is upright, seen from a slight elevation, lit identically
from the upper left, and stands on nothing — no ground, no base, no
shadow beneath it. Wide empty magenta gutters between every row and
column, at least 12% of the image width.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

### `art/decals-cave.png` — 4 × 3, flat ground marks

```
A flat 4x3 grid of twelve top-down ground markings on a solid pure
magenta background (#FF00FF), for a worn damp stone floor.

Twelve different marks: cracks, scuffs, moss patches, gravel scatter,
dried stains, puddles, ruts, and worn patches. Each is completely flat,
seen from directly above, as if painted onto the ground itself — no
height, no objects, no shadows, nothing standing up.

Wide empty magenta gutters between every row and column.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

### `art/landmarks-cave.png` — 2 × 2, four big pieces

```
A flat 2x2 grid of four large fantasy structures on a solid pure magenta
background (#FF00FF), dark-gothic style, a deep cave.

Four different landmarks, each tall and imposing, seen from a slight
elevation, lit identically from the upper left, standing on nothing —
no ground, no base, no shadow.

Very wide empty magenta gutters between them.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

### `art/camp-cave.png` — the camp backdrop, **1792×1024**

Not on magenta, and no gutters — a painted backdrop, never keyed and never
sliced. The centre must stay empty: the engine paints the fire, the cookpot and
the party there.

```
A single wide painted scene of an abandoned camp in the mouth of a deep cave at night, dark-gothic
fantasy, muted and desaturated, seen from a slight elevation looking down —
the same three-quarter view as an isometric game.

The centre of the clearing is BARE, EMPTY trodden ground: no fire, no fire
pit, no logs, no ring of stones, nothing standing in the middle. The whole
scene is lit as if by a single low campfire sitting on that empty ground —
warm orange light raking outward across the ground from the lower centre,
everything falling to near-black within a short distance of it.

Around the edges of the clearing, in silhouette against that firelight:
a sagging canvas tent, a bedroll and a pack, timber pit-props, a stack of
firewood, a broken mine cart, coils of rope, falls of shattered rock, and
tall stalagmites receding into the dark.

The upper third is dark stone vaulting and shadow above the far wall. The bottom
fifth of the image fades to solid near-black.

Near-black ground, one warm light source only, no other light. No people, no
characters, no figures, no skeletons, no animals. No text, letters, numbers,
labels, logos or watermarks. No UI, frames or borders. No magenta.
```

---

## Area 5 — The Elder Wood

### `art/grass-wood.png` — the verge

```
A seamless repeating top-down texture of deep moss and dead leaves.
Photographic detail, evenly lit from directly above, completely flat with no
depth. Fills the entire square edge to edge.

No objects, no plants, no rocks large enough to notice, no focal point of
any kind — anything an eye can land on becomes a visible grid when this
repeats. No text. No vignette, no corner darkening, no lighting gradient,
no shadows. Uniform brightness across the whole image.
```

### `art/road-wood.png` — the path

```
A seamless repeating top-down texture of a narrow root-broken forest path.
Photographic detail, evenly lit from directly above, completely flat with no
depth. Fills the entire square edge to edge.

No objects, no plants, no rocks large enough to notice, no focal point of
any kind — anything an eye can land on becomes a visible grid when this
repeats. No text. No vignette, no corner darkening, no lighting gradient,
no shadows. Uniform brightness across the whole image.
```

### `art/props-wood.png` — 4 × 3, twelve props

Cell order is wired into `world.js`. Do not reorder it.

```
A flat 4x3 grid of twelve fantasy game props on a solid pure magenta
background (#FF00FF), dark-gothic style, an ancient dying forest.

Left to right, top to bottom:
1-3. three different pale dead trees, tall and bare
4-6. three different standing stones wrapped in thorns
7-8. a fall of rotten branches and a patch of hanging moss
9-10. two boulders
11. a length of thorn thicket
12. a low scrub bush

Every object is upright, seen from a slight elevation, lit identically
from the upper left, and stands on nothing — no ground, no base, no
shadow beneath it. Wide empty magenta gutters between every row and
column, at least 12% of the image width.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

### `art/decals-wood.png` — 4 × 3, flat ground marks

```
A flat 4x3 grid of twelve top-down ground markings on a solid pure
magenta background (#FF00FF), for a narrow root-broken forest path.

Twelve different marks: cracks, scuffs, moss patches, gravel scatter,
dried stains, puddles, ruts, and worn patches. Each is completely flat,
seen from directly above, as if painted onto the ground itself — no
height, no objects, no shadows, nothing standing up.

Wide empty magenta gutters between every row and column.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

### `art/landmarks-wood.png` — 2 × 2, four big pieces

```
A flat 2x2 grid of four large fantasy structures on a solid pure magenta
background (#FF00FF), dark-gothic style, an ancient dying forest.

Four different landmarks, each tall and imposing, seen from a slight
elevation, lit identically from the upper left, standing on nothing —
no ground, no base, no shadow.

Very wide empty magenta gutters between them.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

### `art/camp-wood.png` — the camp backdrop, **1792×1024**

Not on magenta, and no gutters — a painted backdrop, never keyed and never
sliced. The centre must stay empty: the engine paints the fire, the cookpot and
the party there.

```
A single wide painted scene of an abandoned camp in a clearing in an ancient dying forest at night, dark-gothic
fantasy, muted and desaturated, seen from a slight elevation looking down —
the same three-quarter view as an isometric game.

The centre of the clearing is BARE, EMPTY trodden ground: no fire, no fire
pit, no logs, no ring of stones, nothing standing in the middle. The whole
scene is lit as if by a single low campfire sitting on that empty ground —
warm orange light raking outward across the ground from the lower centre,
everything falling to near-black within a short distance of it.

Around the edges of the clearing, in silhouette against that firelight:
a sagging canvas tent, a bedroll and a pack, a stack of firewood, a
wooden handcart, thorn thickets, moss hung from low branches, pale dead
trees crowding the clearing, and standing stones on the horizon.

The upper third is dark empty night sky above the horizon line. The bottom
fifth of the image fades to solid near-black.

Near-black ground, one warm light source only, no other light. No people, no
characters, no figures, no skeletons, no animals. No text, letters, numbers,
labels, logos or watermarks. No UI, frames or borders. No magenta.
```

---

## Area 6 — The Broken Gate

### `art/grass-gate.png` — the verge

```
A seamless repeating top-down texture of rubble and weeds between paving stones.
Photographic detail, evenly lit from directly above, completely flat with no
depth. Fills the entire square edge to edge.

No objects, no plants, no rocks large enough to notice, no focal point of
any kind — anything an eye can land on becomes a visible grid when this
repeats. No text. No vignette, no corner darkening, no lighting gradient,
no shadows. Uniform brightness across the whole image.
```

### `art/road-gate.png` — the path

```
A seamless repeating top-down texture of a cracked flagstone causeway.
Photographic detail, evenly lit from directly above, completely flat with no
depth. Fills the entire square edge to edge.

No objects, no plants, no rocks large enough to notice, no focal point of
any kind — anything an eye can land on becomes a visible grid when this
repeats. No text. No vignette, no corner darkening, no lighting gradient,
no shadows. Uniform brightness across the whole image.
```

### `art/props-gate.png` — 4 × 3, twelve props

Cell order is wired into `world.js`. Do not reorder it.

```
A flat 4x3 grid of twelve fantasy game props on a solid pure magenta
background (#FF00FF), dark-gothic style, a shattered fortress gatehouse.

Left to right, top to bottom:
1-3. three different shattered stone columns
4-6. three different fallen masonry blocks stood on end
7-8. a heap of rubble and a torn banner
9-10. two boulders
11. a length of broken curtain wall
12. a low scrub bush

Every object is upright, seen from a slight elevation, lit identically
from the upper left, and stands on nothing — no ground, no base, no
shadow beneath it. Wide empty magenta gutters between every row and
column, at least 12% of the image width.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

### `art/decals-gate.png` — 4 × 3, flat ground marks

```
A flat 4x3 grid of twelve top-down ground markings on a solid pure
magenta background (#FF00FF), for a cracked flagstone causeway.

Twelve different marks: cracks, scuffs, moss patches, gravel scatter,
dried stains, puddles, ruts, and worn patches. Each is completely flat,
seen from directly above, as if painted onto the ground itself — no
height, no objects, no shadows, nothing standing up.

Wide empty magenta gutters between every row and column.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

### `art/landmarks-gate.png` — 2 × 2, four big pieces

```
A flat 2x2 grid of four large fantasy structures on a solid pure magenta
background (#FF00FF), dark-gothic style, a shattered fortress gatehouse.

Four different landmarks, each tall and imposing, seen from a slight
elevation, lit identically from the upper left, standing on nothing —
no ground, no base, no shadow.

Very wide empty magenta gutters between them.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

### `art/camp-gate.png` — the camp backdrop, **1792×1024**

Not on magenta, and no gutters — a painted backdrop, never keyed and never
sliced. The centre must stay empty: the engine paints the fire, the cookpot and
the party there.

```
A single wide painted scene of an abandoned camp inside a shattered fortress gate at night, dark-gothic
fantasy, muted and desaturated, seen from a slight elevation looking down —
the same three-quarter view as an isometric game.

The centre of the clearing is BARE, EMPTY trodden ground: no fire, no fire
pit, no logs, no ring of stones, nothing standing in the middle. The whole
scene is lit as if by a single low campfire sitting on that empty ground —
warm orange light raking outward across the ground from the lower centre,
everything falling to near-black within a short distance of it.

Around the edges of the clearing, in silhouette against that firelight:
a sagging canvas tent, a bedroll and a pack, shattered columns, a stack
of firewood, a wooden handcart, torn banners, heaped fallen masonry, and
the split towers of a broken gatehouse on the horizon.

The upper third is dark empty night sky above the horizon line. The bottom
fifth of the image fades to solid near-black.

Near-black ground, one warm light source only, no other light. No people, no
characters, no figures, no skeletons, no animals. No text, letters, numbers,
labels, logos or watermarks. No UI, frames or borders. No magenta.
```

---

## Area 7 — The Sunken Chapel

### `art/grass-chapel.png` — the verge

```
A seamless repeating top-down texture of waterlogged silt and reeds.
Photographic detail, evenly lit from directly above, completely flat with no
depth. Fills the entire square edge to edge.

No objects, no plants, no rocks large enough to notice, no focal point of
any kind — anything an eye can land on becomes a visible grid when this
repeats. No text. No vignette, no corner darkening, no lighting gradient,
no shadows. Uniform brightness across the whole image.
```

### `art/road-chapel.png` — the path

```
A seamless repeating top-down texture of a stone causeway barely above standing water.
Photographic detail, evenly lit from directly above, completely flat with no
depth. Fills the entire square edge to edge.

No objects, no plants, no rocks large enough to notice, no focal point of
any kind — anything an eye can land on becomes a visible grid when this
repeats. No text. No vignette, no corner darkening, no lighting gradient,
no shadows. Uniform brightness across the whole image.
```

### `art/props-chapel.png` — 4 × 3, twelve props

Cell order is wired into `world.js`. Do not reorder it.

```
A flat 4x3 grid of twelve fantasy game props on a solid pure magenta
background (#FF00FF), dark-gothic style, a drowned chapel in a flooded valley.

Left to right, top to bottom:
1-3. three different drowned trees standing in still water
4-6. three different broken statuary of saints
7-8. a drowned pew and a scatter of altar stones
9-10. two boulders
11. a length of rotted fence posts standing in water
12. a low scrub bush

Every object is upright, seen from a slight elevation, lit identically
from the upper left, and stands on nothing — no ground, no base, no
shadow beneath it. Wide empty magenta gutters between every row and
column, at least 12% of the image width.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

### `art/decals-chapel.png` — 4 × 3, flat ground marks

```
A flat 4x3 grid of twelve top-down ground markings on a solid pure
magenta background (#FF00FF), for a stone causeway barely above standing water.

Twelve different marks: cracks, scuffs, moss patches, gravel scatter,
dried stains, puddles, ruts, and worn patches. Each is completely flat,
seen from directly above, as if painted onto the ground itself — no
height, no objects, no shadows, nothing standing up.

Wide empty magenta gutters between every row and column.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

### `art/landmarks-chapel.png` — 2 × 2, four big pieces

```
A flat 2x2 grid of four large fantasy structures on a solid pure magenta
background (#FF00FF), dark-gothic style, a drowned chapel in a flooded valley.

Four different landmarks, each tall and imposing, seen from a slight
elevation, lit identically from the upper left, standing on nothing —
no ground, no base, no shadow.

Very wide empty magenta gutters between them.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

### `art/camp-chapel.png` — the camp backdrop, **1792×1024**

Not on magenta, and no gutters — a painted backdrop, never keyed and never
sliced. The centre must stay empty: the engine paints the fire, the cookpot and
the party there.

```
A single wide painted scene of an abandoned camp on the shore of a flooded valley at night, dark-gothic
fantasy, muted and desaturated, seen from a slight elevation looking down —
the same three-quarter view as an isometric game.

The centre of the clearing is BARE, EMPTY trodden ground: no fire, no fire
pit, no logs, no ring of stones, nothing standing in the middle. The whole
scene is lit as if by a single low campfire sitting on that empty ground —
warm orange light raking outward across the ground from the lower centre,
everything falling to near-black within a short distance of it.

Around the edges of the clearing, in silhouette against that firelight:
a sagging canvas tent, a bedroll and a pack, a stack of firewood, an
upturned boat, drowned pews, broken statuary, reeds standing in black
water, and the roof of a sunken chapel breaking the surface on the horizon.

The upper third is dark empty night sky above the horizon line. The bottom
fifth of the image fades to solid near-black.

Near-black ground, one warm light source only, no other light. No people, no
characters, no figures, no skeletons, no animals. No text, letters, numbers,
labels, logos or watermarks. No UI, frames or borders. No magenta.
```

---

## Area 8 — The Crypt

### `art/grass-crypt.png` — the verge

```
A seamless repeating top-down texture of a dressed stone floor thick with dust.
Photographic detail, evenly lit from directly above, completely flat with no
depth. Fills the entire square edge to edge.

No objects, no plants, no rocks large enough to notice, no focal point of
any kind — anything an eye can land on becomes a visible grid when this
repeats. No text. No vignette, no corner darkening, no lighting gradient,
no shadows. Uniform brightness across the whole image.
```

### `art/road-crypt.png` — the path

```
A seamless repeating top-down texture of worn stone slabs between graves.
Photographic detail, evenly lit from directly above, completely flat with no
depth. Fills the entire square edge to edge.

No objects, no plants, no rocks large enough to notice, no focal point of
any kind — anything an eye can land on becomes a visible grid when this
repeats. No text. No vignette, no corner darkening, no lighting gradient,
no shadows. Uniform brightness across the whole image.
```

### `art/props-crypt.png` — 4 × 3, twelve props

Cell order is wired into `world.js`. Do not reorder it.

```
A flat 4x3 grid of twelve fantasy game props on a solid pure magenta
background (#FF00FF), dark-gothic style, an underground crypt.

Left to right, top to bottom:
1-3. three different stone sarcophagi stood upright
4-6. three different carved grave markers
7-8. a broken urn and a scatter of bones
9-10. two boulders
11. a length of iron grave railing
12. a low scrub bush

Every object is upright, seen from a slight elevation, lit identically
from the upper left, and stands on nothing — no ground, no base, no
shadow beneath it. Wide empty magenta gutters between every row and
column, at least 12% of the image width.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

### `art/decals-crypt.png` — 4 × 3, flat ground marks

```
A flat 4x3 grid of twelve top-down ground markings on a solid pure
magenta background (#FF00FF), for worn stone slabs between graves.

Twelve different marks: cracks, scuffs, moss patches, gravel scatter,
dried stains, puddles, ruts, and worn patches. Each is completely flat,
seen from directly above, as if painted onto the ground itself — no
height, no objects, no shadows, nothing standing up.

Wide empty magenta gutters between every row and column.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

### `art/landmarks-crypt.png` — 2 × 2, four big pieces

```
A flat 2x2 grid of four large fantasy structures on a solid pure magenta
background (#FF00FF), dark-gothic style, an underground crypt.

Four different landmarks, each tall and imposing, seen from a slight
elevation, lit identically from the upper left, standing on nothing —
no ground, no base, no shadow.

Very wide empty magenta gutters between them.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

### `art/camp-crypt.png` — the camp backdrop, **1792×1024**

Not on magenta, and no gutters — a painted backdrop, never keyed and never
sliced. The centre must stay empty: the engine paints the fire, the cookpot and
the party there.

```
A single wide painted scene of an abandoned camp in a wide underground crypt chamber at night, dark-gothic
fantasy, muted and desaturated, seen from a slight elevation looking down —
the same three-quarter view as an isometric game.

The centre of the clearing is BARE, EMPTY trodden ground: no fire, no fire
pit, no logs, no ring of stones, nothing standing in the middle. The whole
scene is lit as if by a single low campfire sitting on that empty ground —
warm orange light raking outward across the ground from the lower centre,
everything falling to near-black within a short distance of it.

Around the edges of the clearing, in silhouette against that firelight:
a sagging canvas tent, a bedroll and a pack, stone sarcophagi, a stack of
firewood, iron sconces set in the walls, broken urns, carved grave markers,
and a pillared crypt archway receding into the dark.

The upper third is dark stone vaulting and shadow above the far wall. The bottom
fifth of the image fades to solid near-black.

Near-black ground, one warm light source only, no other light. No people, no
characters, no figures, no skeletons, no animals. No text, letters, numbers,
labels, logos or watermarks. No UI, frames or borders. No magenta.
```

---

## Area 9 — The Bone Halls

### `art/grass-bonehalls.png` — the verge

```
A seamless repeating top-down texture of bone fragments packed into pale earth.
Photographic detail, evenly lit from directly above, completely flat with no
depth. Fills the entire square edge to edge.

No objects, no plants, no rocks large enough to notice, no focal point of
any kind — anything an eye can land on becomes a visible grid when this
repeats. No text. No vignette, no corner darkening, no lighting gradient,
no shadows. Uniform brightness across the whole image.
```

### `art/road-bonehalls.png` — the path

```
A seamless repeating top-down texture of a swept path between heaped bones.
Photographic detail, evenly lit from directly above, completely flat with no
depth. Fills the entire square edge to edge.

No objects, no plants, no rocks large enough to notice, no focal point of
any kind — anything an eye can land on becomes a visible grid when this
repeats. No text. No vignette, no corner darkening, no lighting gradient,
no shadows. Uniform brightness across the whole image.
```

### `art/props-bonehalls.png` — 4 × 3, twelve props

Cell order is wired into `world.js`. Do not reorder it.

```
A flat 4x3 grid of twelve fantasy game props on a solid pure magenta
background (#FF00FF), dark-gothic style, halls built of stacked bone.

Left to right, top to bottom:
1-3. three different arches built from ribcages
4-6. three different cairns of stacked skulls
7-8. a spill of loose bones and a cracked skull
9-10. two boulders
11. a length of low wall of stacked femurs
12. a low scrub bush

Every object is upright, seen from a slight elevation, lit identically
from the upper left, and stands on nothing — no ground, no base, no
shadow beneath it. Wide empty magenta gutters between every row and
column, at least 12% of the image width.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

### `art/decals-bonehalls.png` — 4 × 3, flat ground marks

```
A flat 4x3 grid of twelve top-down ground markings on a solid pure
magenta background (#FF00FF), for a swept path between heaped bones.

Twelve different marks: cracks, scuffs, moss patches, gravel scatter,
dried stains, puddles, ruts, and worn patches. Each is completely flat,
seen from directly above, as if painted onto the ground itself — no
height, no objects, no shadows, nothing standing up.

Wide empty magenta gutters between every row and column.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

### `art/landmarks-bonehalls.png` — 2 × 2, four big pieces

```
A flat 2x2 grid of four large fantasy structures on a solid pure magenta
background (#FF00FF), dark-gothic style, halls built of stacked bone.

Four different landmarks, each tall and imposing, seen from a slight
elevation, lit identically from the upper left, standing on nothing —
no ground, no base, no shadow.

Very wide empty magenta gutters between them.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

### `art/camp-bonehalls.png` — the camp backdrop, **1792×1024**

Not on magenta, and no gutters — a painted backdrop, never keyed and never
sliced. The centre must stay empty: the engine paints the fire, the cookpot and
the party there.

```
A single wide painted scene of an abandoned camp in a hall built of stacked bone at night, dark-gothic
fantasy, muted and desaturated, seen from a slight elevation looking down —
the same three-quarter view as an isometric game.

The centre of the clearing is BARE, EMPTY trodden ground: no fire, no fire
pit, no logs, no ring of stones, nothing standing in the middle. The whole
scene is lit as if by a single low campfire sitting on that empty ground —
warm orange light raking outward across the ground from the lower centre,
everything falling to near-black within a short distance of it.

Around the edges of the clearing, in silhouette against that firelight:
a sagging canvas tent, a bedroll and a pack, a stack of firewood, arches
built from ribcages, cairns of stacked skulls, spilled loose bones, iron
sconces, and a wall of stacked bone receding into the dark.

The upper third is dark stone vaulting and shadow above the far wall. The bottom
fifth of the image fades to solid near-black.

Near-black ground, one warm light source only, no other light. No people, no
characters, no figures, no skeletons, no animals. No text, letters, numbers,
labels, logos or watermarks. No UI, frames or borders. No magenta.
```

---

## Area 10 — The Inferno

### `art/grass-inferno.png` — the verge

```
A seamless repeating top-down texture of cracked black rock with glowing lava seams.
Photographic detail, evenly lit from directly above, completely flat with no
depth. Fills the entire square edge to edge.

No objects, no plants, no rocks large enough to notice, no focal point of
any kind — anything an eye can land on becomes a visible grid when this
repeats. No text. No vignette, no corner darkening, no lighting gradient,
no shadows. Uniform brightness across the whole image.
```

### `art/road-inferno.png` — the path

```
A seamless repeating top-down texture of a scorched basalt path.
Photographic detail, evenly lit from directly above, completely flat with no
depth. Fills the entire square edge to edge.

No objects, no plants, no rocks large enough to notice, no focal point of
any kind — anything an eye can land on becomes a visible grid when this
repeats. No text. No vignette, no corner darkening, no lighting gradient,
no shadows. Uniform brightness across the whole image.
```

### `art/props-inferno.png` — 4 × 3, twelve props

Cell order is wired into `world.js`. Do not reorder it.

```
A flat 4x3 grid of twelve fantasy game props on a solid pure magenta
background (#FF00FF), dark-gothic style, a volcanic cavern.

Left to right, top to bottom:
1-3. three different jagged obsidian shards
4-6. three different iron braziers on stone plinths
7-8. a spill of cooling slag and a scatter of burnt bone
9-10. two boulders
11. a length of low wall of fused black rock
12. a low scrub bush

Every object is upright, seen from a slight elevation, lit identically
from the upper left, and stands on nothing — no ground, no base, no
shadow beneath it. Wide empty magenta gutters between every row and
column, at least 12% of the image width.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

### `art/decals-inferno.png` — 4 × 3, flat ground marks

```
A flat 4x3 grid of twelve top-down ground markings on a solid pure
magenta background (#FF00FF), for a scorched basalt path.

Twelve different marks: cracks, scuffs, moss patches, gravel scatter,
dried stains, puddles, ruts, and worn patches. Each is completely flat,
seen from directly above, as if painted onto the ground itself — no
height, no objects, no shadows, nothing standing up.

Wide empty magenta gutters between every row and column.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

### `art/landmarks-inferno.png` — 2 × 2, four big pieces

```
A flat 2x2 grid of four large fantasy structures on a solid pure magenta
background (#FF00FF), dark-gothic style, a volcanic cavern.

Four different landmarks, each tall and imposing, seen from a slight
elevation, lit identically from the upper left, standing on nothing —
no ground, no base, no shadow.

Very wide empty magenta gutters between them.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

### `art/camp-inferno.png` — the camp backdrop, **1792×1024**

Not on magenta, and no gutters — a painted backdrop, never keyed and never
sliced. The centre must stay empty: the engine paints the fire, the cookpot and
the party there.

```
A single wide painted scene of an abandoned camp on a rock ledge above a lava flow at night, dark-gothic
fantasy, muted and desaturated, seen from a slight elevation looking down —
the same three-quarter view as an isometric game.

The centre of the clearing is BARE, EMPTY trodden ground: no fire, no fire
pit, no logs, no ring of stones, nothing standing in the middle. The whole
scene is lit as if by a single low campfire sitting on that empty ground —
warm orange light raking outward across the ground from the lower centre,
everything falling to near-black within a short distance of it.

Around the edges of the clearing, in silhouette against that firelight:
a sagging canvas tent, a bedroll and a pack, iron braziers, a stack of
firewood, jagged obsidian shards, cracked black rock, and spills of cooling
slag.

The upper third is dark stone vaulting and shadow above the far wall. The bottom
fifth of the image fades to solid near-black.

Near-black rock, lit by the campfire and by the lava glow alone — no other
light. The lava is the only saturated colour anywhere in the image. No people, no
characters, no figures, no skeletons, no animals. No text, letters, numbers,
labels, logos or watermarks. No UI, frames or borders. No magenta.
```

---

## When a sheet comes back

- [ ] Magenta throughout, never shading towards green (noisy magenta is fine)
- [ ] Nothing touches another object or the image edge
- [ ] No text anywhere, including numbers
- [ ] No frames, plates or circles behind objects
- [ ] Nothing stands on a base or casts a shadow
- [ ] All objects at consistent scale and lit from the same side
- [ ] For textures: no object an eye can land on, and uniform brightness

Then drop it in `art/` and say what it is — the slicing gets checked before it
is wired, because a miscounted cell shifts every index after it.

## A note on the filenames

`camp-boneyard.png`, already in `art/` and wired to the camp screen, is named
for the **biome** (`boneyard`, the painted graveyard road), not for a level. The
keys above are per **level**, which is what the ten areas are and what the map
implies. The first time a second area's art lands, that difference has to be
resolved in `render.js` and `world.js` — see the Wiring section of
`ART-BRIEF.md`.
