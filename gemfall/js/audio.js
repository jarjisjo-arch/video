// Sound kit: recorded effects (Kenney, CC0) for the main moments, synthesized sounds for the rest and as a fallback.
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
      musicBus = ctx.createGain(); musicBus.gain.value = MUSIC_VOL; musicBus.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      if (musicOn) startMusic();
      loadBank();
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch (e) { /* audio is optional */ }
}

let layer = 1; // scales synthesized sound effects that play underneath a recorded one
function tone(freq, t, dur, type = 'sine', vol = 0.2, glide = null, bus = sfxBus, attack = 0.008) {
  if (bus === sfxBus) vol *= layer;
  if (vol <= 0.0002) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(bus);
  o.start(t); o.stop(t + dur + 0.02);
}

function noise(t, dur, vol, freq, type = 'bandpass', sweep = null, bus = sfxBus, q = 1.2) {
  if (bus === sfxBus) vol *= layer;
  if (vol <= 0.0002) return;
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(bus);
  s.start(t); s.stop(t + dur + 0.02);
}

// ---------- recorded effects (Kenney, CC0) ----------
// BANK: plain recorded clips. files: variants picked at random; vol: loudness; rate(p): pitch for the event's level;
// layer: how much of the synthesized sound still plays underneath (0 = none); duck: seconds to lower the music.
const SFX_DIR = 'assets/sfx/';
const n5 = (base, ks) => ks.map((k) => `${base}_00${k}`);
const BANK = {
  chain: { files: n5('impactMetal_light', [1, 2, 4]), vol: 0.5 },
  crystal: { files: n5('impactGlass_medium', [0, 2, 4]), vol: 0.5, layer: 0.4 },
  hammer: { files: n5('impactPunch_heavy', [1, 3]), vol: 0.8, layer: 0.5 },
  defuse: { files: ['confirmation_004'], vol: 0.27 },
  pop: { files: ['drop_001'], vol: 0.7 }
};

// RECIPES: the designed sounds (option C on the listening page). Each layers recordings with bells and sparkle
// tuned to C major pentatonic, the music's key. gain keeps them at the balance the game already had.
const PENT = [1046.5, 1174.7, 1318.5, 1568.0, 1760.0, 2093.0, 2349.3, 2637.0, 3136.0];
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const RECIPES = {
  match: { gain: 0.91, play(p, t) {
    const k = Math.min(p, 7), f = PENT[k + 1];
    clip(pick(['impactGlass_light_000', 'impactGlass_light_002', 'impactGlass_light_004']), t, { rate: 1.12 + Math.min(p, 8) * 0.06, vol: 0.32 });
    bell(f, t + 0.004, 0.5, 0.16); bell(f * 1.5, t + 0.035, 0.32, 0.055);
    sparkle(t + 0.02, 3, 0.12, 0.022);
  } },
  special: { gain: 1.19, play(p, t) {
    noise(t, 0.38, 0.1, 700, 'bandpass', 5200, sfxBus, 0.9);
    clip('maximize_002', t, { vol: 0.22 });
    [PENT[0], PENT[2], PENT[3], PENT[5]].forEach((f, i) => bell(f, t + 0.05 + i * 0.055, 0.55, 0.11));
    sparkle(t + 0.2, 6, 0.3, 0.025);
  } },
  streak: { gain: 1.65, play(p, t) {
    noise(t, 0.3, 0.32, 300, 'bandpass', 7000, sfxBus, 0.8);
    tone(520, t, 0.26, 'sawtooth', 0.025, 2600);
    clip('impactMetal_light_000', t + 0.05, { vol: 0.35, rate: 1.1 });
    bell(PENT[5], t + 0.06, 0.4, 0.07);
    sparkle(t + 0.12, 6, 0.3, 0.022);
  } },
  burst: { gain: 0.66, play(p, t) {
    tone(140, t, 0.45, 'sine', 0.55, 42);
    noise(t, 0.5, 0.42, 1400, 'lowpass', 140, sfxBus, 0.7);
    clip('impactGlass_heavy_003', t + 0.01, { vol: 0.65 });
    clip('impactGlass_light_001', t + 0.06, { vol: 0.25, rate: 1.3 });
    sparkle(t + 0.08, 7, 0.45, 0.025);
  } },
  prism: { gain: 1.38, play(p, t) {
    for (let i = 0; i < 12; i++) bell(PENT[i % PENT.length] / (i < PENT.length ? 2 : 1), t + i * 0.028, 0.35, 0.065);
    clip('impactBell_heavy_002', t, { vol: 0.45 });
    noise(t, 0.9, 0.05, 6500, 'highpass');
    [PENT[0], PENT[2], PENT[3]].forEach((f) => bell(f, t + 0.36, 1.0, 0.07));
    sparkle(t + 0.3, 10, 0.7, 0.022);
  } },
  stone: { gain: 0.64, play(p, t) {
    clip('impactMining_000', t, { vol: 0.55, len: 0.32 });
    noise(t + 0.02, 0.28, 0.22, 900, 'lowpass', 180, sfxBus, 0.7);
    tone(95, t, 0.16, 'triangle', 0.08, 60);
  } },
  ice: { gain: 0.67, play(p, t) {
    clip('glass_003', t, { vol: 0.42 });
    noise(t, 0.12, 0.08, 5200, 'highpass');
    bell(PENT[7], t + 0.01, 0.32, 0.075); bell(PENT[8] * 1.12, t + 0.045, 0.26, 0.045);
  } },
  star: { gain: 1.35, play(p, t) {
    const f = [PENT[2], PENT[3], PENT[5]][Math.min(p, 2)];
    clip('confirmation_003', t, { rate: 1 + p * 0.12, vol: 0.25 });
    bell(f, t, 0.8, 0.15); bell(f * 1.5, t + 0.05, 0.6, 0.06);
    sparkle(t + 0.05, 4, 0.3, 0.025);
  } },
  win: { gain: 0.94, duck: 1.6, play(p, t) {
    clip('jingles_STEEL02', t, { vol: 0.7 });
    sparkle(t + 0.25, 14, 1.2, 0.022);
    [PENT[0], PENT[2], PENT[3], PENT[5]].forEach((f, i) => bell(f, t + 1.08 + i * 0.03, 1.3, 0.06));
  } },
  fail: { gain: 1.8, duck: 1.4, play(p, t) {
    // a gentle falling bell phrase over a soft low note
    [PENT[3], PENT[2], PENT[1], PENT[0] / 1.122].forEach((f, i) => bell(f / 2, t + i * 0.2, i === 3 ? 1.1 : 0.5, 0.15));
    tone(196, t + 0.05, 1.3, 'sine', 0.06, 165, sfxBus, 0.08);
  } },
  chest: { gain: 0.8, duck: 0.9, play(p, t) {
    clip('jingles_STEEL15', t, { vol: 0.7 });
    sparkle(t + 0.15, 8, 0.6, 0.022);
  } },
  gift: { gain: 1, duck: 1.2, play(p, t) {
    clip('jingles_STEEL10', t, { vol: 0.7 });
    sparkle(t + 0.2, 10, 0.8, 0.022);
    [PENT[0], PENT[2], PENT[3]].forEach((f, i) => bell(f, t + 0.75 + i * 0.03, 1.0, 0.06));
  } },
  click: { gain: 1.07, play(p, t) {
    clip('select_002', t, { vol: 0.45 });
    tone(880, t, 0.07, 'sine', 0.07, 1320);
  } },
  bad: { gain: 1.33, play(p, t) {
    tone(330, t, 0.13, 'triangle', 0.12, 220);
    tone(165, t, 0.15, 'sine', 0.1);
    clip('toggle_004', t, { vol: 0.2 });
  } }
};
const RECIPE_CLIPS = ['impactGlass_light_000', 'impactGlass_light_001', 'impactGlass_light_002', 'impactGlass_light_004', 'maximize_002',
  'impactMetal_light_000', 'impactGlass_heavy_003', 'impactBell_heavy_002', 'impactMining_000', 'glass_003', 'confirmation_003',
  'jingles_STEEL02', 'jingles_STEEL10', 'jingles_STEEL15', 'select_002', 'toggle_004'];

const buffers = {};
let bankStarted = false;
function loadBank() {
  if (bankStarted || !ctx || typeof fetch !== 'function') return;
  bankStarted = true;
  const names = new Set([...Object.values(BANK).flatMap((b) => b.files), ...RECIPE_CLIPS]);
  names.forEach((n) => {
    fetch(SFX_DIR + n + '.mp3')
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))))
      .then((a) => new Promise((res, rej) => ctx.decodeAudioData(a, res, rej)))
      .then((b) => { buffers[n] = b; })
      .catch(() => { /* that layer stays silent; the synthesized layers still play */ });
  });
}
const MUSIC_VOL = 0.16;
function duck(sec) {
  const g = musicBus.gain, t = ctx.currentTime;
  g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
  g.linearRampToValueAtTime(0.03, t + 0.08); g.setValueAtTime(0.03, t + sec); g.linearRampToValueAtTime(MUSIC_VOL, t + sec + 0.8);
}
// plays one loaded clip through the effects bus; skipped quietly if it hasn't loaded
function clip(name, t, { rate = 1, vol = 1, len = null } = {}) {
  const b = buffers[name];
  if (!b) return false;
  const src = ctx.createBufferSource(), g = ctx.createGain();
  src.buffer = b; src.playbackRate.value = rate; g.gain.value = vol * layer;
  src.connect(g); g.connect(sfxBus); src.start(t);
  if (len) { g.gain.setValueAtTime(vol * layer, t + len - 0.06); g.gain.linearRampToValueAtTime(0.0001, t + len); src.stop(t + len + 0.01); }
  return true;
}
// a struck bell: fundamental plus slightly inharmonic overtones
function bell(f, t, dur, vol) {
  tone(f, t, dur, 'sine', vol, null, sfxBus, 0.003);
  tone(f * 2.01, t, dur * 0.6, 'sine', vol * 0.32, null, sfxBus, 0.003);
  tone(f * 3.03, t, dur * 0.35, 'sine', vol * 0.12, null, sfxBus, 0.003);
}
function sparkle(t, n, spread, vol) {
  for (let i = 0; i < n; i++) tone(2600 + Math.random() * 3600, t + Math.random() * spread, 0.07 + Math.random() * 0.08, 'sine', vol * (0.6 + Math.random() * 0.4), null, sfxBus, 0.002);
}
function playSample(b, p) {
  const ready = b.files.filter((f) => buffers[f]);
  if (!ready.length) return false;
  const src = ctx.createBufferSource(), g = ctx.createGain();
  src.buffer = buffers[ready[Math.floor(Math.random() * ready.length)]];
  // a small random pitch change keeps repeated sounds from feeling robotic
  src.playbackRate.value = (b.rate ? b.rate(p) : 1) * (b.fixed ? 1 : 0.96 + Math.random() * 0.08);
  g.gain.value = b.vol;
  src.connect(g); g.connect(sfxBus);
  src.start(ctx.currentTime + 0.005);
  if (b.duck && musicOn) duck(b.duck);
  return true;
}

export function sfx(name, p = 0) {
  if (!ctx || !sfxOn) return;
  const t = ctx.currentTime + 0.01;
  const r = RECIPES[name];
  if (r) {
    layer = r.gain;
    try { r.play(p, t); } finally { layer = 1; }
    if (r.duck && musicOn) duck(r.duck);
    return;
  }
  const b = BANK[name];
  if (b && playSample(b, p)) {
    if (!b.layer) return;
    layer = b.layer;
  }
  try { synth(name, p); } finally { layer = 1; }
}

function synth(name, p) {
  const t = ctx.currentTime + 0.01;
  switch (name) {
    case 'swap': tone(440, t, 0.08, 'triangle', 0.12, 660); break;
    case 'land': tone(180, t, 0.05, 'sine', 0.05, 120); break;
    case 'shuffle': for (let i = 0; i < 6; i++) tone(400 + Math.random() * 600, t + i * 0.04, 0.06, 'triangle', 0.06); break;
    case 'hammer': noise(t, 0.2, 0.45, 600, 'lowpass'); tone(110, t, 0.2, 'sine', 0.35, 60); break;
    case 'rush': tone(1046 + p * 60, t, 0.12, 'triangle', 0.1); break;
    case 'chain': noise(t, 0.12, 0.3, 3500, 'highpass'); tone(1400, t, 0.1, 'square', 0.04, 900); tone(900, t + 0.06, 0.12, 'square', 0.04, 600); break;
    case 'crystal': [1568, 2093, 2637].forEach((f, i) => tone(f, t + i * 0.03, 0.18, 'sine', 0.07)); noise(t, 0.2, 0.18, 2500, 'bandpass'); break;
    case 'creep': tone(220, t, 0.35, 'sawtooth', 0.05, 330); noise(t, 0.3, 0.1, 500, 'lowpass'); break;
    case 'defuse': tone(988, t, 0.1, 'triangle', 0.1); tone(1318, t + 0.08, 0.2, 'triangle', 0.1); break;
    case 'life': tone(392, t, 0.25, 'triangle', 0.1); tone(330, t + 0.18, 0.4, 'triangle', 0.1); break;
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
  vault: { tempo: 320, root: 65, scale: [0, 2, 4, 7, 9], mel: [0, 2, 4, 5, 4, 2, 3, -1, 2, 4, 5, 7, 6, 5, 4, -1, 5, -1, 4, 2, 3, 4, 2, -1, 0, 2, 1, 0, 2, -1, 0, -1], bass: [0, -2, -1, -3, 0, -2, 1, 0], lead: 'triangle', bassWave: 'sine', bell: true, echo: true },
  temple: { tempo: 290, root: 64, scale: [0, 3, 5, 7, 10], mel: [0, -1, 2, 3, 2, -1, 4, 3, 2, -1, 1, 2, 0, -1, -1, -1, 3, -1, 4, 5, 4, -1, 3, 2, 1, -1, 2, 1, 0, -1, -1, -1], bass: [0, 0, -2, -1, 0, 0, -3, -2], lead: 'sine', bassWave: 'triangle', perc: true, echo: true },
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

// for tests: how many recorded effects have loaded
export function bankStatus() { return { loaded: Object.keys(buffers).length, total: new Set([...Object.values(BANK).flatMap((b) => b.files), ...RECIPE_CLIPS]).size }; }
