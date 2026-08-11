// Builds art/particles.png from the Kenney particle pack.
//
//   node tools/particle-atlas.mjs
//
// The pack is 81 textures at 512px and lives in art/vfx/, which is gitignored
// input like everything else there. The emitter needs its handful shipped, so
// the eight it actually uses are downscaled into one 4x2 sheet of 96px cells —
// 25KB committed instead of 5MB referenced. The textures are white-on-alpha by
// design: colour comes from tinting at draw time, never from the file.
//
// Cell order is the contract with js/particles.js — TEX there indexes this.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { withPage } from './gauntlet/shot.mjs';

// fileURLToPath, not .pathname: the space in the folder name arrives %20-encoded
// from .pathname and readFileSync takes it literally.
const SRC = fileURLToPath(new URL('../art/vfx/PNG (Transparent)/', import.meta.url));
const CELL = 96;
const NAMES = ['smoke_08', 'dirt_02', 'spark_04', 'star_07',
               'light_02', 'circle_05', 'twirl_02', 'scorch_01'];

const data = NAMES.map((n) => 'data:image/png;base64,'
  + readFileSync(`${SRC}${n}.png`).toString('base64'));

const png = await withPage(async (page) => {
  await page.goto('about:blank');
  return page.evaluate(async (urls, cell) => {
    const imgs = await Promise.all(urls.map((u) => new Promise((res) => {
      const im = new Image(); im.onload = () => res(im); im.src = u;
    })));
    const c = document.createElement('canvas');
    c.width = cell * 4; c.height = cell * 2;
    const x = c.getContext('2d');
    imgs.forEach((im, i) => x.drawImage(im, (i % 4) * cell, ((i / 4) | 0) * cell, cell, cell));
    return c.toDataURL('image/png').split(',')[1];
  }, data, CELL);
});

writeFileSync(fileURLToPath(new URL('../art/particles.png', import.meta.url)), Buffer.from(png, 'base64'));
console.log(`art/particles.png  ${NAMES.length} cells of ${CELL}px:`, NAMES.join(' '));
