// Bakes a Mixamo motion clip onto the Crypt Heroes rig.
//
//   node tools/bake-clip.mjs "art/mixamo/X Bot@Withdrawing Sword.fbx" drawSword
//   node tools/bake-clip.mjs art/mixamo/*.fbx            (names inferred)
//
// The downloads in art/mixamo/ carry no skin — 0 meshes, 0 deformers, just a
// retargeted skeleton and its curves. There is nothing in them to draw. What
// there *is* is a joint angle per bone per frame, and that happens to be
// exactly what `rig.solve` eats, so the clip can drive the painted hero
// instead of replacing him: the armour, the bands and the weapon bone all
// survive, and only the pose comes from Mixamo.
//
// Three things have to happen to get from one to the other:
//
//   1. **Forward kinematics in 3D.** FBX stores a local rotation per bone plus
//      a PreRotation that Mixamo bakes the bind orientation into. Neither is
//      usable alone; the world matrix is.
//   2. **Projection to the sagittal plane.** The rig is a side view. A bone's
//      angle is the direction from its joint to its child, flattened onto the
//      plane the hero is drawn in, measured from straight down and positive
//      towards the way he faces — which is the convention `solve` uses.
//   3. **Back out the parent.** `solve` composes: a child inherits its
//      parent's direction, so the number stored per bone is a *delta* on the
//      parent and on the bone's own `rest`. Bake the absolute angle and every
//      elbow arrives with the shoulder added to it twice.
//
// The output is a plain module of frames, so nothing at runtime parses FBX.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { basename, dirname, join } from 'node:path';

const MAGIC = 'Kaydara FBX Binary  ';
const TURN = Math.PI * 2;
// FBX counts time in these per second, and has since the format was Kaydara's.
const FBX_TICKS = 46186158000;

// --- the binary format ---------------------------------------------------
//
// Lifted from coconut-republic/tools/fbx-check.mjs, which already reads this
// far into the format for its own checks. Records nest: each has an end
// offset, a property list, then children, then a null sentinel. Version 7500
// widened the offsets to 64 bits, which is the one version-dependent part.

function parse(buf) {
  if (buf.toString('ascii', 0, MAGIC.length) !== MAGIC) {
    throw new Error('not a binary FBX (ASCII FBX is not supported here)');
  }
  const version = buf.readUInt32LE(23);
  const wide = version >= 7500;
  const readOffset = (p) => (wide ? Number(buf.readBigUInt64LE(p)) : buf.readUInt32LE(p));
  const offsetSize = wide ? 8 : 4;
  const sentinel = wide ? 25 : 13;

  let pos = 27;
  const root = [];
  while (pos < buf.length - sentinel) {
    const node = readNode(pos);
    if (!node) break;
    root.push(node.node);
    pos = node.next;
  }
  return { version, root };

  function readNode(p) {
    const endOffset = readOffset(p);
    if (endOffset === 0) return null;
    const numProps = readOffset(p + offsetSize);
    const propLen = readOffset(p + offsetSize * 2);
    const nameLen = buf.readUInt8(p + offsetSize * 3);
    let q = p + offsetSize * 3 + 1;
    const name = buf.toString('ascii', q, q + nameLen);
    q += nameLen;

    const props = [];
    const propsEnd = q + propLen;
    for (let i = 0; i < numProps; i++) {
      const r = readProp(q);
      props.push(r.value);
      q = r.next;
    }
    q = propsEnd;

    const children = [];
    while (q < endOffset - sentinel) {
      const c = readNode(q);
      if (!c) break;
      children.push(c.node);
      q = c.next;
    }
    return { node: { name, props, children }, next: endOffset };
  }

  function readProp(p) {
    const type = String.fromCharCode(buf.readUInt8(p));
    p += 1;
    switch (type) {
      case 'Y': return { value: buf.readInt16LE(p), next: p + 2 };
      case 'C': return { value: buf.readUInt8(p) !== 0, next: p + 1 };
      case 'I': return { value: buf.readInt32LE(p), next: p + 4 };
      case 'F': return { value: buf.readFloatLE(p), next: p + 4 };
      case 'D': return { value: buf.readDoubleLE(p), next: p + 8 };
      case 'L': return { value: Number(buf.readBigInt64LE(p)), next: p + 8 };
      case 'S':
      case 'R': {
        const len = buf.readUInt32LE(p);
        const value = type === 'S' ? buf.toString('binary', p + 4, p + 4 + len) : null;
        return { value, next: p + 4 + len };
      }
      default: return readArray(type, p);
    }
  }

  function readArray(type, p) {
    const length = buf.readUInt32LE(p);
    const encoding = buf.readUInt32LE(p + 4);
    const compLen = buf.readUInt32LE(p + 8);
    let data = buf.subarray(p + 12, p + 12 + compLen);
    const next = p + 12 + compLen;
    if (encoding === 1) data = inflateSync(data);

    const out = [];
    const width = { f: 4, i: 4, b: 1, d: 8, l: 8 }[type];
    if (!width) return { value: null, next };
    for (let i = 0; i < length; i++) {
      const at = i * width;
      if (at + width > data.length) break;
      out.push(
        type === 'f' ? data.readFloatLE(at)
          : type === 'd' ? data.readDoubleLE(at)
            : type === 'i' ? data.readInt32LE(at)
              : type === 'l' ? Number(data.readBigInt64LE(at))
                : data.readUInt8(at));
    }
    return { value: out, next };
  }
}

function* walk(nodes) {
  for (const n of nodes) {
    yield n;
    yield* walk(n.children);
  }
}
const child = (node, name) => node.children.find((c) => c.name === name);

// --- the skeleton --------------------------------------------------------

/**
 * Every Model in the file, by id, with its parent, its rest transform and the
 * PreRotation Mixamo bakes the bind orientation into.
 *
 * Properties70 is a flat list of P records whose first property is the name
 * and whose last three are the value, which is why the numbers are read from
 * the end rather than from a fixed index — a P carries a type triple in front
 * of the value and the triple is not always the same width.
 */
function readModels(root) {
  const models = new Map();
  for (const n of walk(root)) {
    if (n.name !== 'Model') continue;
    const id = n.props[0];
    const name = String(n.props[1] || '').split('\0')[0].replace(/^Model::/, '');
    const props = child(n, 'Properties70');
    const get = (key, fallback) => {
      const p = props?.children.find((c) => c.name === 'P' && c.props[0] === key);
      if (!p) return fallback;
      const v = p.props.slice(-3).map(Number);
      return v.every((x) => Number.isFinite(x)) ? v : fallback;
    };
    models.set(id, {
      id, name, parent: null,
      translation: get('Lcl Translation', [0, 0, 0]),
      rotation: get('Lcl Rotation', [0, 0, 0]),
      preRotation: get('PreRotation', [0, 0, 0]),
      curves: {},                    // 'T'|'R' -> { X, Y, Z } -> curve
    });
  }
  return models;
}

/**
 * The two connection tables the clip needs.
 *
 * OO links a model to its parent. OP links a curve to a curve node and a curve
 * node to the property it drives, so two hops give both the axis and the kind:
 *
 *   AnimationCurve --OP "d|X"--> AnimationCurveNode --OP "Lcl Rotation"--> Model
 */
function readConnections(root) {
  const oo = [];
  const op = [];
  for (const n of walk(root)) {
    if (n.name !== 'Connections') continue;
    for (const c of n.children) {
      if (c.name !== 'C') continue;
      const link = { child: c.props[1], parent: c.props[2], prop: c.props[3] };
      if (c.props[0] === 'OO') oo.push(link);
      else if (c.props[0] === 'OP') op.push(link);
    }
  }
  return { oo, op };
}

function readClip(file) {
  const { root } = parse(readFileSync(file));
  const models = readModels(root);
  const { oo, op } = readConnections(root);

  for (const link of oo) {
    const m = models.get(link.child);
    if (m && models.has(link.parent)) m.parent = link.parent;
  }

  // curve node id -> { model, kind }, then curve id -> that plus its axis.
  const nodeTarget = new Map();
  for (const link of op) {
    if (typeof link.prop !== 'string' || link.prop.startsWith('d|')) continue;
    const kind = link.prop.includes('Translation') ? 'T'
      : link.prop.includes('Rotation') ? 'R'
        : link.prop.includes('Scaling') ? 'S' : null;
    if (kind && models.has(link.parent)) nodeTarget.set(link.child, { model: link.parent, kind });
  }
  const curveTarget = new Map();
  for (const link of op) {
    if (typeof link.prop !== 'string' || !link.prop.startsWith('d|')) continue;
    const t = nodeTarget.get(link.parent);
    if (t) curveTarget.set(link.child, { ...t, axis: link.prop.slice(2) });
  }

  let last = 0;
  for (const n of walk(root)) {
    if (n.name !== 'AnimationCurve') continue;
    const t = curveTarget.get(n.props[0]);
    if (!t) continue;
    const values = child(n, 'KeyValueFloat')?.props[0];
    const times = child(n, 'KeyTime')?.props[0];
    if (!Array.isArray(values) || !Array.isArray(times) || !values.length) continue;
    const seconds = times.map((x) => x / FBX_TICKS);
    last = Math.max(last, seconds[seconds.length - 1]);
    const m = models.get(t.model);
    (m.curves[t.kind] ||= {})[t.axis] = { times: seconds, values };
  }

  return { models, duration: last };
}

/**
 * A curve's value at a time, interpolated on its own key times.
 *
 * Sampling by index instead would be simpler and wrong: the Outward Slash
 * download has keyframe reduction left on, so its curves carry between 62 and
 * 140 keys for the same span of animation. Index 30 is a different moment on
 * every one of them. Time is the only thing they agree on.
 */
function sample(curve, t) {
  if (!curve) return null;
  const { times, values } = curve;
  if (t <= times[0]) return values[0];
  const n = times.length;
  if (t >= times[n - 1]) return values[n - 1];
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (times[mid] <= t) lo = mid; else hi = mid;
  }
  const span = times[hi] - times[lo];
  const f = span > 0 ? (t - times[lo]) / span : 0;
  return values[lo] + (values[hi] - values[lo]) * f;
}

// --- matrices ------------------------------------------------------------
//
// Row-major 3x3 for rotation, kept alongside a translation. Nothing here
// scales — Mixamo rigs come out at unit scale and a scale curve would only
// change bone lengths, which the rig takes from its own table anyway.

const mul = (a, b) => {
  const o = new Array(9);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      o[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
    }
  }
  return o;
};
const apply = (m, v) => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];

/** Euler XYZ in degrees, which is the order FBX defaults to and Mixamo exports. */
function euler(deg) {
  const [x, y, z] = deg.map((d) => (d * Math.PI) / 180);
  const cx = Math.cos(x), sx = Math.sin(x);
  const cy = Math.cos(y), sy = Math.sin(y);
  const cz = Math.cos(z), sz = Math.sin(z);
  const rx = [1, 0, 0, 0, cx, -sx, 0, sx, cx];
  const ry = [cy, 0, sy, 0, 1, 0, -sy, 0, cy];
  const rz = [cz, -sz, 0, sz, cz, 0, 0, 0, 1];
  return mul(rz, mul(ry, rx));
}

/**
 * Every joint's world position at a time.
 *
 * The local rotation is PreRotation then Lcl Rotation, in that order: Mixamo
 * puts the bind orientation in the first and the animation in the second, and
 * composing them the other way round hands every limb a fixed extra twist.
 */
function pose(models, t) {
  const world = new Map();
  const place = (m) => {
    if (world.has(m.id)) return world.get(m.id);
    const rot = m.curves.R || {};
    const tra = m.curves.T || {};
    const r = ['X', 'Y', 'Z'].map((a, i) => sample(rot[a], t) ?? m.rotation[i]);
    const p = ['X', 'Y', 'Z'].map((a, i) => sample(tra[a], t) ?? m.translation[i]);
    const local = mul(euler(m.preRotation), euler(r));

    const parent = m.parent != null ? models.get(m.parent) : null;
    const base = parent ? place(parent) : { m: [1, 0, 0, 0, 1, 0, 0, 0, 1], p: [0, 0, 0] };
    const offset = apply(base.m, p);
    const out = { m: mul(base.m, local), p: [base.p[0] + offset[0], base.p[1] + offset[1], base.p[2] + offset[2]] };
    world.set(m.id, out);
    return out;
  };
  for (const m of models.values()) place(m);
  return world;
}

// --- the rig -------------------------------------------------------------

/**
 * Which Mixamo bones each rig bone runs between, root to tip.
 *
 * `Front` is the near arm and leg — the side the camera is on — and it is
 * Mixamo's **right**. That is not a coin toss. A Mixamo figure faces +Z with
 * +Y up, so a camera on -X looking towards +X sees +Z as screen-right and the
 * figure walks the way the rig draws it; the side nearest that camera is the
 * character's right. It is also the hand that draws the sword, which is the
 * whole point of the clip: put the draw on the far arm and the body hides it.
 */
const CHAIN = {
  spine: ['mixamorig:Spine', 'mixamorig:Neck'],
  head: ['mixamorig:Neck', 'mixamorig:Head'],

  upperArmFront: ['mixamorig:RightArm', 'mixamorig:RightForeArm'],
  forearmFront: ['mixamorig:RightForeArm', 'mixamorig:RightHand'],
  handFront: ['mixamorig:RightHand', 'mixamorig:RightHandMiddle1'],
  upperArmBack: ['mixamorig:LeftArm', 'mixamorig:LeftForeArm'],
  forearmBack: ['mixamorig:LeftForeArm', 'mixamorig:LeftHand'],
  handBack: ['mixamorig:LeftHand', 'mixamorig:LeftHandMiddle1'],

  thighFront: ['mixamorig:RightUpLeg', 'mixamorig:RightLeg'],
  shinFront: ['mixamorig:RightLeg', 'mixamorig:RightFoot'],
  footFront: ['mixamorig:RightFoot', 'mixamorig:RightToeBase'],
  thighBack: ['mixamorig:LeftUpLeg', 'mixamorig:LeftLeg'],
  shinBack: ['mixamorig:LeftLeg', 'mixamorig:LeftFoot'],
  footBack: ['mixamorig:LeftFoot', 'mixamorig:LeftToeBase'],
};

/**
 * The rig's parent chain and rest angles, copied from `BONES` in js/rig.js.
 *
 * Duplicated rather than imported because rig.js is a browser module full of
 * canvas work and this is a node script. It is nine numbers and they are
 * checked: `--verify` re-solves the baked frames against the rig's own solver
 * and reports where a joint lands, so a drift between the two shows up as a
 * limb in the wrong place rather than as silence.
 */
const RIG = {
  spine: { parent: null, rest: 0.478 },
  head: { parent: 'spine', rest: -0.018 },
  upperArmBack: { parent: 'spine', rest: 0.494 },
  forearmBack: { parent: 'upperArmBack', rest: 0.062 },
  handBack: { parent: 'forearmBack', rest: 0 },
  upperArmFront: { parent: 'spine', rest: 0.494 },
  forearmFront: { parent: 'upperArmFront', rest: 0.062 },
  handFront: { parent: 'forearmFront', rest: 0 },
  thighBack: { parent: null, rest: 0 },
  shinBack: { parent: 'thighBack', rest: 0 },
  footBack: { parent: 'shinBack', rest: 0.25 },
  thighFront: { parent: null, rest: 0 },
  shinFront: { parent: 'thighFront', rest: 0 },
  footFront: { parent: 'shinFront', rest: 0.25 },
};

/** A knee bends one way only, and the rig says which: see `BONES` in rig.js. */
const KNEES = ['shinBack', 'shinFront'];

/**
 * A bone's absolute direction in the plane the hero is drawn in, in turns.
 *
 * Zero is straight down and positive is towards the way he faces, because that
 * is what `solve` means by an angle. Depth is dropped rather than projected
 * onto a squashed axis: a bone swinging out of the plane should read as a
 * short bone at the angle it makes on screen, which is what a side view of it
 * would look like, and scaling its depth first would bend it instead.
 */
function absolute(world, models, byName, key) {
  const [rootName, tipName] = CHAIN[key];
  const root = world.get(byName.get(rootName)?.id);
  const tip = world.get(byName.get(tipName)?.id);
  if (!root || !tip) return null;
  const dx = tip.p[0] - root.p[0];
  const dy = tip.p[1] - root.p[1];
  const dz = tip.p[2] - root.p[2];
  const flat = Math.hypot(dy, dz);
  const full = Math.hypot(dx, dy, dz);
  if (flat < 1e-9) return { angle: 0, confidence: 0 };
  // How much of the bone survives the projection, which is how much its screen
  // angle can be trusted. A bone pointing at the camera has a real 3D
  // direction and no side-view one: the two numbers that decide its angle are
  // both near zero, so a degree of noise in the mocap swings it right round.
  return { angle: Math.atan2(dz, -dy) / TURN, confidence: full > 1e-9 ? flat / full : 0 };
}

/** Fold a turn count into (-0.5, 0.5]. */
const wrap = (t) => {
  let v = t % 1;
  if (v > 0.5) v -= 1;
  if (v <= -0.5) v += 1;
  return v;
};

/**
 * The branch of an angle nearest to where it was last frame.
 *
 * `atan2` cannot tell a shoulder that has reached over the crown from one that
 * has dropped behind the hip: both come back as the same number a turn apart,
 * and folding each frame into (-0.5, 0.5] on its own picks whichever branch
 * happens to be nearer zero. On the Withdrawing Sword clip that put a 0.72
 * turn discontinuity in the middle of the draw — the arm reaching up and back
 * for the scabbard snapped to reaching down and forward for one frame, and the
 * elbow snapped the opposite way to compensate, because the elbow is measured
 * *through* the shoulder.
 *
 * Continuity is the only thing that resolves it, so every joint is unwrapped
 * along time before any parent is backed out. A limb that genuinely passes
 * straight up then reads as passing straight up.
 */
const nearest = (v, prev) => (prev == null ? wrap(v) : prev + wrap(v - prev));

function bake(file, frames) {
  const { models, duration } = readClip(file);
  const byName = new Map();
  for (const m of models.values()) byName.set(m.name, m);

  const missing = Object.values(CHAIN).flat().filter((n) => !byName.has(n));
  if (missing.length) {
    throw new Error(`skeleton is missing ${[...new Set(missing)].join(', ')}`);
  }

  // **Unwrap densely, then thin.** Continuity is what tells a shoulder reaching
  // over the crown from one dropping behind the hip, and continuity is only
  // readable if consecutive samples are closer together than half a turn. At
  // the 24 frames that ship, a 1.5s sword draw is sampled at 16Hz and the whip
  // of the elbow moves more than that between frames — so unwrapping there
  // guesses, and guesses wrong. Sampled dense the same motion is unambiguous,
  // and thinning afterwards cannot reintroduce the ambiguity because the branch
  // is already chosen.
  const dense = Math.max(frames * 8, 192);
  const track = [];
  const held = {};
  for (let i = 0; i < dense; i++) {
    // The last sample is dropped, not kept: a looping clip's final frame is the
    // first one again, and baking both makes the cycle stutter for one frame
    // every time round.
    const world = pose(models, (i / dense) * duration);
    const abs = {};
    const conf = {};
    for (const key of Object.keys(CHAIN)) {
      const a = absolute(world, models, byName, key);
      abs[key] = a ? wrap(a.angle) : null;
      conf[key] = a ? a.confidence : 0;
    }

    const frame = {};
    for (const [key, { parent, rest }] of Object.entries(RIG)) {
      if (abs[key] == null) continue;
      // **The joint angle is what gets unwrapped, not the bone's direction.**
      // Unwrapping the directions and subtracting them afterwards couples every
      // child to its parent's branch: an elbow measured through a shoulder that
      // has just picked up a turn picks up the turn too, and the sword draw
      // came out with a forearm travelling 1.2 turns through a 0.2 turn bend.
      // A difference of two wrapped angles is already correct to within a whole
      // turn, so the delta can be unwrapped on its own and nothing upstream can
      // contaminate it.
      const raw = abs[key] - (parent ? abs[parent] : 0) - rest;
      // A bone seen close to end-on is drawn wherever the noise puts it, so its
      // angle is faded out rather than trusted: at no confidence the bone lies
      // along its parent, which is the least-wrong thing a side view can say
      // about a bone it cannot see. It matters most at the wrist, where the
      // hand is short and the forearm's twist points it at the camera. The
      // parent's confidence counts too — an angle measured through a bone that
      // is itself end-on is no better than the bone it is measured through.
      const c = Math.min(conf[key], parent ? conf[parent] : 1);
      const trust = Math.min(1, Math.max(0, (c - 0.15) / 0.25));
      // Crossing the singularity also breaks the unwrap: the true angle really
      // does slew through half a turn there, and no history predicts which way.
      // The anchor is dropped rather than carried, so the joint comes back out
      // of the blind spot measured afresh from rest instead of a turn away
      // from it — and because it is faded to rest through the blind spot, that
      // re-anchoring happens where nothing is being drawn from it.
      const v = trust <= 0 ? (held[key] = null, 0) : (held[key] = nearest(raw, held[key]));
      frame[key] = v * trust;
    }
    track.push(frame);
  }

  const out = [];
  for (let i = 0; i < frames; i++) {
    const s = track[Math.round((i * dense) / frames)];
    const frame = {};
    for (const key of Object.keys(RIG)) {
      if (s[key] == null) continue;
      let v = s[key];
      // A knee that comes back positive is a leg breaking forwards, and it is
      // the projection rather than the mocap: a leg swinging across the camera
      // flattens until the shin's screen angle crosses the thigh's. Clamped to
      // straight, which is the pose it is passing through anyway.
      if (KNEES.includes(key) && v > 0) v = 0;
      frame[key] = Math.round(v * 1e4) / 1e4;
    }
    out.push(frame);
  }
  return { duration, frames: out };
}

// --- output --------------------------------------------------------------

const SLUG = {
  'withdrawing sword': 'drawSword',
  'stable sword inward slash': 'slashIn',
  'stable sword outward slash': 'slashOut',
  'run with sword': 'runSword',
};

function nameFor(file) {
  const clip = basename(file).replace(/\.fbx$/i, '').split('@')[1] || '';
  const key = clip.toLowerCase().replace(/\s*\(\d+\)$/, '').trim();
  return SLUG[key] || key.replace(/[^a-z0-9]+(.)/g, (_, c) => c.toUpperCase()).replace(/[^a-z0-9]/gi, '');
}

const KEYS = Object.keys(RIG);

function emit(name, source, { duration, frames }) {
  const rows = frames.map((f) => `  [${KEYS.map((k) => (f[k] ?? 0).toFixed(4)).join(', ')}],`).join('\n');
  return `// Baked from ${basename(source)} by tools/bake-clip.mjs. Do not hand-edit —
// re-run the baker instead, and change the clip or the baker if the pose is
// wrong. ${frames.length} frames over ${duration.toFixed(3)}s, one row per frame,
// one column per joint, every value a delta on the bone's rest angle in turns.

export const KEYS = ${JSON.stringify(KEYS)};

export const DURATION = ${duration.toFixed(4)};

export const FRAMES = [
${rows}
];
`;
}

// The parser and the skeleton reader are exported so `tools/skel-diff.mjs` can
// compare two rigs without a second copy of the format. The CLI below runs only
// when this file is the one invoked.
export { parse, walk, child, readModels, readConnections, readClip, pose, CHAIN, RIG };

if (process.argv[1] !== new URL(import.meta.url).pathname) {
  // Imported, not run. Nothing else here should happen.
} else {

const args = process.argv.slice(2);
const frames = Number(args.find((a) => a.startsWith('--frames='))?.slice(9) || 24);
const files = args.filter((a) => !a.startsWith('--'));
if (!files.length) {
  console.error('usage: node tools/bake-clip.mjs <clip.fbx> [more.fbx ...] [--frames=24]');
  process.exit(1);
}

const outDir = join(dirname(new URL(import.meta.url).pathname), '..', 'js', 'clips');
mkdirSync(outDir, { recursive: true });

for (const file of files) {
  const name = nameFor(file);
  try {
    const baked = bake(file, frames);
    const dest = join(outDir, `${name}.js`);
    writeFileSync(dest, emit(name, file, baked));
    const spread = KEYS.map((k) => {
      const vals = baked.frames.map((f) => f[k] ?? 0);
      return Math.max(...vals) - Math.min(...vals);
    });
    const busiest = KEYS[spread.indexOf(Math.max(...spread))];
    console.log(`${basename(file)}`);
    console.log(`  -> js/clips/${name}.js  ${baked.frames.length} frames, ${baked.duration.toFixed(2)}s`);
    console.log(`     busiest joint ${busiest} (${Math.max(...spread).toFixed(3)} turns)`);
  } catch (err) {
    console.error(`${basename(file)}\n  could not bake: ${err.message}`);
    process.exitCode = 1;
  }
}

}
