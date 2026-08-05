// The Coffin Drop — the payout game between fights.
//
// A wave's spoils go into a coffin and the coffin goes down a crypt shaft. Each
// floor is a slab with a gap in it; fall through the gap and you reach the next
// floor down, which is worth more. Land on stone and that is where the run ends
// and what you are paid.
//
// You choose the lane and nothing else: slide the coffin along the lip of the
// shaft, let go, and it falls.
//
// The reward is the skulls it sheds on the way down. Every buttress stone it
// clips knocks a few loose — so you *want* to hit stones — but stone also robs
// its speed, and each slab below needs more speed than the last to smash
// through. Chutes give the speed back and shake nothing loose.
//
// So the two halves of the payout pull against each other: skulls are the
// count, the depth reached is the multiplier, and the lane you pick decides how
// much of each you get. Doing nothing is still safe and still pays — after a
// few seconds the coffin drops on its own.

import * as Atlas from './atlas.js';

// The painted set. Every sheet here is auto-sliced: these came back on uneven
// rows like the rest, and the cells below are the reading order the slicer
// produces.
const ART = {
  coffin: 'art/coffin.png',      // 0 upright · 1 tumbling · 2 burst open
  parts: 'art/shaft-parts.png',  // 0/1 stone small·large · 2/3 chute · 4 slab · 5 slab smashed
  skulls: 'art/skulls.png',      // 0-3 skulls · 4-7 rubble
  wall: 'art/shaft-wall.png',
};
const COFFIN_UP = 0, COFFIN_TUMBLE = 1, COFFIN_BURST = 2;
const STONE = 0, CHUTE = 2, SLAB = 4, SLAB_BROKEN = 5;

const art = (src) => Atlas.sheet(src, 0, 0, { auto: true });

/**
 * Draw one cell `w` wide, keeping its aspect, with (x, y) landing `ayf` of the
 * way down it.
 *
 * `drawSprite` anchors to the bottom centre, which is right for a prop standing
 * on a tile and wrong for everything in here: a stone is centred on the point
 * it deflects from, and a chute hangs its flame *below* the ring that does the
 * deflecting. The anchor has to be a parameter.
 */
function blit(ctx, s, i, x, y, w, ayf, rot) {
  const c = s.cells[i];
  if (!c) return;
  const h = (c.h / c.w) * w;
  if (rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.drawImage(s.canvas, c.x, c.y, c.w, c.h, -w / 2, -h * ayf, w, h);
    ctx.restore();
    return;
  }
  ctx.drawImage(s.canvas, c.x, c.y, c.w, c.h, x - w / 2, y - h * ayf, w, h);
}

const GRAVITY = 780;
const MAX_VY = 1500;
const HOLD = 1.6;          // seconds to read the result before moving on
const AIM_TIMEOUT = 5;     // an idle player still gets their skulls
const R = 24;              // coffin radius, for collisions

// One multiplier per row, straight down: the deeper it gets, the more each
// skull is worth.
const MULTS = [1, 2, 3, 4, 5];
// Speed needed to smash each slab. The first is free — you always bank
// something — and every line after it asks for meaningfully more, so the last
// is only reachable off a clean run of chutes.
const NEEDS = [0, 380, 600, 860, 1150];

const LOAD = 24;           // skulls in the coffin to begin with
// Tuned so an unaimed drop returns roughly the pot: the minigame should be a
// multiplier on the fight, not a replacement for it.
const SKULL_PAR = 24;

export function start(pot) {
  return {
    pot: Math.max(1, Math.round(pot)),
    floors: null, pegs: null,
    x: 0, y: 0, vx: 0, vy: 0,
    phase: 'aim',            // aim -> fall -> landed
    aimT: 0,
    idx: 0,
    skulls: 0, load: LOAD, spills: [],
    landed: false, landedOn: 0,
    shards: [], flash: 0, shake: 0,
    t: 0, hold: 0,
    layout: null,
  };
}

/**
 * Build the shaft: five slabs, and a field of blockers and chutes between
 * them. Pieces are laid on a loose lane grid so that reading the board is a
 * real decision — some columns are a clear run, others are a wall of stone.
 */
function layout(st, cw, ch) {
  const half = Math.min(cw * 0.38, 250);
  const left = cw / 2 - half, right = cw / 2 + half;
  const top = ch * 0.30, bottom = ch * 0.82;
  const n = MULTS.length;

  const floors = [];
  for (let i = 0; i < n; i++) {
    floors.push({
      i,
      y: top + ((bottom - top) * i) / (n - 1),
      mult: MULTS[i],
      need: NEEDS[i],
    });
  }

  const pegs = [];
  const lanes = 5;
  for (let i = 0; i < n - 1; i++) {
    const y0 = floors[i].y, y1 = floors[i + 1].y;
    const rows = 2;
    for (let r = 0; r < rows; r++) {
      const y = y0 + ((y1 - y0) * (r + 1)) / (rows + 1);
      for (let l = 0; l < lanes; l++) {
        if (Math.random() < 0.42) continue;                 // leave lanes open
        const x = left + (half * 2) * ((l + 0.5) / lanes) + (Math.random() - 0.5) * 22;
        // `big` only picks which of the two painted sizes gets drawn; the
        // collision radius is still `r`, so the art can vary without the board
        // playing differently from how it reads.
        pegs.push({
          x, y, r: 15 + Math.random() * 6,
          boost: Math.random() < 0.42,
          big: Math.random() < 0.5,
        });
      }
    }
  }

  st.floors = floors;
  st.pegs = pegs;
  st.x = cw / 2;
  st.y = ch * 0.18;
  st.layout = { cw, ch, left, right, top: ch * 0.18 };
}

export function update(st, dt, cw, ch, sfx) {
  st.t += dt;
  if (!st.layout || st.layout.cw !== cw || st.layout.ch !== ch) layout(st, cw, ch);
  const L = st.layout;
  st.flash = Math.max(0, st.flash - dt * 3);
  st.shake = Math.max(0, st.shake - dt * 4);

  for (let i = st.shards.length - 1; i >= 0; i--) {
    const s = st.shards[i];
    s.vy += GRAVITY * 0.9 * dt;
    s.x += s.vx * dt; s.y += s.vy * dt; s.rot += s.spin * dt;
    if ((s.life -= dt) <= 0) st.shards.splice(i, 1);
  }
  for (let i = st.spills.length - 1; i >= 0; i--) {
    const k = st.spills[i];
    k.vy += GRAVITY * 1.2 * dt;
    k.x += k.vx * dt; k.y += k.vy * dt; k.rot += k.spin * dt;
    if (k.y > ch + 40 || (k.life -= dt) <= 0) st.spills.splice(i, 1);
  }

  if (st.phase === 'aim') {
    st.aimT += dt;
    if (st.aimT >= AIM_TIMEOUT) release(st);       // never let a run stall
    return 'running';
  }

  if (st.phase === 'landed') {
    st.hold += dt;
    return st.hold >= HOLD ? 'done' : 'running';
  }

  st.vy = Math.min(MAX_VY, st.vy + GRAVITY * dt);
  st.vx *= Math.pow(0.94, dt * 60);

  const py = st.y;
  st.x += st.vx * dt;
  st.y += st.vy * dt;

  if (st.x < L.left + R) { st.x = L.left + R; st.vx = Math.abs(st.vx) * 0.5; }
  if (st.x > L.right - R) { st.x = L.right - R; st.vx = -Math.abs(st.vx) * 0.5; }

  // The field. A blocker robs speed and knocks it aside; a chute pours speed
  // in. Everything else about the drop follows from which ones it clips.
  for (const p of st.pegs) {
    const dx = st.x - p.x, dy = st.y - p.y;
    const rr = p.r + R * 0.7;
    if (dx * dx + dy * dy > rr * rr) continue;
    if (p.hit && st.t - p.hit < 0.25) continue;
    p.hit = st.t;
    if (p.boost) {
      st.vy = Math.min(MAX_VY, st.vy * 1.2 + 260);
      st.flash = Math.max(st.flash, 0.5);
      if (sfx) sfx.buff();
      burst(st, 8, true);
    } else {
      // Stone is where the reward comes from: it shakes skulls out of the
      // coffin, and takes speed in exchange.
      // Costly, but not ruinous: clipping stone has to stay worth doing, or
      // the reward half of the game is a trap.
      st.vy *= 0.74;
      st.vx += (dx >= 0 ? 1 : -1) * (90 + Math.random() * 70);
      st.shake = Math.max(st.shake, 0.35);
      const spill = Math.min(st.load, 2 + Math.floor(Math.random() * 3));
      st.load -= spill;
      st.skulls += spill;
      for (let k = 0; k < spill; k++) spillSkull(st);
      if (sfx) sfx[spill ? 'bones' : 'hit']();
    }
  }

  // Slabs: enough speed and it goes through, otherwise this is the floor.
  const f = st.floors[st.idx];
  if (f && py < f.y && st.y >= f.y) {
    if (st.vy >= f.need) {
      st.idx++;
      st.vy *= 0.82;                     // breaking stone costs momentum
      st.flash = 0.8;
      st.shake = Math.max(st.shake, 0.5);
      burst(st, 16);
      // Smashing through shakes the box as well, or a clean run down an empty
      // lane would reach the bottom carrying nothing and pay nothing — depth
      // has to be worth something on its own.
      const jolt = Math.min(st.load, 1 + Math.floor(Math.random() * 2));
      st.load -= jolt;
      st.skulls += jolt;
      for (let k = 0; k < jolt; k++) spillSkull(st);
      if (sfx) sfx.crit();
      if (st.idx >= st.floors.length) {
        st.phase = 'landed';
        st.landed = true;
        st.landedOn = MULTS[MULTS.length - 1];
        st.hold = -0.5;
        if (sfx) sfx.boom();
      }
    } else {
      st.y = f.y;
      st.phase = 'landed';
      st.landed = true;
      st.landedOn = f.mult;
      st.shake = 1;
      burst(st, 26);
      if (sfx) sfx.boom();
    }
  }
  return 'running';
}

/** Slide the coffin along the lip. Only does anything before the drop. */
export function aim(st, x) {
  if (st.phase !== 'aim' || !st.layout) return;
  st.x = Math.max(st.layout.left + R, Math.min(st.layout.right - R, x));
}

/** Let go: this is the moment the decision is locked in. */
export function release(st) {
  if (st.phase !== 'aim') return;
  st.phase = 'fall';
  st.vy = 40;
}

export function nudge(st, dir) {
  if (st.phase !== 'aim' || !st.layout) return;
  aim(st, st.x + dir * 34);
}

function spillSkull(st) {
  st.spills.push({
    x: st.x + (Math.random() - 0.5) * 26,
    y: st.y + (Math.random() - 0.5) * 16,
    vx: (Math.random() - 0.5) * 300,
    vy: -120 - Math.random() * 160,
    r: 7 + Math.random() * 3,
    rot: (Math.random() - 0.5) * 1.2, spin: (Math.random() - 0.5) * 6,
    cell: Math.floor(Math.random() * 4),      // which of the four painted skulls
    life: 2.2,
  });
}

function burst(st, n, warm) {
  for (let i = 0; i < n; i++) {
    st.shards.push({
      warm: !!warm,
      x: st.x, y: st.y,
      vx: (Math.random() - 0.5) * 380,
      vy: -Math.random() * 240,
      r: 3 + Math.random() * 7,
      rot: Math.random() * 6.28, spin: (Math.random() - 0.5) * 12,
      cell: 4 + Math.floor(Math.random() * 4),   // rubble; the warm burst stays a spark
      life: 0.4 + Math.random() * 0.5,
    });
  }
}

// Skulls are the count, depth is the multiplier. A par spill at ×1 pays back
// roughly the pot, so the minigame reads as a multiplier on the fight itself.
export const payout = (st) =>
  Math.max(1, Math.round(st.pot * (st.skulls / SKULL_PAR) * (st.landed ? st.landedOn : 1)));

// --- drawing ----------------------------------------------------------------

export function draw(ctx, st, cw, ch, accent) {
  if (!st.layout) layout(st, cw, ch);
  const L = st.layout;
  const sx = st.shake ? (Math.random() - 0.5) * st.shake * 10 : 0;
  const sy = st.shake ? (Math.random() - 0.5) * st.shake * 6 : 0;

  ctx.save();
  // Opaque: this is the only thing clearing the canvas now. The old 5% of
  // transparency used to let a hint of the road through; with the road no
  // longer drawn it would smear the previous frame instead.
  ctx.fillStyle = '#060504';
  ctx.fillRect(0, 0, cw, ch);
  ctx.translate(sx, sy);

  if (!drawWall(ctx, L, ch)) {
    const g = ctx.createLinearGradient(L.left, 0, L.right, 0);
    g.addColorStop(0, '#241d17');
    g.addColorStop(0.5, '#120e0b');
    g.addColorStop(1, '#241d17');
    ctx.fillStyle = g;
    ctx.fillRect(L.left, 0, L.right - L.left, ch);
  }
  ctx.fillStyle = 'rgba(0,0,0,.55)';
  ctx.fillRect(L.left - 12, 0, 12, ch);
  ctx.fillRect(L.right, 0, 12, ch);

    // While aiming, a plumb line down the chosen lane. It makes the one decision
  // in this game something you can actually see before committing to it.
  if (st.phase === 'aim') {
    ctx.strokeStyle = `rgba(200,162,74,${0.25 + Math.sin(st.t * 5) * 0.1})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 9]);
    ctx.beginPath();
    ctx.moveTo(st.x, st.y + 30);
    ctx.lineTo(st.x, ch);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Blockers are dead stone; chutes glow and point the way down. The two have
  // to be legible at a glance or the aim is a guess.
  const parts = art(ART.parts);
  // Stones and chutes are drawn small, so they come off the reduced copy; the
  // slabs below stretch nearly the full width of the shaft and stay on the
  // full-resolution one.
  const small = parts && Atlas.scaled(parts, 0.34);
  for (const p of st.pegs) {
    if (parts) {
      if (p.boost) {
        // The ring is what the coffin clips; the flame pours out below it, so
        // the sprite hangs from its top rather than sitting on its middle.
        const w = p.r * (p.big ? 4.6 : 3.8);
        ctx.save();
        ctx.globalAlpha = 0.85 + Math.sin(st.t * 6 + p.x) * 0.15;
        blit(ctx, small, CHUTE + (p.big ? 1 : 0), p.x, p.y - p.r * 0.8, w, 0);
        ctx.restore();
      } else {
        blit(ctx, small, STONE + (p.big ? 1 : 0), p.x, p.y, p.r * (p.big ? 3.4 : 3.0), 0.5);
      }
      continue;
    }
    if (p.boost) {
      ctx.fillStyle = 'rgba(120,200,140,.16)';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3f7a52';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#8fe0a8';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      for (const dy of [-5, 3]) {
        ctx.beginPath();
        ctx.moveTo(p.x - 7, p.y + dy - 3);
        ctx.lineTo(p.x, p.y + dy + 4);
        ctx.lineTo(p.x + 7, p.y + dy - 3);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = '#4a4238';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5f5648';
      ctx.beginPath(); ctx.arc(p.x - p.r * 0.22, p.y - p.r * 0.3, p.r * 0.62, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.35)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.stroke();
    }
  }

  ctx.textAlign = 'center';
  ctx.font = '15px "Iowan Old Style", Georgia, serif';

  for (const f of st.floors) {
    const passed = f.i < st.idx;
    const next = f.i === st.idx && st.phase !== 'landed';
    // Green while the coffin is carrying enough speed to go through it, so the
    // rule is legible without ever reading a number.
    const willBreak = next && st.phase === 'fall' && st.vy >= f.need;

    if (parts) {
      // Stretched across the shaft: the slab is a course of stone, and stone
      // courses take horizontal stretching without reading as distorted.
      const c = parts.cells[passed ? SLAB_BROKEN : SLAB];
      const sw = L.right - L.left, sh = 34;
      ctx.save();
      if (passed) ctx.globalAlpha = 0.75;
      ctx.drawImage(parts.canvas, c.x, c.y, c.w, c.h, L.left, f.y - 9, sw, sh);
      ctx.restore();
      // State stays on the lip, where the coffin meets it: green the moment it
      // is carrying enough speed to go through. Painting the whole slab would
      // have meant tinting the art, and the lip is what you actually watch.
      if (!passed) {
        ctx.fillStyle = willBreak ? 'rgba(143,224,168,.85)' : (next ? 'rgba(200,162,74,.5)' : 'rgba(0,0,0,0)');
        ctx.fillRect(L.left, f.y - 3, sw, 3);
      }
    } else {
      ctx.fillStyle = passed ? '#2e2a22' : willBreak ? '#5d7a52' : (next ? '#6a6154' : '#4c463a');
      ctx.fillRect(L.left, f.y, L.right - L.left, 15);
      ctx.fillStyle = passed ? '#3a352b' : willBreak ? '#7fa06e' : (next ? '#837a68' : '#5c5648');
      ctx.fillRect(L.left, f.y, L.right - L.left, 4);
      if (passed) {
        ctx.strokeStyle = 'rgba(0,0,0,.5)';
        ctx.lineWidth = 2;
        for (let k = 0; k < 5; k++) {
          const x = L.left + ((L.right - L.left) * (k + 0.5)) / 5;
          ctx.beginPath(); ctx.moveTo(x - 12, f.y + 8); ctx.lineTo(x + 12, f.y + 8); ctx.stroke();
        }
      }
    }

    ctx.fillStyle = passed ? 'rgba(200,162,74,.3)' : (next ? accent : '#8a8171');
    ctx.fillText(`×${f.mult}`, L.right + 36, f.y + 13);
    if (f.need > 0 && !passed) {
      ctx.font = '10px "Iowan Old Style", Georgia, serif';
      ctx.fillStyle = 'rgba(216,201,168,.4)';
      ctx.fillText(`${f.need}`, L.left - 32, f.y + 13);
      ctx.font = '15px "Iowan Old Style", Georgia, serif';
    }
  }

  // Live speed, so "enough to break the next slab" is a readable quantity.
  if (st.phase === 'fall') {
    const f = st.floors[st.idx];
    ctx.font = '13px "Iowan Old Style", Georgia, serif';
    ctx.fillStyle = f && st.vy >= f.need ? '#8fe0a8' : '#d8c9a8';
    ctx.fillText(`${Math.round(st.vy)}`, st.x, st.y - COFFIN_H * 0.62);
    ctx.font = '15px "Iowan Old Style", Georgia, serif';
  }

  // Skulls and rubble are the smallest things on screen and the most numerous —
  // a spill can be two dozen at once — so they come off the reduced copy too.
  const full = art(ART.skulls);
  const skullSheet = full && Atlas.scaled(full, 0.2);
  for (const s of st.shards) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, s.life * 2);
    // A chute throws sparks and stone throws stone, so only the cold burst
    // gets the painted rubble.
    if (skullSheet && !s.warm) {
      blit(ctx, skullSheet, s.cell, s.x, s.y, s.r * 2.4, 0.5, s.rot);
    } else {
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.fillStyle = s.warm ? '#8fe0a8' : '#6d6555';
      ctx.fillRect(-s.r / 2, -s.r / 2, s.r, s.r);
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  for (const k of st.spills) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, k.life);
    if (skullSheet) {
      blit(ctx, skullSheet, k.cell, k.x, k.y, k.r * 2.6, 0.5, k.rot);
    } else {
      ctx.translate(k.x, k.y);
      ctx.rotate(k.rot);
      drawSkull(ctx, k.r);
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  if (!drawPaintedCoffin(ctx, st)) drawCoffin(ctx, st.x, st.y, st.vx, st.landed);

  // Running tally rides with the coffin: the reward is visibly coming out of
  // it, which is the whole reason to steer into stone.
  if (st.phase !== 'aim' && st.skulls > 0) {
    ctx.font = '15px "Iowan Old Style", Georgia, serif';
    ctx.fillStyle = '#e8e0c8';
    // Above the speed readout, and both clear of the sprite — the box got
    // taller when it got painted.
    ctx.fillText(`${st.skulls} ☠`, st.x, st.y - COFFIN_H * 0.62 - 20);
  }

  if (st.flash > 0) {
    ctx.fillStyle = `rgba(255,232,170,${st.flash * 0.2})`;
    ctx.fillRect(0, 0, cw, ch);
  }
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#d8c9a8';
  ctx.font = '13px "Iowan Old Style", Georgia, serif';
  ctx.fillText('THE COFFIN DROP', cw / 2, ch * 0.055);
  ctx.font = '12px "Iowan Old Style", Georgia, serif';
  ctx.fillStyle = 'rgba(216,201,168,.55)';
  ctx.fillText(
    st.phase === 'aim' ? 'Drag to choose the lane — let go to drop'
      : st.phase === 'fall' ? 'Stone shakes skulls loose · chutes buy depth' : '',
    cw / 2, ch * 0.085);

  ctx.font = '26px "Iowan Old Style", Georgia, serif';
  if (st.landed) {
    ctx.fillStyle = accent;
    ctx.fillText(`☠ ${payout(st).toLocaleString()}`, cw / 2, ch * 0.885);
    ctx.font = '13px "Iowan Old Style", Georgia, serif';
    ctx.fillStyle = 'rgba(216,201,168,.6)';
    ctx.fillText(`${st.skulls} skulls × ${st.landedOn}`, cw / 2, ch * 0.915);
  } else {
    ctx.fillStyle = 'rgba(216,201,168,.8)';
    ctx.fillText(`${st.skulls} ☠`, cw / 2, ch * 0.885);
    ctx.font = '12px "Iowan Old Style", Georgia, serif';
    ctx.fillStyle = 'rgba(216,201,168,.45)';
    ctx.fillText(`${st.load} still in the box`, cw / 2, ch * 0.915);
  }
}

const WALL_TILE = 300;
let wall = null;      // the baked shaft, rebuilt only when the shaft resizes

/**
 * The shaft masonry, mirror-tiled and baked.
 *
 * The texture is a wall, not a seamless tile — laid end to end its edges don't
 * meet. Flipping every other row and column makes each edge butt against its
 * own reflection, which always matches, and the repetition that trick usually
 * gives away is invisible in rubble masonry this dark.
 *
 * All of it — the tiling, the overall darkening that pushes it behind the
 * pieces, and the shading that sends the shaft into the distance — is baked
 * into one canvas at the size it will be drawn. Done live it was four
 * downscales of a 1024×1536 source plus two full-height gradients every frame,
 * which cost more than everything else in the minigame put together.
 */
function bakeWall(t, w, h) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.ceil(w));
  cv.height = Math.max(1, Math.ceil(h));
  const c = cv.getContext('2d');

  const tw = WALL_TILE, th = tw * (t.img.naturalHeight / t.img.naturalWidth);
  for (let ty = 0, r = 0; ty < h; ty += th, r++) {
    for (let tx = 0, col = 0; tx < w; tx += tw, col++) {
      const fx = col % 2 === 1, fy = r % 2 === 1;
      c.save();
      c.translate(tx + (fx ? tw : 0), ty + (fy ? th : 0));
      c.scale(fx ? -1 : 1, fy ? -1 : 1);
      c.drawImage(t.img, 0, 0, tw, th);
      c.restore();
    }
  }

  const d = c.createLinearGradient(0, 0, 0, h);
  d.addColorStop(0, 'rgba(8,7,6,.55)');
  d.addColorStop(0.45, 'rgba(8,7,6,.62)');
  d.addColorStop(1, 'rgba(4,3,3,.85)');
  c.fillStyle = d;
  c.fillRect(0, 0, w, h);

  // Walls fall away into shadow at the edges; the middle of the shaft is where
  // the light is, and where the coffin is.
  const s = c.createLinearGradient(0, 0, w, 0);
  s.addColorStop(0, 'rgba(0,0,0,.75)');
  s.addColorStop(0.22, 'rgba(0,0,0,0)');
  s.addColorStop(0.78, 'rgba(0,0,0,0)');
  s.addColorStop(1, 'rgba(0,0,0,.75)');
  c.fillStyle = s;
  c.fillRect(0, 0, w, h);
  return cv;
}

function drawWall(ctx, L, ch) {
  const t = Atlas.texture(ART.wall);
  if (!t) return false;
  const w = L.right - L.left;
  if (!wall || wall.width !== Math.ceil(w) || wall.height !== Math.ceil(ch)) {
    wall = bakeWall(t, w, ch);
  }
  ctx.drawImage(wall, L.left, 0);
  return true;
}

function drawSkull(ctx, r) {
  ctx.fillStyle = '#e6e1cd';
  ctx.beginPath();
  ctx.arc(0, -r * 0.15, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-r * 0.55, r * 0.5, r * 1.1, r * 0.55);
  ctx.fillStyle = '#2a2620';
  ctx.beginPath();
  ctx.arc(-r * 0.36, -r * 0.2, r * 0.27, 0, Math.PI * 2);
  ctx.arc(r * 0.36, -r * 0.2, r * 0.27, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-r * 0.1, r * 0.15, r * 0.2, r * 0.28);
}

const COFFIN_H = 92;

/**
 * The painted coffin. Three poses do the whole job: it hangs square while it is
 * being aimed, tumbles once it is being thrown around by stone, and bursts open
 * where it stops — which is also the frame the payout is read off, so the box
 * splitting and the number arriving are the same beat.
 *
 * Returns false until the sheet has decoded; the vector coffin covers that.
 */
function drawPaintedCoffin(ctx, st) {
  const sh = art(ART.coffin);
  if (!sh) return false;
  const tilted = !st.landed && Math.abs(st.vx) > 60;
  const i = st.landed ? COFFIN_BURST : tilted ? COFFIN_TUMBLE : COFFIN_UP;
  const c = sh.cells[i];
  if (!c) return false;

  const w = COFFIN_H * (c.w / c.h);
  // Falling, the sprite is centred on the point collisions are measured from.
  // Stopped, it has to sit *on* the slab instead — that contact is the whole
  // read of the frame, and a coffin sunk halfway into stone loses it.
  const ayf = st.landed ? 0.94 : 0.5;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.4)';
  ctx.beginPath();
  ctx.ellipse(st.x, st.y + COFFIN_H * (1 - ayf) * 0.9, w * 0.5, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // The tumbling pose is already drawn at an angle, so it only needs the
  // remainder of the lean; the upright one takes the full amount.
  const lean = Math.max(-0.5, Math.min(0.5, st.vx / 700));
  blit(ctx, sh, i, st.x, st.y, w, ayf,
    st.landed ? 0.05 : tilted ? lean * 0.45 : lean);
  return true;
}

function drawCoffin(ctx, x, y, vx, landed) {
  const w = 44, h = 70;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(landed ? 0.06 : Math.max(-0.5, Math.min(0.5, vx / 700)));
  ctx.translate(0, -h * 0.1);

  ctx.fillStyle = 'rgba(0,0,0,.4)';
  ctx.beginPath();
  ctx.ellipse(0, h / 2 + 4, w * 0.55, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  const pts = [[0, -h / 2], [w / 2, -h / 4], [w / 2 * 0.82, h / 2], [-w / 2 * 0.82, h / 2], [-w / 2, -h / 4]];
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.closePath();
  ctx.fillStyle = '#5b4530';
  ctx.fill();
  ctx.strokeStyle = '#3a2b1c';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#6d5238';
  ctx.fillRect(-w * 0.3, -h * 0.26, w * 0.6, h * 0.58);
  ctx.strokeStyle = '#c8a24a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, -h * 0.18); ctx.lineTo(0, h * 0.22);
  ctx.moveTo(-w * 0.17, -h * 0.03); ctx.lineTo(w * 0.17, -h * 0.03);
  ctx.stroke();
  ctx.restore();
}
