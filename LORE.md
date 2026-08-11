# The Order of Ni

Written by Nathan, 11 Aug 2026. This is the frame every other document sits
inside: `PRODUCT.md` says what the game does, `DESIGN.md` how it plays,
`ART-BRIEF.md` how it looks, and this says **what it is about**. Where they
disagree, this wins and they get corrected.

## The founding

An order established to ward off demonic spirits. The original founder was a
priest who saw his parishioners seemingly fall under the influence of what he
perceived to be evil forces.

He would perform ritualistic casts to try to ward off the evil. All attempts
failed, and in his desperation, he sought out guidance from what seemed to be
help from beyond the living realm.

Turning slowly from well-intentioned, he slowly started to embrace actual evil,
not noticing his transformation. He became the source of the evil he thought he
was casting out.

Once the demonic influence grew, an angelic presence noticed. It broke the
connection, but the powers remained. The priest, now aware of his corruption,
studied ancient manuscripts for guidance. He transformed into a Paladin, which
dug into both light and dark spells.

This newfound power allowed him to cure his parishioners of the evil he had cast
on them. That remaking changed them into heroic types, and the order was
established to include him and them:

- **Warrior** — a righteous light-ordained armed guard
- **Mage** — an ancient light-powered magical caster
- **Paladin** — a righteous light-ordained caster/warrior hybrid
- **Priest** — a righteous light-ordained healer

## The portals, and the corruption

The presence of these people gave rise to the evil demons creating portals into
the normal realm. The order dispatched heroes into the demonic realm — a copy of
the normal realm, corrupted and destroyed.

Slowly, the heroes were corrupted by the demon lords, transforming them into
human-demon hybrids. Angelic forces infiltrated the demonic realm to save these
heroic souls from servitude. They broke the connection and gave them a choice:
remain within their current power structure, or change into new classes.

Some will choose to stay, some will choose to turn, and others may split.

**The choice is a skill tree, not a fork in a cutscene.** Every class has one,
with three branches — **Light**, **Hybrid**, **Evil** — and the player spends
into whichever they want. "Others may split them" is the Hybrid branch: it is a
route the player can commit to, not a failure to commit.

- **Warrior → Nephilim** — a righteous light-ordained armed guard, corrupted
- **Mage → Warlock** — a life-force absorber and magical caster
- **Paladin → Death Knight** — an undead Paladin whose connection to the light
  is replaced by darkness
- **Priest → Druid** — a former priest whose powers have been imbued by an earth
  mother

The player picks what to do.

## What this settles, and what it contradicts

**The transformation is a choice made mid-run, not a class picked at the start.**
That is a mechanic the code does not have: `CLASSES` in `js/entities.js` is a
fixed roster chosen before the road. Warlock and Druid currently sit in that
roster as *starting* classes, and this document makes them **destinations** —
the corrupted forms of Mage and Priest. Mage, Priest, Nephilim and Death Knight
do not exist in the code at all.

**It also settles the armour ladder, which was picked before this was written.**
`tools/outfit.py` climbs peasant → ranger → noble → mail → plate, which is
generic RPG progression and says nothing about an order of light. A member of
the Order of Ni should read as ordained from tier 1 — an initiate in cloth, not
a farmhand — and the ladder should end in something consecrated rather than
merely expensive.

**The three branches make the armoury two-dimensional.** A hero is now a
*branch* and a *tier*, so a class needs 5 × 3 = fifteen outfits, not five. The
sheet architecture already has the cheaper of the two axes: a row is a tier, so
a **branch is a sheet** — `DOLL_ART` becomes three entries and the draw path
picks one, while `row = wornTier - 1` is untouched. Three bakes per class
instead of one; no new runtime concept.

There is no skill tree in the code yet. `js/perks.js` carries `SKILLS`, `PERKS`
and the boon draft, which are run-scoped and branchless — nothing there knows
about Light, Hybrid or Evil, and nothing records which route a hero took.

**And it makes one current choice actively wrong: the horns.** Tier 5 wears
`Male_Knight_Head_Horns`, which reads demonic. On a righteous light-ordained
guard at his highest rung that is backwards. Horns belong to the Nephilim — the
corrupted branch — where the same kit gives a second, darker ladder for free.
