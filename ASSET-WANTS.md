# Asset wants

What this game is short of, in the order it would change the screen, and — more
usefully — **what makes an asset work in this pipeline and what makes it
useless**. The second part matters more than the first: three assets already on
disk turned out to be unusable for reasons nobody would guess from a store page.

Everything is baked **offline** into sprite sheets by `tools/outfit.py` and
`tools/bake-doll.mjs`. Nothing ships to the browser but PNGs.

---

## What to check before buying anything

**Polycount does not matter. Buy the high-poly one.** The renderer is offline
and the game only ever sees pixels; `outfit.py` already runs a Catmull-Clark
pass to *add* geometry. A "game-ready 800 tris" version is worth less here than
a dense one.

**Texture resolution barely matters either.** A figure is drawn ~300 pixels
tall, and one 512² atlas over a whole outfit is already more texel than screen —
tested by baking the same character at 512 and 2048 and comparing: no visible
difference. **Do not pay extra for 4K.** Do not pay extra for 8K.

**Format:** `.fbx`, `.gltf`/`.glb`, `.dae`, `.obj` all import. Blender opens it,
this pipeline takes it.

**Textures should either be embedded or named after the material** —
`lambert3_albedo.png`, `lambert3_normal.png`, `_roughness`, `_metallic`. That is
the standard Sketchfab export layout and `wire_pbr` finds it automatically.
Loose textures named `Diffuse_01.png` with no relationship to the material names
have to be wired by hand.

**Scale and units are irrelevant** — garments are normalised by height, props by
length.

### Garments and armour

- **Unrigged is fine. Rigged to a foreign skeleton is also fine** — the rig is
  discarded and `skin()` copies weights off the body by Data Transfer. So a
  Daz/CC/Unreal-rigged robe works as well as a bare mesh.
- **Modular is worth a lot.** Separate body / arms / legs / feet / head meshes
  let one set be mixed with another. Two of the four characters at the fire are
  currently wearing pieces from two different sets.
- **Beware anything that hangs past the wrist or the ankle.** This is the one
  real trap. Data Transfer gives a vertex the weights of the *nearest* surface,
  so a wide sleeve falling over the hand inherits the fingers and is torn into
  claws the moment the hand closes. It cost most of a session on the Quaternius
  wizard set, and there is no fix short of a different mesh. Long *robes* are
  fine — legs are one bone each. It is specifically cuffs over hands.

### Weapons, shields and props

- **Grip at the origin, length along +Z.** `add_weapon` seats the origin in the
  fist and points +Z out of it. A model built that way needs one number (its
  length as a fraction of the hero). Anything else needs a hand-written seat.
- **Straight beats curved.** A scythe was abandoned because its snath curves —
  every seating that clears the hip puts the curve through the thigh.
- Shields are handled separately (`add_shield`) and can be centred on their own
  origin, which is how they normally come.

### Animations

- **Mixamo skeleton only.** The whole clip library is retargeted onto
  `mixamorig:*`; a clip on any other rig cannot drive these characters.
- **Idles must be short. This is the constraint nobody expects.** A sheet is
  `seconds x 12` cells wide at 350px a cell, and a browser will not hold a
  texture wider than 16,384 pixels — so **anything over ~3.5 seconds does not
  fit**. Of the six idle clips downloaded most recently, four were 7.5 to 9.3
  seconds and had to be cut to a 2.5-second window. Prefer 2–3 second loops.
- **Buy *standing* idles.** Every combat-stance idle in the library reads as a
  fight about to start, which is wrong for a campfire. Braced poses are useful
  as the *occasional* variation, not as the main idle.

---

## The list, most valuable first

### 1. A staff — and ideally a caster's prop set

The Warlock is carrying the Druid's spear because there is no staff in either
pack, and two men at one fire holding identical spears is the most obviously
wrong thing on that screen. Wanted: a wizard's staff, a gnarled branch staff, a
crystal-topped one. Straight, grip near the origin.

*Also useful in the same set:* orb, tome, censer, lantern-on-a-pole.

### 2. Camp props — tent, cart, crates, barrels, bedroll, firewood

`camp_kit()` in `tools/bake-camp.py` builds the tent, the crates, the firewood
and the spears **out of cylinders and boxes**, because the nature pack has none.
They are stand-ins and they read as stand-ins. One props pack replaces that one
function and nothing else in the file changes.

Wanted: canvas tent or lean-to, handcart, crates, barrels, sacks, bedroll,
cooking pot and tripod, stacked firewood, banner on a pole.

### 3. Graveyard and ruin props

Nine of the ten areas have no camp set of their own. The machinery is done — a
new camp is a prop list and a seed — so a graveyard pack is worth roughly nine
screens. Wanted: headstones, sarcophagi, iron railings, a lychgate or mausoleum,
broken columns, a well, a gibbet.

### 4. A second and third character outfit set

The Paladin is the knight's armour with a noble's gorget, and the Warlock is
peasant arms under a downloaded robe. They read as placeholders because they
are. Wanted: **modular** fantasy sets — a mage/cultist set, a ranger/hunter set,
a heavy templar set — each with separate body/arms/legs/feet/head.

### 5. Hair, with colour variants

Every doll is silver-haired. The base pack's hair map is a greyscale meant to be
tinted, and two ways of tinting it both failed silently at the export. A hair
pack that ships *coloured* maps — or simply a brown and a black variant of the
same texture — solves it without touching code.

### 6. Short Mixamo-compatible idles

See the constraint above. Two-to-three second standing idles: arms folded,
leaning on a staff, warming hands, sharpening a blade, shifting weight. These
are the "occasionally does something other than standing" beats, and short ones
are worth far more than long ones here.

---

## Not wanted

- 4K/8K texture packs (see above — invisible at this size)
- Low-poly "game-ready" optimisation (the renderer is offline)
- Anything rigged to a non-Mixamo skeleton **if it is an animation**; a *model*
  on any rig is fine
- Nanite/Lumen/UE-only assets, or anything shipped as a `.uasset`
