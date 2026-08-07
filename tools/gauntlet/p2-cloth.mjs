// Isolate the low-saturation dark cloth panel in one half of a compare PNG and
// report its silhouette, normalised to figure height above the sole.
//   node p2-cloth.mjs compare-x.png <half 0|1>
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { withPage } from './shot.mjs';

const HERE = dirname(new URL(import.meta.url).pathname);
const file = process.argv[2];
const half = Number(process.argv[3] || 0);
const b64 = readFileSync(resolve(HERE, file)).toString('base64');

const out = await withPage(async (page) => {
  await page.goto('about:blank');
  return page.evaluate(async (b64, half) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    const bg = [0x14, 0x10, 0x0c];
    const px = (p, q) => { const i = (q * c.width + p) * 4; return [d[i], d[i+1], d[i+2], d[i+3]]; };
    const on = (p, q) => { const [r,g,b,a] = px(p,q);
      return Math.abs(r-bg[0])+Math.abs(g-bg[1])+Math.abs(b-bg[2]) > 24 && a > 40; };
    const x0 = half ? (c.width >> 1) + 6 : 6, x1 = half ? c.width - 6 : (c.width >> 1) - 6;
    let top=-1, bot=-1;
    for (let q=0;q<c.height;q++) for (let p=x0;p<x1;p++) if (on(p,q)) { if(top<0)top=q; bot=q; }
    const H = bot - top + 1;
    // cloth: dark and desaturated-cool (max-min channel small, or blue >= red)
    const cloth = (p,q) => { const [r,g,b,a] = px(p,q);
      if (a < 40) return false;
      const mx = Math.max(r,g,b), mn = Math.min(r,g,b);
      return mx < 96 && mx > 26 && (mx - mn) < 26; };
    const rows = [];
    for (let k=0;k<=32;k++){
      const f = k/32, q = Math.round(bot - f*(H-1));
      let lo=1e9, hi=-1, n=0;
      for(let p=x0;p<x1;p++) if (cloth(p,q)) { n++; if(p<lo)lo=p; if(p>hi)hi=p; }
      rows.push({ f:+f.toFixed(3), n, w: hi<0?0:+((hi-lo+1)/H).toFixed(3) });
    }
    // vertical extent of the cloth blob
    let ct=-1, cb=-1;
    for (let q=top;q<=bot;q++){ let n=0; for(let p=x0;p<x1;p++) if(cloth(p,q)) n++;
      if (n > H*0.06) { if (ct<0) ct=q; cb=q; } }
    return { H, top:+(((bot-ct)/H)).toFixed(3), bottom:+(((bot-cb)/H)).toFixed(3), rows };
  }, b64, half);
});
console.log(`figure H=${out.H}px   cloth spans ${out.bottom} .. ${out.top} of height above sole`);
for (const r of out.rows) if (r.n) console.log(`  f=${r.f.toFixed(3)}  cloth px=${String(r.n).padStart(4)}  width=${r.w.toFixed(3)}`);
