// Cuts individual footfalls out of one long walking recording.
//
//   node tools/slice-steps.mjs "…/boots-on-gravel.mp3" step 5
//
// A footstep library is a handful of one-shots. What you can actually download
// is somebody walking for half a minute, which is the same sound thirty times
// with the spacing already baked in — useless to a game, because the game owns
// the spacing: the hero's stride is a distance, not a tempo, and a slowed hero
// has to take slower steps rather than skate.
//
// So the transients get found and cut out. The steps are then fired by
// `e.dist` and the recording's own rhythm is discarded, which is the whole
// point.
//
// **The decoding happens in the browser.** Node has no mp3 decoder and this
// project installs nothing; headless Chrome is already here for the renders
// and decodes anything it can play. The audio goes in as base64 and comes back
// as WAVs, which afconvert then turns into the same AAC as the rest of the
// bank.

import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { withPage } from './gauntlet/shot.mjs';

const [src, name = 'step', countArg = '5'] = process.argv.slice(2);
if (!src) {
  console.error('usage: node tools/slice-steps.mjs <recording.mp3> [name] [count]');
  process.exit(1);
}
const count = Number(countArg);

const slices = await withPage(async (page) => {
  await page.goto('about:blank');
  return page.evaluate(async (b64, want) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const buf = await ctx.decodeAudioData(bytes.buffer);
    const sr = buf.sampleRate;
    const d = buf.getChannelData(0);

    // --- find the transients ---------------------------------------------
    //
    // Short-time energy over 10ms windows. A footfall is a sharp rise, so what
    // is looked for is the *rise* rather than the level: gravel has a long
    // ragged tail that stays loud well after the foot has landed, and picking
    // maxima of the level alone lands the cut in the middle of the scatter
    // rather than on the impact.
    const win = Math.round(sr * 0.01);
    const frames = Math.floor(d.length / win);
    const energy = new Float32Array(frames);
    for (let f = 0; f < frames; f++) {
      let sum = 0;
      for (let i = f * win; i < (f + 1) * win; i++) sum += d[i] * d[i];
      energy[f] = Math.sqrt(sum / win);
    }

    const rise = new Float32Array(frames);
    for (let f = 1; f < frames; f++) rise[f] = Math.max(0, energy[f] - energy[f - 1]);

    // Sorted by how hard they hit, then thinned so no two are within 300ms —
    // that is shorter than any human stride, so it never merges two real steps,
    // and long enough to stop one impact being counted twice as it rings.
    const order = [...rise.keys()].sort((a, b) => rise[b] - rise[a]);
    const gap = Math.round(0.3 / 0.01);
    const picked = [];
    for (const f of order) {
      if (picked.length >= want) break;
      if (picked.some((p) => Math.abs(p - f) < gap)) continue;
      picked.push(f);
    }
    picked.sort((a, b) => a - b);

    // --- cut them out -----------------------------------------------------
    //
    // A little before the transient so the attack survives, and a fixed length
    // after it. The tail is faded rather than cut square: gravel is still
    // rattling at 300ms and a hard edge there is an audible click.
    const pre = Math.round(sr * 0.012);
    const len = Math.round(sr * 0.3);
    const fade = Math.round(sr * 0.08);
    const out = [];
    for (const f of picked) {
      const start = Math.max(0, f * win - pre);
      const n = Math.min(len, d.length - start);
      const cut = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const tail = i > n - fade ? (n - i) / fade : 1;
        cut[i] = d[start + i] * tail;
      }

      // 16-bit mono WAV, which is all afconvert needs from here.
      const bytesOut = new ArrayBuffer(44 + n * 2);
      const v = new DataView(bytesOut);
      const ascii = (at, s) => { for (let i = 0; i < s.length; i++) v.setUint8(at + i, s.charCodeAt(i)); };
      ascii(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); ascii(8, 'WAVEfmt ');
      v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
      v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true);
      v.setUint16(32, 2, true); v.setUint16(34, 16, true);
      ascii(36, 'data'); v.setUint32(40, n * 2, true);
      for (let i = 0; i < n; i++) {
        const s = Math.max(-1, Math.min(1, cut[i]));
        v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      }
      let bin = '';
      const u8 = new Uint8Array(bytesOut);
      for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
      out.push({ at: (f * win) / sr, wav: btoa(bin) });
    }
    return { total: buf.duration, found: picked.length, out };
  }, readFileSync(src).toString('base64'), count);
});

console.log(`${slices.total.toFixed(1)}s recording, ${slices.found} steps cut`);
slices.out.forEach((s, i) => {
  const wav = `audio/${name}-${i + 1}.wav`;
  const m4a = `audio/${name}-${i + 1}.m4a`;
  writeFileSync(wav, Buffer.from(s.wav, 'base64'));
  execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '96000', wav, m4a]);
  unlinkSync(wav);
  console.log(`  ${m4a}  from ${s.at.toFixed(2)}s`);
});
