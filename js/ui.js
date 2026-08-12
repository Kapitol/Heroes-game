// DOM layer: globes, the rune belt, the armoury, the draft cards.

import { heroStats } from './entities.js';
import { levelFor, levelAt, LEVELS } from './world.js';
import { SKILLS, skillById, PERKS, MAX_SKILLS, iconOpts, TIER_BANDS } from './perks.js';
import * as Atlas from './atlas.js';
import { heroKit, drawActor, drawCampfire,
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
// Whether the open panel is the thing holding the clock — see togglePanel.
let panelPaused = false;
const runes = [];

export function init(state, handlers) {
  S = state; H = handlers;
  for (const id of ['stageName', 'stageSub', 'waveText', 'waveBar', 'skullText', 'toast', 'banner',
                    'hpGlobe', 'hpText', 'xpGlobe', 'xpStrip', 'xpText', 'skills',
                    'statList', 'gearPanel', 'menuPanel', 'runStats', 'deathOverlay', 'reviveNum',
                    'overlay', 'ovBtn', 'btnGear', 'btnMenu', 'btnReset', 'deathText',
                    'bossWrap', 'bossName', 'bossRank', 'bossBar', 'bossHp', 'castWrap', 'castName', 'castBar',
                    'killText',
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

  wearLogo();
  // The ✕ goes through the same door as the ⚒ and the ☰. Hiding the panel
  // directly skipped the bookkeeping that resumes the run, so closing a panel
  // that way left the game paused with no PAUSED tag to explain it.
  for (const b of document.querySelectorAll('[data-close]'))
    b.addEventListener('click', closePanels);

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

/**
 * Swap the painted wordmark in over the typographic title.
 *
 * `art/crypt-heroes-logo-01.png` arrives on magenta like every other cutout, so
 * it has no URL CSS can use — it has to go through `atlas.js` and come back out
 * as a data URL, the same trick the card icons use.
 *
 * **The text stays until the picture is actually there.** Set straight onto the
 * element, a sheet that has not decoded blanks the title, and a blank title is
 * indistinguishable from a broken build. So this polls for the decode and only
 * then replaces the `<h1>`, exactly like the camp background does.
 */
function wearLogo() {
  const h1 = document.getElementById('ovTitle');
  if (!h1) return;
  const tick = () => {
    // **Not auto-sliced.** The slicer finds cells by looking for empty gutters,
    // and the gaps between letters are exactly that — asking it for cells
    // returns thirteen of them and `cells[0]` is the letter C. A wordmark is one
    // picture; what is wanted here is the keyed canvas whole.
    const sh = Atlas.sheet('art/crypt-heroes-logo-01.png', 1, 1, { auto: false });
    if (!sh || !sh.canvas || !sh.canvas.width) return false;
    const cv = document.createElement('canvas');
    cv.width = sh.canvas.width; cv.height = sh.canvas.height;
    cv.getContext('2d').drawImage(sh.canvas, 0, 0);
    const img = new Image();
    img.id = 'ovLogo';
    img.alt = 'Crypt Heroes';
    img.src = cv.toDataURL();
    h1.replaceWith(img);
    return true;
  };
  if (tick()) return;
  const iv = setInterval(() => { if (tick()) clearInterval(iv); }, 120);
  setTimeout(() => clearInterval(iv), 8000);   // never poll forever
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
    // The id rides on the class so the stylesheet can colour attack and
    // healing differently — see `.rune.k-*` in css/style.css.
    b.className = `rune ready k-${s.id}`;
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

/** Shut everything and give the clock back, if we were the ones holding it. */
function closePanels() {
  el.gearPanel.classList.add('hidden');
  el.menuPanel.classList.add('hidden');
  if (panelPaused) { panelPaused = false; H.pause(false); }
}

/**
 * Open or close a panel — and stop the clock while it is open.
 *
 * Reading your own character sheet is not a turn you should be able to lose.
 * The run used to keep going behind the Armoury, so a hero could be killed by a
 * wave the player could not see, and the death overlay then rendered *through*
 * the open panel. The map already stops the clock to be read; a panel is the
 * same claim on the player's attention and gets the same treatment.
 */
export function togglePanel(id) {
  const p = el[id];
  const wasHidden = p.classList.contains('hidden');
  closePanels();
  if (wasHidden) {
    p.classList.remove('hidden');
    if (id === 'gearPanel') { el.btnGear.classList.remove('newLoot'); S.newLoot = 0; }
    refreshPanels();
  }
  // Whether *we* paused is remembered, exactly as the world map does it, so
  // closing a panel can never resume a game the player had paused first.
  const open = !p.classList.contains('hidden');
  if (open && !S.paused) { panelPaused = true; H.pause(true); }
  else if (!open && panelPaused) { panelPaused = false; H.pause(false); }
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

/**
 * The boss's health, and the move he is winding up.
 *
 * **Both are read straight off the monster, not mirrored into UI state.** The
 * fight already knows everything this shows — `m.hp`, `m.enraged`, `m.casting`
 * and `m.castT` — and a second copy would be a second thing to keep in step
 * with a creature that can die between frames.
 *
 * The cast bar is the reason a telegraph is fair. The ring on the ground says
 * *where*, and until now nothing said *how long*: `mv.tell` is the wind-up in
 * seconds and this is that number made visible, in the move's own colour so
 * the bar and the ring on the floor are obviously the same event.
 */
function drawBoss(S) {
  const boss = S.monsters && S.monsters.find((m) => m.boss && !m.dead);
  el.bossWrap.classList.toggle('hidden', !boss);
  if (!boss) return;

  el.bossName.firstChild.textContent = `${boss.name} `;
  el.bossRank.textContent = boss.enraged ? 'ENRAGED' : 'ELITE';
  el.bossRank.classList.toggle('enraged', !!boss.enraged);
  el.bossBar.querySelector('i').style.width =
    `${Math.max(0, Math.min(1, boss.hp / boss.maxHp)) * 100}%`;
  // **The number as well as the bar.** A bar answers "how much is left" and a
  // number answers "how much longer" — with a boss whose health runs into the
  // thousands, a sliver of red is the difference between one more swing and
  // twenty, and the bar alone cannot say which.
  el.bossHp.textContent = `${Math.max(0, Math.round(boss.hp))} / ${Math.round(boss.maxHp)}`;

  const mv = boss.casting;
  el.castWrap.classList.toggle('hidden', !mv);
  if (!mv) return;
  el.castName.textContent = mv.text;
  const fill = el.castBar.querySelector('i');
  fill.style.width = `${Math.min(1, (boss.castT || 0) / Math.max(0.05, mv.tell)) * 100}%`;
  fill.style.background = mv.colour || '#ff7a3a';
}

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
  el.killText.textContent = (S.kills | 0).toLocaleString();
  drawBoss(S);

  // The globe fills towards the cheapest thing skulls can still buy — which is
  // now only ever a card, since armour is taken off bosses and never bought.
  //
  // It no longer *glows* when it fills. The gold pulse means "you can act on
  // this now", and this globe opens the Armoury, which sells nothing — it fired
  // permanently from about wave three and was visually identical to the loot
  // flash, which does mean something. One signal, one meaning.
  const afford = Math.min(1, S.skulls / TIER_BANDS[1].max);
  el.xpGlobe.querySelector('i').style.height = `${afford * 100}%`;

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
  // Never a death screen layered over a character sheet: dying while the
  // Armoury was open printed both, fully legible, on top of each other.
  el.gearPanel.classList.add('hidden');
  el.menuPanel.classList.add('hidden');
  panelPaused = false;
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
/**
 * Dress the camp for the level about to be walked.
 *
 * One painted set per area, and the CSS carries the boneyard as the default so
 * an area whose backdrop has not been drawn yet shows *a* camp rather than a
 * black box. The swap only happens once the image has actually decoded — set
 * straight onto the element, a missing file blanks the panel, and the first
 * thing the player sees on opening the screen is nothing at all.
 */
/**
 * **The rendered wood camp is the default set now**, not the painted boneyard.
 *
 * Nine of the ten areas have no camp of their own and every one of them used to
 * fall back to `camp-boneyard.png`, which meant nine levels were shown a
 * graveyard whatever they were called. The fallback is the *rendered* set
 * because a render is the thing this project can now make more of — a new area
 * is a prop list and a seed in `tools/bake-camp.py`, not a generation and a
 * keying pass — so the default should be the kind of set the next one will be.
 */
const CAMP_FALLBACK = 'art/camp-wood.png';
let campArt = null;

/**
 * The areas whose camp is *painted* rather than rendered.
 *
 * The two kinds are sized differently and have to be, because they are made
 * against different rulers. A painting is drawn at whatever scale the generator
 * felt like and is then magnified until the figures look right on it, which is
 * what `background-size: 215%` is. A rendered set is built at the game's own
 * metres-per-pixel — a man is `44 * 0.92 * scale` tall in it by construction —
 * so it is shown at its own size, `auto 100%`, which is the CSS default now.
 * Getting this list wrong is visible immediately: a painting at 100% is a
 * postage stamp in a black field, and a render at 215% is a close-up of a
 * campfire.
 */
const PAINTED = new Set(['town']);

/**
 * The firelight, as light rather than as a glow.
 *
 * `tools/bake-camp.py` renders a rendered camp four times: once with the fire
 * out, and three more with the fire *alone* and its flame moved a hand's width
 * between each. Those three are `-fire1..3.png`, black everywhere the fire does
 * not reach, and light is additive — so drawing them over the set with
 * `lighter`, at weights that wander, relights the scene from the middle every
 * frame. Stones' shadows swing, the near faces of the rocks take the light and
 * give it up, the bushes at the clearing's edge come forward and go back.
 *
 * The alternative is what this replaces: one radial gradient. A gradient
 * brightens the picture; it cannot light anything *in* the picture, because it
 * does not know where anything is. Three plates do, because Blender did.
 */
const FIRE_PLATES = 3;
let firelight = null;

function loadFirelight(src) {
  firelight = { stem: src.slice(0, -4), base: null, imgs: [], scaled: null, key: '' };
  const mine = firelight;
  // **The base plate is loaded here too, and drawn on the canvas rather than
  // left to CSS.** It has to be: the plates are opaque PNGs and `lighter` adds
  // *alpha* as well as colour, so drawing them over a transparent canvas makes
  // the canvas opaque — black wherever the fire does not reach — and the
  // background-image underneath is hidden completely. That bug shipped a camp
  // lit by nothing but firelight, with the moon, the sky and the whole treeline
  // sitting behind an opaque black sheet, and it looked exactly like a scene
  // that was simply too dark. The CSS background stays as the first thing on
  // screen while these decode; from then on the canvas is the picture.
  const base = new Image();
  base.onload = () => { if (firelight === mine) mine.base = base; };
  base.src = src;
  for (let i = 0; i < FIRE_PLATES; i++) {
    const img = new Image();
    // A missing plate is not an error. A camp set may be a single image — every
    // painted one is — and the gradient is still there to fall back on.
    img.onload = () => { if (firelight === mine) mine.imgs[i] = img; };
    img.src = `${mine.stem}-fire${i + 1}.png`;
  }
}

/**
 * Scale the plates to the element once, not every frame.
 *
 * Each is 3200x1440 and the viewport is a third of that, so blitting them at
 * source size means three full downscales a frame for a screen that never
 * moves. They are redrawn only when the canvas changes size — which is a resize
 * and nothing else.
 */
function scaleFirelight(W, H, dpr) {
  const key = `${Math.round(W * dpr)}x${Math.round(H * dpr)}`;
  if (firelight.key === key && firelight.scaled) return true;
  if (!firelight.base) return false;
  if (firelight.imgs.length < FIRE_PLATES || firelight.imgs.some((i) => !i)) return false;
  // **Cached at device pixels, not CSS pixels.** The canvas is sized
  // `W * dpr` and drawn through a `setTransform(dpr, …)`, so a cache built at
  // CSS size is upscaled by the device ratio on the way to the screen — the
  // 3200-wide set was being squeezed to 1015 and blown back up to 2030, which
  // is the whole backdrop running at half resolution on any retina display.
  // Building the cache at device size makes the final blit 1:1.
  const fit = (img) => {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(W * dpr));
    c.height = Math.max(1, Math.round(H * dpr));
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.scale(dpr, dpr);
    // Laid out exactly as `background-size: auto 100%; background-position:
    // 50% 50%` lays the set out, or the light lands a few pixels off the thing
    // it is supposed to be coming off.
    const dw = H * (img.naturalWidth / img.naturalHeight);
    g.drawImage(img, (W - dw) / 2, 0, dw, H);
    return c;
  };
  firelight.scaled = firelight.imgs.map(fit);
  firelight.scaledBase = fit(firelight.base);
  firelight.key = key;
  return true;
}

function paintFirelight(ctx, W, H, dpr) {
  if (!firelight || !scaleFirelight(W, H, dpr)) return false;
  // Three slow waves that never line up, normalised so the total light stays
  // put while its *direction* wanders — then one fast flicker over all of it.
  // Normalising matters: without it the three sum to a brightness that pumps,
  // and a fire that pumps in step with its own movement reads as a lamp on a
  // dimmer rather than as a flame.
  const F = [1.9, 2.7, 1.45], O = [0, 2.1, 4.0];
  let sum = 0;
  const raw = F.map((f, i) => {
    const v = 0.15 + 0.85 * (0.5 + 0.5 * Math.sin(campT * f + O[i]));
    sum += v;
    return v;
  });
  // **Over one plate's worth, not under.** The plates were rendered as light and
  // are being added as *pixels*: Blender tone-maps each pass on its own, so the
  // sum of two tone-mapped plates is dimmer than one tone-mapped sum. 1.28 is
  // where the composite matches the single render this replaced, measured by
  // eye against it at the fire's edge.
  const amp = 1.28 + 0.15 * Math.sin(campT * 7.3) + 0.07 * Math.sin(campT * 11.9);
  ctx.save();
  // The set with the fire out, and then the fire added to it.
  ctx.drawImage(firelight.scaledBase, 0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter';
  firelight.scaled.forEach((c, i) => {
    ctx.globalAlpha = Math.max(0, (raw[i] / sum) * amp);
    ctx.drawImage(c, 0, 0, W, H);
  });
  ctx.restore();
  return true;
}

/**
 * The figure's own silhouette, thrown across the ground by the fire.
 *
 * `drawShadow` puts a soft round blot under a figure, which is right on the
 * road — the light there is ambient and comes from nowhere in particular. At
 * the camp there is one light and everybody can see where it is, so a disc is
 * the one thing in the frame openly disagreeing with the set: the rendered
 * stones throw real shadows outward from the pit and the heroes standing
 * between them had a puck.
 *
 * **It is the sprite, not a shape that stands in for it.** Two passes were
 * spent on ellipses — one plain, one with a contact patch — and neither reads,
 * because the thing that says *shadow* is recognising the shoulders and the
 * sword in it. So the cell being drawn is rendered into a buffer, filled solid
 * through `source-in` to make a silhouette, and laid on the ground.
 *
 * Three things make it lie down properly:
 *
 * - **The ground, not the screen.** The ground is seen at 24°, so the frame is
 *   squashed by `GROUND` and *then* rotated by the away-angle measured in
 *   un-squashed space. Rotating first — or measuring the angle on screen —
 *   points the two figures at the sides visibly wrong.
 * - **Up becomes away.** Inside that frame the sprite is sheared by
 *   `transform(0, w, -L, 0, 0, 0)`, which sends the sprite's vertical axis
 *   along the ground away from the fire and its horizontal axis across. Feet
 *   stay at the feet; the crown lands `L` figure-heights out.
 * - **It fades along its length**, erased by a gradient in the buffer before it
 *   is ever transformed — so the falloff follows the body from sole to crown
 *   rather than following the screen. A shadow that is as dark at the far end
 *   as at the feet reads as a cut-out lying on the floor.
 *
 * It lengthens and weakens with distance from the fire, and both breathe on
 * `campT` — the clock the firelight plates are cross-faded on, so the shadow
 * moves with the light that casts it rather than on a rhythm of its own.
 */
const GROUND = 0.34;
const SQUASH = 0.55;
let shadowBuf = null;

/**
 * The cell being drawn, as one flat colour, in a shared buffer.
 *
 * Two things on this screen need the figure's *outline* rather than the figure:
 * the shadow it throws, and the mark that says which hero is selected. Both are
 * the same operation — draw the sprite, then `source-in` a colour through the
 * alpha that is already there — so it lives once. Returns the padding, which is
 * where the feet ended up.
 *
 * Grown, never shrunk: one allocation covers every frame after the first, the
 * same reasoning as `litBuf`, and the padding is generous because a raised
 * sword reaches well above the head.
 */
function silhouette(sheet, idx, k, flip, h, colour, taper) {
  const pad = Math.ceil(h * 1.8);
  const size = pad * 2;
  if (!shadowBuf) shadowBuf = document.createElement('canvas');
  if (shadowBuf.width < size) { shadowBuf.width = size; shadowBuf.height = size; }
  const b = shadowBuf.getContext('2d');
  b.setTransform(1, 0, 0, 1, 0, 0);
  b.clearRect(0, 0, shadowBuf.width, shadowBuf.height);
  Atlas.drawSprite(b, sheet, idx, pad, pad, k, flip);
  b.globalCompositeOperation = 'source-in';
  b.fillStyle = colour;
  b.fillRect(0, 0, shadowBuf.width, shadowBuf.height);
  if (taper) {
    // Erased towards the crown, which is the far end once it is thrown.
    b.globalCompositeOperation = 'destination-out';
    const g = b.createLinearGradient(0, pad, 0, pad - h * 1.25);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.55, 'rgba(0,0,0,.22)');
    g.addColorStop(1, 'rgba(0,0,0,.92)');
    b.fillStyle = g;
    b.fillRect(0, 0, shadowBuf.width, shadowBuf.height);
  }
  b.globalCompositeOperation = 'source-over';
  return pad;
}

/**
 * Which hero is selected: a thick black ring on the ground he stands in.
 *
 * This started as a pool of gold light and then as a warm halo on the figure.
 * The pool was wrong because it is a second light source in a scene whose whole
 * argument is that there is one; the halo was wrong for the opposite reason —
 * it competed with the fire for the same job, warm light on the same body.
 *
 * A ring is neither. It is not light at all, it is a *mark* — the one thing on
 * this screen that is allowed to be a piece of interface rather than a piece of
 * the world, and drawn dark it takes light away rather than adding any. Thick,
 * because at 300 pixels a hairline reads as a scratch on the lens, and squashed
 * onto the same 0.34 the party ellipse uses so it lies on the ground the feet
 * are on.
 */
function campRing(ctx, x, y, scale) {
  const r = 15 * scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, GROUND);
  ctx.lineWidth = Math.max(3, 2.6 * scale);
  ctx.strokeStyle = 'rgba(0,0,0,.86)';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  // A hair of warm inside the black, on the fire's clock, so the ring is lit by
  // the same fire as everything else rather than sitting on top of the picture.
  ctx.lineWidth = Math.max(1, 0.7 * scale);
  ctx.strokeStyle = `rgba(224,196,99,${(0.30 + 0.12 * Math.sin(campT * 2.2)).toFixed(3)})`;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.93, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function campShadow(ctx, sheet, idx, k, flip, x, y, scale, fireX, fireY, W) {
  const gx = x - fireX, gy = (y - fireY) / GROUND;
  const dist = Math.hypot(gx, gy) || 1;
  const h = 44 * 0.92 * scale;              // the body, feet to crown

  // Grown, never shrunk: one allocation covers every frame after the first.
  // Same reasoning as `litBuf`, and the same generous padding — a raised sword
  // reaches well above the head.
  const pad = silhouette(sheet, idx, k, flip, h, '#000000', true);

  const L = (0.95 + Math.min(0.95, dist / (W * 0.30)))
    * (1 + 0.045 * Math.sin(campT * 7.3));
  // Near-solid at the feet. The fire is the only light on this ground, so what
  // it cannot reach is *black*, not a suggestion — earlier passes at 0.62 and
  // 0.85 both read as no shadow at all on a screen that is already dark.
  const fade = (1.0 / (1 + dist / (W * 0.55)))
    * (0.92 + 0.1 * Math.sin(campT * 2.4));
  ctx.save();
  // Multiplied into whatever alpha the caller is drawing at, so an unselected
  // hero's shadow dims with him instead of staying at full strength.
  ctx.globalAlpha *= fade;
  ctx.translate(x, y);
  // **`SQUASH`, not `GROUND`, and that is a deliberate lie.** A shadow lying
  // flat and seen at 24° is foreshortened to a third of its width — which is
  // exactly what the first version did, and it came out as a laser beam leaving
  // the boots. Correct, and useless: at this size the only thing that makes a
  // shadow read is recognising a body in it, and a body a third of its width is
  // not recognisable. So the shadow stands up off the ground, at 0.55 rather
  // than 0.34, and is thrown shorter to match. The party ellipse and the
  // contact of the feet stay on the true 0.34; only the silhouette cheats.
  ctx.scale(1, SQUASH);
  ctx.rotate(Math.atan2(gy, gx));
  ctx.transform(0, 1.12, -L, 0, 0, 0);
  ctx.filter = `blur(${Math.max(1, h * 0.045).toFixed(1)}px)`;
  ctx.drawImage(shadowBuf, -pad, -pad);
  ctx.filter = 'none';
  ctx.restore();
}

function dressCamp(area) {
  const src = area ? `art/camp-${area}.png` : CAMP_FALLBACK;
  if (src === campArt) return;
  const img = new Image();
  img.onload = () => {
    campArt = src;
    el.campScene.classList.toggle('painted', PAINTED.has(area));
    el.campScene.style.backgroundImage = `url("../${src}")`;
    firelight = null;
    if (!PAINTED.has(area)) loadFirelight(src);
  };
  img.onerror = () => {
    campArt = CAMP_FALLBACK;
    el.campScene.classList.remove('painted');
    el.campScene.style.backgroundImage = `url("../${CAMP_FALLBACK}")`;
    firelight = null;
    loadFirelight(CAMP_FALLBACK);
  };
  img.src = src;
}

export function showCamp(roster, area) {
  el.campPanel.classList.toggle('hidden', !roster);
  if (roster) dressCamp(area);
  // The road's HUD has nothing to say here — no life to watch, no cooldowns to
  // spend — and left up it competes with the one thing this screen is for.
  document.body.classList.toggle('camp', !!roster);
  if (!roster) { camp = null; return; }
  // Every visit starts dark and fades up, so the scene never opens on a
  // half-decoded roster. Touching each sheet here also *starts* the decode a
  // frame before the first paint asks for it.
  campFade = 0;
  el.campScene.style.opacity = '0';
  for (const s of roster) if (s.sheet) heroSheet(s.sheet, s.cols || 2, s.rows || 5);
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
  // **2.6, from the reference shot.** Measured off WoW's character select: a
  // character stands about 31% of the viewport's height there, and ours stood
  // at 15%. `44 * 0.92 * (H/300) * m * (1 - depth*0.34)` reaches 31% at m=2.6.
  //
  // This is *not* the earlier 1.35, which was the figure's true scale against
  // the painting. The reference solves that differently: it moves the camera
  // in, so the set is magnified by the same amount as the characters and the
  // relationship between them survives. The backdrop's `background-size` in
  // css/style.css carries the other half of this number — change one and the
  // hero is either a giant in a wide field or a doll in a close-up.
  const scale = (H / 300) * 2.6 * (1 - depth * 0.34);
  return { f: x / W, depth, x, y, scale, headY: y - 44 * 0.92 * scale };
}

function buildCampSlots() {
  el.campSlots.innerHTML = '';
  camp.slots.forEach((s, i) => {
    const b = document.createElement('button');
    b.className = `campSlot${s.locked ? ' locked' : ''}${i === camp.sel ? ' sel' : ''}`;
    b.setAttribute('aria-label', `${s.name || 'Empty place'} — ${s.sub || ''}`);
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
// **Rows are not always five.** The warrior's sheets are five armour tiers deep
// and every painted class sheet is too, but the three at the fire who are not
// the run's hero have one outfit and one row — asking `sliceGrid` for five out
// of a one-row sheet cuts the figure into head, chest, knees and two empties.
export const heroSheet = (src = 'art/Pixel-Warrior.png', cols = 2, rows = 5) =>
  Atlas.sheet(src, cols, rows, cols === 2 ? { auto: true } : undefined);
// Column 0 is idle whatever the sheet; the painted classes carry two columns
// and the baked doll four, so the stride between rows is the column count.
const heroCell = (tier, attacking, cols = 2, frame = 0) =>
  (Math.max(1, Math.min(5, tier)) - 1) * cols
  + (attacking ? 1 : Math.min(cols - 1, Math.max(0, frame)));

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
 * Stars, over the painted sky and under everything else.
 *
 * **Deterministic positions, drifting brightness.** The field is generated
 * from a fixed seed each frame rather than stored, so it survives a resize
 * without a rebuild and costs no state; the twinkle is two sine waves of
 * different periods per star, which never quite line up and so never look
 * like a pulse. Amplitudes are small on purpose — a star that goes out
 * entirely reads as a dead pixel, and one that flashes reads as an effect.
 *
 * They stop a third of the way down, where the backdrop's treeline begins.
 * Below that the sky is not sky, and a star behind a tent is a bug nobody has
 * to see twice.
 */
const STARS = 90;
function drawStars(ctx, W, H) {
  const band = H * 0.34;
  ctx.save();
  for (let i = 0; i < STARS; i++) {
    // A cheap hash, so the sky is the same sky every frame and every session.
    const a = Math.sin(i * 12.9898) * 43758.5453;
    const b = Math.sin(i * 78.233) * 12345.6789;
    const x = (a - Math.floor(a)) * W;
    const y = (b - Math.floor(b)) * band;
    const twinkle = 0.55
      + 0.28 * Math.sin(campT * 1.1 + i * 2.3)
      + 0.17 * Math.sin(campT * 0.43 + i * 5.1);
    // Fading out towards the treeline keeps the field from ending on a line.
    const fade = 1 - (y / band) ** 1.5;
    const r = 0.6 + ((a * 7) - Math.floor(a * 7)) * 0.8;
    ctx.globalAlpha = Math.max(0, twinkle * fade * 0.5);
    ctx.fillStyle = i % 9 === 0 ? '#cfe0ff' : '#f3ecd8';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * One frame of the camp. Driven from `frame()` rather than its own loop: the
 * render loop runs whether or not the run does, so the fire is already being
 * given frames and a second rAF would only fight it for them.
 */
// **The figure keeps its own clock.** `campT` drives the fire's flicker and
// the selection ring's pulse, and a hero stepping his frames off the same
// accumulator ends up beating with them — not in step exactly, but close
// enough and often enough that the eye reads it as mechanical. One extra
// number buys a body that is plainly not on the fire's rhythm.
let idleT = 0;
// 0 while sheets are still decoding, then eases to 1. The camp is a still
// scene a player looks at rather than acts in, so it can afford to arrive.
let campFade = 0;

function paintCamp(dt) {
  campT += dt;
  idleT += dt;

  // **Everybody, or nobody.** A per-figure fade would stagger them in as each
  // sheet finished, which is the same pop spread over more frames. `Atlas.sheet`
  // returns null until an image has decoded, so this asks the same question the
  // draw does. The `0.6` floor means a camp whose art never loads at all still
  // becomes visible rather than staying black for ever.
  // **Only the slots that will actually draw a body.** A locked class has a
  // sheet name in its slot and no art on disk, so waiting on it meant `ready`
  // was never true and the camp crept in over the fallback's full three
  // seconds — which looks less like a fade and more like a fault.
  const wanted = camp.slots.filter((s) => s.sheet && s.anim);
  const ready = wanted.every((s) => heroSheet(s.sheet, s.cols || 2, s.rows || 5)
    && (!s.anim || !s.anim.b || heroSheet(s.anim.b.src, s.anim.b.cols, s.rows || 5)));
  campFade = Math.min(1, campFade + dt / (ready ? 0.35 : 0.9));
  el.campScene.style.opacity = campFade.toFixed(3);
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
  // **Every figure on this screen is upscaled**, so the filter used to do it is
  // not a detail. The camp draws a hero ~300 CSS pixels tall, which is 600
  // device pixels on a retina display against a sheet baked at 300, and the
  // default `imageSmoothingQuality` is `'low'` — a cheap bilinear that leaves
  // the doubled pixels visibly mushy. It costs nothing to ask for the good one.
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, W, H);
  const n = camp.slots.length;
  const fireX = W / 2, fireY = H * 0.72;

  // No ground and no scenery are painted here any more: the camp set is the
  // set, and a drawn clearing on top of a rendered one is two grounds. All that
  // is left is the fire's own light, which has to be live because it moves.
  if (!paintFirelight(ctx, W, H, dpr)) {
    // The painted camps have no plates, so they keep the gradient. It is a
    // glow rather than light: it brightens the picture without anything in the
    // picture being lit, which is exactly the difference the plates buy.
    const flick = 0.88 + Math.sin(campT * 2.4) * 0.08 + Math.sin(campT * 7.3) * 0.04;
    const glow = ctx.createRadialGradient(fireX, fireY - 26, 10, fireX, fireY - 26, W * 0.30 * flick);
    glow.addColorStop(0, 'rgba(255,172,74,.20)');
    glow.addColorStop(0.42, 'rgba(206,116,42,.08)');
    glow.addColorStop(1, 'rgba(255,140,50,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
  }
  // **After the set, not before it.** A rendered camp draws its base plate onto
  // this canvas, and the base is opaque — stars laid down first are painted over
  // by the sky they are supposed to be in.
  drawStars(ctx, W, H);

  // Everyone standing, back row first so the near ones overlap them.
  const order = camp.slots.map((s, i) => i)
    .sort((a, b) => campGeom(b, n, W, H).depth - campGeom(a, n, W, H).depth);
  // The fire is a thing in the ring, not a layer over it: it goes down when the
  // sort reaches the near half, so the two who wrapped forward stand in front of
  // the flame and the two behind it are lit through it.
  let fireDown = false;
  // **A rendered camp brings its own fire.** `bake-camp.py` puts a flame in
  // every firelight plate and a different one in each, so the cross-fade that
  // swings the light also plays the fire, and the iron tripod over it is
  // modelled and lit from underneath. Drawing the canvas fire on top of that is
  // two fires in one grate — flat quadratic tongues and a black outline sitting
  // over a lit set, which is exactly the mismatch this whole pass removed
  // everywhere else. The painted camps have neither and keep both.
  const dropFire = () => {
    if (!firelight) {
      drawCampfire(ctx, fireX, fireY, campT, H / 190);
      drawCookpot(ctx, fireX, fireY, Math.max(0.8, H / 560));
    }
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

    // **A locked class with a doll still stands there.** The rule below — draw
    // the place, not the person — was written when the only stand-in available
    // was the vector kit, and a dim vector figure at a fire does read as
    // somebody lurking. A baked doll does not; it reads as a person who cannot
    // be chosen, which is exactly what they are, and the plate says so. The
    // worn ground is kept for a class with no art at all.
    if (s.locked && !s.sheet) {
      // An empty place is drawn as the place: ground worn bare where somebody
      // will stand, and nothing standing on it.
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

    // **Everybody is drawn solid.** The unselected used to be dimmed to 0.62 on
    // the reasoning that a contrast is found faster than a highlight — which is
    // true of a list and false of a camp. At 0.62 the ground shows through the
    // three who are not chosen and they read as ghosts standing at the fire,
    // which is a worse thing to say about a class than "not this run". The halo
    // marks the chosen one; the plate names him.

    // **Two loops of the plain idle, then one of the variation**, walked from
    // the clock rather than from a counter: a counter needs state that has to
    // survive a resize and a change of class, and the clock already knows.
    // Each figure is offset by its slot so four heroes round a fire do not
    // breathe in unison.
    const an = s.anim;
    let src = s.sheet, cols = s.cols || 2, frame = 0;
    if (an) {
      // **The variation sheet is optional.** The run's own hero has two idles
      // and walks `breakAt - 1` loops of the first before one of the second;
      // the three sitting with him have one apiece, and with no `b` the cycle is
      // simply that one loop. Same code, one fewer sheet.
      const plain = an.a.cols * (an.breakAt - 1);
      const cycle = plain + (an.b ? an.b.cols : 0);
      const at = Math.floor(idleT * an.fps + i * 1.7) % cycle;
      if (at < plain) { src = an.a.src; cols = an.a.cols; frame = at % an.a.cols; }
      else { src = an.b.src; cols = an.b.cols; frame = at - plain; }
    }

    const sheet = heroSheet(src, cols, s.rows || 5);
    if (sheet) {
      const idx = heroCell(s.tier || 1, false, cols, frame);
      // **Sized from one reference cell, never from the frame being drawn.**
      // `sliceGrid` trims every cell to its own content, so a frame where the
      // sword rides higher is a taller cell — and dividing by *that* made the
      // hero shrink whenever his weapon went up. The row's first cell is the
      // ruler, so his height is a property of the character rather than of the
      // pose. It has to be the *same* reference across both sheets, which is
      // why the two idles are baked at one `fh`.
      // Baked figure height when we have one — see `fh` in DOLL_CAMP — and the
      // cell's own height only for the painted classes, which have no bake to
      // ask. Frame 0 is not good enough: the two idle sheets start from
      // different poses, so the hero changed size as the cycle crossed over.
      const ref = an ? an.fh : (sheet.cells[heroCell(s.tier || 1, false, cols, 0)] || {}).h;
      const k = ref ? (44 * 0.92 * scale) / ref : 1;
      // **Turned to face the fire.** The doll bakes facing screen-right —
      // doll.html puts the camera on -X so the character's +Z is to the right —
      // and every sheet in the game inherits that, so a figure standing on the
      // fire's right has to be mirrored or he is looking out of the picture.
      // A ring of people all facing the same way is a queue, not a camp.
      const flip = x > fireX;
      // The shadow is this same cell, laid down on the ground first, and the
      // selection halo sits between the two.
      campShadow(ctx, sheet, idx, k, flip, x, y, scale, fireX, fireY, W);
      if (i === camp.sel) campRing(ctx, x, y, scale);
      Atlas.drawSprite(ctx, sheet, idx, x, y, k, flip);
    }
    // **No stand-in.** This used to fall back to the vector kit while a sheet
    // decoded, which meant every visit to the camp opened on four simple
    // shapes that were then replaced by the real figures a beat later. A pop
    // like that reads as a bug even when it is only a loader; better to draw
    // nothing for the few frames it takes and fade the whole scene in once
    // everybody has arrived — see `campReady` below.
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
    b.setAttribute('aria-label',
      `${c.name}${c.tier > 1 ? ` tier ${c.tier}` : ''} — ${c.desc} — `
      + (c.cost > 0 ? `costs ${c.cost} skulls` : 'free')
      + (afford ? '' : `, ${c.cost - skulls} short`));
    b.disabled = !afford;
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

