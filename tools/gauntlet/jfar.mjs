// Scratch: mean luminance + saturation of a rectangle of painted pixels.
//   node tools/gauntlet/jfar.mjs --in compare-t3-f1.png --x 0 --y 0 --w 10 --h 10
import { withPage, parseArgs } from './shot.mjs';

const o = parseArgs(process.argv.slice(2));
const url = `http://localhost:8137/tools/gauntlet/${o.in}`;
const res = await withPage(async (page) => {
  await page.goto('http://localhost:8137/tools/gauntlet/progress.html', { waitUntil: 'load' });
  return page.evaluate(async (url, o) => {
    const img = new Image(); img.src = url; await img.decode();
    const x = +o.x || 0, y = +o.y || 0, w = +o.w || img.width, h = +o.h || img.height;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.drawImage(img, x, y, w, h, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h).data;
    let n = 0, sl = 0, ss = 0, lmin = 999, lmax = -1;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 20) continue;
      const r = d[i], gg = d[i + 1], b = d[i + 2];
      const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
      const l = (r + gg + b) / 3;
      if (l < 12) continue;               // background
      n++; sl += l; ss += mx ? (mx - mn) / mx : 0;
      if (l < lmin) lmin = l; if (l > lmax) lmax = l;
    }
    return { n, meanLum: +(sl / n).toFixed(1), meanSat: +(ss / n).toFixed(3), lmin, lmax };
  }, url, o);
});
console.log(JSON.stringify(res));
