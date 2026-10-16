// Synthesizes the soundtrack (120 BPM beat + SFX synced to promo.html) into out/audio.wav. Pure JS, no samples.
import { mkdirSync, writeFileSync } from 'node:fs';

const SR = 44100, DUR = 35, N = SR * DUR;
const drums = new Float32Array(N), music = new Float32Array(N), sfx = new Float32Array(N);
let seed = 3; const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;

// Adds fn(tt, i) for `len` seconds starting at t0 into buffer `buf`.
const add = (buf, t0, len, fn) => {
  const s = Math.floor(t0 * SR);
  for (let i = 0; i < len * SR && s + i < N; i++) if (s + i >= 0) buf[s + i] += fn(i / SR, i);
};

// --- instruments ---
const kick = t => { let ph = 0; add(drums, t, .4, tt => { ph += 2 * Math.PI * (45 + 120 * Math.exp(-tt * 30)) / SR; return Math.sin(ph) * Math.exp(-tt * 8) * .9; }); };
const clap = t => { let p = 0; for (const o of [0, .012, .024]) add(drums, t + o, .25, tt => { const n = noise(), hp = n - p; p = n; return hp * Math.exp(-tt * (o ? 60 : 18)) * .28; }); };
const hat = (t, a = .09) => { let p = 0; add(drums, t, .06, tt => { const n = noise(), hp = n - p; p = n; return hp * Math.exp(-tt * 70) * a; }); };
const crash = (t, a = .22) => { let p = 0; add(sfx, t, 2.2, tt => { const n = noise(), hp = n - p; p = n; return hp * Math.exp(-tt * 2.2) * a; }); };
const bass = (t, f, len) => { let ph = 0, lp = 0; add(music, t, len, tt => { ph = (ph + f / SR) % 1; lp += (2 * ph - 1 - lp) * .09; return lp * Math.min(1, tt * 200) * Math.exp(-tt * 3) * .5; }); };
const pluck = (t, f, len = .3, a = .06, buf = music) => { let ph = 0; add(buf, t, len, tt => { ph = (ph + f / SR) % 1; return ((ph < .5 ? 1 : -1) * .4 + Math.sin(2 * Math.PI * ph)) * Math.exp(-tt * 9) * a; }); };

// --- sfx ---
const thud = (t, a = .7) => { let ph = 0; add(sfx, t, .35, tt => { ph += 2 * Math.PI * (60 + 90 * Math.exp(-tt * 25)) / SR; return (Math.sin(ph) + noise() * Math.exp(-tt * 80) * .5) * Math.exp(-tt * 9) * a; }); };
const pop = (t, f = 700, a = .28) => { let ph = 0; add(sfx, t, .09, tt => { ph += 2 * Math.PI * f * (1 + tt * 14) / SR; return Math.sin(ph) * Math.exp(-tt * 35) * a; }); };
const ding = (t, f, a = .2, len = 1.2) => add(sfx, t, len, tt => (Math.sin(2 * Math.PI * f * tt) + .3 * Math.sin(2 * Math.PI * f * 2.76 * tt)) * Math.exp(-tt * 4) * a);
const tick = (t, f) => add(sfx, t, .03, tt => Math.sin(2 * Math.PI * f * tt) * Math.exp(-tt * 180) * .35);
const beep = t => add(sfx, t, .13, tt => (Math.sin(2 * Math.PI * 1800 * tt) > 0 ? 1 : -1) * .1 * Math.min(1, (.13 - tt) * 80));
const whoosh = (t, len = .5, a = .35) => { let lp = 0; add(sfx, t, len, tt => { const p = tt / len; lp += (noise() - lp) * (.02 + .4 * p); return lp * Math.sin(Math.PI * p) * a * 2.2; }); };
const scratch = t => { let ph = 0, lp = 0; add(sfx, t, .32, tt => { ph = (ph + (250 + 900 * Math.abs(Math.sin(2 * Math.PI * 7 * tt))) / SR) % 1; lp += ((2 * ph - 1) + noise() * .6 - lp) * .3; return lp * .3 * Math.sin(Math.PI * tt / .32); }); };
// Sad trombone "wah-wah": sawtooth with vibrato gliding down.
const womp = (t, f0, f1, len) => { let ph = 0, lp = 0; add(sfx, t, len, tt => { const f = f0 + (f1 - f0) * tt / len + 4 * Math.sin(2 * Math.PI * 6 * tt); ph = (ph + f / SR) % 1; lp += (2 * ph - 1 - lp) * .12; return lp * Math.min(1, tt * 30, (len - tt) * 10) * .32; }); };

// --- music: Am F C G, 120 BPM, drop at 3s, ends at 34s ---
const BEAT = .5, START = 3, END = 34;
const ROOTS = [110, 87.31, 130.81, 98];
const CHORDS = [[440, 523.25, 659.25], [349.23, 440, 523.25], [523.25, 659.25, 783.99], [392, 493.88, 587.33]];
for (let t = START, b = 0; t < END - 1e-9; t += BEAT, b++) {
  kick(t);
  if (b % 2) clap(t);
  hat(t + BEAT / 2);
  if (t >= 7) hat(t + BEAT * .75, .04);
  const bar = Math.floor(b / 4) % 4;
  bass(t, ROOTS[bar], .22); bass(t + .25, ROOTS[bar] * 2, .22);
  if (t >= 7) [0, 1, 2, 1].forEach((k, j) => pluck(t + j * .125, CHORDS[bar][(k + b) % 3] * (j === 3 ? 2 : 1)));
}
// Sidechain: music ducks under every kick.
for (let i = 0; i < N; i++) { const t = i / SR; if (t >= START && t < END) music[i] *= 1 - .6 * Math.exp(-(((t - START) % BEAT)) * 12); }

// --- S1 hook (0-3s): boring clock, sad trombone, record scratch, ERA! ---
for (let t = 0; t < 2.9; t += .5) tick(t, t % 1 ? 1500 : 2100);
thud(.15); thud(.55);
womp(.95, 311, 293, .35); womp(1.32, 293, 262, .45);
scratch(1.72);
thud(2.0, .9); pop(2.02, 500);
whoosh(2.45, .55, .5); crash(3.0, .3);

// --- S2 meet Guaxi ---
thud(3.55, .6); pop(3.72, 650); thud(5.0, .9); crash(5.0, .15); pop(5.5, 900);

// scene cuts
for (const b of [7, 12, 17, 23, 28]) whoosh(b - .3, .55);

// --- S3 today ---
[8.4, 8.55, 8.7, 8.85, 9.0].forEach((t, i) => pop(t, 600 + i * 120, .22));
[9.2, 9.5, 9.8].forEach((t, i) => pop(t, 500 + i * 150));
ding(10.6, 1046.5); ding(10.72, 1318.5);

// --- S4 scan ---
beep(14.0); pop(14.02, 1600, .15); whoosh(14.25, .35, .2);
pop(15.28, 350, .35); ding(15.45, 987.8, .18, .5); ding(15.53, 1318.5, .2, 1);

// --- S5 workout ---
pop(17.2, 500);
[18.0, 18.8, 19.6].forEach((t, i) => { pop(t, 800 + i * 200); ding(t + .02, [659.25, 783.99, 987.77][i], .1, .5); });
thud(20.4, .9); crash(20.4, .25);
[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => ding(20.45 + i * .08, f, .16));

// --- S6 streak ---
for (let i = 0; i < 21; i++) pop(23.8 + i * .055, 500 + i * 45, .12);
whoosh(25.1, 1.2, .2); pop(25.8, 450); pop(26.4, 900);

// --- S7 CTA ---
pop(28.15, 600); thud(28.5, .8); thud(29.4, .7); pop(29.42, 1100); whoosh(29.4, .5, .2);
pop(31.64, 380, .35); ding(31.66, 1318.5, .15); pop(32.2, 800);
// Final hit: big chord and crash.
thud(34, 1); crash(34, .3);
[261.63, 329.63, 392, 523.25, 659.25].forEach(f => pluck(34, f, 1, .09, sfx));

// --- mix + write 16-bit stereo WAV ---
const out = Buffer.alloc(44 + N * 4);
out.write('RIFF', 0); out.writeUInt32LE(36 + N * 4, 4); out.write('WAVEfmt ', 8);
out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22); out.writeUInt32LE(SR, 24);
out.writeUInt32LE(SR * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34); out.write('data', 36); out.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  const t = i / SR, fade = Math.min(1, (DUR - t) / .8);
  const v = Math.tanh((drums[i] * .8 + music[i] + sfx[i]) * 1.1) * .88 * fade;
  const s = Math.round(v * 32767);
  out.writeInt16LE(s, 44 + i * 4); out.writeInt16LE(s, 46 + i * 4);
}
mkdirSync('out', { recursive: true });
writeFileSync('out/audio.wav', out);
console.log('out/audio.wav', DUR + 's');
