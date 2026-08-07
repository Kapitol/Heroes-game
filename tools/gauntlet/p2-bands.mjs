// Per-band painted area + extent for each half of a compare PNG, normalised to
// figure height. node p2-bands.mjs compare-x.png
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
    const halves = [[6, (c.width >> 1) - 6], [(c.width >> 1) + 6, c.width - 6]];
    return halves.map(([x0, x1]) => {
      let top = -1, bot = -1, left = 1e9, right = -1;
      for (let py = 0; py < c.height; py++) for (let px = x0; px < x1; px++) {
        if (on(px, py)) { if (top < 0) top = py; bot = py; if (px < left) left = px; if (px > right) right = px; }
      }
      const H = bot - top + 1;
      const bands = [];
      for (let k = 0; k <= 40; k++) {
        const f = k / 40;               // 0 = sole, 1 = crown
        const py = Math.round(bot - f * (H - 1));
        let area = 0, lo = 1e9, hi = -1, runs = 0, prev = false, maxrun = 0, run = 0;
        for (let px = x0; px < x1; px++) {
          const v = on(px, py);
          if (v) { area++; if (px < lo) lo = px; if (px > hi) hi = px; run++; if (!prev) runs++; }
          else { if (run > maxrun) maxrun = run; run = 0; }
          prev = v;
        }
        if (run > maxrun) maxrun = run;
        bands.push({ f: +f.toFixed(3), area: +(area / H).toFixed(3),
          ext: hi < 0 ? 0 : +((hi - lo + 1) / H).toFixed(3), runs, maxrun: +(maxrun / H).toFixed(3) });
      }
      return { H, wide: +((right - left + 1) / H).toFixed(3), bands };
    });
  }, b64);
});

for (const [i, h] of out.entries()) {
  console.log(`--- half ${i}   H=${h.H}px  widest=${h.wide}`);
  console.log('  f      area   ext    runs  maxrun');
  for (const b of h.bands) if (b.f * 40 % 2 === 0)
    console.log(`  ${b.f.toFixed(3)}  ${b.area.toFixed(3)}  ${b.ext.toFixed(3)}  ${String(b.runs).padStart(3)}   ${b.maxrun.toFixed(3)}`);
}
