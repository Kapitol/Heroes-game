// Crypt Heroes.
//
// One road, walked forever. The hero marches, an encounter blocks the way, the
// hero fights it on their own, the spoils scatter and you grab them, and then
// three cards decide what the hero becomes. The player's hands are on the
// skills, the drop and the cards — never on the walking.

import { biomeFor, levelFor, ROAD, onRoad, HALF, MARCH } from './world.js';
import { toWorld, clamp, lerp } from './iso.js';
import { makeHero, heroStats, moveToward, faceTo, separate, nearestFoe } from './entities.js';
import {
  MONSTERS, makeMonster, makeBoss, rosterFor, formationFor, isBossStage, bossFor,
} from './encounters.js';
import { makeCamera, render, fitZoom } from './render.js';
import { SKILLS, skillById, rollDraft, applyCard, MAX_SKILLS } from './perks.js';
import * as UI from './ui.js';
import * as Audio from './audio.js';
import * as Coffin from './coffin.js';

const SAVE_KEY = 'cryptheroes.v3';

// Dev hook: ?spawn=archer fills every wave with one monster key, which is the
// only practical way to look at a specific creature's art on demand — waves
// are rolled from a weighted roster and a given type may not show for minutes.
// Ignored unless the key names a real monster.
const DEV_SPAWN = new URLSearchParams(location.search).get('spawn');

// Dev hook: ?drop drops you straight into the payout minigame with a fixed
// pot, and loops it, so it can be tuned without fighting a wave for every
// attempt. ?drop=500 sets the pot.
const DEV_DROP = new URLSearchParams(location.search).has('drop')
  ? Math.max(1, Number(new URLSearchParams(location.search).get('drop')) || 250)
  : null;
const LEASH = 1.9;          // how far the hero will step off their mark

// How many waves the hero clears between one set of cards and the next. A card
// after every single drop made every wave the same shape and left nothing to
// walk towards; five means a card is an event you can see coming. This is the
// pacing dial — when the enemies get harder later on, they will need cards more
// often and this comes down.
const WAVES_PER_DRAFT = 5;

// Waves between bosses. The old rule was "the last wave of every third
// section", which drifted with the 3–4 wave sections and could land anywhere
// from nine waves to twelve. Counting waves directly puts the boss on the
// thirteenth encounter, every time.
const WAVES_PER_BOSS = 12;

// Waves that fill the coffin before it goes down the shaft. The drop after
// every single wave made it routine — the whole point of it is that it is an
// event. Three waves' spoils go into one coffin instead, which costs the player
// nothing overall (the pot is the same skulls, just banked) and makes the drop
// worth three times as much when it comes.
const WAVES_PER_DROP = 3;

// The opening hand. A run starts with nothing bought and nothing learned, which
// is the hardest the game ever is relative to the hero — so it opens on the card
// screen instead of a fight. Everything at tier 1 is Gray, and Gray is free, so
// these cost nothing and the purse still starts empty.
const OPENING_PICKS = 2;

const cv = document.getElementById('game');
const ctx = cv.getContext('2d');

const S = {
  dpr: 1, cam: makeCamera(), view: null,
  biome: biomeFor(1),
  hero: makeHero(),
  monsters: [], projectiles: [], effects: [], floats: [], stains: [],
  drop: null,
  skulls: 0, gear: { weapon: 0, armor: 0, ring: 0, amulet: 0 },
  perks: {}, loadout: ['cleave', 'mend'], cd: [0, 0, 0, 0],
  // `stage` is the global encounter count and drives every difficulty curve.
  // `section` and `wave` are how that gets presented and paced: a section is
  // 3–4 waves and is one named Level. Cards and bosses are counted in waves
  // instead — see WAVES_PER_DRAFT and WAVES_PER_BOSS — so neither drifts with
  // the 3-or-4 roll.
  stage: 1, section: 1, wave: 1, wavesInSection: 3,
  phase: 'march', phaseT: 0,
  queue: [], spawnTimer: 0, waveTotal: 0, formation: null,
  marchTo: 0, draft: null, draftAfter: null, lastDrop: 0,
  wavesSinceDraft: 0, wavesSinceBoss: 0, wavesSinceDrop: 0, pot: 0,
  openingPicks: 0, openingDone: false,
  kills: 0, earned: 0, deaths: 0, best: 1,
  running: false, paused: false, reviveTimer: 0, time: 0,
};

// --- setup ------------------------------------------------------------------

function resize() {
  S.dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.floor(window.innerWidth * S.dpr);
  cv.height = Math.floor(window.innerHeight * S.dpr);
  S.cam.zoom = fitZoom(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);
resize();

UI.init(S, {
  start() {
    Audio.init(); Audio.resume();
    S.running = true;
    UI.banner(levelFor(S.section));
    // A fresh run opens on the cards rather than a fight.
    if (!S.openingDone) { S.openingPicks = OPENING_PICKS; openDraft('opening'); }
  },
  skill: castSkill,
  buy: buyGear,
  draftPick: takeCard,
  draftSkip: skipDraft,
  draftReroll: rerollDraft,
  pause: togglePause,
  reset() { localStorage.removeItem(SAVE_KEY); location.reload(); },
});

load();
enterStage(S.stage, true);
UI.rebuildRunes();
UI.refreshPanels();

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k >= '1' && k <= '4') castSkill(+k - 1);
  else if (k === 'e') UI.togglePanel('gearPanel');
  else if (S.phase === 'drop' && S.drop && (k === 'a' || e.code === 'ArrowLeft')) { e.preventDefault(); Coffin.nudge(S.drop, -1); }
  else if (S.phase === 'drop' && S.drop && (k === 'd' || e.code === 'ArrowRight')) { e.preventDefault(); Coffin.nudge(S.drop, 1); }
  else if (e.code === 'Space' && S.phase === 'drop' && S.drop) { e.preventDefault(); Coffin.release(S.drop); }
  else if (k === 'p' || e.code === 'Space') { e.preventDefault(); togglePause(); }
  else if (k === 'escape') UI.togglePanel('menuPanel');
});

// Pointer input belongs entirely to the Coffin Drop: drag to pick the lane,
// let go to commit.
const dropX = (e) => e.clientX - cv.getBoundingClientRect().left;
cv.addEventListener('pointerdown', (e) => {
  Audio.resume();
  if (S.phase === 'drop' && S.drop) Coffin.aim(S.drop, dropX(e));
});
cv.addEventListener('pointermove', (e) => {
  if (S.phase === 'drop' && S.drop && e.buttons) Coffin.aim(S.drop, dropX(e));
});
// Deliberately not `pointerleave`: the canvas is the whole window, and sliding
// a finger or cursor off its edge while lining up a lane would commit the drop
// by accident.
for (const ev of ['pointerup', 'pointercancel']) {
  cv.addEventListener(ev, () => {
    if (S.phase === 'drop' && S.drop) Coffin.release(S.drop);
  });
}

function togglePause(force) {
  if (!S.running) return;
  S.paused = force === undefined ? !S.paused : !!force;
  UI.showPaused(S.paused);
  if (!S.paused) Audio.resume();
}

// --- stages -----------------------------------------------------------------

function enterStage(stage, silent) {
  const prevBiome = S.biome;
  S.biome = biomeFor(S.section);
  S.best = Math.max(S.best, S.section);
  S.phase = 'march';
  S.phaseT = 0;
  S.marchTo = S.hero.x + MARCH;
  S.monsters.length = 0;
  S.projectiles.length = 0;
  S.queue.length = 0;
  if (S.stains.length > 14) S.stains.splice(0, S.stains.length - 14);
  if (!silent && S.biome !== prevBiome) UI.toast(S.biome.name, 2.4);
}

// A boss stands in the road once this many waves have gone by, wherever that
// falls in a section. Tying it to the section boundary let the 3-or-4 wave
// roll shift it around by a third.
const isBossWave = () => S.wavesSinceBoss >= WAVES_PER_BOSS;

function beginEncounter() {
  S.phase = 'fight';
  S.phaseT = 0;
  S.hero.anchor = { x: S.hero.x, y: S.hero.y };
  S.queue.length = 0;
  S.spawnTimer = 0.35;

  if (isBossWave()) {
    S.formation = { id: 'boss', name: bossFor(S.stage).name, gap: 0 };
    S.queue.push({ boss: true });
    S.waveTotal = 1;
    UI.banner(bossFor(S.stage).name.toUpperCase());
    Audio.sfx.boss();
    S.cam.shake = 1;
    return;
  }

  const f = formationFor(S.stage);
  S.formation = f;
  const roster = rosterFor(S.stage);
  const pool = DEV_SPAWN && MONSTERS[DEV_SPAWN] ? [DEV_SPAWN] : f.pick(roster);
  const base = 3 + Math.floor(S.stage * 0.45);
  const n = Math.max(2, Math.round(base * f.count));

  for (let i = 0; i < n; i++) {
    S.queue.push({
      key: pool[Math.floor(Math.random() * pool.length)],
      behind: f.sides && i % 3 === 2,
      champion: f.champion && i === 0,
    });
  }
  S.waveTotal = n;
  UI.toast(f.name);
}

function pumpSpawns(dt) {
  if (!S.queue.length) return;
  S.spawnTimer -= dt;
  if (S.spawnTimer > 0) return;

  const spec = S.queue.shift();
  const ahead = spec.behind ? -1 : 1;
  const pos = onRoad({
    x: S.hero.x + ahead * (8.5 + Math.random() * 3),
    y: (Math.random() - 0.5) * (HALF * 1.7),
  });
  const m = spec.boss ? makeBoss(S.stage, pos) : makeMonster(spec.key, S.stage, pos, spec.champion);
  if (spec.champion) UI.toast('A champion!');
  S.monsters.push(m);
  S.spawnTimer = S.formation.gap || 0.75;
}

// --- combat helpers ---------------------------------------------------------

function float(x, y, text, color, big) {
  S.floats.push({
    x, y, text, color, big: !!big, life: 1.05, max: 1.05,
    ox: (Math.random() - 0.5) * 26, oy: (Math.random() - 0.5) * 10,
  });
  if (S.floats.length > 60) S.floats.shift();
}

function effect(type, x, y, r, dur, a) {
  S.effects.push({ type, x, y, r: r || 1, life: dur, max: dur, a: a || 0 });
}

const stats = () => heroStats(S.hero, S.gear, S.perks);

function hurtMonster(m, amount, crit) {
  if (m.dead) return;
  const dealt = m.armor ? amount * (1 - m.armor / (m.armor + 60)) : amount;
  m.hp -= dealt;
  m.hurt = 1;
  float(m.x, m.y, crit ? `${Math.round(dealt)}!` : `${Math.round(dealt)}`,
        crit ? '#ffd76a' : '#f0e6d2', crit);
  Audio.sfx[crit ? 'crit' : 'hit']();
  if (m.boss && !m.enraged && m.hp <= m.maxHp * 0.3) {
    m.enraged = true;
    m.atk *= 0.65;
    m.speed *= 1.3;
    UI.banner('ENRAGED');
    S.cam.shake = 0.8;
    float(m.x, m.y, 'ENRAGED', '#ff5a3a', true);
  }
  if (m.hp <= 0) killMonster(m);
}

function killMonster(m) {
  m.dead = true;
  m.fade = 1;
  S.kills++;
  S.stains.push({ x: m.x, y: m.y, r: 9 * (m.scale || 1), a: 0.28, c: '90,14,10', seed: (m.x * 31 + m.y * 17) | 0 });
  if (S.stains.length > 24) S.stains.shift();

  // A bloater takes its neighbours with it whether or not it reached you.
  if (m.ai === 'exploder') detonate(m);

  m.dropSkulls = Math.round(m.skulls * (0.85 + Math.random() * 0.3));
  gainXp(m.xp);
  Audio.sfx[m.kind === 'skeleton' ? 'bones' : 'die']();
  if (m.boss) { S.cam.shake = 1.1; UI.banner('SLAIN'); }
}

function detonate(m) {
  effect('boom', m.x, m.y, 2.8, 0.5);
  Audio.sfx.boom();
  S.cam.shake = Math.max(S.cam.shake, 0.5);
  const h = S.hero;
  if (!h.dead && Math.hypot(h.x - m.x, h.y - m.y) <= 2.4) hurtHero(m.dmg * 1.6);
  for (const o of S.monsters) {
    if (o === m || o.dead) continue;
    if (Math.hypot(o.x - m.x, o.y - m.y) <= 2.4) hurtMonster(o, m.dmg * 0.8, false);
  }
}

function gainXp(n) {
  const h = S.hero;
  h.xp += n;
  while (h.xp >= h.xpNext) {
    h.xp -= h.xpNext;
    h.level++;
    h.xpNext = Math.round(h.xpNext * 1.36);
    h.hp = stats().maxHp;
    Audio.sfx.levelUp();
    float(h.x, h.y, `LEVEL ${h.level}`, '#7fb0f0', true);
  }
}

function hurtHero(amount) {
  const h = S.hero;
  if (h.dead) return;
  const st = stats();
  const dealt = Math.max(1, amount
    * (1 - st.armor / (st.armor + 55))
    * st.mitigate
    * (h.buffs.ward > 0 ? 0.5 : 1));
  h.hp -= dealt;
  h.hurt = 1;
  float(h.x, h.y, `−${Math.round(dealt)}`, '#ff7a68');
  Audio.sfx.hurt();
  S.cam.shake = Math.max(S.cam.shake, Math.min(0.7, dealt / st.maxHp * 4));
  if (h.hp <= 0) heroDies();
}

function heroDies() {
  const h = S.hero;
  h.hp = 0;
  h.dead = true;
  h.deathAnim = 0;
  h.fade = 1;
  S.deaths++;
  const lost = Math.round(S.skulls * 0.15);
  S.skulls -= lost;
  S.reviveTimer = 3;
  Audio.sfx.die();
  S.cam.shake = 1.2;
  UI.showDeath(true, S.reviveTimer, lost);
  save();
}

function revive() {
  const h = S.hero;
  h.dead = false;
  h.hp = stats().maxHp;
  h.fade = 1;
  h.deathAnim = 0;
  h.target = null;
  // Fall back one stage rather than replaying the fight that just killed you.
  // A boss encounter contains nothing but the boss, so retrying it pays no
  // skulls and grants no card — the hero would be pinned against it forever.
  // Retreating puts a winnable, paying encounter in front of them instead.
  S.monsters.length = 0;
  S.projectiles.length = 0;
  S.queue.length = 0;
  // Fall back to the start of the section. Replaying the wave that killed you
  // would be a dead end on a boss wave — it pays no skulls on its own — and the
  // earlier waves of the section are what fund the gear to beat it.
  const fellAt = S.section;
  S.stage = Math.max(1, S.stage - (S.wave - 1) - 1);
  S.section = Math.max(1, S.section - (S.wave === 1 ? 1 : 0));
  S.wave = 1;
  UI.showDeath(false);
  UI.banner('RISEN');
  UI.toast(fellAt === S.section ? 'Back to the start of the section' : `Fell back to section ${S.section}`, 2.4);
  enterStage(S.stage);
}

// --- skills -----------------------------------------------------------------

function castSkill(slot) {
  if (!S.running || S.hero.dead || S.phase === 'draft') return;
  const id = S.loadout[slot];
  if (!id) return;
  if (S.cd[slot] > 0) { Audio.sfx.deny(); return; }
  const def = skillById(id);
  const h = S.hero, st = stats();
  S.cd[slot] = def.cd * (1 - st.cdr);
  UI.fireRune(slot);

  const foes = () => S.monsters.filter(m => !m.dead);

  switch (id) {
    case 'cleave': {
      effect('cleave', h.x, h.y, 3.2, 0.45);
      Audio.sfx.cleave();
      S.cam.shake = 0.4;
      let hit = 0;
      for (const m of foes()) if (Math.hypot(m.x - h.x, m.y - h.y) <= 3.2) { hurtMonster(m, st.dmg * 2.2); hit++; }
      if (!hit) float(h.x, h.y, 'whiff', '#9a8f7a');
      break;
    }
    case 'quake': {
      effect('quake', h.x, h.y, 4.4, 0.6);
      Audio.sfx.cleave();
      S.cam.shake = 0.6;
      for (const m of foes()) {
        if (Math.hypot(m.x - h.x, m.y - h.y) > 4.4) continue;
        hurtMonster(m, st.dmg * 1.8);
        m.slow = 3;
        // Quake is the answer to anything winding up: it breaks a charger's
        // dash outright and knocks a boss back down its cast bar.
        if (m.state === 'charge' || m.state === 'wind') { m.state = 'approach'; m.stateT = 0; }
        if (m.casting) {
          m.castT = Math.max(0, m.castT - 1.1);
          float(m.x, m.y, 'staggered', '#a8c8ff');
        }
      }
      break;
    }
    case 'fire': {
      const t = h.target && !h.target.dead ? h.target : nearestFoe(h, S.monsters, 22);
      if (!t) { float(h.x, h.y, 'no target', '#9a8f7a'); S.cd[slot] = 0.4; return; }
      S.projectiles.push({ proj: true, x: h.x, y: h.y, vx: 0, vy: 0, target: t, speed: 10, dmg: st.dmg * 2.8, splash: 2.6, life: 3, mine: true });
      Audio.sfx.fire();
      break;
    }
    case 'volley': {
      const list = foes();
      if (!list.length) { float(h.x, h.y, 'no target', '#9a8f7a'); S.cd[slot] = 0.4; return; }
      for (let i = 0; i < 5; i++) {
        const t = list[Math.floor(Math.random() * list.length)];
        S.projectiles.push({ proj: true, x: h.x, y: h.y, vx: 0, vy: 0, target: t, speed: 12, dmg: st.dmg * 0.9, splash: 1.1, life: 3, mine: true, delay: i * 0.09 });
      }
      Audio.sfx.fire();
      break;
    }
    case 'mend': {
      const heal = st.maxHp * 0.4;
      h.hp = Math.min(st.maxHp, h.hp + heal);
      effect('heal', h.x, h.y, 1, 0.9);
      float(h.x, h.y, `+${Math.round(heal)}`, '#8ce8a0', true);
      Audio.sfx.heal();
      break;
    }
    case 'frenzy':
      h.buffs.frenzy = 7;
      float(h.x, h.y, 'FRENZY', '#ffb84a', true);
      Audio.sfx.buff();
      break;
    case 'ward':
      h.buffs.ward = 6;
      effect('ward', h.x, h.y, 1, 0.9);
      float(h.x, h.y, 'WARDED', '#9fc0ff', true);
      Audio.sfx.buff();
      break;
  }
}

// --- economy ----------------------------------------------------------------

function buyGear(key) {
  const cost = UI.gearCost(S.gear, key);
  if (S.skulls < cost) { Audio.sfx.deny(); UI.toast('Not enough skulls'); return; }
  S.skulls -= cost;
  S.gear[key]++;
  if (key === 'armor') S.hero.hp = Math.min(stats().maxHp, S.hero.hp + 18);
  if (key === 'weapon' || key === 'armor') UI.toast(`${key === 'weapon' ? 'Blade' : 'Armour'} reforged`);
  Audio.sfx.buy();
  UI.refreshPanels();
  save();
}

function takeCard(i) {
  if (S.phase !== 'draft' || !S.draft) return;
  const card = S.draft[i];
  if (S.skulls < card.cost) {
    Audio.sfx.deny();
    UI.toast(`${card.name} costs ☠ ${card.cost}`);
    return;
  }
  S.skulls -= card.cost;
  applyCard(S, card);
  // A remedy acts now rather than changing the sheet, and the hero's maximum
  // is only known here — it is built from gear and perks together.
  if (card.type === 'remedy' && card.id === 'fullheal') S.hero.hp = stats().maxHp;
  Audio.sfx.levelUp();
  UI.toast(card.type === 'skill' ? `${card.name} learned`
         : card.type === 'remedy' ? `${card.name} — made whole`
         : `${card.name} taken`);
  UI.rebuildRunes();
  UI.refreshPanels();
  closeDraft();
}

// --- the payout game -------------------------------------------------------

function startDrop(forcedPot) {
  S.phase = 'drop';
  const pot = forcedPot || S.pot;
  S.pot = 0;
  clearBattlefield();
  if (pot <= 0) { S.drop = null; S.lastDrop = 0; afterWave(); return; }
  S.drop = Coffin.start(pot);
  Audio.sfx.descend();
}

function clearBattlefield() {
  S.monsters.length = 0;
  S.floats.length = 0;      // stale damage numbers would bleed through the shaft
  S.effects.length = 0;
}

/**
 * A wave is won. Bank its spoils, and send the coffin down only on the third.
 *
 * The skulls are not lost on the two waves in between — they go into the pot
 * the coffin is eventually loaded with, so the income curve is untouched and
 * the drop simply arrives three times heavier.
 */
function endWave() {
  const mul = stats().skullMul;
  for (const m of S.monsters) S.pot += Math.round((m.dropSkulls || 0) * mul);

  if (++S.wavesSinceDrop >= WAVES_PER_DROP) {
    S.wavesSinceDrop = 0;
    startDrop();
    return;
  }
  clearBattlefield();
  UI.toast(`☠ ${S.pot.toLocaleString()} into the coffin`);
  afterWave();
}

function updateDrop(dt) {
  const cw = cv.width / S.dpr, ch = cv.height / S.dpr;
  if (Coffin.update(S.drop, dt, cw, ch, Audio.sfx) === 'done') {
    const won = Coffin.payout(S.drop);
    // Held for the card screen: what this drop brought in, as distinct from
    // what is in the purse. Spending reads very differently when you can see
    // which of the two you are spending.
    S.lastDrop = won;
    S.skulls += won;
    S.earned += won;
    Audio.sfx.bank();
    UI.toast(`☠ ${won.toLocaleString()} recovered`);
    S.drop = null;
    afterWave();
  }
}

// Runs at the end of every wave, whether or not a coffin went down the shaft.
// This is where the two counters that pace the game are kept — the one towards
// the next set of cards and the one towards the next boss — and where the road
// is told to move on. What differs is only where it moves to: mid-section that
// is the next wave, at the end of one it is the next section.
function afterWave() {
  const after = S.wave < S.wavesInSection ? 'wave' : 'section';
  // A boss resets the count towards the next one; every other wave adds to it.
  if (S.formation && S.formation.id === 'boss') S.wavesSinceBoss = 0;
  else S.wavesSinceBoss++;

  if (++S.wavesSinceDraft >= WAVES_PER_DRAFT) {
    S.wavesSinceDraft = 0;
    openDraft(after);
    return;
  }
  advance(after);
}

// Where the road goes once the cards are done with — or straight away, on the
// four waves out of five that have no cards at all.
function advance(after) {
  if (after === 'section') nextSection();
  else nextWave();
}

function nextWave() {
  S.wave++;
  S.stage++;
  enterStage(S.stage);
  save();
}

// --- the draft --------------------------------------------------------------

// What another coffin costs to crack open. Flat, and cheap next to the cards
// themselves: rerolling is meant to be the thing you do when an offer misses,
// not a tax on getting a good one.
const REROLL_COST = 50;

function openDraft(after) {
  S.draftAfter = after;
  // The remedy is only worth a seat when there is life missing to restore.
  S.draft = rollDraft(S, S.skulls, S.hero.hp / stats().maxHp);
  // A purse that cannot reach the cheapest tier of anything gets no panel at
  // all. Three cards nobody can buy is a wall, not an offer.
  if (!S.draft.length) { S.draft = null; closeDraft(); return; }
  S.phase = 'draft';
  UI.showDraft(S.draft, S.skulls, S.lastDrop, REROLL_COST);
}

/**
 * Crack open another coffin: pay, and deal three fresh cards.
 *
 * The new offer is rolled against the purse *after* the fee, so what comes back
 * is honestly affordable — reroll down to your last few skulls and the coffins
 * start turning up Gray. That is also why this can never strand anyone: Gray is
 * free, so there is always something in the next one.
 */
function rerollDraft() {
  if (S.phase !== 'draft' || !S.draft) return;
  if (S.skulls < REROLL_COST) {
    Audio.sfx.deny();
    UI.toast(`A coffin costs ☠ ${REROLL_COST}`);
    return;
  }
  S.skulls -= REROLL_COST;
  S.draft = rollDraft(S, S.skulls, S.hero.hp / stats().maxHp);
  Audio.sfx.bones();
  UI.showDraft(S.draft, S.skulls, S.lastDrop, REROLL_COST);
  UI.refreshPanels();
}

// There is no clock on this screen and nothing that decides for you. The road
// waits: the only two ways out are taking a card or walking on, both of them
// the player's own hand. An earlier version counted down and bought the
// cheapest card by itself, which spent the run's skulls without being asked and
// made saving towards a dear card impossible.

// Take the offer down and go wherever the drop was headed.
function closeDraft() {
  const after = S.draftAfter;
  S.draft = null;
  S.draftAfter = null;
  UI.showDraft(null);

  // The opening hand deals itself again until the picks are used up, then hands
  // the hero to the road. It never advances a wave — the first fight has not
  // happened yet.
  if (after === 'opening') {
    if (--S.openingPicks > 0) { openDraft('opening'); return; }
    S.openingDone = true;
    S.phase = 'march';
    save();
    return;
  }

  // The dev loop covers drop *and* cards, since the cards are now part of the
  // same beat and picking one is what ends it.
  if (DEV_DROP) { startDrop(DEV_DROP); return; }
  advance(after);
}

// Advance past the section boundary. Everything that resets per section —
// the wave counter, its length, the biome — happens here and nowhere else.
function nextSection() {
  S.section++;
  UI.banner(levelFor(S.section));   // a new Level is the thing worth announcing
  S.wave = 1;
  S.wavesInSection = 3 + (Math.random() < 0.5 ? 1 : 0);
  S.stage++;
  enterStage(S.stage);
  save();
}

function skipDraft() {
  if (S.phase !== 'draft') return;
  UI.toast('Walked on empty-handed');
  closeDraft();
}

// --- update -----------------------------------------------------------------

function update(dt) {
  S.time += dt;
  const h = S.hero, st = stats();

  h.kit = UI.heroKitFor(S.gear);
  for (let i = 0; i < S.cd.length; i++) if (S.cd[i] > 0) S.cd[i] = Math.max(0, S.cd[i] - dt);
  for (const k in h.buffs) if (h.buffs[k] > 0) h.buffs[k] = Math.max(0, h.buffs[k] - dt);
  if (h.hp > st.maxHp) h.hp = st.maxHp;
  h.maxHp = st.maxHp;
  h.hurt = Math.max(0, h.hurt - dt * 4);
  // Renewal ticks wherever the hero is — mid-fight, on the march, watching a
  // coffin fall. Healing that stopped between encounters would be a worse
  // version of Field Dressing rather than a different answer to the same
  // problem. The dead do not regenerate.
  if (!h.dead && st.regen) h.hp = Math.min(st.maxHp, h.hp + st.maxHp * st.regen * dt);

  if (h.dead) {
    h.deathAnim = Math.min(1, (h.deathAnim || 0) + dt * 1.6);
    h.fade = 1 - h.deathAnim * 0.55;
    S.reviveTimer -= dt;
    UI.showDeath(true, Math.max(0, S.reviveTimer));
    if (S.reviveTimer <= 0) revive();
  } else if (S.phase === 'march') {
    marchStep(dt);
  } else if (S.phase === 'fight') {
    fightStep(dt, st);
  } else if (S.phase === 'drop') {
    idleStep(dt, st);
    if (S.drop) updateDrop(dt);
  } else if (S.phase === 'draft') {
    idleStep(dt, st);   // the hero waits, for as long as the choice takes
  }

  if (S.phase === 'fight' && !h.dead) pumpSpawns(dt);
  updateMonsters(dt);
  updateProjectiles(dt);
  separate([h, ...S.monsters.filter(m => !m.dead)], dt);

  for (let i = S.effects.length - 1; i >= 0; i--)
    if ((S.effects[i].life -= dt) <= 0) S.effects.splice(i, 1);
  for (let i = S.floats.length - 1; i >= 0; i--)
    if ((S.floats[i].life -= dt) <= 0) S.floats.splice(i, 1);
  for (let i = S.monsters.length - 1; i >= 0; i--) {
    const m = S.monsters[i];
    if (m.dead) { m.fade -= dt * 0.85; if (m.fade <= 0 && S.phase !== 'fight') S.monsters.splice(i, 1); }
  }

  // The camera sits a little ahead of the hero, looking down the road.
  S.cam.x = lerp(S.cam.x, h.x + 1.1, Math.min(1, dt * 4));
  S.cam.y = lerp(S.cam.y, h.y * 0.4 - 0.6, Math.min(1, dt * 4));
}

function marchStep(dt) {
  const h = S.hero;
  moveToward(h, S.marchTo, 0, dt, ROAD);
  if (h.x >= S.marchTo - 0.15) beginEncounter();
}

// Out of combat the hero stands easy and closes up small wounds.
function idleStep(dt, st) {
  const h = S.hero;
  h.walk = 0;
  h.atkTimer = Math.max(0, h.atkTimer - dt);
  advanceSwing(h, dt, st);
  if (h.hp < st.maxHp) h.hp = Math.min(st.maxHp, h.hp + st.maxHp * 0.05 * dt);
}

function fightStep(dt, st) {
  const h = S.hero, a = h.anchor;
  const target = nearestFoe(h, S.monsters, 30);
  h.target = target;

  if (!target) {
    if (!S.queue.length && !S.monsters.some(m => !m.dead)) {
      // Field Dressing is paid out here, on the last body dropping, so it is
      // visibly the reward for surviving the fight rather than something that
      // happens off-screen between stages.
      if (st.dressing && h.hp < st.maxHp) {
        const back = Math.min(st.maxHp - h.hp, st.maxHp * st.dressing);
        h.hp += back;
        float(h.x, h.y, `+${Math.round(back)}`, '#7fd6a0');
        Audio.sfx.heal();
      }
      endWave();            // everything is down: bank it, and maybe drop it
      return;
    }
    idleStep(dt, st);
    return;
  }

  let gx = target.x, gy = target.y;
  const ad = Math.hypot(gx - a.x, gy - a.y);
  if (ad > LEASH) {                     // hold the mark; never chase
    gx = a.x + (gx - a.x) / ad * LEASH;
    gy = a.y + (gy - a.y) / ad * LEASH;
  }

  const d = Math.hypot(target.x - h.x, target.y - h.y);
  const reach = h.range + (target.scale || 1) * 0.35;
  const speedMul = h.buffs.frenzy > 0 ? 1.15 : 1;

  if (d > reach && Math.hypot(gx - h.x, gy - h.y) > 0.15) {
    moveToward(h, gx, gy, dt, ROAD, speedMul);
    faceTo(h, target.x - h.x, target.y - h.y);
  } else {
    h.walk = 0;
    faceTo(h, target.x - h.x, target.y - h.y);
    if (d <= reach && h.atkTimer <= 0 && !h.swing) {
      h.swing = 0.001;
      h.pending = target;
      h.atkTimer = st.atkSpeed / (h.buffs.frenzy > 0 ? 2 : 1);
      Audio.sfx.swing();
      effect('slash', h.x, h.y, 1, 0.24, Math.atan2(target.y - h.y, target.x - h.x));
    }
  }
  h.atkTimer = Math.max(0, h.atkTimer - dt);
  advanceSwing(h, dt, st);
}

// Swings resolve mid-arc: the hit lands when the weapon looks like it lands.
function advanceSwing(e, dt, st) {
  if (!e.swing) return;
  const prev = e.swing;
  e.swing += dt / 0.34;
  if (prev < 0.45 && e.swing >= 0.45 && e.pending) {
    const t = e.pending;
    e.pending = null;
    if (!t.dead && Math.hypot(t.x - e.x, t.y - e.y) <= e.range + (t.scale || 1) * 0.6) {
      if (e === S.hero) {
        const crit = Math.random() < st.crit;
        const dmg = st.dmg * (crit ? st.critMult : 1) * (0.9 + Math.random() * 0.2)
                  * (e.buffs.frenzy > 0 ? 1.25 : 1);
        hurtMonster(t, dmg, crit);
        if (st.lifesteal > 0) S.hero.hp = Math.min(st.maxHp, S.hero.hp + dmg * st.lifesteal);
      } else {
        hurtHero(e.dmg);
      }
    }
  }
  if (e.swing >= 1) e.swing = 0;
}

// --- monster behaviour ------------------------------------------------------

function updateMonsters(dt) {
  const h = S.hero;
  for (const m of S.monsters) {
    if (m.dead) continue;
    m.hurt = Math.max(0, m.hurt - dt * 4);
    m.slow = Math.max(0, (m.slow || 0) - dt);
    m.stateT += dt;
    if (m.emerge < 1) m.emerge = Math.min(1, m.emerge + dt * 2);
    if (h.dead || S.phase === 'drop' || S.phase === 'draft') { m.walk = 0; continue; }

    const d = Math.hypot(h.x - m.x, h.y - m.y);
    m.atkTimer = Math.max(0, m.atkTimer - dt);

    switch (m.ai) {
      case 'ranged':  rangedAI(m, h, d, dt); break;
      case 'charger': chargerAI(m, h, d, dt); break;
      case 'boss':    bossAI(m, h, d, dt); break;
      case 'exploder':
        if (d <= m.range + 0.4) { killMonster(m); continue; }
        moveToward(m, h.x, h.y, dt, ROAD, 1.15);
        break;
      default:        meleeAI(m, h, d, dt);
    }
    advanceSwing(m, dt, null);
  }
}

function meleeAI(m, h, d, dt) {
  const reach = m.range + 0.35;
  if (d > reach) { moveToward(m, h.x, h.y, dt, ROAD); return; }
  m.walk = 0;
  faceTo(m, h.x - m.x, h.y - m.y);
  if (m.atkTimer <= 0 && !m.swing) {
    m.swing = 0.001;
    m.pending = h;
    m.atkTimer = m.atk;
    Audio.sfx.swing();
  }
}

// Archers and wraiths hold their distance and shoot; walk them down or eat it.
function rangedAI(m, h, d, dt) {
  const keep = m.keep || 5;
  if (d > keep + 0.8) moveToward(m, h.x, h.y, dt, ROAD);
  else if (d < keep - 1.2) {
    const ux = (m.x - h.x) / (d || 1), uy = (m.y - h.y) / (d || 1);
    moveToward(m, m.x + ux * 2, m.y + uy * 2, dt, ROAD, 0.9);
  } else m.walk = 0;
  faceTo(m, h.x - m.x, h.y - m.y);
  if (d <= m.range && m.atkTimer <= 0) {
    m.atkTimer = m.atk;
    m.swing = 0.001;
    S.projectiles.push({
      proj: true, x: m.x, y: m.y, vx: 0, vy: 0,
      target: h, speed: 9, dmg: m.dmg, splash: 0, life: 3, mine: false,
      // Painted shooters carry their own painted ammunition.
      art: m.sprite && m.sprite.anim && m.sprite.anim.arrow !== undefined ? m.sprite.anim : null,
    });
    Audio.sfx.swing();
  }
}

// Imps wind up, streak across the road, then have to recover — a real window.
function chargerAI(m, h, d, dt) {
  if (m.state === 'approach') {
    if (d <= 6 && d > 1.6) { m.state = 'wind'; m.stateT = 0; m.walk = 0; }
    else meleeAI(m, h, d, dt);
  } else if (m.state === 'wind') {
    m.walk = 0;
    faceTo(m, h.x - m.x, h.y - m.y);
    if (m.stateT > 0.55) {
      const dd = Math.hypot(h.x - m.x, h.y - m.y) || 1;
      m.dashX = (h.x - m.x) / dd;
      m.dashY = (h.y - m.y) / dd;
      m.state = 'charge';
      m.stateT = 0;
    }
  } else if (m.state === 'charge') {
    const step = m.speed * 3.1 * dt;
    m.x += m.dashX * step;
    m.y = clamp(m.y + m.dashY * step, -HALF, HALF);
    m.walk += dt * 22;
    if (d < 1.3 && m.atkTimer <= 0) {
      m.atkTimer = m.atk;
      hurtHero(m.dmg * 1.4);
      m.state = 'recover';
      m.stateT = 0;
    }
    if (m.stateT > 0.75) { m.state = 'recover'; m.stateT = 0; }
  } else {
    m.walk = 0;
    if (m.stateT > 0.9) { m.state = 'approach'; m.stateT = 0; }
  }
}

// Bosses alternate between plain melee and telegraphed moves. Every move
// paints a ring first, so a cooldown spent well actually saves you.
function bossAI(m, h, d, dt) {
  if (m.casting) {
    m.castT += dt;
    m.walk = 0;
    faceTo(m, h.x - m.x, h.y - m.y);
    const mv = m.casting;
    if (m.castT >= mv.tell) {
      resolveBossMove(m, mv, h);
      m.casting = null;
      m.castT = 0;
    }
    return;
  }

  for (let i = 0; i < m.moves.length; i++) {
    m.moveCd[i] -= dt;
    if (m.moveCd[i] > 0) continue;
    const mv = m.moves[i];
    if (mv.id === 'charge' ? d > 3 : d < mv.radius + 2.5) {
      m.moveCd[i] = mv.cd * (m.enraged ? 0.62 : 1);
      m.casting = mv;
      m.castT = 0;
      m.telegraph = { x: mv.id === 'charge' ? h.x : m.x, y: mv.id === 'charge' ? h.y : m.y };
      UI.toast(mv.text);
      Audio.sfx.buff();
      return;
    }
  }
  meleeAI(m, h, d, dt);
}

function resolveBossMove(m, mv, h) {
  const at = m.telegraph || { x: m.x, y: m.y };
  if (mv.id === 'summon') {
    for (let i = 0; i < 3; i++) {
      const key = mv.adds[i % mv.adds.length];
      S.monsters.push(makeMonster(key, S.stage, onRoad({
        x: m.x + (Math.random() - 0.5) * 4, y: (Math.random() - 0.5) * HALF * 1.6,
      })));
    }
    effect('ward', m.x, m.y, 1, 0.8);
    Audio.sfx.bones();
    return;
  }
  if (mv.id === 'charge') {
    const dd = Math.hypot(at.x - m.x, at.y - m.y) || 1;
    m.x += (at.x - m.x) / dd * Math.min(dd, 6);
    m.y = clamp(m.y + (at.y - m.y) / dd * Math.min(dd, 6), -HALF, HALF);
  }
  effect('boom', at.x, at.y, mv.radius, 0.5);
  Audio.sfx.boom();
  S.cam.shake = 0.9;
  if (Math.hypot(h.x - at.x, h.y - at.y) <= mv.radius) hurtHero(m.dmg * mv.mult);
}

function updateProjectiles(dt) {
  for (let i = S.projectiles.length - 1; i >= 0; i--) {
    const p = S.projectiles[i];
    if (p.delay > 0) { p.delay -= dt; continue; }
    p.life -= dt;
    const t = p.target;
    const tx = t && !t.dead ? t.x : p.x + (p.vx || 0.01) * 10;
    const ty = t && !t.dead ? t.y : p.y + (p.vy || 0.01) * 10;
    const dx = tx - p.x, dy = ty - p.y;
    const d = Math.hypot(dx, dy) || 1;
    p.vx = dx / d; p.vy = dy / d;
    const step = p.speed * dt;
    p.x += p.vx * step; p.y += p.vy * step;

    if (d <= step + 0.25 || p.life <= 0) {
      if (p.mine) {
        effect('boom', p.x, p.y, p.splash || 1.2, 0.45);
        Audio.sfx.boom();
        S.cam.shake = Math.max(S.cam.shake, 0.35);
        for (const m of S.monsters) {
          if (m.dead) continue;
          const md = Math.hypot(m.x - p.x, m.y - p.y);
          if (md <= (p.splash || 1.2)) hurtMonster(m, p.dmg * (md < 1 ? 1 : 0.65));
        }
      } else if (d <= step + 0.4) {
        hurtHero(p.dmg);
      }
      S.projectiles.splice(i, 1);
    }
  }
}

// --- persistence ------------------------------------------------------------

function save() {
  // The drop hook runs on a throwaway purse and must never reach the disk. It
  // loops the drop as fast as it can and every pass pays out, so a tuning
  // session would otherwise farm the real save into six figures — which is
  // exactly how the first one got there.
  if (DEV_DROP) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      skulls: S.skulls, gear: S.gear, perks: S.perks, loadout: S.loadout,
      stage: S.stage, section: S.section, wave: S.wave, wavesInSection: S.wavesInSection, best: S.best,
      wavesSinceDraft: S.wavesSinceDraft, wavesSinceBoss: S.wavesSinceBoss,
      wavesSinceDrop: S.wavesSinceDrop, pot: S.pot, openingDone: S.openingDone,
      level: S.hero.level, xp: S.hero.xp, xpNext: S.hero.xpNext,
      kills: S.kills, earned: S.earned, deaths: S.deaths,
    }));
  } catch { /* private browsing — the run just won't persist */ }
}

function load() {
  let d;
  try { d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch { d = null; }
  if (!d) return;
  // Saves written before skulls became the only currency carry `gold`; the two
  // were the same numbers under different names, so an old purse converts 1:1.
  S.skulls = (d.skulls ?? d.gold) | 0;
  Object.assign(S.gear, d.gear || {});
  S.perks = d.perks || {};
  if (Array.isArray(d.loadout) && d.loadout.length) S.loadout = d.loadout.slice(0, MAX_SKILLS);
  S.stage = Math.max(1, d.stage | 0 || 1);
  S.section = Math.max(1, d.section | 0 || 1);
  S.wave = Math.max(1, d.wave | 0 || 1);
  S.wavesInSection = Math.max(3, Math.min(4, d.wavesInSection | 0 || 3));
  S.wavesSinceDraft = Math.max(0, d.wavesSinceDraft | 0);
  S.wavesSinceBoss = Math.max(0, d.wavesSinceBoss | 0);
  S.wavesSinceDrop = Math.max(0, d.wavesSinceDrop | 0);
  S.pot = Math.max(0, d.pot | 0);
  // Saves from before the opening hand existed have already played past it.
  S.openingDone = d.openingDone !== undefined ? !!d.openingDone : true;
  S.best = Math.max(1, d.best | 0 || 1);
  S.kills = d.kills | 0; S.earned = d.earned | 0; S.deaths = d.deaths | 0;
  S.hero.level = Math.max(1, d.level | 0 || 1);
  S.hero.xp = d.xp || 0;
  S.hero.xpNext = d.xpNext || 60;
  S.hero.hp = heroStats(S.hero, S.gear, S.perks).maxHp;
}

setInterval(() => { if (S.running) save(); }, 8000);

// --- loop -------------------------------------------------------------------

// Has to run after the whole module has evaluated: startDrop reaches for
// `stats`, which is a const further down and would still be in its temporal
// dead zone if this fired next to the other setup.
if (DEV_DROP) {
  Audio.init();
  S.running = true;
  document.getElementById('overlay').classList.add('hidden');
  // A purse of its own, loaded from the URL — `?drop=420&purse=0` to see what a
  // broke player is offered, or leave it and start on enough for a Gold card.
  // The real one has already been read by `load()`; this throws it away for the
  // session, and `save()` refuses to write while the hook is on, so the saved
  // purse is whatever it was before the tab opened.
  const p = Number(new URLSearchParams(location.search).get('purse'));
  S.skulls = Number.isFinite(p) && new URLSearchParams(location.search).has('purse') ? Math.max(0, p) : 800;
  S.earned = 0;
  UI.refreshPanels();
  startDrop(DEV_DROP);
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  // Paused still renders — the scene stays on screen, it just stops moving.
  if (S.running && !S.paused) update(dt);
  render(ctx, S, S.time, dt);
  UI.frame(S, dt);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
