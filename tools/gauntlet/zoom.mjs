// Scratch: crop + upscale a region of a PNG, and print a silhouette width
// profile, so proportion can be measured rather than guessed.
//
//   node tools/gauntlet/zoom.mjs --in compare-before-t1.png --x 0 --y 0 --w 417 --h 640 --scale 2 --out z.png
//   node tools/gauntlet/zoom.mjs --in compare-before-t1.png --x 0 --y 0 --w 417 --h 640 --profile 1

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { withPage, parseArgs } from './shot.mjs';

const HERE = dirname(new URL(import.meta.url).pathname);

const o = parseArgs(process.argv.slice(2));
const url = `http://localhost:8137/tools/gauntlet/${o.in}`;

const res = await withPage(async (page) => {
  await page.goto('http://localhost:8137/tools/gauntlet/progress.html', { waitUntil: 'load' });
  return page.evaluate(async (url, o) => {
    const img = new Image();
    img.src = url;
    await img.decode();
    const x = +o.x || 0, y = +o.y || 0;
    const w = +o.w || img.width, h = +o.h || img.height;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.drawImage(img, x, y, w, h, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h).data;
    const lum = (i) => (d[i] + d[i + 1] + d[i + 2]) / 3 * (d[i + 3] / 255);
    const T = 28;
    // bounding box of painted pixels
    let x0 = w, x1 = -1, y0 = h, y1 = -1;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      if (lum((j * w + i) * 4) > T) {
        if (i < x0) x0 = i; if (i > x1) x1 = i;
        if (j < y0) y0 = j; if (j > y1) y1 = j;
      }
    }
    const H = y1 - y0 + 1;
    const rows = [];
    for (let k = 0; k <= 40; k++) {
      const j = Math.round(y1 - (H - 1) * k / 40);
      let a = w, b = -1;
      for (let i = 0; i < w; i++) if (lum((j * w + i) * 4) > T) { if (i < a) a = i; if (i > b) b = i; }
      rows.push({ up: (k / 40).toFixed(3), width: b < 0 ? 0 : ((b - a + 1) / H).toFixed(3) });
    }
    let png = null;
    if (o.out) {
      const s = +o.scale || 1;
      const c2 = document.createElement('canvas');
      c2.width = w * s; c2.height = h * s;
      const g2 = c2.getContext('2d');
      g2.imageSmoothingEnabled = false;
      g2.drawImage(c, 0, 0, w * s, h * s);
      png = c2.toDataURL('image/png');
    }
    return { box: [x0, y0, x1, y1], H, rows, png };
  }, url, o);
});

if (res.png) {
  writeFileSync(resolve(HERE, o.out), Buffer.from(res.png.split(',')[1], 'base64'));
  console.log(resolve(HERE, o.out));
}
console.log('box', res.box, 'paintedHeight', res.H);
if (o.profile) for (const r of res.rows) console.log(r.up, r.width);
