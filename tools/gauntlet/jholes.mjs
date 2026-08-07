// Find enclosed transparent holes inside the rig figure's silhouette, and
// report each one's bounding box as a fraction of figure height measured up
// from the sole. A hole between two pieces is a joint that does not close.
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { withPage, parseArgs } from './shot.mjs';

const HERE = dirname(new URL(import.meta.url).pathname);
const o = parseArgs(process.argv.slice(2));
const url = `http://localhost:8137/tools/gauntlet/${o.in}`;

const res = await withPage(async (page) => {
  await page.goto('http://localhost:8137/tools/gauntlet/progress.html', { waitUntil: 'load' });
  return page.evaluate(async (url) => {
    const img = new Image(); img.src = url; await img.decode();
    const w = img.width, h = img.height;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, w, h).data;
    const A = 40; // alpha below this is "not painted"
    const on = (i) => d[i * 4 + 3] > A;
    // figure bbox
    let x0 = w, x1 = -1, y0 = h, y1 = -1;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (on(j * w + i)) {
      if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j;
    }
    const H = y1 - y0 + 1;
    // flood fill background from the border
    const seen = new Uint8Array(w * h);
    const st = [];
    for (let i = 0; i < w; i++) { st.push(i, (h - 1) * w + i); }
    for (let j = 0; j < h; j++) { st.push(j * w, j * w + w - 1); }
    while (st.length) {
      const p = st.pop();
      if (seen[p] || on(p)) continue;
      seen[p] = 1;
      const x = p % w, y = (p - x) / w;
      if (x > 0) st.push(p - 1); if (x < w - 1) st.push(p + 1);
      if (y > 0) st.push(p - w); if (y < h - 1) st.push(p + w);
    }
    // anything transparent and unseen is an enclosed hole
    const lab = new Int32Array(w * h).fill(-1);
    const holes = [];
    for (let p = 0; p < w * h; p++) {
      if (on(p) || seen[p] || lab[p] >= 0) continue;
      const id = holes.length;
      const q = [p]; lab[p] = id;
      let a = 0, bx0 = w, bx1 = -1, by0 = h, by1 = -1;
      while (q.length) {
        const r = q.pop(); a++;
        const x = r % w, y = (r - x) / w;
        if (x < bx0) bx0 = x; if (x > bx1) bx1 = x;
        if (y < by0) by0 = y; if (y > by1) by1 = y;
        for (const s of [r - 1, r + 1, r - w, r + w]) {
          if (s < 0 || s >= w * h) continue;
          if (Math.abs((s % w) - x) > 1) continue;
          if (on(s) || seen[s] || lab[s] >= 0) continue;
          lab[s] = id; q.push(s);
        }
      }
      holes.push({ area: a, box: [bx0, by0, bx1, by1],
        upLo: +((y1 - by1) / H).toFixed(3), upHi: +((y1 - by0) / H).toFixed(3),
        wFrac: +((bx1 - bx0 + 1) / H).toFixed(3), hFrac: +((by1 - by0 + 1) / H).toFixed(3) });
    }
    holes.sort((a, b) => b.area - a.area);
    return { size: [w, h], figure: [x0, y0, x1, y1], H, holes: holes.filter(x => x.area >= 12).slice(0, 20) };
  }, url);
});
console.log(JSON.stringify(res, null, 1));
