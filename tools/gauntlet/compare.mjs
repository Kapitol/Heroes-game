// The rig and the bar, side by side, at matched figure height — and the critic
// is not told which is which.
//
//   node tools/gauntlet/compare.mjs --rig rig-t3-walk-f1.png --tier 3 --frame 1 \
//     --name t3-f1
//
// Writes `compare-<name>.png` and `compare-<name>.json`. The PNG carries no
// labels of any kind and the left/right order is decided by a coin toss here;
// the JSON is the only record of which side is which.
//
// **That randomisation is the entire instrument.** A judge shown "the rig" and
// "the hand-painted one" grades the label. The bar in HANDOFF is that a judge
// cannot pick the rig out of a lineup, and only a blind lineup can measure it.
// So nothing on the image, in its filename, or in the order says which is which
// — and the answer lives in a file whoever is judging must not open until they
// have written their verdict down.
//
// The bar cell is cut by `js/atlas.js` inside the page (see compare.html), so
// it is the same chroma key and the same content trim the game itself uses.
// `warrior-walk.png` is four strides across by five tiers down, in reading
// order, so cell = tier row × 4 + stride column.

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomInt } from 'node:crypto';
import { withPage } from './shot.mjs';

const HERE = dirname(new URL(import.meta.url).pathname);

export const DEFAULTS = {
  base: `http://localhost:${process.env.PORT || 8124}`,
  rig: '',            // PNG from shot.mjs, relative to tools/gauntlet/
  sheet: 'art/warrior-walk.png',
  cols: 4,
  rows: 5,
  tier: 1,            // 1-5; the sheet's row
  frame: 0,           // 0-3; the sheet's column
  target: 560,        // both figures scaled to this painted height
  pad: 40,
  bg: '#14100c',
  name: '',
  swap: -1,           // -1 tosses a coin; 0/1 pins it, for reproducing a round
};

function parseArgs(argv) {
  const o = { ...DEFAULTS };
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const k = argv[i].slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) { o[k] = 1; continue; }
    o[k] = /^-?[\d.]+$/.test(next) ? +next : next;
    i++;
  }
  return o;
}

export async function compare(o) {
  const rigFile = resolve(HERE, o.rig);
  if (!existsSync(rigFile)) throw new Error(`no rig frame at ${rigFile}`);

  // The coin is tossed in node, not in the page, so the page can be reloaded,
  // reopened or inspected without ever being able to change the answer.
  const swap = o.swap === -1 ? randomInt(2) : (o.swap ? 1 : 0);

  const q = new URLSearchParams({
    rig: `../../tools/gauntlet/${basename(rigFile)}`,
    sheet: `../../${o.sheet}`,
    cols: String(o.cols), rows: String(o.rows),
    col: String(o.frame), row: String(o.tier - 1),
    swap: String(swap),
    target: String(o.target), pad: String(o.pad), bg: String(o.bg),
  });
  const url = `${o.base}/tools/gauntlet/compare.html?${q}`;

  return withPage(async (page) => {
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e)));
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForSelector('body[data-ready]', { timeout: 20000 });
    const rep = await page.evaluate(() => window.__compare);
    if (!rep || !rep.ok) {
      throw new Error(`comparison failed: ${(rep && rep.error) || 'unknown'}`
        + `${errs.length ? '\n' + errs.join('\n') : ''}`
        + `\n${url}`);
    }
    // A slicer that finds a different number of cells has silently shifted
    // every tier after the stray one — the exact bug that cost this project two
    // sessions on props sheets. Say so rather than comparing the wrong armour.
    if (rep.cells !== rep.expected) {
      console.error(`WARNING  ${o.sheet} sliced ${rep.cells} cells, expected ${rep.expected}`
        + ` — cell ${rep.index} may not be tier ${o.tier} stride ${o.frame}`);
    }

    const data = await page.evaluate(() => document.getElementById('cv').toDataURL('image/png'));
    const name = o.name || `t${o.tier}-f${o.frame}`;
    const png = `compare-${name}.png`;
    const json = `compare-${name}.json`;
    mkdirSync(HERE, { recursive: true });
    writeFileSync(resolve(HERE, png), Buffer.from(data.split(',')[1], 'base64'));

    const key = {
      image: png,
      left: rep.left,
      right: rep.right,
      rig: basename(rigFile),
      bar: `${o.sheet} cell ${rep.index} (tier ${o.tier}, stride ${o.frame})`,
      cellsFound: rep.cells,
      cellsExpected: rep.expected,
      figureHeight: o.target,
      size: [rep.width, rep.height],
      note: 'Do not read this until the verdict is written. It is the answer key.',
    };
    writeFileSync(resolve(HERE, json), JSON.stringify(key, null, 2) + '\n');
    return { png: resolve(HERE, png), json: resolve(HERE, json), key };
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const o = parseArgs(process.argv.slice(2));
  if (!o.rig) {
    console.error('usage: node tools/gauntlet/compare.mjs --rig <png> --tier 1-5 --frame 0-3 [--name x]');
    process.exit(2);
  }
  const r = await compare(o);
  console.log(r.png);
  console.log(r.json);
}
