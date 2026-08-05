// The Coffin Drop — the payout game between fights.
//
// A wave's spoils go into a coffin and the coffin goes down a crypt shaft. Each
// floor is a slab with a gap in it; fall through the gap and you reach the next
// floor down, which is worth more. Land on stone and that is where the run ends
// and what you are paid.
//
// You choose the lane and nothing else: slide the coffin along the lip of the
// shaft, let go, and it falls. What happens after that is the field — buttress
// stones bleed its speed, chutes pile speed on — and speed is the whole game,
// because each slab needs a minimum to smash through. Land on stone and that
// slab's multiplier is what you are paid.
//
// So the decision is a single read of the board before you drop: which lane
// gathers enough momentum to punch deep, and which one stalls out on the first
// slab. Doing nothing is always safe and always pays — after a few seconds the
// coffin drops on its own and banks whatever it reaches.

const GRAVITY = 620;
const MAX_VY = 1500;
const HOLD = 1.6;          // seconds to read the result before moving on
const AIM_TIMEOUT = 7;     // an idle player still gets their gold
const R = 24;              // coffin radius, for collisions

const MULTS = [1, 2, 3, 5, 10];
// Speed needed to smash each slab. The first is free — you always bank
// something — and the last is only reachable off a good run of chutes.
const NEEDS = [0, 430, 620, 830, 1080];

export function start(pot) {
  return {
    pot: Math.max(1, Math.round(pot)),
    floors: null, pegs: null,
    x: 0, y: 0, vx: 0, vy: 0,
    phase: 'aim',            // aim -> fall -> landed
    aimT: 0,
    idx: 0,
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
        pegs.push({ x, y, r: 15 + Math.random() * 6, boost: Math.random() < 0.42 });
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
      st.vy = Math.min(MAX_VY, st.vy * 1.16 + 210);
      st.flash = Math.max(st.flash, 0.5);
      if (sfx) sfx.buff();
    } else {
      st.vy *= 0.52;
      st.vx += (dx >= 0 ? 1 : -1) * (90 + Math.random() * 70);
      st.shake = Math.max(st.shake, 0.35);
      if (sfx) sfx.hit();
    }
    burst(st, p.boost ? 8 : 5, p.boost);
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

function burst(st, n, warm) {
  for (let i = 0; i < n; i++) {
    st.shards.push({
      warm: !!warm,
      x: st.x, y: st.y,
      vx: (Math.random() - 0.5) * 380,
      vy: -Math.random() * 240,
      r: 3 + Math.random() * 7,
      rot: Math.random() * 6.28, spin: (Math.random() - 0.5) * 12,
      life: 0.4 + Math.random() * 0.5,
    });
  }
}

export const payout = (st) => Math.round(st.pot * (st.landed ? st.landedOn : 1));

// --- drawing ----------------------------------------------------------------

export function draw(ctx, st, cw, ch, accent) {
  if (!st.layout) layout(st, cw, ch);
  const L = st.layout;
  const sx = st.shake ? (Math.random() - 0.5) * st.shake * 10 : 0;
  const sy = st.shake ? (Math.random() - 0.5) * st.shake * 6 : 0;

  ctx.save();
  ctx.fillStyle = 'rgba(6,5,4,.95)';
  ctx.fillRect(0, 0, cw, ch);
  ctx.translate(sx, sy);

  const g = ctx.createLinearGradient(L.left, 0, L.right, 0);
  g.addColorStop(0, '#241d17');
  g.addColorStop(0.5, '#120e0b');
  g.addColorStop(1, '#241d17');
  ctx.fillStyle = g;
  ctx.fillRect(L.left, 0, L.right - L.left, ch);
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
  for (const p of st.pegs) {
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
    ctx.fillText(`${Math.round(st.vy)}`, st.x, st.y - 44);
    ctx.font = '15px "Iowan Old Style", Georgia, serif';
  }

  for (const s of st.shards) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rot);
    ctx.globalAlpha = Math.min(1, s.life * 2);
    ctx.fillStyle = s.warm ? '#8fe0a8' : '#6d6555';
    ctx.fillRect(-s.r / 2, -s.r / 2, s.r, s.r);
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  drawCoffin(ctx, st.x, st.y, st.vx, st.landed);

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
      : st.phase === 'fall' ? 'Stone slows it · chutes speed it up' : '',
    cw / 2, ch * 0.085);

  ctx.font = '26px "Iowan Old Style", Georgia, serif';
  if (st.landed) {
    ctx.fillStyle = accent;
    ctx.fillText(`◍ ${payout(st).toLocaleString()}`, cw / 2, ch * 0.885);
    ctx.font = '13px "Iowan Old Style", Georgia, serif';
    ctx.fillStyle = 'rgba(216,201,168,.6)';
    ctx.fillText(`${st.pot.toLocaleString()} × ${st.landedOn}`, cw / 2, ch * 0.915);
  } else {
    ctx.fillStyle = 'rgba(216,201,168,.8)';
    ctx.fillText(`◍ ${st.pot.toLocaleString()}`, cw / 2, ch * 0.885);
  }
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
