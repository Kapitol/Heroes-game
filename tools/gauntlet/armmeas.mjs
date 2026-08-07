import { solve, plant, ANIMS, BONES, HIP, STRIDE } from '../../js/rig.js';
const byKey = Object.fromEntries(BONES.map(b => [b.key, b]));
const TURN = Math.PI * 2;
const deg = (t) => (t * 360);

function report(state, frames = 4) {
  console.log('== ' + state);
  for (let f = 0; f < frames; f++) {
    const p = f / frames;
    const a = ANIMS[state](p);
    const j = solve(a);
    const lift = a.lift || 0;
    const H = (k, end = '') => lift - (end ? j[k].ty : j[k].y);
    const row = {};
    for (const side of ['Front', 'Back']) {
      const sh = 'upperArm' + side, fa = 'forearm' + side, hd = 'hand' + side;
      // elbow flex = forearm angle relative to upper arm
      const flex = deg((byKey[fa].rest + (a[fa] || 0)));
      const shAbs = deg(byKey[sh].rest + (a[sh] || 0)) ;
      const fistY = H(hd, 'tip');
      const fistX = j[hd].tx;
      // forearm direction
      const dx = j[fa].tx - j[fa].x, dy = j[fa].ty - j[fa].y;
      row[side] = { shoulderDelta: shAbs.toFixed(1), elbowFlex: flex.toFixed(1),
        elbowY: H(fa).toFixed(3), fistY: fistY.toFixed(3), fistX: fistX.toFixed(3),
        faDx: dx.toFixed(3), faDy: dy.toFixed(3) };
    }
    const hipY = (lift + HIP).toFixed(3);
    const toeF = H('footFront', 'tip').toFixed(3), toeB = H('footBack', 'tip').toFixed(3);
    const heelF = H('footFront').toFixed(3), heelB = H('footBack').toFixed(3);
    console.log(`f${f} hip ${hipY} | ankleF ${heelF} toeF ${toeF} ankleB ${heelB} toeB ${toeB}`);
    console.log(`   near ${JSON.stringify(row.Front)}`);
    console.log(`   far  ${JSON.stringify(row.Back)}`);
  }
}
report('walk');
console.log('STRIDE', STRIDE.toFixed(4));
// symmetry check across half cycle
let hips = [];
for (let i = 0; i < 64; i++) { const a = ANIMS.walk(i/64); hips.push(a.lift + HIP); }
console.log('hip min/max', Math.min(...hips).toFixed(4), Math.max(...hips).toFixed(4));
const half = hips.length/2;
let maxAsym = 0;
for (let i=0;i<half;i++) maxAsym = Math.max(maxAsym, Math.abs(hips[i]-hips[i+half]));
console.log('half-cycle hip asymmetry', maxAsym.toFixed(4));
