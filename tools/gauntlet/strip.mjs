// Shoot all four rig phases and lay them under the bar's four strides.
//
//   node tools/gauntlet/strip.mjs --tier 3 --state walk --name before
//
// The per-frame comparison (compare.mjs) answers "is this pose right". This
// answers "is this *cycle* right", which is the question the walk actually
// fails: four evenly-spaced narrow poses read as a rig no matter how good any
// one of them is.
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { withPage, shoot, DEFAULTS as SHOT } from './shot.mjs';

const HERE = dirname(new URL(import.meta.url).pathname);

const o = { base: 'http://localhost:8137', tier: 3, state: 'walk', name: 'strip', target: 320,
  sheet: 'art/warrior-walk.png', row: -1 };
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (!a.startsWith('--')) continue;
  const k = a.slice(2), next = process.argv[i + 1];
  if (next === undefined || next.startsWith('--')) { o[k] = 1; continue; }
  o[k] = /^-?[\d.]+$/.test(next) ? +next : next;
  i++;
}
if (o.row === -1) o.row = o.tier - 1;

const names = [];
for (let f = 0; f < 4; f++) {
  const out = `strip-${o.name}-f${f}.png`;
  await shoot({ ...SHOT, base: o.base, tier: o.tier, state: o.state, frame: f, out });
  names.push(out);
}

const q = new URLSearchParams({
  sheet: `../../${o.sheet}`, cols: '4', rows: '5', row: String(o.row),
  target: String(o.target),
  rigs: names.map(nm => `../../tools/gauntlet/${nm}`).join(','),
});
const url = `${o.base}/tools/gauntlet/strip.html?${q}`;

const buf = await withPage(async (page) => {
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForSelector('body[data-ready="1"]', { timeout: 20000 });
  const rep = await page.evaluate(() => window.__strip);
  if (!rep || !rep.ok) throw new Error(`strip failed: ${rep && rep.error}\n${url}`);
  const data = await page.evaluate(() => document.getElementById('cv').toDataURL('image/png'));
  return Buffer.from(data.split(',')[1], 'base64');
});
const file = resolve(HERE, `strip-${o.name}.png`);
writeFileSync(file, buf);
console.log(file, buf.length);
