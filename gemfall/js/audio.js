// Small synthesized sound kit: no audio files needed.
let ctx = null, master, sfxBus, musicBus, noiseBuf;
let sfxOn = true, musicOn = true, musicTimer = null, step = 0;

export function setPrefs(sfx, music) {
  sfxOn = sfx; musicOn = music;
  if (!ctx) return;
  sfxBus.gain.value = sfxOn ? 1 : 0;
  if (musicOn) startMusic(); else stopMusic();
}

export function unlock() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.gain.value = sfxOn ? 1 : 0; sfxBus.connect(master);
      musicBus = ctx.createGain(); musicBus.gain.value = 0.16; musicBus.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      if (musicOn) startMusic();
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch (e) { /* audio is optional */ }
}

function tone(freq, t, dur, type = 'sine', vol = 0.2, glide = null, bus = sfxBus) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(bus);
  o.start(t); o.stop(t + dur + 0.02);
}

function noise(t, dur, vol, freq, type = 'bandpass', sweep = null, bus = sfxBus) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = 1.2;
  if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(bus);
  s.start(t); s.stop(t + dur + 0.02);
}

const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760];

export function sfx(name, p = 0) {
  if (!ctx || !sfxOn) return;
  const t = ctx.currentTime + 0.01;
  switch (name) {
    case 'swap': tone(440, t, 0.08, 'triangle', 0.12, 660); break;
    case 'bad': tone(200, t, 0.09, 'square', 0.06); tone(160, t + 0.09, 0.12, 'square', 0.06); break;
    case 'match': {
      const f = SCALE[Math.min(SCALE.length - 1, p)];
      tone(f, t, 0.22, 'sine', 0.22); tone(f * 2, t, 0.12, 'triangle', 0.05); tone(f * 1.5, t + 0.04, 0.16, 'sine', 0.06);
      break;
    }
    case 'special': [784, 988, 1318, 1568].forEach((f, i) => tone(f, t + i * 0.05, 0.18, 'triangle', 0.12)); break;
    case 'streak': noise(t, 0.32, 0.28, 700, 'bandpass', 5000); tone(600, t, 0.25, 'sawtooth', 0.04, 2200); break;
    case 'burst': noise(t, 0.45, 0.5, 900, 'lowpass', 120); tone(140, t, 0.35, 'sine', 0.4, 45); break;
    case 'prism': for (let i = 0; i < 9; i++) tone(SCALE[i], t + i * 0.035, 0.22, 'sine', 0.09); noise(t, 0.6, 0.12, 3000, 'highpass'); break;
    case 'stone': noise(t, 0.16, 0.35, 1800, 'highpass'); tone(220, t, 0.08, 'square', 0.05, 90); break;
    case 'ice': tone(2093, t, 0.14, 'sine', 0.07); tone(2637, t + 0.03, 0.12, 'sine', 0.05); break;
    case 'chest': [988, 1318, 1976].forEach((f, i) => tone(f, t + i * 0.07, 0.2, 'square', 0.05)); break;
    case 'land': tone(180, t, 0.05, 'sine', 0.05, 120); break;
    case 'star': tone(880 + p * 220, t, 0.35, 'triangle', 0.14); tone(1320 + p * 330, t + 0.04, 0.3, 'sine', 0.08); break;
    case 'win': [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, t + i * 0.1, 0.45, 'triangle', 0.13)); tone(523, t + 0.5, 0.9, 'sine', 0.1); tone(784, t + 0.5, 0.9, 'sine', 0.08); break;
    case 'fail': [392, 330, 262, 196].forEach((f, i) => tone(f, t + i * 0.16, 0.3, 'triangle', 0.12)); break;
    case 'click': tone(720, t, 0.05, 'triangle', 0.1); break;
    case 'shuffle': for (let i = 0; i < 6; i++) tone(400 + Math.random() * 600, t + i * 0.04, 0.06, 'triangle', 0.06); break;
    case 'hammer': noise(t, 0.2, 0.45, 600, 'lowpass'); tone(110, t, 0.2, 'sine', 0.35, 60); break;
    case 'rush': tone(1046 + p * 60, t, 0.12, 'triangle', 0.1); break;
    case 'chain': noise(t, 0.12, 0.3, 3500, 'highpass'); tone(1400, t, 0.1, 'square', 0.04, 900); tone(900, t + 0.06, 0.12, 'square', 0.04, 600); break;
    case 'crystal': [1568, 2093, 2637].forEach((f, i) => tone(f, t + i * 0.03, 0.18, 'sine', 0.07)); noise(t, 0.2, 0.18, 2500, 'bandpass'); break;
    case 'creep': tone(220, t, 0.35, 'sawtooth', 0.05, 330); noise(t, 0.3, 0.1, 500, 'lowpass'); break;
    case 'defuse': tone(988, t, 0.1, 'triangle', 0.1); tone(1318, t + 0.08, 0.2, 'triangle', 0.1); break;
    case 'life': tone(392, t, 0.25, 'triangle', 0.1); tone(330, t + 0.18, 0.4, 'triangle', 0.1); break;
    case 'gift': [659, 784, 988, 1318, 1568].forEach((f, i) => tone(f, t + i * 0.06, 0.3, 'triangle', 0.11)); noise(t + 0.3, 0.5, 0.12, 4000, 'highpass'); break;
    case 'pop': tone(880, t, 0.08, 'sine', 0.14, 1320); break;
  }
}

// ---------- music: small looping tunes, one per area ----------
// Each track: tempo (ms per step), root (MIDI note), scale (semitones), melody (scale steps, -1 = rest),
// bass (one scale step per bar of 4 steps), and the instruments used.
const TRACKS = {
  menu: { tempo: 340, root: 72, scale: [0, 2, 4, 7, 9], mel: [0, 1, 2, 3, 2, 1, 4, 2, 0, 1, 2, 6, 3, 2, 1, -1], bass: [0, 0, -2, -1], lead: 'sine', bassWave: 'triangle' },
  caverns: { tempo: 320, root: 67, scale: [0, 2, 4, 7, 9], mel: [2, -1, 3, 4, 3, 2, 0, -1, 1, 2, 3, -1, 2, 1, 0, -1, 4, -1, 5, 4, 3, 2, 3, -1, 2, 1, 2, 3, 1, -1, 0, -1], bass: [0, -2, 3, -1, 0, -2, -1, 0], lead: 'triangle', bassWave: 'sine', bell: true },
  glow: { tempo: 380, root: 69, scale: [0, 3, 5, 7, 10], mel: [0, 2, 4, 2, 5, 4, 2, -1, 1, 3, 4, 3, 2, 1, 0, -1], bass: [0, -2, -1, -3], lead: 'sine', bassWave: 'sine', echo: true },
  forge: { tempo: 260, root: 62, scale: [0, 2, 3, 5, 7, 8, 10], mel: [0, -1, 0, 2, 4, -1, 3, 2, 0, -1, 0, 2, 5, 4, 3, -1, 4, -1, 4, 5, 7, 6, 5, 4, 3, 2, 3, 4, 2, -1, 0, -1], bass: [0, 0, -2, -3, 0, 0, -3, -2], lead: 'square', bassWave: 'triangle', perc: true, leadVol: 0.05 },
  ruins: { tempo: 360, root: 65, scale: [0, 2, 4, 5, 7, 9, 11], mel: [4, -1, 2, 0, 1, -1, 2, 4, 5, 4, 2, -1, 3, 2, 1, -1], bass: [0, -3, -2, -4], lead: 'triangle', bassWave: 'sine', echo: true },
  heart: { tempo: 300, root: 64, scale: [0, 2, 4, 5, 7, 9, 11], mel: [0, 2, 4, 7, 6, 4, 5, -1, 3, 5, 7, 9, 8, 7, 6, -1, 7, -1, 6, 5, 4, 5, 6, 4, 2, 4, 3, 1, 0, -1, 0, -1], bass: [0, -3, -2, -4, 0, -3, 1, 0], lead: 'triangle', bassWave: 'triangle', bell: true, perc: true },
  endless: { tempo: 300, root: 62, scale: [0, 2, 3, 5, 7, 9, 10], mel: [0, 4, 7, 4, 2, 4, 6, 4, 1, 4, 7, 9, 8, 7, 4, -1], bass: [0, -1, -3, -2], lead: 'sine', bassWave: 'triangle', echo: true, perc: true }
};
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
function noteOf(tr, deg, oct = 0) {
  const n = tr.scale.length, o = Math.floor(deg / n), i = ((deg % n) + n) % n;
  return hz(tr.root + tr.scale[i] + 12 * (o + oct));
}
let track = 'menu';
export function setTrack(name) {
  if (!TRACKS[name] || name === track) return;
  track = name; step = 0;
  if (musicTimer) { stopMusic(); startMusic(); }
}
function tick() {
  if (!ctx || ctx.state !== 'running') return;
  const tr = TRACKS[track], t = ctx.currentTime + 0.05, beat = tr.tempo / 1000;
  const d = tr.mel[step % tr.mel.length];
  if (d >= 0) {
    const f = noteOf(tr, d, -1), v = tr.leadVol || 0.12;
    tone(f, t, beat * 2.6, tr.lead, v, null, musicBus);
    if (tr.bell) tone(f * 2, t, beat * 1.2, 'sine', v * 0.35, null, musicBus);
    if (tr.echo) tone(f, t + beat * 1.5, beat * 2, 'sine', v * 0.35, null, musicBus);
  }
  if (step % 4 === 0) {
    const b = tr.bass[(step / 4 | 0) % tr.bass.length];
    tone(noteOf(tr, b, -2), t, beat * 4.6, tr.bassWave, 0.16, null, musicBus);
  }
  if (tr.perc && step % 2 === 1) noise(t, 0.05, 0.05, 6000, 'highpass', null, musicBus);
  step++;
}
function startMusic() {
  if (!ctx || musicTimer) return;
  musicTimer = setInterval(tick, TRACKS[track].tempo);
}
function stopMusic() { clearInterval(musicTimer); musicTimer = null; }
