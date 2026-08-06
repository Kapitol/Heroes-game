// Loot: the things a boss leaves behind.
//
// This sits *on top of* the armoury rather than replacing it. The armoury is
// the steady part — levels you buy with skulls, that drive the hero's visible
// marks — and loot is the windfall: random, occasional, and never something you
// can shop for. Keeping them separate means the skull sink survives, the marks
// keep working, and a good drop reads as luck instead of arithmetic.
//
// Rarity is the same five bands the cards use. A game should only have one
// ladder of "how good is this", and that one already exists.

import { TIER_BANDS } from './perks.js';

/**
 * Where a piece can sit. Armour has four slots of its own; the weapon slot is
 * the looted blade, which stacks with the bought one rather than replacing it —
 * the armoury's Blade is still what the hero is drawn holding.
 */
export const SLOTS = [
  { key: 'head',   name: 'Helm',    icon: '⛑', armour: true },
  { key: 'chest',  name: 'Cuirass', icon: '❖', armour: true },
  { key: 'hands',  name: 'Gauntlets', icon: '✋', armour: true },
  { key: 'feet',   name: 'Greaves', icon: '⤓', armour: true },
  { key: 'weapon', name: 'Weapon',  icon: '⚔', armour: false },
];

export const slotByKey = (k) => SLOTS.find(s => s.key === k);

/**
 * Painted art for a looted piece, or null while a slot still has none.
 *
 * One sheet per slot, five cells, worst band to best — so the cell is simply
 * where the item's band sits on the ladder, and a Gold helm is the fifth helm
 * on the sheet without a lookup table to keep in step. Slots with no sheet yet
 * keep their glyph, which is why this returns null rather than a placeholder.
 */
export const SLOT_ART = {
  head: 'art/helmets.png',
  weapon: 'art/icons-weapon.png',
};

export function itemArt(it) {
  const src = it && SLOT_ART[it.slot];
  if (!src) return null;
  const cell = TIER_BANDS.findIndex(b => b.key === it.band);
  return cell < 0 ? null : { src, cell };
}

/**
 * The attribute pool. `per` is what one point of item level is worth, so every
 * roll scales with the level it dropped at without a separate table per tier.
 *
 * Percentages are stored as fractions and added to the same places the armoury
 * and the perks feed, so nothing downstream has to know where a bonus came from.
 */
const ATTRS = [
  { key: 'dmg',       name: 'damage',        per: 1.6,    fmt: (v) => `+${Math.round(v)} damage` },
  { key: 'life',      name: 'life',          per: 7,      fmt: (v) => `+${Math.round(v)} life` },
  { key: 'armor',     name: 'armour',        per: 0.9,    fmt: (v) => `+${Math.round(v)} armour` },
  { key: 'crit',      name: 'critical',      per: 0.0035, fmt: (v) => `+${(v * 100).toFixed(1)}% critical` },
  { key: 'critMult',  name: 'crit damage',   per: 0.012,  fmt: (v) => `+${Math.round(v * 100)}% crit damage` },
  { key: 'atkSpeed',  name: 'attack speed',  per: 0.006,  fmt: (v) => `+${(v * 100).toFixed(1)}% attack speed` },
  { key: 'lifesteal', name: 'life steal',    per: 0.0015, fmt: (v) => `+${(v * 100).toFixed(2)}% life steal` },
  { key: 'cdr',       name: 'cooldowns',     per: 0.004,  fmt: (v) => `−${(v * 100).toFixed(1)}% cooldowns` },
  { key: 'skullMul',  name: 'skulls found',  per: 0.01,   fmt: (v) => `+${Math.round(v * 100)}% skulls found` },
];

// A weapon always rolls damage and armour never does, so a helm can never be
// the best weapon in the run and a sword is always worth swinging.
const WEAPON_ONLY = ['dmg'];
const ARMOUR_FIRST = ['life', 'armor'];

// How many attributes each band rolls, and how hard. Gray is a scrap; Gold is
// the reason to fight a boss.
const BAND_ROLL = {
  gray:   { attrs: 1, mult: 0.7 },
  green:  { attrs: 2, mult: 1.0 },
  blue:   { attrs: 2, mult: 1.35 },
  purple: { attrs: 3, mult: 1.7 },
  gold:   { attrs: 4, mult: 2.2 },
};

// Rarity odds, and how they shift as the run gets deeper. Gray drains away and
// Gold creeps in, so the tenth boss feels different from the first without the
// numbers being any bigger.
function rollBand(level) {
  const t = Math.min(1, (level - 1) / 24);
  const weights = [
    ['gray',   Math.max(0, 34 - t * 34)],
    ['green',  40 - t * 14],
    ['blue',   18 + t * 10],
    ['purple', 6 + t * 20],
    ['gold',   2 + t * 12],
  ];
  let roll = Math.random() * weights.reduce((a, [, w]) => a + w, 0);
  for (const [key, w] of weights) if ((roll -= w) <= 0) return key;
  return 'green';
}

const NOUNS = {
  head:   ['Helm', 'Greathelm', 'Hood', 'Crown', 'Casque'],
  chest:  ['Cuirass', 'Hauberk', 'Plate', 'Mail', 'Harness'],
  hands:  ['Gauntlets', 'Grips', 'Bracers', 'Handguards'],
  feet:   ['Greaves', 'Sabatons', 'Treads', 'Boots'],
  weapon: ['Blade', 'Cleaver', 'Falchion', 'Longsword', 'Reaver'],
};
const ADJECTIVES = {
  gray:   ['Rusted', 'Chipped', 'Scavenged', 'Dull'],
  green:  ['Sturdy', 'Honed', 'Iron-Bound', 'Grave-Touched'],
  blue:   ['Warden’s', 'Coldforged', 'Runed', 'Tomb-Wrought'],
  purple: ['Dread', 'Sanctified', 'Wraithbound', 'Kingsbane'],
  gold:   ['Undying', 'Hallowed', 'Ashen-Crowned', 'Godsplit'],
};

const pick = (a) => a[Math.floor(Math.random() * a.length)];
let nextId = 1;

/**
 * One piece of loot, rolled for a slot at a level.
 *
 * Every attribute is scaled by the level it dropped at *and* by the band, so a
 * Gold at level 3 and a Green at level 20 can be worth about the same — which
 * is what keeps a lucky early drop exciting without making it permanent.
 */
export function rollItem(slotKey, level, forcedBand) {
  const slot = slotByKey(slotKey);
  const band = forcedBand || rollBand(level);
  const roll = BAND_ROLL[band];

  // Build the candidate pool: the slot's guaranteed line first, then the rest.
  const pool = ATTRS.filter(a => (slot.armour ? !WEAPON_ONLY.includes(a.key) : true));
  const first = slot.armour ? pick(ARMOUR_FIRST) : 'dmg';
  const chosen = [first];
  const rest = pool.filter(a => a.key !== first);
  while (chosen.length < roll.attrs && rest.length) {
    chosen.push(rest.splice(Math.floor(Math.random() * rest.length), 1)[0].key);
  }

  const attrs = chosen.map((key) => {
    const def = ATTRS.find(a => a.key === key);
    // ±20% of the level-and-band value, so two of the same never read alike.
    const jitter = 0.8 + Math.random() * 0.4;
    return { key, value: def.per * level * roll.mult * jitter };
  });

  return {
    id: nextId++,
    slot: slotKey,
    band,
    level,
    name: `${pick(ADJECTIVES[band])} ${pick(NOUNS[slotKey])}`,
    attrs,
  };
}

/**
 * What every hero owns before they have earned anything.
 *
 * A full set at the bottom of the ladder: Gray, level 1, one piece in every
 * slot including the hand. Starting empty-handed was survivable while skulls
 * bought plate in the armoury; now that armour only ever comes off a boss, an
 * unarmed hero has twelve waves of nothing before their first upgrade, and the
 * numbers simply do not hold up over that stretch.
 */
export function startingKit() {
  const kit = {};
  for (const s of SLOTS) kit[s.key] = rollItem(s.key, 1, 'gray');
  return kit;
}

/**
 * What a boss leaves: two to four pieces of armour and one to three weapons.
 * Deeper bosses leave more, but the ceiling holds — the interesting growth is
 * in what the pieces roll, not how many of them there are.
 */
export function rollBossLoot(level) {
  const armourSlots = SLOTS.filter(s => s.armour).map(s => s.key);
  const nArmour = 2 + Math.floor(Math.random() * 3);       // 2–4
  const nWeapons = 1 + Math.floor(Math.random() * 3);      // 1–3
  const out = [];
  for (let i = 0; i < nArmour; i++) out.push(rollItem(pick(armourSlots), level));
  for (let i = 0; i < nWeapons; i++) out.push(rollItem('weapon', level));
  return out;
}

/** The bonus skulls a boss pays on top of its normal spoils. */
export const bossSkullBonus = (level) => Math.round(60 * Math.pow(1.05, level - 1));

/** Everything equipped, summed into one bag of bonuses. */
export function equippedBonuses(equipped) {
  const total = {};
  for (const key in equipped || {}) {
    const it = equipped[key];
    if (!it) continue;
    for (const a of it.attrs) total[a.key] = (total[a.key] || 0) + a.value;
  }
  return total;
}

// A single number for "how good is this", used to sort a bagful and to mark the
// upgrade in a list. Deliberately crude — it is a hint, not a verdict.
export const itemScore = (it) =>
  it.attrs.reduce((t, a) => {
    const def = ATTRS.find(x => x.key === a.key);
    return t + (def ? a.value / def.per : 0);
  }, 0);

export const attrText = (a) => {
  const def = ATTRS.find(x => x.key === a.key);
  return def ? def.fmt(a.value) : '';
};

/**
 * The armour tier the hero reads as, from what they are actually wearing.
 *
 * Loot arrives a piece at a time and a hero ends up in a silver gauntlet and a
 * gold helm at once. The body sheet has one tier per row and no way to show a
 * mixed set — layers would, and this pipeline cannot make layers — so the body
 * takes the *average* of what is worn and the individual pieces show as
 * themselves in the armoury. Round up: a single gold piece should feel like it
 * did something.
 */
export function wornTier(equipped) {
  const worn = SLOTS.filter(s => s.armour)
    .map(s => equipped && equipped[s.key])
    .filter(Boolean);
  if (!worn.length) return 1;
  const sum = worn.reduce((t, it) => t + TIER_BANDS.findIndex(b => b.key === it.band) + 1, 0);
  return Math.max(1, Math.min(TIER_BANDS.length, Math.round(sum / worn.length)));
}

export const bandName = (key) => (TIER_BANDS.find(b => b.key === key) || {}).name || key;
