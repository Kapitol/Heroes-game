// Isometric renderer for the road.
//
// The camera rides just behind the hero and everything is drawn close — this
// is a battle you watch, not a map you survey. Order: sky, ground, a
// depth-merged pass over scenery and actors, then lighting for the stretches
// that run underground.

import { TILE_W, TILE_H, toScreen, tilePath, hash2, clamp } from './iso.js';
import { HALF, VERGE, propAt, decalAt, landmarkAt } from './world.js';
import { drawActor, drawShadow, drawProp, drawTelegraph, drawChest } from './sprites.js';
import * as Atlas from './atlas.js';
import * as Coffin from './coffin.js';
import * as Rig from './rig.js';

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

  // The payout game takes the whole screen; it is a scene of its own, and it
  // covers the road completely. Drawing the road underneath it was a full
  // world render — ground, decals, depth pass, lighting — for something the
  // backdrop then buried, and it was most of the frame. The shaft is painted
  // now and costs real fill of its own, so the road behind it goes.
  if (S.phase === 'drop' && S.drop) {
    Coffin.draw(ctx, S.drop, cw, ch, b.accent);
    return;
  }

  // A biome with an `art` block is drawn from textures and a prop sheet
  // instead of generated ground and vector scenery.
  const painted = !!(b.art && Atlas.texture(b.art.grass));
  if (b.art) { ctx.fillStyle = b.art.fill; ctx.fillRect(0, 0, cw, ch); }
  else drawSky(ctx, S, cw, ch);

  const camS = toScreen(cam.x, cam.y);
  const ox = cw / 2 - camS.x * cam.zoom + cam.shakeX;
  const oy = ch / 2 - camS.y * cam.zoom + cam.shakeY - ch * 0.06;
  // Hit-testing needs the same transform the scene was drawn with.
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

  // Edge tiles go down *before* the road, not after. Their stone half is tan
  // flagstone and the road is grey cobble — laid on top they read as a stripe
  // of a different material running alongside the road. Underneath, the road
  // overpaints that half and only their grass fringe survives, which is the
  // part actually doing the blending.
  const laidEdges = drawRoadEdges(ctx, S);

  const road = Atlas.patternFor(ctx, a.road);
  if (road) {
    ctx.save();
    bandPath(ctx, S);
    ctx.clip();
    fillScaled(ctx, road, a.roadScale, l, tp, w, h);
    // Optional wash over the road only. Two textures cut from the same
    // material — the inferno's basalt path against its lava field — measure
    // eight grey levels apart, and at that distance the road stops reading as
    // a road at all: the hero walks down a band you cannot see. Trodding it
    // darker is what the eye is looking for anyway. Biomes whose road and
    // verge already differ (grass against flagstone) leave this off.
    if (a.roadShade) {
      ctx.fillStyle = a.roadShade;
      ctx.fillRect(l - 2, tp - 2, w + 4, h + 4);
    }
    ctx.restore();
  }

  if (a.roadShade && a.roadFeather) featherRoadEdge(ctx, S, a);
  else if (!laidEdges) {
    // No edge art loaded yet: fall back to a worn line so the boundary still
    // reads as something rather than a hard cut.
    ctx.save();
    bandPath(ctx, S, 0.45);
    ctx.strokeStyle = 'rgba(0,0,0,.22)';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.restore();
  }
}

/**
 * Soften the road's edge where there are no transition tiles to lay.
 *
 * A clip cuts on a pixel, and against a texture this busy that cut is the one
 * straight line in the whole frame — the eye finds it immediately and the road
 * stops being ground and starts being a shape pasted on top. The boneyard
 * answers that with painted diamonds that carry the blend inside them; the
 * inferno has no such sheet and does not need one, because here the road is
 * not a different material. It is the same rock, scorched — and scorching does
 * not stop on a line.
 *
 * So the wash that darkens the road is stroked back along its own edge a few
 * times, each pass wider and fainter, which walks the shade out into the lava
 * field instead of ending it. Three strokes of a path that is already built:
 * cheaper than a single blurred blit, and it reads as burn rather than as
 * blur.
 */
function featherRoadEdge(ctx, S, a) {
  const reach = a.roadFeather;
  ctx.save();
  ctx.strokeStyle = a.roadShade;
  ctx.lineJoin = 'round';
  for (let i = 0; i < 3; i++) {
    // Widest and faintest first. Alpha compounds where the passes overlap, so
    // the shade is deepest against the road and gone by the outer edge.
    ctx.globalAlpha = 0.34 + i * 0.1;
    ctx.lineWidth = reach * (1 - i * 0.3);
    bandPath(ctx, S);
    ctx.stroke();
  }
  ctx.restore();
}

// Edge tiles are drawn a hundred-odd times a frame, and rescaling a 657px
// source down to 64 each time is what turns a 60fps frame into a 40fps one.
// Each one gets baked to a small canvas once instead.
const bakedTiles = new Map();
function bakedTile(sh, idx, w, h) {
  const key = `${idx}:${w}x${h}`;
  let cv = bakedTiles.get(key);
  if (cv) return cv;
  const c = sh.cells[idx];
  cv = document.createElement('canvas');
  cv.width = Math.ceil(w * 2);          // 2x, so the camera zoom has headroom
  cv.height = Math.ceil(h * 2);
  cv.getContext('2d').drawImage(sh.canvas, c.x, c.y, c.w, c.h, 0, 0, cv.width, cv.height);
  bakedTiles.set(key, cv);
  return cv;
}

/**
 * Lay painted transition diamonds along both edges of the road.
 *
 * The clip gives a clean boundary but a hard one — stone stops and grass
 * starts on the same pixel. These tiles carry the blend inside them, so they
 * straddle the edge line rather than butting up against it.
 *
 * They are baked into long ribbon chunks rather than blitted one at a time. A
 * single alpha blit onto the presented canvas costs about 0.2ms here, so the
 * ~130 tiles a screen needs would eat 25ms — more than the whole rest of the
 * frame. Chunked, it is three or four blits, and a chunk is only built when
 * the march reaches new ground.
 */
// Small on purpose. A chunk's canvas is the bounding box of a diagonal band,
// so most of it is empty; the shorter the run, the tighter the box hugs the
// ribbon and the less transparent area gets blended every frame.
const CHUNK = 6;
const ribbons = new Map();

function ribbonChunk(sh, cfg, side, ci, biome) {
  const key = `${biome.key}:${side}:${ci}`;
  let r = ribbons.get(key);
  if (r) return r;

  const idx = side < 0 ? cfg.minus : cfg.plus;
  const cell = sh.cells[idx];
  const scale = TILE_W / cell.w;
  const drawnH = cell.h * scale;
  const overhang = Math.max(0, drawnH - TILE_H);   // lip below the flat face
  const y0 = drawnH / 2 - overhang / 2 + cfg.lift * TILE_H;

  const x0 = ci * CHUNK, x1 = x0 + CHUNK;
  let l = Infinity, t = Infinity, rt = -Infinity, b = -Infinity;
  for (let x = x0; x <= x1; x += 0.5) {
    const p = toScreen(x, side * roadEdge(x, side, biome));
    if (p.x < l) l = p.x;
    if (p.x > rt) rt = p.x;
    if (p.y < t) t = p.y;
    if (p.y > b) b = p.y;
  }
  l -= TILE_W; rt += TILE_W; t -= drawnH * 2; b += drawnH * 2;

  const cv = document.createElement('canvas');
  cv.width = Math.ceil(rt - l);
  cv.height = Math.ceil(b - t);
  const c = cv.getContext('2d');
  const baked = bakedTile(sh, idx, TILE_W, drawnH);
  for (let x = x0; x <= x1; x += 0.5) {
    const p = toScreen(x, side * roadEdge(x, side, biome));
    c.drawImage(baked, p.x - l - TILE_W / 2, p.y - t + y0 - drawnH, TILE_W, drawnH);
  }

  r = { cv, l, t };
  ribbons.set(key, r);
  if (ribbons.size > 12) ribbons.delete(ribbons.keys().next().value);
  return r;
}

function drawRoadEdges(ctx, S) {
  const cfg = S.biome.art && S.biome.art.edges;
  if (!cfg) return false;
  const sh = Atlas.sheet(cfg.src, cfg.cols, cfg.rows);
  if (!sh) return false;

  const reach = Math.ceil(11 / S.cam.zoom) + 10;
  const c0 = Math.floor((S.cam.x - reach) / CHUNK);
  const c1 = Math.floor((S.cam.x + reach) / CHUNK);
  for (const side of [-1, 1]) {
    if (!sh.cells[side < 0 ? cfg.minus : cfg.plus]) continue;
    for (let ci = c0; ci <= c1; ci++) {
      const r = ribbonChunk(sh, cfg, side, ci, S.biome);
      ctx.drawImage(r.cv, r.l, r.t);
    }
  }
  return true;
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

/**
 * Where the painted road ends, in tiles from the centre line.
 *
 * `art.roadInset` pulls that in without narrowing the walkable band, which is
 * the only reason the two are separate numbers. The inferno's lava field is
 * the thing worth looking at and its basalt track is not, so down there the
 * paint gives most of the width back to the ground and the hero walks a
 * scorched line through it. The hero's own band never changes: they still have
 * the full road to fight on, and still stray to the edge of the paint.
 */
export const roadEdge = (x, side, biome) => {
  const inset = (biome && biome.art && biome.art.roadInset) || 0;
  return HALF - inset + edgeNoise(x, side > 0 ? 11 : 907) * EDGE_WOBBLE;
};

/**
 * The road as a path, stretched well past the view on both sides.
 *
 * The edges wander rather than ruling a straight line, which is the single
 * biggest tell that a road was clipped rather than laid.
 */
function bandPath(ctx, S, grow = 0) {
  // Only as far as the view reaches, and one point per tile. This path is used
  // as a clip, and a clip's cost scales with its point count — spanning ±60
  // tiles at half-tile steps built a 480-point path every frame and cost more
  // than everything else in the renderer put together.
  const reach = Math.ceil(11 / S.cam.zoom) + 12;
  const x0 = Math.floor(S.cam.x - reach), x1 = Math.ceil(S.cam.x + reach);
  const step = 1;
  ctx.beginPath();
  for (let x = x0; x <= x1; x += step) {
    const p = toScreen(x, -(roadEdge(x, -1, S.biome) + grow));
    if (x === x0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
  }
  for (let x = x1; x >= x0; x -= step) {
    const p = toScreen(x, roadEdge(x, 1, S.biome) + grow);
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
  // `propSlice` is optional and per-biome: a sheet that landed on an even
  // lattice is cut by the grid, one that didn't asks to be cut by its gutters.
  const sheet = b.art && b.art.props
    ? Atlas.sheet(b.art.props, b.art.propCols, b.art.propRows, b.art.propSlice)
    : null;

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
  if (S.chest) items.push(S.chest);
  for (const m of S.monsters) if (!m.dead || m.fade > 0) items.push(m);
  for (const p of S.projectiles) items.push(p);
  items.sort((p, q) => (p.x + p.y) - (q.x + q.y));

  for (const it of items) {
    if (it.state && it.loot) {                     // the boss's chest
      const p = toScreen(it.x, it.y);
      drawChest(ctx, p.x, p.y, it.z, it.open || 0, t, 1);
      continue;
    }
    const p = toScreen(it.x, it.y);
    if (it.propSheet) { Atlas.drawSprite(ctx, it.propSheet, it.propCell, p.x, p.y, it.scale); continue; }
    if (it.prop) { drawProp(ctx, it.prop, p.x, p.y, t, it.seed, b); continue; }
    if (it.proj) { drawProjectile(ctx, p.x, p.y, it); continue; }
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
 * Two poses is all most of the art gives us, so the rest of the life comes
 * from the engine: the idle sways, the walk bobs on the same cycle the vector
 * actors use, and the attack pose is held across the middle of the swing so it
 * lands with the hit. A sheet that brings real frames — `sprite.anim` — plays
 * those instead for the states it has them for, and falls back to the poses for
 * everything else. Returns false when there's nothing painted to draw, and the
 * vector version takes over.
 */
function drawPaintedFighter(ctx, o, sx, sy, t) {
  if (!o.sprite) return false;
  const sp = o.sprite;
  const attacking = o.swing > 0.15 && o.swing < 0.85;
  const bob = o.walk ? Math.abs(Math.sin(o.walk)) * 1.1 : Math.sin(t * 2 + sx * 0.05) * 0.8;

  // The jointed hero, when a run asks for it. Nothing else is rigged yet, so
  // this is opt-in until the rest of the part art exists — a stick figure in
  // gauntlets is a thing to develop against, not a thing to ship.
  if (o.rig) return drawRiggedHero(ctx, o, sx, sy);

  // A skill outranks everything. It is the one thing on screen the player
  // actually pressed, and a hero who keeps swinging through his own heal is a
  // hero whose buttons do not appear to do anything.
  if (drawActionPose(ctx, o, sp, sx, sy)) return true;
  if (drawAnimFrame(ctx, o, sp, sx, sy, attacking, bob)) return true;

  // `sp` doubles as the slicing options, the way projectile art does: the
  // class sheets are sliced by content because their rows grow taller down the
  // sheet, and a lattice would cut the horned helms in half.
  const sh = Atlas.sheet(sp.sheet, sp.cols, sp.rows, sp);
  if (!sh) return false;

  // Column 0 is standing; everything after it is a way of hitting something.
  // A sheet that drew more than one of those alternates between them per swing,
  // so a long fight is a hero working rather than one frame played on a loop.
  const blows = sp.attacks || [1];
  const idx = sp.row * sp.cols
    + (attacking ? blows[(o.swings || 0) % blows.length] : 0);
  const cell = sh.cells[idx];
  if (!cell) return false;

  // Scaled off the row's *standing* pose, never off the pose being drawn. Each
  // cell is trimmed to its own content, so an overhead swing is a third taller
  // than an idle — fit that to the same height and the hero shrinks by a
  // quarter every time they raise the sword. One scale per row means the raised
  // sword does what a raised sword does and reaches above the head.
  const ref = sh.cells[sp.row * sp.cols] || cell;
  const scale = (sp.h * (o.scale || 1)) / ref.h;
  // One fixed-strength red copy; the flash reads as on or off, and caching
  // it means no per-frame compositing.
  const src = o.hurt > 0.35 ? Atlas.tinted(sh, 'rgba(255,60,40,.55)') : null;

  // A single pose bounced up and down reads as hopping, not walking — the
  // whole figure leaves the ground twice a stride and nothing else about it
  // moves. Real weight goes somewhere: it rocks from one foot to the other.
  // So the bounce is halved and the body leans with it, on the stride cycle
  // rather than the footfall cycle, pivoting on the feet — which is where a
  // walker actually turns. It is still two poses; it just stops denying it.
  const lean = o.walk ? Math.sin(o.walk / 2) * 0.05 * (o.fx < 0 ? -1 : 1) : 0;
  if (lean) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(lean);
    ctx.translate(-sx, -sy);
  }
  // The art faces right; everything heading the other way is mirrored.
  Atlas.drawSprite(ctx, sh, idx, sx, sy - bob, scale, o.fx < 0, src);
  if (lean) ctx.restore();
  return true;
}

// A stride is one full turn of `o.walk`, which is the same phase the bob and
// the vector actors' legs run on — so a painted walk lands on the same beat as
// everything else in the scene rather than drifting against it.
const TAU = Math.PI * 2;

/**
 * The pose a skill put the hero in, if one is still holding.
 *
 * Each pose names its own sheet and its own frames within a tier row, because
 * the art arrives that way — a shared sheet of held poses first, then a
 * dedicated two-frame sheet per action as each one gets drawn. One frame is
 * held for the whole beat; two are a wind-up and a release, and the cut
 * between them is the moment the skill happens.
 *
 * The wind-up gets the smaller share. A gesture that spends half its life
 * loading reads as slow, and these are instants — the load is a flicker and
 * the release is what the eye lands on.
 *
 * Scaled off the pose's own sheet, never the combat sheet's: separate
 * generations do not agree on trimmed height, so borrowing a reference across
 * them resizes the hero the moment he casts.
 */
export const WINDUP = 0.4;

function drawActionPose(ctx, o, sp, sx, sy) {
  const set = sp.actions;
  if (!set || !o.act) return false;
  const a = set[o.act.pose];
  if (!a) return false;

  const sh = Atlas.sheet(a.sheet, a.cols, a.rows, { auto: true });
  if (!sh) return false;

  const base = sp.row * a.cols;
  const frames = a.frames;
  // `t` counts down, so elapsed is what is left subtracted from the whole.
  const k = o.act.hold ? 1 - Math.max(0, o.act.t) / o.act.hold : 1;
  const i = frames.length < 2 ? 0
    : Math.min(frames.length - 1, Math.floor(k < WINDUP ? 0 : 1 + (frames.length - 2) * ((k - WINDUP) / (1 - WINDUP))));
  const idx = base + frames[i];
  const cell = sh.cells[idx];
  if (!cell) return false;

  const ref = sh.cells[base] || cell;
  const scale = ((a.h || sp.h) * (o.scale || 1)) / ref.h;
  const src = o.hurt > 0.35 ? Atlas.tinted(sh, 'rgba(255,60,40,.55)') : null;
  Atlas.drawSprite(ctx, sh, idx, sx, sy, scale, o.fx < 0, src);
  return true;
}

/**
 * One frame of a real animation, if this actor has frames for what it is doing.
 *
 * The poses carry attacking and standing still perfectly well, so an `anim`
 * sheet only ever has to answer two questions the poses cannot: what this thing
 * looks like mid-stride, and what it looks like going down. Anything else falls
 * through and the poses take it.
 *
 * Attacking wins over walking. A creature that closes the last half-step while
 * its swing is already up would otherwise flicker between the two every frame,
 * which is the one thing worse than not animating at all.
 */
function drawAnimFrame(ctx, o, sp, sx, sy, attacking, bob) {
  const a = sp.anim;
  if (!a) return false;
  const dying = o.dead && a.death;
  const walking = !attacking && o.walk > 0 && a.walk;
  if (!dying && !walking) return false;

  const sh = Atlas.sheet(a.sheet, a.cols, a.rows, a);
  if (!sh) return false;

  // A `tiered` strip is one row of frames per armour tier, the same five rungs
  // the pose sheets use, so the hero cannot change armour by starting to walk.
  // A flat one is a single creature and ignores the row entirely.
  const base = a.tiered ? sp.row * a.cols : 0;
  const frames = dying ? a.death : a.walk;
  // A collapse plays once and holds on the last frame — it is over, and a body
  // that loops its own death is a body that gets up again. A stride loops.
  const i = dying
    ? Math.min(frames.length - 1, Math.floor((1 - Math.max(0, o.fade)) * frames.length))
    : Math.floor((o.walk / TAU) * frames.length) % frames.length;
  const idx = base + frames[i];
  const cell = sh.cells[idx];
  if (!cell) return false;

  // The first frame of the cycle is the reference height, for the same reason
  // the poses use the idle: frames trimmed to their own content differ by a few
  // per cent, and fitting each one to a fixed height turns that into a pulse
  // that runs in step with the stride.
  const ref = sh.cells[base + frames[0]] || cell;
  const scale = ((a.h || sp.h) * (o.scale || 1)) / ref.h;
  const src = o.hurt > 0.35 ? Atlas.tinted(sh, 'rgba(255,60,40,.55)') : null;
  // A drawn stride already lifts the body; the engine's bob on top of it reads
  // as a limp, so a sheet with real frames gets almost none of it.
  Atlas.drawSprite(ctx, sh, idx, sx, sy - (dying ? 0 : bob * 0.35), scale, o.fx < 0, src);
  return true;
}

// Which sheet dresses which bones. One entry a slot, two cells a design: the
// sheets are 2 x 5, a column per bone and a row per band.
//
// **`legs` binds one cell, not two, and that is not an oversight.** The sheet's
// second column is a greave — a shin piece, all but identical to column 0 of
// `art/boots-01.png` — and it was bound to both thighs, so the hero wore the
// same lion (tier 3) or skull (tier 5) shinguard twice down one leg, once at
// the thigh and once at the shin. Nothing in the frame gave the rig away
// faster. A bone wearing the wrong armour is worse than a bone wearing none.
//
// **The thigh is a second sheet on the same slot, not a second column.**
// `art/thigh-02.png` is the cuisse `legs-01.png` never contained, and it is
// 1 x 5 of its own. It shares the `legs` band because it is the same five
// designs in the same order — a hero cannot wear a steel faulds over a gold
// cuisse — so one entry reads the band and both sheets follow it. Two prior
// generations came back as greaves; a piece described by a bulge at the bottom
// of a leg is a boot in this style, and the one that worked described a taper
// with a flat cut instead.
const RIG_STICK = new URLSearchParams(location.search).has('rigstick');

const RIG_ART = {
  head:  { src: 'art/hair-helmets.png', cols: 1, bones: [['head']] },
  chest: { src: 'art/torso-arm.png',  bones: [['spine'], ['upperArmBack', 'upperArmFront']] },
  legs:  { src: 'art/legs-01.png',   bones: [['pelvis'], []] },
  thigh: { src: 'art/thigh-02.png', cols: 1, band: 'legs',
           bones: [['thighBack', 'thighFront']] },
  // No bone owns the cloth: it is a garment hanging off the pelvis, drawn by
  // `drawSurcoat` rather than by the bone loop, so its "bone" is a name the
  // loop never matches and only the surcoat reads.
  cloth: { src: 'art/cloth-garmets.png', cols: 1, band: 'legs', bones: [['cloth']] },
  // One row, five columns — the bands run across this sheet, not down it, which
  // is why it carries `rows`. One blade per band, hung on one bone.
  weapon: { src: 'art/weapon-03.png', cols: 5, rows: 1, bones: [['weapon']] },
  hands: { src: 'art/gloves-01.png', bones: [['forearmBack', 'forearmFront'], ['handBack', 'handFront']] },
  feet:  { src: 'art/more-feet.png',  bones: [['shinBack', 'shinFront'], ['footBack', 'footFront']] },
};

/**
 * The hero as a skeleton with equipment hung on it.
 *
 * The stride runs on **distance walked, not time**, which is the whole reason
 * the rig can do what the drawn sheet could not: a stride is a fixed length of
 * ground, so a slowed hero takes slower steps instead of skating and a hasted
 * one does not moonwalk. `Rig.STRIDE` is how far one cycle carries the figure
 * in figure-heights, so the phase is simply how many strides have been walked.
 */
function drawRiggedHero(ctx, o, sx, sy) {
  const h = (o.sprite ? o.sprite.h : 56) * (o.scale || 1);
  const walked = (o.dist || 0) * TILE_W / h;      // tiles -> figure heights
  const moving = o.walk > 0;
  const angles = moving ? Rig.ANIMS.walk(walked / Rig.STRIDE) : Rig.ANIMS.idle(o.dist || 0);

  const art = {};
  for (const [slot, cfg] of Object.entries(RIG_ART)) {
    // `band` names which slot's level this sheet follows. It is only ever
    // different from the sheet's own key when two sheets dress one slot, as the
    // faulds and the cuisse do.
    const band = o.rig[cfg.band || slot];
    if (band === undefined || band < 0) continue;
    const cols = cfg.cols || 2;
    const rows = cfg.rows || 5;
    const sh = Atlas.sheet(cfg.src, cols, rows, { auto: true });
    if (!sh) continue;
    cfg.bones.forEach((keys, col) => {
      // A one-row sheet is five bands laid left to right, so the band *is* the
      // cell; a five-row sheet is a band per row and a bone per column.
      const c = sh.cells[rows === 1 ? band : band * cols + col];
      if (!c) return;
      for (const k of keys) art[k] = { canvas: sh.canvas, x: c.x, y: c.y, w: c.w, h: c.h };
    });
  }

  Rig.drawParts(ctx, sx, sy, h, o.fx < 0, angles, art);
  // The skeleton shows through wherever a slot has no art yet, which is most of
  // it — better a visible gap than a body that quietly is not there.
  // **The skeleton is a diagnostic and must never ship over the art.** It was
  // drawn unconditionally while most slots were bare, on the argument that a
  // visible gap beats a body that quietly is not there. Every slot is dressed
  // now, so the only thing it adds is a lattice of blue joints on top of a
  // finished figure. `?rigstick` puts it back when a pose needs debugging.
  if (RIG_STICK) Rig.drawStick(ctx, sx, sy, h, o.fx < 0, angles);
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

  // Whatever the biome burns along the verge does the rest of the work: wall
  // sconces in the crypt, iron braziers in the inferno. A painted biome
  // scatters those across the whole verge rather than hanging them on a wall,
  // so the scan runs out to the treeline; off-screen lights are culled below
  // and cost nothing.
  const lit = b.lights || ['sconce'];
  const far = b.art ? VERGE : Math.ceil(HALF) + 1;
  const cx = Math.round(S.cam.x);
  for (let x = cx - 14; x <= cx + 14; x++) {
    for (const side of [-1, 1]) {
      for (let dy = Math.ceil(HALF); dy <= far; dy++) {
        const y = side * dy;
        if (!lit.includes(propAt(x, y, b))) continue;
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
