// Stacks PNGs into one labelled contact sheet.
//
//   node tools/gauntlet/stack.mjs --out sheet.png "The rig=a.png" "The doll=b.png"
//
// The gauntlet's whole method is that a judgement is made on one picture, not
// on two files opened in turn — a comparison held in memory is a comparison
// nobody can check. `compare.mjs` does this for the walk against the painted
// sheet; this is the general form, for when the two rows are not both rigs.
//
// It composes in the browser rather than in node because the browser is already
// here for the screenshots and node has no image decoder. Nothing is installed.

import { writeFileSync, readFileSync } from 'node:fs';
import { withPage } from './shot.mjs';

const argv = process.argv.slice(2);
const outAt = argv.indexOf('--out');
const out = outAt >= 0 ? argv[outAt + 1] : '';
const rows = argv.filter((a, i) => a !== '--out' && i !== outAt + 1).map((a) => {
  const at = a.indexOf('=');
  return { label: a.slice(0, at), file: a.slice(at + 1) };
});
if (!out || !rows.length) {
  console.error('usage: node tools/gauntlet/stack.mjs --out sheet.png "Label=file.png" ...');
  process.exit(1);
}

const data = rows.map((r) => ({
  label: r.label,
  url: 'data:image/png;base64,' + readFileSync(r.file).toString('base64'),
}));

const png = await withPage(async (page) => {
  await page.goto('about:blank');
  return page.evaluate(async (rows) => {
    const imgs = await Promise.all(rows.map((r) => new Promise((res) => {
      const im = new Image();
      im.onload = () => res(im);
      im.src = r.url;
    })));
    const PAD = 12, LABEL = 34;
    const w = Math.max(...imgs.map((i) => i.width));
    const h = imgs.reduce((a, i) => a + i.height + LABEL, 0) + PAD * (imgs.length + 1);
    const c = document.createElement('canvas');
    c.width = w + PAD * 2; c.height = h;
    const x = c.getContext('2d');
    x.fillStyle = '#0a0806';
    x.fillRect(0, 0, c.width, c.height);
    let y = PAD;
    for (let i = 0; i < imgs.length; i++) {
      x.fillStyle = '#c9a86a';
      x.font = '600 19px ui-sans-serif, system-ui, sans-serif';
      x.fillText(rows[i].label, PAD, y + 22);
      y += LABEL;
      x.drawImage(imgs[i], PAD, y);
      y += imgs[i].height + PAD;
    }
    return c.toDataURL('image/png').split(',')[1];
  }, data);
});

writeFileSync(out, Buffer.from(png, 'base64'));
console.log(out);
