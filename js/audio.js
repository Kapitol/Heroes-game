// All sound is synthesised at runtime — no audio files anywhere in this project.

let ctx = null, master = null, droneGain = null;
let enabled = true;
let volume = 0.5, muted = false;

export function init() {
  if (ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) { enabled = false; return; }
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : volume;
  master.connect(ctx.destination);
  startDrone();
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

// Low, uneasy room tone that runs for the whole session.
function startDrone() {
  droneGain = ctx.createGain();
  droneGain.gain.value = 0.05;
  droneGain.connect(master);
  for (const f of [55, 82.5, 110.3]) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 190;
    const lfo = ctx.createOscillator(), lfoG = ctx.createGain();
    lfo.frequency.value = 0.06 + Math.random() * 0.05;
    lfoG.gain.value = 40;
    lfo.connect(lfoG).connect(lp.frequency);
    o.connect(lp).connect(droneGain);
    o.start(); lfo.start();
  }
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
