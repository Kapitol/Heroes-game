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

---

## The walk — `art/<class>-walk.png`, 4 columns × 5 rows

**The engine cannot fake a walk and should stop being asked to.** With no drawn
stride it bounces the standing pose vertically and rocks it a couple of degrees,
which is a hero hopping on the spot while the ground slides past. There is no
setting of those two dials that is a walk; see it for yourself at
`tools/hero.html`, which plays the faked version and a real strip side by side.

Four frames is a full stride and the smallest number that reads as one: contact,
passing, contact on the other foot, passing. The engine loops them on the same
phase the bob used to run on, so a walk drawn here lands on the beat everything
else in the scene already keeps.

| Column | Frame |
|---|---|
| 0 | left foot forward, weight landing on it |
| 1 | legs together, passing, body at its highest |
| 2 | right foot forward, weight landing on it |
| 3 | legs together, passing the other way |

Rows are the same five armour tiers in the same order as the combat sheet, so
the row is `wornTier(equipped)` there and here and the hero never changes
armour by starting to walk.

The generator was thought to be unable to hold a character across an animation
strip. `art/ghoul-town-walking.png` disproved that — six poses of one creature,
consistent. What it cannot do is a *long* strip, so four frames is the ask and
twelve is not.

### `art/warrior-walk.png` — 4 columns × 5 rows

The Warrior's, filled in. The tier line is copied word for word from
`art/Pixel-Warrior.png` so the five rungs land in the same order and the same
materials as the combat sheet already on disk — if that line drifts, the hero
changes armour the moment he takes a step.

```
A flat 4-column by 5-row grid of a fantasy warrior on a solid pure magenta
background (#FF00FF), dark-gothic pixel art style, chunky readable pixels.

Every row is the SAME character in a different armour set, in this order top
to bottom: worn brown leather; dull grey steel plate; ornate gold plate with
horned helm; blackened plate with glowing blue crystal inlays; pale bone
armour with a horned skull helm.

Left to right, the four columns are four frames of one walking stride, seen
from the side, walking to the right:
1. left foot planted forward, weight coming down onto it, back leg trailing.
2. legs together mid-step, body at the top of its rise, back foot lifting.
3. right foot planted forward, weight coming down onto it, other leg trailing.
4. legs together mid-step again, the opposite leg lifting.

The sword is carried low at his side and the shield is down; the arms swing
naturally against the legs. It is a walk, not a run and not a charge — the
body stays upright and the stride is even.

All twenty frames are the same character at the same scale and the same
height, facing right, seen from a slight elevation, lit identically from the
upper left, standing on nothing — no ground, no base, no shadow. The figure
does not travel across its cell: he walks in place, centred in every frame.

Very wide empty magenta gutters between every row and column.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

### The template

Replace `COMBATANT` and `SETS` exactly as in the combat sheet above.

```
A flat 4-column by 5-row grid of COMBATANT on a solid pure magenta background
(#FF00FF), dark-gothic pixel art style, chunky readable pixels.

Every row is the SAME character in a different armour set, in this order top
to bottom: SETS.

Left to right, the four columns are four frames of one walking stride, seen
from the side, walking to the right:
1. left foot planted forward, weight coming down onto it, back leg trailing.
2. legs together mid-step, body at the top of its rise, back foot lifting.
3. right foot planted forward, weight coming down onto it, other leg trailing.
4. legs together mid-step again, the opposite leg lifting.

The arms swing naturally against the legs and the weapon is carried low and
ready, not raised. It is a walk, not a run and not a charge — the body stays
upright and the stride is even.

All twenty frames are the same character at the same scale and the same
height, facing right, seen from a slight elevation, lit identically from the
upper left, standing on nothing — no ground, no base, no shadow. The figure
does not travel across its cell: it walks in place, centred in every frame.

Very wide empty magenta gutters between every row and column.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

---

## Actions — superseded

An earlier pass here specified one `<class>-actions.png` of three held poses:
heal, cast, cry. It is gone, and the reason is worth keeping: **a held pose is
not an animation.** A single frame shown for half a second is the same still
image the hero already stands in, tinted by whatever effect the engine paints
over it — the skill still does not look like anything the hero *did*.

Every action is two frames now, wind-up and release, one small sheet each. See
*Every action is two frames* under the empty-fist sheets below.


---

# Empty-fist sheets — the weapon as a layer

A blade is rigid. It has a grip and an angle and it never bends, which makes it
the one piece of gear this pipeline can genuinely layer: `icons-weapon.png`
already holds all five, isolated. What stops it is that the body sheets are
drawn holding a sword, so a layered blade lands on top of a painted one.

These replace the warrior's sheets with the same tiers and the same character —
and an empty gripping fist. Generate all of them or none; a hero who loses his
sword in the walk cycle and finds it again standing still is worse than one who
never had a layer.

Copy a block whole. Nothing outside the block belongs in it.

### `art/warrior-combat.png` — 4 columns × 5 rows

```
A flat 4-column by 5-row grid of a fantasy warrior on a solid pure magenta
background (#FF00FF), dark-gothic pixel art style, chunky readable pixels.

Every row is the SAME character in a different armour set, in this order top
to bottom: worn brown leather; dull grey steel plate; ornate gold plate with
horned helm; blackened plate with glowing blue crystal inlays; pale bone
armour with a horned skull helm.

Left to right, the four columns are four poses of that same character:
1. standing idle, weight settled, both arms down at his sides.
2. a light attack, right arm swung forward at waist height.
3. a heavy attack, both arms raised high overhead, body turned into the blow.
4. braced to take a hit, right arm low and shoulder forward.

His hands are closed into tight fists throughout, gripping empty air as though
the weapon had been taken out of them. He is completely unarmed: no sword, no
axe, no mace, no staff, no shield, no weapon or object of any kind, in either
hand, in any of the twenty cells. Nothing is held, carried, sheathed, strapped
to his back or hanging from his belt.

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

### `art/warrior-walk.png` — 4 columns × 5 rows

```
A flat 4-column by 5-row grid of a fantasy warrior on a solid pure magenta
background (#FF00FF), dark-gothic pixel art style, chunky readable pixels.

Every row is the SAME character in a different armour set, in this order top
to bottom: worn brown leather; dull grey steel plate; ornate gold plate with
horned helm; blackened plate with glowing blue crystal inlays; pale bone
armour with a horned skull helm.

Left to right, the four columns are four frames of one walking stride, seen
from the side, walking to the right:
1. left foot planted forward, weight coming down onto it, back leg trailing.
2. legs together mid-step, body at the top of its rise, back foot lifting.
3. right foot planted forward, weight coming down onto it, other leg trailing.
4. legs together mid-step again, the opposite leg lifting.

His arms swing naturally against his legs, hands closed into loose fists,
gripping empty air. He is completely unarmed: no sword, no axe, no mace, no
staff, no shield, no weapon or object of any kind, in either hand, in any of
the twenty cells. Nothing is held, carried, sheathed, strapped to his back or
hanging from his belt.

It is a walk, not a run and not a charge — the body stays upright and the
stride is even.

All twenty frames are the same character at the same scale and the same
height, facing right, seen from a slight elevation, lit identically from the
upper left, standing on nothing — no ground, no base, no shadow. The figure
does not travel across its cell: he walks in place, centred in every frame.

Very wide empty magenta gutters between every row and column.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

### Every action is two frames

A held pose is not an animation. The stomp reads because it is a wind-up and a
landing with the hit on the cut between them, and every action on the bar wants
the same shape: **column 0 winds up, column 1 releases**, and the engine fires
the damage, the sound and the effect on the change of frame.

Ten cells a sheet, which is the safest size this generator has. One sheet per
action rather than one wide sheet for all of them — a 5x5 grid is past the
twenty cells it can hold a character across, and a sheet that drifts costs the
whole set rather than one move.

| Skill | Plays | Sheet |
|---|---|---|
| Cleave | a wide level sweep | `warrior-cleave.png` |
| Firebolt, Volley | a cast | `warrior-cast.png` |
| Mend, Last Rites | a heal | `warrior-heal.png` |
| Frenzy | a battle cry | `warrior-cry.png` |
| Quake | a stomp | `warrior-stomp.png` |
| Ward | the guard pose, held | `warrior-combat.png`, column 3 |

Ward is the one that gets no sheet of its own. It is a brace, the combat sheet
already draws a brace, and drawing a second one would be the same pose twice.

### `art/warrior-cast.png` — 2 columns × 5 rows

```
A flat 2-column by 5-row grid of a fantasy warrior on a solid pure magenta
background (#FF00FF), dark-gothic pixel art style, chunky readable pixels.

Every row is the SAME character in a different armour set, in this order top
to bottom: worn brown leather; dull grey steel plate; ornate gold plate with
horned helm; blackened plate with glowing blue crystal inlays; pale bone
armour with a horned skull helm.

Left column: winding up to cast. Turned side-on, his right arm drawn far back
behind him with the palm open and the fingers spread, his weight settled onto
his back foot, his shoulders coiled away from the direction he faces.

Right column: the cast released. That same right arm thrust straight forward
at full stretch, palm open and fingers spread wide, his weight driven onto his
front foot, his left arm swept back behind him for balance.

His feet stay planted in exactly the same two spots in both columns — only the
body and the arms move.

He is completely unarmed: no sword, no axe, no mace, no staff, no shield, no
weapon or object of any kind, in either hand, in any of the ten cells. Nothing
is held, carried, sheathed, strapped to his back or hanging from his belt.

His hands are empty of magic: no glow, no flame, no light, no sparks, no
energy of any kind, nothing summoned or conjured. Just the gesture.

Both poses are the same character at the same scale and the same height,
facing right, seen from a slight elevation, lit identically from the upper
left, standing on nothing — no ground, no base, no shadow.

Very wide empty magenta gutters between every row and column.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

### `art/warrior-heal.png` — 2 columns × 5 rows

```
A flat 2-column by 5-row grid of a fantasy warrior on a solid pure magenta
background (#FF00FF), dark-gothic pixel art style, chunky readable pixels.

Every row is the SAME character in a different armour set, in this order top
to bottom: worn brown leather; dull grey steel plate; ornate gold plate with
horned helm; blackened plate with glowing blue crystal inlays; pale bone
armour with a horned skull helm.

Left column: beginning to heal. His head is bowed and his right hand is raised
open in front of his chest, palm turned inward, held a little away from the
body, his left arm down at his side.

Right column: the heal taking. That same right hand is pressed flat against
the centre of his chest, his head bowed lower, his shoulders drawn in and his
back curved over the hand.

His feet stay planted in exactly the same two spots in both columns — only the
head, the shoulders and the right arm move.

He is completely unarmed: no sword, no axe, no mace, no staff, no shield, no
weapon or object of any kind, in either hand, in any of the ten cells. Nothing
is held, carried, sheathed, strapped to his back or hanging from his belt.

His hands are empty of magic: no glow, no flame, no light, no sparks, no
energy of any kind, nothing summoned or conjured. Just the gesture.

Both poses are the same character at the same scale and the same height,
facing right, seen from a slight elevation, lit identically from the upper
left, standing on nothing — no ground, no base, no shadow.

Very wide empty magenta gutters between every row and column.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

### `art/warrior-cry.png` — 2 columns × 5 rows

```
A flat 2-column by 5-row grid of a fantasy warrior on a solid pure magenta
background (#FF00FF), dark-gothic pixel art style, chunky readable pixels.

Every row is the SAME character in a different armour set, in this order top
to bottom: worn brown leather; dull grey steel plate; ornate gold plate with
horned helm; blackened plate with glowing blue crystal inlays; pale bone
armour with a horned skull helm.

Left column: drawing breath. His head is dropped forward, his shoulders
hunched up and rolled in, his arms bent and his fists clenched close to his
sides, the whole body gathered and compressed.

Right column: the battle cry. Both arms drawn back and down behind his body,
fists clenched, chest thrown out and shoulders rolled back, head tilted back,
face contorted and mouth wide open in a roar.

His feet stay planted in exactly the same two spots in both columns — only the
head, the chest and the arms move.

He is completely unarmed: no sword, no axe, no mace, no staff, no shield, no
weapon or object of any kind, in either hand, in any of the ten cells. Nothing
is held, carried, sheathed, strapped to his back or hanging from his belt.

Both poses are the same character at the same scale and the same height,
facing right, seen from a slight elevation, lit identically from the upper
left, standing on nothing — no ground, no base, no shadow.

Very wide empty magenta gutters between every row and column.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

### `art/warrior-cleave.png` — 2 columns × 5 rows

```
A flat 2-column by 5-row grid of a fantasy warrior on a solid pure magenta
background (#FF00FF), dark-gothic pixel art style, chunky readable pixels.

Every row is the SAME character in a different armour set, in this order top
to bottom: worn brown leather; dull grey steel plate; ornate gold plate with
horned helm; blackened plate with glowing blue crystal inlays; pale bone
armour with a horned skull helm.

Left column: winding up to sweep. His torso is twisted hard away from the
direction he faces, both fists clenched and drawn across his chest at shoulder
height, his weight loaded onto his back foot.

Right column: the sweep. His torso is twisted hard the other way, both arms
swung out and around in front of him, level and fully extended at waist
height, his weight driven onto his front foot.

His feet stay planted in exactly the same two spots in both columns — only the
torso and the arms move.

He is completely unarmed: no sword, no axe, no mace, no staff, no shield, no
weapon or object of any kind, in either hand, in any of the ten cells. Nothing
is held, carried, sheathed, strapped to his back or hanging from his belt.

Both poses are the same character at the same scale and the same height,
facing right, seen from a slight elevation, lit identically from the upper
left, standing on nothing — no ground, no base, no shadow.

Very wide empty magenta gutters between every row and column.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

### `art/warrior-stomp.png` — 2 columns × 5 rows

Two frames, not three: the lift and the landing. The engine holds the lift for
the wind-up, cuts to the landing on the beat, and spawns the shockwave and the
camera shake on that same frame — so the impact is the cut, and a third
in-between frame would only soften it.

The standing foot must not move between the two columns. It is the anchor the
shockwave is drawn from, and a figure that shifts its planted foot drags the
ring out from under itself.

```
A flat 2-column by 5-row grid of a fantasy warrior on a solid pure magenta
background (#FF00FF), dark-gothic pixel art style, chunky readable pixels.

Every row is the SAME character in a different armour set, in this order top
to bottom: worn brown leather; dull grey steel plate; ornate gold plate with
horned helm; blackened plate with glowing blue crystal inlays; pale bone
armour with a horned skull helm.

Left column: winding up to stomp. His weight is back on his left leg, his
right knee is driven high in front of him with the foot raised, his body is
coiled and leaning back, both fists clenched and pulled back at his sides.

Right column: the stomp landing. That same right foot is slammed flat on the
ground out in front of him, the knee bent deep under his weight, his body
dropped low and driven forward over it, both fists punched down at his sides,
head down, face set in a snarl.

His left foot stays planted in exactly the same spot in both columns — only
the right leg and the body move.

He is completely unarmed: no sword, no axe, no mace, no staff, no shield, no
weapon or object of any kind, in either hand, in either column, in any of the
ten cells. Nothing is held, carried, sheathed, strapped to his back or hanging
from his belt. There is no dust, no rubble, no cracks, no impact, no shockwave
and no ground of any kind — only the figure.

Both poses are the same character at the same scale and the same height,
facing right, seen from a slight elevation, lit identically from the upper
left, standing on nothing — no ground, no base, no shadow.

Very wide empty magenta gutters between every row and column.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

---

# Part art — the rig

The whole-figure sheets above draw the hero with his armour baked in, which is
why equipment could never show: fifty gloves across five slots and eighteen
poses is a number nobody is going to generate. `js/rig.js` removes the
multiplication — the hero is fifteen parts on a skeleton, animation is keyframes
on the bones, and **a glove is one image of one hand.** Fifty gloves is fifty
small images and no new animation work at all.

Three things every part sheet must hold, and they are all about the *joint*
rather than the object:

- **Rest orientation.** The rig's rest pose hangs the arm straight down, so a
  forearm is drawn vertical with the elbow at the top and the wrist at the
  bottom. A piece drawn at a jaunty angle rotates about the wrong axis forever.
- **One scale for every design on the sheet.** The bones scale the art, not the
  other way round, so a bulkier gauntlet must be *drawn* bulkier at the same
  canvas size rather than drawn bigger. A design that arrives 20% larger makes
  the hero's arm grow when you equip it.
- **The limb, not the garment.** A part is the whole limb: bare skin included
  where the piece does not cover it. A glove that is only a glove leaves a hole
  where the arm should be.

The far arm uses the same two images as the near one — the renderer darkens it
and puts it behind the body. Never ask for a left and a right.

### `art/gloves-01.png` — 2 columns × 5 rows, five designs

The `hands` slot owns four bones: both forearms and both hands. So one design is
**two cells** — a forearm and a hand — and a sheet of five designs is ten cells,
which is the size this generator has held a character across all day.

Rows are the five bands in the usual order, so the first sheet doubles as the
loot ladder and `itemArt` keeps working the way it does for every other slot.

```
A flat 2-column by 5-row grid of fantasy armour pieces on a solid pure magenta
background (#FF00FF), dark-gothic pixel art style, chunky readable pixels.

Every row is one matching set of arm armour, in this order top to bottom: worn
brown leather; dull grey steel plate; ornate gold plate; blackened plate with
glowing blue crystal inlays; pale bone plate.

The two columns are two pieces of that same set:
1. a right forearm, held vertically with the elbow at the top of the cell and
   the wrist at the bottom, seen from the outer side. It includes the arm
   itself — bare skin above the cuff wherever the armour does not cover it.
2. the matching right hand, held vertically with the wrist at the top of the
   cell and the knuckles at the bottom, closed into a fist and gripping empty
   air as though a sword had been taken out of it.

Both pieces are cut off cleanly and squarely at the joint: the forearm ends at
the wrist, the hand begins at the wrist, and the two would meet edge to edge if
laid end to end.

All five forearms are exactly the same height on the canvas as each other, and
all five hands are exactly the same height as each other. A heavier design is
drawn wider, never taller.

All ten pieces face right, seen from a slight elevation, lit identically from
the upper left, floating on nothing — no ground, no base, no shadow, no arm
socket, no shoulder, no body.

Nothing is held: no sword, no weapon, no object of any kind.

Very wide empty magenta gutters between every row and column.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```


### `art/boots-01.png` — 2 columns × 5 rows, five designs

The `feet` slot owns four bones: both shins and both feet. Same shape as the
gloves — two cells a design, ten to a sheet.

The one thing this cannot copy from the gloves is the foot's orientation. Every
other part hangs *down* from its joint, so it is drawn vertical. A foot does
not: it hangs off the ankle and points *forward*. Drawn vertical like a shin it
would rotate about the toe and the hero would walk on his ankles.

**Say "no foot" about the shin, at length.** The first roll of this sheet came
back with a sabaton on the end of every greave, because a shin drawn as armour
is a boot and the generator finishes what it recognises. The separate foot then
hides it — until the ankle rotates far enough to swing a second toe out from
underneath, which a stomp does immediately. The gloves sheet needed no such
warning: a forearm cut at the wrist is not a recognisable object, so there was
nothing to complete.

```
A flat 2-column by 5-row grid of fantasy armour pieces on a solid pure magenta
background (#FF00FF), dark-gothic pixel art style, chunky readable pixels.

Every row is one matching set of leg armour, in this order top to bottom: worn
brown leather; dull grey steel plate; ornate gold plate; blackened plate with
glowing blue crystal inlays; pale bone plate.

The two columns are two pieces of that same set:
1. a right shin, held vertically with the knee at the top of the cell and the
   ankle at the bottom, seen from the outer side. It includes the leg itself —
   bare skin or cloth above the greave wherever the armour does not cover it.
   It stops dead at the ankle: there is no foot, no boot, no sabaton, no toe and
   no heel at its lower end, and it does not taper or curve forward. The bottom
   edge is a flat horizontal cut across the ankle, as though the foot had been
   removed.
2. the matching right foot, seen from the side and lying flat as though standing
   on the ground: the heel at the left of the cell, the toe pointing right, and
   the open ankle at the top left. It is a boot from the ankle down and nothing
   above it — no shin, no greave, no calf.

The two pieces would meet edge to edge at the ankle if laid end to end, and
neither one repeats any part of the other.

Every shin fills the full height of its own cell: the knee is at the very top
edge of the cell and the flat ankle cut is at the very bottom edge, with no
empty space above the knee or below the ankle. Every foot likewise fills its
cell top to bottom, with the ankle opening at the very top edge and the sole at
the very bottom edge.

A heavier design is drawn wider or longer, never taller or shorter.

All ten pieces face right, seen from a slight elevation, lit identically from
the upper left, floating on nothing — no ground, no base, no shadow, no leg
above the knee, no body.

Very wide empty magenta gutters between every row and column.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```


### `art/chest-01.png` — 2 columns × 5 rows, five designs

The `chest` slot owns three bones: the torso and both upper arms. One design is
two cells — a torso and one upper arm — and the far arm reuses the near one.

Everything is drawn the way up a person is. The spine bone runs upward through
the figure, but the renderer turns the art over for it, so nothing here has to
be drawn on its head.

```
A flat 2-column by 5-row grid of fantasy armour pieces on a solid pure magenta
background (#FF00FF), dark-gothic pixel art style, chunky readable pixels.

Every row is one matching set of body armour, in this order top to bottom: worn
brown leather; dull grey steel plate; ornate gold plate; blackened plate with
glowing blue crystal inlays; pale bone plate.

The two columns are two pieces of that same set:
1. a torso, upright and seen from the side, facing right. The bare neck stump
   is at the very top of the cell and the waist is at the very bottom. It is a
   chest and a belly and nothing else: no head, no neck armour above the collar,
   no arms, no shoulders, no hips, no legs, no belt below the waist.
2. the matching right upper arm, hanging straight down, seen from the outer
   side. The shoulder and its pauldron are at the very top of the cell and the
   bare elbow is at the very bottom. It is a shoulder and an upper arm and
   nothing else: no forearm, no hand, no torso.

Both pieces are cut off cleanly and squarely at their joints — the torso at the
neck and at the waist, the arm at the shoulder and at the elbow — with a flat
horizontal cut at each, as though the piece had been taken off a body.

Every torso fills the full height of its own cell, from the neck cut at the very
top edge to the waist cut at the very bottom edge, with no empty space above or
below. Every upper arm likewise fills its cell top to bottom.

A heavier design is drawn wider, never taller or shorter.

All ten pieces face right, seen from a slight elevation, lit identically from
the upper left, floating on nothing — no ground, no base, no shadow, no body.

Nothing is held and nothing is worn over the armour: no cloak, no cape, no
tabard hanging past the waist, no scabbard, no strap crossing to a shoulder
that is not there.

Very wide empty magenta gutters between every row and column.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```


### `art/helm-01.png` — 1 column × 5 rows, five designs

The `head` slot owns one bone, so a design is one cell and the sheet is a single
column. Rows are still the five bands, so the row index means the same thing it
does on every other part sheet.

```
A flat single column of five fantasy helmets, stacked one above another on a
solid pure magenta background (#FF00FF), dark-gothic pixel art style, chunky
readable pixels.

Each is a head wearing a different helmet, in this order top to bottom: worn
brown leather; dull grey steel plate; ornate gold plate; blackened plate with
glowing blue crystal inlays; pale bone plate.

Each is a head and a helmet seen from the side, facing right. The top of the
helmet is at the very top of its cell and the flat cut across the base of the
neck is at the very bottom, filling the cell top to bottom with no empty space
above or below. It includes whatever of the face, jaw and neck the helmet does
not cover.

Each one is cut off cleanly and squarely at the base of the neck, with a flat
horizontal cut, as though lifted off a body. There are no shoulders, no collar
below the neck, no chest, no body.

A heavier design is drawn wider, never taller or shorter.

All five face right, seen from a slight elevation, lit identically from the
upper left, floating on nothing — no ground, no base, no shadow, no stand, no
pedestal, no hook and no rack.

Very wide empty magenta gutters between the rows.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```


### `art/legs-01.png` — 2 columns × 5 rows, five designs

The `legs` slot owns three bones: the pelvis and both thighs. One design is two
cells — a pelvis and one thigh — and the far thigh reuses the near one.

**These are the bridging pieces, and that is what makes them different from the
other sheets.** Every other part is cut square at both joints and butts against
its neighbour. A hip and a knee cannot be: they bend furthest and a square cut
at a bending joint opens a wedge of nothing the moment the leg swings. So the
pelvis is drawn to *overlap* the tops of both thighs, and the thigh is drawn
with a knee cap that overhangs the top of the shin. The renderer draws the
pelvis over the thighs and the thigh over the shin, so the overlap always covers
the gap however far the joint turns.

Same reasoning applies to the neck, which is why the helm sheet already carries
the throat and the chest sheet already carries the collar. Nothing extra is
needed there.

```
A flat 2-column by 5-row grid of fantasy armour pieces on a solid pure magenta
background (#FF00FF), dark-gothic pixel art style, chunky readable pixels.

Every row is one matching set of hip and leg armour, in this order top to
bottom: worn brown leather; dull grey steel plate; ornate gold plate; blackened
plate with glowing blue crystal inlays; pale bone plate.

The two columns are two pieces of that same set:
1. a hip piece — a belt and the armoured skirt or tassets hanging from it, seen
   from the side and facing right. The top of the belt is at the very top of the
   cell and the lowest hanging edge of the skirt is at the very bottom. It is a
   belt and what hangs from it and nothing else: no chest, no cuirass above the
   belt, no legs, no feet.
2. the matching right thigh, hanging straight down, seen from the outer side.
   The bare hip joint is at the very top of the cell and the knee is at the very
   bottom, and the knee is armoured — a rounded cap or poleyn that flares out
   wider than the leg above it and finishes the piece. It is a thigh and a knee
   and nothing else: no shin below the knee, no foot, no hip skirt above.

Both pieces fill their cells top to bottom with no empty space above or below.

A heavier design is drawn wider, never taller or shorter.

All ten pieces face right, seen from a slight elevation, lit identically from
the upper left, floating on nothing — no ground, no base, no shadow, no body.

Very wide empty magenta gutters between every row and column.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

**Check before generating more.** Five designs is deliberately a test, not a
first instalment: load the sheet in `tools/rig.html`, swap it onto the hands
bones, and play the walk. What it is looking for is whether the wrist stays put
across all five — a design whose wrist sits 10px higher than its neighbour's
detaches the hand the moment the arm swings, and that is the failure that would
otherwise be discovered on the fiftieth glove rather than the fifth.

---

# The wordmark — `art/logo.png`

Two of these, because they are two different jobs and only one of them is the
game.

**In the game**, the title has to obey the north star: a gilded object in a dark
vault, lit by one low source. That means *carved*, not moulded — no gloss, no
bevel highlights, no backing plate, and no border. The letters float in the same
darkness the road does, which is the whole reason the current typographic title
works. Anything with its own background reads as a sticker laid on the screen
rather than a thing in it.

**On a thumbnail**, the opposite is true and the loud gold badge already in
`art/crypt-heroes-logo.png` is the right tool — it has to win at 320px against
other thumbnails. Keep that one for the channel and the icon; it is not being
replaced, it is being given its actual job.

One more constraint the badge version breaks: the key. `chroma()` scores
`(r + b) / 2 - g`, and a rose or pink-tinted gold scores high enough to be eaten
as background. Warm yellow gold is safe; pink gold is not.

### `art/logo.png` — the in-game title

```
The words CRYPT HEROES as a game logo on a solid pure magenta background
(#FF00FF), dark-gothic fantasy, set on two centred lines: CRYPT above,
HEROES below.

Tall narrow serif capitals with sharp angular wedge serifs, generously wide
letter-spacing, moderate stroke weight. The letters are carved from tarnished
antique gold — warm yellow-gold, aged and darkened in the recesses, worn dull
on the raised edges, as though the piece has sat in a vault for centuries.
Never pink, never rose, never brass-red.

The lettering is flat and engraved. It is lit faintly from the upper left by
one weak source, just enough to catch the top edge of each stroke. No gloss,
no shine, no specular highlights, no reflections, no metallic sheen, no thick
three-dimensional bevel, no extrusion, no drop shadow, no outer glow.

A single small carved skull sits centred between the two words, the same
tarnished gold, the same flat treatment, no larger than one capital letter.

The letters and the skull stand alone on the magenta. There is no plaque, no
shield, no banner, no crest, no frame, no border, no ribbon, no backing panel
and no ornament behind or around them of any kind. Wide empty magenta margins
on all four sides.

Clean hard edges against the background. No text other than the words CRYPT
HEROES. No vignette, no corner darkening, no mist, no particles, no light
rays. Perfectly uniform background.
```

---

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
