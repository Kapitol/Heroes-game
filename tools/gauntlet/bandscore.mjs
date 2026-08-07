// Render all four walk phases at a tier, compare each with the bar, and sum the
// silhouette-width error across the arm bands. One number per variant.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const HERE = dirname(new URL(import.meta.url).pathname);
const ROOT = resolve(HERE, '../..');
const name = process.argv[2] || 'score';
const tier = process.argv[3] || '3';
const BANDS = ['0.40','0.45','0.50','0.55','0.60','0.65'];

let total = 0;
for (let f = 0; f < 4; f++) {
  execFileSync('node', ['tools/gauntlet/shot.mjs', '--tier', tier, '--state', 'walk',
    '--frame', String(f), '--out', `sc-${name}-f${f}.png`], { cwd: ROOT });
  execFileSync('node', ['tools/gauntlet/compare.mjs', '--rig', `sc-${name}-f${f}.png`,
    '--tier', tier, '--frame', String(f), '--name', `sc-${name}-f${f}`], { cwd: ROOT });
  const key = JSON.parse(readFileSync(resolve(HERE, `compare-sc-${name}-f${f}.json`)));
  const txt = execFileSync('node', ['tools/gauntlet/p2-measure.mjs', `compare-sc-${name}-f${f}.png`],
    { cwd: ROOT }).toString();
  const halves = txt.split(/--- half \d+[^\n]*\n/).slice(1).map(block => {
    const m = {};
    for (const line of block.trim().split('\n')) {
      const [h, w] = line.trim().split(/\s+/);
      m[h] = +w;
    }
    return m;
  });
  const rig = key.left === 'rig' ? halves[0] : halves[1];
  const bar = key.left === 'rig' ? halves[1] : halves[0];
  let e = 0;
  for (const b of BANDS) e += Math.abs(bar[b] - rig[b]);
  total += e;
  console.log(`f${f} err ${e.toFixed(3)}  rig ${BANDS.map(b => rig[b].toFixed(3)).join(' ')}`);
  console.log(`          bar ${BANDS.map(b => bar[b].toFixed(3)).join(' ')}`);
}
console.log(`${name}: total band error ${total.toFixed(3)}`);
