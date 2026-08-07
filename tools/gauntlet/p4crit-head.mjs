// Scratch (round 4 critique, proportion): fine silhouette width profile over the
// top third of each half of a compare-*.png, to locate the crown, the head's
// widest point and the shoulder break, normalised to each figure's own height.
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
      const bg = [d[0], d[1], d[2]];
      const on = (px, py) => {
        const i = (py * W + px) * 4;
        if (d[i + 3] < 24) return false;
        return Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]) > 26;
      };
      const side = (x0, x1) => {
        const rows = [];
        for (let y = 0; y < H; y++) {
          let lo = -1, hi = -1;
          for (let px = x0; px < x1; px++) if (on(px, y)) { if (lo < 0) lo = px; hi = px; }
          rows.push(lo < 0 ? null : [lo, hi]);
        }
        const top = rows.findIndex(r => r);
        let bot = -1; for (let y = H - 1; y >= 0; y--) if (rows[y]) { bot = y; break; }
        const fh = bot - top + 1;
        const prof = [];
        for (let y = top; y <= top + Math.round(fh * 0.35); y++) {
          const r = rows[y];
          prof.push([+((bot - y) / fh).toFixed(3), r ? +((r[1] - r[0] + 1) / fh).toFixed(3) : 0]);
        }
        return { fh, prof };
      };
      return { L: side(0, half - 6), R: side(half + 6, W) };
    }, b64)]);
  }
  return res;
});

for (const [f, r] of out) {
  console.log('\n== ' + f + '   figure heights L ' + r.L.fh + ' R ' + r.R.fh);
  console.log('up      L.w    R.w');
  for (let i = 0; i < r.L.prof.length; i += 4) {
    const a = r.L.prof[i], b = r.R.prof[i] || [0, 0];
    console.log(a[0].toFixed(3) + '  ' + a[1].toFixed(3) + '  ' + b[1].toFixed(3));
  }
}
