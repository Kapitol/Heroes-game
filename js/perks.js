// The draft. Three cards come up and one gets taken, bought with the skulls in
// the purse. Perks stack, so the same card twice is always a real choice.
//
// **A card's price belongs to the card, not to when you meet it.** Every cost
// here is derived from the card and the tier you would be buying, so Might 3 is
// the same number the first time it comes up and the twentieth, and a player can
// save towards a specific card across several drops. Nothing about pricing is
// rolled, so nothing about it has to be saved either — it falls out of
// `(id, tier)` the same way every time, including after a reload.
//
// The tier ladder is what makes cards expensive later on, in place of the
// section-scaled inflation this used to have: a first tier stays reachable all
// run, and the fifth of anything is a serious purchase.

// Where each card's painted icon lives. Both sheets are keyed and auto-sliced
// at load like every other piece of art; the glyph on each card stays as the
// fallback for the moment before a sheet decodes, and for any cell that is
// missing. `minCell` is what makes the cell numbers below trustworthy — see the
// note in `atlas.js`.
export const ICON_SHEETS = [
  { src: 'art/icons-01.png', opts: { auto: true, minCell: 0.08 } },
  { src: 'art/icons-02.png', opts: { auto: true, minCell: 0.08 } },
];
const ICON1 = (cell) => ({ src: ICON_SHEETS[0].src, cell });
const ICON2 = (cell) => ({ src: ICON_SHEETS[1].src, cell });
export const iconOpts = (src) => (ICON_SHEETS.find(s => s.src === src) || ICON_SHEETS[0]).opts;

export const SKILLS = [
  { id: 'cleave',  name: 'Cleave',   glyph: '⚔', cd: 8,  cost: 90,  art:ICON2(0), desc: '220% damage to everything within 3 paces.' },
  { id: 'mend',    name: 'Mend',     glyph: '✚', cd: 18, cost: 110, art:ICON2(1), desc: 'Restores 40% of your life at once.' },
  { id: 'fire',    name: 'Firebolt', glyph: '✹', cd: 6,  cost: 100, art:ICON2(2), desc: 'A bolt that bursts for 280% on the target.' },
  { id: 'frenzy',  name: 'Frenzy',   glyph: '⚡', cd: 22, cost: 130, art:ICON2(3), desc: 'Seven seconds of doubled attack speed.' },
  { id: 'quake',   name: 'Quake',    glyph: '◈', cd: 14, cost: 120, art:ICON2(4), desc: '180% to everything near, and it slows them.' },
  { id: 'volley',  name: 'Volley',   glyph: '➶', cd: 11, cost: 115, art:ICON2(5), desc: 'Five bolts, each 90%, spread across the field.' },
  { id: 'ward',    name: 'Ward',     glyph: '❉', cd: 20, cost: 125, art:ICON2(6), desc: 'Halves incoming damage for six seconds.' },
];

export const skillById = (id) => SKILLS.find(s => s.id === id);

export const MAX_SKILLS = 4;

// kind drives the card colour and the icon, so a glance tells you what sort of
// upgrade it is before you read it.
export const PERKS = [
  { id: 'might',  kind: 'attack',  icon: '⚔', cost: 40, art:ICON1(0), name: 'Might',       desc: (n) => `+15% weapon damage (now +${n * 15}%)` },
  { id: 'swift',  kind: 'attack',  icon: '≫', cost: 44, art:ICON1(1), name: 'Swiftness',   desc: (n) => `+12% attack speed (now +${n * 12}%)` },
  { id: 'keen',   kind: 'attack',  icon: '◇', cost: 46, art:ICON1(2), name: 'Keen Edge',   desc: (n) => `+4% critical chance (now +${n * 4}%)` },
  { id: 'brutal', kind: 'attack',  icon: '✦', cost: 42, art:ICON1(3), name: 'Brutality',   desc: (n) => `+30% critical damage (now +${n * 30}%)` },
  { id: 'vigor',  kind: 'defense', icon: '❤', cost: 40, art:ICON1(4), name: 'Vigour',      desc: (n) => `+15% maximum life (now +${n * 15}%)` },
  { id: 'plate',  kind: 'defense', icon: '❖', cost: 38, art:ICON1(5), name: 'Plating',     desc: (n) => `+6 armour (now +${n * 6})` },
  { id: 'stoic',  kind: 'defense', icon: '⛨', cost: 48, art:ICON1(6), name: 'Stoicism',    desc: (n) => `−8% damage taken (now −${Math.round((1 - Math.pow(0.92, n)) * 100)}%)` },
  { id: 'leech',  kind: 'defense', icon: '☙', cost: 46, art:ICON1(7), name: 'Bloodthirst', desc: (n) => `+1.5% life steal (now +${(n * 1.5).toFixed(1)}%)` },
  { id: 'focus',  kind: 'utility', icon: '◷', cost: 50, art:ICON1(8), name: 'Focus',       desc: (n) => `−9% skill cooldowns (now −${Math.round((1 - Math.pow(0.91, n)) * 100)}%)` },
  { id: 'greed',  kind: 'utility', icon: '☠', cost: 44, art:ICON2(7), name: 'Avarice',     desc: (n) => `+25% skulls found (now +${n * 25}%)` },
];

// Each further tier of the same card costs half again as much. Deterministic in
// the tier alone, so the price of a given card is a fact about it rather than
// something the run rolled.
const TIER_STEP = 1.5;
export const costOf = (base, tier) => Math.round(base * Math.pow(TIER_STEP, Math.max(0, tier - 1)));

// A perk runs five tiers deep and then it is finished. The ladder had no top
// before, which made "how far along am I" a question with no answer — and a
// card can only show its progress as tiers if there is a last one to count
// towards. A perk at the top stops being offered.
export const MAX_TIER = 5;

export const perkById = (id) => PERKS.find(p => p.id === id);

/**
 * One-shot cards. No ladder, nothing permanent — they do a thing once and are
 * gone, so they carry no tiers and never rise in price.
 *
 * A full heal earns its place because life does not keep up with the life bar:
 * Vigour raises the maximum without filling it, so a hero who drafts into a
 * bigger pool walks the next stretch of road proportionally worse off than
 * before they took it. This is the card that closes that gap.
 */
export const REMEDIES = [
  {
    id: 'fullheal', kind: 'healing', icon: '✚', cost: 55, name: 'Last Rites', art: ICON2(1),
    desc: 'Restores every point of life at once.',
  },
];

// Below this much life the remedy is worth offering. At or above it the card
// would be a wasted seat — and a seat is one of only three.
const HURT_ENOUGH = 0.9;

const pick = (a) => a[Math.floor(Math.random() * a.length)];

/**
 * Three cards, priced, all affordable, and no two of the same classification.
 *
 * **One card per kind.** An offer of three attack cards is really an offer of
 * one, because they all answer the same question — so the roll picks distinct
 * kinds first and only then picks a card inside each. That is what makes the
 * choice a shape rather than a list: something for the swing, something for the
 * hide, something for everything else.
 *
 * A card you cannot pay for is not an option, it is a taunt — so each kind
 * offers only what the purse actually covers. The offer therefore sharpens as
 * the purse empties: spend down to almost nothing and only cheap first tiers
 * come up.
 *
 * An unowned ability takes the fourth kind whenever there is room in the kit
 * and skulls to cover it — a draft that can't ever widen your kit stops being a
 * decision. Returns fewer than three, or none at all, when that is all the
 * purse or the remaining ladders can reach.
 */
export function rollDraft(state, budget, hpFrac = 1) {
  const owned = new Set(state.loadout);

  // Every candidate, bucketed by the classification it would fill.
  const byKind = new Map();
  const add = (kind, card) => {
    if (!byKind.has(kind)) byKind.set(kind, []);
    byKind.get(kind).push(card);
  };

  if (state.loadout.length < MAX_SKILLS) {
    for (const s of SKILLS) {
      if (owned.has(s.id) || s.cost > budget) continue;
      add('ability', {
        type: 'skill', id: s.id, kind: 'ability', icon: s.glyph, art: s.art,
        name: s.name, desc: s.desc, cost: s.cost,
      });
    }
  }

  if (hpFrac < HURT_ENOUGH) {
    for (const r of REMEDIES) {
      if (r.cost > budget) continue;
      add(r.kind, { type: 'remedy', id: r.id, kind: r.kind, icon: r.icon, art: r.art,
        name: r.name, desc: r.desc, cost: r.cost });
    }
  }

  // Tier is decided before price, because the price *is* the price of that
  // tier: the next Might is dearer than the last whether or not it is offered.
  for (const p of PERKS) {
    const tier = (state.perks[p.id] || 0) + 1;
    if (tier > MAX_TIER) continue;
    const cost = costOf(p.cost, tier);
    if (cost > budget) continue;
    add(p.kind, {
      type: 'perk', id: p.id, kind: p.kind, icon: p.icon, art: p.art,
      name: p.name, desc: p.desc(tier), tier, cost,
      // What the card draws as tiers: how many are already held, and how many
      // there are in all. `tier` is the one this card would buy — the next
      // one along from `held`.
      held: tier - 1, tiers: MAX_TIER,
    });
  }

  // Ability first when it is on the table, so widening the kit is never the
  // thing that loses its seat to a shuffle; the rest of the kinds draw at
  // random for the seats that are left.
  const kinds = [...byKind.keys()].filter(k => k !== 'ability');
  for (let i = kinds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
  }
  if (byKind.has('ability')) kinds.unshift('ability');

  return kinds.slice(0, 3).map(k => pick(byKind.get(k)));
}

export function applyCard(state, card) {
  // A remedy leaves no trace on the sheet — its effect is immediate and is
  // applied by the caller, which is the only place that knows the hero's real
  // maximum. Handled here so it can never fall through and be banked as a perk
  // tier it doesn't have.
  if (card.type === 'remedy') return;
  if (card.type === 'skill') {
    if (state.loadout.length < MAX_SKILLS) state.loadout.push(card.id);
  } else {
    state.perks[card.id] = (state.perks[card.id] || 0) + 1;
  }
}
