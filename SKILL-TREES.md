# Skill trees

Nathan's spec, dictated 11 Aug 2026. **This is the source; the two
implementations that exist in the tree today were both built ahead of it and
are wrong.** See "What is in the code now" at the bottom.

## Shape

A tree, not three columns. Two sides — **Light** and **Evil** — each five tiers
deep. The middle is not a third branch you pick from the start: it appears
**after tier 2** as an optional **bridge node** joining the two sides, and it is
**unlabeled**. You reach it by having gone into both, not by choosing it.

```
                    Light          Evil
    tier 1          stat           stat
    tier 2         attack         attack
                       \  bridge  /            ← optional, unlabeled
    tier 3          heal    heal    heal
    tier 4        utility utility utility
    tier 5      ascendance      ascendance
```

Every tier has a job. The job is the same on both sides; what differs is what
it does and what it looks like.

| Tier | Job | Light | Hybrid | Evil |
|---|---|---|---|---|
| 1 | Stat bonus | ✓ | — | ✓ |
| 2 | Attack | ✓ | ✓ | ✓ |
| 3 | Heal | ✓ | ✓ | ✓ |
| 4 | Utility | ✓ | ✓ | ✓ |
| 5 | Ascendance | ✓ | ✓ | ✓ |

## Tier 1 — stat bonus

A stat bonus. **Light or Evil only** — there is no middle at this tier, because
there is nothing yet to bridge.

## Tier 2 — attack

An attack bonus, **the same for all three**. Only the visual changes with the
spec.

## The bridge

**Nothing is exclusive.** A player may spend into any tree, on either side,
until the points run out. Committing to one side is a thing you choose to do
by where you spend, not a door the game shuts behind you.

The middle opens at tier 2, and it opens **once a player has picked Evil or
Holy and spent one point there.** So the sequence is: take a side, put a point
in it, and the bridge becomes reachable. It is optional and it carries no
label.

Treat the one-point threshold as **a starting number to test**, not a rule —
it is the cheapest possible commitment, and whether that is too cheap is the
sort of thing only playing it will say.

## Tier 3 — heal

Refills health to full. **The effect lasts until it has refilled, and damage
taken during it is ignored until the heal completes.**

- **Evil** — a black pool appears under the hero's feet.
- **Hybrid** — the same pool, white.
- **Light** — a circular column of light drops from above.

## Tier 4 — utility

**Procs randomly when the player uses the Utility skill.**

- **Evil — Shadow Ward.** The hero turns black and absorbs damage: immune for
  2 seconds.
- **Hybrid — Dark Angel.** Black angel wings spawn on his back and act as a
  shield that absorbs damage.
- **Light — Angelic Wings.** Angel wings on his back, a light shield that
  absorbs damage.

## Tier 5 — ascendance

Art exists for all three (the tier-5 sheet: circular purple, split hexagon,
circular gold).

- **Evil — Unleashed Madness.** *"All restraint is gone. Let chaos reign."*
  Procs every few attacks: grabs an enemy carcass, rips the head off and uses
  it as a weapon. **+25% damage.**
- **Hybrid — Sacrifice.** *"Give all to protect what matters most."* Procs
  every few attacks: sacrifices an enemy's body for health.
- **Light — Holy Blessings.** *"Be the light. Uplift all."* Blesses an enemy's
  soul, making it whole again; the warrior receives its health and a **5-second
  attack-power boost**.

## Points

**Their own currency.** Tree points are not skulls and not gear — they are
earned by levelling and spent here and nowhere else.

- **Levels 1–9 grant nothing.** The tree does not open until 10.
- **Around seven points in a whole game**, paid out evenly across levels 10 to
  50 — roughly one every six levels. They are rare on purpose: a point is not a
  trickle of stats, it is one of the seven decisions a run gets.
- **One point per node.** No ranks and no partially-filled nodes: a node is
  taken or it is not, so the tree is read at a glance and a build is a *set* of
  nodes rather than a spreadsheet of fractions.
- **50 is max level**, and finishing a path should land **at or near 50** — the
  end of the tree and the end of levelling arrive together.
- Points **persist until the player wins the game.** They survive death and
  carry across runs — dying is not what takes them.
- **Winning ends the game.** The player may then start a new one at a greater
  difficulty, and **the skill tree resets** with it. So a tree is the shape of
  one victory, not of an account: the second time through is spent again from
  nothing, against harder things.
- **Greater difficulty scales enemy health and damage, and nothing else.** The
  tree is the same tree — same fifty levels, same nodes, same caps. The second
  run is harder because they hit back harder, not because the player is handed
  a longer ladder.

### Caps, so nobody owns all three

A player must not be able to max every path. Two hard limits do that work:

- **One Tier 5**, total.
- **One Tier 4**, total.

Both are chosen from whichever path you are in — you get one ascendance and one
utility, not three of each.

**Seven points and five tiers is the whole design in two numbers.** One path
straight down costs five, which leaves two to spend sideways — a second tier-1
stat, the bridge, an attack on the other side. Nobody finishes two paths, the
caps stop anybody holding two capstones, and every point spent widening is a
point not spent going deeper. The tension is the point.

## Proc rates — measured, 11 Aug

Run `node tools/proc-math.mjs`. It builds heroes at levels 10–50 with gear and
loot bands that keep pace with the road, sends them at the real monsters
through the real difficulty curve, and resolves the fight the same way
`tools/sim.mjs` does. 400 fights per sample.

**Wave — the ordinary fight, which is most of the game**

| level | stage | seconds | attacks | swing | incoming/s | % pool/s |
|---|---|---|---|---|---|---|
| 10 | 7 | 8.2 | 9.5 | 0.82 | 5.3 | 1.3 |
| 20 | 13 | 9.8 | 11.9 | 0.64 | 6.4 | 0.6 |
| 30 | 19 | 9.8 | 11.5 | 0.76 | 3.6 | 0.2 |
| 40 | 25 | 11.7 | 13.5 | 0.54 | 1.7 | 0.1 |
| 50 | 31 | 12.6 | 14.0 | 0.47 | 0.7 | 0.0 |

**Boss — the fight the abilities are for**

| level | stage | seconds | attacks | swing | incoming/s | % pool/s |
|---|---|---|---|---|---|---|
| 10 | 7 | 31.6 | 38.1 | 0.82 | 9.6 | 2.3 |
| 20 | 13 | 18.1 | 25.0 | 0.79 | 6.3 | 0.6 |
| 30 | 19 | 10.5 | 16.1 | 0.76 | 4.1 | 0.2 |
| 40 | 25 | 8.9 | 17.4 | 0.75 | 2.9 | 0.1 |
| 50 | 31 | 4.8 | 13.5 | 0.34 | 1.9 | 0.0 |

A wave is **9 to 14 swings**; a boss is **38 swings at level 10 and 13 by
level 50**, because the hero outgrows the boss faster than the boss outgrows
him.

### The rates that follow

Design targets first, so they can be argued with separately from the
arithmetic: a capstone should fire **about twice in a boss fight and about once
a wave**; a full heal should be **about once per boss fight**; a utility proc
should be **a gamble worth watching, not a routine**.

- **Tier 5 — every 11 attacks.** ≈2 per boss fight and ≈1.1 per wave at the
  mean. At level 10 it lands 3–4 times in a long boss fight and at 50 it lands
  once, which is the right way round: the fight that needs help gets it.
- **Tier 3 — 15 second cooldown.** ≈1 per boss fight. Note it is a *full* heal
  with damage ignored while it runs, so this is deliberately not tuned to be
  available every fight late on.
- **Tier 4 — 33% per Utility cast.** Utility cooldowns run 6–22s
  (`SKILLS` in js/perks.js), so a third is roughly one proc every two to three
  presses.

### Two things the measurement turned up

1. **Boss fights get shorter as the game goes on** — 32 seconds at level 10,
   under 5 at level 50 — and incoming damage falls from 2.3% of the pool per
   second to effectively nothing. Any tier-4 or tier-5 *defensive* proc is
   close to irrelevant by level 50 as the curve currently stands. The
   new-game-plus difficulty multiplier is what would give them a job again.
2. **Deterministic or random?** "Every 11 attacks" and "9% per attack" have the
   same mean and feel completely different: the counter is a rhythm the player
   can play around, the roll is a surprise. Not specified, and worth choosing
   deliberately.

## Presentation

Every proc's description is an **on-hover tooltip over that ability's node in
the tree**. The tree shows names and art; what a proc actually does is read by
hovering it.

## Open — not specified, do not invent

1. **Whether tiers 1–3 are capped too**, or only 4 and 5.
2. **The bridge's own cost** — is taking it a point, or free once unlocked?
3. **Deterministic or random procs** — a counter the player can rhythm around,
   or a roll (see the measurement section).
4. **Whether the class renames** on committing to a side — `LORE.md` has
   Warrior → Nephilim, Mage → Warlock, Paladin → Death Knight, Priest → Druid,
   and it is not yet stated whether the tree is what performs that change.
5. **The other three classes.** This spec is written from the Warrior's
   abilities. Mage, Paladin and Priest need their own five tiers.

## What is in the code now

**Nothing.** Two attempts were built ahead of this document — a three-counter
allocator, then a Diablo-style three-column graph — and both were wrong in the
same way: they invented a shape instead of asking for one. Both have been
removed, along with every hook they had in `heroStats`, the save, the level-up
and the UI. This file is the only record of the tree, which is the right way
round: the spec exists and the code does not.
