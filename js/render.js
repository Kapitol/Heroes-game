// Isometric renderer for the road.
//
// The camera rides just behind the hero and everything is drawn close — this
// is a battle you watch, not a map you survey. Order: sky, ground, a
// depth-merged pass over scenery and actors, then lighting for the stretches
// that run underground.

import { TILE_W, TILE_H, WALL_H, toScreen, toWorld, tilePath, hash2, clamp } from './iso.js';
import { HALF, VERGE, RISE, heightAt, featureAt, propAt, decalAt, landmarkAt } from './world.js';
import { drawActor, drawShadow, drawProp, drawTelegraph, drawChest } from './sprites.js';
import * as Atlas from './atlas.js';
import * as Coffin from './coffin.js';
import * as Rig from './rig.js';
import * as Particles from './particles.js';

let lightCv = null, lightCtx = null;
let bloomCv = null, bloomCtx = null;

/**
 * How much the arena has dimmed for a boss, 0..1, eased.
 *
 * The lighting pass only ever ran where the *biome* was dark — the town and the
 * road are 0 — so the first boss a player meets was lit like a summer
 * afternoon. A boss is the one fight the game wants to look different, and
 * darkening the ground he stands on does more for that than anything drawn on
 * top of it.
 *
 * Eased rather than switched, and held here rather than in the run state,
 * because it is a property of how the scene is being *shown*: a save reloaded
 * mid-fight should come back lit correctly on its first frame without having
 * stored a lighting variable.
 */
let arena = 0;
const ARENA_DARK = 0.62;

// The moves in js/encounters.js author their colour as CSS hex because that is
// what the telegraph ring is stroked with; the light list wants components.
const rgbOf = (hex) => {
  const h = String(hex || '').replace('#', '');
  if (h.length !== 6) return [255, 182, 90];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

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

  // `?grid` replaces every ground layer at once — textures, decals, stains —
  // rather than switching between the painted and generated ones. Half a
  // stripped world would still be a variable.
  if (GRID) drawGridGround(ctx, S, cw, ch);
  else if (painted) { drawTexturedGround(ctx, S, cw, ch); drawDecals(ctx, S); }
  else drawGround(ctx, S, t);
  if (GRID_OVER) drawGridLines(ctx, S, cw, ch);
  if (!GRID) drawStains(ctx, S);
  drawTelegraphs(ctx, S);
  drawDepthPass(ctx, S, t, !!painted);
  drawGroundEffects(ctx, S, t);
  // Weather and bursts ride the same shelf as the baked effects: above the
  // actors, below the lighting — so ash is dimmed with the world (it is not an
  // emitter of light) and a stomp's dirt lands in front of the boots that
  // threw it.
  Particles.update(dt, S);
  Particles.draw(ctx, S);

  ctx.restore();

  // The dim leads the fight in and lags it out: a boss appearing pulls the
  // light down over about a second, and killing him gives it back more slowly
  // still, so the arena releases rather than snaps.
  const boss = S.monsters && S.monsters.some((m) => m.boss && !m.dead);
  const want = boss ? 1 : 0;
  arena += Math.max(-dt * 0.6, Math.min(dt * 1.1, want - arena));

  const dark = Math.max(b.darkness, arena * ARENA_DARK);
  // The dim is a look layer too, and it is the one most likely to be blamed
  // for a figure reading badly. It goes with the rest.
  if (dark > 0.02 && !GRID) drawLighting(ctx, S, cw, ch, ox, oy, t, dark);
  // **After the lighting, not before.** The effects themselves are drawn in the
  // scene pass and so are dimmed along with everything else — correct for a
  // painted sprite, wrong for a thing that is supposed to be emitting. The
  // glow is added back on top of the darkness, which is what makes a rune read
  // as hot in a dark arena instead of as a picture of a hot thing.
  drawBloom(ctx, S, cw, ch, ox, oy, t);
  if (!GRID) drawTint(ctx, S, cw, ch);

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

/**
 * The bare ground plane: flat fill, then the tile lattice drawn on it.
 *
 * The lines are the *world* axes, not screen ones — one set of constant x, one
 * of constant y — so what is drawn is a square grid lying on the floor, seen
 * at the projection's own angle. Drawing whole lines rather than one diamond
 * per tile is both cheaper and crisper: a stroked diamond doubles every
 * interior edge, which at low alpha reads as a lattice of uneven weight.
 *
 * Every eighth line is stronger. Without a coarse rhythm a fine grid turns to
 * moiré the moment the camera moves, and there is nothing to count tiles
 * against; with one, distance along the road is readable at a glance.
 */
function drawGridGround(ctx, S, cw, ch) {
  const z = S.cam.zoom;
  ctx.fillStyle = '#4a4744';
  ctx.fillRect(-lastOX / z, -lastOY / z, cw / z, ch / z);
  drawGridLines(ctx, S, cw, ch);
}

/** The lattice alone, so `?grid=over` can lay it over the painted ground. */
function drawGridLines(ctx, S, cw, ch) {
  const z = S.cam.zoom;
  const l = -lastOX / z, tp = -lastOY / z;

  // The visible world rectangle, from the four screen corners: the projection
  // rotates, so the corners of the screen are not the corners of world space
  // and taking the min and max of all four is the only honest bound.
  const cs = [toWorld(l, tp), toWorld(l + cw / z, tp),
    toWorld(l, tp + ch / z), toWorld(l + cw / z, tp + ch / z)];
  const x0 = Math.floor(Math.min(...cs.map((c) => c.x))) - 1;
  const x1 = Math.ceil(Math.max(...cs.map((c) => c.x))) + 1;
  const y0 = Math.floor(Math.min(...cs.map((c) => c.y))) - 1;
  const y1 = Math.ceil(Math.max(...cs.map((c) => c.y))) + 1;

  ctx.lineWidth = 1 / z;
  // Two weights, both well clear of the fill: a lattice you have to hunt for
  // is not a ruler. The fine one reads one tile, the coarse one every eight.
  for (const [step, colour] of [[1, '#6b665f'], [8, '#94897c']]) {
    ctx.strokeStyle = colour;
    ctx.beginPath();
    for (let x = x0; x <= x1; x++) {
      if (x % step) continue;
      const a = toScreen(x, y0), b = toScreen(x, y1);
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    }
    for (let y = y0; y <= y1; y++) {
      if (y % step) continue;
      const a = toScreen(x0, y), b = toScreen(x1, y);
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
  }

  // The road band the hero actually walks, marked but not filled: without it
  // there is no way to tell whether he is on his path or beside it, and a fill
  // would be a texture by another name.
  ctx.strokeStyle = '#98897a';
  ctx.lineWidth = 1.5 / z;
  ctx.beginPath();
  for (const y of [-HALF, HALF]) {
    const a = toScreen(x0, y), b = toScreen(x1, y);
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();
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
  if (grass) fillIso(ctx, grass, a.grass, a.groundScale, S, cw, ch);
  // The flat fill above is the floor of the world; this lifts the verge off it.
  // Drawn *before* the edges and the road, so both of those land on top and
  // the walkable band stays perfectly flat.
  drawVerge(ctx, S, grass, a);

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
    fillIso(ctx, road, a.road, a.roadScale, S, cw, ch);
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

/** How the hollows are filled, per `featureAt` kind. */
const POOLS = {
  water: { top: '#3d5a66', deep: '#22333d', lip: 'rgba(190,220,230,.20)' },
  lava:  { top: '#c2481b', deep: '#5a1608', lip: 'rgba(255,190,90,.35)', hot: true },
};

/**
 * The verge, lifted off the flat floor and given water or lava in its hollows.
 *
 * **Drawn as strips of constant y, back to front, not as tiles.** A tile at a
 * time would mean one clip and one pattern fill per tile — hundreds a frame,
 * and a clip is the most expensive thing in this renderer (see `bandPath`,
 * where a 480-point path outweighed everything else put together). A strip is
 * one polygon per row of the verge: forty a frame, each one thin.
 *
 * Rows share their edges exactly. The bottom edge of row y is computed from
 * the same heights as the top edge of row y + 1, so raising the ground can
 * open no seam between them, and painting near rows after far ones lets a
 * rise in front hide whatever it should.
 *
 * The texture inside a strip is lifted by the row's *average* height rather
 * than warped to its corners. Canvas cannot map a texture to a quadrilateral
 * without splitting it into affine triangles, and at this amplitude the honest
 * version costs a great deal of code to fix a discrepancy of a few pixels.
 */
function drawVerge(ctx, S, pattern, a) {
  const reach = Math.ceil(11 / S.cam.zoom) + 12;
  const x0 = Math.floor(S.cam.x - reach), x1 = Math.ceil(S.cam.x + reach);
  const lift = (x, y) => toScreen(x, y, heightAt(x, y));

  for (let y = -VERGE; y < VERGE; y++) {
    // The road and its flat margin are drawn by the road pass; skip the rows
    // that are entirely inside it rather than painting them twice.
    if (Math.abs(y) < HALF && Math.abs(y + 1) < HALF) continue;

    ctx.beginPath();
    for (let x = x0; x <= x1; x++) {
      const p = lift(x, y);
      if (x === x0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    for (let x = x1; x >= x0; x--) {
      const p = lift(x, y + 1);
      ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();

    ctx.save();
    ctx.clip();
    // One row's worth of ground, lifted bodily. `-2 / +3` overdraws into the
    // neighbours so the clip has material right to its edge.
    const h = (heightAt(S.cam.x, y) + heightAt(S.cam.x, y + 1)) / 2;
    ctx.translate(0, -h * WALL_H);
    if (pattern) fillIsoRect(ctx, pattern, a.grass, a.groundScale, x0, x1, y - 2, y + 3);
    // Height as light: the rises catch what little sky there is and the
    // hollows lose it. Without this the relief is only a silhouette at the
    // outer edge and the middle of the verge stays as flat as it ever was.
    const shade = clamp(h / RISE, 0, 1);
    ctx.fillStyle = shade > 0.5
      ? `rgba(255,238,205,${(shade - 0.5) * 0.16})`
      : `rgba(10,14,22,${(0.5 - shade) * 0.20})`;
    ctx.fillRect(-1e4, -1e4, 2e4, 2e4);
    ctx.restore();

    drawPools(ctx, S, y, x0, x1);
  }
}

/**
 * Water or lava lying in one row's hollows.
 *
 * Drawn per tile rather than per strip because a pool has to stop where the
 * ground stops being low, and that is a tile-by-tile answer. It is cheap
 * regardless: only the tiles `featureAt` says are wet get a path at all, and
 * they are a minority of a minority of the verge.
 *
 * The surface sits slightly *below* the ground it interrupts, which is the
 * whole illusion — a pool level with its bank reads as a painted shape, and
 * one sunk a few pixels reads as a hole with something in it.
 */
function drawPools(ctx, S, y, x0, x1) {
  const b = S.biome;
  for (let x = x0; x <= x1; x++) {
    const kind = featureAt(x, y, b);
    if (!kind) continue;
    const look = POOLS[kind];
    if (!look) continue;

    const h = heightAt(x + 0.5, y + 0.5);
    const p = toScreen(x + 0.5, y + 0.5, h - 0.06);
    tilePath(ctx, p.x, p.y);
    const g = ctx.createLinearGradient(p.x, p.y - TILE_H / 2, p.x, p.y + TILE_H / 2);
    g.addColorStop(0, look.deep);
    g.addColorStop(1, look.top);
    ctx.fillStyle = g;
    ctx.fill();
    // A rim where the surface meets its bank. One stroke, and it is what stops
    // a pool from reading as a stain on the ground.
    ctx.strokeStyle = look.lip;
    ctx.lineWidth = 1.2;
    ctx.stroke();
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
 * The same fill, laid on the floor instead of on the screen.
 *
 * **`fillScaled` repeats a texture on a square *screen* lattice, and the world
 * is on a diamond one.** Every other thing in the scene — where a prop stands,
 * how far a stride travels, which tile a slash reaches — is measured on the
 * isometric grid, and the ground under all of it was the one layer running at
 * its own angle. Nothing lined up with anything, and it is invisible until you
 * put the lattice on screen and look (`?grid`, and `?grid=over` for exactly
 * this comparison).
 *
 * The fix is one transform. The basis takes world x to (TILE_W/2, TILE_H/2)
 * and world y to (−TILE_W/2, TILE_H/2), so after it the canvas is drawing in
 * *tile* units and a square of texture lands as a diamond on the floor. The
 * texture's own repeat then runs along the same two axes the tiles do, which
 * is what "matching the grid" means: a seam in the material is a tile edge.
 *
 * `tiles` is how many tiles one repeat of the texture covers. It is derived
 * from the biome's existing `groundScale` rather than added to the config, so
 * the on-screen density is the one that was already art-directed — this
 * changes the *angle* the material lies at, not how coarse it is.
 */
function fillIso(ctx, pattern, src, scale, S, cw, ch) {
  const tex = Atlas.texture(src);
  if (!tex) return;
  const tiles = (tex.img.naturalWidth * scale) / TILE_W;

  const z = S.cam.zoom;
  const l = -lastOX / z, tp = -lastOY / z;
  const cs = [toWorld(l, tp), toWorld(l + cw / z, tp),
    toWorld(l, tp + ch / z), toWorld(l + cw / z, tp + ch / z)];
  const x0 = Math.min(...cs.map((c) => c.x)) - 1, x1 = Math.max(...cs.map((c) => c.x)) + 1;
  const y0 = Math.min(...cs.map((c) => c.y)) - 1, y1 = Math.max(...cs.map((c) => c.y)) + 1;

  fillIsoRect(ctx, pattern, src, scale, x0, x1, y0, y1);
}

/** The same fill, over a stated rectangle of *tiles* rather than the screen. */
function fillIsoRect(ctx, pattern, src, scale, x0, x1, y0, y1) {
  const tex = Atlas.texture(src);
  if (!tex) return;
  const tiles = (tex.img.naturalWidth * scale) / TILE_W;
  ctx.save();
  ctx.transform(TILE_W / 2, TILE_H / 2, -TILE_W / 2, TILE_H / 2, 0, 0);
  // One texture pixel is `tiles / naturalWidth` of a tile; scaling by that puts
  // the fill into texture space, where the pattern repeats at its own size.
  const s = tiles / tex.img.naturalWidth;
  ctx.scale(s, s);
  ctx.fillStyle = pattern;
  ctx.fillRect(x0 / s, y0 / s, (x1 - x0) / s, (y1 - y0) / s);
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
  //
  // Scenery is skipped wholesale under `?grid`: a tree is painted art like any
  // other, and half a stripped world tells you nothing. The actors stay, since
  // they are the thing being looked at.
  for (let y = -VERGE; !GRID && y <= VERGE; y++) {
    for (let x = cx - span; x <= cx + span; x++) {
      const lm = landmarkAt(x, y, b);
      if (!lm) continue;
      const lsh = Atlas.sheet(lm.sheet.src, lm.sheet.cols, lm.sheet.rows);
      if (!lsh || !lsh.cells[lm.cell]) continue;
      items.push({ propCell: lm.cell, propSheet: lsh, scale: lm.sheet.scale, x: x + 0.5, y: y + 0.5 });
    }
  }
  for (let y = -VERGE; !GRID && y <= VERGE; y++) {
    for (let x = cx - span; x <= cx + span; x++) {
      const kind = propAt(x, y, b);
      if (!kind) continue;
      const seed = (x * 31 + y * 17) & 1023;
      // **A kind may bring its own sheet.** The painted prop sheets hold
      // twelve objects of every sort at one scale; the rendered trees are
      // twenty of one sort at another, and forcing them into a shared grid
      // would mean re-cutting the painted sheets to match a bake. `sheets`
      // overrides per kind and leaves everything else exactly where it was.
      const own = b.art && b.art.sheets && b.art.sheets[kind];
      const kindSheet = own ? Atlas.sheet(own.src, own.cols, own.rows, own.slice) : sheet;
      const opts = own ? own.cells : (b.art && b.art.cells[kind]);
      if (kindSheet && opts) {
        // Pick which of the sheet's variants stands here, deterministically,
        // and jitter it off the tile centre so the verge isn't a grid.
        // **A different seed from the one that chose the kind.** This read
        // `hash2(x * 3 + 11, y * 7 + 5)`, which is the exact roll `pick` in
        // js/world.js uses to decide *which* prop stands here — so the two
        // were perfectly correlated, and a kind that wins the roll in the top
        // fifth of the range always drew its last variant. Three hay bales
        // were on the sheet and the field only ever grew one of them. The
        // sheets were never the problem; the seed was.
        const hv = hash2(x * 7 + 3, y * 11 + 29);
        items.push({
          // Deliberately not called `sprite`: actors carry a sprite *spec*
          // under that name, and the draw branch below would collide.
          propCell: opts[Math.floor(hv * opts.length) % opts.length], propSheet: kindSheet,
          scale: (own ? own.scale : b.art.propScale) * (0.86 + hash2(x + 5, y - 3) * 0.3),
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
    // Scenery stands on the ground the verge pass drew; actors do not need
    // this because the road they walk is flat by construction.
    const p = toScreen(it.x, it.y, it.propSheet || it.prop ? heightAt(it.x, it.y) : 0);
    if (it.propSheet) {
      const fade = occlusion(it, S);
      if (fade < 1) { ctx.save(); ctx.globalAlpha = fade; }
      Atlas.drawSprite(ctx, it.propSheet, it.propCell, p.x, p.y, it.scale);
      if (fade < 1) ctx.restore();
      continue;
    }
    if (it.prop) { drawProp(ctx, it.prop, p.x, p.y, t, it.seed, b); continue; }
    if (it.proj) { drawProjectile(ctx, p.x, p.y, it); continue; }
    drawFighter(ctx, it, p, t);
  }
}

/**
 * How solid a piece of scenery is allowed to be, given who is standing behind it.
 *
 * **Only things in front of the hero can hide him**, and in this projection
 * "in front" is `x + y` — the same sum the depth pass sorts on. Anything with
 * a smaller sum is drawn before he is and cannot cover him however tall it is,
 * so it never fades and the verge behind him stays whole.
 *
 * The ramp is **distance, not time**. A timed fade needs somewhere to keep a
 * per-prop clock, and scenery here has no state at all — it is recomputed from
 * the tile coordinate every frame, which is what lets the road run forever.
 * Distance gives the same effect for free: the camera scrolls, the gap closes,
 * and the tree thins out as it arrives rather than blinking when it crosses a
 * line.
 *
 * A tree that has gone transparent is still *there* — it still sorts, still
 * occludes nothing, and comes back the moment the hero walks clear.
 */
const NEAR = 2.6;          // tiles of separation before a prop is fully solid
const HIDDEN = 0.28;       // how faint it gets directly over him

function occlusion(prop, S) {
  const h = S.hero;
  if (!h || (prop.x + prop.y) <= (h.x + h.y)) return 1;
  // Screen distance, not world: a prop one tile to the side covers nothing,
  // while one a tile *along* the camera axis sits squarely on top of him — and
  // those two are the same world distance.
  const a = toScreen(prop.x, prop.y), b = toScreen(h.x, h.y);
  const dx = Math.abs(a.x - b.x) / (TILE_W * NEAR);
  const dy = Math.abs(a.y - b.y) / (TILE_H * NEAR * 1.6);
  const d = Math.min(1, Math.hypot(dx, dy));
  return HIDDEN + (1 - HIDDEN) * (d * d * (3 - 2 * d));
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
  // A foe with a doll has no painted sprite of its own to fall back to — the
  // Butcher is vector-drawn — so the sprite test has to come after the merge
  // rather than before it.
  if (!o.sprite && !(DOLL_HERO && DOLL_FOES[o.kind])) return false;
  // `?doll` dresses the rigged hero in the baked Mixamo sheets instead. It is a
  // flag rather than a config because it is a question being asked, not a
  // decision taken: the doll reads better as a figure and cannot wear the
  // armoury, and those are not comparable on a spreadsheet. See
  // `tools/bake-doll.mjs` for where the sheets come from.
  //
  // It merges over the hero's own sprite rather than replacing it, so
  // everything downstream — the swing alternation, the hurt tint, the death
  // fade, the walk's bob damping — is the same code the painted classes run.
  const sp = !DOLL_HERO ? o.sprite
    : o.rig ? { ...o.sprite, ...DOLL_ART }
      : DOLL_FOES[o.kind] ? { ...o.sprite, ...DOLL_FOES[o.kind] }
        : o.sprite;
  const attacking = o.swing > 0.15 && o.swing < 0.85;
  const bob = o.walk ? Math.abs(Math.sin(o.walk)) * 1.1 : Math.sin(t * 2 + sx * 0.05) * 0.8;

  // The jointed hero, when a run asks for it. Nothing else is rigged yet, so
  // this is opt-in until the rest of the part art exists — a stick figure in
  // gauntlets is a thing to develop against, not a thing to ship.
  if (o.rig && !DOLL_HERO) return drawRiggedHero(ctx, o, sx, sy);

  // A skill outranks everything. It is the one thing on screen the player
  // actually pressed, and a hero who keeps swinging through his own heal is a
  // hero whose buttons do not appear to do anything.
  if (drawActionPose(ctx, o, sp, sx, sy)) return true;

  // **The flinch.** Taking a hit was a red tint and nothing else — a body that
  // does not move when struck reads as a cardboard stand-up. The react cell is
  // shown for as long as the tint is, so flash and recoil are one event, and
  // `hurt`'s own decay is the throttle: five foes landing on the same frame
  // re-arm the timer, not the pose. A swing is never interrupted — trading
  // blows must not look like losing them — and the dead do not flinch.
  if (o.hurt > 0.35 && !o.dead && sp.react != null && !attacking) {
    const sh = Atlas.sheet(sp.sheet, sp.cols, sp.rows, sp);
    const cell = sh && sh.cells[sp.row * sp.cols + sp.react];
    if (cell) {
      const ref = sh.cells[sp.row * sp.cols] || cell;
      const scale = (sp.h * (o.scale || 1)) / ref.h;
      Atlas.drawSprite(ctx, sh, sp.row * sp.cols + sp.react, sx, sy, scale, o.fx < 0,
                       Atlas.tinted(sh, 'rgba(255,60,40,.55)'));
      return true;
    }
  }
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
  // The hero carries `deathAnim`, which runs 0..1; monsters only have `fade`,
  // which the hero's death deliberately stops at 0.45 so the body stays
  // visible for the revival. Read the honest clock for whichever this is.
  const k = o.deathAnim != null ? o.deathAnim : 1 - Math.max(0, o.fade);
  const i = dying
    ? Math.min(frames.length - 1, Math.floor(k * frames.length))
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

/**
 * The baked Mixamo doll, as a set of sheets in the shape the painted classes
 * already use. See `drawPaintedFighter` for how it is switched in.
 *
 * `rows: 1` and no `tiered` flag on the walk: there is one X Bot, not five
 * armour bands of him, so nothing here reads `sp.row`. That is the whole cost
 * of the doll stated in one line of config — the armoury has nowhere to go.
 *
 * The two attack cells are the outward and inward slashes at the moment the
 * blade is out, and `attacks` alternates them per swing, so a long fight is a
 * hero working rather than one frame on a loop. **His hands are empty in all
 * of them.** Mixamo's sword clips animate a character around a weapon prop the
 * character download does not include, so X Bot mimes it.
 */
/**
 * The dolls are what the game draws now; the older paths are the flags.
 *
 *   (nothing)   the baked Mixamo cast — Paladin hero, Warrok Butcher
 *   ?rig        the jointed paperdoll, armoury and all
 *   ?painted    the painted class sheets the game shipped with
 *
 * It was the other way round while the doll was a question. It stopped being
 * one, and a default nobody can see is a default nobody gets: the old look
 * kept coming back simply because a URL had been retyped without its flag.
 */
const Q = new URLSearchParams(location.search);
const DOLL_HERO = !Q.has('painted') && !Q.has('rig');

/**
 * `?grid` — the world with its clothes off.
 *
 * **Phase 4 is a direction refresh, and a refresh cannot be judged against the
 * thing being refreshed.** The road is seven painted textures, a prop sheet,
 * decals, stains and a lighting pass, and a figure standing in all of that is
 * being judged against a moving target: too dark against the dirt might be the
 * figure, or the dirt, or the dim. This mode removes every one of those
 * variables and leaves the two that matter — the ground *plane* and the actors
 * on it.
 *
 * What is left is a flat mid-grey and the tile lattice: a square grid in world
 * space, which the projection turns into the diamond you actually see. It is a
 * ruler as much as a backdrop. Scale, footing, the angle a stride travels
 * along, and whether a hero's feet land where his shadow says they do are all
 * readable against it and none of them are readable against grass.
 *
 * Mid-grey and not black or white on purpose: a value sits *between* the two,
 * so a silhouette that is too dark and one that is too pale both show up as
 * errors rather than one hiding.
 */
const GRID = Q.has('grid') && Q.get('grid') !== 'over';
// `?grid=over` keeps the painted world and draws the lattice on top of it —
// the check that the ground and the grid actually agree, rather than a
// stripped scene where there is nothing to disagree with.
const GRID_OVER = Q.get('grid') === 'over';

/**
 * The baked Mixamo hero, as sheets in the shape the painted classes use.
 *
 * **Five rows, and no `row` of its own — that is the armoury coming back.**
 * The Paladin who stood here before was `rows: 1, row: 0`, and the `row: 0`
 * was the whole problem: this object is spread *over* the hero's sprite, so a
 * hardcoded zero silently overrode the `row: wornTier(S.equipped) - 1` that
 * js/game.js has always computed, and every rung of armour drew the same
 * picture. Deleting one field is most of what made progression visible again.
 *
 * The five rows are five *outfits*, not five paint jobs: `tools/outfit.py`
 * binds a modular kit's peasant, ranger, noble, mail and full-plate sets onto
 * the Mixamo skeleton, so the tier changes the silhouette and not just the
 * colour — which is the only thing that reads at 56 pixels tall on the road.
 *
 * The knight carries no weapon of his own, so the baker builds him one
 * (`--sword`); his guard is X Bot's Idle, the two swings are the stable sword
 * slashes alternated per swing by `attacks`, and the flinch is Warrok's
 * Getting-Hit.
 */
/**
 * Where the hero's own art lives, for anything outside the depth pass that
 * needs to draw him — the camp, chiefly. Exported so the fire and the road
 * cannot drift apart: one constant, two screens.
 */
export const DOLL_SHEET = { src: 'art/knight-combat.png', cols: 4, rows: 5 };

/**
 * The same hero, baked for a portrait rather than for a sprite.
 *
 * **A road cell and a camp figure are not the same picture at two sizes.** The
 * road bakes at `fh=230` and is drawn 56 pixels tall; the camp draws the hero
 * four hundred pixels tall, so sharing the sheet meant upscaling by a factor of
 * two and showing art whose lighting and posterisation were chosen for a
 * thumbnail. This is one idle pose per tier at `fh=620`, lit by a warmer key
 * because the only light at the camp is the fire, and left unposterised — the
 * step that reads as paint at road size reads as banding at this one.
 */
export const DOLL_CAMP = {
  // **12fps, and that number is the whole point.** Mixamo exports at 30fps and
  // the first attempt sampled six frames out of a two-second clip — 3fps, which
  // is a slideshow however carefully the playback rate is matched. Twelve reads
  // as motion. It costs frames: `Great Sword Idle` is 2.0s so it needs 24, and
  // `Great-Sword-Idle-02` is 3.77s so it needs 45.
  //
  // **Two sheets, because 69 columns will not fit in one.** At 250px a cell
  // that is 17,000px of width, past what a browser will hold as a texture. So
  // the plain idle is one sheet, the variation another, and the cycle below
  // walks from one to the other: two loops of the first, then one of the second.
  a: { src: 'art/knight-camp.png', cols: 24 },
  b: { src: 'art/knight-camp2.png', cols: 45 },
  rows: 5, fps: 12, breakAt: 3,
  // **The height the doll was baked at**, and the only honest ruler for it.
  // Cells are trimmed to their content by `sliceGrid`, so cell height tracks
  // the *pose* — a raised sword makes a taller cell — and scaling by it shrank
  // the hero every time he lifted his weapon. Both sheets are baked at the
  // same `--fh`, so this one number sizes every frame of both identically.
  fh: 210,
};


const DOLL_ART = {
  sheet: DOLL_SHEET.src, cols: DOLL_SHEET.cols, rows: DOLL_SHEET.rows, attacks: [1, 2], react: 3,
  // The warrior's skill poses are painted warrior art and survive a merge
  // unless cleared: a heal that flashes the old hero for a beat is worse than
  // a heal the knight does not act out.
  actions: null,
  anim: {
    // `tiered` is what says the rows are armour rather than more frames, so
    // the hero cannot change outfit by starting to walk.
    sheet: 'art/knight-walk.png', cols: 16, rows: 5, tiered: true,
    walk: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    death: [10, 11, 12, 13, 14, 15],
  },
};

/**
 * Foes that have a doll, by `kind`.
 *
 * The Butcher is drawn by `js/sprites.js` from a vector `build`, so unlike the
 * hero he has no sprite at all to merge over — the config has to carry `h`
 * itself or he is scaled off nothing.
 *
 * He walks, swings and falls over. The two swings are frames of the punch
 * chosen for reading clearly rather than for being the moment of impact: the
 * middle of that clip tears his loincloth geometry away from his legs, and no
 * amount of picking fixes the frames where it does.
 */
const DOLL_FOES = {
  // The Fallen is the foe the player sees most and the only one still drawn
  // from vector shapes, so a doll moves it further than anything else here.
  // `h` is nudged above the 30 the vector used: a figure with real shading
  // reads smaller than a flat silhouette of the same height.
  fallen: {
    sheet: 'art/m2-combat.png', cols: 4, rows: 1, row: 0, attacks: [1, 2], react: 3, h: 34,
    anim: {
      sheet: 'art/m2-walk.png', cols: 16, rows: 1,
      walk: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      death: [10, 11, 12, 13, 14, 15],
    },
  },
  // **Two of the sword combo's eight frames are unusable, not two of mine.**
  // The clip turns the character to face the camera partway through and a
  // fixed side view has nothing left to draw — he thins to a sliver. The two
  // swings are the frames that stay side-on.
  skeleton: {
    sheet: 'art/m1-combat.png', cols: 4, rows: 1, row: 0, attacks: [1, 2], react: 3, h: 50,
    anim: {
      sheet: 'art/m1-walk.png', cols: 16, rows: 1,
      walk: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      death: [10, 11, 12, 13, 14, 15],
    },
  },
  brute: {
    sheet: 'art/warrok-combat.png', cols: 3, rows: 1, row: 0, attacks: [1, 2], h: 62,
    // One sheet, three states: ten frames of stride and six of collapse. They
    // share a sheet because `drawAnimFrame` takes one — `walk` and `death` are
    // index lists into it, not separate images.
    anim: {
      sheet: 'art/warrok-walk.png', cols: 16, rows: 1,
      walk: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      death: [10, 11, 12, 13, 14, 15],
    },
  },
};

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

/**
 * The baked video effects, by name. See tools/vfx-sheet.swift for the bake.
 *
 * `h` is the effect's height in world pixels — the hero is 56 — and `over`
 * decides whether it plays on the floor or over the figure, which is the whole
 * difference between a rune circle and a burst.
 */
const VFX = {
  bolt:   { src: 'art/vfx-bolt.png',   cols: 4, rows: 4, h: 96, over: true },
  // `ground` lays the effect in the floor plane instead of standing it up
  // facing the camera. A ring is the case that makes the difference obvious:
  // upright it is a hoop the hero stands behind, flat it is a circle drawn
  // round his feet, and only the second is what a rune circle is.
  portal: { src: 'art/vfx-portal.png', cols: 4, rows: 4, h: 76, ground: true, spin: 0.6 },
  // **`add` says this clip is a black matte, not a cut-out.** FootageCrate ship
  // both kinds and the file does not say which it is: the "Noglow" spell is
  // opaque across its whole frame with the effect painted on black, so
  // composited normally it is a black square with a wisp in it. Added, the
  // black contributes nothing and only the wisp lands. The tell at bake time is
  // that cropping to the alpha bounds finds no bounds — it reported the full
  // 720x720 — so the two are distinguishable, just not automatically here.
  cast:   { src: 'art/vfx-cast.png',   cols: 4, rows: 4, h: 88, over: true, add: true },

  // **The halo is not `ground`, and that is the point.** It was shot in
  // perspective — the footage is already an ellipse — so squashing it into the
  // floor plane would apply that foreshortening twice and leave a gold line.
  // Everything drawn as a head-on circle gets `ground`; anything already
  // carrying its own perspective is drawn as it was shot.
  halo:   { src: 'art/vfx-halo.png',   cols: 4, rows: 4, h: 72 },
  // A head-on ring on black: squashed into the floor, spun, and added.
  ring:   { src: 'art/vfx-ring.png',   cols: 4, rows: 4, h: 108, ground: true, spin: 0.4, add: true },
  // `lift` raises an effect off the ground in world pixels — the hero is 56
  // tall, so 34 puts this across his chest. Without it the burst sat in the
  // dirt at his boots and read as a scuff rather than as something happening
  // to him. Big, too: a level-up is rare and is allowed to take the screen.
  sparkle:{ src: 'art/vfx-sparkle.png', cols: 4, rows: 3, h: 210, over: true, add: true, lift: 34 },
};

/**
 * One frame of a baked effect, centred on a world point.
 *
 * Not `Atlas.drawSprite`, which anchors a sprite by the middle of its footprint
 * so a walking figure's feet stay put. An explosion has no feet: anchored that
 * way a burst that grows upward appears to sink into the ground as it plays.
 *
 * **Composited normally, not with `lighter` like the shapes around it.** The
 * code-drawn glows are gradients on black and need adding to the scene to read
 * at all. These carry a real alpha channel from ProRes 4444, so they are
 * already lit and already shaped: added on top of themselves they saturate to
 * a flat white-hot blob within two frames and lose every bit of the detail
 * they were baked for.
 */
function drawVfx(ctx, e, p, k) {
  const cfg = VFX[e.vfx];
  if (!cfg) return false;
  const sh = Atlas.sheet(cfg.src, cfg.cols, cfg.rows);
  if (!sh) return false;
  const n = cfg.cols * cfg.rows;
  const cell = sh.cells[Math.min(n - 1, Math.floor(k * n))];
  if (!cell) return false;

  // Scaled off the *sheet cell size* rather than the trimmed cell, so a frame
  // whose content happens to be small does not shrink the whole effect.
  const scale = (cfg.h * (e.scale || 1)) / (sh.canvas.height / cfg.rows);
  const w = cell.w * scale, h = cell.h * scale;
  ctx.globalAlpha = Math.min(1, (1 - k) * 3) * (e.a || 1);
  // A tint replaces the effect's colour wholesale, which throws away the
  // shading inside it — fine for turning a red portal green, ruinous on
  // anything whose interest is in its own gradient. Off unless asked for.
  const src = e.tint ? Atlas.tinted(sh, e.tint) : sh.canvas;

  if (cfg.ground) {
    // **Drawn square, then squashed.** The iso floor is half as tall as it is
    // wide, so a circle on it is an ellipse of exactly that ratio — the same
    // `TILE_H / TILE_W` the shockwaves use. Taking the cell's own aspect here
    // instead would inherit however the footage happened to be framed and the
    // ring would sit at a different angle from every other ground effect.
    //
    // The spin is what stops it reading as a decal. It turns *inside* the
    // squash, so the ellipse stays put and the ring turns within it — spinning
    // outside it would wobble the ellipse itself, which looks like the camera
    // moving rather than the magic.
    const d = w;
    ctx.translate(p.x, p.y);
    ctx.scale(1, TILE_H / TILE_W);
    ctx.rotate(k * Math.PI * 2 * (cfg.spin || 0));
    ctx.drawImage(src, cell.x, cell.y, cell.w, cell.h, -d / 2, -d / 2, d, d);
    return true;
  }

  ctx.drawImage(src, cell.x, cell.y, cell.w, cell.h,
                p.x - w / 2, p.y - (cfg.lift || 0) - (cfg.over ? h * 0.75 : h * 0.5), w, h);
  return true;
}

function drawGroundEffects(ctx, S, t, vfxOnly) {
  for (const e of S.effects) {
    if (vfxOnly && !e.vfx) continue;
    const p = toScreen(e.x, e.y);
    const k = 1 - e.life / e.max;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (e.vfx) {
      ctx.globalCompositeOperation = VFX[e.vfx] && VFX[e.vfx].add ? 'lighter' : 'source-over';
      drawVfx(ctx, e, p, k);
      ctx.restore();
      continue;
    }
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

/**
 * A blurred copy of the baked effects, added back over the scene.
 *
 * Bloom is the one thing a WebGL renderer would genuinely do better, and it is
 * also the one thing that is cheap to approximate here: draw the effects a
 * second time into an offscreen, blur it, and add it. `ctx.filter` does the
 * blur on the GPU, so the cost is one extra pass over a handful of sprites and
 * only while an effect is alive.
 *
 * Only the baked sheets bloom. The code-drawn shockwaves are already radial
 * gradients — blurring a gradient produces the same gradient, slightly worse.
 */
function drawBloom(ctx, S, cw, ch, ox, oy, t) {
  if (!S.effects.some((e) => e.vfx)) return;
  if (!bloomCv) {
    bloomCv = document.createElement('canvas');
    bloomCtx = bloomCv.getContext('2d');
  }
  if (bloomCv.width !== cw || bloomCv.height !== ch) { bloomCv.width = cw; bloomCv.height = ch; }

  const B = bloomCtx;
  B.setTransform(1, 0, 0, 1, 0, 0);
  B.clearRect(0, 0, cw, ch);
  B.save();
  B.translate(ox, oy);
  B.scale(S.cam.zoom, S.cam.zoom);
  drawGroundEffects(B, S, t, true);
  B.restore();

  ctx.save();
  ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
  ctx.globalCompositeOperation = 'lighter';
  // Two passes at different radii: a tight one for the core and a wide one for
  // the halo. One radius gives either a sharp effect with a faint edge or a
  // soft blob with no centre, and the difference between those and a glow is
  // that a glow has both.
  for (const [blur, alpha] of [[5, 0.55], [16, 0.4]]) {
    ctx.filter = `blur(${blur}px)`;
    ctx.globalAlpha = alpha;
    ctx.drawImage(bloomCv, 0, 0, cw, ch);
  }
  ctx.filter = 'none';
  ctx.restore();
}

function drawLighting(ctx, S, cw, ch, ox, oy, t, dark) {
  if (!lightCv) {
    lightCv = document.createElement('canvas');
    lightCtx = lightCv.getContext('2d');
  }
  if (lightCv.width !== cw || lightCv.height !== ch) { lightCv.width = cw; lightCv.height = ch; }
  const L = lightCtx, z = S.cam.zoom, b = S.biome;

  const lights = [];
  const flick = 0.9 + Math.sin(t * 9) * 0.05 + Math.sin(t * 23) * 0.03;
  const hp = toScreen(S.hero.x, S.hero.y);
  // **The hero's light shrinks as the arena dims.** At full radius his pool and
  // the boss's overlap the moment they close, and two big lights side by side
  // flood the middle of the screen — the dim is still there and cannot be seen.
  // Pulled in, the two stay separate pools and the dark between them is what
  // reads as an arena.
  lights.push({ x: hp.x, y: hp.y - 16, r: 330 * flick * (1 - arena * 0.42), warm: 0.55 });

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
  /**
   * A boss lights the ground he is standing on.
   *
   * Pulsed off his own attack timer rather than off the clock, so the light
   * breathes in step with the thing the player is actually reading — it swells
   * as he winds up and drops as he lands, which is a tell in its own right.
   * Enraged he burns brighter and redder, on top of the banner that says so.
   */
  for (const m of S.monsters) {
    if (!m.boss || m.dead) continue;
    const p = toScreen(m.x, m.y);
    const wind = m.atk > 0 ? 1 - Math.min(1, (m.atkTimer || 0) / m.atk) : 0.5;
    const pulse = 0.82 + wind * 0.3 + Math.sin(t * 3.1) * 0.05;
    lights.push({
      x: p.x, y: p.y - 22 * (m.scale || 1),
      r: 240 * (m.scale || 1) * pulse * (m.enraged ? 1.18 : 1),
      warm: m.enraged ? 1.5 : 1.1,
      rgb: m.enraged ? [255, 90, 50] : (m.light || [255, 150, 80]),
    });
  }

  /**
   * A telegraphed move lights the ground it is about to land on.
   *
   * The ring was a line drawn on the floor — information, read or not read.
   * Lighting the same circle turns it into something the scene does, so the
   * ground under the hero brightens before the blow rather than only being
   * outlined, and the warning is felt at the edge of vision instead of having
   * to be looked at.
   *
   * It ramps on the *fill* the ring already uses, so light and outline finish
   * together and the brightest instant is the one the strike lands on.
   */
  for (const m of S.monsters) {
    if (m.dead || !m.casting || !m.telegraph) continue;
    const p = toScreen(m.telegraph.x, m.telegraph.y);
    const fill = Math.min(1, m.castT / m.casting.tell);
    lights.push({
      x: p.x, y: p.y,
      r: m.casting.radius * TILE_W * 0.5 * (0.75 + fill * 0.45),
      warm: 0.5 + fill * 1.6,
      rgb: rgbOf(m.casting.colour),
    });
  }

  for (const e of S.effects) {
    if (e.type !== 'boom' && e.type !== 'cleave') continue;
    const p = toScreen(e.x, e.y);
    lights.push({ x: p.x, y: p.y - 10, r: 190 * (1 - e.life / e.max), warm: e.type === 'boom' ? 1 : 0.2 });
  }

  L.setTransform(1, 0, 0, 1, 0, 0);
  L.globalCompositeOperation = 'source-over';
  L.fillStyle = `rgba(0,0,0,${dark})`;
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
    // Firelight unless the light says otherwise. A boss brings his own colour,
    // which is the whole reason this stopped being one hardcoded orange.
    const [lr, lg, lb] = li.rgb || [255, 182, 90];
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${lr},${lg},${lb},${0.12 * li.warm})`);
    g.addColorStop(1, `rgba(${lr},${Math.round(lg * 0.75)},${Math.round(lb * 0.45)},0)`);
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
    // **A boss wears his health at the top of the screen, not over his head.**
    // The plate up there carries his name, his rank and the numbers; a second
    // bar floating on him says the same thing worse, and in a fight where he
    // fills a third of the screen the two are never far enough apart to read
    // as separate. Everything smaller keeps its bar — those have no plate.
    if (m.boss) continue;
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
