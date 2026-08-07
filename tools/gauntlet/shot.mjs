// A photograph of the rigged hero, taken without a human in the room.
//
//   node tools/gauntlet/shot.mjs --tier 3 --state walk --frame 1 --out rig-t3-f1.png
//
// The gauntlet is a loop of build → shoot → critique, and the shooting has to
// cost nothing or the loop does not run. This drives `tools/rig.html` through
// its query string in headless Chrome and writes the canvas out as a PNG.
//
// Two decisions here are load-bearing:
//
//   **The pixels come from `canvas.toDataURL`, not from a page screenshot.**
//   A screenshot is of a viewport, so it inherits device pixel ratio, scroll
//   position, page chrome and whatever the compositor felt like doing. Reading
//   the canvas back gives exactly the buffer the rig drew into — the same
//   bytes on any machine.
//
//   **It waits on `body[data-ready]`, not on a timer.** The armour sheets are
//   chroma-keyed and sliced at load; a shutter that fires early catches a bare
//   skeleton, and a round spent critiquing missing armour is a round wasted.
//
// Nothing is installed for this. puppeteer-core and a Chrome build are already
// on the machine and are imported from where they sit.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const PUPPETEER = '/Users/natechapman/.npm/_npx/fd355c6121ed2f2b/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const CHROME = '/Users/natechapman/.cache/puppeteer/chrome/mac_arm-151.0.7922.47/'
  + 'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const HERE = dirname(new URL(import.meta.url).pathname);

/**
 * A headless Chrome page, handed to `fn` and closed afterwards.
 *
 * Shared so `compare.mjs` does not repeat the two absolute paths above. They are
 * absolute on purpose: nothing here is installed, and a relative resolve would
 * mean an `npm install` this project does not want.
 */
export async function withPage(fn) {
  const { default: puppeteer } = await import(pathToFileURL(PUPPETEER).href);
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  try {
    return await fn(await browser.newPage());
  } finally {
    await browser.close();
  }
}

export const DEFAULTS = {
  base: `http://localhost:${process.env.PORT || 8124}`,
  tier: 1,
  state: 'walk',
  frame: 0,
  frames: 4,          // art/warrior-walk.png has four strides; frames line up
  w: 480,
  h: 720,
  fh: 560,            // figure height in pixels, crown to sole
  by: 0.94,           // the ground line, as a fraction of the canvas height
  bg: 'none',         // transparent by default — the comparison supplies its own
  art: 1,
  stick: 0,
  travel: 0,
  out: '',
};

export function parseArgs(argv) {
  const o = { ...DEFAULTS };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const k = a.slice(2);
    // `--stick` with no value means on; anything else takes the next token.
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) { o[k] = 1; continue; }
    o[k] = /^-?[\d.]+$/.test(next) ? +next : next;
    i++;
  }
  return o;
}

/** The rig URL for one frame. Deterministic: same options, same picture. */
export function shotURL(o) {
  const q = new URLSearchParams({
    shot: '1',
    tier: String(o.tier),
    state: String(o.state),
    frame: String(o.frame),
    frames: String(o.frames),
    art: String(o.art),
    stick: String(o.stick),
    travel: String(o.travel),
    play: '0',
    w: String(o.w),
    h: String(o.h),
    fh: String(o.fh),
    by: String(o.by),
    bg: String(o.bg),
  });
  return `${o.base}/tools/rig.html?${q}`;
}

/**
 * Shoot one frame. Returns the PNG buffer, and writes it if `out` is set.
 *
 * `page` is optional: the gauntlet shoots five tiers at a time and paying for a
 * browser launch per frame is most of the wall clock.
 */
export async function shoot(o, page) {
  if (!page) return withPage((p) => shoot(o, p));
  {
    const url = shotURL(o);
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e)));
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForSelector('body[data-ready="1"]', { timeout: 15000 });
    // One more frame after the flag, so the ready frame is the drawn frame
    // rather than the one that discovered it could be drawn.
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    const data = await page.evaluate(() => document.getElementById('cv').toDataURL('image/png'));
    if (errs.length) console.error('page errors:\n  ' + errs.join('\n  '));
    const buf = Buffer.from(data.split(',')[1], 'base64');
    if (o.out) {
      const file = resolve(HERE, o.out);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, buf);
    }
    return buf;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const o = parseArgs(process.argv.slice(2));
  if (!o.out) o.out = `rig-t${o.tier}-${o.state}-f${o.frame}.png`;
  const buf = await shoot(o);
  console.log(`${resolve(HERE, o.out)}  ${buf.length} bytes`);
  console.log(shotURL(o));
}
