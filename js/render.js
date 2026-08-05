// Isometric renderer for the road.
//
// The camera rides just behind the hero and everything is drawn close — this
// is a battle you watch, not a map you survey. Order: sky, ground, a
// depth-merged pass over scenery and actors, then lighting for the stretches
// that run underground.

import { TILE_W, TILE_H, toScreen, tilePath, hash2, clamp } from './iso.js';
import { HALF, VERGE, propAt, decalAt, landmarkAt } from './world.js';
import { drawActor, drawShadow, drawProp, drawCoin, drawTelegraph } from './sprites.js';
import * as Atlas from './atlas.js';

let lightCv = null, lightCtx = null;

// The scene transform's screen origin, kept for the ground tiler.
let lastOX = 0, lastOY = 0;

export function makeCamera() {
  return { x: 0, y: 0, zoom: 1.6, shake: 0, shakeX: 0, shakeY: 0 };
}

// Close enough that a hero fills a good slice of the screen.
export function fitZoom(w, h) {
  return clamp(Math.min(w / 540, h / 620) * 1.5, 1.15, 2.6);
}

export function render(ctx, S, t, dt) {
  const { canvas } = ctx;
  const cw = canvas.width / S.dpr, ch = canvas.height / S.dpr;
  const cam = S.cam, b = S.biome;

  if (cam.shake > 0) {
    cam.shakeX = (Math.random() - 0.5) * cam.shake * 14;
    cam.shakeY = (Math.random() - 0.5) * cam.shake * 8;
    cam.shake = Math.max(0, cam.shake - dt * 2.6);
  } else { cam.shakeX = cam.shakeY = 0; }

  ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
  // A biome with an `art` block is drawn from textures and a prop sheet
  // instead of generated ground and vector scenery.
  const painted = !!(b.art && Atlas.texture(b.art.grass));
  if (b.art) { ctx.fillStyle = b.art.fill; ctx.fillRect(0, 0, cw, ch); }
  else drawSky(ctx, S, cw, ch);

  const camS = toScreen(cam.x, cam.y);
  const ox = cw / 2 - camS.x * cam.zoom + cam.shakeX;
  const oy = ch / 2 - camS.y * cam.zoom + cam.shakeY - ch * 0.06;
  // Hit-testing (coins) needs the same transform the scene was drawn with.
  S.view = { ox, oy, zoom: cam.zoom };
  lastOX = ox; lastOY = oy;

  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(cam.zoom, cam.zoom);

  if (painted) { drawTexturedGround(ctx, S, cw, ch); drawDecals(ctx, S); }
  else drawGround(ctx, S, t);
  drawStains(ctx, S);
  drawTelegraphs(ctx, S);
  drawDepthPass(ctx, S, t, !!painted);
  drawGroundEffects(ctx, S, t);
  drawCoins(ctx, S, t);

  ctx.restore();

  if (b.darkness > 0.02) drawLighting(ctx, S, cw, ch, ox, oy, t);
  drawTint(ctx, S, cw, ch);

  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(cam.zoom, cam.zoom);
  drawOverheads(ctx, S, t);
  ctx.restore();
}

// --- backdrop ---------------------------------------------------------------

function drawSky(ctx, S, cw, ch) {
  const b = S.biome;
  const g = ctx.createLinearGradient(0, 0, 0, ch);
  g.addColorStop(0, b.sky[0]);
  g.addColorStop(0.62, b.sky[1]);
  g.addColorStop(1, b.horizon);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cw, ch);

  if (b.indoors) return;

  // Distant treeline, parallaxed against the march so the walk reads as travel.
  const shift = -S.cam.x * 6 % 220;
  ctx.fillStyle = b.horizon;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.moveTo(-40, ch * 0.52);
  for (let i = -1; i < cw / 55 + 2; i++) {
    const px = i * 55 + shift;
    const ph = 16 + hash2(i, 3) * 40;
    ctx.lineTo(px, ch * 0.52 - ph);
    ctx.lineTo(px + 27, ch * 0.52 - ph * 0.4);
  }
  ctx.lineTo(cw + 60, ch);
  ctx.lineTo(-40, ch);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

// --- ground -----------------------------------------------------------------

function drawGround(ctx, S, t) {
  const b = S.biome;
  const cx = Math.round(S.cam.x);
  const span = Math.ceil(11 / S.cam.zoom) + 9;

  for (let y = -VERGE - 1; y <= VERGE + 1; y++) {
    for (let x = cx - span; x <= cx + span; x++) {
      const p = toScreen(x + 0.5, y + 0.5);
      const h = hash2(x, y);
      const road = Math.abs(y) <= HALF;

      tilePath(ctx, p.x, p.y);
      if (road) ctx.fillStyle = h > 0.5 ? b.path : b.pathAlt;
      else ctx.fillStyle = h > 0.5 ? b.ground : b.groundAlt;
      ctx.fill();

      if (road) {
        ctx.strokeStyle = 'rgba(0,0,0,.18)';
        ctx.lineWidth = 1;
        ctx.stroke();
        if (h > 0.9) {                     // scattered flagstones / gravel
          ctx.fillStyle = 'rgba(0,0,0,.14)';
          ctx.beginPath();
          ctx.ellipse(p.x + (h - 0.9) * 90, p.y, 8, 3.5, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (!b.indoors && h > 0.55) { // tufts of grass on the verge
        ctx.strokeStyle = `rgba(${h > 0.8 ? '120,150,80' : '80,110,60'},.5)`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        const gx = p.x + (h - 0.55) * 60 - 12, gy = p.y + 2;
        ctx.moveTo(gx, gy); ctx.lineTo(gx - 2, gy - 6);
        ctx.moveTo(gx + 3, gy); ctx.lineTo(gx + 5, gy - 5);
        ctx.stroke();
      }
    }
  }

  // Where the road edge runs, a lip of kerb stones.
  for (const side of [-1, 1]) {
    for (let x = cx - span; x <= cx + span; x++) {
      const p = toScreen(x + 0.5, side * (HALF + 0.5) + 0.5);
      ctx.fillStyle = 'rgba(0,0,0,.2)';
      tilePath(ctx, p.x, p.y - 2);
      ctx.fill();
    }
  }

}

function drawStains(ctx, S) {
  for (const s of S.stains) {
    const p = toScreen(s.x, s.y);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(1, 0.5);
    ctx.fillStyle = `rgba(${s.c},${s.a})`;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2;
      const r = s.r * (0.6 + hash2(s.seed + i, i) * 0.7);
      ctx[i ? 'lineTo' : 'moveTo'](Math.cos(ang) * r, Math.sin(ang) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

/**
 * Ground from repeating textures.
 *
 * Grass covers everything; the road is the same trick clipped to the walkable
 * band, so the two always agree about where the edge is and there is no seam
 * to line up. Both patterns are anchored to the world origin inside the scene
 * transform, which is what makes them scroll with the march instead of
 * sliding under it.
 */
function drawTexturedGround(ctx, S, cw, ch) {
  const a = S.biome.art;
  const z = S.cam.zoom;
  const l = -lastOX / z, tp = -lastOY / z, w = cw / z, h = ch / z;

  const grass = Atlas.patternFor(ctx, a.grass);
  if (grass) fillScaled(ctx, grass, a.groundScale, l, tp, w, h);

  const road = Atlas.patternFor(ctx, a.road);
  if (road) {
    ctx.save();
    bandPath(ctx, S);
    ctx.clip();
    fillScaled(ctx, road, a.roadScale, l, tp, w, h);
    ctx.restore();
  }

  // A little dirt worn into the verge either side of the flagstones.
  ctx.save();
  bandPath(ctx, S, 0.45);
  ctx.strokeStyle = 'rgba(0,0,0,.22)';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.restore();
}

function fillScaled(ctx, pattern, scale, l, t, w, h) {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.fillStyle = pattern;
  ctx.fillRect(l / scale - 2, t / scale - 2, w / scale + 4, h / scale + 4);
  ctx.restore();
}

/**
 * Smooth 1-D value noise along the road, in two octaves.
 *
 * Deterministic on the tile coordinate like everything else here, so the same
 * stretch of verge always has the same shape however many times you walk it.
 */
function edgeNoise(x, seed) {
  let v = 0, amp = 1, freq = 0.34, total = 0;
  for (let o = 0; o < 2; o++) {
    const p = x * freq;
    const i = Math.floor(p), f = p - i;
    const a = hash2(i, seed + o * 37), b = hash2(i + 1, seed + o * 37);
    const t = f * f * (3 - 2 * f);          // smoothstep between lattice points
    v += (a + (b - a) * t) * amp;
    total += amp;
    amp *= 0.45; freq *= 2.7;
  }
  return v / total - 0.5;                    // -0.5 .. 0.5
}

// How far the painted edge strays from the walkable edge. Purely cosmetic —
// the hero's road is still the straight band, and nothing gameplay-facing
// reads this.
const EDGE_WOBBLE = 0.85;

export const roadEdge = (x, side) => HALF + edgeNoise(x, side > 0 ? 11 : 907) * EDGE_WOBBLE;

/**
 * The road as a path, stretched well past the view on both sides.
 *
 * The edges wander rather than ruling a straight line, which is the single
 * biggest tell that a road was clipped rather than laid.
 */
function bandPath(ctx, S, grow = 0) {
  const x0 = S.cam.x - 60, x1 = S.cam.x + 60;
  const step = 0.5;
  ctx.beginPath();
  for (let x = x0; x <= x1; x += step) {
    const p = toScreen(x, -(roadEdge(x, -1) + grow));
    if (x === x0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
  }
  for (let x = x1; x >= x0; x -= step) {
    const p = toScreen(x, roadEdge(x, 1) + grow);
    ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
}

// Flat markings lying on the road: puddles, ruts, moss, spilt bones. They sit
// on the ground with no depth sorting of their own, because nothing can pass
// behind a puddle.
function drawDecals(ctx, S) {
  const a = S.biome.art;
  const sh = Atlas.sheet(a.decals.src, a.decals.cols, a.decals.rows);
  if (!sh) return;
  const cx = Math.round(S.cam.x);
  const span = Math.ceil(11 / S.cam.zoom) + 9;
  for (let y = -Math.ceil(HALF) - 1; y <= Math.ceil(HALF) + 1; y++) {
    for (let x = cx - span; x <= cx + span; x++) {
      const cell = decalAt(x, y, S.biome);
      if (cell === null) continue;
      const p = toScreen(x + 0.2 + hash2(x, y + 5) * 0.6, y + 0.2 + hash2(x + 9, y) * 0.6);
      Atlas.drawSprite(ctx, sh, cell, p.x, p.y, a.decals.scale * (0.8 + hash2(x + 3, y + 3) * 0.5));
    }
  }
}

// Painted on the ground under everything, so a boss move is always something
// you had a second to answer.
function drawTelegraphs(ctx, S) {
  for (const m of S.monsters) {
    if (m.dead || !m.casting || !m.telegraph) continue;
    const p = toScreen(m.telegraph.x, m.telegraph.y);
    const fill = Math.min(1, m.castT / m.casting.tell);
    drawTelegraph(ctx, p.x, p.y, m.casting.radius * TILE_W * 0.5, fill, m.casting.colour);
  }
}

// --- scenery + actors, merged by depth --------------------------------------

function drawDepthPass(ctx, S, t, painted) {
  const b = S.biome;
  const cx = Math.round(S.cam.x);
  const span = Math.ceil(11 / S.cam.zoom) + 9;

  const items = [];
  const sheet = b.art && b.art.props ? Atlas.sheet(b.art.props, b.art.propCols, b.art.propRows) : null;

  // Landmarks share the depth pass with everything else, so the hero can walk
  // behind a mausoleum the same way they walk behind a tree.
  for (let y = -VERGE; y <= VERGE; y++) {
    for (let x = cx - span; x <= cx + span; x++) {
      const lm = landmarkAt(x, y, b);
      if (!lm) continue;
      const lsh = Atlas.sheet(lm.sheet.src, lm.sheet.cols, lm.sheet.rows);
      if (!lsh || !lsh.cells[lm.cell]) continue;
      items.push({ propCell: lm.cell, propSheet: lsh, scale: lm.sheet.scale, x: x + 0.5, y: y + 0.5 });
    }
  }
  for (let y = -VERGE; y <= VERGE; y++) {
    for (let x = cx - span; x <= cx + span; x++) {
      const kind = propAt(x, y, b);
      if (!kind) continue;
      const seed = (x * 31 + y * 17) & 1023;
      if (sheet && b.art.cells[kind]) {
        // Pick which of the sheet's variants stands here, deterministically,
        // and jitter it off the tile centre so the verge isn't a grid.
        const opts = b.art.cells[kind];
        const hv = hash2(x * 3 + 11, y * 7 + 5);
        items.push({
          // Deliberately not called `sprite`: actors carry a sprite *spec*
          // under that name, and the draw branch below would collide.
          propCell: opts[Math.floor(hv * opts.length) % opts.length], propSheet: sheet,
          scale: b.art.propScale * (0.86 + hash2(x + 5, y - 3) * 0.3),
          x: x + 0.2 + hash2(x, y + 91) * 0.6,
          y: y + 0.2 + hash2(x + 71, y) * 0.6,
        });
      } else if (!b.art) {
        items.push({ prop: kind, x: x + 0.5, y: y + 0.5, seed });
      }
    }
  }
  if (!S.hero.dead || S.hero.deathAnim < 1) items.push(S.hero);
  for (const m of S.monsters) if (!m.dead || m.fade > 0) items.push(m);
  for (const p of S.pickups) items.push(p);
  for (const p of S.projectiles) items.push(p);
  items.sort((p, q) => (p.x + p.y) - (q.x + q.y));

  for (const it of items) {
    const p = toScreen(it.x, it.y);
    if (it.propSheet) { Atlas.drawSprite(ctx, it.propSheet, it.propCell, p.x, p.y, it.scale); continue; }
    if (it.prop) { drawProp(ctx, it.prop, p.x, p.y, t, it.seed, b); continue; }
    if (it.proj) { drawProjectile(ctx, p.x, p.y, it); continue; }
    if (it.pickup) { drawCoin(ctx, p.x, p.y, 4 + Math.abs(Math.sin(t * 3 + it.seed)) * 4, t * 4 + it.seed, false); continue; }
    drawFighter(ctx, it, p, t);
  }
}

function drawFighter(ctx, o, p, t) {
  const fade = (o.dead ? Math.max(0, o.fade) : 1) * (o.emerge !== undefined ? o.emerge : 1);
  ctx.globalAlpha = fade;
  const sink = o.dead ? (1 - o.fade) * 10 : 0;
  drawShadow(ctx, p.x, p.y, 11 * (o.scale || 1) * fade, 0.4 * fade);
  ctx.save();
  // Anything with its own collapse animation plays that instead of the
  // generic topple, or it would fall over twice.
  const ownDeath = !!(o.sprite && o.sprite.anim && o.sprite.anim.death);
  if (o.dead && !ownDeath) {
    ctx.translate(p.x, p.y);
    ctx.rotate((1 - o.fade) * 1.2 * (o.fx >= 0 ? 1 : -1));
    ctx.translate(-p.x, -p.y);
  }
  if (!drawPaintedFighter(ctx, o, p.x, p.y + sink, t)) drawActor(ctx, o, p.x, p.y + sink, t);
  ctx.restore();
  ctx.globalAlpha = 1;
}

/**
 * A painted actor, if it has a sheet and that sheet has loaded.
 *
 * Two poses is all the art gives us, so the rest of the life comes from the
 * engine: the idle sways, the walk bobs on the same cycle the vector actors
 * use, and the attack pose is held across the middle of the swing so it lands
 * with the hit. Returns false when there's nothing painted to draw, and the
 * vector version takes over.
 */
function drawPaintedFighter(ctx, o, sx, sy, t) {
  if (!o.sprite) return false;
  const sp = o.sprite;
  const sh = Atlas.sheet(sp.sheet, sp.cols, sp.rows);
  if (!sh) return false;

  const attacking = o.swing > 0.15 && o.swing < 0.85;
  const idx = sp.row * sp.cols + (attacking ? 1 : 0);
  const cell = sh.cells[idx];
  if (!cell) return false;

  const scale = (sp.h * (o.scale || 1)) / cell.h;
  const bob = o.walk ? Math.abs(Math.sin(o.walk)) * 2.2 : Math.sin(t * 2 + sx * 0.05) * 0.8;
  // One fixed-strength red copy; the flash reads as on or off, and caching
  // it means no per-frame compositing.
  const src = o.hurt > 0.35 ? Atlas.tinted(sh, 'rgba(255,60,40,.55)') : null;

  // The art faces right; everything heading the other way is mirrored.
  Atlas.drawSprite(ctx, sh, idx, sx, sy - bob, scale, o.fx < 0, src);
  return true;
}

function drawProjectile(ctx, x, y, o) {
  const z = 18;
  // A painted missile is turned to point where it's going. Screen direction,
  // not world direction — the iso squash means those aren't the same angle.
  if (o.art) {
    const sh = Atlas.sheet(o.art.sheet, o.art.cols, o.art.rows, o.art);
    if (sh && sh.cells[o.art.arrow]) {
      const c = sh.cells[o.art.arrow];
      const ang = Math.atan2((o.vx + o.vy) * TILE_H / 2, (o.vx - o.vy) * TILE_W / 2);
      const scale = 26 / c.w;
      ctx.save();
      ctx.translate(x, y - z);
      ctx.rotate(ang);
      ctx.drawImage(sh.canvas, c.x, c.y, c.w, c.h,
        -c.w * scale / 2, -c.h * scale / 2, c.w * scale, c.h * scale);
      ctx.restore();
      return;
    }
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 3; i >= 0; i--) {
    const r = 4 + i * 3.2;
    const a = 0.5 - i * 0.1;
    ctx.fillStyle = i === 0 ? 'rgba(255,244,200,.95)' : `rgba(${240 - i * 20},${120 - i * 22},30,${a})`;
    ctx.beginPath();
    ctx.arc(x - o.vx * i * 1.6, y - z - o.vy * i * 1.6, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// --- the coin scramble ------------------------------------------------------

function drawCoins(ctx, S, t) {
  for (const c of S.coins) {
    const p = toScreen(c.x, c.y);
    ctx.globalAlpha = c.life < 0.4 ? c.life / 0.4 : 1;
    drawCoin(ctx, p.x, p.y, c.z, c.spin, c.big);
    ctx.globalAlpha = 1;
  }
  for (const s of S.sparks) {
    const p = toScreen(s.x, s.y);
    ctx.globalAlpha = s.life;
    ctx.strokeStyle = '#ffe9a8';
    ctx.lineWidth = 2;
    const r = (1 - s.life) * 22 + 4;
    ctx.beginPath();
    ctx.arc(p.x, p.y - s.z, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

// --- effects ----------------------------------------------------------------

function drawGroundEffects(ctx, S, t) {
  for (const e of S.effects) {
    const p = toScreen(e.x, e.y);
    const k = 1 - e.life / e.max;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (e.type === 'boom' || e.type === 'quake') {
      const r = e.r * TILE_W * 0.5 * (0.35 + k * 0.8);
      ctx.globalAlpha = (1 - k) * 0.85;
      ctx.scale(1, 0.5);
      const g = ctx.createRadialGradient(p.x, p.y * 2, r * 0.1, p.x, p.y * 2, r);
      const warm = e.type === 'boom';
      g.addColorStop(0, warm ? 'rgba(255,244,210,.95)' : 'rgba(200,225,255,.9)');
      g.addColorStop(0.45, warm ? 'rgba(240,130,40,.7)' : 'rgba(90,140,220,.6)');
      g.addColorStop(1, 'rgba(60,20,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y * 2, r, 0, Math.PI * 2); ctx.fill();
    } else if (e.type === 'cleave') {
      const r = e.r * TILE_W * 0.5 * (0.4 + k * 0.75);
      ctx.globalAlpha = (1 - k) * 0.7;
      ctx.scale(1, 0.5);
      ctx.strokeStyle = 'rgba(230,240,255,.9)';
      ctx.lineWidth = 7 * (1 - k) + 1;
      ctx.beginPath(); ctx.arc(p.x, p.y * 2, r, 0, Math.PI * 2); ctx.stroke();
    } else if (e.type === 'heal' || e.type === 'ward') {
      ctx.globalAlpha = (1 - k) * 0.8;
      const col = e.type === 'heal' ? '120,230,150' : '150,190,255';
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2 + k * 3;
        ctx.fillStyle = `rgba(${col},.9)`;
        ctx.beginPath();
        ctx.arc(p.x + Math.cos(ang) * 16 * (1 - k * 0.4), p.y - k * 40 + Math.sin(ang) * 7, 3 * (1 - k) + 1, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (e.type === 'slash') {
      ctx.globalAlpha = (1 - k) * 0.9;
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.lineWidth = 3 * (1 - k) + 0.6;
      ctx.beginPath();
      ctx.arc(p.x, p.y - 20, 22, e.a - 0.9 + k * 1.6, e.a + 0.1 + k * 1.6);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// --- lighting ---------------------------------------------------------------

function drawLighting(ctx, S, cw, ch, ox, oy, t) {
  if (!lightCv) {
    lightCv = document.createElement('canvas');
    lightCtx = lightCv.getContext('2d');
  }
  if (lightCv.width !== cw || lightCv.height !== ch) { lightCv.width = cw; lightCv.height = ch; }
  const L = lightCtx, z = S.cam.zoom, b = S.biome;

  const lights = [];
  const flick = 0.9 + Math.sin(t * 9) * 0.05 + Math.sin(t * 23) * 0.03;
  const hp = toScreen(S.hero.x, S.hero.y);
  lights.push({ x: hp.x, y: hp.y - 16, r: 330 * flick, warm: 0.55 });

  // Wall sconces along the verge do the rest of the work.
  const cx = Math.round(S.cam.x);
  for (let x = cx - 14; x <= cx + 14; x++) {
    for (const side of [-1, 1]) {
      for (let dy = 0; dy <= 1; dy++) {
        const y = side * (Math.ceil(HALF) + dy);
        if (propAt(x, y, b) !== 'sconce') continue;
        const p = toScreen(x + 0.5, y + 0.5);
        lights.push({ x: p.x, y: p.y - 46, r: 165 * (0.86 + Math.sin(t * 7 + x) * 0.14), warm: 1 });
      }
    }
  }
  for (const e of S.effects) {
    if (e.type !== 'boom' && e.type !== 'cleave') continue;
    const p = toScreen(e.x, e.y);
    lights.push({ x: p.x, y: p.y - 10, r: 190 * (1 - e.life / e.max), warm: e.type === 'boom' ? 1 : 0.2 });
  }

  L.setTransform(1, 0, 0, 1, 0, 0);
  L.globalCompositeOperation = 'source-over';
  L.fillStyle = `rgba(0,0,0,${b.darkness})`;
  L.fillRect(0, 0, cw, ch);
  L.globalCompositeOperation = 'destination-out';
  for (const li of lights) {
    const x = ox + li.x * z, y = oy + li.y * z, r = li.r * z;
    if (x + r < 0 || x - r > cw || y + r < 0 || y - r > ch) continue;
    const g = L.createRadialGradient(x, y, r * 0.08, x, y, r);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.42, 'rgba(0,0,0,.72)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    L.fillStyle = g;
    L.save();
    L.translate(x, y); L.scale(1, 0.66); L.translate(-x, -y);
    L.beginPath(); L.arc(x, y, r, 0, Math.PI * 2); L.fill();
    L.restore();
  }
  ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
  ctx.drawImage(lightCv, 0, 0, cw, ch);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const li of lights) {
    if (li.warm <= 0) continue;
    const x = ox + li.x * z, y = oy + li.y * z, r = li.r * z * 0.85;
    if (x + r < 0 || x - r > cw || y + r < 0 || y - r > ch) continue;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,182,90,${0.12 * li.warm})`);
    g.addColorStop(1, 'rgba(255,140,40,0)');
    ctx.fillStyle = g;
    ctx.save();
    ctx.translate(x, y); ctx.scale(1, 0.66); ctx.translate(-x, -y);
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// A wash of the biome's colour plus a soft frame, so daylight scenes still
// feel composed rather than flat.
function drawTint(ctx, S, cw, ch) {
  ctx.fillStyle = S.biome.tint;
  ctx.fillRect(0, 0, cw, ch);
  const g = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.38, cw / 2, ch / 2, Math.max(cw, ch) * 0.8);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${S.biome.indoors ? 0.6 : 0.34})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cw, ch);
}

// --- things that must stay legible ------------------------------------------

function drawOverheads(ctx, S, t) {
  ctx.textAlign = 'center';

  for (const m of S.monsters) {
    if (m.dead || m.hp >= m.maxHp) continue;
    const p = toScreen(m.x, m.y);
    const top = p.y - 46 * (m.scale || 1) - 8;
    const w = m.boss ? 74 : 34;
    ctx.fillStyle = 'rgba(0,0,0,.7)';
    ctx.fillRect(p.x - w / 2 - 1, top - 1, w + 2, 5);
    ctx.fillStyle = m.boss ? '#d6352a' : '#a8332a';
    ctx.fillRect(p.x - w / 2, top, w * Math.max(0, m.hp / m.maxHp), 3);
  }

  if (S.hero.target && !S.hero.target.dead && !S.hero.dead) {
    const p = toScreen(S.hero.target.x, S.hero.target.y);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(1, 0.5);
    ctx.strokeStyle = `rgba(255,235,180,${0.3 + Math.sin(t * 6) * 0.16})`;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([5, 5]);
    ctx.lineDashOffset = -t * 14;
    ctx.beginPath();
    ctx.arc(0, 0, 20 * (S.hero.target.scale || 1), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  for (const f of S.floats) {
    const k = f.life / f.max;
    ctx.globalAlpha = Math.min(1, k * 2.2);
    const p = toScreen(f.x, f.y);
    const x = p.x + (f.ox || 0);
    const y = p.y - 34 + (f.oy || 0) - (1 - k) * 42;
    ctx.font = `${f.big ? 22 : 15}px "Iowan Old Style", Georgia, serif`;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,.85)';
    ctx.strokeText(f.text, x, y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, x, y);
  }
  ctx.globalAlpha = 1;
}
