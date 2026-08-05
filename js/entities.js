// Actors, their stats, and the movement rules they share.

export const MONSTERS = {
  fallen:   { name: 'Fallen One', kind: 'fallen',   hp: 20, dmg: 4,  speed: 2.6, atk: 0.9, range: 0.9, scale: 0.85, gold: 4,  xp: 5 },
  skeleton: { name: 'Skeleton',   kind: 'skeleton', hp: 34, dmg: 7,  speed: 2.1, atk: 1.2, range: 1.0, scale: 1.0,  gold: 7,  xp: 9 },
  zombie:   { name: 'Rotting Dead', kind: 'zombie', hp: 62, dmg: 11, speed: 1.35, atk: 1.6, range: 1.0, scale: 1.05, gold: 11, xp: 14 },
  imp:      { name: 'Hellspawn',  kind: 'imp',      hp: 30, dmg: 9,  speed: 3.4, atk: 0.8, range: 0.9, scale: 0.8,  gold: 12, xp: 15 },
  wraith:   { name: 'Wraith',     kind: 'wraith',   hp: 48, dmg: 14, speed: 2.4, atk: 1.3, range: 1.1, scale: 1.0,  gold: 16, xp: 20 },
  brute:    { name: 'The Butcher', kind: 'brute',   hp: 320, dmg: 26, speed: 1.7, atk: 1.7, range: 1.5, scale: 1.5, gold: 90, xp: 110, boss: true },
};

// Which monsters can show up, by depth.
export function rosterFor(depth) {
  const r = ['fallen'];
  if (depth >= 2) r.push('skeleton');
  if (depth >= 4) r.push('zombie');
  if (depth >= 6) r.push('imp');
  if (depth >= 8) r.push('wraith');
  if (depth >= 3) r.push('skeleton');   // weight the staples
  if (depth >= 5) r.push('zombie');
  return r;
}

// Monster power curve. Steep enough that skipping upgrades stalls you out.
export const depthScale = (depth) => ({
  hp: Math.pow(1.28, depth - 1),
  dmg: Math.pow(1.19, depth - 1),
});

export function makeMonster(key, depth, pos) {
  const t = MONSTERS[key];
  const s = depthScale(depth);
  const hp = Math.round(t.hp * s.hp);
  return {
    ...t, key, x: pos.x, y: pos.y,
    hp, maxHp: hp,
    dmg: Math.round(t.dmg * s.dmg),
    gold: Math.round(t.gold * Math.pow(1.25, depth - 1)),
    xp: Math.round(t.xp * Math.pow(1.18, depth - 1)),
    atkTimer: Math.random() * t.atk,
    fx: 1, walk: 0, swing: 0, hurt: 0, slow: 0, dead: false, foe: true,
  };
}

export function makeHero() {
  return {
    kind: 'hero', name: 'Hero',
    x: 0, y: 0, scale: 1,
    level: 1, xp: 0, xpNext: 60,
    hp: 100, maxHp: 100,
    baseDmg: 10, baseArmor: 0, atk: 0.85, range: 1.15, speed: 3.1,
    critChance: 0.08, critMult: 2.0, lifesteal: 0,
    atkTimer: 0, fx: 1, walk: 0, swing: 0, hurt: 0,
    dead: false, foe: false,
    buffs: { frenzy: 0, ward: 0 },
    anchor: { x: 0, y: 0 },
  };
}

// Derived hero stats. Gear levels and drafted perks both fold in here, so the
// panel, the cards and the combat code can never disagree about the numbers.
export function heroStats(h, gear, perks) {
  const p = perks || {};
  const n = (k) => p[k] || 0;

  const dmg = Math.round((h.baseDmg + gear.weapon * 5)
    * (1 + h.level * 0.13) * (1 + n('might') * 0.15));
  const maxHp = Math.round((100 + gear.armor * 18)
    * (1 + (h.level - 1) * 0.15) * (1 + n('vigor') * 0.15));

  return {
    dmg,
    maxHp,
    armor: gear.armor * 3 + n('plate') * 6,
    crit: Math.min(0.65, h.critChance + gear.ring * 0.025 + n('keen') * 0.04),
    critMult: h.critMult + gear.ring * 0.06 + n('brutal') * 0.3,
    lifesteal: gear.amulet * 0.012 + n('leech') * 0.015,
    atkSpeed: h.atk / (1 + gear.weapon * 0.02 + n('swift') * 0.12),
    // Cooldown and mitigation stack multiplicatively; additive stacking would
    // reach zero and break the pacing the whole game is tuned around.
    cdr: 1 - (1 - Math.min(0.5, gear.amulet * 0.03)) * Math.pow(0.91, n('focus')),
    mitigate: Math.pow(0.92, n('stoic')),
    goldMul: 1 + n('greed') * 0.25,
  };
}

// --- movement ---------------------------------------------------------------

export function moveToward(e, tx, ty, dt, map, speedMul = 1) {
  const dx = tx - e.x, dy = ty - e.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.001) return 0;
  const sp = e.speed * speedMul * (e.slow > 0 ? 0.45 : 1) * dt;
  const nx = (dx / d) * Math.min(sp, d);
  const ny = (dy / d) * Math.min(sp, d);

  // Slide along walls: try both axes, then each on its own.
  if (map.walkable(e.x + nx, e.y + ny)) { e.x += nx; e.y += ny; }
  else if (map.walkable(e.x + nx, e.y)) e.x += nx;
  else if (map.walkable(e.x, e.y + ny)) e.y += ny;
  else {
    // Cornered — nudge sideways so nothing gets welded to a wall.
    const px = -dy / d * sp, py = dx / d * sp;
    if (map.walkable(e.x + px, e.y + py)) { e.x += px; e.y += py; }
  }

  e.walk += dt * 11;
  faceTo(e, dx, dy);
  return d;
}

export function faceTo(e, dx, dy) {
  // World direction projected into screen space: x runs down-right, y down-left.
  e.fx = (dx - dy) === 0 ? e.fx : (dx - dy) > 0 ? 1 : -1;
  e.sfx = dx - dy;
}

// Keep bodies from occupying the same tile — cheap O(n^2), n stays small.
export function separate(list, dt) {
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (a.dead) continue;
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j];
      if (b.dead) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const d2 = dx * dx + dy * dy;
      const min = 0.62 * (a.scale + b.scale) * 0.5 + 0.28;
      if (d2 > min * min || d2 < 1e-6) continue;
      const d = Math.sqrt(d2);
      const push = (min - d) * 0.5 * Math.min(1, dt * 12);
      const ux = dx / d * push, uy = dy / d * push;
      a.x -= ux; a.y -= uy;
      b.x += ux; b.y += uy;
    }
  }
}

export function nearestFoe(from, foes, maxDist = Infinity) {
  let best = null, bd = maxDist * maxDist;
  for (const m of foes) {
    if (m.dead) continue;
    const d2 = (m.x - from.x) ** 2 + (m.y - from.y) ** 2;
    if (d2 < bd) { bd = d2; best = m; }
  }
  return best;
}
