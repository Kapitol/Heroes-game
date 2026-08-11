// One particle emitter, many weathers.
//
// Phase 1 of the plan (ontology.html): a single Canvas 2D system that is the
// ash over the inferno road, the dust hanging in the town light, the motes in
// the crypt — and the burst a stomp throws, and the motes a heal rises. One
// pool, one draw pass, and everything above it is data: a biome describes its
// weather in `world.js` the way it describes its ground, and a moment in the
// game asks for a named burst.
//
// The textures are eight cells of `art/particles.png`, white on alpha by
// design — colour comes from tinting at draw, never from the file. See
// tools/particle-atlas.mjs for where they come from and the cell order.
//
// Positions are world tiles, like every actor, so weather scrolls with the
// march instead of sliding over it. Height is separate (`z`, in screen pixels)
// because the iso floor squashes y: a particle *rising* moves in z and stays
// on its tile, a particle *drifting* moves in tiles and stays at its height.

import { toScreen, TILE_W, TILE_H } from './iso.js';
import * as Atlas from './atlas.js';

const SHEET = 'art/particles.png';
export const TEX = { smoke: 0, dirt: 1, spark: 2, star: 3, glow: 4, disc: 5, wisp: 6, scorch: 7 };

// A fixed pool, recycled oldest-first. 400 is far above what any biome asks
// for (the inferno runs ~120 alive); the cap exists so a bad rate in a weather
// entry degrades to churn rather than to an unbounded array.
const MAX = 400;
const pool = [];

/**
 * Spawn one particle. `opts`, all optional, in world tiles / seconds:
 * vx,vy drift · vz rise (screen px/s) · z start height · size (screen px) ·
 * life · tex (TEX index) · tint (css colour) · add (lighter compositing) ·
 * spin (turns/s) · grav (px/s² pulling z down) · fade ('out'|'inout')
 */
export function spawn(x, y, opts = {}) {
  const p = pool.length < MAX ? {} : pool.shift();
  p.x = x; p.y = y; p.z = opts.z || 0;
  p.vx = opts.vx || 0; p.vy = opts.vy || 0; p.vz = opts.vz || 0;
  p.grav = opts.grav || 0;
  p.size = opts.size || 8;
  p.life = p.max = opts.life || 1.5;
  p.tex = opts.tex ?? TEX.smoke;
  p.tint = opts.tint || null;
  p.add = !!opts.add;
  p.spin = opts.spin || 0;
  p.rot = Math.random();
  p.fade = opts.fade || 'out';
  pool.push(p);
  return p;
}

// --- weather -----------------------------------------------------------------

// Continuous spawning accumulates fractional debt so a rate of 3/s does not
// alias against the frame rate, and spawns across the *visible* span plus a
// margin, in world tiles, so particles are born just off screen and drift on.
let debt = 0;

function weather(dt, S) {
  const list = S.biome.weather;
  if (!list || !list.length) { debt = 0; return; }
  for (const w of list) {
    debt += (w.rate || 2) * dt;
    while (debt >= 1) {
      debt -= 1;
      const span = 16;                       // tiles across the view, plus margin
      const x = S.cam.x + (Math.random() - 0.5) * span - (w.wind || 0) * 2;
      const y = (Math.random() - 0.5) * 9;
      spawn(x, y, {
        tex: TEX[w.tex] ?? w.tex ?? TEX.smoke,
        tint: w.tint,
        add: w.add,
        // Wind is tiles/s along the road; rise is px/s of height. Both get a
        // per-particle wobble or the drift reads as a conveyor belt.
        vx: (w.wind || 0) * (0.7 + Math.random() * 0.6),
        vy: (Math.random() - 0.5) * 0.12,
        vz: (w.rise || 0) * (0.7 + Math.random() * 0.6),
        z: w.high ? 20 + Math.random() * 70 : 2 + Math.random() * 24,
        size: (w.size || 8) * (0.6 + Math.random() * 0.8),
        life: (w.life || 5) * (0.7 + Math.random() * 0.6),
        spin: (Math.random() - 0.5) * 0.15,
        fade: 'inout',
      });
    }
  }
}

// --- bursts ------------------------------------------------------------------

/**
 * The named moments. Data here, call sites in game.js — a stomp should be one
 * line where it happens.
 */
export const burst = {
  /**
   * A foot, or something much heavier, hitting the ground. Dirt thrown low
   * and outward in a ring — vy is squashed by the iso floor at draw, so a
   * uniform circle in tiles reads as the ellipse it should. `scale` widens
   * the ring and coarsens the dirt: the boss's slam is the hero's stomp
   * grown, not a different effect.
   */
  stomp(x, y, scale = 1) {
    const n = Math.round(14 * scale);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      const sp = (1.6 + Math.random() * 1.4) * scale;
      spawn(x, y, {
        tex: TEX.dirt, tint: 'rgba(122,100,72,.9)',
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        vz: 30 + Math.random() * 50 * scale, grav: 220,
        z: 2, size: 7 * scale, life: 0.5 + Math.random() * 0.3, spin: 1.2,
      });
    }
    for (let i = 0; i < Math.round(5 * scale); i++) {
      spawn(x, y, {
        tex: TEX.smoke, tint: 'rgba(140,120,92,.5)',
        vx: (Math.random() - 0.5) * 0.8, vy: (Math.random() - 0.5) * 0.8,
        vz: 14, z: 4, size: 18 * scale, life: 1.1, fade: 'inout',
      });
    }
  },

  /**
   * A heal. Green motes rising off the body — this is what the Kenney pack is
   * for, and why the fire-portal-tinted-green era ended.
   */
  heal(x, y) {
    for (let i = 0; i < 12; i++) {
      spawn(x + (Math.random() - 0.5) * 0.7, y + (Math.random() - 0.5) * 0.7, {
        tex: i % 3 ? TEX.glow : TEX.star, tint: 'rgba(120,235,150,.9)', add: true,
        vz: 26 + Math.random() * 30, z: 4 + Math.random() * 30,
        size: 5 + Math.random() * 6, life: 0.9 + Math.random() * 0.5, fade: 'inout',
      });
    }
  },

  /** Sparks off a landed blow, for whoever wants them later. */
  sparks(x, y, tint = 'rgba(255,200,110,.9)') {
    for (let i = 0; i < 6; i++) {
      spawn(x, y, {
        tex: TEX.spark, tint, add: true,
        vx: (Math.random() - 0.5) * 2.4, vy: (Math.random() - 0.5) * 1.2,
        vz: 40 + Math.random() * 60, grav: 300,
        z: 20, size: 6, life: 0.4 + Math.random() * 0.2, spin: 2,
      });
    }
  },
};

// --- simulate + draw ---------------------------------------------------------

export function update(dt, S) {
  weather(dt, S);
  for (let i = pool.length - 1; i >= 0; i--) {
    const p = pool[i];
    p.life -= dt;
    if (p.life <= 0) { pool.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vz -= p.grav * dt;
    p.z += p.vz * dt;
    p.rot += p.spin * dt;
    // The ground is the ground: dirt that has fallen back to it stays down
    // and slides a little instead of sinking through.
    if (p.z < 0) { p.z = 0; p.vz = 0; }
  }
}

/**
 * Drawn inside the scene transform, after the actors and before the lighting —
 * the same shelf the baked effects sit on. A veil of ash in front of the
 * figures is what drifting past the camera looks like; the lighting pass then
 * dims weather with the world, which is correct — ash is not an emitter.
 */
export function draw(ctx, S) {
  if (!pool.length) return;
  const sh = Atlas.sheet(SHEET, 4, 2);
  if (!sh) return;
  for (const p of pool) {
    const cell = sh.cells[p.tex];
    if (!cell) continue;
    const at = toScreen(p.x, p.y);
    const k = 1 - p.life / p.max;
    const a = p.fade === 'inout' ? Math.sin(Math.min(1, Math.max(0, k)) * Math.PI) : 1 - k;
    if (a <= 0.01) continue;
    const src = p.tint ? Atlas.tinted(sh, p.tint) : sh.canvas;
    ctx.save();
    ctx.globalAlpha = Math.min(1, a);
    ctx.globalCompositeOperation = p.add ? 'lighter' : 'source-over';
    ctx.translate(at.x, at.y - p.z);
    if (p.spin) ctx.rotate(p.rot * Math.PI * 2);
    ctx.drawImage(src, cell.x, cell.y, cell.w, cell.h,
                  -p.size / 2, -p.size / 2, p.size, p.size);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

/** How many are alive — for the debug readout, and for tests to assert on. */
export const alive = () => pool.length;
