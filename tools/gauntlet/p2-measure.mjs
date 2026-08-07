// Measure the silhouette of both halves of a compare-*.png.
// Prints, per half, the figure box and the silhouette width at every 5% of
// height, so "stocky" and "narrow" stop being adjectives.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { withPage } from './shot.mjs';

const HERE = dirname(new URL(import.meta.url).pathname);
const file = process.argv[2];
const b64 = readFileSync(resolve(HERE, file)).toString('base64');

const out = await withPage(async (page) => {
  await page.goto('about:blank');
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    const bg = [0x14, 0x10, 0x0c];
    const on = (px, py) => {
      const i = (py * c.width + px) * 4;
      return Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]) > 24
        && d[i + 3] > 40;
    };
    const halves = [[0, (c.width >> 1) - 4], [(c.width >> 1) + 4, c.width]];
    return halves.map(([x0, x1]) => {
      const rows = [];
      for (let py = 0; py < c.height; py++) {
        let lo = Infinity, hi = -Infinity;
        for (let px = x0; px < x1; px++) if (on(px, py)) { if (px < lo) lo = px; if (px > hi) hi = px; }
        rows.push(lo === Infinity ? null : [lo, hi]);
      }
      const top = rows.findIndex(r => r);
      let bot = rows.length - 1; while (bot > 0 && !rows[bot]) bot--;
      const H = bot - top;
      const prof = [];
      for (let f = 0; f <= 20; f++) {
        // f/20 of the way UP from the sole
        const py = Math.round(bot - (f / 20) * H);
        const r = rows[py];
        prof.push([f / 20, r ? +((r[1] - r[0]) / H).toFixed(3) : 0]);
      }
      return { top, bot, H, prof };
    });
  }, b64);
});

for (const [n, h] of out.entries()) {
  console.log(`--- half ${n}  height ${h.H}px`);
  console.log(h.prof.map(([f, w]) => `${f.toFixed(2)} ${String(w).padEnd(5)}`).join('\n'));
}
