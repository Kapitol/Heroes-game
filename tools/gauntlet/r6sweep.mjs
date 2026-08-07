// Round-6 sweep: try constant sets against the floor metrics without editing rig.js.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const SRC = '/Volumes/Z-Drive/Youtube-game/crypt-heroes/js/rig.js';
const TMP = '/private/tmp/claude-501/-Volumes-Z-Drive-Youtube-game/1dc889b3-cbb3-48b2-aca3-9a9b37945bd3/scratchpad/sweep';
mkdirSync(TMP, { recursive: true });
const base = readFileSync(SRC, 'utf8');
let n = 0;

async function build(subs) {
  let s = base;
  for (const [re, rep] of subs) {
    if (!re.test(s)) throw new Error('no match: ' + re);
    s = s.replace(re, rep);
  }
  const f = `${TMP}/rig${n++}.js`;
  writeFileSync(f, s);
  return import(pathToFileURL(f).href);
}

export async function score(label, subs) {
  const M = await build(subs);
  const { ANIMS, solve, STRIDE } = M;
  const N = 2000;
  let dbl = 0, minSwingClear = Infinity, dblRun = 0;
  const clears = [];
  for (let i = 0; i < N; i++) {
    const a = ANIMS.walk(i / N);
    const j = solve(a);
    const hB = Math.min(-j.footBack.y, -j.footBack.ty);
    const hF = Math.min(-j.footFront.y, -j.footFront.ty);
    const c = Math.abs(hB - hF);
    clears.push(c);
    if (c <= 0.005) dbl++;
  }
  // mid-swing clearance = the local maxima region; report the two per-half peaks
  const half1 = Math.max(...clears.slice(0, N / 2));
  const half2 = Math.max(...clears.slice(N / 2));
  const frames = [0, 1, 2, 3].map(f => clears[Math.round(f / 4 * N)]);
  // knee never positive, foot slide, bob
  let maxKnee = -Infinity, bobMin = Infinity, bobMax = -Infinity;
  let slide = 0, prevFoot = null, prevX = null;
  for (let i = 0; i <= N; i++) {
    const p = (i % N) / N;
    const a = ANIMS.walk(p);
    maxKnee = Math.max(maxKnee, a.shinBack, a.shinFront);
    const j = solve(a);
    bobMin = Math.min(bobMin, a.lift); bobMax = Math.max(bobMax, a.lift);
    const lo = (Math.min(-j.footBack.y, -j.footBack.ty) < Math.min(-j.footFront.y, -j.footFront.ty)) ? 'footBack' : 'footFront';
    const x = j[lo].x + (M.travel ? 0 : 0);
    if (prevFoot === lo && prevX !== null) slide = Math.max(slide, Math.abs(x - prevX));
    prevFoot = lo; prevX = x;
  }
  console.log(`${label.padEnd(26)} dbl=${(100 * dbl / N).toFixed(1)}% f=${frames.map(v => v.toFixed(3)).join('/')} peak=${half1.toFixed(3)}/${half2.toFixed(3)} maxKnee=${maxKnee.toFixed(4)} bob=${(bobMax - bobMin).toFixed(4)} STRIDE=${STRIDE.toFixed(3)}`);
  return { frames, dbl: dbl / N };
}
