// Gemfall app controller: screens, level map, lives, HUD, input, overlays, boosters and saved progress.
import { LEVELS, WORLDS, mapFor, getLevel, layoutCount } from './levels.js';
import { Renderer } from './render.js';
import { Game } from './game.js';
import * as audio from './audio.js';

const $ = (id) => document.getElementById(id);
const A = 'assets/';
// Board styles: same rules, different pieces and backdrop. Piece colours line up with the gem colours.
const THEMES = {
  gems: { name: 'Gem Mine', pieces: ['gem-ruby', 'gem-topaz', 'gem-emerald', 'gem-sapphire', 'gem-amethyst', 'gem-pearl'], names: ['rubies', 'topazes', 'emeralds', 'sapphires', 'amethysts', 'pearls'], bg: 'bg-cave.jpg' },
  orchard: { name: 'Orchard Pop', pieces: ['fruit-0', 'fruit-1', 'fruit-2', 'fruit-3', 'fruit-4', 'fruit-5'], names: ['strawberries', 'oranges', 'apples', 'blueberries', 'grapes', 'coconuts'], bg: 'bg-orchard.jpg' },
  orbit: { name: 'Orbit Swap', pieces: ['space-0', 'space-1', 'space-2', 'space-3', 'space-4', 'space-5'], names: ['red planets', 'stars', 'green planets', 'comets', 'galaxies', 'moons'], bg: 'bg-space.jpg' }
};
const MAX_LIVES = 3, LIFE_MS = 20 * 60 * 1000;
const LAST = LEVELS.length;

// ---------- saved progress (browser storage, optional) ----------
const SAVE_KEY = 'gemfall-save-v1';
function defaults() {
  return { unlocked: 1, stars: {}, best: {}, boosters: { hammer: 3, shuffle: 2 }, sfx: true, music: true, rewarded: {}, lives: MAX_LIVES, livesAt: 0,
    theme: 'gems', coached: {}, daily: { last: '', streak: 0 } };
}
function loadSave() {
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); return Object.assign(defaults(), s || {}); } catch (e) { return defaults(); }
}
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* storage unavailable: progress lasts this session */ } }
let save = loadSave();
audio.setPrefs(save.sfx, save.music);
const totalStars = () => Object.values(save.stars).reduce((a, b) => a + b, 0);
const theme = () => THEMES[save.theme] || THEMES.gems;
const pieceSrc = (color) => A + theme().pieces[color] + '.png';

// ---------- lives: lose one on a failed or abandoned level, one refills every 20 minutes ----------
function syncLives() {
  if (save.lives >= MAX_LIVES) { save.lives = MAX_LIVES; save.livesAt = 0; return; }
  const now = Date.now();
  if (!save.livesAt) { save.livesAt = now; persist(); }
  const gained = Math.floor((now - save.livesAt) / LIFE_MS);
  if (gained > 0) {
    save.lives = Math.min(MAX_LIVES, save.lives + gained);
    save.livesAt = save.lives >= MAX_LIVES ? 0 : save.livesAt + gained * LIFE_MS;
    persist();
  }
}
function nextLifeMs() { syncLives(); return save.lives >= MAX_LIVES ? 0 : Math.max(0, LIFE_MS - (Date.now() - save.livesAt)); }
function fmt(ms) { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
function loseLife() {
  syncLives();
  if (save.lives >= MAX_LIVES) save.livesAt = Date.now();
  save.lives = Math.max(0, save.lives - 1);
  persist(); renderLives();
}
function hearts() {
  return `<div class="hearts" role="img" aria-label="${save.lives} of ${MAX_LIVES} lives">${[0, 1, 2].map((k) => `<img src="${A}ui-heart.png" class="${k < save.lives ? '' : 'off'}" alt="">`).join('')}</div>`;
}
function renderLives() {
  const ms = nextLifeMs();
  document.querySelectorAll('.lives-count').forEach((el) => { el.textContent = save.lives; });
  document.querySelectorAll('.lives-time').forEach((el) => { el.textContent = ms ? fmt(ms) : 'Full'; });
  document.querySelectorAll('.lives-wait').forEach((el) => { el.textContent = ms ? fmt(ms) : 'now'; });
  if (ms === 0) document.querySelectorAll('[data-waiting]').forEach((b) => { b.removeAttribute('data-waiting'); b.dataset.act = b.dataset.after; b.textContent = 'Play'; b.classList.add('btn-green'); });
}
setInterval(renderLives, 1000);

// ---------- assets ----------
const IMG = {};
function loadImg(src) { return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(i); i.src = src; }); }
async function preload() {
  const list = [...theme().pieces.map((f) => A + f + '.png'), A + 'sp-prism.png', A + 'ui-chest.png', A + 'tile-stone.png', A + 'ui-star.png',
    A + 'ob-chain.png', A + 'ob-crystal.png', A + 'ob-bomb.png',
    A + 'map.jpg', A + 'bg-cave.jpg', A + 'logo.png', A + 'mascot-happy.png', A + 'mascot-oops.png', A + 'ui-heart.png', A + 'ui-hourglass.png', A + 'ui-crown.png'];
  let done = 0;
  const imgs = await Promise.all(list.map((s) => loadImg(s).then((i) => { done++; $('loadBar').style.width = (done / list.length * 100) + '%'; return i; })));
  IMG.gems = imgs.slice(0, 6); IMG.prism = imgs[6]; IMG.chest = imgs[7]; IMG.stone = imgs[8]; IMG.star = imgs[9];
  IMG.chain = imgs[10]; IMG.crystal = imgs[11]; IMG.bomb = imgs[12];
  $('gameBg').src = A + theme().bg;
  try { await document.fonts.load('30px "Lilita One"'); } catch (e) { /* fallback font */ }
}

let rd = null, game = null, current = 0, hammerMode = false, iceIcon = '', endTimer = null;

function show(id) { document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id)); }

// ---------- goal helpers ----------
const COUNTED = ['ice', 'stone', 'lock', 'crystal'];
function goalAmount(lv, g) { return COUNTED.includes(g.type) ? layoutCount(lv.layout, g.type) : g.target; }
function goalIcon(g) {
  return { score: A + 'ui-star.png', ice: iceIcon, stone: A + 'tile-stone.png', chest: A + 'ui-chest.png', lock: A + 'ob-chain.png', crystal: A + 'ob-crystal.png', collect: pieceSrc(g.color) }[g.type];
}
function goalText(lv, g) {
  const n = goalAmount(lv, g);
  return {
    score: `Score ${n.toLocaleString()}`, ice: `Crack ${n} ice`, stone: `Break ${n} stone`, chest: `Collect ${n} chest${n > 1 ? 's' : ''}`,
    lock: `Snap ${n} chain${n > 1 ? 's' : ''}`, crystal: `Clear all crystal`, collect: `Collect ${n} ${theme().names[g.color]}`
  }[g.type];
}
function worldOf(n) { let w = WORLDS[0]; WORLDS.forEach((x) => { if (n >= x.from) w = x; }); return w; }

// ---------- overlays ----------
function modal(html) {
  $('modal').innerHTML = html;
  $('overlay').classList.remove('hidden');
  renderLives();
  const first = $('modal').querySelector('.btn');
  if (first) setTimeout(() => first.focus({ preventScroll: true }), 50);
}
function closeModal() { $('overlay').classList.add('hidden'); $('modal').innerHTML = ''; }
const closeX = '<button class="round close-x" data-act="close" aria-label="Close"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg></button>';
function inProgress() { return game && !game.ended && game.moves < game.L.moves; }
$('modal').addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  audio.unlock(); audio.sfx('click');
  const act = b.dataset.act;
  if (act === 'close' || act === 'resume') closeModal();
  else if (act === 'play') tryPlay(+b.dataset.level);
  else if (act === 'map') { if (inProgress()) confirmQuit('map'); else openMap(); }
  else if (act === 'restart') { if (inProgress()) confirmQuit('restart'); else tryPlay(current); }
  else if (act === 'next') tryPlay(current + 1);
  else if (act === 'quit-map') { loseLife(); game.destroy(); openMap(); }
  else if (act === 'quit-restart') { loseLife(); game.destroy(); tryPlay(current); }
  else if (act === 'theme') {
    document.querySelectorAll('.theme-card').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
    applyTheme(b.dataset.theme);
  } else if (act === 'claim') claimDaily();
  else if (act === 'coach-ok') clearCoach(true);
  else if (act === 'sfx' || act === 'music') {
    save[act] = !save[act]; persist(); audio.setPrefs(save.sfx, save.music);
    b.setAttribute('aria-pressed', String(save[act])); syncSoundBtn();
  } else if (act === 'reset') {
    b.textContent = 'Tap again to confirm'; b.dataset.act = 'reset2';
  } else if (act === 'reset2') {
    save = defaults(); persist(); audio.setPrefs(save.sfx, save.music); closeModal(); openTitle();
  }
});
function toggles() {
  return `<div class="toggle">Sound effects <button data-act="sfx" aria-label="Sound effects" aria-pressed="${save.sfx}"></button></div>
          <div class="toggle">Music <button data-act="music" aria-label="Music" aria-pressed="${save.music}"></button></div>`;
}
function themePicker() {
  return `<div class="sub" style="margin-top: 14px">BOARD STYLE</div><div class="themes">${Object.entries(THEMES).map(([id, t]) =>
    `<button class="theme-card${save.theme === id ? ' on' : ''}" data-act="theme" data-theme="${id}" aria-pressed="${save.theme === id}">
      <span class="tp">${[0, 2, 3].map((c) => `<img src="${A}${t.pieces[c]}.png" alt="">`).join('')}</span><span class="tn">${t.name}</span></button>`).join('')}</div>`;
}
async function applyTheme(id) {
  if (!THEMES[id]) id = 'gems';
  const imgs = await Promise.all(THEMES[id].pieces.map((f) => loadImg(A + f + '.png')));
  save.theme = id; persist();
  if (rd) rd.setGems(imgs); else IMG.gems = imgs;
  $('gameBg').src = A + THEMES[id].bg;
  if ($('map').classList.contains('active')) buildMap(false);
}
function openSettings() {
  modal(`${closeX}<h2 class="gold-title" style="margin-top: 6px">Settings</h2>${toggles()}${themePicker()}
    <div class="actions"><button class="btn btn-purple" data-act="close">Done</button>
    <button class="btn btn-orange" data-act="reset" style="font-size: 18px; height: 48px">Reset progress</button></div>`);
}
function confirmQuit(then) {
  modal(`<img class="mascot" src="${A}mascot-oops.png" alt="">
    <h2 class="gold-title">Leave the level?</h2>
    <div class="meta">You have already made a move, so leaving now costs a life.</div>${hearts()}
    <div class="actions"><button class="btn btn-green" data-act="resume">Keep playing</button>
    <button class="btn btn-orange" data-act="quit-${then}">${then === 'map' ? 'Leave' : 'Restart'} (lose a life)</button></div>`);
}
function showNoLives(after) {
  modal(`${closeX}<img class="mascot" src="${A}ui-hourglass.png" alt="" style="height: 110px; margin: 4px 0">
    <h2 class="gold-title">Out of lives</h2>
    <div class="meta">Time for a break! A new life arrives in <b class="lives-wait">${fmt(nextLifeMs())}</b>.</div>${hearts()}
    <div class="meta" style="font-size: 13px">Lives refill one every 20 minutes, up to ${MAX_LIVES}.</div>
    <div class="actions"><button class="btn btn-purple" data-waiting="1" data-act="close" data-after="play" data-level="${after}">Waiting…</button></div>`);
}
function tryPlay(i) {
  syncLives();
  if (save.lives <= 0) { showNoLives(i); return; }
  startLevel(i);
}

// ---------- title ----------
function openTitle() { show('title'); $('titleStars').textContent = totalStars(); renderLives(); audio.setTrack('menu'); }
$('playBtn').addEventListener('click', () => { audio.unlock(); audio.sfx('click'); openMap(); });
$('titleSettings').addEventListener('click', () => { audio.unlock(); audio.sfx('click'); openSettings(); });

// ---------- map ----------
// Each world has its own painted map section with 9 platforms; the Endless Dig starts on a fresh section.
const PER = 9;
const ENDLESS_SLOT = Math.ceil(LAST / PER) * PER;
const slotOf = (n) => (n <= LAST ? n - 1 : ENDLESS_SLOT + (n - LAST - 1));
function openMap() {
  clearTimeout(endTimer);
  closeModal(); clearCoach();
  if (game) { game.destroy(); }
  show('map'); buildMap(); renderLives(); renderStreak();
  audio.setTrack('menu');
  if (!dailyState().claimed) setTimeout(() => { if ($('map').classList.contains('active') && $('overlay').classList.contains('hidden')) showDaily(); }, 550);
}
function buildMap(scroll = true) {
  const keepScroll = $('mapScroll').scrollTop;
  const inner = $('mapInner');
  inner.innerHTML = '';
  const shown = Math.max(LAST, save.unlocked + 4);
  const W = $('app').clientWidth, secH = W * 1536 / 864, nSec = Math.floor(slotOf(shown) / PER) + 1, pad = 150;
  inner.style.height = (nSec * secH + pad) + 'px';
  const secTop = (s) => (nSec - 1 - s) * secH;
  for (let s = 0; s < nSec; s++) {
    const img = document.createElement('img');
    img.className = 'sec'; img.src = A + mapFor(s).img; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
    img.style.top = secTop(s) + 'px'; img.style.height = secH + 'px';
    inner.appendChild(img);
    if (s > 0) {
      const seam = document.createElement('div');
      seam.className = 'seam'; seam.style.top = (secTop(s) + secH) + 'px';
      inner.appendChild(seam);
    }
  }
  const cur = save.unlocked;
  let curPos = null;
  for (let n = 1; n <= shown; n++) {
    const slot = slotOf(n), s = Math.floor(slot / PER), [px, py] = mapFor(s).pts[slot % PER];
    const x = px / 864 * W, y = secTop(s) + py / 1536 * secH;
    const st = save.stars[n] || 0, locked = n > save.unlocked, isCur = n === cur;
    const node = document.createElement('div');
    node.className = 'node' + (locked ? ' locked' : '') + (isCur ? ' cur' : '');
    node.style.left = x + 'px'; node.style.top = y + 'px';
    let html = isCur ? '<div class="glow"></div>' : '';
    if (locked) html += '<div class="dim"></div>';
    html += `<button aria-label="Level ${n}${locked ? ', locked' : st ? `, ${st} stars` : ''}">${n}</button>`;
    if (st > 0) html += `<div class="stars">${[0, 1, 2].map((j) => `<img src="${A}ui-star.png" class="${j === 1 ? 'mid' : ''} ${j < st ? '' : 'off'}" alt="">`).join('')}</div>`;
    if (locked) html += '<svg class="lock" width="18" height="20" viewBox="0 0 24 26" aria-hidden="true"><rect x="3" y="11" width="18" height="13" rx="3" fill="#e9e2ff" stroke="#2a1866" stroke-width="2"></rect><path d="M7 11V8a5 5 0 0 1 10 0v3" fill="none" stroke="#e9e2ff" stroke-width="3"></path></svg>';
    node.innerHTML = html;
    node.querySelector('button').addEventListener('click', () => {
      audio.unlock();
      if (locked) { audio.sfx('bad'); return; }
      audio.sfx('click'); openLevelStart(n - 1);
    });
    inner.appendChild(node);
    if (n % 3 === 0 && !save.rewarded[n]) {
      const ch = document.createElement('img');
      ch.className = 'map-chest'; ch.src = A + 'ui-chest.png'; ch.alt = '';
      ch.style.left = (x + (x > W / 2 ? 62 : -62)) + 'px'; ch.style.top = (y - 6) + 'px';
      inner.appendChild(ch);
    }
    if (isCur) curPos = { x, y };
  }
  WORLDS.forEach((w, i) => {
    const s = Math.floor(slotOf(w.from) / PER);
    const b = document.createElement('div');
    b.className = 'world-banner';
    b.innerHTML = w.from > LAST ? `<small>AFTER LEVEL ${LAST}</small><b>${w.name}</b>` : `<small>WORLD ${i + 1}</small><b>${w.name}</b>`;
    b.style.top = (secTop(s) + secH + (i === 0 ? 34 : 18)) + 'px';
    inner.appendChild(b);
  });
  if (LAST % PER && save.unlocked <= LAST) {
    const [px, py] = mapFor(Math.floor(LAST / PER)).pts[Math.min(PER - 1, (LAST % PER) + 1)];
    const gate = document.createElement('div');
    gate.className = 'world-banner gate';
    gate.innerHTML = `<img src="${A}ui-crown.png" alt=""><small>BEAT LEVEL ${LAST} TO OPEN</small><b>The Endless Dig</b>`;
    gate.style.top = (secTop(Math.floor(LAST / PER)) + py / 1536 * secH) + 'px'; gate.style.left = (px / 864 * W) + 'px';
    inner.appendChild(gate);
  }
  if (curPos) {
    const d = document.createElement('img');
    d.className = 'map-digby'; d.src = A + 'mascot-happy.png'; d.alt = '';
    d.style.left = (curPos.x + (curPos.x > W / 2 ? -66 : 66)) + 'px'; d.style.top = (curPos.y + 24) + 'px';
    inner.appendChild(d);
    requestAnimationFrame(() => { $('mapScroll').scrollTop = scroll ? curPos.y - $('mapScroll').clientHeight * 0.5 : keepScroll; });
  }
  $('mapStars').textContent = totalStars();
  const lv = getLevel(cur);
  $('mapLevelName').textContent = `Level ${cur}`;
  $('mapLevelDesc').textContent = `${lv.goals.map((g) => goalText(lv, g)).join(' · ')}`;
  $('mapGoalIcon').src = goalIcon(lv.goals[0]);
  $('mapPlay').onclick = () => { audio.unlock(); audio.sfx('click'); openLevelStart(cur - 1); };
}
$('mapHome').addEventListener('click', () => { audio.sfx('click'); openTitle(); });
$('mapSettings').addEventListener('click', () => { audio.unlock(); audio.sfx('click'); openSettings(); });

function openLevelStart(i) {
  const n = i + 1, lv = getLevel(n), best = save.best[n];
  syncLives();
  const lifeLine = save.lives < MAX_LIVES ? `<div class="meta" style="font-size: 13px">Next life in <b class="lives-wait">${fmt(nextLifeMs())}</b></div>` : '';
  modal(`${closeX}
    ${lv.endless ? `<img src="${A}ui-crown.png" alt="" style="width: 64px; margin-bottom: -6px">` : ''}
    <div class="sub">${worldOf(n).name.toUpperCase()}</div>
    <h2 class="gold-title">Level ${n}</h2>
    <div class="goals">${lv.goals.map((g) => `<div class="goal"><img src="${goalIcon(g)}" alt=""><span>${goalAmount(lv, g).toLocaleString()}</span></div>`).join('')}</div>
    <div class="meta">${lv.goals.map((g) => goalText(lv, g)).join(' · ')}<br>in ${lv.moves} moves${lv.bombs ? ' · watch for fuse bombs!' : ''}</div>
    ${lv.tip ? `<div class="tip"><img src="${A}mascot-happy.png" alt="" style="width: 46px; flex-shrink: 0"><div><b>DIGBY'S TIP</b>${lv.tip}</div></div>` : ''}
    ${best ? `<div class="meta">Your best: ${best.toLocaleString()}</div>` : ''}
    ${hearts()}${lifeLine}
    <div class="actions"><button class="btn btn-green" data-act="play" data-level="${i}" style="height: 64px; font-size: 30px">Play</button></div>`);
}

// ---------- game screen ----------
const hooks = {
  hud: (g) => updateHUD(g),
  combo: (lvl) => {
    const words = { 2: 'Nice!', 3: 'Brilliant!', 4: 'Dazzling!', 5: 'Spectacular!' };
    const big = lvl === 'mega' || lvl >= 5;
    callout(lvl === 'mega' ? 'Mega Combo!' : (words[lvl] || 'Legendary!'), big);
    cheer();
  },
  special: () => cheer(),
  banner: (t) => callout(t, true),
  fly: (type, r, c, color) => flyToGoal(type, r, c, color),
  moved: () => { if (coach && coach.kind === 'move') clearCoach(true); },
  idle: () => coachCheck(),
  end: (res) => { clearCoach(); onEnd(res); }
};

let lastStars = 0;
function startLevel(i) {
  clearTimeout(endTimer);
  closeModal();
  audio.unlock();
  current = i;
  if (game) game.destroy();
  clearCoach();
  show('game');
  audio.setTrack(trackFor(i + 1));
  setHammer(false);
  const lv = getLevel(i + 1);
  game = new Game(lv, i, rd, hooks);
  rd.setGame(game);
  sizeBoard();
  $('lvlLabel').innerHTML = lv.endless ? `<img src="${A}ui-crown.png" alt="" style="width: 26px; vertical-align: -5px; margin-right: 4px">Level ${i + 1}` : `Level ${i + 1}`;
  $('digby').src = A + 'mascot-happy.png';
  lastStars = 0; shownScore = 0; scoreTarget = 0; lastMoves = lv.moves;
  $('hudGoals').innerHTML = game.goals.map((g, k) => `<div class="goal" id="goal${k}"><img src="${goalIcon(g)}" alt=""><span></span><div class="check"></div></div>`).join('');
  updateHUD(game); updateBoosters(); syncSoundBtn();
  game.busy = true;
  const all = game.allPieces();
  all.forEach(({ p, r }) => { p.y = r - game.R - 1; });
  Promise.all(all.map(({ p, r, c }) => rd.fall(p, r, c, c * 30 + (game.R - r) * 26))).then(() => {
    if (game && !game.ended) { game.busy = false; game.armHint(); }
  });
  setTimeout(() => callout('Go!', true), 450);
}
function sizeBoard() {
  if (!rd) return;
  const w = $('boardWrap');
  const avail = Math.floor(Math.min(w.clientWidth, w.clientHeight) - 18);
  rd.resize(Math.max(200, avail));
}
window.addEventListener('resize', () => {
  if ($('game').classList.contains('active')) { sizeBoard(); if (coach) { clearCoach(); if (game && !game.busy) coachCheck(); } }
  if ($('map').classList.contains('active')) buildMap();
});

let shownScore = 0, scoreTarget = 0, scoreRaf = 0, lastMoves = 0;
function stepScore() {
  const d = scoreTarget - shownScore;
  shownScore = Math.abs(d) < 3 ? scoreTarget : shownScore + d * 0.16;
  $('hudScore').textContent = Math.round(shownScore).toLocaleString();
  scoreRaf = shownScore === scoreTarget ? 0 : requestAnimationFrame(stepScore);
}
function updateHUD(g) {
  $('hudMoves').textContent = g.moves;
  if (g.moves !== lastMoves) { const m = $('hudMoves'); m.classList.remove('tick'); void m.offsetWidth; m.classList.add('tick'); lastMoves = g.moves; }
  $('hudMovesBox').classList.toggle('low', g.moves <= 5 && !g.ended);
  scoreTarget = g.score;
  if (!scoreRaf) scoreRaf = requestAnimationFrame(stepScore);
  const max = g.L.stars[2] * 1.06;
  $('hudBar').style.width = Math.min(100, g.score / max * 100) + '%';
  let st = 0;
  [0, 1, 2].forEach((k) => {
    const el = $('s' + (k + 1)), on = g.score >= g.L.stars[k];
    el.style.left = Math.min(96, g.L.stars[k] / max * 100) + '%';
    el.classList.toggle('on', on);
    if (on) st++;
  });
  if (st > lastStars) audio.sfx('star', st - 1);
  lastStars = st;
  g.goals.forEach((goal, i) => {
    const el = $('goal' + i);
    if (!el) return;
    const left = goal.type === 'score' ? Math.max(0, goal.target - g.score) : goal.left;
    if (el.dataset.prev !== undefined && left < +el.dataset.prev) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
    el.dataset.prev = left;
    el.querySelector('span').textContent = left.toLocaleString();
    el.classList.toggle('done', left <= 0);
  });
}
function updateBoosters() {
  $('cHammer').textContent = save.boosters.hammer;
  $('cShuffle').textContent = save.boosters.shuffle;
}
function callout(text, big = false) {
  const el = document.createElement('div');
  el.className = 'callout' + (big ? ' big' : '');
  el.textContent = text;
  $('frame').appendChild(el);
  setTimeout(() => el.remove(), big ? 1500 : 1100);
}
function cheer() {
  const d = $('digby');
  if (d.animate) d.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-18px) rotate(-6deg)' }, { transform: 'translateY(0)' }], { duration: 420, easing: 'ease-out' });
}
function flyToGoal(type, r, c, color) {
  if (!game) return;
  const idx = game.goals.findIndex((g) => g.type === type && (type !== 'collect' || g.color === color));
  const el = $('goal' + idx);
  if (!el) return;
  const appR = $('app').getBoundingClientRect(), cvR = $('board').getBoundingClientRect(), p = rd.center(r, c), k = cvR.width / rd.size;
  const x0 = cvR.left - appR.left + p.x * k - 20, y0 = cvR.top - appR.top + p.y * k - 20;
  const gr = el.getBoundingClientRect();
  const x1 = gr.left - appR.left + gr.width / 2 - 20, y1 = gr.top - appR.top + 18 - 20;
  const im = document.createElement('img');
  im.src = type === 'chest' ? A + 'ui-chest.png' : pieceSrc(color); im.alt = '';
  $('fx').appendChild(im);
  const mx = (x0 + x1) / 2 + (Math.random() - 0.5) * 90, my = Math.min(y0, y1) - 30;
  const an = im.animate([
    { transform: `translate(${x0}px, ${y0}px) scale(1)` },
    { transform: `translate(${mx}px, ${my}px) scale(1.25)`, offset: 0.45 },
    { transform: `translate(${x1}px, ${y1}px) scale(0.6)`, opacity: 0.9 }
  ], { duration: 680, easing: 'ease-in-out' });
  an.onfinish = () => im.remove();
}

function onEnd(res) {
  const n = current + 1;
  setHammer(false);
  if (res.win) {
    const prev = save.stars[n] || 0;
    save.stars[n] = Math.max(prev, res.stars);
    save.best[n] = Math.max(save.best[n] || 0, res.score);
    save.unlocked = Math.max(save.unlocked, n + 1);
    let reward = '';
    if (n % 3 === 0 && !save.rewarded[n]) { save.rewarded[n] = true; save.boosters.hammer++; save.boosters.shuffle++; reward = '+1 Hammer and +1 Shuffle'; }
    persist();
    audio.sfx('win');
    endTimer = setTimeout(() => showWin(res, reward), 700);
  } else {
    loseLife();
    $('digby').src = A + 'mascot-oops.png';
    audio.sfx('fail');
    endTimer = setTimeout(() => showFail(res), 600);
  }
}
function showWin(res, reward) {
  const n = current + 1, opened = n === LAST;
  modal(`<img class="mascot" src="${A}${opened ? 'ui-crown.png' : 'mascot-happy.png'}" alt="">
    <div class="sub">LEVEL ${n}</div>
    <h2 class="gold-title">${opened ? 'Mountain conquered!' : 'Complete!'}</h2>
    <div class="stars" role="img" aria-label="${res.stars} of 3 stars"><img src="${A}ui-star.png" alt="" id="ws0"><img src="${A}ui-star.png" class="mid" alt="" id="ws1"><img src="${A}ui-star.png" alt="" id="ws2"></div>
    <div class="scorebox"><div style="text-align: left"><div class="sub">SCORE</div><div class="v">${res.score.toLocaleString()}</div></div><div style="text-align: right"><div class="sub">BEST</div><div class="v" style="font-size: 22px">${(save.best[n] || res.score).toLocaleString()}</div></div></div>
    ${reward ? `<div class="reward"><img src="${A}ui-chest.png" alt=""><div><div class="h-font" style="font-size: 19px; color: var(--gold-2)">Treasure found!</div><div style="font-size: 13px; font-weight: 800">${reward}</div></div></div>` : ''}
    ${opened ? '<div class="meta">The Endless Dig is open: a brand-new level every time, getting slowly tougher.</div>' : ''}
    <div class="actions">
      <button class="btn btn-green" data-act="next" style="height: 62px; font-size: 28px">${opened ? 'Enter the Endless Dig' : 'Next level'}</button>
      <div class="row"><button class="btn btn-purple" data-act="restart">Replay</button><button class="btn btn-purple" data-act="map">Map</button></div>
    </div>`);
  for (let k = 0; k < res.stars; k++) setTimeout(() => { const s = $('ws' + k); if (s) { s.classList.add('on'); audio.sfx('star', k); } }, 350 + k * 380);
}
function showFail(res) {
  const g = game, bomb = res.reason === 'bomb';
  const left = g.goals.filter((x) => (x.type === 'score' ? g.score < x.target : x.left > 0));
  const canRetry = save.lives > 0;
  modal(`<img class="mascot" src="${A}${bomb ? 'ob-bomb.png' : 'mascot-oops.png'}" alt="">
    <div class="sub">LEVEL ${current + 1}</div>
    <h2 class="gold-title">${bomb ? 'Boom!' : 'Out of moves'}</h2>
    <div class="meta" style="margin-top: 8px">${bomb ? 'A fuse bomb went off.' : 'So close!'} You lost a life.</div>
    ${hearts()}
    ${left.length ? `<div class="meta">Still to go:</div><div class="goals">${left.map((x) => `<div class="goal"><img src="${goalIcon(x)}" alt=""><span>${(x.type === 'score' ? x.target - g.score : x.left).toLocaleString()}</span></div>`).join('')}</div>` : ''}
    <div class="tip"><img src="${A}${bomb ? 'ob-bomb.png' : 'sp-streak.png'}" alt="" style="width: 50px; flex-shrink: 0"><div><b>TIP</b>${bomb ? 'Bombs with 3 or fewer moves left glow red. Match those first.' : 'Make special gems early and save them for the hard spots.'}</div></div>
    <div class="actions">
      ${canRetry ? '<button class="btn btn-green" data-act="restart" style="height: 62px; font-size: 28px">Try again</button>'
        : `<button class="btn btn-purple" data-waiting="1" data-act="close" data-after="play" data-level="${current}" style="height: 62px">Next life in <span class="lives-wait">${fmt(nextLifeMs())}</span></button>`}
      <button class="btn btn-purple" data-act="map">Back to map</button>
    </div>`);
}

// pause and sound
$('pauseBtn').addEventListener('click', () => {
  audio.unlock(); audio.sfx('click');
  modal(`${closeX}<h2 class="gold-title" style="margin-top: 6px">Paused</h2>${toggles()}
    <div class="actions"><button class="btn btn-green" data-act="resume">Resume</button>
    <div class="row"><button class="btn btn-purple" data-act="restart">Restart</button><button class="btn btn-purple" data-act="map">Map</button></div></div>`);
});
function syncSoundBtn() {
  const on = save.sfx || save.music;
  $('soundBtn').setAttribute('aria-pressed', String(on));
  $('soundBtn').setAttribute('aria-label', on ? 'Sound on' : 'Sound off');
  $('soundWaves').style.opacity = on ? 1 : 0.15;
}
$('soundBtn').addEventListener('click', () => {
  audio.unlock();
  const on = !(save.sfx || save.music);
  save.sfx = on; save.music = on; persist(); audio.setPrefs(on, on); syncSoundBtn();
  audio.sfx('click');
});

// boosters
function setHammer(on) {
  hammerMode = on;
  $('game').classList.toggle('hammer', on);
  $('bHammer').classList.toggle('active', on);
  const tip = $('frame').querySelector('.hammer-tip');
  if (on && !tip) { const t = document.createElement('div'); t.className = 'hammer-tip'; t.textContent = 'Tap a gem, stone, chain or crystal'; $('frame').appendChild(t); }
  if (!on && tip) tip.remove();
}
$('bHammer').addEventListener('click', () => {
  audio.unlock();
  if (!game || game.ended) return;
  if (save.boosters.hammer <= 0) { audio.sfx('bad'); callout('Find chests for more!'); return; }
  audio.sfx('click'); setHammer(!hammerMode);
});
$('bShuffle').addEventListener('click', () => {
  audio.unlock();
  if (!game || game.ended || game.busy) return;
  if (save.boosters.shuffle <= 0) { audio.sfx('bad'); callout('Find chests for more!'); return; }
  save.boosters.shuffle--; persist(); updateBoosters();
  game.shuffleNow();
});
$('bHint').addEventListener('click', () => { audio.unlock(); audio.sfx('click'); if (game) game.showHint(); });

// ---------- board input: swipe or tap-tap ----------
const cv = $('board');
let drag = null, sel = null;
function local(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * (rd.size / r.width), y: (e.clientY - r.top) * (rd.size / r.height) }; }
cv.addEventListener('pointerdown', (e) => {
  audio.unlock();
  if (!game || game.ended) return;
  const pt = local(e), cell = rd.cellAt(pt.x, pt.y);
  if (!cell) return;
  if (hammerMode) {
    const k = game.cell(cell.r, cell.c);
    const target = k && k.playable && (k.stone > 0 || k.crystal > 0 || (k.piece && k.piece.kind !== 'chest'));
    if (game.busy || !target) { audio.sfx('bad'); return; }
    save.boosters.hammer--; persist(); updateBoosters(); setHammer(false);
    game.hammer(cell.r, cell.c);
    return;
  }
  if (game.busy) return;
  drag = { cell, x: pt.x, y: pt.y, moved: false };
  try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
});
cv.addEventListener('pointermove', (e) => {
  if (!drag || drag.moved || !game) return;
  const pt = local(e), dx = pt.x - drag.x, dy = pt.y - drag.y;
  const p = game.pieceAt(drag.cell.r, drag.cell.c);
  if (Math.max(Math.abs(dx), Math.abs(dy)) < rd.cell * 0.32) {
    // the gem leans toward the finger before the swap starts
    if (p && !game.cell(drag.cell.r, drag.cell.c).lock) {
      const k = 0.55 / rd.cell;
      if (Math.abs(dx) > Math.abs(dy)) rd.nudge(p, dx * k, 0); else rd.nudge(p, 0, dy * k);
    }
    return;
  }
  drag.moved = true;
  const t = Math.abs(dx) > Math.abs(dy) ? { r: drag.cell.r, c: drag.cell.c + Math.sign(dx) } : { r: drag.cell.r + Math.sign(dy), c: drag.cell.c };
  sel = null; rd.selected = null;
  Promise.resolve(game.trySwap(drag.cell, t)).then(() => { if (p && (p.ox || p.oy)) rd.release(p); });
});
cv.addEventListener('pointerup', () => {
  if (!drag || !game) { drag = null; return; }
  const d = drag; drag = null;
  if (d.moved) return;
  const held = game.pieceAt(d.cell.r, d.cell.c);
  if (held && (held.ox || held.oy)) rd.release(held);
  const c = d.cell;
  if (sel && Math.abs(sel.r - c.r) + Math.abs(sel.c - c.c) === 1) { const a = sel; sel = null; rd.selected = null; game.trySwap(a, c); return; }
  if (sel && sel.r === c.r && sel.c === c.c) { sel = null; rd.selected = null; return; }
  if (game.pieceAt(c.r, c.c)) { sel = c; rd.selected = c; audio.sfx('click'); }
});
cv.addEventListener('pointercancel', () => {
  if (drag && game) { const held = game.pieceAt(drag.cell.r, drag.cell.c); if (held && (held.ox || held.oy)) rd.release(held); }
  drag = null;
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('overlay').classList.contains('hidden')) closeModal(); });

// ---------- music per area ----------
function trackFor(n) {
  if (n > LAST) return 'endless';
  return ['caverns', 'caverns', 'glow', 'glow', 'forge', 'ruins', 'heart'][WORLDS.indexOf(worldOf(n))] || 'caverns';
}

// ---------- tutorial coach: a pointing hand and Digby explain new ideas the first time ----------
const COACH = {
  1: { move: 'any', text: 'Swipe this gem to line up 3 of the same kind!' },
  2: { move: 'streak', text: 'Line up 4 to make a Streak gem. It clears a whole line!' },
  3: { spot: 'ice', text: 'See the ice? Make matches on top of it to crack it.' },
  4: { move: 'burst', text: 'Match in an L or T shape to make a Burst gem!' },
  5: { spot: 'stone', text: 'Stone breaks when you match right next to it.' },
  6: { move: 'prism', text: 'Line up 5 to make a Prism. It clears a whole colour!' },
  7: { spot: 'chest', text: 'Bring the chest down to the bottom row to collect it.' },
  21: { spot: 'lock', text: 'Chained pieces can\'t move. Match them to snap the chain.' },
  25: { spot: 'crystal', text: 'Crystal spreads every turn you don\'t break any. Match next to it!' },
  30: { spot: 'bomb', text: 'Fuse bombs count down each move. Match them before they hit 0!' }
};
let coach = null;
function findSpot(type) {
  for (let r = game.R - 1; r >= 0; r--) for (let c = 0; c < game.C; c++) {
    const k = game.cell(r, c);
    if (!k || !k.playable) continue;
    const p = k.piece;
    if ((type === 'ice' && k.ice > 0) || (type === 'stone' && k.stone > 0) || (type === 'lock' && k.lock) || (type === 'crystal' && k.crystal > 0)
      || (type === 'chest' && p && p.kind === 'chest') || (type === 'bomb' && p && p.fuse > 0)) return { r, c };
  }
  return null;
}
function coachCheck() {
  const n = current + 1, c = COACH[n];
  if (!game || game.ended || game.busy || !c || save.coached[n] || coach || !$('overlay').classList.contains('hidden')) return;
  if (c.spot) { const at = findSpot(c.spot); if (at) showCoach('spot', [at], c.text); return; }
  const m = c.move === 'any' ? game.findMove() : game.findMoveMaking(c.move);
  if (!m) return;
  const where = m.map((p) => game.allPieces().find((x) => x.p === p));
  if (where.every(Boolean)) showCoach('move', where.map((x) => ({ r: x.r, c: x.c })), c.text);
}
function showCoach(kind, cells, text) {
  const cvEl = $('board'), cs = rd.cell;
  const pts = cells.map((x) => rd.center(x.r, x.c));
  const x0 = Math.min(...pts.map((p) => p.x)) - cs / 2, x1 = Math.max(...pts.map((p) => p.x)) + cs / 2;
  const y0 = Math.min(...pts.map((p) => p.y)) - cs / 2, y1 = Math.max(...pts.map((p) => p.y)) + cs / 2;
  const el = document.createElement('div');
  el.className = 'coach' + (kind === 'spot' ? ' blocking' : '');
  Object.assign(el.style, { left: cvEl.offsetLeft + 'px', top: cvEl.offsetTop + 'px', width: rd.size + 'px', height: rd.size + 'px' });
  const hs = cs * 1.45, tipX = 0.27 * hs, tipY = 0.07 * hs;
  const a = pts[0], b = pts[pts.length - 1];
  const low = (y0 + y1) / 2 > rd.size / 2;
  const hx = x0 - 4, hy = y0 - 4, hw = x1 - x0 + 8, hh = y1 - y0 + 8, S = rd.size;
  const dims = [[0, 0, S, hy], [0, hy + hh, S, S - hy - hh], [0, hy, hx, hh], [hx + hw, hy, S - hx - hw, hh]]
    .map(([l, t, w, h]) => `<div class="dim" style="left: ${l}px; top: ${t}px; width: ${Math.max(0, w)}px; height: ${Math.max(0, h)}px"></div>`).join('');
  el.innerHTML = `${dims}<div class="hole" style="left: ${hx}px; top: ${hy}px; width: ${hw}px; height: ${hh}px"></div>
    <img class="hand ${kind}" src="${A}ui-hand.png" alt="" style="width: ${hs}px; --x0: ${a.x - tipX}px; --y0: ${a.y - tipY}px; --x1: ${b.x - tipX}px; --y1: ${b.y - tipY}px">
    <div class="bubble" style="${low ? 'top' : 'bottom'}: 8px"><img src="${A}mascot-happy.png" alt=""><p></p>${kind === 'spot' ? '<button class="btn btn-green" data-act="coach-ok">Got it</button>' : ''}</div>`;
  el.querySelector('p').textContent = text;
  el.addEventListener('click', (e) => { const btn = e.target.closest('[data-act="coach-ok"]'); if (btn || kind === 'spot') { audio.sfx('click'); clearCoach(true); } });
  $('frame').appendChild(el);
  coach = { kind, el, n: current + 1 };
  game.coaching = true; game.clearHint();
  audio.sfx('pop');
}
function clearCoach(done = false) {
  if (!coach) return;
  const c = coach;
  coach = null;
  c.el.remove();
  if (game) game.coaching = false;
  if (done) {
    // a level can hold an obstacle intro first and a move tip after it; mark it seen once its tip has shown
    save.coached[c.n] = true; persist();
    if (game && !game.busy && !game.ended) game.armHint();
  }
}

// ---------- daily treasure: one reward per day, a 7-day cycle and a streak ----------
const DAILY = [
  { label: '1 Hammer', give: { hammer: 1 } },
  { label: '1 Shuffle', give: { shuffle: 1 } },
  { label: 'Full lives', give: { lives: true } },
  { label: '2 Hammers', give: { hammer: 2 } },
  { label: 'Hammer + Shuffle', give: { hammer: 1, shuffle: 1 } },
  { label: '2 Shuffles', give: { shuffle: 2 } },
  { label: 'Big chest', give: { hammer: 3, shuffle: 2, lives: true }, big: true }
];
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function yesterdayKey() { const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); }
function dailyState() {
  const d = save.daily || { last: '', streak: 0 };
  if (d.last === dayKey()) return { claimed: true, streak: d.streak, day: (d.streak - 1) % 7 };
  const streak = d.last === yesterdayKey() ? d.streak + 1 : 1;
  return { claimed: false, streak, day: (streak - 1) % 7 };
}
function renderStreak() {
  const st = dailyState(), d = save.daily || {};
  const live = st.claimed ? st.streak : d.last === yesterdayKey() ? d.streak : 0;
  $('streakNum').textContent = live;
  $('mapDaily').classList.toggle('ready', !st.claimed);
  $('mapDaily').setAttribute('aria-label', st.claimed ? `Daily treasure, ${live}-day streak` : 'Daily treasure ready to claim');
}
function showDaily() {
  const st = dailyState();
  const tiles = DAILY.map((r, i) => {
    const got = i < st.day || (st.claimed && i === st.day);
    return `<div class="day${got ? ' got' : ''}${!st.claimed && i === st.day ? ' today' : ''}${r.big ? ' big' : ''}">
      <small>DAY ${i + 1}</small><img src="${A}${r.big ? 'ui-bigchest' : 'ui-gift'}.png" alt=""><span>${r.label}</span></div>`;
  }).join('');
  modal(`${closeX}<img src="${A}ui-calendar.png" alt="" class="cal-icon">
    <h2 class="gold-title">Daily treasure</h2>
    <div class="streak-line"><img src="${A}ui-flame.png" alt=""><span>${st.streak}-day streak</span></div>
    <div class="days">${tiles}</div>
    <div class="meta" style="font-size: 13px">Come back every day. Day 7 is the big chest! Miss a day and you start again from day 1.</div>
    <div class="actions" id="dailyActions">${st.claimed ? '<button class="btn btn-purple" data-act="close">See you tomorrow!</button>' : '<button class="btn btn-green" data-act="claim" style="height: 62px; font-size: 28px">Claim</button>'}</div>`);
}
function claimDaily() {
  const st = dailyState();
  if (st.claimed) return;
  const r = DAILY[st.day].give;
  save.boosters.hammer += r.hammer || 0;
  save.boosters.shuffle += r.shuffle || 0;
  if (r.lives) { save.lives = MAX_LIVES; save.livesAt = 0; }
  save.daily = { last: dayKey(), streak: st.streak };
  persist(); renderLives(); renderStreak();
  audio.sfx('gift');
  const tile = document.querySelectorAll('#modal .day')[st.day];
  if (tile) { tile.classList.remove('today'); tile.classList.add('got', 'pop'); }
  $('dailyActions').innerHTML = `<div class="meta" style="color: var(--gold-2)">You got: ${DAILY[st.day].label}!</div><button class="btn btn-green" data-act="close">Great!</button>`;
}
$('mapDaily').addEventListener('click', () => { audio.unlock(); audio.sfx('click'); showDaily(); });

// debugging and automated tests
window.__gemfall = {
  get game() { return game; }, startLevel, openMap, getLevel, get save() { return save; }, get rd() { return rd; },
  setLives(n, agoMs = 0) { save.lives = n; save.livesAt = n >= MAX_LIVES ? 0 : Date.now() - agoMs; persist(); renderLives(); },
  applyTheme, showDaily, claimDaily, clearCoach, get coach() { return coach; }
};

(async () => {
  await preload();
  rd = new Renderer(cv, IMG);
  if (!THEMES[save.theme]) save.theme = 'gems';
  iceIcon = rd.sprites.ice[1].toDataURL();
  $('loading').classList.add('hidden');
  syncLives();
  openTitle();
})();
