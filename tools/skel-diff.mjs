// Compares the skeletons of two FBX files, bone by bone.
//
//   node tools/skel-diff.mjs "art/mixamo/A.fbx" "art/mixamo/B.fbx"
//
// Written because one Warrok clip renders and five fold him in half, and every
// cheaper explanation had been tried and disproved: it is not the file the mesh
// comes from, not the position tracks, not the scale tracks, and not the
// filename. What is left is that the two downloads disagree about the skeleton
// itself — and that is a thing to measure rather than to argue about.
//
// A clip's rotation curves are meaningless without the rest pose they rotate
// *from*. If two files give the same bone a different rest translation or a
// different PreRotation, then a pose baked against one of them is not a pose at
// all when played on the other: every joint starts somewhere else and the error
// compounds down the chain, which is exactly what a figure folded in half looks
// like.

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { parse, readModels, readConnections } from './bake-clip.mjs';

const near = (a, b, tol) => Math.abs(a - b) <= tol;
const fmt = (v) => `[${v.map((x) => x.toFixed(2).padStart(8)).join(' ')}]`;

function skeleton(file) {
  const { root } = parse(readFileSync(file));
  const models = readModels(root);
  const { oo } = readConnections(root);
  for (const link of oo) {
    const m = models.get(link.child);
    if (m && models.has(link.parent)) m.parent = link.parent;
  }
  const byName = new Map();
  for (const m of models.values()) {
    if (m.name.startsWith('mixamorig')) byName.set(m.name, m);
  }
  return byName;
}

const [fileA, fileB] = process.argv.slice(2);
if (!fileA || !fileB) {
  console.error('usage: node tools/skel-diff.mjs <a.fbx> <b.fbx>');
  process.exit(1);
}

const a = skeleton(fileA);
const b = skeleton(fileB);

console.log(`\nA  ${basename(fileA)}   ${a.size} bones`);
console.log(`B  ${basename(fileB)}   ${b.size} bones\n`);

const onlyA = [...a.keys()].filter((k) => !b.has(k));
const onlyB = [...b.keys()].filter((k) => !a.has(k));
if (onlyA.length) console.log(`only in A: ${onlyA.join(', ')}`);
if (onlyB.length) console.log(`only in B: ${onlyB.join(', ')}`);

// A bone's rest translation is its length and offset from its parent, in
// centimetres. A tenth of a millimetre of disagreement is export noise; a
// centimetre is a different skeleton.
const shared = [...a.keys()].filter((k) => b.has(k));
let restDiff = 0, preDiff = 0;
const worst = [];
for (const name of shared) {
  const ma = a.get(name), mb = b.get(name);
  const dT = Math.max(...ma.translation.map((v, i) => Math.abs(v - mb.translation[i])));
  const dP = Math.max(...ma.preRotation.map((v, i) => Math.abs(v - mb.preRotation[i])));
  if (!near(dT, 0, 0.01)) restDiff++;
  if (!near(dP, 0, 0.01)) preDiff++;
  worst.push({ name, dT, dP, ma, mb });
}

console.log(`shared bones          ${shared.length}`);
console.log(`differing rest offset ${restDiff}`);
console.log(`differing PreRotation ${preDiff}\n`);

worst.sort((x, y) => (y.dT + y.dP) - (x.dT + x.dP));
for (const w of worst.slice(0, 8)) {
  if (w.dT < 0.01 && w.dP < 0.01) break;
  console.log(`${w.name}`);
  console.log(`  rest A ${fmt(w.ma.translation)}   pre A ${fmt(w.ma.preRotation)}`);
  console.log(`  rest B ${fmt(w.mb.translation)}   pre B ${fmt(w.mb.preRotation)}`);
}
if (!restDiff && !preDiff) console.log('The two skeletons are identical.');
console.log();
