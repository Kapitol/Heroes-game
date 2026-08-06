---
name: Crypt Heroes
description: A gothic idle road crawler where every surface is a gilded object in a dark vault
colors:
  crypt-ink: "#0a0806"
  stone: "#1a1512"
  stone-deep: "#0f0c0a"
  plate-lit: "#221b16"
  plate-shade: "#100c09"
  plate-edge: "#3d3025"
  tarnished-gild: "#c8a24a"
  gild-dim: "#8a6d2c"
  old-parchment: "#d8c9a8"
  old-blood: "#8e1a12"
  fresh-blood: "#d6352a"
  mana: "#2b4d8e"
  rage: "#b8801e"
  band-gray: "#9a9184"
  band-green: "#5fa860"
  band-blue: "#4f86c6"
  band-purple: "#9a5fc0"
  band-gold: "#d8b45c"
  kind-attack: "#e07a52"
  kind-defense: "#7fa8e0"
  kind-utility: "#d8c264"
  kind-healing: "#7fd6a0"
typography:
  display:
    fontFamily: "Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif"
    fontSize: "min(13vw, 58px)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.14em"
  headline:
    fontFamily: "Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif"
    fontSize: "min(9vw, 42px)"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "0.16em"
  title:
    fontFamily: "Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif"
    fontSize: "20px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0.1em"
  body:
    fontFamily: "Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0.16em"
rounded:
  hairline: "1px"
  plate: "3px"
  panel: "4px"
  globe: "50%"
spacing:
  xs: "4px"
  sm: "6px"
  md: "10px"
  lg: "14px"
  xl: "18px"
components:
  plate:
    backgroundColor: "{colors.plate-lit}"
    textColor: "{colors.old-parchment}"
    rounded: "{rounded.plate}"
    padding: "6px 11px"
  card:
    backgroundColor: "{colors.plate-lit}"
    textColor: "{colors.old-parchment}"
    rounded: "{rounded.panel}"
    padding: "18px 14px"
    width: "236px"
  cost-pill:
    backgroundColor: "{colors.band-gold}"
    textColor: "{colors.crypt-ink}"
    rounded: "{rounded.plate}"
    padding: "5px 12px"
  cost-pill-free:
    textColor: "{colors.band-gray}"
    rounded: "{rounded.plate}"
    padding: "5px 12px"
  rune:
    backgroundColor: "{colors.stone}"
    textColor: "{colors.tarnished-gild}"
    rounded: "{rounded.panel}"
    size: "clamp(48px, 12vw, 62px)"
  slot-empty:
    backgroundColor: "{colors.stone}"
    textColor: "{colors.old-parchment}"
    rounded: "{rounded.plate}"
    padding: "6px 8px"
---

# Design System: Crypt Heroes

## Overview

**Creative North Star: "The Lit Reliquary"**

Every surface in this game is a gilded object resting in a dark vault, lit by a
single low source. Nothing is a panel; everything is a thing — a plate, a globe,
a rune, a card, a coffin. The ground beneath them is always near-black
(`#0a0806`), and it never lightens, because the room is not the subject. The
objects are.

Gold is the whole discipline. `#c8a24a` is not decoration and not a brand
colour to be sprinkled — it marks what the player can act on or must decide
about: a cost, the level they are in, the pin they are standing on, the tier
they are about to buy. On a dark ground a warm accent reads as *lit*, so
spending it everywhere would put the whole screen at the same distance from the
player and flatten the one thing this interface is for, which is making a small
number of decisions legible.

The type is a single serif — Iowan Old Style — set generously tracked and often
uppercase for anything that labels rather than speaks. There is no second family
and no sans anywhere. A dark gothic interface with a UI sans in it reads as a
web app wearing a costume; one old serif doing every job is what makes the
whole thing feel cast from one mould.

**Key Characteristics:**

- Near-black ground, always; surfaces are objects raised off it
- One low light source: gold hairline on top edges, black shadow beneath
- A single serif at every size, tracked wide and uppercased for labels
- Gold is rare and always means "you can act on this"
- Five rarity bands are the one ladder for value across cards, loot and tiers
- Sharp corners (3–4px); nothing is soft or pill-shaped except globes

## Colors

A near-black vault lit by tarnished gold, with parchment for everything that
must be read and blood for everything that costs you.

### Primary

- **Tarnished Gild** (`#c8a24a`): Gold that has been underground a while — warm
  but well short of bright. Reserved for what the player acts on: card costs,
  the current level name, the boon panel heading, the map pin they occupy, the
  Gold tier, and the ready state of a skill rune. Never a background, never a
  large fill.
- **Gild Dim** (`#8a6d2c`): The same gold at rest. Borders of an interactive
  object that is available but not being pointed at — a hovered card edge, a
  ready rune's border, the reroll button's frame.

### Secondary

- **Old Blood** (`#8e1a12`) / **Fresh Blood** (`#d6352a`): A pair that names a
  relationship rather than two colours. The deep tone is what has dried and
  fills the life globe; the lit tone is what is happening right now — the top of
  the globe's gradient, damage numbers, a boss telegraph filling. Blood is
  never used decoratively; it means life or the loss of it.

### Tertiary

- **Mana** (`#2b4d8e`) and **Rage** (`#b8801e`): The two secondary resource
  hues, used only in the globes and the XP strip. They exist to keep the life
  globe unambiguous — if red were the only fluid colour, every filled circle
  would read as health.

### Neutral

- **Crypt Ink** (`#0a0806`): The ground. Body background, canvas clear colour,
  and the backdrop the coffin shaft is painted onto. It is the darkest thing on
  screen and nothing sits behind it.
- **Stone** (`#1a1512`) / **Stone Deep** (`#0f0c0a`): The raised material,
  almost always as a vertical gradient rather than a flat fill.
- **Plate Lit** (`#221b16`) → **Plate Shade** (`#100c09`): The exact gradient
  every raised surface uses, top to bottom. One recipe, reused everywhere.
- **Plate Edge** (`#3d3025`): The 1px border on every object. Warm, not grey —
  a cool border on these grounds reads as a browser default.
- **Old Parchment** (`#d8c9a8`): Every readable word. Warm off-white with age
  in it, never pure white.

### The five bands

The rarity ladder. The same five colours mean the same five things everywhere
they appear — tier pips, card cost pills, loot slot borders, bag rows:

- **Gray** (`#9a9184`) — free, the first rung
- **Green** (`#5fa860`) — cheap
- **Blue** (`#4f86c6`) — considered
- **Purple** (`#9a5fc0`) — expensive
- **Gold** (`#d8b45c`) — the top of any ladder

### Card kinds

Classification colour, carried on the card icon, its border and the smoke that
rises off it: **attack** `#e07a52` warm copper, **defense** `#7fa8e0` cold
steel-blue, **utility** `#d8c264` gold, **healing** `#7fd6a0` pale green,
**ability** `#e8d18a` brightest gild.

### Named Rules

**The Earned Gold Rule.** Tarnished Gild marks only what the player can act on
or must decide about. If gold appears on something inert, it is wrong. Audit
test: cover every gold element on a screen — what remains should be
unactionable.

**The Never-White Rule.** No pure white and no pure black anywhere. Text is Old
Parchment (`#d8c9a8`); the darkest ground is Crypt Ink (`#0a0806`). Pure values
belong to browser defaults, and this interface should never look defaulted.

**The One Ladder Rule.** Value is expressed only through the five bands. A new
system that needs to say "how good is this" uses Gray→Gold, never a new scale.

## Typography

**Display Font:** Iowan Old Style (with Palatino Linotype, Palatino, Georgia,
serif)
**Body Font:** the same
**Label Font:** the same

**Character:** One old serif doing every job, from a 58px title to a 9.5px
label. Warm, bookish and slightly archaic — the voice of a rubbing taken off a
tomb rather than a game HUD. Tracking does the work that a second family
usually would: the wider the tracking and the smaller the size, the more the
text is labelling rather than speaking.

### Hierarchy

- **Display** (400, `min(13vw, 58px)`, 1.0, `.14em`): The title screen only.
- **Headline** (400, `min(9vw, 42px)`, 1.1, `.16em`): The banner that announces
  a level or a boss. Appears, holds, fades.
- **Title** (400, 19–22px, 1.2, `.1–.16em`, uppercase): Panel and overlay
  headings — Armoury, Choose Your Boon, The Road So Far.
- **Body** (400, 12–15px, 1.5): Card descriptions, help text, stat rows,
  in-canvas payout figures.
- **Label** (400, 9.5–11px, `.12–.2em`, uppercase): Everything that names
  rather than says — section heads, card classification, difficulty meta, the
  level number, run stats.

### Named Rules

**The Tracking Ladder Rule.** As type gets smaller it gets more tracked and
more likely uppercase. 9.5px labels sit at `.2em`; 13px body sits at normal.
This is the only hierarchy device besides size — weight is never used, because
the family has one weight worth setting.

**The One Family Rule.** No second typeface, and never a sans. If a new surface
seems to need one, it needs different tracking instead.

## Layout

Two fixed rails and a floating middle. The **top bar** carries identity and
resources: the circular minimap and level plate at the left, wave progress
centred, purse and controls at the right. The **bottom belt** carries the hands:
a life globe at the left, the rune belt and XP strip in the middle, the armoury
globe at the right — both globes in the bottom corners, where thumbs are. The
canvas fills everything between and behind.

Panels centre over the world at `min(460px, 92vw)`, except the Armoury
(`min(680px, 94vw)`, which holds a three-column character sheet) and the map
(`min(1180px, 97vw)`). Overlays fill the viewport and centre their content.

Spacing runs on a coarse 4/6/10/14/18px rhythm — this is a dense HUD and
generous whitespace would push the game area off screen. Density is deliberate
at the edges and relaxed inside panels, where 10–18px gaps separate sections.

Responsive behaviour is by clamp rather than breakpoint: globes are
`clamp(74px, 17vw, 104px)`, runes `clamp(48px, 12vw, 62px)`, titles use `vw`
minimums. Safe-area insets are respected top and bottom. One real breakpoint
exists, at 620px, where the map's three road cards stack.

**The Thumbs Rule.** Anything the player touches during play lives in a bottom
corner or the rune belt. The top bar is for reading, not for acting — the only
exceptions are pause and menu, which are deliberate interruptions.

## Elevation & Depth

Depth is **lighting, not layering**. There is one low light source, and every
raised object states its relationship to it the same way: a 1px inset highlight
in gold along the top edge, and a black shadow beneath whose depth scales with
how much the object matters.

This is the system's most consistent signature — plates, runes, globes, cards,
bag rows and map cards all carry it — and it is why surfaces read as objects
rather than as stacked rectangles. Tonal layering alone would flatten them,
because the grounds are already so close in value.

### Shadow Vocabulary

- **Plate** (`inset 0 1px 0 rgba(200,162,74,.18), 0 4px 14px rgba(0,0,0,.6)`):
  The default for anything raised — HUD plates, panels, the purse.
- **Rune** (`inset 0 1px 0 rgba(200,162,74,.2), 0 3px 8px rgba(0,0,0,.6)`):
  Smaller objects that sit closer to the ground.
- **Card at rest** (`inset 0 1px 0 rgba(200,162,74,.28), 0 8px 24px
  rgba(0,0,0,.75)`): A card is more important than a plate and floats higher.
- **Card hovered** (`inset 0 1px 0 rgba(200,162,74,.45), 0 12px 30px
  rgba(0,0,0,.8)`): Lifts 4px and the light on its edge strengthens.
- **Globe** (`inset 0 0 22px rgba(0,0,0,.9), 0 0 16px rgba(0,0,0,.7)`): Inset
  all round rather than at the top — a sphere, not a plate.
- **Ready pulse** (`0 0 22px rgba(200,162,74,.75)`): Gold glow, animated, used
  only to say something is available now.

### Named Rules

**The Top-Edge Rule.** Every raised surface catches the light on its top edge
and nowhere else. A shadow without its highlight, or a highlight on the wrong
edge, breaks the single light source and reads as a mistake even to someone who
cannot say why.

**The Glow-Means-Ready Rule.** A gold glow is never ambience. It means an
action is available: a rune off cooldown, loot waiting in the bag, the pin you
are standing on.

## Shapes

Sharp and cut, not soft. Corners are **3px** on plates and small objects and
**4px** on panels and cards — enough to avoid a hard CAD edge, far short of
anything friendly. Tier pips are nearly square at 1px. The only circles are the
two globes and the minimap, and they are circles because they are spheres and
lenses, not because roundness is the house style.

Every object carries a visible 1px border in Plate Edge (`#3d3025`). Borders
are structural here, not decorative: they are what separates one object from
another when both are near-black. Interactive objects shift their border to
Gild Dim on hover; empty slots use a dashed border to say "nothing here yet"
without inventing an empty-state illustration.

Fills are gradients, not flats — `linear-gradient(180deg, …)` top-lit to
bottom-dark on essentially every surface. A flat fill reads as a hole in this
system.

**The Cut-Not-Moulded Rule.** Radius never exceeds 4px on a rectangle. If
something needs to feel softer, it is the wrong component.

## Components

### Buttons

- **Shape:** 3px corners, 1px Plate Edge border, top-lit gradient
  (`#221b16`→`#100c09`).
- **Plate button** (pause, menu, close): Old Parchment text, 6px 11px padding,
  presses 1px down on `:active`.
- **Hover / Focus:** Border shifts to Gild Dim. Nothing scales; objects do not
  grow.
- **Reroll / walk-on:** Full-width block buttons under the card row, 9px 20px,
  13px text at `.08em`. The one that costs skulls carries its price in gold on
  its face and greys out rather than disappearing when unaffordable.

### Cards

The signature component. A boon card is 200–236px wide, 200px minimum tall, a
column of: classification label, icon, name with tier number, description, cost
pill, tier ladder.

- **Corners:** 4px. **Border:** 1px, coloured by classification.
- **Background:** `linear-gradient(180deg, #332a20, #181209)` — a shade warmer
  than a plate, because a card is closer to the player.
- **Elevation:** Card at rest; lifts 4px on hover with a stronger edge light.
- **Padding:** 18px 14px, 6px gaps.
- **Colour must never be the only carrier.** The classification is stated in
  words at the top of every card as well as in its border and icon colour.

### The tier ladder

Five rectangles in an equal-column grid under the cost, one per tier, painted in
their band colour. Tiers already bought are lit in that colour with a soft glow;
the tier this card would buy is outlined in the colour it will become but not
yet filled; the rest are dark. Progress and price become one piece of
information instead of two.

### Cost pill

5px 12px, 3px corners, filled with the band gradient of the tier being bought
and text in Crypt Ink. A free card breaks the pattern deliberately: no fill,
Gray border, the word "FREE" in `.16em` uppercase — an absence of price should
not look like a price of zero.

### Globes

`clamp(74px, 17vw, 104px)` circles with a 2px border, an inset radial for the
sphere, a fluid layer that animates by height, and a specular highlight at 33%
24%. The life globe fills with Old Blood and lights to Fresh Blood; the armoury
globe carries the ⚒ and pulses gold when unopened loot is waiting.

### Runes

`clamp(48px, 12vw, 62px)` squares, 4px corners, the skill glyph in Tarnished
Gild with a soft text glow. A cooldown is a dark curtain rising from the bottom
(`height` 0→100%), never a spinner or a number. Ready runes take a Gild Dim
border; cooling runes drop to `#6b5c3e` and lose their glow. Empty slots are
dashed with a `·`.

### Equipment slots

A row per slot: icon, name, 3px corners, bordered in the band colour of what
occupies it. Empty slots are dashed and half-opacity. The bag lists items as
rows with a 3px band-coloured left edge, the attributes in one line beneath the
name, and a button reading "Equip" or "Swap" depending on whether the item beats
what is worn.

### The map

The world map fills the panel, capped by `min(78vh, calc(100vh - 250px))` so
the road cards below it always fit. Levels are pins placed by fraction of the
image: walked ones show a green tick and their name at 62% opacity, the current
one a pulsing gold dot with its name lit, unreached ones a dark dot with a faint
label. The three road cards straddle the map's bottom edge — overlapping it by
~20px and hanging ~77px below — attached to the map without covering a place
the player might be choosing.

## Do's and Don'ts

### Do:

- **Do** put a gold top-edge highlight and a black drop shadow on every raised
  surface (`inset 0 1px 0 rgba(200,162,74,.18)` plus a shadow scaled to
  importance). One light source, always from above.
- **Do** spend Tarnished Gild (`#c8a24a`) only on what the player can act on or
  must decide about.
- **Do** express any notion of value through the five bands, Gray → Gold.
- **Do** use tracking and case for hierarchy: smaller means more tracked and
  more likely uppercase.
- **Do** state a rule in words as well as in colour — the classification is
  written on every card, the drop shows a number beside its green lip.
- **Do** give every control a touch path and a keyboard path.
- **Do** wrap new motion in `prefers-reduced-motion: reduce`, as the card smoke,
  loot pulse and map pin already are.
- **Do** set explicit `color` on `<button>` elements. `font: inherit` carries
  family and size but never colour, and a button's default is black — which was
  invisible on these grounds until it was caught.

### Don't:

- **Don't** use pure white or pure black. Text is `#d8c9a8`; the ground is
  `#0a0806`.
- **Don't** introduce a second typeface, and never a sans-serif.
- **Don't** exceed a 4px radius on a rectangle, or use pill shapes.
- **Don't** use a flat fill on a raised surface — top-lit gradients only.
- **Don't** use a cool grey border. Edges are warm (`#3d3025`).
- **Don't** let a gold glow mean anything except "available now".
- **Don't** hide a control that is unavailable — grey it out. A control that
  vanishes reads as a bug.
- **Don't** rely on colour alone to carry a rule.
- **Don't** put resting shadows on things that are not raised; depth is a
  claim about the light, not a decoration.
