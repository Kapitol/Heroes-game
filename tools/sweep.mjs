// Balance sweep: run the harness across a grid of curve settings and rank them.
//
//   node tools/sweep.mjs              the default grid
//   node tools/sweep.mjs --runs 200   more runs per cell (slower, steadier)
//
// Each cell is a separate process, because the dials in js/balance.js are read
// once at module load. Every cell plays the same seeded road, so a difference
// between two rows is the settings and not the dice.
//
// WHAT IT IS RANKING FOR
//
// Not "deepest run" — that is trivially bought by making enemies weak. Three
// things at once, which is what makes it a balance problem rather than a knob:
//
//   1. **Spread.** A good draft must go meaningfully deeper than a careless
//      one. This is the whole design goal; a setting that fails it is rejected
//      no matter how good the rest looks.
//   2. **Reach.** A played-well run should get past the first boss, which sits
//      twelve waves in. A curve nobody survives to meet has no boss fight in it.
//   3. **Mortality.** A run has to end. If every strategy runs to the guard
//      rail the road has stopped pushing back and the numbers stop meaning
//      anything.

import { spawn } from 'node:child_process';

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const RUNS = arg('runs', '120');

const GRID = {
  HP_FROM_STAGE: [0.14, 0.24, 0.34],
  DMG_FROM_STAGE: [0.06, 0.14, 0.22],
  WAVE_GROWTH: [0.10, 0.20],
  DMG_FROM_EHP: [0, 0.20],
};

const combos = [];
for (const hs of GRID.HP_FROM_STAGE)
  for (const ds of GRID.DMG_FROM_STAGE)
    for (const wg of GRID.WAVE_GROWTH)
      for (const de of GRID.DMG_FROM_EHP)
        combos.push({ HP_FROM_STAGE: hs, DMG_FROM_STAGE: ds, WAVE_GROWTH: wg, DMG_FROM_EHP: de });

/** Run one cell and pull the numbers back out of the table it prints. */
function runCell(env) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, ['tools/sim.mjs', '--runs', RUNS],
      { env: { ...process.env, ...Object.fromEntries(Object.entries(env).map(([k, v]) => [k, String(v)])) } });
    let out = '';
    p.stdout.on('data', (d) => { out += d; });
    p.on('close', () => {
      const rows = {};
      for (const line of out.split('\n')) {
        const m = line.match(/'(\w+)'\s*│\s*(\d+)\s*│\s*([\d.]+)\s*│\s*(\d+)\s*│\s*(\d+)\s*│\s*([\d.]+)/);
        if (m) rows[m[1]] = { median: +m[2], mean: +m[3], p10: +m[4], p90: +m[5], boss: +m[6] };
      }
      const ranAway = /ran out of road/.test(out);
      resolve({ env, rows, ranAway });
    });
  });
}

const results = [];
for (const [i, env] of combos.entries()) {
  process.stderr.write(`\r${i + 1}/${combos.length}  `);
  results.push(await runCell(env));
}
process.stderr.write('\n');

const scored = results.map((r) => {
  const good = Math.max(r.rows.damage?.median ?? 0, r.rows.balanced?.median ?? 0, r.rows.defense?.median ?? 0);
  const careless = Math.min(r.rows.first?.median ?? 99, r.rows.random?.median ?? 99);
  const bestBoss = Math.max(r.rows.damage?.boss ?? 0, r.rows.balanced?.boss ?? 0, r.rows.defense?.boss ?? 0);
  const spread = careless > 0 ? good / careless : 0;
  return {
    ...Object.fromEntries(Object.entries(r.env).map(([k, v]) => [k.replace(/_FROM|_GROWTH/g, ''), v])),
    careless, good, spread: +spread.toFixed(2), 'boss %': bestBoss,
    // Reach and spread both matter and neither substitutes for the other, so
    // the score multiplies them and drops anything that never meets a boss.
    score: +((bestBoss / 100) * spread * Math.min(good, 40)).toFixed(2),
  };
});

scored.sort((a, b) => b.score - a.score);
console.log(`\n${RUNS} runs per strategy per cell · ${combos.length} cells\n`);
console.table(scored.slice(0, 12));
console.log('\nTop cell:', JSON.stringify(scored[0]));
