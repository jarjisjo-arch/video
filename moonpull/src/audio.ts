import { save } from './state';
// Every sound is synthesised: a small adaptive score plus effects, no audio files to license.
let ac: AudioContext | null = null;
let master: GainNode, music: GainNode, fx: GainNode, verb: GainNode, noise: AudioBuffer;
let rumble: { g: GainNode; f: BiquadFilterNode } | null = null, sea: { g: GainNode; f: BiquadFilterNode } | null = null;
const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const BPM = 88, BEAT = 60 / BPM, SIX = BEAT / 4;
const CHORDS = [[53, 57, 60, 64], [57, 60, 64, 67], [50, 53, 57, 60], [48, 52, 55, 59]]; // Fmaj7 Am7 Dm7 Cmaj7
const PENTA = [0, 2, 4, 7, 9];
let nextStep = 0, step = 0, flyStep = 0, flyT = 0;
let st = { energy: 0, lift: 0, fever: false, storm: 0, calm: true, on: false };

export function initAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  try {
    ac = new (window.AudioContext || (window as any).webkitAudioContext)();
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3; comp.connect(ac.destination);
    master = ac.createGain(); master.gain.value = 0.9; master.connect(comp);
    music = ac.createGain(); fx = ac.createGain(); music.connect(master); fx.connect(master);
    noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // reverb from a decaying noise impulse
    const len = ac.sampleRate * 2.6, ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const b = ir.getChannelData(c); for (let i = 0; i < len; i++) b[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    const conv = ac.createConvolver(); conv.buffer = ir; verb = ac.createGain(); verb.gain.value = 0.55; verb.connect(conv); conv.connect(master);
    const loop = (f0: number, q: number, out: GainNode) => { const s = ac!.createBufferSource(); s.buffer = noise; s.loop = true; const f = ac!.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = f0; f.Q.value = q; const g = ac!.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(out); s.start(); return { g, f }; };
    sea = loop(600, 0.4, fx); rumble = loop(120, 2, fx);
    applyVolumes();
  } catch { ac = null; }
}
export function applyVolumes() { if (!ac) return; music.gain.value = save.settings.music ? 0.55 : 0; fx.gain.value = save.settings.sfx ? 0.8 : 0; verb.gain.value = save.settings.music || save.settings.sfx ? 0.5 : 0; }
export function suspendAudio(on: boolean) { if (!ac) return; if (on) ac.suspend(); else ac.resume(); }

function tone(bus: AudioNode, f: number, dur: number, vol: number, type: OscillatorType = 'sine', when = 0, slide = 0, wet = 0.3, attack = 0.008) {
  if (!ac) return; const t = Math.max(ac.currentTime, when || ac.currentTime);
  const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * slide), t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0004, t + dur);
  o.connect(g); g.connect(bus); if (wet) { const s = ac.createGain(); s.gain.value = wet; g.connect(s); s.connect(verb); }
  o.start(t); o.stop(t + dur + 0.05);
}
function hiss(dur: number, vol: number, f0: number, f1: number, when = 0, type: BiquadFilterType = 'bandpass', bus?: AudioNode, wet = 0.15) {
  if (!ac) return; const t = Math.max(ac.currentTime, when || ac.currentTime);
  const s = ac.createBufferSource(); s.buffer = noise; const f = ac.createBiquadFilter(); f.type = type; f.Q.value = 0.8;
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.03, dur / 4)); g.gain.exponentialRampToValueAtTime(0.0004, t + dur);
  s.connect(f); f.connect(g); g.connect(bus ?? fx); if (wet) { const w = ac.createGain(); w.gain.value = wet; g.connect(w); w.connect(verb); }
  s.start(t, Math.random()); s.stop(t + dur + 0.05);
}
const chord = () => CHORDS[Math.floor(step / 32) % 4];

export const sfx = {
  launch(v: number) { hiss(0.45, 0.16 + Math.min(0.2, v / 3000), 500, 2400); },
  land(q: string, air: number) {
    if (q === 'perfect') { const c = chord(); c.forEach((n, i) => tone(fx, hz(n + 24), 0.9, 0.09, 'sine', (ac?.currentTime ?? 0) + i * 0.035, 0, 0.5)); tone(fx, hz(c[0] + 36), 0.6, 0.05, 'triangle'); hiss(0.25, 0.12, 2500, 900); }
    else if (q === 'good') hiss(0.3, 0.12 + Math.min(0.12, air * 0.1), 1600, 500);
    else { hiss(0.45, 0.3, 900, 200); tone(fx, 90, 0.3, 0.25, 'triangle', 0, 0.5, 0.1); }
  },
  fly() { if (!ac) return; const now = ac.currentTime; if (now - flyT > 1.2) flyStep = 0; flyT = now; const c = chord(); const n = c[0] + 24 + PENTA[flyStep % 5] + 12 * Math.floor(flyStep / 5 % 2); flyStep++; tone(fx, hz(n), 0.5, 0.11, 'sine', 0, 0, 0.45); tone(fx, hz(n + 12), 0.25, 0.03, 'triangle'); },
  ring() { const c = chord(); [0, 1, 2, 3].forEach(i => tone(fx, hz(c[i] + 24), 1.1, 0.1, 'sine', (ac?.currentTime ?? 0) + i * 0.06, 0, 0.6)); hiss(0.6, 0.1, 3000, 6000, 0, 'highpass'); },
  near() { hiss(0.32, 0.22, 400, 3400); tone(fx, hz(chord()[2] + 24), 0.3, 0.07, 'triangle'); },
  crash() { hiss(0.6, 0.45, 1200, 120); tone(fx, 70, 0.5, 0.45, 'sine', 0, 0.45, 0.2); tone(fx, 180, 0.2, 0.15, 'square', 0, 0.3, 0); },
  whale() { tone(fx, 58, 1.8, 0.35, 'sine', 0, 1.6, 0.6, 0.2); tone(fx, 87, 1.6, 0.18, 'triangle', 0, 1.5, 0.6, 0.3); hiss(1.2, 0.3, 300, 2500); },
  chain(n: number) { const c = chord(); for (let i = 0; i < 3; i++) tone(fx, hz(c[i] + 24 + Math.min(12, n)), 0.35, 0.07, 'triangle', (ac?.currentTime ?? 0) + i * 0.05, 0, 0.4); },
  fever(on: boolean) { if (on) { hiss(1.4, 0.2, 200, 5000, 0, 'bandpass', fx, 0.5); chord().forEach((n, i) => tone(fx, hz(n + 12), 1.6, 0.08, 'sawtooth', (ac?.currentTime ?? 0) + i * 0.08, 0, 0.7, 0.2)); } },
  win() { [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => tone(fx, hz(65 + s), 1.2, 0.1, 'triangle', (ac?.currentTime ?? 0) + i * 0.09, 0, 0.5)); },
  lose() { [7, 3, 0, -5].forEach((s, i) => tone(fx, hz(55 + s), 1.2, 0.13, 'triangle', (ac?.currentTime ?? 0) + i * 0.2, 0, 0.6)); hiss(1.5, 0.2, 800, 100); },
  thunder() { hiss(2.2, 0.5, 300, 40, 0, 'lowpass', fx, 0.6); },
  click() { tone(fx, 880, 0.06, 0.08, 'triangle', 0, 0, 0); tone(fx, 1320, 0.05, 0.03, 'sine', 0, 0, 0); },
  buy() { [0, 4, 7, 12].forEach((s, i) => tone(fx, hz(72 + s), 0.4, 0.1, 'triangle', (ac?.currentTime ?? 0) + i * 0.06, 0, 0.4)); },
  star(i: number) { tone(fx, hz(76 + [0, 4, 7][i]), 0.9, 0.16, 'sine', 0, 0, 0.6); tone(fx, hz(88 + [0, 4, 7][i]), 0.6, 0.05, 'triangle'); },
  coin() { tone(fx, hz(88), 0.12, 0.05, 'square', 0, 0, 0.1); tone(fx, hz(95), 0.18, 0.05, 'square', (ac?.currentTime ?? 0) + 0.05, 0, 0.1); },
};

/** Call every frame. energy 0..1 speed, lift 0..1 height, storm 0..1 closeness, calm for menus. */
export function score(energy: number, lift: number, fever: boolean, storm: number, calm: boolean) {
  if (!ac) return; st = { energy, lift, fever, storm, calm, on: true };
  const now = ac.currentTime;
  if (sea) { sea.g.gain.setTargetAtTime(calm ? 0.05 : 0.04 + energy * 0.08, now, 0.3); sea.f.frequency.setTargetAtTime(400 + energy * 1400, now, 0.4); }
  if (rumble) rumble.g.gain.setTargetAtTime(storm * 0.5, now, 0.4);
  if (nextStep < now - 0.2) nextStep = now + 0.05;
  while (nextStep < now + 0.12) { playStep(nextStep); nextStep += SIX; step++; }
}
function playStep(t: number) {
  const s = step % 16, c = chord(), { energy, lift, fever, calm } = st;
  if (step % 32 === 0) for (const n of c) { // pad, two bars per chord
    if (!ac) return; const o = ac.createOscillator(), o2 = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
    o.type = 'sawtooth'; o2.type = 'triangle'; o.frequency.value = hz(n - 12); o2.frequency.value = hz(n); o.detune.value = (Math.random() - 0.5) * 16;
    f.type = 'lowpass'; f.frequency.value = calm ? 600 : 700 + energy * 900; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.028, t + 1.2); g.gain.setValueAtTime(0.028, t + 32 * SIX - 1); g.gain.linearRampToValueAtTime(0, t + 32 * SIX + 0.6);
    o.connect(f); o2.connect(f); f.connect(g); g.connect(music); const w = ac.createGain(); w.gain.value = 0.6; g.connect(w); w.connect(verb);
    o.start(t); o2.start(t); o.stop(t + 32 * SIX + 0.7); o2.stop(t + 32 * SIX + 0.7);
  }
  if (!calm && energy > 0.15 && (s === 0 || s === 8 || (s === 10 && energy > 0.6))) tone(music, hz(c[0] - 24), 0.5, 0.22, 'sine', t, 0, 0.05); // bass
  if (!calm && energy > 0.45) { if (s % 8 === 0) tone(music, 110, 0.18, 0.3, 'sine', t, 0.35, 0); if (s % 2 === 0) hiss(0.06, 0.035 + energy * 0.03, 7000, 9000, t, 'highpass', music, 0); }
  // melody: pentatonic plucks that climb with the boat
  const p = calm ? (s % 4 === 0 ? 0.35 : 0) : s % 2 === 0 ? 0.25 + energy * 0.5 : energy * 0.15;
  if (Math.random() < p) { const deg = Math.max(0, Math.min(9, Math.round(lift * 7 + Math.random() * 3 - 1))); tone(music, hz(c[0] + 12 + PENTA[deg % 5] + 12 * Math.floor(deg / 5)), 1.1, 0.07, 'triangle', t, 0, 0.55); }
  if (fever && s % 2 === 0) tone(music, hz(c[(s / 2) % 4] + 36), 0.25, 0.035, 'sine', t, 0, 0.5); // fever arpeggio
}
export function quiet() { if (ac && sea) { sea.g.gain.setTargetAtTime(0.03, ac.currentTime, 0.3); rumble?.g.gain.setTargetAtTime(0, ac.currentTime, 0.3); } }
