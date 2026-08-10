// Bakes a Mixamo character into a sprite sheet the game can already read.
//
//   node tools/bake-doll.mjs --out art/xbot-walk.png --clip "Run With Sword" --frames 10 --loop
//   node tools/bake-doll.mjs --out art/xbot-combat.png \
//     --pose "Idle@0" --pose "Stable Sword Outward Slash@0.45"
//
// This is the other half of the question `tools/doll.html` was built to ask.
// That page proved a 3D figure reads better than the paperdoll assembles; this
// turns one into cells that `js/atlas.js` slices and `drawPaintedFighter` draws,
// so the doll arrives as *art* rather than as a renderer. Nothing at runtime
// knows three.js exists.
//
// **The sheets come out with real transparency, and that removes a step rather
// than adding one.** The magenta key in `atlas.js` exists because DALL·E cannot
// output an alpha channel; a render can, and the keying pass leaves pixels that
// are already transparent alone. So a baked doll needs no chroma, no fringe
// fade and no spill correction — it is strictly less machinery than the painted
// path, not more.
//
// One row per sheet, `cols` cells wide, each cell the same size. `sliceGrid`
// trims every cell to its own content and takes the anchor from the middle of
// the footprint, so a raised sword grows the cell upwards without moving where
// the hero's feet land.

import { writeFileSync, readdirSync } from 'node:fs';
import { withPage } from './gauntlet/shot.mjs';

const argv = process.argv.slice(2);
const opt = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i < 0 ? d : (argv[i + 1] ?? 1);
};
const all = (k) => argv.reduce((a, v, i) => (v === `--${k}` ? [...a, argv[i + 1]] : a), []);
const has = (k) => argv.includes(`--${k}`);

const char = String(opt('char', 'X Bot'));
const out = String(opt('out', ''));
const clip = opt('clip', null);
const poses = all('pose');
const frames = Number(opt('frames', 8));
const loop = has('loop');
// X Bot's texture map is not embedded in the copy we have, so his own material
// bakes out a flat red. `--clay` is the neutral maquette the comparison sheet
// used, and for this character it is the honest look rather than a stylisation.
const clay = has('clay');
// X Bot mimes every sword clip because Mixamo's character download carries no
// weapon. `--sword` builds one and hangs it off his right hand — see
// `attachSword` in tools/doll.html.
const sword = has('sword');
// See LIGHT in tools/doll.html: characters do not arrive at a common
// brightness and a sheet baked dark cannot be brightened later.
const light = Number(opt('light', 1));
// The cell is generous on purpose. A slash reaches well past the silhouette of
// a standing figure, and a cell that fits the idle clips the swing — which is
// invisible in the sheet and obvious in the game. `sliceGrid` trims the slack
// back off, so the only cost of headroom is file size.
const CELL_W = Number(opt('cellw', 320));
const CELL_H = Number(opt('cellh', 380));
const FH = Number(opt('fh', 230));       // bind-pose height in pixels
const BY = Number(opt('by', 0.88));      // ground line within the cell
const BASE = String(opt('base', `http://localhost:${process.env.PORT || 8124}`));
// Where the clip comes from, when this character has none of his own. Every
// Mixamo rig is the same skeleton, so one library of clips dresses all of them.
const motionChar = String(opt('motion', char));

/**
 * The file that carries this character's mesh.
 *
 * `<Character>.fbx` when he was downloaded on his own, and otherwise the first
 * `<Character>@<anything>.fbx` — a character downloaded together with an
 * animation has no bare file, and which animation it happened to be is not
 * something the caller should have to know.
 */
function findSkin() {
  const dir = new URL('../art/mixamo/', import.meta.url).pathname;
  const files = readdirSync(dir).filter((f) => f.endsWith('.fbx'));
  if (files.includes(`${char}.fbx`)) return char;
  const paired = files.find((f) => f.startsWith(`${char}@`));
  if (!paired) throw new Error(`no mesh file for "${char}" in art/mixamo/`);
  return paired.replace(/\.fbx$/, '');
}
const skin = findSkin();
// An alias for downloads named by hand rather than by Mixamo — `paladin-Idle`
// alongside `Paladin WProp J Nordstrom@Great Sword Casting`.
const alias = String(opt('alias', ''));

/**
 * The file holding one clip, under whichever of the four names it landed with.
 *
 * Mixamo names a download `<Character>@<Clip>.fbx`, an animation downloaded on
 * its own comes back as bare `<Clip>.fbx`, and anything renamed by hand is
 * whatever it was renamed to. Resolving here rather than in the page is not a
 * detail: this can read the directory and the page cannot, so the page is
 * handed an exact name and never guesses.
 */
function findClip(name) {
  const dir = new URL('../art/mixamo/', import.meta.url).pathname;
  const files = new Set(readdirSync(dir).filter((f) => f.endsWith('.fbx')));
  const tries = [`${char}@${name}`, alias && `${alias}-${name}`, name, `${motionChar}@${name}`];
  for (const t of tries) if (t && files.has(`${t}.fbx`)) return t;
  throw new Error(`no file for clip "${name}" (tried ${tries.filter(Boolean).join(', ')})`);
}

if (!out || (!clip && !poses.length)) {
  console.error('usage: node tools/bake-doll.mjs --out sheet.png (--clip NAME --frames N [--loop] | --pose "NAME@phase" ...)');
  process.exit(1);
}

/** One cell's URL. `p` pins a phase; without it the strip walks the clip. */
const url = (o) => {
  const q = new URLSearchParams({
    shot: '1', char, w: String(CELL_W * (o.strip || 1)), h: String(CELL_H),
    fh: String(FH), by: String(BY), bg: 'none', strip: String(o.strip || 1),
    clip: o.clip, clipfile: findClip(o.clip), skin, motion: motionChar,
  });
  if (o.p != null) q.set('p', String(o.p));
  if (clay) q.set('clay', '1');
  if (sword) q.set('sword', '1');
  if (light !== 1) q.set('light', String(light));
  if (o.loop) q.set('loop', '1');
  return `${BASE}/tools/doll.html?${q}`;
};

const shots = clip
  ? [{ clip: String(clip), strip: frames, loop }]
  : poses.map((spec) => {
    const at = spec.lastIndexOf('@');
    return { clip: spec.slice(0, at), p: Number(spec.slice(at + 1)), strip: 1 };
  });

const png = await withPage(async (page) => {
  const parts = [];
  for (const s of shots) {
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e)));
    await page.goto(url(s), { waitUntil: 'networkidle0' });
    try {
      await page.waitForSelector('body[data-ready]', { timeout: 60000 });
    } catch {
      throw new Error(`${s.clip} never became ready\n${errs.join('\n')}`);
    }
    parts.push(await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png')));
  }

  // Composed in the page because node has no image decoder and the browser is
  // already open. A strip shot arrives as one image of many cells and drops in
  // whole; separate poses arrive one cell each and are laid side by side.
  return page.evaluate(async (parts, cellW, cellH) => {
    const imgs = await Promise.all(parts.map((src) => new Promise((res) => {
      const im = new Image(); im.onload = () => res(im); im.src = src;
    })));
    const width = imgs.reduce((a, i) => a + i.width, 0);
    const c = document.createElement('canvas');
    c.width = width; c.height = cellH;
    const x = c.getContext('2d');
    let at = 0;
    for (const im of imgs) { x.drawImage(im, at, 0); at += im.width; }
    return c.toDataURL('image/png').split(',')[1];
  }, parts, CELL_W, CELL_H);
});

writeFileSync(out, Buffer.from(png, 'base64'));
const cols = clip ? frames : poses.length;
console.log(`${out}  ${cols} cells, ${CELL_W}x${CELL_H} each`);
