// Bakes a Mixamo character into a sprite sheet the game can already read.
//
//   node tools/bake-doll.mjs --out art/xbot-walk.png --clip "Run With Sword" --frames 10 --loop
//   node tools/bake-doll.mjs --out art/xbot-combat.png \
//     --pose "Idle@0" --pose "Stable Sword Outward Slash@0.45"
//   node tools/bake-doll.mjs --out art/warrior-doll-walk.png --glb art/armour/warrior.glb \
//     --tiers 5 --clip "Walking-02" --frames 4 --loop
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
// **The armoured character, and how many rungs of him to bake.** `--glb` is a
// file from `tools/armour.py` — the same skeleton with five outfits skinned to
// it — and `--tiers 5` bakes the strip once per outfit, stacked into five rows.
// That shape is not a new idea: `tiered: true` and `row = wornTier - 1` already
// ship in js/entities.js and js/render.js for the painted warrior, so five rows
// out of here are five rows the game plays today with no runtime change at all.
const glb = opt('glb', null);
const tiers = Number(opt('tiers', 0));
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
// Phase 4: the key light's colour, and how hard the shading is stepped.
// `--key '#ffe0b0'` warms the figure to a biome; `--posterize 6` quantises each
// channel to six levels so the shading steps like paint instead of ramping like
// plastic. Both are bake-side by design — nothing at runtime learns about them.
const keyColour = opt('key', null);
const posterize = Number(opt('posterize', 0));
// The cell is generous on purpose. A slash reaches well past the silhouette of
// a standing figure, and a cell that fits the idle clips the swing — which is
// invisible in the sheet and obvious in the game. `sliceGrid` trims the slack
// back off, so the only cost of headroom is file size.
//
// **320 was sized for a hero holding a sword built out of primitives.** Since
// `tools/outfit.py` started hanging real weapons off the hand, a two-handed
// blade at full extension runs off the right-hand edge and the bake quietly
// ships a cropped sword. 420 clears the longest weapon in the pack with room
// to spare, and costs nothing but bytes.
const CELL_W = Number(opt('cellw', 420));
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
  // `<char>@<clip>` is Mixamo's own naming; `<char>-<clip>` is the one used
  // for downloads renamed by hand. Both mean "this file has the mesh in it".
  const paired = files.find((f) => f.startsWith(`${char}@`) || f.startsWith(`${char}-`));
  if (!paired) throw new Error(`no mesh file for "${char}" in art/mixamo/`);
  return paired.replace(/\.fbx$/, '');
}
// A GLB carries its own mesh, so there is no FBX skin to go looking for — and
// asking for one would fail for a character who only ever existed as a build.
const skin = glb ? null : findSkin();
// An alias for downloads named by hand rather than by Mixamo — `paladin-Idle`
// alongside `Paladin WProp J Nordstrom@Great Sword Casting`.
const alias = String(opt('alias', char));

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
  const tries = [`${char}@${name}`, alias && `${alias}-${name}`, name,
    `${motionChar}@${name}`, `${motionChar}-${name}`];
  for (const t of tries) if (t && files.has(`${t}.fbx`)) return t;
  // Last resort: any character's copy. The library is shared — a clip is the
  // same motion whoever it was downloaded on, and reduced to its rotations it
  // dresses anyone. This is how the Paladin dies with Warrok's Dying.
  const any = [...files].find((f) => f.endsWith(`@${name}.fbx`) || f.endsWith(`-${name}.fbx`));
  if (any) return any.replace(/\.fbx$/, '');
  throw new Error(`no file for clip "${name}" (tried ${tries.filter(Boolean).join(', ')}, and no other character has it)`);
}

if (!out || (!clip && !poses.length && !argv.includes('--seg'))) {
  console.error('usage: node tools/bake-doll.mjs --out sheet.png (--clip NAME --frames N [--loop] | --seg "NAME:N[:loop]" ... | --pose "NAME@phase" ...)');
  process.exit(1);
}

/** One cell's URL. `p` pins a phase; without it the strip walks the clip. */
const url = (o) => {
  const q = new URLSearchParams({
    shot: '1', char, w: String(CELL_W * (o.strip || 1)), h: String(CELL_H),
    fh: String(FH), by: String(BY), bg: 'none', strip: String(o.strip || 1),
    clip: o.clip, clipfile: findClip(o.clip), skin: skin || '', motion: motionChar,
    // Authored for this character, or borrowed? Borrowed plays rotations-only.
    foreign: (() => {
      const f = findClip(o.clip);
      return f === `${char}@${o.clip}` || f === `${alias}-${o.clip}` ? '0' : '1';
    })(),
  });
  if (o.p != null) q.set('p', String(o.p));
  if (glb) q.set('glb', String(glb));
  if (o.tier) q.set('tier', String(o.tier));
  if (clay) q.set('clay', '1');
  if (sword) q.set('sword', '1');
  if (light !== 1) q.set('light', String(light));
  if (keyColour) q.set('key', String(keyColour));
  if (o.loop) q.set('loop', '1');
  return `${BASE}/tools/doll.html?${q}`;
};

// **A row made of several clips, laid end to end.** `art/paladin-walk.png` is
// ten strides followed by six frames of a collapse, in one row, because
// `js/render.js` indexes `walk` and `death` as columns of a single sheet. One
// `--clip` cannot say that and sixteen `--pose` flags say it at sixteen page
// loads instead of two, so a segment is a clip plus how many frames of it:
//
//   --seg "Run With Sword:10:loop" --seg "Dying:6"
const segs = all('seg').map((s) => {
  const [name, n, mode] = String(s).split(':');
  return { clip: name, strip: Number(n), loop: mode === 'loop' };
});

const shots = segs.length ? segs : clip
  ? [{ clip: String(clip), strip: frames, loop }]
  : poses.map((spec) => {
    const at = spec.lastIndexOf('@');
    return { clip: spec.slice(0, at), p: Number(spec.slice(at + 1)), strip: 1 };
  });

// One row per armour tier, in the order the runtime indexes them: tier 1 is
// row 0. Without `--tiers` there is a single row and nothing about the sheet
// changes, which is what keeps every existing bake command working untouched.
const rowTiers = tiers ? Array.from({ length: tiers }, (_, i) => i + 1) : [0];

const png = await withPage(async (page) => {
  const rows = [];
  for (const tier of rowTiers) {
    const parts = [];
    for (const s of shots) {
      const errs = [];
      page.on('pageerror', (e) => errs.push(String(e)));
      await page.goto(url({ ...s, tier }), { waitUntil: 'networkidle0' });
      try {
        await page.waitForSelector('body[data-ready]', { timeout: 60000 });
      } catch {
        throw new Error(`${s.clip}${tier ? ` (tier ${tier})` : ''} never became ready\n${errs.join('\n')}`);
      }
      parts.push(await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png')));
    }
    rows.push(parts);
  }

  // Composed in the page because node has no image decoder and the browser is
  // already open. A strip shot arrives as one image of many cells and drops in
  // whole; separate poses arrive one cell each and are laid side by side.
  //
  // Rows are stacked in the same grid `Atlas.sheet` slices, so a tiered sheet
  // is a plain sheet with more rows — `sliceGrid` needs telling nothing new.
  return page.evaluate(async (rows, cellW, cellH, levels) => {
    const load = (src) => new Promise((res) => {
      const im = new Image(); im.onload = () => res(im); im.src = src;
    });
    const grid = await Promise.all(rows.map((r) => Promise.all(r.map(load))));
    const width = Math.max(...grid.map((r) => r.reduce((a, i) => a + i.width, 0)));
    const c = document.createElement('canvas');
    c.width = width; c.height = cellH * grid.length;
    const x = c.getContext('2d');
    grid.forEach((row, r) => {
      let at = 0;
      for (const im of row) { x.drawImage(im, at, r * cellH); at += im.width; }
    });

    // **Posterize is a canvas pass over the finished sheet, not a shader.**
    // Quantising in the material would fight the lighting per-fragment and
    // change with every light added later; doing it here means the step count
    // is a property of the *sheet*, which is the thing being art-directed.
    // Alpha is left alone — stepping it would tear the silhouette's edge.
    if (levels > 1) {
      const img = x.getImageData(0, 0, c.width, c.height);
      const d = img.data, q = levels - 1;
      for (let i = 0; i < d.length; i += 4) {
        if (!d[i + 3]) continue;
        for (let k = 0; k < 3; k++) d[i + k] = Math.round(Math.round(d[i + k] / 255 * q) / q * 255);
      }
      x.putImageData(img, 0, 0);
    }
    return c.toDataURL('image/png').split(',')[1];
  }, rows, CELL_W, CELL_H, posterize);
});

writeFileSync(out, Buffer.from(png, 'base64'));
const cols = shots.reduce((a, s) => a + (s.strip || 1), 0);
console.log(`${out}  ${cols} cells x ${rowTiers.length} row${rowTiers.length > 1 ? 's' : ''}, ${CELL_W}x${CELL_H} each`);
