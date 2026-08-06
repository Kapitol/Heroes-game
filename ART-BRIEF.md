# Art Brief

How to generate art for Crypt Heroes that drops straight into the engine, and
exactly what each of the ten map areas needs.

Work through it in this order: read **The rules** once, pick an area from **The
ten areas**, then use the recipe for the asset type you are making. Every prompt
is paste-ready apart from one flavour line you swap per area.

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

### Checklist before you accept a generation

- [ ] Background is one flat magenta, not a gradient
- [ ] Nothing touches another object or the image edge
- [ ] No text anywhere, including numbers
- [ ] No frames, plates or circles behind objects
- [ ] Nothing stands on a base or casts a shadow
- [ ] All objects at consistent scale and lit from the same side
- [ ] For textures: no object an eye can land on, and uniform brightness
