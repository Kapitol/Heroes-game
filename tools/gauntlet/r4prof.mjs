// Scratch (round 4, proportion): silhouette profile of BOTH halves of a
// compare-*.png, normalised to each figure's own painted height.
//
//   node tools/gauntlet/r4prof.mjs compare-r4-before-t1f0.png
//
// Prints, per band of figure height: width across (lo..hi) and painted fill,
// both as fractions of that figure's own height. Left half and right half are
// measured independently, so the JSON answer key says which is the rig.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { withPage } from './shot.mjs';

const HERE = dirname(new URL(import.meta.url).pathname);
const files = process.argv.slice(2);

const out = await withPage(async (page) => {
  await page.goto('about:blank');
  const res = [];
  for (const f of files) {
    const b64 = readFileSync(resolve(HERE, f)).toString('base64');
    res.push([f, await page.evaluate(async (b64) => {
      const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height).data;
      const W = c.width, H = c.height, half = W >> 1;
      // background is a flat dark fill in compare.png; anything brighter counts
      const bg = [d[0], d[1], d[2]];
      const on = (px, py) => {
        const i = (py * W + px) * 4;
        if (d[i + 3] < 40) return false;
        return Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]) > 30;
      };
      const side = (x0, x1) => {
        const rows = [];
        for (let py = 0; py < H; py++) {
          let lo = Infinity, hi = -Infinity, n = 0;
          for (let px = x0; px < x1; px++) if (on(px, py)) { n++; if (px < lo) lo = px; if (px > hi) hi = px; }
          rows.push(n ? [lo, hi, n] : null);
        }
        const top = rows.findIndex(r => r);
        let bot = rows.length - 1; while (bot > 0 && !rows[bot]) bot--;
        const fh = bot - top;
        const prof = {};
        for (let u = 0; u <= 100; u += 5) {
          const py = Math.round(bot - (u / 100) * fh);
          const r = rows[py];
          prof[(u / 100).toFixed(2)] = r
            ? { w: +((r[1] - r[0]) / fh).toFixed(3), fill: +(r[2] / fh).toFixed(3) }
            : { w: 0, fill: 0 };
        }
        return { fh, prof };
      };
      return { left: side(4, half - 4), right: side(half + 4, W - 4) };
    }, b64)]);
  }
  return res;
});

for (const [f, r] of out) {
  console.log('\n== ' + f);
  console.log('up      L.w    L.fill   R.w    R.fill');
  for (const k of Object.keys(r.left.prof)) {
    const a = r.left.prof[k], b = r.right.prof[k];
    console.log(`${k}   ${a.w.toFixed(3)}  ${a.fill.toFixed(3)}    ${b.w.toFixed(3)}  ${b.fill.toFixed(3)}`);
  }
}
process.exit(0);
