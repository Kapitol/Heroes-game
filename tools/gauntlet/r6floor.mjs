// Measure, off the rendered PNG, how far each boot's lowest pixel is from the
// ground — the check the critic actually ran, done on pixels rather than angles.
//
//   node tools/gauntlet/r6floor.mjs r6-b-f0.png r6-b-f2.png
import { withPage } from './shot.mjs';

const files = process.argv.slice(2);
const out = await withPage(async (page) => {
  await page.goto('http://localhost:8137/tools/gauntlet/progress.html', { waitUntil: 'load' });
  return page.evaluate(async (files) => {
    const res = [];
    for (const f of files) {
      const img = new Image();
      img.src = `http://localhost:8137/tools/gauntlet/${f}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      // bottom profile: lowest opaque row per column. The drop shadow is opaque too,
      // so a pixel counts only if it is both solid enough and light enough to be armour.
      const op = (d, i) => d[i + 3] > 60 && (d[i] + d[i + 1] + d[i + 2]) / 3 > 70;
      const bot = [];
      let top = 1e9;
      for (let x = 0; x < c.width; x++) {
        let b = -1;
        for (let y = c.height - 1; y >= 0; y--) {
          if (op(d,(y * c.width + x) * 4)) { b = y; break; }
        }
        bot.push(b);
      }
      for (let y = 0; y < c.height; y++) {
        let any = false;
        for (let x = 0; x < c.width; x++) if (op(d,(y * c.width + x) * 4)) { any = true; break; }
        if (any) { top = y; break; }
      }
      const floor = Math.max(...bot);
      // every column within 3px of the floor is "down"; group the rest into runs
      const cols = bot.map((b, x) => ({ x, b })).filter(o => o.b >= 0);
      // find the two lowest local maxima separated by a rise of >6px
      let best = [];
      for (let i = 1; i < cols.length - 1; i++) {
        if (cols[i].b >= cols[i - 1].b && cols[i].b > cols[i + 1].b) best.push(cols[i]);
      }
      // deepest per contiguous "toe" cluster
      const clusters = [];
      for (const o of cols) {
        if (!clusters.length || o.x - clusters.at(-1).at(-1).x > 1) clusters.push([]);
        clusters.at(-1).push(o);
      }
      const boots = [];
      // split the single silhouette by scanning for columns that are >10px above the floor
      let run = null;
      for (const o of cols) {
        if (o.b > floor - 14) { if (!run) run = { x0: o.x, x1: o.x, b: o.b }; else { run.x1 = o.x; run.b = Math.max(run.b, o.b); } }
        else if (run) { boots.push(run); run = null; }
      }
      if (run) boots.push(run);
      res.push({ f, h: floor - top, floor, boots: boots.map(b => ({ x: `${b.x0}-${b.x1}`, up: floor - b.b })) });
    }
    return res;
  }, files);
});
for (const r of out) {
  console.log(`${r.f}  figure ${r.h}px  floor y=${r.floor}  boots: ` +
    r.boots.map(b => `[x ${b.x}] ${b.up}px up (${(b.up / r.h).toFixed(4)})`).join('  '));
}
