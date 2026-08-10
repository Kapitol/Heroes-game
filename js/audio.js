// Sound is synthesised at runtime, with one exception: the combat impacts.
//
// **The synth is still the floor, not the fallback of last resort.** Every
// sampled effect below is written as "play the sample, and if there is no
// sample play the tone" — so a missing file, a codec a browser does not want,
// or a fight that starts before the bank has finished decoding all degrade to
// the sound the game shipped with rather than to silence. Nothing had to be
// re-tuned to add samples, and nothing breaks if they are deleted.
//
// The files under `audio/` are converted, not raw. The pack ships 96kHz 24-bit
// stereo masters at 35MB; these are twelve of them at 44.1k AAC, 116KB the lot:
//
//   afconvert -f m4af -d aac@44100 -b 96000 in.wav audio/swing-1.m4a
//
// Only blades and fists are sampled. A synthesised sword is the one thing in
// this project that never convinced anyone — it is a filtered noise burst, and
// a real one has a body to it that an envelope cannot fake. Spells, coins,
// level-ups and the boss stinger stay synthetic, where the same argument does
// not apply and the files would only be weight.

let ctx = null, master = null, musicGain = null;
let enabled = true;
let volume = 0.5, muted = false, musicVolume = 0.4;

export function init() {
  if (ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) { enabled = false; return; }
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : volume;
  master.connect(ctx.destination);
  startMusic();
  loadBank();
}

export function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }

// 0..1. Kept in a module variable so a change made before the audio graph
// exists still applies once it does.
export function setVolume(v) {
  volume = Math.max(0, Math.min(1, v));
  if (master) master.gain.value = muted ? 0 : volume;
}
export function getVolume() { return volume; }
export function setMuted(m) {
  muted = !!m;
  if (master) master.gain.value = muted ? 0 : volume;
}
export function isMuted() { return muted; }

// Music rides under the effects on its own gain, so a player can push the score
// down to nothing and still hear the fight. Same module-variable trick as the
// master volume: settable before the graph exists.
export function setMusicVolume(v) {
  musicVolume = Math.max(0, Math.min(1, v));
  if (musicGain) musicGain.gain.value = musicVolume;
}
export function getMusicVolume() { return musicVolume; }

function env(node, t0, a, d, peak) {
  node.gain.setValueAtTime(0.0001, t0);
  node.gain.exponentialRampToValueAtTime(peak, t0 + a);
  node.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
}

function tone(freq, { type = 'sine', dur = 0.18, gain = 0.25, slide = 0, delay = 0 } = {}) {
  if (!ctx || !enabled) return;
  const t0 = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
  env(g, t0, 0.008, dur, gain);
  o.connect(g).connect(master);
  o.start(t0); o.stop(t0 + dur + 0.05);
}

function noise({ dur = 0.16, gain = 0.25, freq = 900, q = 1, type = 'bandpass', delay = 0 } = {}) {
  if (!ctx || !enabled) return;
  const t0 = ctx.currentTime + delay;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); env(g, t0, 0.006, dur, gain);
  src.connect(f).connect(g).connect(master);
  src.start(t0);
}

// The score.
//
// What used to sit here was one unchanging chord of detuned saws, and after a
// minute it stopped being atmosphere and started being tinnitus. This is a
// composed ambience instead: a slow walk through six chords of D aeolian, held
// six to nine seconds each, with a sparse plucked line over roughly half of
// them and real silence over the rest. Nothing is pre-baked into a loop —
// every bar picks its own chord, its own voicing and its own phrase, so an
// hour of play never plays the same bar twice.

const ROOT = 146.83;                          // D3, low enough to sit under the effects
const MODE = [0, 2, 3, 5, 7, 8, 10];          // aeolian, the only scale the piece ever uses

// Semitones off the root, and where each chord is allowed to go next. Keeping
// the successor lists short is what makes an entirely random walk still sound
// like it was written down: every move is one a composer would have made.
const CHORDS = {
  i:   { notes: [0, 3, 7],    next: ['VI', 'VII', 'iv', 'III'] },
  VI:  { notes: [-4, 0, 3],   next: ['III', 'VII', 'i', 'v'] },
  III: { notes: [3, 7, 10],   next: ['VII', 'VI', 'iv', 'i'] },
  VII: { notes: [-2, 2, 5],   next: ['i', 'VI', 'III'] },
  iv:  { notes: [5, 8, 12],   next: ['i', 'VII', 'v'] },
  v:   { notes: [7, 10, 14],  next: ['VI', 'i', 'III'] },
};

let chordKey = 'i', nextAt = 0, phrases = 0;

const pitch = (semi) => ROOT * Math.pow(2, semi / 12);
const pick = (a) => a[(Math.random() * a.length) | 0];
const between = (lo, hi) => lo + Math.random() * (hi - lo);

function startMusic() {
  musicGain = ctx.createGain();
  musicGain.gain.value = musicVolume;
  musicGain.connect(master);
  startBed();
  nextAt = ctx.currentTime + 0.4;
  // A polling scheduler rather than a chain of long timeouts: browsers clamp
  // timers hard in a backgrounded tab, and a chord that was queued by its
  // predecessor's callback would then land seconds late and audibly seam.
  setInterval(scheduleAhead, 400);
  scheduleAhead();
}

function scheduleAhead() {
  if (!ctx || !enabled) return;
  // Coming back from a suspended context leaves the cursor in the past, and
  // catching up bar by bar would fire the whole backlog at once.
  if (nextAt < ctx.currentTime) nextAt = ctx.currentTime + 0.2;
  const horizon = ctx.currentTime + 5;
  while (nextAt < horizon) nextAt += bar(nextAt);
}

// Lays down one chord at t0 and reports how long it holds, so the scheduler
// never needs to know anything about the music itself.
function bar(t0) {
  const chord = CHORDS[chordKey];
  const dur = between(6, 9);
  const voicing = chord.notes.map(n => n + (Math.random() < 0.25 ? 12 : 0));

  // Each chord outlives its own bar by a few seconds so its tail overlaps the
  // next one. Cut to length instead and the pad dips to nothing every time the
  // harmony turns over, which pulses like a tremolo rather than breathing.
  const span = dur + 3;
  for (const n of voicing) swell(pitch(n + 12), t0, span, 0.055);
  swell(pitch(chord.notes[0] - 12), t0, span, 0.075);

  // Two phrases running back to back is as much melody as this wants; the
  // third bar is always left open, which is where the piece gets its air.
  if (phrases < 2 && Math.random() < 0.6) {
    phrases++;
    let t = t0 + between(0.6, 2.2);
    for (let i = 0, n = 2 + ((Math.random() * 3) | 0); i < n && t < t0 + dur - 0.8; i++) {
      pluck(pitch(melodyNote(chord)), t);
      t += between(0.9, 2.3);
    }
  } else {
    phrases = 0;
  }

  chordKey = pick(chord.next);
  return dur;
}

// Chord tones three times as likely as the rest of the mode, which keeps the
// line consonant without pinning it to arpeggios.
function melodyNote(chord) {
  const tones = chord.notes.map(n => ((n % 12) + 12) % 12);
  const pool = [];
  for (const deg of MODE) {
    const weight = tones.includes(deg) ? 3 : 1;
    for (let i = 0; i < weight; i++) pool.push(deg + (Math.random() < 0.3 ? 36 : 24));
  }
  return pick(pool);
}

// A string-ish pad: three sawtooths a few cents apart so the beating does the
// work a real section's players would, behind a lowpass that opens as the note
// swells and closes as it dies.
function swell(freq, t0, dur, peak) {
  const g = ctx.createGain();
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(320, t0);
  lp.frequency.linearRampToValueAtTime(900, t0 + dur * 0.4);
  lp.frequency.linearRampToValueAtTime(340, t0 + dur);
  lp.Q.value = 0.6;

  const attack = dur * 0.3, release = dur * 0.7;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + release);

  for (const cents of [-7, 0, 6]) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    o.detune.value = cents;
    o.connect(lp);
    o.start(t0); o.stop(t0 + dur + 0.2);
  }
  lp.connect(g).connect(musicGain);
}

// The melodic voice, half harp and half struck bell: a fast attack and a long
// exponential tail, one octave doubled quietly underneath to give it body.
function pluck(freq, t0) {
  const dur = between(2.2, 3.6);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.09, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(4200, t0);
  lp.frequency.exponentialRampToValueAtTime(700, t0 + dur);

  const o = ctx.createOscillator(), o2 = ctx.createOscillator();
  o.type = 'triangle'; o.frequency.value = freq;
  o2.type = 'sine'; o2.frequency.value = freq * 0.5;
  const sub = ctx.createGain(); sub.gain.value = 0.4;
  o.connect(lp); o2.connect(sub).connect(lp);
  o.start(t0); o2.start(t0);
  o.stop(t0 + dur + 0.1); o2.stop(t0 + dur + 0.1);
  lp.connect(g).connect(musicGain);
}

// A breath of filtered noise under everything. It is the one part that never
// changes, so it is kept far too quiet to hear on its own — it only stops the
// silences between phrases from sounding like the game has crashed.
function startBed() {
  const len = ctx.sampleRate * 4;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf; src.loop = true;

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 240; lp.Q.value = 0.4;
  const lfo = ctx.createOscillator(), lfoG = ctx.createGain();
  lfo.frequency.value = 0.05; lfoG.gain.value = 90;
  lfo.connect(lfoG).connect(lp.frequency);

  const g = ctx.createGain(); g.gain.value = 0.09;
  src.connect(lp).connect(g).connect(musicGain);
  src.start(); lfo.start();
}

// --- the sample bank --------------------------------------------------------

// How many variants of each. A fight is dozens of swings a minute, and one
// recording played on a loop reads as a stuck key within seconds — the ear
// picks up the repeat long before it picks up the sound.
const BANK = {
  swing: 4, hit: 3, crit: 2, punch: 3, body: 3,
  // One take each. These are voices and events rather than blows — a death cry
  // happens once a run, a boss arrives once a stage — so there is nothing for
  // repetition to wear out, and a second variant would be weight for nothing.
  screamHero: 1, screamFoe: 1, growl: 1, laugh: 1, thud: 1, blast: 1,
};

// name -> [{ buffer, gain }]. Empty until `loadBank` resolves, which is why
// every caller has a synth branch behind it.
const bank = new Map();

// What every sample is normalised to. The pack is 24-bit studio masters cut at
// wildly different levels — a clash is far hotter than a slash — and mixing
// those raw would make the loudest one the volume of the game. Peak is
// measured off the decoded buffer rather than trusted from the file, so
// swapping a file in needs no accompanying number.
const PEAK = 0.7;

async function loadOne(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const buffer = await ctx.decodeAudioData(await res.arrayBuffer());
  let peak = 0;
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const d = buffer.getChannelData(c);
    for (let i = 0; i < d.length; i++) {
      const v = d[i] < 0 ? -d[i] : d[i];
      if (v > peak) peak = v;
    }
  }

  // **Where the sound actually starts.** The library files carry up to a
  // couple of hundred milliseconds of room tone before the first transient,
  // and a death cry that arrives a fifth of a second after the blow reads as
  // unrelated to it. Found rather than trimmed offline, so a file dropped in
  // needs no preparation: playback simply starts at the onset.
  const first = buffer.getChannelData(0);
  const floor = peak * 0.02;
  let onset = 0;
  while (onset < first.length && Math.abs(first[onset]) < floor) onset++;
  // A few milliseconds back, so the attack itself is not clipped off.
  const offset = Math.max(0, onset / buffer.sampleRate - 0.005);

  return { buffer, offset, gain: peak > 0.0001 ? PEAK / peak : 1 };
}

/**
 * Decode the bank in the background.
 *
 * Failures are swallowed per file on purpose. One sound that will not decode
 * should cost that one sound its sample, not take the other eleven down with
 * it — and the caller cannot tell the difference anyway, because it falls
 * through to the synth either way.
 */
function loadBank() {
  for (const [name, count] of Object.entries(BANK)) {
    const list = [];
    bank.set(name, list);
    for (let i = 1; i <= count; i++) {
      loadOne(`audio/${name}-${i}.m4a`).then((s) => list.push(s), () => {});
    }
  }
}

/**
 * Play one variant, or report that there was none to play.
 *
 * The pitch wobble is not decoration. Four slashes still repeat inside a long
 * fight; a few per cent either way on the playback rate makes each one land as
 * a different swing of the same sword rather than the same swing again.
 */
function sample(name, gain = 1, spread = 0.07, rate = 1) {
  if (!ctx || !enabled) return false;
  const list = bank.get(name);
  if (!list || !list.length) return false;
  const s = list[(Math.random() * list.length) | 0];
  const src = ctx.createBufferSource();
  src.buffer = s.buffer;
  src.playbackRate.value = rate * (1 + (Math.random() * 2 - 1) * spread);
  const g = ctx.createGain();
  g.gain.value = s.gain * gain;
  src.connect(g).connect(master);
  src.start(0, s.offset);
  return true;
}

export const sfx = {
  swing()      { if (sample('swing', 0.5)) return;
                 noise({ dur: 0.13, gain: 0.13, freq: 1700, q: 0.8, type: 'highpass' }); },
  hit()        { if (sample('hit', 0.6)) return;
                 tone(150, { type: 'square', dur: 0.09, gain: 0.2, slide: -80 });
                 noise({ dur: 0.1, gain: 0.2, freq: 480, q: 1.2 }); },
  // A crit keeps its synth layer *underneath* the sample rather than instead of
  // it. The low square slide is what makes a crit read as heavier than a hit,
  // and the sampled blades are all bright — dropped, every crit sounded thinner
  // than the ordinary hit it was supposed to beat.
  crit()       { if (sample('crit', 0.75)) { tone(320, { type: 'square', dur: 0.14, gain: 0.16, slide: -220 }); return; }
                 tone(320, { type: 'square', dur: 0.14, gain: 0.26, slide: -220 });
                 noise({ dur: 0.18, gain: 0.26, freq: 2200, q: 0.7, type: 'highpass' }); },
  // Something heavy and unarmed. The Butcher throws fists, not steel, and a
  // sword swing coming off a beast twice the hero's size was the one sound in
  // the fight that named the wrong creature.
  punch()      { if (sample('punch', 0.6)) return;
                 tone(120, { type: 'square', dur: 0.12, gain: 0.22, slide: -60 });
                 noise({ dur: 0.14, gain: 0.2, freq: 380, q: 1.0 }); },
  // **Hurt and death are the impact, plus the tone that was already there.**
  // There are no vocals in the pack — 105 files, every one a blade or a fist —
  // so nothing here is a cry. What the samples supply is the thud of a body
  // taking it, and the synth tone stays underneath at reduced gain doing what
  // it always did: standing in for the grunt. Replacing the tone outright made
  // being hit sound like hitting something, which is the wrong end of the blow.
  //
  // The gain is deliberately low. `hurt` fires on the same frame as the
  // attacker's `hit`, so it is the second sample in a single moment and has to
  // sit under the first or every exchange turns to mud.
  hurt()       { sample('body', 0.32, 0.09);
                 tone(210, { type: 'sawtooth', dur: 0.22, gain: 0.20, slide: -130 }); },
  // The same three impacts dropped a third of an octave. A body hitting the
  // ground is the impact of being hit, slower and heavier — pitching for that
  // is what the recordings can honestly be made to say, and it costs no files.
  die()        { sample('screamHero', 0.7);
                 sample('thud', 0.7, 0.04, 0.85);
                 tone(180, { type: 'triangle', dur: 0.4, gain: 0.18, slide: -140 }); },
  /**
   * Something else going down, pitched by how big it was.
   *
   * Monster deaths were silent — the killing blow's `hit` was the only sound,
   * so a body fell out of the fight without a sound of its own. It matters most
   * on the Butcher, who has six frames of collapse and had nothing under them.
   *
   * `scale` is the creature's own, so a Fallen One lands light and quick and a
   * boss lands slow and low off the same three recordings.
   */
  fall(scale = 1) {
    const rate = Math.max(0.55, Math.min(1.25, 1.15 / Math.max(0.5, scale)));
    // The cry is pitched harder than the body: a big thing sounds big mostly
    // because its voice is low, and a boss screaming at a Fallen One's pitch
    // is the giveaway.
    const cried = sample('screamFoe', 0.45, 0.05, rate * 0.9);
    if (sample('thud', 0.5, 0.07, rate) || cried) return;
    tone(150 * rate, { type: 'triangle', dur: 0.3, gain: 0.16, slide: -90 });
  },

  /**
   * A boss crossing its enrage threshold.
   *
   * The one beat in a fight that changes how it has to be played and had no
   * sound at all — a banner, a shake, and silence. A growl says the thing in
   * front of you got worse better than a caption does.
   */
  enrage()     { if (sample('growl', 0.75, 0.03, 0.9)) return;
                 tone(70, { type: 'sawtooth', dur: 0.7, gain: 0.24, slide: -20 }); },
  bones()      { for (let i = 0; i < 5; i++) noise({ dur: 0.05, gain: 0.1, freq: 2600 + Math.random() * 1800, q: 3, type: 'bandpass', delay: i * 0.045 }); },
  bank()       { tone(1180, { dur: 0.09, gain: 0.16 }); tone(1760, { dur: 0.12, gain: 0.12, delay: 0.05 }); },
  cleave()     { noise({ dur: 0.3, gain: 0.3, freq: 900, q: 0.5, type: 'bandpass' });
                 tone(90, { type: 'sawtooth', dur: 0.3, gain: 0.22, slide: -40 }); },
  fire()       { noise({ dur: 0.45, gain: 0.26, freq: 620, q: 0.4 });
                 tone(120, { type: 'sawtooth', dur: 0.4, gain: 0.18, slide: 300 }); },
  boom()       { if (sample('blast', 0.8, 0.05)) return;
                 noise({ dur: 0.55, gain: 0.34, freq: 220, q: 0.5, type: 'lowpass' });
                 tone(70, { type: 'square', dur: 0.45, gain: 0.26, slide: -30 }); },
  heal()       { tone(520, { dur: 0.3, gain: 0.16, slide: 340 });
                 tone(780, { dur: 0.35, gain: 0.12, slide: 260, delay: 0.06 }); },
  buff()       { tone(300, { type: 'square', dur: 0.28, gain: 0.14, slide: 300 }); },
  levelUp()    { [523, 659, 784, 1046].forEach((f, i) => tone(f, { type: 'triangle', dur: 0.3, gain: 0.16, delay: i * 0.09 })); },
  descend()    { tone(220, { type: 'triangle', dur: 0.8, gain: 0.2, slide: -120 });
                 noise({ dur: 0.9, gain: 0.14, freq: 300, q: 0.6, type: 'lowpass' }); },
  buy()        { tone(880, { type: 'triangle', dur: 0.1, gain: 0.16 });
                 tone(1320, { type: 'triangle', dur: 0.16, gain: 0.13, delay: 0.06 }); },
  deny()       { tone(150, { type: 'square', dur: 0.14, gain: 0.14, slide: -50 }); },
  // The laugh goes *over* the drone rather than instead of it. The drone is
  // what makes the screen feel heavier; the laugh is what makes it personal.
  boss()       { sample('laugh', 0.6);
                 tone(58, { type: 'sawtooth', dur: 1.6, gain: 0.3 });
                 tone(87, { type: 'sawtooth', dur: 1.6, gain: 0.18, delay: 0.1 });
                 noise({ dur: 1.2, gain: 0.16, freq: 180, q: 0.6, type: 'lowpass' }); },
};
