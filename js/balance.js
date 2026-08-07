// How hard the road pushes back.
//
// Its own module for one reason: the simulator in `tools/sim.mjs` tunes these
// numbers over hundreds of runs, and a formula that existed in two places would
// be tuned in one of them. Everything here is pure — no DOM, no state — so both
// the game and the harness call exactly the same code.

import { clamp } from './iso.js';

// A fresh level-1 hero in the starting kit. Every multiplier below is measured
// against this hero, so "1.0" means "as dangerous as the first wave of a run".
export const REF_DPS = 12;
export const REF_EHP = 105;

/** Damage per second, counting crits and swing speed. */
export const heroDps = (st) =>
  (st.dmg * (1 + st.crit * (st.critMult - 1))) / Math.max(0.2, st.atkSpeed);

/** Life that actually has to be chewed through, counting armour and mitigation. */
export const heroEhp = (st) =>
  (st.maxHp * (1 + st.armor / 55)) / Math.max(0.2, st.mitigate);

/**
 * The multipliers a monster is built with, from the hero it is being sent at.
 *
 * Depth is what makes the road harder; the hero's own numbers only *temper*
 * that, so an over-geared run still meets something worth swinging at and an
 * under-geared one is not handed a wall.
 *
 * **The exponents are the entire balance of the game.** They decide whether a
 * card is worth taking. At `HP_FROM_DPS = 0.45`, a hero who doubles their
 * damage makes enemies 1.37x tougher and still kills 27% faster — that margin
 * is what a good draft buys, and it compounds every wave. Push it to 1.0 and
 * enemies scale exactly with you: every card becomes decoration and the run is
 * decided by nothing. Push it to 0 and the draft stops mattering the other way,
 * because raw depth never catches up with you.
 */
// Overridable from the environment so `tools/sim.mjs` can sweep them without
// editing this file; in the browser `process` does not exist and the defaults
// below are what ships.
const dial = (key, value) =>
  (typeof process !== 'undefined' && process.env && process.env[key] !== undefined
    ? Number(process.env[key])
    : value);

// Enemy health tracks the hero's damage, so a wave never becomes a formality.
export const HP_FROM_DPS = dial('HP_FROM_DPS', 0.45);
/**
 * Enemy damage does NOT track the hero's toughness — deliberately zero.
 *
 * It used to, and that was the quiet reason nothing a player did mattered:
 * `heroEhp` counts armour and life, so buying either made every enemy hit
 * harder in exact proportion. Both axes cancelled player investment, the game
 * became self-balancing to the point of being static, and every strategy died
 * at the same depth however the other dials were set. Health scales with you;
 * how hard you are hit is a fact about the road.
 */
export const DMG_FROM_EHP = dial('DMG_FROM_EHP', 0);
/**
 * How fast the road gets worse. Both were far steeper — 0.55 and 0.45 — which
 * was tuned for a game that sold plate and blades in the armoury. With that
 * gone the hero's power budget went with it, and the curve was climbing at
 * roughly eight times the rate the hero could grow: every run died on the third
 * wave, before a single card had been bought. Measured over 36 settings and
 * thousands of headless runs in tools/sweep.mjs.
 */
export const HP_FROM_STAGE = dial('HP_FROM_STAGE', 0.14);
export const DMG_FROM_STAGE = dial('DMG_FROM_STAGE', 0.06);
// How fast a wave grows. Lives here rather than in game.js because it is part
// of the same curve: bodies on the ground are difficulty just as much as the
// health in them.
export const WAVE_GROWTH = dial('WAVE_GROWTH', 0.20);
export const waveSize = (stage, count) =>
  Math.max(2, Math.round((3 + Math.floor(stage * WAVE_GROWTH)) * count));

export function threat(st, stage) {
  const s = Math.max(1, stage);
  return {
    hp: clamp(Math.pow(heroDps(st) / REF_DPS, HP_FROM_DPS), 0.7, 30) * Math.pow(s, HP_FROM_STAGE),
    dmg: clamp(Math.pow(heroEhp(st) / REF_EHP, DMG_FROM_EHP), 0.7, 18) * Math.pow(s, DMG_FROM_STAGE),
  };
}

/**
 * Hard, never hopeless: no single blow takes more than this much of a full
 * pool, whatever the arithmetic says. There is always a hit to survive and a
 * cooldown to answer with — a run should be lost to a bad draft, not to a
 * number nobody could have seen coming.
 */
export const MAX_HIT_FRACTION = 0.5;
