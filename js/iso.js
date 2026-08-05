// Isometric projection — the 2:1 "Diablo" diamond.
//
// World space is (x, y) in tiles plus z in tile-heights. Screen space puts the
// x axis down-right and the y axis down-left, so a tile is a diamond twice as
// wide as it is tall. Depth sorting is just x + y: bigger sums are nearer the
// camera and get painted later.

export const TILE_W = 64;   // diamond width in px at zoom 1
export const TILE_H = 32;   // diamond height
export const WALL_H = 46;   // how tall a wall block stands, in px

export function toScreen(x, y, z = 0) {
  return {
    x: (x - y) * (TILE_W / 2),
    y: (x + y) * (TILE_H / 2) - z * WALL_H,
  };
}

// Screen -> world, on the z = 0 ground plane.
export function toWorld(sx, sy) {
  const a = sx / (TILE_W / 2);
  const b = sy / (TILE_H / 2);
  return { x: (b + a) / 2, y: (b - a) / 2 };
}

// Trace the diamond outline of one tile. Caller fills or strokes it.
export function tilePath(ctx, sx, sy) {
  ctx.beginPath();
  ctx.moveTo(sx, sy - TILE_H / 2);
  ctx.lineTo(sx + TILE_W / 2, sy);
  ctx.lineTo(sx, sy + TILE_H / 2);
  ctx.lineTo(sx - TILE_W / 2, sy);
  ctx.closePath();
}

export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;

// Deterministic per-tile jitter, so the same stone always looks the same.
export function hash2(x, y) {
  // The shifts must be unsigned. With `>>` the sign bit gets XORed against
  // itself, bit 31 is always cleared, and the result can never exceed 0.5 —
  // which silently kills every threshold written above that.
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
