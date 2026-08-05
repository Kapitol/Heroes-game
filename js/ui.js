// DOM layer: globes, the rune belt, the armoury, the draft cards.

import { heroStats } from './entities.js';
import { SKILLS, skillById, PERKS, MAX_SKILLS, iconOpts, TIER_BANDS } from './perks.js';
import * as Atlas from './atlas.js';
import { heroKit, armourTierOf, weaponTierOf } from './sprites.js';
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
                    'draftPurse', 'btnPause', 'pausedTag', 'volSlider', 'volValue', 'btnMute'])
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
  if (wasHidden) { p.classList.remove('hidden'); refreshPanels(); }
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

export function refreshPanels() {
  const st = heroStats(S.hero, S.gear, S.perks);
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
  const st = heroStats(S.hero, S.gear, S.perks);
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

  el.stageName.textContent = S.biome.name;
  el.stageSub.textContent = `Section ${S.section}`;

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

export function showDraft(cards, skulls, gained) {
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
  }
  // Two figures, because they answer different questions: what the drop just
  // brought up out of the shaft, and what there is to spend in total. The purse
  // is the one being spent from, so it leads.
  el.draftPurse.innerHTML = `<b>☠ ${skulls.toLocaleString()}</b> collected`
    + (gained > 0 ? ` <em>· ☠ ${gained.toLocaleString()} from that drop</em>` : '');
}

