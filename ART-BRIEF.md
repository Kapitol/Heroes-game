# Art Brief

How to generate art for Crypt Heroes that drops straight into the engine, and
exactly what each of the ten map areas needs.

**If you just want something to paste, open [PROMPTS.md](PROMPTS.md).** Every
prompt there is already finished — rules block included, flavour lines filled
in, nothing to substitute.

This file is the *why*: what each rule is load-bearing for, what breaks when one
is dropped, and how each sheet is wired once it lands. Read it when a generation
comes back wrong, or when you need a recipe for something PROMPTS.md does not
cover yet — the recipes below carry `FLAVOUR` and `[+ the rules block]`
placeholders precisely because they are templates, not prompts.

---

## First, the thing that decides everything

**Generated art cannot do two things this engine needs: transparency, and true
seamless tiling.** Everything below is built around that.

- **Cutout art** (props, characters, icons, landmarks) arrives on **solid
  magenta `#FF00FF`**. `js/atlas.js` keys the magenta out at load, fades the
  fringe, pulls the pink spill back out of edge pixels, and slices the sheet
  into individual sprites by finding the empty gutters.
- **Ground textures** are drawn as repeating patterns. They must be flat and
  evenly lit with nothing recognisable in them, because anything with a focal
  point becomes a visible grid the moment it repeats.

Two failures from earlier assets, both worth not repeating:

- A single painted **scene** was requested instead of a texture. A scene can
  only repeat along one axis and leaves wedges at the edges. Ask for a texture.
- A sheet came back with **row labels** painted on. A pure-white key left them
  as grey ghosts. Never ask for labels, captions or numbers.

---

## The rules

Paste this block at the end of **every cutout-sheet prompt**, unchanged:

```
No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

Each line is load-bearing:

| Rule | What breaks without it |
|---|---|
| No text | Survives the key as grey ghosts |
| No frames or backing plates | The frame slices as one blob with the object inside it |
| No glow spill | Bleeds into the magenta and survives as a pink fringe |
| No vignette | Corner darkening bands visibly once tiled |
| Wide gutters | The auto-slicer finds cells by looking for empty rows and columns |

And two more:

- **Ask for 3×3 or fewer per sheet.** Higher counts come back with
  inconsistent scale between objects, and objects that sit side by side on a
  card or a verge have to match.
- **Debris counts as an object.** Chips flying off a cracked skull sliced as
  their own cells and shifted every index after them. `atlas.js` can discard
  specks (`minCell`), but it is cheaper to ask for objects that hold together.

---

## Recipes by asset type

### 1. Ground texture — `grass-<area>.png`, `road-<area>.png`

Two per area: the verge, and the path the hero walks. Drawn as repeating
patterns anchored to the world origin, so they scroll with the march.

```
A seamless repeating top-down texture of FLAVOUR. Photographic detail,
evenly lit from directly above, completely flat with no depth. Fills the
entire square edge to edge.

No objects, no plants, no rocks large enough to notice, no focal point of
any kind — anything an eye can land on becomes a visible grid when this
repeats. No text. No vignette, no corner darkening, no lighting gradient,
no shadows. Uniform brightness across the whole image.
```

Verge and path need different flavour lines — see the table below.

### 2. Prop sheet — `props-<area>.png` — **4 columns × 3 rows**

The engine scatters these itself from a tile hash, choosing between variants
and jittering position and scale, so the verge never reads as a grid. Cell
order matters — it maps to slots in `world.js`:

| Cells | Slot | What they are |
|---|---|---|
| 0, 1, 2 | `tree` | three silhouettes of the area's large vegetation or vertical feature |
| 3, 4, 5 | `grave` | three of the area's standing markers |
| 6, 7 | `bones` | two ground clutter pieces |
| 8, 9 | `rock` | two boulders |
| 10 | `fence` | one length of barrier |
| 11 | `bush` | one low scrub |

```
A flat 4x3 grid of twelve fantasy game props on a solid pure magenta
background (#FF00FF), dark-gothic style, FLAVOUR.

Left to right, top to bottom:
1-3. three different LARGE VERTICAL FEATURE
4-6. three different STANDING MARKER
7-8. two pieces of GROUND CLUTTER
9-10. two boulders
11. a length of BARRIER
12. a low scrub bush

Every object is upright, seen from a slight elevation, lit identically
from the upper left, and stands on nothing — no ground, no base, no
shadow beneath it. Wide empty magenta gutters between every row and
column, at least 12% of the image width.

[+ the rules block]
```

**"Stands on nothing" matters.** Each sprite is trimmed to its painted pixels
and anchored at the bottom centre — the point that sits on the ground tile. A
painted base or shadow becomes part of the sprite and the prop floats.

### 3. Decal sheet — `decals-<area>.png` — **4 × 3**

Flat markings scattered over the path. The path is the surface you stare at for
the whole march, so breaking it up matters more than extra verge detail.

```
A flat 4x3 grid of twelve top-down ground markings on a solid pure
magenta background (#FF00FF), for FLAVOUR.

Twelve different marks: cracks, scuffs, moss patches, gravel scatter,
dried stains, puddles, ruts, and worn patches. Each is completely flat,
seen from directly above, as if painted onto the ground itself — no
height, no objects, no shadows, nothing standing up.

Wide empty magenta gutters between every row and column.

[+ the rules block]
```

Keep the dramatic ones (a bright puddle, a bloodstain) to one or two — the
engine weights them rare, because a mark that reads as an event should be one.

### 4. Landmarks — `landmarks-<area>.png` — **2 × 2**

Rare and large. Repetition reads worst when everything is the same size, so a
handful of big pieces does more than a dozen small ones.

```
A flat 2x2 grid of four large fantasy structures on a solid pure magenta
background (#FF00FF), dark-gothic style, FLAVOUR.

Four different landmarks, each tall and imposing, seen from a slight
elevation, lit identically from the upper left, standing on nothing —
no ground, no base, no shadow.

Very wide empty magenta gutters between them.

[+ the rules block]
```

### 5. Creature sheet — `<creature>-<area>.png` — **2 columns × N rows**

**Two poses per row: idle, then attack.** The engine adds the walk bob, the
facing flip, the hit flash and the death fade. Never ask for a full animation
sheet — they come back inconsistent between frames.

```
A flat 2-column grid of a CREATURE on a solid pure magenta background
(#FF00FF), dark-gothic style.

Left column: standing idle, weight settled, arms down.
Right column: mid-attack, weapon or claws swung forward.

Both poses are the same creature at the same scale, facing right, seen
from a slight elevation, lit identically from the upper left, standing on
nothing — no ground, no base, no shadow.

Wide empty magenta gutters between the columns.

[+ the rules block]
```

### 6. Icons — `icons-<n>.png` — **3 × 3**

For cards. These render at ~62px, so silhouette beats detail.

Group each sheet by card kind so the hue is baked in — the card colour language
is warm copper for attack, cold steel-blue for defence, gold for utility. See
the two existing sheets for the pattern.

### 7. The hero, by tier — `Pixel-Warrior.png` — **2 columns × 5 rows**

The one sheet the whole game is hung on. Two columns are idle and attack; the
five rows are the five armour tiers, in the order `ARMOUR_TIERS` declares them
in `sprites.js`, so the row index *is* `armourTierOf(gear.armor)` and the hero
visibly re-forges as the plate is bought.

**Why tiers and not layers.** A per-item paperdoll — a helm layer, a chest
layer, each swapped on one body — is what the loot system wants, and it is the
one thing this pipeline cannot produce. Layers must register to the same body
at the same pixel across every generation, and each generation draws its body a
few pixels different. Whole characters need no registration, which is why they
work. Per-item layering is an artist's job or a system like LPC's, not a
prompt's.

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

[+ the rules block]
```

Sliced with `{ auto: true }`, never a lattice: the rows grow taller down the
sheet as the helmets gain horns — 210px at leather, 238px at bone — and a
uniform grid cuts the tall ones in half.

### 8. Loot icons — `icons-<slot>.png` — **one row of 5**

One sheet per equipment slot, five cells, worst band to best. The cell index is
the item's rarity band, so `items.js` needs no lookup table — see `SLOT_ART`
there. Add a sheet and the slot wires itself.

Keep the five tier descriptions identical to the hero sheet's, so a looted gold
helm and the gold row of the body are the same gold.

```
A flat single row of five ITEM on a solid pure magenta background (#FF00FF),
dark-gothic pixel art style, chunky readable pixels.

The same piece of equipment five times, ascending in quality left to right:
worn brown leather; dull grey steel; ornate gold with horned flourishes;
blackened steel with glowing blue crystal inlays; pale carved bone.

All five at the same scale and the same angle, seen three-quarter from the
front, lit identically from the upper left, floating on nothing — no ground,
no base, no shadow, no hand or body holding them.

Very wide empty magenta gutters between them.

[+ the rules block]
```

| File | ITEM line | Status |
|---|---|---|
| `helmets.png` | `a fantasy helmet` | done |
| `icons-cuirass.png` | `a fantasy chest cuirass` | wanted |
| `icons-gauntlets.png` | `a pair of fantasy gauntlets` | wanted |
| `icons-greaves.png` | `a pair of fantasy leg greaves with boots` | wanted |
| `icons-weapon.png` | `a fantasy straight sword, blade pointing up` | wanted |

Those are the five slots in `items.js` verbatim. Note the game merges legs and
boots into one Greaves slot, and has a Gauntlets and a Weapon slot that the
original concept board never drew.

### 9. Scene backdrop — `camp-<area>.png` — **one painted image, 16:9**

**The one recipe that is not on magenta and has no gutters.** It is a single
backdrop that never tiles and never gets cut, so there is nothing to key and
nothing to slice — it is set as a CSS background and drawn behind everything.
The warning at the top of this file about scenes is about scenes used as
*repeating ground textures*; a one-off backdrop is the case where a scene is
the right answer.

Ask for 1792×1024. The centre must be empty: that is where the engine paints
the fire, the cookpot and the party, and anything painted there is drawn over.

```
A single wide painted scene of FLAVOUR at night, dark-gothic fantasy, muted
and desaturated, seen from a slight elevation looking down — the same
three-quarter view as an isometric game.

The centre of the clearing is BARE, EMPTY trodden earth: no fire, no fire
pit, no logs, no ring of stones, nothing standing in the middle. The whole
scene is lit as if by a single low campfire sitting on that empty ground —
warm orange light raking outward across the dirt from the lower centre,
everything falling to near-black within a short distance of it.

Around the edges of the clearing, in silhouette against that firelight:
PROPS.

The upper third is dark empty night sky above the horizon line. The bottom
fifth of the image fades to solid near-black.

Near-black ground, one warm light source only, no other light. No people, no
characters, no figures, no skeletons, no animals. No text, letters, numbers,
labels, logos or watermarks. No UI, frames or borders. No magenta.
```

For `camp-boneyard.png`, FLAVOUR was *an abandoned camp in a graveyard
clearing* and PROPS were *a sagging canvas tent, a bedroll and a pack, spears
and a shield stuck in the earth, a stack of firewood, a wooden handcart, a low
broken stone wall, bare dead trees, leaning gravestones, and a ruined crypt
archway on the horizon*.

---

## The ten areas

The map runs south-east to north-west, getting worse. Each row is the flavour
line to substitute into the recipes above.

| # | Area | Verge flavour | Path flavour | Prop flavour |
|---|---|---|---|---|
| 1 | **Outside of a Town** | trodden farm grass, pale and dry | packed dirt cart track with wheel ruts | fenceposts, hay, farm tools, a scarecrow |
| 2 | **The Open Road** | coarse wild grass and weeds | old flagstones, cracked and grass-grown | wayside crosses, milestones, dead brush |
| 3 | **The Killing Fields** | churned mud and trampled grass | mud thick with standing water | broken spears, shields, war banners, corpses |
| 4 | **Dangerous Cave** | bare wet rock and gravel | worn stone floor, damp | stalagmites, fallen rock, old timber props |
| 5 | **The Elder Wood** | deep moss and dead leaves | a narrow root-broken forest path | pale dead trees, thorns, hanging moss |
| 6 | **The Broken Gate** | rubble and weeds between stones | a cracked flagstone causeway | shattered columns, fallen masonry, torn banners |
| 7 | **The Sunken Chapel** | waterlogged silt and reeds | a stone causeway barely above water | drowned pews, broken statuary, altar stones |
| 8 | **The Crypt** | dressed stone floor, dust-covered | worn stone slabs between graves | sarcophagi, urns, grave markers, iron sconces |
| 9 | **The Bone Halls** | bone fragments packed into pale earth | a swept path between heaped bones | skull piles, rib arches, bone cairns |
| 10 | **The Inferno** | cracked black rock with lava seams | a scorched basalt path | obsidian shards, burning cracks, iron braziers |

**Palette per area.** All of it stays muted and desaturated — ash grey, bone,
dried blood, old gold, deep green — and gets darker down the list. Only the
Inferno is allowed a bright colour, and only the lava.

**Start with area 1 and 3.** Area 1 is where every new player begins, and area 3
is the first place the road stops being pleasant. Areas 4, 8, 9 and 10 are
indoor or near-black and the existing vector palettes hold up longest there.

---

## Wiring

Art is currently keyed to **biomes**, not levels — five biomes, one every six
sections, and only the first (`boneyard`) is painted. The ten areas above are
**levels**, one per section.

So there is a decision to make the first time area 2's art lands: either art
moves to the level layer (a small change in `render.js` and `world.js`, and
then each area can look like itself), or areas keep sharing five biomes and the
art is generated per biome instead. **Per level is what the map implies** and
what these filenames assume.

### What to do when a file lands

1. Drop the PNG in `art/`.
2. Tell me the filename and what it is.
3. I check how it slices before wiring it — sheets rarely land on an even
   lattice, and a miscount shifts every index after it. This has already caught
   one sheet that produced 11 cells instead of 9.

### Two things that turned out not to matter

- **The magenta does not have to be exact.** `Pixel-Warrior.png` came back at
  `rgb(246,4,250)` with only 19% of its background pixels on that exact value,
  and it keyed perfectly: `atlas.js` scores magenta-ness as `(r+b)/2 - g` rather
  than testing for a colour, so noise and dithering in the background are
  invisible to it. Only a background that drifts *towards green* would fail.
- **Nor does the lattice.** `{ auto: true }` finds the gutters, so rows of
  different heights are fine — which is what generated sheets always are.

### Checklist before you accept a generation

- [ ] Background is magenta throughout, and never shades towards green
- [ ] Nothing touches another object or the image edge
- [ ] No text anywhere, including numbers
- [ ] No frames, plates or circles behind objects
- [ ] Nothing stands on a base or casts a shadow
- [ ] All objects at consistent scale and lit from the same side
- [ ] For textures: no object an eye can land on, and uniform brightness
