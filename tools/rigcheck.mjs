// Assert everything the skeleton must be true about itself.
//
//   node tools/rigcheck.mjs
//
// This exists because seven rig bugs were found one at a time, by eye, over a
// dozen rounds — a helmet worn on the stomach, arms growing up through the head,
// both arms drawn down the centre of the chest, boots standing on their heels,
// a cuirass facing backwards, knees bending the wrong way, and a walk that
// covered no ground. Every one of them is a property that can be stated as a
// number, and a number can be checked in a tenth of a second.
//
// It runs headless: `solve`, `plant` and `ANIMS` are pure maths and never touch
// a canvas, so nothing here needs a browser or a screenshot.

import { BONES, HIP, STRIDE, ANIMS, solve, REST } from '../js/rig.js';

const SAMPLES = 96;
const fails = [];
const notes = [];
const check = (ok, label, detail) => {
  (ok ? notes : fails).push(`${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? '   ' + detail : ''}`);
};

const byKey = Object.fromEntries(BONES.map(b => [b.key, b]));
const L = (k) => byKey[k].length;
const feet = ['footBack', 'footFront'];

// Height above the ground of a joint, once the figure has been dropped onto its
// planted foot. Up is negative in the solver, which is the one place a sign is
// easy to get backwards, so it is converted exactly once, here.
const height = (j, k, a, end = 'y') => -j[k][end] + (a.lift || 0);
const soleOf = (j, k, a) => Math.min(height(j, k, a), height(j, k, a, 'ty'));

// --- the skeleton is a skeleton ---------------------------------------------

check(BONES.every(b => !b.parent || byKey[b.parent]), 'every parent exists');
check(new Set(BONES.map(b => b.z)).size === BONES.length, 'draw order has no ties');

const slots = new Set(BONES.map(b => b.slot));
// Six now: the weapon joined them. A blade is the one piece of equipment that
// is rigid enough to be a bone, so it owns one rather than being anchored per
// pose. Raised deliberately — if this fails again, a slot appeared by accident.
check(slots.size === 6, 'six slots own bones', [...slots].join(', '));

for (const b of BONES) {
  let n = 0, p = b.parent;
  while (p && n < 50) { p = byKey[p].parent; n++; }
  if (n >= 50) check(false, `${b.key} is in a parent cycle`);
}

// --- the rest pose is a person ----------------------------------------------

const rest = solve(REST);
const ankle = HIP - L('thighFront') - L('shinFront');

check(Math.abs(ankle - 0.03) < 0.02, 'hips sit at thigh + shin + ankle',
  `ankle ${ankle.toFixed(3)} above the ground`);

const crown = -rest.head.ty;
// 1.0 exactly is the target, not the failure: the unit *is* the figure's height,
// so a correctly proportioned skeleton reaches it. The old upper bound of 1.0
// was written when the rig was 8% short and mistook that for normal.
check(crown > 0.9 && crown <= 1.001, 'the crown is the top of the figure', crown.toFixed(3));
check(BONES.every(b => -rest[b.key].ty <= crown + 1e-9), 'nothing reaches above the head');

// The window moves with the legs, on purpose, and this is the third time it has
// had to. It was written as 0.30–0.45 when the hips sat at 0.50 and the knee at
// 0.28: those were the thigh. The hips are at 0.44 now and the knee at 0.225
// (HIP 0.44, thigh 0.215, shin 0.195, ankle 0.030), so a 0.45 ceiling sits
// *above the belt* and would pass a figure whose arms stopped at its waist —
// which is the exact defect the assertion exists to catch, and one a shortened
// leg creates for free without any arm changing.
//
// So the window is restated from the bones rather than nudged: the thigh runs
// knee 0.225 to hip 0.44 and mid-thigh is 0.3325. The bottom is set a knee's
// width above the knee at 0.28 rather than at 0.225, because fingertips level
// with the kneecap are an ape, not a hero. The top is the hip itself, 0.44.
// Read the numbers off `BONES` if they move again; do not nudge the literals to
// fit whatever the rig currently does.
const fingertip = -rest.handFront.ty;
check(fingertip > 0.28 && fingertip < 0.44, 'hands hang around mid-thigh', fingertip.toFixed(3));

check(rest.upperArmFront.x !== rest.upperArmBack.x, 'the two arms are not in the same place',
  `${rest.upperArmBack.x.toFixed(3)} vs ${rest.upperArmFront.x.toFixed(3)}`);
check(rest.thighFront.x !== rest.thighBack.x, 'the two legs are not in the same place');

// Anything that hangs off the upward-running spine and is not the head must
// turn back down, or it grows out through the skull.
for (const b of BONES) {
  const up = rest[b.key].ty < rest[b.key].y - 1e-6;
  if (up && b.key !== 'spine' && b.key !== 'head') {
    check(false, `${b.key} points upward`, 'only the spine and head may');
  }
}

// --- the art conventions match the bones ------------------------------------
//
// These two are what a mirrored cuirass and a boot on its heel look like as
// numbers: a piece is drawn along its bone, so a bone that runs up or sideways
// needs the flag that says so, and one that does not must not have it.

for (const b of BONES) {
  const r = rest[b.key];
  const dy = r.ty - r.y, dx = r.tx - r.x;
  const upward = dy < -1e-6;
  const flat = Math.abs(dx) > Math.abs(dy);
  check(!!b.invert === upward, `${b.key}: invert matches its direction`,
    upward ? 'runs up' : 'runs down');
  check(!!b.sideways === flat, `${b.key}: sideways matches its direction`,
    flat ? 'runs flat' : 'runs vertical');
}

// --- the walk is a walk -----------------------------------------------------

check(STRIDE > 0, 'the body travels forwards', `STRIDE ${STRIDE.toFixed(3)}`);
check(STRIDE > 0.5 && STRIDE < 1.3, 'the stride is a human one',
  `${STRIDE.toFixed(3)} of height per cycle, two steps`);

// The cycle is sampled four frames at a time and laid under the four cells of
// `art/warrior-walk.png`, so *where* it is cut matters as much as what is in
// it. The sheet opens on a contact and passes on its second cell; a rig cut a
// quarter-cycle out of register answers the widest painted pose with its
// narrowest and grades as a different walk while every angle in it is right.
// That is invisible in any single frame, which is why it is asserted here.
const spreadAt = (p) => {
  const a = ANIMS.walk(p);
  return { open: a.thighFront - a.thighBack, front: a.thighFront };
};
const contact = spreadAt(0), passing = spreadAt(0.25);
check(contact.open > 0.12 && contact.front > 0, 'frame 0 of 4 is a contact, near leg leading',
  `legs ${contact.open.toFixed(3)} apart`);
check(Math.abs(passing.open) < 0.03, 'frame 1 of 4 is a passing pose',
  `legs ${passing.open.toFixed(3)} apart`);

let worstSole = 0, worstSlip = 0, swaps = 0, sunk = 0, kneeForward = 0;
let hipLow = 9, hipHigh = -9, prevFoot = null, prevWorld = null;

for (let i = 0; i <= SAMPLES * 2; i++) {
  const p = (i / SAMPLES) % 1;
  const cycles = Math.floor(i / SAMPLES);
  const a = ANIMS.walk(p);
  const j = solve(a);

  for (const k of ['shinBack', 'shinFront']) if ((a[k] || 0) > 1e-9) kneeForward++;

  const planted = soleOf(j, feet[0], a) < soleOf(j, feet[1], a) ? feet[0] : feet[1];
  worstSole = Math.max(worstSole, Math.abs(soleOf(j, planted, a)));

  // Nothing may be under the floor — not a toe, not a knee, not a fist.
  for (const b of BONES) if (height(j, b.key, a, 'ty') < -1e-6) sunk++;

  const world = STRIDE * (cycles + p) + j[planted].x + (a.shift || 0);
  if (prevFoot === planted && prevWorld !== null) {
    worstSlip = Math.max(worstSlip, Math.abs(world - prevWorld));
  } else if (prevFoot && prevFoot !== planted) swaps++;
  prevFoot = planted; prevWorld = world;

  const hip = HIP - (a.lift || 0);
  hipLow = Math.min(hipLow, hip); hipHigh = Math.max(hipHigh, hip);
}

check(kneeForward === 0, 'knees never bend forwards', `${kneeForward} frames`);
check(worstSole < 1e-6, 'the planted foot is always on the ground', worstSole.toFixed(6));

// A tenth of a millimetre on a two-metre man, and forty times smaller than one
// screen pixel at the size the hero is actually drawn. The floor is not zero
// because `shift` is read from a 240-entry table and interpolated between
// samples, so the residual is the table's resolution rather than the rig's —
// asserting exact zero was testing arithmetic, not anatomy.
check(worstSlip < 0.001, 'the planted foot never slides', worstSlip.toFixed(6));
check(sunk === 0, 'nothing sinks through the floor', `${sunk} frames`);
check(swaps >= 4, 'the feet take turns', `${swaps} swaps in 2 cycles`);

const bob = hipHigh - hipLow;
check(bob > 0.005 && bob < 0.08, 'the hips rise and fall, but do not bounce',
  `${bob.toFixed(3)} of height`);

// --- report -----------------------------------------------------------------

for (const line of notes) console.log(line);
if (fails.length) {
  console.log('');
  for (const line of fails) console.log(line);
}
console.log(`\n${notes.length} passed, ${fails.length} failed`);
process.exit(fails.length ? 1 : 0);
