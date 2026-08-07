// Every character is drawn with vector primitives at render time. Diablo used
// pre-rendered sprite sheets; we get the same silhouette-first look by keeping
// the shapes blocky, the palette muddy, and the rim light on one side only.

const KITS = {
  hero: {
    build: 'human', h: 44, w: 15, weapon: 'sword',
    skin: '#c39a70', cloth: '#5d2b26', mail: '#7d7f8a', trim: '#c8a24a',
    cape: '#7d1e18', helm: true, eyes: null,
  },
  skeleton: {
    build: 'skeleton', h: 40, w: 13, weapon: 'sword',
    skin: '#cfc9b0', cloth: '#3a3730', mail: '#6d6a5c', trim: '#8a8471',
    eyes: '#ff6a2a',
  },
  zombie: {
    build: 'human', h: 42, w: 16, weapon: 'claw', hunch: 1,
    skin: '#6f8054', cloth: '#3b3a2b', mail: '#4a4636', trim: '#5c5a44',
    eyes: '#c9e06a',
  },
  fallen: {
    build: 'human', h: 30, w: 13, weapon: 'axe',
    skin: '#8d6a44', cloth: '#4a3626', mail: '#5c4a33', trim: '#a8863f',
    eyes: '#ffd24a',
  },
  imp: {
    build: 'imp', h: 32, w: 12, weapon: 'claw',
    skin: '#9c2f22', cloth: '#4a1410', mail: '#6b241b', trim: '#e0662c',
    eyes: '#ffcf4a',
  },
  brute: {
    build: 'brute', h: 62, w: 26, weapon: 'maul',
    skin: '#6b5140', cloth: '#2e2018', mail: '#57402f', trim: '#c8552a',
    eyes: '#ff3a20',
  },
  wraith: {
    build: 'wraith', h: 46, w: 16, weapon: 'scythe',
    skin: '#8fa8c0', cloth: '#20293a', mail: '#33415c', trim: '#7fb0f0',
    eyes: '#9fe8ff',
  },
};

export const kitFor = (k) => KITS[k] || KITS.skeleton;

// The hero's look is derived from what they are wearing, so every few
// purchases visibly re-forges them. Armour that never changes is the single
// most disappointing thing an upgrade screen can do.
const ARMOUR_TIERS = [
  { at: 0,  mail: '#6a5138', trim: '#8a6a3f', cloth: '#5d2b26', helm: false, cape: null },
  { at: 3,  mail: '#7d7f8a', trim: '#9aa0aa', cloth: '#4a2a3c', helm: true,  cape: null },
  { at: 7,  mail: '#8f939e', trim: '#c8a24a', cloth: '#5d2b26', helm: true,  cape: '#7d1e18' },
  { at: 12, mail: '#b3b8c4', trim: '#e0c463', cloth: '#3c2a5d', helm: true,  cape: '#4a2472' },
  { at: 18, mail: '#d8dde8', trim: '#ffe9a8', cloth: '#1f2f4a', helm: true,  cape: '#0f3a52' },
];
const WEAPON_TIERS = [
  { at: 0,  weapon: 'shortsword', glow: null },
  { at: 4,  weapon: 'sword',      glow: null },
  { at: 9,  weapon: 'greatsword', glow: null },
  { at: 15, weapon: 'greatsword', glow: '#7fd0ff' },
  { at: 22, weapon: 'greatsword', glow: '#ff9040' },
];
const pick = (tiers, n) => tiers.reduce((acc, t) => (n >= t.at ? t : acc), tiers[0]);

export function heroKit(weaponLvl, armourLvl) {
  const a = pick(ARMOUR_TIERS, armourLvl), w = pick(WEAPON_TIERS, weaponLvl);
  return { ...KITS.hero, ...a, ...w, helm: a.helm, cape: a.cape };
}

export const armourTierOf = (n) => ARMOUR_TIERS.indexOf(pick(ARMOUR_TIERS, n)) + 1;
export const weaponTierOf = (n) => WEAPON_TIERS.indexOf(pick(WEAPON_TIERS, n)) + 1;

const shade = (hex, m) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * m)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
};

// Blend two #rrggbb colours, staying in hex so shade() still works downstream.
function mixHex(a, b, t) {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const m = (sh) => {
    const v = Math.round(((A >> sh) & 255) * (1 - t) + ((B >> sh) & 255) * t);
    return Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0');
  };
  return `#${m(16)}${m(8)}${m(0)}`;
}

// A struck body flushes red. Tinting the palette keeps the flash inside the
// silhouette — compositing it on afterwards would bleed onto the floor.
const HIT = '#ff3524';
function tint(k, amt) {
  const t = Math.min(0.8, amt * 0.8);
  const out = { ...k };
  for (const key of ['skin', 'cloth', 'mail', 'trim', 'cape'])
    if (out[key]) out[key] = mixHex(out[key], HIT, t);
  return out;
}

function limb(ctx, x0, y0, x1, y1, w, fill) {
  ctx.strokeStyle = fill;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

export function drawShadow(ctx, sx, sy, r, alpha = 0.42) {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(1, 0.42);
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Draw one character.
 *  a.kind    key into KITS
 *  a.fx      screen-space facing, -1 (left) .. 1 (right)
 *  a.walk    walk cycle phase in radians (0 when idle)
 *  a.swing   attack progress 0..1, or 0 when not swinging
 *  a.hurt    hit-flash 0..1
 *  a.scale   size multiplier
 */
export function drawActor(ctx, a, sx, sy, t) {
  const base = a.kit || kitFor(a.kind);
  const k = a.hurt > 0.01 ? tint(base, a.hurt) : base;
  if (a.champion) { ctx.save(); ctx.shadowColor = '#ffd76a'; ctx.shadowBlur = 14; }
  const s = (a.scale || 1) * 0.92;
  const fx = a.fx >= 0 ? 1 : -1;
  const flip = Math.abs(a.fx) < 0.35 ? 0.72 : 1; // three-quarter view when facing camera

  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(s, s);

  const H = k.h, W = k.w;
  const bob = a.walk ? Math.abs(Math.sin(a.walk)) * 1.8 : Math.sin(t * 2 + sx * 0.05) * 0.7;
  const hipY = -H * 0.46 - bob;
  const shY = -H * 0.86 - bob;
  const headY = -H * 0.97 - bob;
  const lean = (k.hunch || 0) * 3;

  // ---- legs -------------------------------------------------------------
  const step = a.walk ? Math.sin(a.walk) * (W * 0.55) : 0;
  const legW = W * 0.36;
  if (k.build !== 'wraith') {
    limb(ctx, -W * 0.22, hipY, -W * 0.22 - step * 0.5, -2, legW, shade(k.cloth, 0.72));
    limb(ctx, W * 0.22, hipY, W * 0.22 + step * 0.5, -2, legW, k.cloth);
    ctx.fillStyle = shade(k.mail, 0.6);
    ctx.fillRect(-W * 0.22 - step * 0.5 - legW * 0.6, -3.5, legW * 1.2, 3.5);
    ctx.fillRect(W * 0.22 + step * 0.5 - legW * 0.6, -3.5, legW * 1.2, 3.5);
  } else {
    // Wraiths trail off into nothing instead of standing on feet.
    const g = ctx.createLinearGradient(0, hipY, 0, 2);
    g.addColorStop(0, k.cloth);
    g.addColorStop(1, 'rgba(20,26,38,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-W * 0.6, hipY);
    ctx.lineTo(W * 0.6, hipY);
    ctx.lineTo(W * 0.28 + Math.sin(t * 3) * 2, 2);
    ctx.lineTo(-W * 0.28 + Math.sin(t * 3 + 1) * 2, 2);
    ctx.closePath();
    ctx.fill();
  }

  // ---- cape (hero only, drawn behind the torso) --------------------------
  if (k.cape) {
    ctx.fillStyle = shade(k.cape, 0.62);
    ctx.beginPath();
    ctx.moveTo(-W * 0.5 * flip, shY + 2);
    ctx.quadraticCurveTo(-W * (0.95 + Math.sin(t * 3) * 0.08) * fx, hipY, -W * 0.3 * fx, hipY + H * 0.28);
    ctx.lineTo(W * 0.4 * fx, hipY + H * 0.2);
    ctx.quadraticCurveTo(W * 0.55 * fx, shY + 6, W * 0.45 * flip, shY + 2);
    ctx.closePath();
    ctx.fill();
  }

  // ---- torso -------------------------------------------------------------
  const torsoW = W * (k.build === 'brute' ? 1.15 : 1) * flip;
  ctx.beginPath();
  ctx.moveTo(-torsoW * 0.62, shY + lean * 0.4);
  ctx.lineTo(torsoW * 0.62, shY + lean * 0.4);
  ctx.lineTo(torsoW * 0.42, hipY + 2);
  ctx.lineTo(-torsoW * 0.42, hipY + 2);
  ctx.closePath();

  if (k.build === 'skeleton') {
    ctx.fillStyle = shade(k.cloth, 0.8);
    ctx.fill();
    ctx.strokeStyle = k.skin;
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 4; i++) {
      const ry = shY + 4 + i * ((hipY - shY - 6) / 4);
      ctx.beginPath();
      ctx.moveTo(-torsoW * 0.46, ry);
      ctx.quadraticCurveTo(0, ry + 2.4, torsoW * 0.46, ry);
      ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(0, shY + 2); ctx.lineTo(0, hipY); ctx.stroke();
  } else {
    const g = ctx.createLinearGradient(-torsoW * 0.6, 0, torsoW * 0.6, 0);
    g.addColorStop(0, shade(k.mail, 1.22));
    g.addColorStop(0.55, k.mail);
    g.addColorStop(1, shade(k.mail, 0.6));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.fillStyle = k.trim;
    ctx.fillRect(-torsoW * 0.5, hipY - 1, torsoW, 2.6); // belt
  }

  // ---- arms + weapon ------------------------------------------------------
  const swing = a.swing || 0;
  // Wind up quickly, follow through slowly: the arc reads as a real blow.
  const arc = swing > 0 ? (swing < 0.3 ? -1.15 * (swing / 0.3) : -1.15 + 2.0 * ((swing - 0.3) / 0.7)) : Math.sin(t * 2) * 0.08;
  const armW = W * 0.3;
  const shoulderX = torsoW * 0.55;

  // rear arm
  limb(ctx, -shoulderX * fx, shY + 3, -shoulderX * fx - W * 0.25 * fx, hipY + 3, armW, shade(k.skin, 0.7));

  // weapon arm
  ctx.save();
  ctx.translate(shoulderX * fx, shY + 3);
  ctx.rotate(arc * fx);
  limb(ctx, 0, 0, W * 0.5 * fx, W * 0.62, armW, k.skin);
  ctx.translate(W * 0.5 * fx, W * 0.62);
  drawWeapon(ctx, k, fx, W);
  ctx.restore();

  // ---- head ---------------------------------------------------------------
  const headR = W * (k.build === 'brute' ? 0.46 : 0.42);
  const hx = lean * 0.5 * fx;
  if (k.build === 'skeleton') {
    ctx.fillStyle = k.skin;
    ctx.beginPath(); ctx.arc(hx, headY, headR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = shade(k.skin, 0.55);
    ctx.fillRect(hx - headR * 0.55, headY + headR * 0.35, headR * 1.1, headR * 0.5);
  } else {
    ctx.fillStyle = k.skin;
    ctx.beginPath(); ctx.ellipse(hx, headY, headR, headR * 1.08, 0, 0, Math.PI * 2); ctx.fill();
  }

  if (k.helm) {
    ctx.fillStyle = shade(k.mail, 1.1);
    ctx.beginPath();
    ctx.arc(hx, headY - headR * 0.15, headR * 1.06, Math.PI, 0);
    ctx.lineTo(hx + headR * 1.06, headY + headR * 0.15);
    ctx.lineTo(hx - headR * 1.06, headY + headR * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = k.trim;
    ctx.fillRect(hx - headR * 0.12, headY - headR * 1.3, headR * 0.24, headR * 0.5);
  }

  if (k.build === 'imp' || k.build === 'brute') {
    ctx.strokeStyle = shade(k.trim, 0.85);
    ctx.lineWidth = 2;
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(hx + d * headR * 0.7, headY - headR * 0.5);
      ctx.quadraticCurveTo(hx + d * headR * 1.5, headY - headR * 1.5, hx + d * headR * 0.9, headY - headR * 1.9);
      ctx.stroke();
    }
  }

  if (a.champion) ctx.restore();

  if (k.eyes) {
    ctx.fillStyle = k.eyes;
    ctx.shadowColor = k.eyes;
    ctx.shadowBlur = 6;
    const ex = headR * 0.36;
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(hx + d * ex * flip + fx * headR * 0.12, headY - headR * 0.08, headR * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

function drawWeapon(ctx, k, fx, W) {
  const c = ctx;
  // Empty-handed. The blade's steel is a fixed colour — it has to be, it is the
  // brightest thing on a character — so a kit that wants a bare silhouette
  // cannot get one by recolouring, only by not drawing the weapon at all.
  if (k.weapon === 'none') return;
  if (k.glow) { c.save(); c.shadowColor = k.glow; c.shadowBlur = 12; }
  switch (k.weapon) {
    case 'shortsword':
      c.fillStyle = '#3a2a1c';
      c.fillRect(-1.5, -2, 3, 6);
      c.fillStyle = k.trim;
      c.fillRect(-W * 0.24, -3.2, W * 0.48, 2);
      c.fillStyle = '#a8adb6';
      c.beginPath();
      c.moveTo(-1.9, -3); c.lineTo(1.9, -3); c.lineTo(0, -W * 1.35);
      c.closePath(); c.fill();
      break;
    case 'greatsword':
      c.fillStyle = '#2e2118';
      c.fillRect(-2, -2, 4, 9);
      c.fillStyle = k.trim;
      c.fillRect(-W * 0.5, -4.2, W, 3);
      c.fillStyle = '#c9cdd6';
      c.beginPath();
      c.moveTo(-3, -4); c.lineTo(3, -4); c.lineTo(1.6, -W * 2.5);
      c.lineTo(0, -W * 2.8); c.lineTo(-1.6, -W * 2.5);
      c.closePath(); c.fill();
      c.fillStyle = '#eef1f6';
      c.fillRect(-0.9, -W * 2.45, 1.6, W * 2.0);
      break;
    case 'sword':
      c.fillStyle = '#3a2a1c';
      c.fillRect(-1.6, -2, 3.2, 7);                     // grip
      c.fillStyle = k.trim;
      c.fillRect(-W * 0.34, -3.4, W * 0.68, 2.4);       // crossguard
      c.fillStyle = '#b9bdc6';
      c.beginPath();
      c.moveTo(-2.1, -3);
      c.lineTo(2.1, -3);
      c.lineTo(1.1, -W * 1.9);
      c.lineTo(0, -W * 2.15);
      c.lineTo(-1.1, -W * 1.9);
      c.closePath();
      c.fill();
      c.fillStyle = '#e6e9ef';
      c.fillRect(-0.7, -W * 1.85, 1.2, W * 1.5);        // highlight
      break;
    case 'axe':
      c.fillStyle = '#3a2a1c';
      c.fillRect(-1.5, -W * 1.4, 3, W * 1.7);
      c.fillStyle = '#9aa0aa';
      c.beginPath();
      c.moveTo(1.4 * fx, -W * 1.3);
      c.quadraticCurveTo(W * 0.95 * fx, -W * 1.05, W * 0.7 * fx, -W * 0.42);
      c.lineTo(1.4 * fx, -W * 0.6);
      c.closePath();
      c.fill();
      break;
    case 'maul':
      c.fillStyle = '#2e2118';
      c.fillRect(-2.2, -W * 1.5, 4.4, W * 1.9);
      c.fillStyle = '#4c4539';
      c.fillRect(-W * 0.5, -W * 1.9, W, W * 0.62);
      c.fillStyle = '#6b6252';
      c.fillRect(-W * 0.5, -W * 1.9, W, W * 0.16);
      break;
    case 'scythe':
      c.strokeStyle = '#2b2f3a';
      c.lineWidth = 2.4;
      c.beginPath(); c.moveTo(0, 4); c.lineTo(0, -W * 1.9); c.stroke();
      c.strokeStyle = '#a8c8e0';
      c.lineWidth = 2.2;
      c.beginPath();
      c.arc(W * 0.9 * fx, -W * 1.75, W * 0.95, Math.PI * 0.85, Math.PI * 1.7);
      c.stroke();
      break;
    default: { // claws
      c.strokeStyle = shade(k.trim, 1.05);
      c.lineWidth = 1.8;
      c.lineCap = 'round';
      for (let i = -1; i <= 1; i++) {
        c.beginPath();
        c.moveTo(0, 0);
        c.quadraticCurveTo(W * 0.35 * fx, i * 2.4, W * 0.62 * fx, i * 3.6 - 1);
        c.stroke();
      }
    }
  }
  if (k.glow) c.restore();
}

// A ring painted on the ground before something lands on it. Every boss move
// gets one — a hit you could not have seen coming is not a mechanic.
export function drawTelegraph(ctx, sx, sy, radius, fill, colour) {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(1, 0.5);
  ctx.strokeStyle = colour;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.5 + fill * 0.5;
  ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 0.16 + fill * 0.26;
  ctx.fillStyle = colour;
  ctx.beginPath(); ctx.arc(0, 0, radius * fill, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// A brazier: iron bowl, animated flame, drawn as part of the scene.
export function drawBrazier(ctx, sx, sy, t, seed) {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.fillStyle = '#2b2620';
  ctx.beginPath();
  ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.lineTo(2.5, -18); ctx.lineTo(-2.5, -18);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3c352b';
  ctx.beginPath();
  ctx.moveTo(-9, -18); ctx.lineTo(9, -18); ctx.lineTo(6, -26); ctx.lineTo(-6, -26);
  ctx.closePath(); ctx.fill();

  const f = t * 6 + seed;
  for (let i = 0; i < 3; i++) {
    const h = 13 + Math.sin(f + i * 1.7) * 5 + i * 2;
    const w = 6.5 - i * 1.6;
    ctx.fillStyle = ['rgba(220,110,30,.85)', 'rgba(245,175,50,.9)', 'rgba(255,232,150,.95)'][i];
    ctx.beginPath();
    ctx.moveTo(-w, -25);
    ctx.quadraticCurveTo(Math.sin(f * 1.3 + i) * 3, -25 - h, w, -25);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}


/**
 * The boss's chest, in the air or on the ground.
 *
 * `z` is how far above the ground it still is, `open` how far the lid has swung
 * (0 shut, 1 wide). Drawn from primitives like everything else, and lit from
 * the inside once it is open so the thing you are being asked to click is the
 * brightest object on the screen.
 */
export function drawChest(ctx, sx, sy, z, open, t, scale = 1) {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(scale, scale);

  // Its shadow on the ground stays where the chest will land, and tightens as
  // it falls — the only cue that says "this is coming down here".
  const near = Math.max(0, 1 - z / 22);
  drawShadow(ctx, 0, 0, 15 + (1 - near) * 10, 0.28 + near * 0.24);

  ctx.translate(0, -z);
  const W = 17, H = 12;

  // Body.
  ctx.fillStyle = '#3a2a1a';
  ctx.fillRect(-W, -H, W * 2, H);
  ctx.fillStyle = '#4a3722';
  ctx.fillRect(-W, -H, W * 2, 3);
  // Iron bands.
  ctx.fillStyle = '#2a2420';
  ctx.fillRect(-W * 0.62, -H, 4, H);
  ctx.fillRect(W * 0.62 - 4, -H, 4, H);
  // Lock.
  ctx.fillStyle = open > 0.05 ? '#6b5c3e' : '#c8a24a';
  ctx.fillRect(-3, -H * 0.62, 6, 5);

  // The light inside, once there is a gap for it to get out of.
  if (open > 0.02) {
    const glow = ctx.createRadialGradient(0, -H, 2, 0, -H, 46);
    glow.addColorStop(0, `rgba(255,206,110,${0.5 * open})`);
    glow.addColorStop(1, 'rgba(255,190,90,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(0, -H, 46, 0, Math.PI * 2); ctx.fill();
  }

  // Lid, hinged at the back and swung up by `open`.
  ctx.save();
  ctx.translate(0, -H);
  ctx.rotate(-open * 1.15);
  ctx.fillStyle = '#4a3722';
  ctx.fillRect(-W, -7, W * 2, 7);
  ctx.fillStyle = '#5c4630';
  ctx.fillRect(-W, -7, W * 2, 2.5);
  ctx.restore();

  // Once it is open it keeps asking: a slow pulse on the rim.
  if (open > 0.9) {
    ctx.strokeStyle = `rgba(224,196,99,${0.45 + Math.sin(t * 3) * 0.25})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, 0, W + 5, 7, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * A campfire: logs, embers and flame, drawn from the same primitives as the
 * brazier but sitting on the ground rather than in a stand.
 *
 * The camp is the only place in the game where nothing is trying to kill the
 * hero, and the fire is what says so — it is the one warm, moving thing on a
 * screen where everybody is standing still.
 */
export function drawCampfire(ctx, sx, sy, t, scale = 1) {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(scale, scale);

  // Embers under the logs, breathing. Drawn first so the logs sit in them.
  const pulse = 0.75 + Math.sin(t * 2.4) * 0.25;
  const bed = ctx.createRadialGradient(0, -2, 0, 0, -2, 26);
  bed.addColorStop(0, `rgba(255,150,50,${0.5 * pulse})`);
  bed.addColorStop(1, 'rgba(255,120,30,0)');
  ctx.fillStyle = bed;
  ctx.beginPath(); ctx.ellipse(0, -2, 26, 11, 0, 0, Math.PI * 2); ctx.fill();

  // Three logs leaning into each other.
  ctx.lineCap = 'round';
  for (const [x0, y0, x1, y1, w] of [
    [-15, 1, 9, -7, 5], [14, 1, -8, -7, 5], [-9, 3, 10, 3, 4.5],
  ]) {
    ctx.strokeStyle = '#3a2a1e'; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,90,60,.55)'; ctx.lineWidth = w * 0.35;
    ctx.beginPath(); ctx.moveTo(x0, y0 - w * 0.3); ctx.lineTo(x1, y1 - w * 0.3); ctx.stroke();
  }

  // Flame, three tongues of it, each on its own rhythm so the shape never
  // reads as a loop.
  const f = t * 5.5;
  for (let i = 0; i < 3; i++) {
    const h = 20 + Math.sin(f + i * 1.9) * 7 - i * 3;
    const w = 9 - i * 2.4;
    ctx.fillStyle = ['rgba(214,70,20,.8)', 'rgba(245,165,45,.9)', 'rgba(255,236,170,.95)'][i];
    ctx.beginPath();
    ctx.moveTo(-w, -4);
    ctx.quadraticCurveTo(Math.sin(f * 1.2 + i) * 4, -4 - h, w, -4);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// A fixed-seed scatter. The camp's ground grain must not crawl between frames,
// so it cannot come from Math.random — the same seed has to lay the same dirt
// down every time it is painted.
function seeded(seed) {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

/**
 * The camp itself: what stands behind and around the fire.
 *
 * Drawn as flat `#0a0806` cut-outs rather than lit objects, because the light
 * in this scene comes from one place and everything else is what that light
 * finds. A crypt arch and dead trees on the horizon, a ring of stones, a
 * bedroll and a woodpile on the ground — enough for the eye to read a place
 * that somebody camped in, and no more.
 *
 * Painted under the firelight wash on purpose: the glow is what pulls these
 * shapes out of the dark, so anything drawn over it reads as pasted on.
 */
export function drawCampSet(ctx, W, H, t, fireX, fireY) {
  const sky = H * 0.50;

  // The fire's light on the air above it. Without this the horizon is black
  // cut-outs on black ground and simply cannot be seen — a silhouette needs
  // something behind it to be a silhouette against.
  // Filled edge to edge, not into a band: a gradient cut off by a rectangle
  // leaves a straight seam across the sky, which reads as a box on the screen
  // rather than light in the air.
  const haze = ctx.createRadialGradient(fireX, sky + H * 0.06, 10, fireX, sky + H * 0.06, W * 0.42);
  haze.addColorStop(0, 'rgba(122,70,30,.40)');
  haze.addColorStop(0.45, 'rgba(74,42,19,.18)');
  haze.addColorStop(1, 'rgba(20,12,7,0)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, W, H);

  // ---- horizon. Flat black, no gradient: these are holes in the light. -----
  ctx.fillStyle = '#0a0806';
  // A broken crypt arch, the one built thing out there.
  ctx.save();
  ctx.translate(W * 0.20, sky);
  ctx.fillRect(-58, -H * 0.15, 17, H * 0.15);
  ctx.fillRect(41, -H * 0.12, 17, H * 0.12);
  ctx.beginPath();
  ctx.moveTo(-58, -H * 0.15);
  ctx.quadraticCurveTo(0, -H * 0.235, 58, -H * 0.12);
  ctx.lineTo(58, -H * 0.155);
  ctx.quadraticCurveTo(0, -H * 0.27, -58, -H * 0.185);
  ctx.closePath(); ctx.fill();
  ctx.restore();

  // Leaning headstones.
  for (const [fx, fh, tilt] of [[0.06, 0.055, -0.16], [0.86, 0.045, 0.2], [0.955, 0.03, -0.1]]) {
    ctx.save();
    ctx.translate(W * fx, sky); ctx.rotate(tilt);
    ctx.beginPath();
    ctx.moveTo(-11, 0); ctx.lineTo(-11, -H * fh);
    ctx.quadraticCurveTo(0, -H * fh - 13, 11, -H * fh);
    ctx.lineTo(11, 0); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // Dead trees. Bare forks, thinning outwards — the verge of the road the camp
  // is pitched beside.
  ctx.strokeStyle = '#0a0806';
  ctx.lineCap = 'round';
  for (const [fx, fh, seed] of [[0.34, 0.30, 3], [0.68, 0.25, 11], [0.965, 0.34, 27]]) {
    const r = seeded(seed);
    const x = W * fx, top = sky - H * fh;
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(x, sky); ctx.lineTo(x + (r() - 0.5) * 14, top); ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const by = top + (sky - top) * (0.1 + r() * 0.5);
      const dir = r() < 0.5 ? -1 : 1;
      ctx.lineWidth = 3.4 - i * 0.5;
      ctx.beginPath();
      ctx.moveTo(x, by);
      ctx.quadraticCurveTo(x + dir * 22, by - 12, x + dir * (30 + r() * 22), by - 26 - r() * 20);
      ctx.stroke();
    }
  }

  // ---- ground grain. Trodden earth, not a gradient. ------------------------
  ctx.save();
  ctx.translate(fireX, H * 0.80); ctx.scale(1, 0.34); ctx.translate(-fireX, -H * 0.80);
  ctx.beginPath(); ctx.arc(fireX, H * 0.80, W * 0.58, 0, Math.PI * 2); ctx.clip();
  const r = seeded(91);
  for (let i = 0; i < 240; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * W * 0.58;
    ctx.fillStyle = r() < 0.82 ? 'rgba(10,8,6,.24)' : 'rgba(150,118,74,.09)';
    ctx.beginPath();
    ctx.ellipse(fireX + Math.cos(a) * d, H * 0.80 + Math.sin(a) * d,
                1 + r() * 3.4, 0.6 + r() * 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // ---- things somebody put there --------------------------------------------
  const lit = 'rgba(255,168,80,.30)';
  const s = Math.max(0.8, H / 560);

  // The ring of stones the fire is built inside.
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.3;
    const x = fireX + Math.cos(a) * 54 * s, y = fireY + Math.sin(a) * 19 * s;
    ctx.fillStyle = '#161009';
    ctx.beginPath(); ctx.ellipse(x, y, (9 + (i % 3) * 2) * s, (4.5 + (i % 2)) * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = lit;
    ctx.beginPath();
    ctx.ellipse(x, y - 1.6 * s, (7 + (i % 3) * 1.6) * s, 2.2 * s, 0, Math.PI, 0);
    ctx.fill();
  }

  // A bedroll, and the woodpile the fire is being fed from.
  prop(ctx, W * 0.13, H * 0.86, s, lit, (c) => {
    c.beginPath(); c.ellipse(0, 0, 32, 12, -0.06, 0, Math.PI * 2); c.fill();
    c.fillStyle = lit;
    c.beginPath(); c.ellipse(-3, -4, 26, 5, -0.06, Math.PI, 0); c.fill();
  });
  prop(ctx, W * 0.83, H * 0.83, s, lit, (c) => {
    for (let i = 0; i < 5; i++) {
      const y = -i * 6, w = 26 - i * 3;
      c.beginPath(); c.ellipse((i % 2) * 4 - 2, y, w, 4.6, 0, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = lit;
    c.beginPath(); c.ellipse(-1, -26, 12, 2.4, 0, Math.PI, 0); c.fill();
  });

  // A spear and a shield, set down against a stone.
  prop(ctx, W * 0.92, H * 0.77, s, lit, (c) => {
    c.save(); c.rotate(0.22);
    c.fillRect(-1.6, -74, 3.2, 74);
    c.beginPath(); c.moveTo(-4.5, -74); c.lineTo(4.5, -74); c.lineTo(0, -90); c.closePath(); c.fill();
    c.restore();
    c.beginPath(); c.ellipse(-13, -13, 15, 16, 0.1, 0, Math.PI * 2); c.fill();
    c.fillStyle = lit;
    c.beginPath(); c.ellipse(-13, -15, 11, 11, 0.1, Math.PI * 0.9, Math.PI * 1.9); c.fill();
  });
}

// Every prop is the same recipe: a black body on the ground with a fire-facing
// edge and a contact shadow, so they all sit in the one light.
function prop(ctx, x, y, s, lit, body) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(6,5,4,.55)';
  ctx.beginPath(); ctx.ellipse(0, 2, 30, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#161009';
  body(ctx);
  ctx.restore();
}

/**
 * The tripod and its pot, over the fire.
 *
 * Drawn after the flame rather than before it: a pot hanging in front of the
 * fire is the single clearest way to say "somebody lives here for the night",
 * and behind the flame it would simply be invisible.
 */
export function drawCookpot(ctx, fireX, fireY, s) {
  ctx.save();
  ctx.translate(fireX, fireY); ctx.scale(s, s);
  ctx.strokeStyle = '#120d08';
  ctx.lineWidth = 2.6; ctx.lineCap = 'round';
  for (const dx of [-26, 24, 6]) {
    ctx.beginPath(); ctx.moveTo(dx, 2); ctx.lineTo(1, -58); ctx.stroke();
  }
  // The hook and the pot.
  ctx.beginPath(); ctx.moveTo(1, -56); ctx.lineTo(1, -44); ctx.stroke();
  ctx.fillStyle = '#0f0b07';
  ctx.beginPath();
  ctx.moveTo(-13, -42); ctx.lineTo(13, -42);
  ctx.quadraticCurveTo(11, -24, 0, -23);
  ctx.quadraticCurveTo(-11, -24, -13, -42);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,168,80,.42)';
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-13.5, -41); ctx.lineTo(13.5, -41); ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Scenery. Everything beside the road is drawn from primitives too, keyed off
// the tile hash so a given spot always grows the same tree.
// ---------------------------------------------------------------------------

export function drawProp(ctx, kind, sx, sy, t, seed, biome) {
  ctx.save();
  ctx.translate(sx, sy);
  const r = (n) => ((seed * 9301 + n * 49297) % 233280) / 233280;

  switch (kind) {
    case 'tree': {
      const h = 54 + r(1) * 34;
      drawShadow(ctx, 0, 0, 13, 0.34);
      ctx.fillStyle = '#3d2c1e';
      ctx.beginPath();
      ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.lineTo(2.5, -h * 0.55); ctx.lineTo(-2.5, -h * 0.55);
      ctx.closePath(); ctx.fill();
      for (let i = 0; i < 3; i++) {
        const cy = -h * (0.5 + i * 0.2);
        const cr = (20 - i * 4) * (0.85 + r(i + 2) * 0.3);
        ctx.fillStyle = ['#2f4a25', '#3a5c2c', '#456b33'][i];
        ctx.beginPath();
        ctx.ellipse((r(i + 5) - 0.5) * 7, cy, cr, cr * 0.78, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'bush':
      drawShadow(ctx, 0, 0, 9, 0.28);
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = ['#2c4522', '#365429', '#3f6130'][i];
        ctx.beginPath();
        ctx.ellipse((i - 1) * 7, -6 - i * 2, 9 - i, 7 - i * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'rock': {
      const s = 0.7 + r(3) * 0.7;
      drawShadow(ctx, 0, 0, 10 * s, 0.3);
      ctx.fillStyle = '#5c5850';
      ctx.beginPath();
      ctx.moveTo(-11 * s, 0); ctx.lineTo(-6 * s, -12 * s); ctx.lineTo(4 * s, -14 * s);
      ctx.lineTo(11 * s, -3 * s); ctx.lineTo(7 * s, 0);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#6e6a61';
      ctx.beginPath();
      ctx.moveTo(-6 * s, -12 * s); ctx.lineTo(4 * s, -14 * s); ctx.lineTo(1 * s, -8 * s);
      ctx.closePath(); ctx.fill();
      break;
    }
    case 'fence':
      ctx.strokeStyle = '#5b4830';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-16, -4); ctx.lineTo(16, -10);
      ctx.moveTo(-16, -12); ctx.lineTo(16, -18);
      ctx.stroke();
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-14, 2); ctx.lineTo(-14, -22);
      ctx.moveTo(14, -2); ctx.lineTo(14, -26);
      ctx.stroke();
      break;
    case 'pillar': {
      const h = 62 + r(4) * 30;
      const broken = r(6) > 0.55;
      drawShadow(ctx, 0, 0, 14, 0.36);
      const H = broken ? h * 0.55 : h;
      ctx.fillStyle = '#6a6154';
      ctx.fillRect(-13, -8, 26, 8);
      ctx.fillStyle = '#7b7365';
      ctx.fillRect(-9, -H, 18, H - 6);
      ctx.fillStyle = '#5c5548';
      ctx.fillRect(3, -H, 6, H - 6);
      if (!broken) { ctx.fillStyle = '#8b8375'; ctx.fillRect(-12, -H - 8, 24, 9); }
      break;
    }
    case 'rubble':
      drawShadow(ctx, 0, 0, 12, 0.26);
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = ['#57503f', '#645c49', '#4b4536', '#6d6553'][i];
        const bx = (r(i) - 0.5) * 22, by = -2 - r(i + 4) * 8, bw = 6 + r(i + 8) * 7;
        ctx.fillRect(bx, by, bw, bw * 0.6);
      }
      break;
    case 'banner': {
      ctx.fillStyle = '#4a4336';
      ctx.fillRect(-2, -70, 4, 70);
      const sway = Math.sin(t * 1.6 + seed) * 3;
      ctx.fillStyle = '#7d1e18';
      ctx.beginPath();
      ctx.moveTo(2, -66); ctx.lineTo(24 + sway, -62); ctx.lineTo(24 + sway, -22);
      ctx.lineTo(13 + sway, -30); ctx.lineTo(2, -24);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(200,162,74,.7)';
      ctx.fillRect(8, -52, 10, 3);
      break;
    }
    case 'wall': {
      const H = 74;
      drawShadow(ctx, 0, 0, 16, 0.4);
      ctx.fillStyle = shade(biome.path, 0.62);
      ctx.fillRect(-22, -H, 44, H);
      ctx.fillStyle = shade(biome.path, 0.86);
      ctx.fillRect(-22, -H, 44, 7);
      ctx.strokeStyle = 'rgba(0,0,0,.3)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(-22, -H + i * (H / 5));
        ctx.lineTo(22, -H + i * (H / 5));
        ctx.stroke();
      }
      break;
    }
    case 'sconce': {
      const H = 74;
      ctx.fillStyle = shade(biome.path, 0.62);
      ctx.fillRect(-22, -H, 44, H);
      ctx.fillStyle = '#3a3128';
      ctx.fillRect(-4, -46, 8, 12);
      const f = t * 6 + seed;
      for (let i = 0; i < 3; i++) {
        const fh = 12 + Math.sin(f + i * 1.7) * 4 + i * 2;
        const fw = 6 - i * 1.5;
        ctx.fillStyle = ['rgba(220,110,30,.85)', 'rgba(245,175,50,.9)', 'rgba(255,232,150,.95)'][i];
        ctx.beginPath();
        ctx.moveTo(-fw, -46);
        ctx.quadraticCurveTo(Math.sin(f * 1.3 + i) * 3, -46 - fh, fw, -46);
        ctx.closePath(); ctx.fill();
      }
      break;
    }
    case 'urn':
      drawShadow(ctx, 0, 0, 8, 0.3);
      ctx.fillStyle = '#5b4a38';
      ctx.beginPath();
      ctx.ellipse(0, -12, 9, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6d5a44';
      ctx.fillRect(-5, -28, 10, 6);
      break;
  }
  ctx.restore();
}
