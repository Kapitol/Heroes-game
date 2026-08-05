// The draft. After every encounter the hero survives, three cards come up and
// one gets taken. Perks stack, so the same card twice is always a real choice.

export const SKILLS = [
  { id: 'cleave',  name: 'Cleave',   glyph: '⚔', cd: 8,  desc: '220% damage to everything within 3 paces.' },
  { id: 'mend',    name: 'Mend',     glyph: '✚', cd: 18, desc: 'Restores 40% of your life at once.' },
  { id: 'fire',    name: 'Firebolt', glyph: '✹', cd: 6,  desc: 'A bolt that bursts for 280% on the target.' },
  { id: 'frenzy',  name: 'Frenzy',   glyph: '⚡', cd: 22, desc: 'Seven seconds of doubled attack speed.' },
  { id: 'quake',   name: 'Quake',    glyph: '◈', cd: 14, desc: '180% to everything near, and it slows them.' },
  { id: 'volley',  name: 'Volley',   glyph: '➶', cd: 11, desc: 'Five bolts, each 90%, spread across the field.' },
  { id: 'ward',    name: 'Ward',     glyph: '❉', cd: 20, desc: 'Halves incoming damage for six seconds.' },
];

export const skillById = (id) => SKILLS.find(s => s.id === id);

export const MAX_SKILLS = 4;

// kind drives the card colour and the icon, so a glance tells you what sort of
// upgrade it is before you read it.
export const PERKS = [
  { id: 'might',  kind: 'attack',  icon: '⚔', name: 'Might',       desc: (n) => `+15% weapon damage (now +${n * 15}%)` },
  { id: 'swift',  kind: 'attack',  icon: '≫', name: 'Swiftness',   desc: (n) => `+12% attack speed (now +${n * 12}%)` },
  { id: 'keen',   kind: 'attack',  icon: '◇', name: 'Keen Edge',   desc: (n) => `+4% critical chance (now +${n * 4}%)` },
  { id: 'brutal', kind: 'attack',  icon: '✦', name: 'Brutality',   desc: (n) => `+30% critical damage (now +${n * 30}%)` },
  { id: 'vigor',  kind: 'defense', icon: '❤', name: 'Vigour',      desc: (n) => `+15% maximum life (now +${n * 15}%)` },
  { id: 'plate',  kind: 'defense', icon: '❖', name: 'Plating',     desc: (n) => `+6 armour (now +${n * 6})` },
  { id: 'stoic',  kind: 'defense', icon: '⛨', name: 'Stoicism',    desc: (n) => `−8% damage taken (now −${Math.round((1 - Math.pow(0.92, n)) * 100)}%)` },
  { id: 'leech',  kind: 'defense', icon: '☙', name: 'Bloodthirst', desc: (n) => `+1.5% life steal (now +${(n * 1.5).toFixed(1)}%)` },
  { id: 'focus',  kind: 'utility', icon: '◷', name: 'Focus',       desc: (n) => `−9% skill cooldowns (now −${Math.round((1 - Math.pow(0.91, n)) * 100)}%)` },
  { id: 'greed',  kind: 'utility', icon: '◍', name: 'Avarice',     desc: (n) => `+25% gold found (now +${n * 25}%)` },
];

export const perkById = (id) => PERKS.find(p => p.id === id);

/**
 * Three cards. One is always an unowned ability while there is room for it —
 * a draft that can't ever widen your kit stops being a decision.
 */
export function rollDraft(state) {
  const cards = [];
  const owned = new Set(state.loadout);
  const spare = SKILLS.filter(s => !owned.has(s.id));

  if (state.loadout.length < MAX_SKILLS && spare.length) {
    const s = spare[Math.floor(Math.random() * spare.length)];
    cards.push({ type: 'skill', id: s.id, kind: 'ability', icon: s.glyph, name: s.name, desc: s.desc });
  }

  const pool = [...PERKS];
  while (cards.length < 3 && pool.length) {
    const p = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    const n = (state.perks[p.id] || 0) + 1;
    cards.push({ type: 'perk', id: p.id, kind: p.kind, icon: p.icon, name: p.name, desc: p.desc(n), rank: n });
  }
  return cards;
}

// Boons are bought, not handed out. Pricing them puts the draft in direct
// competition with the armoury for the same purse, which is the whole point:
// a card you can afford is a suit of plate you didn't buy.
export function priceCards(cards, section) {
  const base = 42 * Math.pow(1.26, section - 1);
  for (const c of cards) {
    const rank = c.rank || 1;
    c.cost = Math.round(base * (c.type === 'skill' ? 1.7 : 1) * (1 + (rank - 1) * 0.22));
  }
  return cards;
}

export function applyCard(state, card) {
  if (card.type === 'skill') {
    if (state.loadout.length < MAX_SKILLS) state.loadout.push(card.id);
  } else {
    state.perks[card.id] = (state.perks[card.id] || 0) + 1;
  }
}
