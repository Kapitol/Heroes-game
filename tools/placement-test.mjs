// Proves the placement grammar, headless.
//
//   node tools/placement-test.mjs
//
// Spacing is the whole point of the feature tier and a screenshot cannot show
// it: you would have to walk four thousand tiles and trust your memory. This
// walks them and measures. It caught the one real bug in the first draft — a
// slot allowed anywhere in its window put two fences one tile apart.
//
// `per-window` should sit at 1.00: one object per window of `every` tiles.
// `min-gap` should be about half a window, which is what confining the object
// to the middle of its window buys.
import { BIOMES, propAt, landmarkAt, HALF, VERGE } from '../js/world.js';

const SPAN = 4000;
let bad = 0;

for (const b of BIOMES) {
  const feats = (b.props || []).filter((p) => p && p.tier === 'feature');
  const seen = new Map();          // name -> sorted x positions
  let scatterTiles = 0, vergeTiles = 0, landmarks = [];

  for (let x = 0; x < SPAN; x++) {
    for (let y = -VERGE; y <= VERGE; y++) {
      if (Math.abs(y) < HALF + 0.6) continue;
      vergeTiles++;
      const k = propAt(x, y, b);
      if (landmarkAt(x, y, b)) landmarks.push(x);
      if (!k) continue;
      if (feats.some((f) => f.name === k)) {
        if (!seen.has(k)) seen.set(k, []);
        seen.get(k).push(x);
      } else scatterTiles++;
    }
  }

  const parts = [];
  for (const f of feats) {
    const xs = seen.get(f.name) || [];
    let minGap = Infinity;
    for (let i = 1; i < xs.length; i++) minGap = Math.min(minGap, xs[i] - xs[i - 1]);
    const perWindow = xs.length / (SPAN / f.every);
    const ok = xs.length > 0 && minGap >= 1 && Math.abs(perWindow - 1) < 0.06;
    if (!ok) bad++;
    parts.push(`${f.name} n=${xs.length} every=${f.every} min-gap=${minGap === Infinity ? '—' : minGap} per-window=${perWindow.toFixed(2)}${ok ? '' : '  <-- BAD'}`);
  }
  let lmGap = Infinity;
  for (let i = 1; i < landmarks.length; i++) lmGap = Math.min(lmGap, landmarks[i] - landmarks[i - 1]);
  const dens = (scatterTiles / vergeTiles * 100).toFixed(1);
  console.log(`${b.key.padEnd(9)} scatter ${dens}%  landmarks ${landmarks.length}${landmarks.length ? ` (min gap ${lmGap})` : ''}`);
  for (const line of parts) console.log('          ' + line);
}
console.log(bad ? `\n${bad} FAILURES` : '\nall feature spacing within tolerance');
