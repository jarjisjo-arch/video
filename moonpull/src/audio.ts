import { save } from './state';
// All sound is synthesised: no audio files, nothing to license.
let ac: AudioContext | null = null, master: GainNode, musicBus: GainNode, sfxBus: GainNode, noiseBuf: AudioBuffer;
let water: { g: GainNode; f: BiquadFilterNode } | null = null;
const SCALE = [0, 2, 4, 7, 9]; // major pentatonic
const ROOTS = [50, 53, 48, 55]; // D, F, C, G
let rootI = 0, nextNote = 0, nextChord = 0, flyStep = 0, flyT = 0;
const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export function initAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  try {
    ac = new (window.AudioContext || (window as any).webkitAudioContext)();
    master = ac.createGain(); master.gain.value = 0.9; master.connect(ac.destination);
    musicBus = ac.createGain(); musicBus.connect(master); sfxBus = ac.createGain(); sfxBus.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 0.6;
    const g = ac.createGain(); g.gain.value = 0; src.connect(f); f.connect(g); g.connect(sfxBus); src.start(); water = { g, f };
    applyVolumes();
  } catch { ac = null; }
}
export function applyVolumes() { if (!ac) return; musicBus.gain.value = save.settings.music ? 0.5 : 0; sfxBus.gain.value = save.settings.sfx ? 0.7 : 0; }
export function suspendAudio(on: boolean) { if (!ac) return; if (on) ac.suspend(); else ac.resume(); }

function tone(bus: GainNode, freq: number, dur: number, vol: number, type: OscillatorType = 'sine', when = 0, slide = 0) {
  if (!ac) return; const t = ac.currentTime + when;
  const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
  o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05);
}
function noise(dur: number, vol: number, f0: number, f1: number, when = 0) {
  if (!ac) return; const t = ac.currentTime + when;
  const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.9; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
  s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t, Math.random()); s.stop(t + dur + 0.05);
}

export const sfx = {
  fly() { if (!ac) return; const now = ac.currentTime; if (now - flyT > 1.4) flyStep = 0; flyT = now;
    const n = ROOTS[rootI] + 24 + SCALE[flyStep % 5] + 12 * Math.floor(flyStep / 5 % 2); flyStep++;
    tone(sfxBus, hz(n), 0.5, 0.16, 'sine'); tone(sfxBus, hz(n + 12), 0.3, 0.05, 'triangle'); },
  hit() { tone(sfxBus, 110, 0.35, 0.5, 'triangle', 0, 0.4); noise(0.3, 0.5, 900, 200); },
  near() { noise(0.28, 0.25, 500, 3200); tone(sfxBus, hz(ROOTS[rootI] + 31), 0.25, 0.08, 'sine'); },
  splash(s = 0.5) { noise(0.35, 0.15 + 0.3 * s, 1800, 500); },
  power() { tone(sfxBus, 80, 0.9, 0.4, 'sine', 0, 2.2); noise(0.8, 0.2, 200, 1400); },
  click() { tone(sfxBus, 660, 0.07, 0.12, 'triangle'); },
  buy() { [0, 4, 7].forEach((s, i) => tone(sfxBus, hz(74 + s), 0.3, 0.12, 'triangle', i * 0.07)); },
  star(i: number) { tone(sfxBus, hz(74 + [0, 4, 7][i]), 0.7, 0.2, 'sine'); tone(sfxBus, hz(86 + [0, 4, 7][i]), 0.5, 0.06, 'triangle'); },
  win() { [0, 2, 4, 7, 9, 12].forEach((s, i) => tone(sfxBus, hz(62 + s), 0.8, 0.13, 'sine', i * 0.09)); },
  lose() { [7, 4, 0].forEach((s, i) => tone(sfxBus, hz(50 + s), 0.9, 0.16, 'triangle', i * 0.18)); },
  mult(m: number) { tone(sfxBus, hz(62 + SCALE[(m - 1) % 5] + 12), 0.25, 0.1, 'triangle'); },
};

/** Called every frame while a scene is live. energy 0..1 (boat speed), lift 0..1 (how high the boat rides), swell = water motion. */
export function music(energy: number, lift: number, swell: number, calm = false) {
  if (!ac) return; const now = ac.currentTime;
  if (water) { water.g.gain.setTargetAtTime(Math.min(0.16, 0.025 + swell * 0.12), now, 0.2); water.f.frequency.setTargetAtTime(350 + swell * 900, now, 0.3); }
  if (now >= nextChord) {
    rootI = (rootI + 1) % ROOTS.length; nextChord = now + 7.5; const r = ROOTS[rootI];
    for (const iv of [0, 7, 16]) {
      const o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = hz(r - 12 + iv); o.detune.value = (Math.random() - 0.5) * 14;
      f.type = 'lowpass'; f.frequency.value = 520; g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.045, now + 2.5); g.gain.linearRampToValueAtTime(0, now + 9);
      o.connect(f); f.connect(g); g.connect(musicBus); o.start(now); o.stop(now + 9.2);
    }
  }
  if (now >= nextNote) {
    const rate = calm ? 0.9 : 0.5 - energy * 0.3; nextNote = now + rate * (Math.random() < 0.25 ? 2 : 1);
    if (Math.random() < 0.35 + energy * 0.55) {
      const deg = Math.max(0, Math.min(9, Math.round(lift * 7 + (Math.random() * 3 - 1))));
      const n = ROOTS[rootI] + 12 + SCALE[deg % 5] + 12 * Math.floor(deg / 5);
      tone(musicBus, hz(n), 1.3, 0.11, 'triangle'); tone(musicBus, hz(n), 1.8, 0.06, 'sine', 0.02);
    }
  }
}
export function quietWater() { if (ac && water) water.g.gain.setTargetAtTime(0, ac.currentTime, 0.3); }
