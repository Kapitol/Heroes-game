// Measure stride geometry off the bar sheet and off rig shots, the same way.
//
//   node tools/gauntlet/measure.mjs --tier 3 --rigs before-t3-f0.png,before-t3-f1.png,...
//
// Everything is reported in fractions of the figure's own painted height, so
// the bar and the rig are directly comparable without matching pixel sizes.
// `feet` is the stride reach — the width of the bottom 7% of the figure, which
// is the sole band. That number is what "the stride is narrow" means.
//
// The bar cell is cut with `js/atlas.js`, the same chroma key and trim the game
// and `compare.mjs` use, so this is measuring the same pixels a judge sees.
import { withPage } from './shot.mjs';

const o = { base: 'http://localhost:8137', sheet: 'art/warrior-walk.png',
  cols: 4, rows: 5, tier: 3, rigs: '' };
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (!a.startsWith('--')) continue;
  const k = a.slice(2), next = process.argv[i + 1];
  if (next === undefined || next.startsWith('--')) { o[k] = 1; continue; }
  o[k] = /^-?[\d.]+$/.test(next) ? +next : next;
  i++;
}

const out = await withPage(async (page) => {
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`${o.base}/tools/rig.html`, { waitUntil: 'load' });
  const r = await page.evaluate(async (o) => {
    const atlas = await import('/js/atlas.js');
    const load = (u) => new Promise((res, rej) => {
      const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error(u)); im.src = u;
    });

    // Bands are fractions of the figure's height from the crown down.
    function stats(g, w, h) {
      const d = g.getImageData(0, 0, w, h).data;
      const on = (x, y) => d[(y * w + x) * 4 + 3] > 40;
      let top = -1, bot = -1;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) if (on(x, y)) { if (top < 0) top = y; bot = y; break; }
      }
      const H = bot - top;
      const band = (a, b) => {
        let lo = 1e9, hi = -1e9;
        for (let y = Math.round(top + H * a); y <= Math.min(bot, Math.round(top + H * b)); y++)
          for (let x = 0; x < w; x++) if (on(x, y)) { lo = Math.min(lo, x); hi = Math.max(hi, x); }
        return hi < lo ? 0 : (hi - lo) / H;
      };
      return {
        feet: +band(0.94, 1).toFixed(3),      // sole band: stride reach
        knee: +band(0.72, 0.80).toFixed(3),
        thigh: +band(0.58, 0.70).toFixed(3),
        hand: +band(0.44, 0.56).toFixed(3),   // where the fists hang
        elbow: +band(0.30, 0.40).toFixed(3),
        full: +band(0, 1).toFixed(3),
      };
    }

    const rows = { bar: [], rig: [] };
    const sh = await load(`/${o.sheet}`);
    let s = null;
    for (let t = 0; t < 200 && !s; t++) s = atlas.sheet(`/${o.sheet}`, o.cols, o.rows);
    for (let c = 0; c < o.cols; c++) {
      const cell = s.cells[(o.tier - 1) * o.cols + c];
      const cv = document.createElement('canvas');
      cv.width = cell.w; cv.height = cell.h;
      const g = cv.getContext('2d', { willReadFrequently: true });
      g.drawImage(s.canvas, cell.x, cell.y, cell.w, cell.h, 0, 0, cell.w, cell.h);
      rows.bar.push({ f: c, ...stats(g, cv.width, cv.height) });
    }
    for (const nm of (o.rigs ? String(o.rigs).split(',') : [])) {
      const im = await load(`/tools/gauntlet/${nm}`);
      const cv = document.createElement('canvas');
      cv.width = im.width; cv.height = im.height;
      const g = cv.getContext('2d', { willReadFrequently: true });
      g.drawImage(im, 0, 0);
      rows.rig.push({ f: nm, ...stats(g, cv.width, cv.height) });
    }
    return rows;
  }, o);
  if (errs.length) console.error(errs.join('\n'));
  return r;
});

const line = (r) => `${String(r.f).padEnd(22)} feet ${r.feet}  knee ${r.knee}  thigh ${r.thigh}  hand ${r.hand}  elbow ${r.elbow}  full ${r.full}`;
console.log('BAR');
for (const r of out.bar) console.log('  ' + line(r));
if (out.rig.length) { console.log('RIG'); for (const r of out.rig) console.log('  ' + line(r)); }
