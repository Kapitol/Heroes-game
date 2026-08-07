// All sound is synthesised at runtime — no audio files anywhere in this project.

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

export const sfx = {
  swing()      { noise({ dur: 0.13, gain: 0.13, freq: 1700, q: 0.8, type: 'highpass' }); },
  hit()        { tone(150, { type: 'square', dur: 0.09, gain: 0.2, slide: -80 });
                 noise({ dur: 0.1, gain: 0.2, freq: 480, q: 1.2 }); },
  crit()       { tone(320, { type: 'square', dur: 0.14, gain: 0.26, slide: -220 });
                 noise({ dur: 0.18, gain: 0.26, freq: 2200, q: 0.7, type: 'highpass' }); },
  hurt()       { tone(210, { type: 'sawtooth', dur: 0.22, gain: 0.24, slide: -130 }); },
  die()        { tone(180, { type: 'triangle', dur: 0.4, gain: 0.22, slide: -140 });
                 noise({ dur: 0.35, gain: 0.18, freq: 320, q: 0.9, delay: 0.03 }); },
  bones()      { for (let i = 0; i < 5; i++) noise({ dur: 0.05, gain: 0.1, freq: 2600 + Math.random() * 1800, q: 3, type: 'bandpass', delay: i * 0.045 }); },
  bank()       { tone(1180, { dur: 0.09, gain: 0.16 }); tone(1760, { dur: 0.12, gain: 0.12, delay: 0.05 }); },
  cleave()     { noise({ dur: 0.3, gain: 0.3, freq: 900, q: 0.5, type: 'bandpass' });
                 tone(90, { type: 'sawtooth', dur: 0.3, gain: 0.22, slide: -40 }); },
  fire()       { noise({ dur: 0.45, gain: 0.26, freq: 620, q: 0.4 });
                 tone(120, { type: 'sawtooth', dur: 0.4, gain: 0.18, slide: 300 }); },
  boom()       { noise({ dur: 0.55, gain: 0.34, freq: 220, q: 0.5, type: 'lowpass' });
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
  boss()       { tone(58, { type: 'sawtooth', dur: 1.6, gain: 0.3 });
                 tone(87, { type: 'sawtooth', dur: 1.6, gain: 0.18, delay: 0.1 });
                 noise({ dur: 1.2, gain: 0.16, freq: 180, q: 0.6, type: 'lowpass' }); },
};
