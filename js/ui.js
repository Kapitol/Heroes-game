// DOM layer: globes, the rune belt, the armoury, the draft cards.

import { heroStats } from './entities.js';
import { levelFor, LEVELS } from './world.js';
import { SKILLS, skillById, PERKS, MAX_SKILLS, iconOpts, TIER_BANDS } from './perks.js';
import * as Atlas from './atlas.js';
import { heroKit, armourTierOf, weaponTierOf, drawActor } from './sprites.js';
import { SLOTS, slotByKey, attrText, bandName, itemScore } from './items.js';
import * as Audio from './audio.js';

export const GEAR = [
  { key: 'weapon', name: 'Blade',  icon: '⚔', base: 30, effect: (n) => `+${n * 4} damage · +${n * 2}% attack speed` },
  { key: 'armor',  name: 'Plate',  icon: '❖', base: 34, effect: (n) => `+${n * 18} life · +${n * 3} armour` },
  { key: 'ring',   name: 'Ring',   icon: '◎', base: 55, effect: (n) => `+${(n * 2.5).toFixed(1)}% critical · +${n * 6}% crit damage` },
  { key: 'amulet', name: 'Amulet', icon: '✦', base: 70, effect: (n) => `+${(n * 1.2).toFixed(1)}% life steal · +${n * 3}% cooldown` },
];

export const gearCost = (g, key) =>
  Math.round(GEAR.find(x => x.key === key).base * Math.pow(1.28, g[key]));

// Cached so the renderer isn't rebuilding the hero's palette every frame.
let kitCache = null, kitKey = '';
export function heroKitFor(gear) {
  const k = `${gear.weapon}/${gear.armor}`;
  if (k !== kitKey) { kitKey = k; kitCache = heroKit(gear.weapon, gear.armor); }
  return kitCache;
}

const $ = (id) => document.getElementById(id);
const el = {};
let S, H, toastTimer = 0;
const runes = [];

export function init(state, handlers) {
  S = state; H = handlers;
  for (const id of ['stageName', 'stageSub', 'waveText', 'waveBar', 'skullText', 'toast', 'banner',
                    'hpGlobe', 'hpText', 'xpGlobe', 'xpStrip', 'xpText', 'skills', 'gearList',
                    'statList', 'gearPanel', 'menuPanel', 'runStats', 'deathOverlay', 'reviveNum',
                    'overlay', 'ovBtn', 'btnGear', 'btnMenu', 'btnReset', 'deathText',
                    'draftPanel', 'draftCards', 'perkList',
                    'draftPurse', 'btnPause', 'pausedTag', 'volSlider', 'volValue', 'btnMute',
                    'slotsLeft', 'slotsRight', 'dollCanvas', 'dollLevel', 'bagList', 'bagCount',
                    'mapPanel', 'mapTrack', 'mapChoices', 'mapSub'])
    el[id] = $(id);

  el.btnGear.addEventListener('click', (e) => { e.stopPropagation(); togglePanel('gearPanel'); });
  el.btnMenu.addEventListener('click', (e) => { e.stopPropagation(); togglePanel('menuPanel'); });
  el.btnReset.addEventListener('click', () => { if (confirm('Abandon this run and start over?')) H.reset(); });
  el.ovBtn.addEventListener('click', () => { el.overlay.classList.add('hidden'); H.start(); });
  for (const b of document.querySelectorAll('[data-close]'))
    b.addEventListener('click', () => b.closest('.panel').classList.add('hidden'));

  el.btnPause.addEventListener('click', (e) => { e.stopPropagation(); H.pause(); });

  // Volume survives reloads; nobody wants to re-mute a game every session.
  // Test for the key, not the number: Number(null) is 0, which would start
  // every fresh install silent.
  const raw = localStorage.getItem('cryptheroes.vol');
  const savedVol = raw === null ? 50 : Number(raw);
  const savedMute = localStorage.getItem('cryptheroes.mute') === '1';
  applyVolume(Number.isFinite(savedVol) ? savedVol : 50, savedMute);
  el.volSlider.addEventListener('input', () => applyVolume(Number(el.volSlider.value), false));
  el.btnMute.addEventListener('click', (e) => {
    e.stopPropagation();
    applyVolume(Number(el.volSlider.value), !Audio.isMuted());
  });

  buildGearRows();
}

function applyVolume(pct, muted) {
  el.volSlider.value = pct;
  el.volValue.textContent = muted ? '—' : pct;
  Audio.setVolume(pct / 100);
  Audio.setMuted(muted);
  el.btnMute.textContent = muted || pct === 0 ? '🔇' : pct < 45 ? '🔉' : '🔊';
  try {
    localStorage.setItem('cryptheroes.vol', String(pct));
    localStorage.setItem('cryptheroes.mute', muted ? '1' : '0');
  } catch { /* private browsing */ }
}

export function showPaused(on) {
  el.pausedTag.classList.toggle('hidden', !on);
  el.btnPause.classList.toggle('on', on);
  el.btnPause.textContent = on ? '▶' : '⏸';
}

// The belt is rebuilt whenever the draft widens the kit.
export function rebuildRunes() {
  el.skills.innerHTML = '';
  runes.length = 0;
  S.loadout.forEach((id, i) => {
    const s = skillById(id);
    const b = document.createElement('button');
    b.className = 'rune ready';
    b.title = `${s.name} — ${s.desc}`;
    b.innerHTML = `<span class="key">${i + 1}</span>${s.glyph}<span class="cd"></span>`;
    b.addEventListener('click', (e) => { e.stopPropagation(); H.skill(i); });
    el.skills.appendChild(b);
    runes.push({ b, cd: b.querySelector('.cd'), def: s });
  });
  for (let i = S.loadout.length; i < MAX_SKILLS; i++) {
    const d = document.createElement('div');
    d.className = 'rune empty';
    d.textContent = '·';
    d.title = 'An empty hand — a draft can fill it';
    el.skills.appendChild(d);
  }
}

export function togglePanel(id) {
  const p = el[id];
  const wasHidden = p.classList.contains('hidden');
  el.gearPanel.classList.add('hidden');
  el.menuPanel.classList.add('hidden');
  if (wasHidden) {
    p.classList.remove('hidden');
    if (id === 'gearPanel') { el.btnGear.classList.remove('newLoot'); S.newLoot = 0; }
    refreshPanels();
  }
}

function buildGearRows() {
  el.gearList.innerHTML = '';
  for (const g of GEAR) {
    const row = document.createElement('div');
    row.className = 'gearRow';
    row.innerHTML = `
      <div class="gearIcon">${g.icon}</div>
      <div class="gearInfo">
        <div class="gearName">${g.name} <b data-lvl>+0</b><i data-tier></i></div>
        <div class="gearEffect" data-eff></div>
      </div>
      <button class="buy" data-buy>—</button>`;
    row.querySelector('[data-buy]').addEventListener('click', () => H.buy(g.key));
    el.gearList.appendChild(row);
    g._row = row;
  }
}

/**
 * The globe asks to be opened.
 *
 * Loot is collected for you — there is nothing to walk over and pick up — so
 * the only thing announcing a boss's pile is the bag itself. It keeps flashing
 * until the panel is opened, rather than pulsing once and being missed.
 */
export function flashBag() {
  el.btnGear.classList.add('newLoot');
}

// Four armour slots down the left, the weapon down the right, mirroring the
// shape of the screen this is modelled on.
const LEFT_SLOTS = ['head', 'chest', 'hands', 'feet'];
const RIGHT_SLOTS = ['weapon'];

function slotCell(key) {
  const slot = slotByKey(key);
  const it = S.equipped[key];
  const b = document.createElement('button');
  b.className = `slot ${it ? it.band : 'empty'}`;
  b.title = it ? `${it.name} — click to take off` : `${slot.name}: empty`;
  b.innerHTML = it
    ? `<span class="slotIcon">${slot.icon}</span><span class="slotName">${it.name}</span>`
    : `<span class="slotIcon dim">${slot.icon}</span><span class="slotName dim">${slot.name}</span>`;
  if (it) b.addEventListener('click', () => H.unequip(key));
  return b;
}

// The hero, drawn from the same routine the road uses, so the figure in the
// panel is the figure you are watching fight.
function paintDoll() {
  const cv = el.dollCanvas;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, cv.width, cv.height);
  const hero = { ...S.hero, kit: heroKitFor(S.gear), scale: 2.5, walk: 0, swing: 0, hurt: 0, fx: 1 };
  ctx.save();
  ctx.translate(0, 26);
  drawActor(ctx, hero, cv.width / 2, cv.height - 26, 0);
  ctx.restore();
}

// A rough "how geared am I" number, in the spirit of the item level on the
// screen this borrows from: the average level of what is actually worn.
function itemLevel() {
  const worn = Object.values(S.equipped).filter(Boolean);
  if (!worn.length) return 0;
  return Math.round(worn.reduce((t, i) => t + i.level, 0) / worn.length * 10);
}

function buildBag() {
  el.bagList.innerHTML = '';
  el.bagCount.textContent = S.bag.length ? `${S.bag.length} carried` : '';
  if (!S.bag.length) {
    el.bagList.innerHTML = '<span class="perkChip none">Nothing carried — bosses leave the loot</span>';
    return;
  }
  // Best first: a bag is read top-down and the thing worth wearing should be
  // the thing you see.
  [...S.bag].sort((a, b) => itemScore(b) - itemScore(a)).forEach((it) => {
    const slot = slotByKey(it.slot);
    const worn = S.equipped[it.slot];
    const better = !worn || itemScore(it) > itemScore(worn);
    const row = document.createElement('div');
    row.className = `bagRow ${it.band}`;
    row.innerHTML = `
      <div class="bagIcon">${slot.icon}</div>
      <div class="bagInfo">
        <div class="bagName">${it.name} <em>${bandName(it.band)} · ${slot.name}</em></div>
        <div class="bagAttrs">${it.attrs.map(attrText).join(' · ')}</div>
      </div>
      <button class="buy${better ? ' up' : ''}">${better ? 'Equip' : 'Swap'}</button>`;
    row.querySelector('button').addEventListener('click', () => H.equip(it.id));
    el.bagList.appendChild(row);
  });
}

export function refreshPanels() {
  const st = heroStats(S.hero, S.gear, S.perks, S.equipped);

  el.slotsLeft.innerHTML = '';
  el.slotsRight.innerHTML = '';
  for (const k of LEFT_SLOTS) el.slotsLeft.appendChild(slotCell(k));
  for (const k of RIGHT_SLOTS) el.slotsRight.appendChild(slotCell(k));
  el.dollLevel.innerHTML = `<b>${itemLevel()}</b><span>Item Level</span>`;
  paintDoll();
  buildBag();
  for (const g of GEAR) {
    const n = S.gear[g.key];
    const cost = gearCost(S.gear, g.key);
    g._row.querySelector('[data-lvl]').textContent = `+${n}`;
    g._row.querySelector('[data-eff]').textContent = g.effect(n);
    const tier = g._row.querySelector('[data-tier]');
    // Only the two visible slots advertise a look; a ring has no silhouette.
    tier.textContent = g.key === 'armor' ? `  ·  Mark ${armourTierOf(n)}`
                     : g.key === 'weapon' ? `  ·  Mark ${weaponTierOf(n)}` : '';
    const b = g._row.querySelector('[data-buy]');
    b.textContent = `☠ ${cost}`;
    b.disabled = S.skulls < cost;
  }

  el.statList.innerHTML = [
    ['Level', S.hero.level],
    ['Damage', st.dmg],
    ['Life', `${Math.round(S.hero.hp)} / ${st.maxHp}`],
    ['Armour', st.armor],
    ['Critical', `${(st.crit * 100).toFixed(1)}%`],
    ['Crit damage', `${Math.round(st.critMult * 100)}%`],
    ['Life steal', `${(st.lifesteal * 100).toFixed(1)}%`],
    ['Damage taken', `−${Math.round((1 - st.mitigate) * 100)}%`],
    ['Cooldowns', `−${Math.round(st.cdr * 100)}%`],
    ['Skulls found', `+${Math.round((st.skullMul - 1) * 100)}%`],
  ].map(([k, v]) => `<div><em>${k}</em><span>${v}</span></div>`).join('');

  const taken = PERKS.filter(p => S.perks[p.id]);
  el.perkList.innerHTML = taken.length
    ? taken.map(p => `<span class="perkChip ${p.kind}">${p.icon} ${p.name} <b>×${S.perks[p.id]}</b></span>`).join('')
    : '<span class="perkChip none">Nothing drafted yet</span>';

  el.runStats.innerHTML = [
    ['Best stage', S.best],
    ['Kills', S.kills],
    ['Skulls earned', S.earned],
    ['Deaths', S.deaths],
  ].map(([k, v]) => `<div><em>${k}</em><span>${v}</span></div>`).join('');
}

export function frame(S, dt) {
  const st = heroStats(S.hero, S.gear, S.perks, S.equipped);
  el.hpGlobe.querySelector('i').style.height = `${Math.max(0, S.hero.hp / st.maxHp) * 100}%`;
  el.hpText.textContent = `${Math.max(0, Math.round(S.hero.hp))}/${st.maxHp}`;

  el.xpStrip.querySelector('i').style.width = `${Math.min(100, (S.hero.xp / S.hero.xpNext) * 100)}%`;
  el.xpText.textContent = `Level ${S.hero.level} · ${Math.floor(S.hero.xp)} / ${S.hero.xpNext}`;
  el.skullText.textContent = S.skulls.toLocaleString();

  const cheapest = Math.min(...GEAR.map(g => gearCost(S.gear, g.key)));
  const afford = Math.min(1, S.skulls / cheapest);
  el.xpGlobe.querySelector('i').style.height = `${afford * 100}%`;
  el.xpGlobe.classList.toggle('ready', afford >= 1);

  runes.forEach((r, i) => {
    const left = S.cd[i];
    const pct = left > 0 ? (left / (r.def.cd * (1 - st.cdr))) * 100 : 0;
    r.cd.style.height = `${pct}%`;
    r.b.classList.toggle('cooling', left > 0);
    r.b.classList.toggle('ready', left <= 0);
  });

  // The minigame is its own screen: the road HUD would only compete with it.
  document.body.classList.toggle('minigame', S.phase === 'drop');

  // The level is the named place; the biome underneath it is the paint, and
  // changes far more slowly.
  el.stageName.textContent = levelFor(S.section);
  el.stageSub.textContent = `Level ${S.section}`;

  const left = S.monsters.filter(m => !m.dead).length + S.queue.length;
  if (S.phase === 'march') {
    el.waveText.textContent = 'Marching…';
    el.waveBar.querySelector('i').style.width = '0%';
  } else if (S.phase === 'drop') {
    el.waveText.textContent = 'The Coffin Drop';
  } else if (S.phase === 'draft') {
    el.waveText.textContent = 'Spend the skulls';
  } else {
    const name = S.formation ? S.formation.name : 'Encounter';
    el.waveText.textContent = `Wave ${S.wave} / ${S.wavesInSection} · ${name}`;
    el.waveBar.querySelector('i').style.width = `${S.waveTotal ? (1 - left / S.waveTotal) * 100 : 0}%`;
  }


  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) el.toast.classList.remove('show');
  }
}

export function toast(msg, secs = 1.6) {
  el.toast.textContent = msg;
  el.toast.classList.add('show');
  toastTimer = secs;
}

export function banner(msg) {
  el.banner.textContent = msg;
  el.banner.classList.remove('show');
  void el.banner.offsetWidth;
  el.banner.classList.add('show');
}

export function fireRune(i) {
  const r = runes[i];
  if (!r) return;
  r.b.classList.remove('fire');
  void r.b.offsetWidth;
  r.b.classList.add('fire');
}

export function showDeath(show, n, lost) {
  el.deathOverlay.classList.toggle('hidden', !show);
  if (!show) return;
  el.reviveNum.textContent = Math.ceil(n);
  if (lost !== undefined) {
    el.deathText.textContent = lost > 0
      ? `The dark took ☠ ${lost} from your purse.`
      : 'You had nothing left to lose.';
  }
}

const ICON_PX = 62;

/**
 * Swap a card's glyph for its painted icon.
 *
 * The art lives on a chroma-keyed sheet, which only exists as a canvas — there
 * is no URL to hand to CSS — so the cell is drawn into a small canvas of its
 * own. A sheet is a couple of megabytes and decodes a moment after the panel
 * opens, so this retries on the next frame until it is ready and the glyph
 * simply stands in until then. The panel outlives any single roll now, so a
 * detached card has to be checked for, or a late frame paints into nothing.
 */
function paintIcon(host, card) {
  if (!host || !host.isConnected) return;
  const s = Atlas.sheet(card.art.src, 0, 0, iconOpts(card.art.src));
  if (!s) { requestAnimationFrame(() => paintIcon(host, card)); return; }
  const c = s.cells[card.art.cell];
  if (!c) return;                                   // no such cell: keep the glyph

  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const k = Math.min(ICON_PX / c.w, ICON_PX / c.h); // fit the box, keep the aspect
  const w = Math.round(c.w * k), h = Math.round(c.h * k);
  const cv = document.createElement('canvas');
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  cv.style.width = `${w}px`; cv.style.height = `${h}px`;
  cv.getContext('2d').drawImage(s.canvas, c.x, c.y, c.w, c.h, 0, 0, cv.width, cv.height);
  host.textContent = '';
  host.appendChild(cv);
}

/**
 * The tier ladder under the cost: one rectangle per tier the card can reach.
 *
 * Tiers already bought are gold, so a card deep in its ladder reads as progress
 * at a glance rather than as a number to decode. The tier this card would buy is
 * marked separately — it is the one about to light up, not one you own.
 *
 * Abilities have no ladder: you either know Cleave or you don't. They get no
 * row rather than a row of one, which would read as a broken ladder.
 */
function tierRow(c) {
  if (!c.tiers) return '';
  // Each rectangle is painted in its own band's colour — gray, green, blue,
  // purple, gold — so the ladder reads as a rarity track and not just a count.
  // Tiers held are lit; the one this card would buy is outlined in the colour
  // it will become; the rest stay dark.
  const pips = TIER_BANDS.slice(0, c.tiers).map((b, i) =>
    `<i class="${b.key}${i < c.held ? ' on' : i === c.held ? ' next' : ''}"></i>`).join('');
  return `<span class="tierRow" style="--tiers:${c.tiers}">${pips}</span>`;
}

/**
 * The map: what has been walked, and the fork ahead.
 *
 * The track is the point of it — a run is a long line of near-identical waves,
 * and this is the only place that says out loud how far the hero has actually
 * come. Levels already behind are struck through and dimmed; the one just
 * finished is lit, because that is the one the boss died in.
 */
export function showMap(choices, section) {
  el.mapPanel.classList.toggle('hidden', !choices);
  if (!choices) return;

  el.mapSub.textContent = `${section} ${section === 1 ? 'level' : 'levels'} behind you`;
  el.mapTrack.innerHTML = '';
  // A window around where the hero is: everything done, plus a glimpse of what
  // is still unnamed ahead. The whole list would be a wall by level 20.
  const from = Math.max(1, section - 5);
  const to = Math.min(LEVELS.length, section + 2);
  for (let i = from; i <= to; i++) {
    const done = i < section, here = i === section;
    const row = document.createElement('div');
    row.className = `mapStop${done ? ' done' : here ? ' here' : ' ahead'}`;
    row.innerHTML = `
      <span class="mapMark">${done ? '✓' : here ? '◆' : '·'}</span>
      <span class="mapNo">${i}</span>
      <span class="mapName">${levelFor(i)}</span>`;
    el.mapTrack.appendChild(row);
  }

  el.mapChoices.innerHTML = '';
  choices.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = `mapChoice ${c.key}`;
    b.innerHTML = `
      <span class="mcTag">${c.tag}</span>
      <span class="mcName">${c.title}</span>
      <span class="mcNote">${c.note}</span>
      <span class="mcMeta">${c.meta}</span>`;
    b.addEventListener('click', () => H.mapPick(i));
    el.mapChoices.appendChild(b);
  });
}

export function showDraft(cards, skulls, gained, rerollCost) {
  el.draftPanel.classList.toggle('hidden', !cards);
  if (!cards) return;
  el.draftCards.innerHTML = '';
  cards.forEach((c, i) => {
    const b = document.createElement('button');
    const afford = skulls >= c.cost;
    b.className = `card ${c.kind} ${c.band || 'gray'}${afford ? '' : ' broke'}`;
    b.innerHTML = `
      <span class="cardKind">${c.type === 'skill' ? 'New ability' : c.kind}</span>
      <span class="cardIcon">${c.icon}</span>
      <span class="cardName">${c.name}${c.tier > 1 ? ` <b>${c.tier}</b>` : ''}</span>
      <span class="cardDesc">${c.desc}</span>
      <span class="cardCost">${c.cost > 0 ? `☠ ${c.cost}` : 'Free'}</span>
      ${tierRow(c)}`;
    b.addEventListener('click', () => H.draftPick(i));
    el.draftCards.appendChild(b);
    if (c.art) paintIcon(b.querySelector('.cardIcon'), c);
  });
  if (!el.draftSkip) {
    el.draftSkip = document.getElementById('draftSkip');
    el.draftSkip.addEventListener('click', () => H.draftSkip());
    el.draftReroll = document.getElementById('draftReroll');
    el.draftReroll.addEventListener('click', () => H.draftReroll());
  }
  // The price rides on the button, so the cost of another look is never a
  // thing you have to remember. Greyed rather than hidden when it is out of
  // reach — a control that vanishes reads as a bug.
  const canReroll = skulls >= rerollCost;
  el.draftReroll.innerHTML = `Open another coffin <b>☠ ${rerollCost}</b>`;
  el.draftReroll.disabled = !canReroll;
  el.draftReroll.title = canReroll ? '' : `You need ☠ ${rerollCost}`;
  // Two figures, because they answer different questions: what the drop just
  // brought up out of the shaft, and what there is to spend in total. The purse
  // is the one being spent from, so it leads.
  el.draftPurse.innerHTML = `<b>☠ ${skulls.toLocaleString()}</b> collected`
    + (gained > 0 ? ` <em>· ☠ ${gained.toLocaleString()} from that drop</em>` : '');
}

