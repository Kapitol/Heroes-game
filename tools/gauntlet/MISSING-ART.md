# Missing art — what the rig still cannot paint

Written at the end of the gauntlet, against `tools/gauntlet/contact-final.png`
(five tiers down, four strides across, the bar's painted row directly above the
rig's four frames at matched figure height). Everything below was read off that
sheet and off the zooms beside it, not inferred from code.

**The state of play has moved since the bare-areas list the round was opened
with.** Every one of the fifteen bones is now dressed by a sheet, and
`tools/gauntlet/jholes.mjs` finds no enclosed transparent hole anywhere on the
figure at any tier except the one between the legs at a contact pose, which is
the topology of a stride and not a joint that failed to close. So the holes
below are **not bones without art**. They are:

- garment layers the rig has no bone for at all, and
- per-tier design mismatches on sheets that already exist.

That distinction matters for whoever picks this up: three of the five items
below are a **re-roll of an existing sheet**, not a new one, and re-rolling is
cheap. Only `cloth-01` is genuinely new, and it is the one that costs engine
work as well as a generation.

### Closed since the list was written — do not re-generate these

| Area | Bone | Sheet that closed it |
|---|---|---|
| Thigh | `thighBack` / `thighFront` | `art/thigh-02.png`, 1 × 5, bound as a second sheet on the `legs` band |
| Neck / throat / gorget | joint of `spine` → `head` | `helm-01.png` carries the throat, `chest-01.png` col 0 carries the collar; they cross at every tier |
| Waist / lower back | `spine` → `pelvis` | `legs-01.png` col 0 belt overlaps the cuirass |
| Shoulder / armpit | `upperArm*` | `chest-01.png` col 1 pauldron; the gambeson under it reads as cloth, not as bare flesh |
| Elbow / upper forearm | `forearm*` | `gloves-01.png` col 0 |
| Wrist | `hand*` | `gloves-01.png` col 1 |
| Knee / poleyn | `thigh*` → `shin*` | `thigh-02.png` knee cap overhangs the greave |
| Ankle | `shin*` → `foot*` | `boots-01.png`, greave and boot cuff cross |
| Far arm | `forearmBack` / `handBack` | present and readable at every tier; it was a draw-order worry, not a hole |

---

## 1. CLOTH — the surcoat, tabard and hip tatters

**Bone:** none. There is no bone and no slot. The cloth is a shape drawn in
code — `SURCOAT` / `SURCOAT_BACK` in `js/rig.js` (~line 1373), a two-pass panel
hung off the hip joints at `z: 5.5`.

**Why it is visible.** It is the single loudest tell left on the contact sheet
and it is loud at *every* tier. Zoom `zz-leg-t1.png` and `zz-leg-t5.png` side by
side: the panel is the **same flat, unlit, near-black trapezoid with the same
ragged hem in both**, on a tier-1 hero in brown leather and on a tier-5 hero in
carved bone. It carries no material, no weave, no highlight, no rim, and no
response to the tier lighting — at tier 3, where every other surface on the
figure is throwing gold, it is still grey card. The bar changes garment with the
band: tier 1 is a short tattered leather apron, tier 3 a dark tabard with gold
filigree running down its centre, tier 4 a maroon hanging panel, tier 5 a skirt
of coloured rags. The rig has one shape at one value for all five.

It is also now deliberately *narrow*. The `fit` round cut `wide` 0.186 → 0.124
to kill a black wing of cloth that hung clear of the whole body, and that was
the right call — but it moved the rig further from the bar's cloth mass at tiers
3, 4 and 5, and the round record says so explicitly. **A wider rectangle is how
the wing got there. The answer is a sheet.**

**What to ask for.** One column, five rows, on the `legs` band (a hero cannot
wear a steel faulds over a gold tabard, so it follows the same index every other
leg sheet does). The joint is the **belt line at the top edge of the cell** — the
rig hangs the panel from the hip joints, so anything above the belt in the cell
becomes cloth floating over the cuirass. This needs a bone or a `cloth` slot
wired in `render.js`'s `RIG_ART`; art alone will not land it.

```
A flat single column of five fantasy cloth garments, stacked one above another
on a solid pure magenta background (#FF00FF), dark-gothic pixel art style,
chunky readable pixels.

Each is one hanging cloth panel worn over armour, in this order top to bottom:
worn brown leather; dull grey steel plate; ornate gold plate; blackened plate
with glowing blue crystal inlays; pale bone plate — each panel dyed and trimmed
to match that armour set.

Each is a single panel of heavy cloth seen from the side, facing right, hanging
straight down as though belted at a waist. The belt strap it hangs from is at
the very top edge of the cell and the lowest torn point of the hem is at the
very bottom edge, filling the cell top to bottom with no empty space above or
below. It is a belt and the cloth hanging from it and nothing else: no chest,
no cuirass above the belt, no hips, no legs, no feet, no body of any kind.

Each panel is cut off cleanly and squarely at the top with a flat horizontal
cut, as though lifted off a body.

Each panel is dark — clearly darker in value than the armour it is trimmed to
match — so it reads as a shadowed cloth hanging behind a bright limb. Each has
a woven cloth surface with visible folds falling vertically, a decorated
centre band running down its length, and a torn ragged lower hem.

A heavier design is drawn wider, never taller or shorter.

All five face right, seen from a slight elevation, lit identically from the
upper left, floating on nothing — no ground, no base, no shadow, no stand,
no hook and no rack.

Very wide empty magenta gutters between the rows.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

---

## 2. HEAD — no hair at any tier, and the wrong horns at tiers 3, 4 and 5

**Bone:** `head`. **Slot:** `head`. **Sheet:** `art/helm-01.png`, 1 × 5.

**Why it is visible.** Two separate failures in one cell, both readable at a
glance on `contact-final.png`:

- **Hair.** The bar warrior has a mane of black hair on all twenty cells — it
  breaks his head silhouette, falls behind his neck, and moves. The rig has
  none at any tier. `zz-neck-t1.png` shows the consequence: a smooth closed
  dome with a jaw under it and nothing behind it. This is the first thing that
  separates the two rows at tiers 1, 2 and 4.
- **Horns.** The bar's tier-3 helm carries two tall horns standing up and out;
  the rig's curve backward and are half the length. The bar's tier-4 helm has a
  pair of horns; **the rig's tier 4 has none at all** (`zz-neck-t4.png`). The
  bar's tier 5 is a flat-browed human skull with long pale upswept horns; the
  rig's is a snouted wolf-or-dragon skull with small swept-back horns
  (`zz-neck-t5.png`). The tier ladder the whole game hangs on is supposed to
  read at silhouette, and at silhouette the rig's top three tiers are wrong.

Both fixes are the same cell, so this is one re-roll: `art/helm-02.png`.

The `proportion` round also left a note that belongs here: the head bone is now
20% longer than it was, and the rig's silhouette dips to 0.164 of a figure at
0.854 up where the bar holds 0.20 — a notch under the jaw. A helm cell drawn
with **hair falling past the jaw** closes that notch for free, which is a second
reason the hair is worth the generation.

```
A flat single column of five fantasy helmets, stacked one above another on a
solid pure magenta background (#FF00FF), dark-gothic pixel art style, chunky
readable pixels.

Each is a head wearing a different helmet, in this order top to bottom: worn
brown leather; dull grey steel plate; ornate gold plate; blackened plate with
glowing blue crystal inlays; pale bone plate.

Each is a head and a helmet seen from the side, facing right. The top of the
helmet or of its horns is at the very top of its cell and the flat cut across
the base of the neck is at the very bottom, filling the cell top to bottom with
no empty space above or below. It includes whatever of the face, jaw and neck
the helmet does not cover.

Each one has long dark hair falling out from under the back of the helmet, down
past the jaw and over the back of the neck, in heavy separated locks. The hair
reaches the flat cut at the base of the neck and stops there.

The third has two large horns rising straight up and outward from the temples,
tall and clearly taller than the crown of the helmet. The fourth has the same
two horns rising up and outward from the temples, tall and clearly taller than
the crown. The fifth is a bare fleshless skull with a flat brow and empty
sockets, wearing two long pale horns that sweep up and outward and are longer
than the skull itself is tall.

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

---

## 3. FOOT — the sabaton is a poulaine, and it is costing the walk

**Bone:** `footBack` / `footFront`. **Slot:** `feet`. **Sheet:** `art/boots-01.png`,
col 1.

**Why it is visible.** Look at any rig cell at tier 3 or tier 5 in
`contact-final.png`: the boot runs a hand's length past the ankle and curls to a
point. The bar's boot is compact and square-toed at every tier.

This is not only a look. It is a **measured constraint on the motion**, and the
`motion` round wrote it down as an art problem rather than a bone problem: the
new `groundHold` ankle roll has to be capped at `HOLD_MAX = 0.115` (41°) because
past that the long pointed sabaton stands the hero on his toe-point like a
ballet shoe. On the bar's compact boot the same plantarflexion reads as a ball
loaded for push-off. Double support is currently 4.8% of the cycle against the
20–25% a walking human has, and the sabaton length is one of the two things
holding it there.

A re-roll of `boots-01.png` with a shorter, blunter foot buys back plantar-
flexion range for free. The shin column is fine and should not be changed — say
so in the prompt, because a shin drawn as armour comes back as a boot.

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

Every foot is short and blunt. It is a compact square-toed boot: from heel to
toe it is no longer than the cell is tall, the toe is cut off flat and square,
and it does not come to a point, taper to a spike, curl upward or extend
forward past the toes of the foot inside it.

Every shin fills the full height of its own cell: the knee is at the very top
edge of the cell and the flat ankle cut is at the very bottom edge, with no
empty space above the knee or below the ankle. Every foot likewise fills its
cell top to bottom, with the ankle opening at the very top edge and the sole at
the very bottom edge.

The two pieces would meet edge to edge at the ankle if laid end to end, and
neither one repeats any part of the other.

A heavier design is drawn wider, never taller or shorter and never longer.

All ten pieces face right, seen from a slight elevation, lit identically from
the upper left, floating on nothing — no ground, no base, no shadow, no leg
above the knee, no body.

Very wide empty magenta gutters between every row and column.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

---

## 4. TORSO AND ARM — a cold blue rim light painted into the silhouette edge

**Bone:** `spine`, `upperArmBack`, `upperArmFront`. **Slot:** `chest`.
**Sheet:** `art/chest-01.png`.

**Why it is visible.** A thin hard blue line runs down the near silhouette edge
of the breastplate and the pauldron at every tier — see `zz-arm-t2.png` and
`zz-arm-t1.png`, where it is unmistakable against brown leather and grey steel.
Three rounds have logged it as "chroma-key fringe" and set it aside as not
theirs. **It is not keying residue.** Sampling the source sheet directly, the
first opaque pixel inside the silhouette reads around `rgb(20, 50, 95)` on 6 of
39 sampled rows — a saturated dark blue, painted in. `art/gloves-01.png`
sampled the same way has zero such rows, which is why the arm below the elbow
does not show it.

The generator lit the sheet with a cold blue rim from behind. Nothing in the
engine can remove that: `atlas.js` keys and despills *magenta*, and this pixel is
not magenta-adjacent. It has to come out of the art.

The rest of the sheet is good and should not be redesigned — this is the same
prompt with one paragraph added.

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

Every piece is lit by one single warm light from the upper left and by nothing
else. There is no second light, no back light, no rim light, no edge light and
no cold blue or cyan highlight anywhere along any outline. The outermost pixels
of every piece are the same warm colour as the material just inside them.

Both pieces are cut off cleanly and squarely at their joints — the torso at the
neck and at the waist, the arm at the shoulder and at the elbow — with a flat
horizontal cut at each, as though the piece had been taken off a body.

Every torso fills the full height of its own cell, from the neck cut at the very
top edge to the waist cut at the very bottom edge, with no empty space above or
below. Every upper arm likewise fills its cell top to bottom.

A heavier design is drawn wider, never taller or shorter.

All ten pieces face right, seen from a slight elevation, floating on nothing —
no ground, no base, no shadow, no body.

Nothing is held and nothing is worn over the armour: no cloak, no cape, no
tabard hanging past the waist, no scabbard, no strap crossing to a shoulder
that is not there.

Very wide empty magenta gutters between every row and column.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

---

## 5. WEAPON — no bone, no slot, no sheet

**Bone:** none. It would hang off `handFront`, whose art is `gloves-01.png`
col 1, drawn as a closed fist "gripping empty air as though a sword had been
taken out of it".

**Why it is not visible yet, and why it still matters.** The bar's
`art/warrior-walk.png` carries no weapon either — both rows walk with empty
fists, so **this costs the walk nothing** and no round scored against it. It is
listed because `art/warrior-combat.png` is the other half of the bar, the rig is
meant to replace both, and a combat pose with an empty fist is not a combat
pose. `art/icons-weapon.png` exists but is a card icon, drawn at a different
angle and scale, and is not usable on a bone.

This needs a bone before it needs art. The prompt is here so it is ready.

```
A flat single row of five fantasy straight swords on a solid pure magenta
background (#FF00FF), dark-gothic pixel art style, chunky readable pixels.

The same sword five times, ascending in quality left to right: worn brown
leather grip with plain iron blade; dull grey steel; ornate gold with horned
flourishes; blackened steel with glowing blue crystal inlays; pale carved bone.

Each is one sword seen from the side, held vertically with the pommel at the
very top of its cell and the point of the blade at the very bottom, filling the
cell top to bottom with no empty space above or below. The grip is in the upper
part of the cell and the crossguard sits across it, and the blade runs from the
crossguard down to the point.

Each one is a sword and nothing else: no hand, no fist, no fingers, no gauntlet,
no arm, no scabbard, no belt and no body.

A heavier design is drawn wider, never taller or shorter.

All five seen from a slight elevation, lit identically from the upper left,
floating on nothing — no ground, no base, no shadow, no stand, no rack.

Very wide empty magenta gutters between them.

No text, letters, numbers or labels. No frames, borders, circles, badges,
plaques or backing plates behind the objects. No drop shadows, glows, mist
or particles spilling onto the magenta. No vignette or corner darkening.
Flat even lighting on a perfectly uniform background.
```

---

## Order to do these in

1. **`cloth-01.png`** — biggest visible gain, and the only one that also needs
   engine work. Everything else on the figure is now material; the cloth is the
   one grey card left in the frame.
2. **`helm-02.png`** — second biggest, and pure art: hair plus the tier 3/4/5
   horn silhouettes. No code change; swap the `src` in `RIG_ART.head`.
3. **`boots-02.png`** — cheap, and it buys back motion range that is currently
   capped by the shoe.
4. **`chest-02.png`** — a one-paragraph re-roll that removes a defect three
   rounds have each declined to own.
5. **`weapon-01.png`** — blocked on a bone. Do not generate until the bone
   exists, or it will sit unbound like `legs-01.png` col 1 did.
