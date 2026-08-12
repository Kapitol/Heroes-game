// What a proc rate should be, measured rather than guessed.
//
//   node tools/proc-math.mjs
//
// The skill tree's tier 3, 4 and 5 abilities all fire on a rate — "every few
// attacks", "randomly on the utility skill" — and a rate is only meaningful
// against the fight it fires in. Twelve attacks is once a wave at level 10 and
// three times a wave at level 40; the same number is a different ability at
// each end of the game. So this measures the fights first and sets the rates
// afterwards.
//
// **Everything about the hero, the monsters and the curve is imported from the
// game.** The fight loop is the one thing modelled here, and it mirrors
// `fightWave` in tools/sim.mjs deliberately: one hero swinging at one body at
// a time while up to `MELEE_SLOTS` of them swing back. If that model is wrong
// the sim is wrong in the same direction, which is the useful property — these
// numbers can be compared with that harness rather than argued with.

import { makeHero, heroStats } from '../js/entities.js';
import { makeMonster, makeBoss, rosterFor, formationFor } from '../js/encounters.js';
import { threat, waveSize, MAX_HIT_FRACTION } from '../js/balance.js';
import { rollItem, SLOTS } from '../js/items.js';

const TICK = 0.05;
const MELEE_SLOTS = 4;        // how many bodies can reach the hero at once
const RUNS = 400;             // per sample point, to average the dice out

// Deterministic dice, so two runs of this file are two runs of the same game.
let seed = 20260811;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

/**
 * The stage a hero of this level is standing on.
 *
 * Levels and depth are not independent — the road is what pays the experience
 * — so a level-40 hero measured against stage 1 monsters is a hero who does
 * not exist. Taken from the shipped curve: a stage is six sections of three to
 * four waves, and the sim's runs put a hero around level 10 by stage 3 and 50
 * near the end of the road.
 */
const stageForLevel = (lvl) => Math.max(1, Math.round(1 + (lvl - 1) * 0.62));

/**
 * A hero at `lvl`, geared as a run of that depth would have him.
 *
 * `gear` is the four bought tracks — the shape `heroStats` wants, not the
 * looted `equipped` map, which is a different thing under a similar name and
 * cost me a table of NaN before I looked. Both are supplied: the tracks grow
 * with the road, and the worn items are rolled at a band that keeps pace.
 */
function heroAt(lvl) {
  const h = makeHero();
  h.level = lvl;
  const step = 1 + Math.floor(lvl / 6);
  const gear = { weapon: step, armor: step, ring: step, amulet: step };
  const band = ['gray', 'green', 'blue', 'purple', 'gold'][Math.min(4, Math.floor(lvl / 11))];
  const equipped = {};
  for (const s of SLOTS) equipped[s.key] = rollItem(s.key, lvl, band);
  const perks = {};
  return { h, gear, perks, st: heroStats(h, gear, perks, equipped) };
}

/**
 * One fight, resolved. Returns what the tree needs to know: how long it ran,
 * how many times the hero swung, and how much damage he took while doing it.
 */
function fight(lvl, isBoss) {
  const { h, gear, perks, st } = heroAt(lvl);
  const stage = stageForLevel(lvl);
  const th = threat(st, stage);
  const foes = [];

  if (isBoss) {
    foes.push(makeBoss(stage, { x: 0, y: 0 }, th));
  } else {
    const f = formationFor(stage);
    const pool = f.pick(rosterFor(stage));
    const n = waveSize(stage, f.count);
    for (let i = 0; i < n; i++) {
      const m = makeMonster(pool[Math.floor(rnd() * pool.length)], stage,
        { x: 0, y: 0 }, f.champion && i === 0, th);
      m._at = 0.35 + i * ((f.gap || 0.8) + 0.7);
      foes.push(m);
    }
  }

  let t = 0, swing = 0, attacks = 0, taken = 0, hp = st.maxHp;
  while (t < 120) {
    t += TICK;
    const alive = foes.filter((m) => m.hp > 0 && t >= (m._at || 0));
    const pending = foes.some((m) => m.hp > 0 && t < (m._at || 0));
    if (!alive.length && !pending) break;
    if (!alive.length) continue;

    swing -= TICK;
    if (swing <= 0) {
      swing = st.atkSpeed;
      attacks += 1;
      const crit = rnd() < st.crit;
      alive[0].hp -= st.dmg * (crit ? st.critMult : 1) * (0.9 + rnd() * 0.2);
    }

    for (const m of alive.slice(0, isBoss ? 1 : MELEE_SLOTS)) {
      m._atk = (m._atk === undefined ? rnd() * m.atk : m._atk) - TICK;
      if (m._atk > 0) continue;
      m._atk = m.atk;
      const raw = m.dmg * (1 - st.armor / (st.armor + 55)) * st.mitigate;
      const dealt = Math.max(1, Math.min(raw, st.maxHp * MAX_HIT_FRACTION));
      taken += dealt; hp -= dealt;
    }
    // Not a survival test — the question is the *shape* of a fight, and a
    // fight that ends early because the model has no Mend in it would answer a
    // different one. The hero is held up and the damage is counted instead.
    if (hp <= 0) hp = st.maxHp;
  }
  return { t, attacks, taken, dps: taken / Math.max(0.1, t), maxHp: st.maxHp, st };
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

function sample(lvl, isBoss) {
  const runs = Array.from({ length: RUNS }, () => fight(lvl, isBoss));
  return {
    lvl,
    stage: stageForLevel(lvl),
    secs: mean(runs.map((r) => r.t)),
    attacks: mean(runs.map((r) => r.attacks)),
    incoming: mean(runs.map((r) => r.dps)),
    hpFrac: mean(runs.map((r) => r.dps / r.maxHp)),   // pool-fractions per second
    interval: runs[0].st.atkSpeed,
  };
}

const LEVELS = [10, 20, 30, 40, 50];
const pad = (v, n) => String(v).padStart(n);
const f1 = (v) => v.toFixed(1);
const f2 = (v) => v.toFixed(2);

console.log('\nWAVE — the ordinary fight, which is most of the game');
console.log('lvl  stage  secs  attacks  swing  incoming/s  %pool/s');
const waves = LEVELS.map((l) => sample(l, false));
for (const r of waves) {
  console.log(`${pad(r.lvl, 3)}  ${pad(r.stage, 5)}  ${pad(f1(r.secs), 4)}  ${pad(f1(r.attacks), 7)}`
    + `  ${pad(f2(r.interval), 5)}  ${pad(f1(r.incoming), 10)}  ${pad(f1(r.hpFrac * 100), 7)}`);
}

console.log('\nBOSS — the fight the abilities are actually for');
console.log('lvl  stage  secs  attacks  swing  incoming/s  %pool/s');
const bosses = LEVELS.map((l) => sample(l, true));
for (const r of bosses) {
  console.log(`${pad(r.lvl, 3)}  ${pad(r.stage, 5)}  ${pad(f1(r.secs), 4)}  ${pad(f1(r.attacks), 7)}`
    + `  ${pad(f2(r.interval), 5)}  ${pad(f1(r.incoming), 10)}  ${pad(f1(r.hpFrac * 100), 7)}`);
}

// ── what the numbers say the rates should be ────────────────────────────────
//
// The design targets, stated before the arithmetic so they can be disagreed
// with separately from it:
//
//   tier 5   twice in a boss fight, and not every wave — it is the capstone,
//            and a capstone that fires constantly is a passive with a cutscene
//   tier 3   once per boss fight, roughly — a full heal on tap more often than
//            that removes the fight
//   tier 4   about a third of utility casts, so pressing the button is a
//            gamble worth watching rather than a routine
const wAtk = mean(waves.map((r) => r.attacks));
const bAtk = mean(bosses.map((r) => r.attacks));
const bSecs = mean(bosses.map((r) => r.secs));

console.log('\nRATES');
console.log(`  mean attacks per wave fight  ${f1(wAtk)}`);
console.log(`  mean attacks per boss fight  ${f1(bAtk)}`);
console.log(`  mean boss fight length       ${f1(bSecs)}s`);
console.log(`\n  tier 5 — every ${Math.round(bAtk / 2)} attacks`
  + `  (≈2 per boss, ≈${f1(wAtk / Math.round(bAtk / 2))} per wave)`);
console.log(`  tier 3 — cooldown ${Math.round(bSecs)}s`
  + `  (≈1 per boss fight)`);
console.log(`  tier 4 — 33% chance per utility cast`);
