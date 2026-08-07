// The final contact sheet: 5 tiers x 4 strides, rig under bar, one page.
//
//   node tools/gauntlet/contact.mjs --name final
//
// Shoots all twenty rig frames through one browser (a launch per frame is most
// of the wall clock) and hands them to contact.html to composite.
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { withPage, shoot, DEFAULTS as SHOT } from './shot.mjs';

const HERE = dirname(new URL(import.meta.url).pathname);

const o = { base: `http://localhost:${process.env.PORT || 8124}`, state: 'walk', name: 'final', target: 260,
  sheet: 'art/warrior-walk.png' };
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (!a.startsWith('--')) continue;
  const k = a.slice(2), next = process.argv[i + 1];
  if (next === undefined || next.startsWith('--')) { o[k] = 1; continue; }
  o[k] = /^-?[\d.]+$/.test(next) ? +next : next;
  i++;
}

const names = [];
const buf = await withPage(async (page) => {
  for (let t = 1; t <= 5; t++) {
    for (let f = 0; f < 4; f++) {
      const out = `contact-${o.name}-t${t}f${f}.png`;
      await shoot({ ...SHOT, base: o.base, tier: t, state: o.state, frame: f, out }, page);
      names.push(out);
    }
  }
  const q = new URLSearchParams({
    sheet: `../../${o.sheet}`, cols: '4', rows: '5', target: String(o.target),
    rigs: names.map(nm => `../../tools/gauntlet/${nm}`).join(','),
  });
  const url = `${o.base}/tools/gauntlet/contact.html?${q}`;
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForSelector('body[data-ready="1"]', { timeout: 30000 });
  const rep = await page.evaluate(() => window.__contact);
  if (!rep || !rep.ok) throw new Error(`contact failed: ${rep && rep.error}\n${url}`);
  if (rep.cells !== rep.expected) {
    console.error(`WARNING  sliced ${rep.cells} cells, expected ${rep.expected} — tiers may be shifted`);
  }
  console.log(JSON.stringify(rep));
  const data = await page.evaluate(() => document.getElementById('cv').toDataURL('image/png'));
  return Buffer.from(data.split(',')[1], 'base64');
});

const file = resolve(HERE, `contact-${o.name}.png`);
writeFileSync(file, buf);
console.log(file, buf.length);
