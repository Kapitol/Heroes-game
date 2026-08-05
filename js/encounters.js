// What actually shows up, and how it fights.
//
// The complaint about auto-battlers is fair: if every wave is "more bodies
// walk at you" and every boss is "a body with more health", there is nothing
// to react to and the skill buttons are decoration. So enemies here have four
// different approach behaviours, waves come in named formations, and bosses
// telegraph real moves you can answer with a cooldown.

// Painted sheets, 2 poses per row: column 0 idle, column 1 attacking. `h` is
// the creature's target height in world pixels, so different sheets can be
// drawn at different source resolutions and still stand shoulder to shoulder.
const SKELETONS = { sheet: 'art/skeletons.png', cols: 2, rows: 3 };
export const SPRITE = {
  skeleton: { ...SKELETONS, row: 0, h: 50 },
  knight:   { ...SKELETONS, row: 2, h: 58 },
  // The archer draws its idle and firing poses from the pose sheet, but has a
  // second sheet of real animation: a four-frame walk and a four-frame
  // collapse. `anim` is optional everywhere — anything without one falls back
  // to the two poses.
  archer: {
    ...SKELETONS, row: 1, h: 50,
    anim: {
      sheet: 'art/archer-anim.png', cols: 4, rows: 4, stripText: true, auto: true, h: 46,
      walk: [0, 1, 2, 3],
      death: [8, 9, 10, 11],
      arrow: 12,
    },
  },
};

// ai:
//   melee    close and swing
//   ranged   hold at distance and throw
//   charger  wind up, dash through, recover
//   exploder sprint in and burst on contact or death
export const MONSTERS = {
  fallen:   { name: 'Fallen One',  kind: 'fallen',   ai: 'melee',    hp: 20,  dmg: 4,  speed: 2.6,  atk: 0.9, range: 0.9, scale: 0.85, gold: 9,  xp: 5 },
  skeleton: { sprite: SPRITE.skeleton, name: 'Skeleton',    kind: 'skeleton', ai: 'melee',    hp: 34,  dmg: 7,  speed: 2.1,  atk: 1.2, range: 1.0, scale: 1.0,  gold: 15, xp: 9 },
  archer:   { sprite: SPRITE.archer, name: 'Bone Archer', kind: 'skeleton', ai: 'ranged',   hp: 26,  dmg: 9,  speed: 2.0,  atk: 1.9, range: 6.5, scale: 0.95, gold: 23, xp: 13, keep: 5.2 },
  zombie:   { name: 'Rotting Dead',kind: 'zombie',   ai: 'melee',    hp: 74,  dmg: 11, speed: 1.35, atk: 1.6, range: 1.0, scale: 1.05, gold: 23, xp: 14 },
  imp:      { name: 'Hellspawn',   kind: 'imp',      ai: 'charger',  hp: 30,  dmg: 12, speed: 3.2,  atk: 0.9, range: 0.9, scale: 0.8,  gold: 25, xp: 15 },
  bloater:  { name: 'Bloated One', kind: 'zombie',   ai: 'exploder', hp: 44,  dmg: 26, speed: 2.3,  atk: 1.2, range: 1.0, scale: 1.1,  gold: 31, xp: 18 },
  wraith:   { name: 'Wraith',      kind: 'wraith',   ai: 'ranged',   hp: 52,  dmg: 15, speed: 2.4,  atk: 1.6, range: 7.0, scale: 1.0,  gold: 33, xp: 20, keep: 5.8 },
  knight:   { sprite: SPRITE.knight, name: 'Dread Knight',kind: 'skeleton', ai: 'melee',    hp: 150, dmg: 20, speed: 1.5,  atk: 1.5, range: 1.1, scale: 1.15, gold: 54, xp: 34, armor: 14 },
};

// Bosses each own a pair of telegraphed moves and an enrage threshold.
export const BOSSES = [
  {
    key: 'butcher', name: 'The Butcher', kind: 'brute',
    hp: 250, dmg: 17, speed: 1.6, atk: 1.7, range: 1.6, scale: 1.55,
    gold: 300, xp: 150,
    moves: [
      { id: 'slam',   tell: 1.0, cd: 6.5,  radius: 3.4, mult: 1.7, colour: '#ff7a3a', text: 'SLAM' },
      { id: 'charge', tell: 0.9, cd: 9.0,  radius: 1.6, mult: 1.5, colour: '#ffd76a', text: 'CHARGE' },
    ],
  },
  {
    key: 'warden', name: 'The Bone Warden', kind: 'skeleton', sprite: { ...SPRITE.knight, h: 72 },
    hp: 225, dmg: 13, speed: 1.9, atk: 1.4, range: 1.2, scale: 1.5,
    gold: 330, xp: 165,
    moves: [
      { id: 'summon', tell: 1.2, cd: 11.0, radius: 2.6, mult: 0,   colour: '#9fe8ff', text: 'SUMMON', adds: ['skeleton', 'archer'] },
      { id: 'nova',   tell: 1.1, cd: 7.5,  radius: 4.2, mult: 1.7, colour: '#a8c8ff', text: 'BONE NOVA' },
    ],
  },
  {
    key: 'ogre', name: 'The Flame Ogre', kind: 'brute',
    hp: 310, dmg: 19, speed: 1.5, atk: 1.9, range: 1.7, scale: 1.7,
    gold: 380, xp: 190,
    moves: [
      { id: 'nova',   tell: 1.0, cd: 6.0,  radius: 4.6, mult: 1.6, colour: '#ff6a2a', text: 'FIRE NOVA' },
      { id: 'charge', tell: 1.0, cd: 10.0, radius: 1.8, mult: 1.7, colour: '#ffb84a', text: 'RAMPAGE' },
    ],
  },
];

export const bossFor = (stage) => BOSSES[(Math.floor(stage / BOSS_EVERY) - 1) % BOSSES.length];

export const BOSS_EVERY = 8;
export const isBossStage = (stage) => stage % BOSS_EVERY === 0;

// --- formations -------------------------------------------------------------
//
// Each entry says what the wave is made of and how it arrives. `sides` spawns
// from behind as well as ahead, which is the only thing that ever makes a
// player reposition their cooldowns.
export const FORMATIONS = [
  { id: 'mob',    name: 'Warband',    from: 1, unlock: 1,  pick: (r) => r.melee, count: 1.0 },
  { id: 'rush',   name: 'Rush',       from: 3, unlock: 3,  pick: (r) => r.fast,  count: 1.5, gap: 0.45 },
  { id: 'volley', name: 'Skirmish',   from: 5, unlock: 5,  pick: (r) => r.mixed, count: 0.9 },
  { id: 'wall',   name: 'Shield Wall',from: 7, unlock: 7,  pick: (r) => r.tanky, count: 0.6, gap: 1.3 },
  { id: 'ambush', name: 'Ambush',     from: 9, unlock: 9,  pick: (r) => r.mixed, count: 1.1, sides: true },
  { id: 'elite',  name: 'Champion',   from: 11, unlock: 11, pick: (r) => r.melee, count: 0.7, champion: true },
];

export function rosterFor(stage) {
  const melee = ['fallen'];
  const fast = ['fallen'];
  const tanky = ['skeleton'];
  const ranged = [];

  if (stage >= 2) { melee.push('skeleton'); }
  if (stage >= 4) { ranged.push('archer'); }
  if (stage >= 5) { melee.push('zombie'); tanky.push('zombie'); }
  if (stage >= 6) { fast.push('imp'); }
  if (stage >= 8) { melee.push('bloater'); fast.push('bloater'); }
  if (stage >= 10) { ranged.push('wraith'); }
  if (stage >= 12) { tanky.push('knight'); melee.push('knight'); }

  const mixed = [...melee, ...(ranged.length ? ranged : melee), ...fast];
  return { melee, fast, tanky, ranged: ranged.length ? ranged : melee, mixed };
}

export function formationFor(stage) {
  const open = FORMATIONS.filter(f => stage >= f.unlock);
  // Always keep a chance of the plain warband so the rhythm has a baseline.
  if (Math.random() < 0.34) return FORMATIONS[0];
  return open[Math.floor(Math.random() * open.length)];
}

export const stageScale = (stage) => ({
  hp: Math.pow(1.20, stage - 1),
  dmg: Math.pow(1.13, stage - 1),
  gold: Math.pow(1.24, stage - 1),
  xp: Math.pow(1.17, stage - 1),
});

export function makeMonster(key, stage, pos, champion) {
  const t = MONSTERS[key];
  const s = stageScale(stage);
  const boost = champion ? 3.4 : 1;
  const hp = Math.round(t.hp * s.hp * boost);
  return {
    ...t, key, x: pos.x, y: pos.y,
    hp, maxHp: hp,
    dmg: Math.round(t.dmg * s.dmg * (champion ? 1.5 : 1)),
    gold: Math.round(t.gold * s.gold * (champion ? 4 : 1)),
    xp: Math.round(t.xp * s.xp * (champion ? 4 : 1)),
    scale: t.scale * (champion ? 1.35 : 1),
    name: champion ? `Champion ${t.name}` : t.name,
    champion: !!champion,
    atkTimer: Math.random() * t.atk,
    state: 'approach', stateT: 0,
    fx: 1, walk: 0, swing: 0, hurt: 0, slow: 0, emerge: 0, dead: false, foe: true,
  };
}

export function makeBoss(stage, pos) {
  const b = bossFor(stage);
  const s = stageScale(stage);
  const hp = Math.round(b.hp * s.hp);
  return {
    ...b, key: b.key, ai: 'boss', boss: true,
    x: pos.x, y: pos.y,
    hp, maxHp: hp,
    dmg: Math.round(b.dmg * s.dmg),
    gold: Math.round(b.gold * s.gold),
    xp: Math.round(b.xp * s.xp),
    atkTimer: 1.2,
    moveCd: b.moves.map(m => m.cd * 0.6),
    casting: null, castT: 0, enraged: false,
    state: 'approach', stateT: 0,
    fx: 1, walk: 0, swing: 0, hurt: 0, slow: 0, emerge: 0, dead: false, foe: true,
  };
}
