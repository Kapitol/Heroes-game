// Per-row run lengths in each half of a compare-*.png, so an individual limb's
// painted width can be read instead of the whole silhouette's extent.
//   node crit-runs.mjs compare-x.png 0.20 0.30 0.55 0.70
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { withPage } from './shot.mjs';

const HERE = dirname(new URL(import.meta.url).pathname);
const file = process.argv[2];
const rows = process.argv.slice(3).map(Number);
const b64 = readFileSync(resolve(HERE, file)).toString('base64');

const out = await withPage(async (page) => {
  await page.goto('about:blank');
  return page.evaluate(async (b64, rows) => {
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
      let y0 = c.height, y1 = -1;
      for (let py = 0; py < c.height; py++)
        for (let px = x0; px < x1; px++)
          if (on(px, py)) { if (py < y0) y0 = py; if (py > y1) y1 = py; break; }
      const H = y1 - y0 + 1;
      const res = { H, rows: {} };
      for (const f of rows) {
        const py = Math.round(y1 - f * H);
        const runs = [];
        let start = -1;
        for (let px = x0; px < x1; px++) {
          const v = on(px, py);
          if (v && start < 0) start = px;
          if (!v && start >= 0) { runs.push(+((px - start) / H).toFixed(3)); start = -1; }
        }
        if (start >= 0) runs.push(+((x1 - start) / H).toFixed(3));
        let fill=0; for(let px=x0;px<x1;px++) if(on(px,py)) fill++; res.rows[f] = { fill:+(fill/H).toFixed(3), runs: runs.filter((r) => r > 0.004) };
      }
      return res;
    });
  }, b64, rows);
});
for (const [i, h] of out.entries()) {
  console.log(`--- half ${i}  height ${h.H}px`);
  for (const [f, r] of Object.entries(h.rows)) console.log(`  ${f}  fill ${r.fill}  max ${Math.max(...r.runs, 0)}  [${r.runs.join(', ')}]`);
}
