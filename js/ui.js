// DOM layer: globes, the rune belt, the armoury, the draft cards.

import { heroStats } from './entities.js';
import { levelFor, levelAt, LEVELS } from './world.js';
import { SKILLS, skillById, PERKS, MAX_SKILLS, iconOpts, TIER_BANDS } from './perks.js';
import * as Atlas from './atlas.js';
import { heroKit, drawActor, drawShadow, drawCampfire,
         drawCookpot, kitFor } from './sprites.js';
import { SLOTS, slotByKey, attrText, bandName, itemScore, itemArt } from './items.js';
import * as Audio from './audio.js';

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
// The camp, while it is on screen: the roster it was given and its own clock,
// so the fire keeps its rhythm across the frames the run is not using.
let camp = null, campT = 0;
const runes = [];

export function init(state, handlers) {
  S = state; H = handlers;
  for (const id of ['stageName', 'stageSub', 'waveText', 'waveBar', 'skullText', 'toast', 'banner',
                    'hpGlobe', 'hpText', 'xpGlobe', 'xpStrip', 'xpText', 'skills',
                    'statList', 'gearPanel', 'menuPanel', 'runStats', 'deathOverlay', 'reviveNum',
                    'overlay', 'ovBtn', 'btnGear', 'btnMenu', 'btnReset', 'deathText',
                    'draftPanel', 'draftCards', 'perkList',
                    'draftPurse', 'btnPause', 'pausedTag', 'volSlider', 'volValue', 'btnMute',
                    'slotsLeft', 'slotsRight', 'dollCanvas', 'dollLevel', 'bagList', 'bagCount',
                    'mapPanel', 'mapPins', 'mapChoices', 'mapSub', 'mapNextHead', 'mapClose', 'mapArt',
                    'campPanel', 'campScene', 'campCanvas', 'campSlots', 'campName', 'campLevel',
                    'campSub', 'campStart', 'campPlate',
                    'minimap', 'topLeft'])
    el[id] = $(id);

  el.btnGear.addEventListener('click', (e) => { e.stopPropagation(); togglePanel('gearPanel'); });
  el.btnMenu.addEventListener('click', (e) => { e.stopPropagation(); togglePanel('menuPanel'); });
  el.btnReset.addEventListener('click', () => { if (confirm('Abandon this run and start over?')) H.reset(); });
  // Begin does not start the run — it opens the overview, and the map's own
  // button is what puts the hero on the road.
  el.ovBtn.addEventListener('click', () => { el.overlay.classList.add('hidden'); H.overview(); });
  for (const b of document.querySelectorAll('[data-close]'))
    b.addEventListener('click', () => b.closest('.panel').classList.add('hidden'));

  el.btnPause.addEventListener('click', (e) => { e.stopPropagation(); H.pause(); });
  el.minimap.addEventListener('click', (e) => { e.stopPropagation(); H.worldMap(); });
  el.mapClose.addEventListener('click', () => H.worldMapClose());
  el.campStart.addEventListener('click', () => H.campStart(camp && camp.slots[camp.sel].key));

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

/**
 * The globe asks to be opened.
 *
 * Loot is collected for you — there is nothing to walk over and pick up — so
 * the only thing announcing a boss's pile is the bag itself. It keeps flashing
 * until the panel is opened, rather than pulsing once and being missed.
 */
/**
 * The corner minimap. It is the same overworld image, scaled up and shifted so
 * the level the hero is in sits under the pin in the middle — which is why the
 * offsets are computed in pixels rather than set as a background percentage:
 * percentage positioning aligns like points on image and box, and cannot put an
 * arbitrary point of the image in the centre of a circle.
 */
const MINIMAP_ZOOM = 5.2;

export function updateMinimap() {
  const box = el.minimap.clientWidth || 62;
  const lv = levelAt(S.section);
  const w = box * MINIMAP_ZOOM;
  // Take the ratio from the image itself rather than hard-coding it: the map
  // art gets replaced, and a baked-in ratio silently skews the crop when it is.
  const art = el.mapArt;
  const ratio = art && art.naturalWidth ? art.naturalHeight / art.naturalWidth : 0.8;
  const h = w * ratio;
  el.minimap.style.backgroundSize = `${w}px ${h}px`;
  el.minimap.style.backgroundPosition = `${box / 2 - lv.at[0] * w}px ${box / 2 - lv.at[1] * h}px`;
}

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
  // The art rides on the element and is painted once it is in the document —
  // `paintIcon` refuses to paint a host that is not connected yet, and it fails
  // by leaving the glyph, which looks like art that simply has not arrived.
  b._art = it && itemArt(it);
  return b;
}

// The smaller side of a host's box — loot icons sit in slots and rows that are
// wider than they are tall, or the reverse, and the art has to clear both.
const fitBox = (host) => Math.max(16, Math.min(host.clientWidth || 24, host.clientHeight || 24));

// Appended first, painted second — see the note in `slotCell`.
function addSlot(host, key) {
  const b = slotCell(key);
  host.appendChild(b);
  if (b._art) {
    const host = b.querySelector('.slotIcon');
    paintIcon(host, { art: b._art }, fitBox(host));
  }
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
    const art = itemArt(it);
    row.innerHTML = `
      <div class="bagIcon">${slot.icon}</div>
      <div class="bagInfo">
        <div class="bagName">${it.name} <em>${bandName(it.band)} · ${slot.name}</em></div>
        <div class="bagAttrs">${it.attrs.map(attrText).join(' · ')}</div>
      </div>
      <button class="buy${better ? ' up' : ''}">${better ? 'Equip' : 'Swap'}</button>`;
    row.querySelector('button').addEventListener('click', () => H.equip(it.id));
    el.bagList.appendChild(row);
    if (art) {
      const host = row.querySelector('.bagIcon');
      paintIcon(host, { art }, fitBox(host));
    }
  });
}

export function refreshPanels() {
  const st = heroStats(S.hero, S.gear, S.perks, S.equipped);

  el.slotsLeft.innerHTML = '';
  el.slotsRight.innerHTML = '';
  for (const k of LEFT_SLOTS) addSlot(el.slotsLeft, k);
  for (const k of RIGHT_SLOTS) addSlot(el.slotsRight, k);
  el.dollLevel.innerHTML = `<b>${itemLevel()}</b><span>Item Level</span>`;
  paintDoll();
  buildBag();

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
  if (camp) paintCamp(dt);
  const st = heroStats(S.hero, S.gear, S.perks, S.equipped);
  el.hpGlobe.querySelector('i').style.height = `${Math.max(0, S.hero.hp / st.maxHp) * 100}%`;
  el.hpText.textContent = `${Math.max(0, Math.round(S.hero.hp))}/${st.maxHp}`;

  el.xpStrip.querySelector('i').style.width = `${Math.min(100, (S.hero.xp / S.hero.xpNext) * 100)}%`;
  el.xpText.textContent = `Level ${S.hero.level} · ${Math.floor(S.hero.xp)} / ${S.hero.xpNext}`;
  el.skullText.textContent = S.skulls.toLocaleString();

  // The globe fills towards the cheapest thing skulls can still buy — which is
  // now only ever a card, since armour is taken off bosses and never bought.
  const afford = Math.min(1, S.skulls / TIER_BANDS[1].max);
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
  updateMinimap();
  el.stageName.textContent = levelFor(S.section);
  el.stageSub.textContent = `Level ${S.section}`;

  const left = S.monsters.filter(m => !m.dead).length + S.queue.length;
  if (S.phase === 'enter') {
    el.waveText.textContent = 'Marching…';
    el.waveBar.querySelector('i').style.width = '0%';
  } else if (S.phase === 'lull') {
    el.waveText.textContent = 'The ground is clear';
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
/**
 * Paint a sheet cell into an element, in place of its glyph.
 *
 * `px` is the box to fit inside, because the same routine serves a 62px card
 * icon and a 20px armoury slot — sized to the card everywhere, loot art spills
 * out of its row and prints over the item's own name.
 */
function paintIcon(host, card, px) {
  if (!host || !host.isConnected) return;
  const s = Atlas.sheet(card.art.src, 0, 0, iconOpts(card.art.src));
  if (!s) { requestAnimationFrame(() => paintIcon(host, card, px)); return; }
  const c = s.cells[card.art.cell];
  if (!c) return;                                   // no such cell: keep the glyph

  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const box = px || ICON_PX;
  const k = Math.min(box / c.w, box / c.h);          // fit the box, keep the aspect
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
 *
 * Three modes, one screen. `fork` is the choice after a boss falls, `browse` is
 * the minimap opened to be read, and `overview` is the one the run opens on —
 * the same map with nothing to decide on it, ending in the button that puts the
 * hero on the road. They share a panel deliberately: the map a player is shown
 * before their first step should be the map they keep coming back to, not a
 * separate picture of the same journey.
 *
 * `opts.sub` and `opts.next` carry the run's own numbers, which live in game.js.
 */
export function showMap(choices, section) {
  el.mapPanel.classList.toggle('hidden', !choices);
  if (!choices) return;
  // Opened from the minimap there is nothing to decide — the same map, read
  // rather than acted on.
  const browse = choices.length === 0;
  el.mapNextHead.classList.toggle('hidden', browse);
  el.mapClose.classList.toggle('hidden', !browse);

  el.mapSub.textContent = `${section} ${section === 1 ? 'level' : 'levels'} behind you`;

  // Where each road would take you, so a pin can show itself as an option.
  const dests = new Map(choices.map((c, i) => [c.section, i]));

  el.mapPins.innerHTML = '';
  LEVELS.forEach((lv, idx) => {
    const n = idx + 1;
    const done = n < section, here = n === section;
    const choice = dests.has(n) && !here;
    const pin = document.createElement(choice ? 'button' : 'div');
    pin.className = `pin${done ? ' done' : ''}${here ? ' here' : ''}${choice ? ' choice' : ''}`;
    // Placed by fraction of the image, so the pin holds its spot at any size.
    pin.style.left = `${lv.at[0] * 100}%`;
    pin.style.top = `${lv.at[1] * 100}%`;
    pin.title = lv.name;
    pin.innerHTML = `<span class="pinDot">${done ? '✓' : here ? '◆' : ''}</span><span class="pinName">${lv.name}</span>`;
    if (choice) pin.addEventListener('click', () => H.mapPick(dests.get(n)));
    el.mapPins.appendChild(pin);
  });

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

/**
 * The camp: the party that walks the road, and the places at the fire nobody
 * has filled yet.
 *
 * A roster of one is still a roster, and the screen is built to say so — the
 * empty places are drawn as places, not as absence. A player who sees three
 * unlit spots at their fire knows something is coming without a word of copy
 * promising it.
 *
 * `roster` is an array of slots, in the order they stand:
 *   { name, sub, kit }            someone who is here
 *   { locked: true, sub }         a place at the fire, still empty
 */
export function showCamp(roster) {
  el.campPanel.classList.toggle('hidden', !roster);
  // The road's HUD has nothing to say here — no life to watch, no cooldowns to
  // spend — and left up it competes with the one thing this screen is for.
  document.body.classList.toggle('camp', !!roster);
  if (!roster) { camp = null; return; }
  // Open on somebody the road can actually be taken as — on a run already
  // under way that is the class walking it, and anything else opens the screen
  // on a disabled button with no clue that the fix is to click your own hero.
  const first = roster.findIndex(s => s.takeable);
  camp = {
    slots: roster,
    sel: first >= 0 ? first : Math.max(0, roster.findIndex(s => !s.locked)),
    geom: '',
  };
  buildCampSlots();
}

/**
 * Where everybody stands.
 *
 * The party rings the fire rather than lining up beside it: the places spread
 * across the middle two thirds of the scene, and the ones nearer the centre
 * stand further back and smaller. That arc is the whole difference between a
 * camp and a row of portraits — and it is shared by the painting and the hit
 * areas, so a name plate can never drift off the head it belongs to.
 */
function campGeom(i, n, W, H) {
  // Centred on the lit clearing in art/camp-boneyard.png, not on the canvas —
  // the painted firelight is where a fire visibly was, so that is where ours
  // goes and where the party stands round it.
  const cx = W / 2, cy = H * 0.72;
  const rx = W * 0.30, ry = H * 0.15;
  // 140° to 400°: the middle of the party stands behind the fire and the outer
  // two wrap forward past it, so the fire has people on both sides of it. A row
  // with a stagger is still a row — this is the difference between figures that
  // are near a fire and figures that are gathered at one.
  const th = ((140 + ((i + 0.5) / n) * 260) * Math.PI) / 180;
  const x = cx + Math.cos(th) * rx;
  const y = cy + Math.sin(th) * ry;
  const depth = (-Math.sin(th) + 1) / 2;      // 1 behind the fire, 0 in front of it
  const scale = (H / 300) * 3.8 * (1 - depth * 0.34);
  return { f: x / W, depth, x, y, scale, headY: y - 44 * 0.92 * scale };
}

function buildCampSlots() {
  el.campSlots.innerHTML = '';
  camp.slots.forEach((s, i) => {
    const b = document.createElement('button');
    b.className = `campSlot${s.locked ? ' locked' : ''}${i === camp.sel ? ' sel' : ''}`;
    b.style.width = `${(1 / camp.slots.length) * 55}%`;
    // Named either way. An empty place at this fire belongs to somebody
    // specific, and saying so is the difference between a gap and a promise.
    b.innerHTML = `<span class="csPlate"><b>${s.name || '?'}</b><i>${s.sub}</i></span>`;
    // Locked places are buttons already, so the day a hero can be recruited
    // into one there is nothing to build — only something to say.
    // Selecting an empty place is allowed — it puts that class in the plate so
    // it can be read. What it cannot do is become the hero you march as, which
    // is what `campStart` will have to check the day a second class exists.
    b.addEventListener('click', () => {
      camp.sel = i;
      buildCampSlots();
    });
    el.campSlots.appendChild(b);
  });
  placeCampSlots();
  paintCampName();
}

// Slot boxes follow the figures. Only run when the scene has actually changed
// size — the geometry is stable between resizes and writing four elements'
// styles every frame would be layout thrash for nothing.
function placeCampSlots(W, H) {
  const box = el.campScene.getBoundingClientRect();
  W = W || box.width; H = H || box.height;
  if (!W) return;
  [...el.campSlots.children].forEach((b, i) => {
    const g = campGeom(i, camp.slots.length, W, H);
    b.style.left = `${g.f * 100}%`;
    // Sat just above the head, in the figure's own space rather than at a fixed
    // height, so the back row's plates rise with them.
    // Above the head of whoever is standing there — or just above the bare
    // ground when nobody is, because a "?" hanging at head height over an empty
    // place is a label pinned to a body that was never drawn.
    const top = camp.slots[i].locked
      ? (g.y / H) * 100 - 11
      : (g.headY / H) * 100 - 11;
    b.style.top = `${Math.max(0, top)}%`;
  });
}

function paintCampName() {
  const s = camp.slots[camp.sel];
  el.campName.textContent = s.name || '';
  el.campLevel.textContent = s.sub || '';
  el.campSub.textContent = s.detail || '';
  el.campPlate.classList.toggle('empty', !s.takeable);
  // The road is walked as whoever is in the plate, so a class that cannot be
  // taken cannot offer it. Disabled and relabelled rather than hidden — a
  // control that vanishes reads as a bug, and this one has to come back.
  el.campStart.disabled = !s.takeable;
  el.campStart.textContent = s.takeable ? 'Take the road'
    : s.locked ? 'Yet to be found'
    : 'Already on the road';
}

// The unknown are drawn from the hero's own build with the colour taken out and
// the weapon left behind — a shape you recognise as a person and cannot
// identify, which is exactly what a hero you have not met yet is.
const GHOST = { ...kitFor('hero'), skin: '#100d0a', cloth: '#100d0a', mail: '#15120e',
                trim: '#1d1913', cape: null, helm: true, eyes: null, glow: null,
                weapon: 'none' };

/**
 * The hero, painted rather than drawn.
 *
 * `art/Pixel-Warrior.png` is two columns — idle, attack — by five rows, one row
 * per armour tier, in the same order as ARMOUR_TIERS: leather, steel, gold,
 * crystal, bone. So the row is `armourTierOf(gear.armor)` and the hero visibly
 * re-forges as the plate is bought, which is the one thing the vector kit was
 * doing that a bitmap must not lose.
 *
 * Sliced by content, not by lattice: generated sheets never land on an even
 * grid, and the attack pose is twice the width of the idle one.
 */
export const heroSheet = (src = 'art/Pixel-Warrior.png') => Atlas.sheet(src, 2, 5, { auto: true });
// Column 0 is idle, column 1 is the swing.
const heroCell = (tier, attacking) => (Math.max(1, Math.min(5, tier)) - 1) * 2 + (attacking ? 1 : 0);

/**
 * A figure with the fire on them.
 *
 * `drawActor` paints flat kit colour, which is right on the road where the
 * light is ambient and wrong here, where there is one fire and everybody is
 * standing round it. So the figure goes into a buffer of its own, a warm-to-
 * cold gradient is laid over it with `source-atop` — which paints only where
 * the figure already is — and the result is blitted back. The gradient runs
 * from the fire's side to the far side, so the two heroes across the fire from
 * each other are lit from opposite hands.
 */
let litBuf = null;
function litActor(ctx, a, x, y, t, fireX) {
  // The buffer has to hold the whole figure — a raised greatsword reaches well
  // above the head and a cape well behind the heels — and the figure's size is
  // the scale, so the buffer is sized from it rather than fixed. Grown, never
  // shrunk: one allocation covers every frame after the first.
  const h = 44 * 0.92 * a.scale;          // the body, feet to crown
  const pad = Math.ceil(h * 1.7);
  const size = pad * 2;
  if (!litBuf) litBuf = document.createElement('canvas');
  if (litBuf.width < size) { litBuf.width = size; litBuf.height = size; }
  const b = litBuf.getContext('2d');
  b.setTransform(1, 0, 0, 1, 0, 0);
  b.clearRect(0, 0, litBuf.width, litBuf.height);
  drawActor(b, a, pad, pad, t);

  // Warm on the fire's side, cold on the other. `source-atop` paints only where
  // the figure already is, so this lights the body without touching the scene.
  const dir = Math.sign(fireX - x) || 1;
  b.globalCompositeOperation = 'source-atop';
  const g = b.createLinearGradient(pad + dir * h * 0.5, pad - h * 1.1, pad - dir * h * 0.5, pad - h * 0.4);
  g.addColorStop(0, 'rgba(255,168,80,.32)');
  g.addColorStop(0.55, 'rgba(255,150,70,.07)');
  g.addColorStop(1, 'rgba(16,20,34,.40)');
  b.fillStyle = g;
  b.fillRect(0, 0, litBuf.width, litBuf.height);
  b.globalCompositeOperation = 'source-over';

  ctx.drawImage(litBuf, x - pad, y - pad);
}

/**
 * One frame of the camp. Driven from `frame()` rather than its own loop: the
 * render loop runs whether or not the run does, so the fire is already being
 * given frames and a second rAF would only fight it for them.
 */
function paintCamp(dt) {
  campT += dt;
  const cv = el.campCanvas, ctx = cv.getContext('2d');
  const box = cv.getBoundingClientRect();
  if (!box.width) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = box.width, H = box.height;
  const pw = Math.round(W * dpr), ph = Math.round(H * dpr);
  if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }

  const key = `${pw}x${ph}`;
  if (key !== camp.geom) { camp.geom = key; placeCampSlots(W, H); }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const n = camp.slots.length;
  const fireX = W / 2, fireY = H * 0.72;

  // No ground and no scenery are painted here any more: art/camp-boneyard.png is
  // the set, and a drawn clearing on top of a painted one is two grounds. All
  // that is left is the fire's own light, which has to be live because it moves.
  const flick = 0.88 + Math.sin(campT * 2.4) * 0.08 + Math.sin(campT * 7.3) * 0.04;
  const glow = ctx.createRadialGradient(fireX, fireY - 26, 10, fireX, fireY - 26, W * 0.30 * flick);
  glow.addColorStop(0, 'rgba(255,172,74,.20)');
  glow.addColorStop(0.42, 'rgba(206,116,42,.08)');
  glow.addColorStop(1, 'rgba(255,140,50,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Everyone standing, back row first so the near ones overlap them.
  const order = camp.slots.map((s, i) => i)
    .sort((a, b) => campGeom(b, n, W, H).depth - campGeom(a, n, W, H).depth);
  // The fire is a thing in the ring, not a layer over it: it goes down when the
  // sort reaches the near half, so the two who wrapped forward stand in front of
  // the flame and the two behind it are lit through it.
  let fireDown = false;
  const dropFire = () => {
    drawCampfire(ctx, fireX, fireY, campT, H / 190);
    drawCookpot(ctx, fireX, fireY, Math.max(0.8, H / 560));
    fireDown = true;
  };
  for (const i of order) {
    const s = camp.slots[i];
    const { x, y, scale, depth } = campGeom(i, n, W, H);
    if (!fireDown && depth < 0.5) dropFire();

    // Whatever is being looked at stands in a pool of light of its own, inside
    // a ring on the ground — the same gold that means "you can act on this"
    // everywhere else. Drawn before the locked branch so an empty place that
    // has been selected is lit too: the plate below names it, and this is what
    // says which of the four it is.
    if (i === camp.sel) {
      ctx.save();
      ctx.translate(x, y); ctx.scale(1, 0.34);
      const r = 22 * scale * 0.5;
      const ring = ctx.createRadialGradient(0, 0, 4, 0, 0, r);
      ring.addColorStop(0, 'rgba(200,162,74,.40)');
      ring.addColorStop(0.7, 'rgba(200,162,74,.13)');
      ring.addColorStop(1, 'rgba(200,162,74,0)');
      ctx.fillStyle = ring;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      // The rim breathes on the fire's clock, so it reads as lit rather than
      // as a decal stuck to the floor.
      ctx.strokeStyle = `rgba(224,196,99,${0.5 + Math.sin(campT * 2.2) * 0.14})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.86, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    if (s.locked) {
      // An empty place is drawn as the place: ground worn bare where somebody
      // will stand, and nothing standing on it. A dim body reads as a figure
      // lurking in the dark, which is a different and worse promise than an
      // empty seat at the fire.
      const r = 16 * scale * 0.42;
      ctx.save();
      ctx.translate(x, y); ctx.scale(1, 0.36);
      const worn = ctx.createRadialGradient(0, 0, 2, 0, 0, r);
      worn.addColorStop(0, 'rgba(30,22,14,.75)');
      worn.addColorStop(1, 'rgba(30,22,14,0)');
      ctx.fillStyle = worn;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(216,201,168,.16)';
      ctx.lineWidth = 1.6; ctx.setLineDash([6, 9]);
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      continue;
    }

    drawShadow(ctx, x, y, 6 * scale * 0.5, 0.5);
    // Everyone else stands back into the dark. Dimming the unselected is what
    // makes the selected one obvious at a glance — a highlight on its own has
    // to be found, a contrast does not.
    if (i !== camp.sel) ctx.globalAlpha = 0.62;
    const sheet = heroSheet(s.sheet);
    if (sheet) {
      // Matched to the vector figure it replaces, so the camp's composition —
      // which was tuned against that — still holds: same crown height, same
      // feet on the same ground.
      const cell = sheet.cells[heroCell(s.tier || 1, false)];
      const k = cell ? (44 * 0.92 * scale) / cell.h : 1;
      Atlas.drawSprite(ctx, sheet, heroCell(s.tier || 1, false), x, y, k, false);
    } else {
      // Only the class carrying this run's gear has a kit of its own; the rest
      // fall back to the base look for the moment before their sheet decodes.
      litActor(ctx, { kit: s.kit || kitFor('hero'), scale, walk: 0, swing: 0, hurt: 0, fx: 0.2 },
               x, y, campT + i * 1.7, fireX);
    }
    ctx.globalAlpha = 1;
  }

  if (!fireDown) dropFire();
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
      ${afford ? '' : `<span class="cardShort">☠ ${(c.cost - skulls).toLocaleString()} short</span>`}
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

