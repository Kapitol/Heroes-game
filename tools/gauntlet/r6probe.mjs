// Round-6 motion probe: where is each sole, all cycle long.
import { ANIMS, solve, STRIDE } from '../../js/rig.js';

const N = 2000;
let dbl = 0, minClear = Infinity;
const rows = [];
for (let i = 0; i < N; i++) {
  const p = i / N;
  const a = ANIMS.walk(p);
  const j = solve(a);
  const hB = Math.min(-j.footBack.y, -j.footBack.ty);
  const hF = Math.min(-j.footFront.y, -j.footFront.ty);
  const hi = Math.max(hB, hF);
  const clear = hi - Math.min(hB, hF);
  minClear = Math.min(minClear, clear);
  if (clear <= 0.005) dbl++;
  rows.push({ p, clear });
}
console.log(`double support (clear<=0.005): ${(100 * dbl / N).toFixed(1)}%  minClear=${minClear.toFixed(4)}  STRIDE=${STRIDE.toFixed(4)}`);

for (const f of [0, 1, 2, 3]) {
  const p = f / 4;
  const a = ANIMS.walk(p);
  const j = solve(a);
  const hB = Math.min(-j.footBack.y, -j.footBack.ty);
  const hF = Math.min(-j.footFront.y, -j.footFront.ty);
  const crown = -j.head.ty ?? 0;
  console.log(`f${f}  clear=${Math.abs(hB - hF).toFixed(4)}  thighB=${a.thighBack.toFixed(4)} kneeB=${a.shinBack.toFixed(4)}  thighF=${a.thighFront.toFixed(4)} kneeF=${a.shinFront.toFixed(4)}`);
}
// clearance curve, 40 buckets
let s = '';
for (let i = 0; i < 40; i++) s += ' ' + rows[Math.round(i * N / 40)].clear.toFixed(3);
console.log('clear curve:' + s);
