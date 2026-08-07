// Joint-space probe for the walk. Prints, per sampled phase, which foot is
// carrying, how high the other sole is, and the knee angles — the numbers the
// motion critic scored. Scratch tooling for the motion round.
import { ANIMS, solve, STRIDE } from '../../js/rig.js';

const N = +(process.argv[2] || 24);
const feet = ['footBack', 'footFront'];
const h = (j, k, a, e = 'y') => -j[k][e] + (a.lift || 0);
const sole = (j, k, a) => Math.min(h(j, k, a), h(j, k, a, 'ty'));

console.log('  p   plant  backSole frontSole  backToe frontToe  kneeB  kneeF  thighB thighF  toeGap  hip');
for (let i = 0; i < N; i++) {
  const p = i / N;
  const a = ANIMS.walk(p);
  const j = solve(a);
  const sb = sole(j, 'footBack', a), sf = sole(j, 'footFront', a);
  const plant = sb < sf ? 'back ' : 'front';
  const gap = Math.abs(j.footBack.tx - j.footFront.tx);
  const mark = (i % (N / 4) === 0) ? ` <-- f${i / (N / 4)}` : '';
  console.log(
    [p.toFixed(3), plant, sb.toFixed(3), sf.toFixed(3),
     h(j, 'footBack', a, 'ty').toFixed(3), h(j, 'footFront', a, 'ty').toFixed(3),
     a.shinBack.toFixed(3), a.shinFront.toFixed(3),
     a.thighBack.toFixed(3), a.thighFront.toFixed(3),
     gap.toFixed(3), (0.5 - (a.lift || 0)).toFixed(3)].join('  ') + mark);
}
console.log('STRIDE', STRIDE.toFixed(4));
