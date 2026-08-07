// Scratch: alpha silhouette profile of a transparent rig PNG from shot.mjs.
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
    res.push(await page.evaluate(async (b64) => {
      const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height).data;
      const rows = [];
      for (let py = 0; py < c.height; py++) {
        let lo = Infinity, hi = -Infinity;
        for (let px = 0; px < c.width; px++) {
          const i = (py * c.width + px) * 4;
          if (d[i + 3] > 40) { if (px < lo) lo = px; if (px > hi) hi = px; }
        }
        rows.push(lo === Infinity ? null : [lo, hi]);
      }
      const top = rows.findIndex(r => r);
      let bot = rows.length - 1; while (bot > 0 && !rows[bot]) bot--;
      const H = bot - top;
      const prof = [];
      for (let k = 0; k <= 20; k++) {
        const py = Math.round(bot - (k / 20) * H);
        const r = rows[py];
        prof.push([k / 20, r ? +((r[1] - r[0]) / H).toFixed(3) : 0]);
      }
      return { H, prof };
    }, b64));
  }
  return res;
});
for (const [i, r] of out.entries()) {
  console.log(`--- ${files[i]}  height ${r.H}px`);
  console.log(r.prof.map(([f, w]) => `${f.toFixed(2)} ${w}`).join('\n'));
}
