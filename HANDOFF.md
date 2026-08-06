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
- **Every card offered is affordable.** The roll draws from what the purse
  covers; a card you can't buy is a taunt, not an option. An empty-handed purse
  gets no panel at all rather than a wall of three greyed cards.
- **One card per classification.** Kinds are picked first, then a card inside
  each, so three attack cards can never come up — that would be one choice
  wearing three coats. An unowned ability takes a seat whenever the kit has room.
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

1. **A Healing classification with more than one card in it.** Right now
   `healing` holds only `Last Rites`, so that kind always offers the same thing.
   Mend is an ability and the life-related perks (Vigour, Bloodthirst) sit under
   defence — moving them would leave defence thin, so this wants new perks
   rather than reshuffling.
2. **A Mend icon of its own.** Mend and Last Rites currently share the green
   vial, `icons-02` cell 1.

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
