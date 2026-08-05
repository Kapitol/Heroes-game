// Asset loading: repeating ground textures, and prop sheets keyed off their
// chroma background.
//
// Generated art arrives as flat images — a texture that tiles, and a grid of
// objects on magenta. Neither can be used as-is: the sheet needs its
// background removed and each cell trimmed to the object actually inside it,
// or every prop would be drawn as a 362px box of empty space with its feet in
// the wrong place. That happens once, here, at load.

const textures = new Map();
const sheets = new Map();

/** A repeating ground texture. Returns null until it has decoded. */
export function texture(src) {
  let t = textures.get(src);
  if (!t) {
    t = { img: new Image(), pattern: null };
    t.img.src = src;
    textures.set(src, t);
  }
  if (!t.img.complete || !t.img.naturalWidth) return null;
  return t;
}

export function patternFor(ctx, src) {
  const t = texture(src);
  if (!t) return null;
  if (!t.pattern) t.pattern = ctx.createPattern(t.img, 'repeat');
  return t.pattern;
}

// Magenta-ness. Real magenta scores high; grass, bone and bark score at or
// below zero, so nothing in the artwork itself gets eaten.
const chroma = (r, g, b) => (r + b) * 0.5 - g;

/**
 * A grid of props on a chroma background, cut into individually-trimmed
 * sprites. Each cell records its own anchor: the bottom centre of whatever is
 * actually painted, which is the point that must sit on the ground tile.
 */
export function sheet(src, cols, rows, opts) {
  let s = sheets.get(src);
  if (!s) {
    s = { img: new Image(), ready: false, cells: null, canvas: null };
    s.img.src = src;
    sheets.set(src, s);
  }
  if (s.ready) return s;
  if (!s.img.complete || !s.img.naturalWidth) return null;

  const w = s.img.naturalWidth, h = s.img.naturalHeight;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d', { willReadFrequently: true });
  c.drawImage(s.img, 0, 0);

  const id = c.getImageData(0, 0, w, h);
  const d = id.data;
  // Some sheets arrive with their row labels painted on. The art itself never
  // reaches pure white — bone is cream — so anything at the very top of every
  // channel is text, and gets dropped with the background.
  const stripText = !!(opts && opts.stripText);
  for (let i = 0; i < d.length; i += 4) {
    if (stripText) {
      // Label text is neutral grey-white; the artwork never is — bone is warm,
      // with red well above blue. Testing for neutrality catches the
      // anti-aliased edges that a pure-white test leaves behind as ghosts.
      const mn = Math.min(d[i], d[i + 1], d[i + 2]);
      const mx = Math.max(d[i], d[i + 1], d[i + 2]);
      if (mn > 185 && mx - mn < 14) { d[i + 3] = 0; continue; }
    }
    const m = chroma(d[i], d[i + 1], d[i + 2]);
    if (m > 60) { d[i + 3] = 0; continue; }
    if (m > 18) {
      // Feathered edge: fade it out and pull the magenta spill back out of
      // the colour, otherwise every sprite gets a pink halo.
      d[i + 3] = Math.round(((60 - m) / 42) * 255);
      const k = (m - 18) * 0.9;
      d[i] = Math.max(0, d[i] - k);
      d[i + 2] = Math.max(0, d[i + 2] - k);
    }
  }
  c.putImageData(id, 0, 0);

  // Trim each grid cell to its content.
  let cells = opts && opts.auto ? sliceAuto(d, w, h) : sliceGrid(d, w, h, cols, rows);
  // Some art throws debris — sparks, bone chips, a spray of grit — clear of the
  // object it belongs to. The gutter finder can only see a gap, so it calls
  // those separate cells, and every index after one shifts by one. `minCell`
  // discards anything under that fraction of the median cell's area, which no
  // real sprite on a sheet of like-sized objects ever is. Opt-in: sheets of
  // deliberately mixed sizes must not use it.
  if (opts && opts.minCell && cells.length > 2) {
    const areas = cells.filter(Boolean).map(c => c.w * c.h).sort((a, b) => a - b);
    const floor = areas[areas.length >> 1] * opts.minCell;
    cells = cells.filter(c => c && c.w * c.h >= floor);
  }

  s.canvas = cv;
  s.cells = cells;
  s.ready = true;
  return s;
}

function sliceGrid(d, w, h, cols, rows) {
  const cw = Math.floor(w / cols), chh = Math.floor(h / rows);
  const cells = [];
  for (let ry = 0; ry < rows; ry++) {
    for (let rx = 0; rx < cols; rx++) {
      const ox = rx * cw, oy = ry * chh;
      let x0 = cw, y0 = chh, x1 = -1, y1 = -1;
      for (let y = 0; y < chh; y++) {
        const row = ((oy + y) * w + ox) * 4;
        for (let x = 0; x < cw; x++) {
          if (d[row + x * 4 + 3] < 24) continue;
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
      if (x1 < 0) { cells.push(null); continue; }   // empty cell
      cells.push({
        x: ox + x0, y: oy + y0,
        w: x1 - x0 + 1, h: y1 - y0 + 1,
        ax: (x1 - x0 + 1) / 2,      // anchor: bottom centre of the content
        ay: y1 - y0 + 1,
      });
    }
  }
  return cells;
}

/**
 * Slice a sheet by finding its content instead of assuming a grid.
 *
 * Generated sheets rarely land on an even lattice — rows end up different
 * heights and columns drift — and a uniform grid then cuts sprites in half.
 * Finding the empty gutters instead works whatever the spacing, and returns
 * cells in reading order.
 */
function sliceAuto(d, w, h) {
  const solid = (i) => d[i * 4 + 3] > 24;
  const rowFull = [];
  for (let y = 0; y < h; y++) {
    let n = 0;
    for (let x = 0; x < w; x += 3) if (solid(y * w + x)) { n++; if (n > 2) break; }
    rowFull.push(n > 2);
  }
  const bands = runs(rowFull, 20);

  const cells = [];
  for (const [y0, y1] of bands) {
    const colFull = [];
    for (let x = 0; x < w; x++) {
      let n = 0;
      for (let y = y0; y <= y1; y += 2) if (solid(y * w + x)) { n++; break; }
      colFull.push(n > 0);
    }
    for (const [x0, x1] of runs(colFull, 14)) {
      // Trim the band's own vertical slack off this column.
      let ty = y1, by = y0;
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++)
          if (solid(y * w + x)) { if (y < ty) ty = y; if (y > by) by = y; break; }
      cells.push({
        x: x0, y: ty, w: x1 - x0 + 1, h: by - ty + 1,
        ax: (x1 - x0 + 1) / 2, ay: by - ty + 1,
      });
    }
  }
  return cells;
}

// Contiguous true-runs of at least `min` length.
function runs(flags, min) {
  const out = [];
  let start = null;
  for (let i = 0; i < flags.length; i++) {
    if (flags[i] && start === null) start = i;
    else if (!flags[i] && start !== null) {
      if (i - start >= min) out.push([start, i - 1]);
      start = null;
    }
  }
  if (start !== null && flags.length - start >= min) out.push([start, flags.length - 1]);
  return out;
}

export function drawSprite(ctx, s, index, sx, sy, scale, flip, src) {
  const c = s.cells[index];
  if (!c) return;
  const img = src || s.canvas;
  if (flip) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(-1, 1);
    ctx.drawImage(img, c.x, c.y, c.w, c.h,
      -c.ax * scale, -c.ay * scale, c.w * scale, c.h * scale);
    ctx.restore();
    return;
  }
  ctx.drawImage(img, c.x, c.y, c.w, c.h,
    sx - c.ax * scale, sy - c.ay * scale, c.w * scale, c.h * scale);
}

export const spriteSize = (s, i) => (s.cells[i] ? s.cells[i] : { w: 0, h: 0 });

/**
 * A pre-tinted copy of a whole sheet, built once.
 *
 * Vector actors flash red by blending their palette; a bitmap can't do that,
 * and compositing the flash at draw time would bleed onto the scenery behind
 * it. Baking one red copy of the sheet up front costs a single canvas and
 * makes the flash a straight swap of source image.
 */
/**
 * A reduced-resolution copy of a sheet, cells and all.
 *
 * Generated art arrives far larger than it is ever drawn — a 490px cell on
 * screen at 90px. Canvas resamples that every single draw, and a screenful of
 * them costs real frames. Shrinking the sheet once, to something near the size
 * it is actually used at, moves that work to load time.
 *
 * Only worth it for sheets drawn small. A sprite stretched *up* from the mip
 * would just look soft, so the caller picks which source it wants.
 */
export function scaled(s, k) {
  if (s.mip && s.mip.k === k) return s.mip;
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(s.canvas.width * k));
  cv.height = Math.max(1, Math.round(s.canvas.height * k));
  const c = cv.getContext('2d');
  c.imageSmoothingQuality = 'high';
  c.drawImage(s.canvas, 0, 0, cv.width, cv.height);
  s.mip = {
    k, canvas: cv,
    cells: s.cells.map((cell) => cell && {
      x: cell.x * k, y: cell.y * k, w: cell.w * k, h: cell.h * k,
      ax: cell.ax * k, ay: cell.ay * k,
    }),
  };
  return s.mip;
}

export function tinted(s, colour) {
  if (s.tint) return s.tint;
  const cv = document.createElement('canvas');
  cv.width = s.canvas.width;
  cv.height = s.canvas.height;
  const c = cv.getContext('2d');
  c.drawImage(s.canvas, 0, 0);
  c.globalCompositeOperation = 'source-atop';   // stays inside the sprites' alpha
  c.fillStyle = colour;
  c.fillRect(0, 0, cv.width, cv.height);
  s.tint = cv;
  return cv;
}
