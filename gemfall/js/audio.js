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

function noise(t, dur, vol, freq, type = 'bandpass', sweep = null) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = 1.2;
  if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(sfxBus);
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
  }
}

// Gentle looping background tune (pentatonic bells over a soft bass).
const MEL = [0, 2, 4, 7, 4, 2, 5, 4, 0, 2, 4, 9, 7, 4, 2, -1];
const BASS = [130.81, 130.81, 110, 98];
function startMusic() {
  if (!ctx || musicTimer) return;
  musicTimer = setInterval(() => {
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime + 0.05;
    const n = MEL[step % MEL.length];
    if (n >= 0) tone(SCALE[n] / 2, t, 0.9, 'sine', 0.12, null, musicBus);
    if (step % 4 === 0) tone(BASS[(step / 4 | 0) % BASS.length], t, 1.6, 'triangle', 0.16, null, musicBus);
    step++;
  }, 340);
}
function stopMusic() { clearInterval(musicTimer); musicTimer = null; }
