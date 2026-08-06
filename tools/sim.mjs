// Headless balance harness.
//
//   node tools/sim.mjs                    500 runs of every strategy
//   node tools/sim.mjs --runs 2000        more of them
//   node tools/sim.mjs --strategy damage  just one
//   node tools/sim.mjs --seed 7           repeatable
//
// Plays runs with no browser, no canvas and no clock, and reports how deep each
// card strategy gets. The question it exists to answer is the only one that
// matters about the draft: **does picking well actually decide a run?** If every
// strategy dies at the same depth, the cards are decoration and the exponents in
// js/balance.js are wrong.
//
// WHAT IS REAL AND WHAT IS MODELLED
//
// Real, imported from the game so it cannot drift: hero stats, the perk pool and
// what cards cost, the monster table and its stage scaling, wave formations and
// rosters, loot rolls, and the difficulty curve in js/balance.js.
//
// Modelled here, and therefore approximate: positioning, pathing and the leash.
// The sim resolves a fight as damage-per-second against a health pool with a cap
// on how many enemies can reach the hero at once. It will not reproduce a
// specific death; it is for comparing strategies against each other and for
// seeing which way a change to an exponent moves the curve.

import { makeHero, heroStats } from '../js/entities.js';
import { MONSTERS, makeMonster, makeBoss, rosterFor, formationFor } from '../js/encounters.js';
import { rollDraft, applyCard, TIER_BANDS, MAX_TIER, PERKS } from '../js/perks.js';
import { rollBossLoot, startingKit, itemScore, SLOTS } from '../js/items.js';
import { threat, MAX_HIT_FRACTION, waveSize } from '../js/balance.js';

// ---------------------------------------------------------------- arguments --
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const RUNS = Number(arg('runs', 500));
const ONLY = arg('strategy', null);
const SEED = Number(arg('seed', 1));

// A seeded PRNG standing in for Math.random, so a reported number can be looked
// at twice. Everything downstream — loot rolls, wave composition, crits — draws
// from this, which is why the whole harness is reproducible from one integer.
let seed = SEED >>> 0;
const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
Math.random = rnd;

// ------------------------------------------------------------------ the run --
const WAVES_PER_DROP = 3;
const WAVES_PER_BOSS = 12;
const OPENING_PICKS = 2;
const TICK = 0.1;             // seconds per simulated step
const WAVE_TIMEOUT = 180;     // a wave nobody can win is a stall, not a loss
const MELEE_SLOTS = 3;        // how many bodies can reach the hero at once

/**
 * The draft strategies under test.
 *
 * Every one of them sees only what the purse can cover. Since an offer now
 * deliberately carries one card that is out of reach, a strategy that does not
 * filter picks the unaffordable one, takes nothing at all, and reports the
 * draft as worthless — which is how this harness spent a whole sweep claiming
 * card choice could not matter.
 */
const STRATEGIES = {
  // The naive player: takes whatever is on the left.
  first: (cards, st, budget) => Math.max(0, cards.findIndex(c => c.cost <= budget)),
  // Random, as a control. If a considered strategy cannot beat this, the draft
  // is not carrying any decisions.
  random: (cards, st, budget) => {
    const ok = cards.map((c, i) => [c, i]).filter(([c]) => c.cost <= budget);
    return ok.length ? ok[Math.floor(rnd() * ok.length)][1] : 0;
  },
  // Everything into hurting things.
  damage: (cards, st, b) => pickBy(cards, ['might', 'brutal', 'keen', 'swift', 'leech'], b),
  // Everything into staying alive.
  defense: (cards, st, b) => pickBy(cards, ['vigor', 'plate', 'stoic', 'renew', 'dress'], b),
  // Damage until it starts hurting, then patch the holes.
  balanced: (cards, st, b) =>
    (st.maxHp < 140 * Math.max(1, st._stage / 6)
      ? pickBy(cards, ['vigor', 'plate', 'stoic', 'renew'], b)
      : pickBy(cards, ['might', 'brutal', 'keen', 'swift'], b)),
  // Always the most expensive thing affordable — a proxy for "best card".
  richest: (cards, st, budget) => {
    let best = -1;
    cards.forEach((c, i) => {
      if (c.cost <= budget && (best < 0 || c.cost > cards[best].cost)) best = i;
    });
    return best < 0 ? 0 : best;
  },
};

function pickBy(cards, wanted, budget) {
  const can = (c) => c.cost <= budget;
  for (const key of wanted) {
    const i = cards.findIndex(c => (c.key === key || c.id === key) && can(c));
    if (i >= 0) return i;
  }
  const fallback = cards.findIndex(can);
  return fallback >= 0 ? fallback : 0;
}

/** One run. Returns the stage reached when the hero first died. */
function playRun(strategy) {
  const S = {
    hero: makeHero(),
    gear: { weapon: 0, armor: 0, ring: 0, amulet: 0 },
    equipped: startingKit(),
    perks: {},
    // rollDraft reads the loadout to decide whether an ability card has a hand
    // to go into, so the sim carries the same starting pair the game does.
    loadout: ['cleave', 'mend'],
    skulls: 0,
    stage: 1,
    wavesSinceDrop: 0,
    wavesSinceBoss: 0,
    pot: 0,
  };
  // Sweepable: the hero's own base numbers are part of the balance too, and
  // the Forge used to be most of their early growth.
  if (process.env.BASE_DMG) S.hero.baseDmg = Number(process.env.BASE_DMG);
  if (process.env.BASE_HP) S.hero.baseHp = Number(process.env.BASE_HP);
  const stats = () => heroStats(S.hero, S.gear, S.perks, S.equipped);
  S.hero.hp = stats().maxHp;

  let bossesKilled = 0, cardsTaken = 0, spent = 0;

  // The opening hand, before anything spawns.
  for (let i = 0; i < OPENING_PICKS; i++) draft(S, strategy, stats, () => cardsTaken++, (n) => spent += n);

  for (let guard = 0; guard < 400; guard++) {
    const boss = S.wavesSinceBoss >= WAVES_PER_BOSS;
    const result = fightWave(S, stats, boss);
    if (process.env.TRACE) {
      const st = stats();
      console.log(`stage ${S.stage} lvl ${S.hero.level} dmg ${st.dmg} hp ${Math.round(S.hero.hp)}/${st.maxHp}`
        + ` armor ${st.armor} skulls ${S.skulls} -> ${result.survived ? 'won' : 'DIED (' + result.cause + ')'}`
        + ` after ${result.t ? result.t.toFixed(1) : '?'}s vs ${result.foes} foes`);
    }
    if (!result.survived) {
      return { stage: S.stage, bossesKilled, cardsTaken, spent, cause: result.cause };
    }

    if (boss) {
      S.wavesSinceBoss = 0;
      bossesKilled++;
      // The chest. Wear anything better than what is already on.
      for (const it of rollBossLoot(Math.max(1, Math.ceil(S.stage / 3)))) {
        const worn = S.equipped[it.slot];
        if (!worn || itemScore(it) > itemScore(worn)) S.equipped[it.slot] = it;
      }
    } else S.wavesSinceBoss++;

    // Out of combat the hero stands easy and closes up small wounds: `idleStep`
    // gives 5% of the pool a second, and between two waves there is the lull,
    // the walk in, and often a coffin and a card screen. Leaving this out is
    // what pinned every run to stage 3 — damage simply accumulated for ever.
    const idle = 1 + 3.5;                        // the lull, then the entry walk
    S.hero.hp = Math.min(stats().maxHp, S.hero.hp + stats().maxHp * 0.05 * idle);
    S.pot += result.skulls;

    if (++S.wavesSinceDrop >= WAVES_PER_DROP) {
      S.wavesSinceDrop = 0;
      // The coffin. The real minigame pays a multiplier by skill; 2.4x is the
      // middle of the ladder and is what an average player takes home.
      S.skulls += Math.round(S.pot * 2.4);
      S.pot = 0;
      // A new map is walked into fresh. Without this the hero's health only
      // ever declines — a wave costs more than the lull gives back — so every
      // run is a slow slide to a death that no card can prevent, and the
      // 3-wave map becomes the real unit of attrition instead of the run.
      if (process.env.NO_MAP_HEAL) {
        S.hero.hp = Math.min(stats().maxHp, S.hero.hp + stats().maxHp * 0.05 * 12);
      } else {
        S.hero.hp = stats().maxHp;
      }
      draft(S, strategy, stats, () => cardsTaken++, (n) => spent += n);
    }
    S.stage++;
  }
  return { stage: S.stage, bossesKilled, cardsTaken, spent, cause: 'ran out of road' };
}

function draft(S, strategy, stats, onTake, onSpend) {
  const st = stats();
  const cards = rollDraft(S, S.skulls, S.hero.hp / st.maxHp);
  if (!cards || !cards.length) return;
  st._stage = S.stage;
  const i = STRATEGIES[strategy](cards, st, S.skulls);
  const card = cards[i];
  if (process.env.TRACE) {
    console.log(`  draft: purse ${S.skulls} offered ${cards.map(c => `${c.id}@${c.cost}`).join(', ')}`
      + ` -> ${card ? card.id : 'nothing'}${card && card.cost > S.skulls ? ' (CANNOT AFFORD)' : ''}`);
  }
  if (!card || card.cost > S.skulls) return;
  S.skulls -= card.cost;
  onSpend(card.cost);
  applyCard(S, card);
  onTake();
}

/**
 * Resolve one wave as pools of damage.
 *
 * Not a positional fight: the hero swings at one body at a time and takes hits
 * from however many can reach them. That is the shape of the real thing — a
 * leashed hero holding a mark against a crowd — without the pathing.
 */
function fightWave(S, stats, isBoss) {
  const st = stats();
  const th = threat(st, S.stage);
  const foes = [];

  if (isBoss) {
    foes.push(makeBoss(S.stage, { x: 0, y: 0 }, th));
  } else {
    const f = formationFor(S.stage);
    const roster = rosterFor(S.stage);
    const pool = f.pick(roster);
    const n = waveSize(S.stage, f.count);
    for (let i = 0; i < n; i++) {
      const m = makeMonster(pool[Math.floor(rnd() * pool.length)], S.stage,
        { x: 0, y: 0 }, f.champion && i === 0, th);
      // Waves arrive in a trickle, not all at once — `pumpSpawns` releases one
      // body every `gap` seconds and they still have to walk in. Modelling them
      // as a single instantaneous crowd made the sim far harsher than the game
      // and would have had me nerfing a difficulty that does not exist.
      m._at = 0.35 + i * ((f.gap || 0.8) + 0.7);
      foes.push(m);
    }
  }

  let skulls = 0, t = 0;
  let swing = 0, cleaveCd = 0, mendCd = 0;
  const cd = (base) => base * (1 - st.cdr);

  while (t < WAVE_TIMEOUT) {
    t += TICK;
    // Only what has actually arrived and is still standing.
    const alive = foes.filter(m => m.hp > 0 && t >= (m._at || 0));
    const pending = foes.some(m => m.hp > 0 && t < (m._at || 0));
    if (!alive.length && !pending) break;
    if (!alive.length) continue;

    // --- the hero acts ------------------------------------------------------
    swing -= TICK; cleaveCd -= TICK; mendCd -= TICK;
    if (swing <= 0) {
      swing = st.atkSpeed;
      const crit = rnd() < st.crit;
      const dmg = st.dmg * (crit ? st.critMult : 1) * (0.9 + rnd() * 0.2);
      hit(alive[0], dmg);
      if (st.lifesteal) S.hero.hp = Math.min(st.maxHp, S.hero.hp + dmg * st.lifesteal);
    }
    // Cleave, on cooldown, into everything that can reach — the same reason a
    // player presses it: a crowd.
    if (cleaveCd <= 0) {
      cleaveCd = cd(8);
      for (const m of alive.slice(0, MELEE_SLOTS)) hit(m, st.dmg * 2.2);
    }
    // Mend when it would not be wasted.
    if (mendCd <= 0 && S.hero.hp < st.maxHp * 0.55) {
      mendCd = cd(18);
      S.hero.hp = Math.min(st.maxHp, S.hero.hp + st.maxHp * 0.4);
    }
    if (st.regen) S.hero.hp = Math.min(st.maxHp, S.hero.hp + st.maxHp * st.regen * TICK);

    // --- and takes what is coming ------------------------------------------
    const engaged = alive.slice(0, isBoss ? 1 : MELEE_SLOTS);
    for (const m of engaged) {
      // A bloater is not a melee unit: it sprints in, bursts once for 1.6x its
      // damage, and is gone. Modelling it as something that keeps swinging made
      // stage 8 — where bloaters unlock — a wall that every run hit at exactly
      // the same depth no matter what the curve was set to, which is what a
      // model error looks like when it is mistaken for a balance problem.
      if (m.ai === 'exploder') {
        m._fuse = (m._fuse === undefined ? 0.8 : m._fuse) - TICK;
        if (m._fuse <= 0) {
          const raw = m.dmg * 1.6
            * (1 - st.armor / (st.armor + 55))
            * st.mitigate;
          S.hero.hp -= Math.max(1, Math.min(raw, st.maxHp * MAX_HIT_FRACTION));
          m.hp = 0;
        }
        continue;
      }
      m._atk = (m._atk || rnd() * m.atk) - TICK;
      if (m._atk > 0) continue;
      m._atk = m.atk;
      const raw = m.dmg
        * (1 - st.armor / (st.armor + 55))
        * st.mitigate;
      S.hero.hp -= Math.max(1, Math.min(raw, st.maxHp * MAX_HIT_FRACTION));
    }
    if (S.hero.hp <= 0) return { survived: false, cause: isBoss ? 'boss' : 'wave', skulls, t, foes: foes.length };
  }

  if (t >= WAVE_TIMEOUT) return { survived: false, cause: 'stalled', skulls, t, foes: foes.length };

  // Experience, and the levels it buys. Omitting this made the sim far harsher
  // than the game: levels are most of a hero's early growth, and a model that
  // leaves them out will tell you to make the road easier than it needs to be.
  for (const m of foes) {
    skulls += Math.round((m.skulls || 0) * st.skullMul);
    S.hero.xp += m.xp || 0;
  }
  while (S.hero.xp >= S.hero.xpNext) {
    S.hero.xp -= S.hero.xpNext;
    S.hero.level++;
    S.hero.xpNext = Math.round(S.hero.xpNext * 1.36);
    S.hero.hp = stats().maxHp;             // a level fills the pool, as in game
  }
  // Field Dressing pays out on the last body dropping.
  if (st.dressing) S.hero.hp = Math.min(st.maxHp, S.hero.hp + st.maxHp * st.dressing);
  return { survived: true, skulls, t, foes: foes.length };

  function hit(m, dmg) {
    m.hp -= dmg * (1 - (m.armor || 0) / ((m.armor || 0) + 55));
  }
}

// ------------------------------------------------------------------ report --
const pct = (xs, p) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * p))];
};
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);

const names = ONLY ? [ONLY] : Object.keys(STRATEGIES);
const rows = [];
for (const name of names) {
  seed = SEED >>> 0;                       // every strategy meets the same road
  const runs = Array.from({ length: RUNS }, () => playRun(name));
  const depth = runs.map(r => r.stage);
  const causes = {};
  for (const r of runs) causes[r.cause] = (causes[r.cause] || 0) + 1;
  rows.push({
    strategy: name,
    median: pct(depth, 0.5),
    mean: +mean(depth).toFixed(1),
    p10: pct(depth, 0.1),
    p90: pct(depth, 0.9),
    'reached boss %': +(100 * runs.filter(r => r.bossesKilled > 0).length / RUNS).toFixed(1),
    'bosses (mean)': +mean(runs.map(r => r.bossesKilled)).toFixed(2),
    'cards (mean)': +mean(runs.map(r => r.cardsTaken)).toFixed(1),
    stalled: causes.stalled || 0,
  });
}

console.log(`\n${RUNS} runs per strategy · seed ${SEED}`);
console.table(rows);

/**
 * The verdict, read off the mean rather than the median.
 *
 * Depth is bimodal: most runs end at the first boss, and the ones that get past
 * it run a very long way. The median therefore sits on the boss wave for every
 * strategy and reports "no difference" while the means are three and four times
 * apart — which is exactly the mistake this harness made until the numbers were
 * looked at properly. Mean depth and bosses killed are what carry the signal.
 */
const byMean = [...rows].sort((a, b) => b.mean - a.mean);
const best = byMean[0], worst = byMean[byMean.length - 1];
const spread = worst.mean ? best.mean / worst.mean : 0;
console.log(
  `\nBest: ${best.strategy} (mean depth ${best.mean}, ${best['bosses (mean)']} bosses) · `
  + `worst: ${worst.strategy} (${worst.mean}) · spread ${spread.toFixed(2)}x`);
console.log(
  spread >= 1.5
    ? 'The draft decides runs: picking well goes meaningfully deeper.'
    : 'The draft is NOT deciding runs: every strategy lands in the same place.\n'
      + 'Lower HP_FROM_DPS in js/balance.js so damage cards buy more, or widen\n'
      + 'the gap between card tiers.');
if (rows.some(r => r.stalled)) console.log('Some waves timed out — see `stalled`.');
