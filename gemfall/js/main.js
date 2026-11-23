// Gemfall app controller: screens, level map, HUD, input, overlays, boosters and saved progress.
import { LEVELS, WORLDS, MAP_PLATFORMS } from './levels.js';
import { Renderer } from './render.js';
import { Game } from './game.js';
import * as audio from './audio.js';

const $ = (id) => document.getElementById(id);
const A = 'assets/';
const GEM_FILES = ['gem-ruby', 'gem-topaz', 'gem-emerald', 'gem-sapphire', 'gem-amethyst', 'gem-pearl'];
const GEM_NAMES = ['rubies', 'topazes', 'emeralds', 'sapphires', 'amethysts', 'pearls'];

// ---------- saved progress (browser storage, optional) ----------
const SAVE_KEY = 'gemfall-save-v1';
function defaults() { return { unlocked: 1, stars: {}, best: {}, boosters: { hammer: 3, shuffle: 2 }, sfx: true, music: true, rewarded: {} }; }
function loadSave() {
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); return Object.assign(defaults(), s || {}); } catch (e) { return defaults(); }
}
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* storage unavailable: progress lasts this session */ } }
let save = loadSave();
audio.setPrefs(save.sfx, save.music);
const totalStars = () => Object.values(save.stars).reduce((a, b) => a + b, 0);

// ---------- assets ----------
const IMG = {};
function loadImg(src) { return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(i); i.src = src; }); }
async function preload() {
  const list = [...GEM_FILES.map((f) => A + f + '.png'), A + 'sp-prism.png', A + 'ui-chest.png', A + 'tile-stone.png', A + 'ui-star.png',
    A + 'map.jpg', A + 'bg-cave.jpg', A + 'logo.png', A + 'mascot-happy.png', A + 'mascot-oops.png'];
  let done = 0;
  const imgs = await Promise.all(list.map((s) => loadImg(s).then((i) => { done++; $('loadBar').style.width = (done / list.length * 100) + '%'; return i; })));
  IMG.gems = imgs.slice(0, 6); IMG.prism = imgs[6]; IMG.chest = imgs[7]; IMG.stone = imgs[8]; IMG.star = imgs[9];
  try { await document.fonts.load('30px "Lilita One"'); } catch (e) { /* fallback font */ }
}

let rd = null, game = null, current = 0, hammerMode = false, iceIcon = '', endTimer = null;

function show(id) { document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id)); }

// ---------- goal helpers ----------
function layoutCount(lv, type) {
  let n = 0;
  lv.layout.join('').split('').forEach((ch) => {
    if (type === 'ice') n += ch === 'i' ? 1 : ch === 'I' ? 2 : 0;
    if (type === 'stone') n += ch === 's' ? 1 : ch === 'S' ? 2 : 0;
  });
  return n;
}
function goalAmount(lv, g) { return g.type === 'ice' || g.type === 'stone' ? layoutCount(lv, g.type) : g.target; }
function goalIcon(g) {
  return { score: A + 'ui-star.png', ice: iceIcon, stone: A + 'tile-stone.png', chest: A + 'ui-chest.png', collect: A + GEM_FILES[g.color] + '.png' }[g.type];
}
function goalText(lv, g) {
  const n = goalAmount(lv, g);
  return { score: `Score ${n.toLocaleString()}`, ice: `Crack ${n} ice`, stone: `Break ${n} stone`, chest: `Collect ${n} chest${n > 1 ? 's' : ''}`, collect: `Collect ${n} ${GEM_NAMES[g.color]}` }[g.type];
}
function worldOf(n) { let w = WORLDS[0]; WORLDS.forEach((x) => { if (n >= x.from) w = x; }); return w; }

// ---------- overlays ----------
function modal(html) {
  $('modal').innerHTML = html;
  $('overlay').classList.remove('hidden');
  const first = $('modal').querySelector('.btn');
  if (first) setTimeout(() => first.focus({ preventScroll: true }), 50);
}
function closeModal() { $('overlay').classList.add('hidden'); $('modal').innerHTML = ''; }
const closeX = '<button class="round close-x" data-act="close" aria-label="Close"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg></button>';
$('modal').addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  audio.unlock(); audio.sfx('click');
  const act = b.dataset.act;
  if (act === 'close') closeModal();
  else if (act === 'play') startLevel(+b.dataset.level);
  else if (act === 'map') { closeModal(); openMap(); }
  else if (act === 'resume') closeModal();
  else if (act === 'restart') startLevel(current);
  else if (act === 'next') startLevel(Math.min(LEVELS.length - 1, current + 1));
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
function openSettings() {
  modal(`${closeX}<h2 class="gold-title" style="margin-top: 6px">Settings</h2>${toggles()}
    <div class="actions"><button class="btn btn-purple" data-act="close">Done</button>
    <button class="btn btn-orange" data-act="reset" style="font-size: 18px; height: 48px">Reset progress</button></div>`);
}

// ---------- title ----------
function openTitle() { show('title'); $('titleStars').textContent = totalStars(); }
$('playBtn').addEventListener('click', () => { audio.unlock(); audio.sfx('click'); openMap(); });
$('titleSettings').addEventListener('click', () => { audio.unlock(); audio.sfx('click'); openSettings(); });

// ---------- map ----------
function openMap() {
  clearTimeout(endTimer);
  closeModal();
  if (game) { game.destroy(); }
  show('map'); buildMap();
}
function buildMap() {
  const inner = $('mapInner');
  inner.innerHTML = '';
  const W = $('app').clientWidth, secH = W * 1536 / 864, nSec = Math.ceil(LEVELS.length / MAP_PLATFORMS.length), pad = 150;
  inner.style.height = (nSec * secH + pad) + 'px';
  const filters = ['none', 'hue-rotate(-28deg) saturate(1.1)', 'hue-rotate(40deg) saturate(1.15)'];
  for (let s = 0; s < nSec; s++) {
    const img = document.createElement('img');
    img.className = 'sec'; img.src = A + 'map.jpg'; img.alt = '';
    img.style.top = ((nSec - 1 - s) * secH) + 'px'; img.style.height = secH + 'px'; img.style.filter = filters[s % filters.length];
    inner.appendChild(img);
  }
  const cur = Math.min(save.unlocked, LEVELS.length);
  let curPos = null;
  LEVELS.forEach((lv, i) => {
    const s = Math.floor(i / MAP_PLATFORMS.length), [px, py] = MAP_PLATFORMS[i % MAP_PLATFORMS.length];
    const x = px / 864 * W, y = (nSec - 1 - s) * secH + py / 1536 * secH;
    const n = i + 1, st = save.stars[n] || 0, locked = n > save.unlocked, isCur = n === cur;
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
      audio.sfx('click'); openLevelStart(i);
    });
    inner.appendChild(node);
    if (n % 3 === 0 && !save.rewarded[n]) {
      const ch = document.createElement('img');
      ch.className = 'map-chest'; ch.src = A + 'ui-chest.png'; ch.alt = '';
      ch.style.left = (x + (x > W / 2 ? 62 : -62)) + 'px'; ch.style.top = (y - 6) + 'px';
      inner.appendChild(ch);
    }
    if (isCur) curPos = { x, y };
  });
  WORLDS.forEach((w, i) => {
    const b = document.createElement('div');
    b.className = 'world-banner';
    b.innerHTML = `<small>WORLD ${i + 1}</small><b>${w.name}</b>`;
    b.style.top = ((nSec - i) * secH + (i === 0 ? 34 : 18)) + 'px';
    inner.appendChild(b);
  });
  if (LEVELS.length % MAP_PLATFORMS.length) {
    const k = LEVELS.length % MAP_PLATFORMS.length, [px, py] = MAP_PLATFORMS[Math.min(MAP_PLATFORMS.length - 1, k + 2)];
    const b = document.createElement('div');
    b.className = 'world-banner';
    b.innerHTML = '<small>MORE TO DIG</small><b>New levels soon</b>';
    b.style.top = (py / 1536 * secH) + 'px'; b.style.left = (px / 864 * W) + 'px';
    inner.appendChild(b);
  }
  if (curPos) {
    const d = document.createElement('img');
    d.className = 'map-digby'; d.src = A + 'mascot-happy.png'; d.alt = '';
    d.style.left = (curPos.x + (curPos.x > W / 2 ? -66 : 66)) + 'px'; d.style.top = (curPos.y + 24) + 'px';
    inner.appendChild(d);
    requestAnimationFrame(() => { $('mapScroll').scrollTop = curPos.y - $('mapScroll').clientHeight * 0.5; });
  }
  $('mapStars').textContent = totalStars();
  const lv = LEVELS[cur - 1];
  $('mapLevelName').textContent = `Level ${cur}`;
  $('mapLevelDesc').textContent = `${lv.goals.map((g) => goalText(lv, g)).join(' · ')}`;
  $('mapGoalIcon').src = goalIcon(lv.goals[0]);
  $('mapPlay').onclick = () => { audio.unlock(); audio.sfx('click'); openLevelStart(cur - 1); };
}
$('mapHome').addEventListener('click', () => { audio.sfx('click'); openTitle(); });
$('mapSettings').addEventListener('click', () => { audio.unlock(); audio.sfx('click'); openSettings(); });

function openLevelStart(i) {
  const lv = LEVELS[i], n = i + 1, best = save.best[n];
  modal(`${closeX}
    <div class="sub">${worldOf(n).name.toUpperCase()}</div>
    <h2 class="gold-title">Level ${n}</h2>
    <div class="goals">${lv.goals.map((g) => `<div class="goal"><img src="${goalIcon(g)}" alt=""><span>${goalAmount(lv, g).toLocaleString()}</span></div>`).join('')}</div>
    <div class="meta">${lv.goals.map((g) => goalText(lv, g)).join(' · ')}<br>in ${lv.moves} moves</div>
    ${lv.tip ? `<div class="tip"><img src="${A}mascot-happy.png" alt="" style="width: 46px; flex-shrink: 0"><div><b>DIGBY'S TIP</b>${lv.tip}</div></div>` : ''}
    ${best ? `<div class="meta">Your best: ${best.toLocaleString()}</div>` : ''}
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
  end: (res) => onEnd(res)
};

let lastStars = 0;
function startLevel(i) {
  clearTimeout(endTimer);
  closeModal();
  audio.unlock();
  current = i;
  if (game) game.destroy();
  show('game');
  setHammer(false);
  game = new Game(LEVELS[i], i, rd, hooks);
  rd.setGame(game);
  sizeBoard();
  $('lvlLabel').textContent = `Level ${i + 1}`;
  $('digby').src = A + 'mascot-happy.png';
  lastStars = 0;
  $('hudGoals').innerHTML = game.goals.map((g, k) => `<div class="goal" id="goal${k}"><img src="${goalIcon(g)}" alt=""><span></span><div class="check"></div></div>`).join('');
  updateHUD(game); updateBoosters(); syncSoundBtn();
  game.busy = true;
  const all = game.allPieces();
  all.forEach(({ p, r }) => { p.y = r - game.R - 1; });
  Promise.all(all.map(({ p, r, c }) => rd.tween(p, { y: r }, 520, 'outBounce', c * 28 + (game.R - r) * 22))).then(() => {
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
  if ($('game').classList.contains('active')) sizeBoard();
  if ($('map').classList.contains('active')) buildMap();
});

function updateHUD(g) {
  $('hudMoves').textContent = g.moves;
  $('hudMovesBox').classList.toggle('low', g.moves <= 5 && !g.ended);
  $('hudScore').textContent = g.score.toLocaleString();
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
  im.src = type === 'chest' ? A + 'ui-chest.png' : A + GEM_FILES[color] + '.png'; im.alt = '';
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
    save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length, n + 1));
    let reward = '';
    if (n % 3 === 0 && !save.rewarded[n]) { save.rewarded[n] = true; save.boosters.hammer++; save.boosters.shuffle++; reward = '+1 Hammer and +1 Shuffle'; }
    persist();
    audio.sfx('win');
    endTimer = setTimeout(() => showWin(res, reward), 700);
  } else {
    $('digby').src = A + 'mascot-oops.png';
    audio.sfx('fail');
    endTimer = setTimeout(showFail, 600);
  }
}
function showWin(res, reward) {
  const n = current + 1, last = n >= LEVELS.length;
  modal(`<img class="mascot" src="${A}mascot-happy.png" alt="Digby cheering">
    <div class="sub">LEVEL ${n}</div>
    <h2 class="gold-title">${last ? 'You did it!' : 'Complete!'}</h2>
    <div class="stars" role="img" aria-label="${res.stars} of 3 stars"><img src="${A}ui-star.png" alt="" id="ws0"><img src="${A}ui-star.png" class="mid" alt="" id="ws1"><img src="${A}ui-star.png" alt="" id="ws2"></div>
    <div class="scorebox"><div style="text-align: left"><div class="sub">SCORE</div><div class="v">${res.score.toLocaleString()}</div></div><div style="text-align: right"><div class="sub">BEST</div><div class="v" style="font-size: 22px">${(save.best[n] || res.score).toLocaleString()}</div></div></div>
    ${reward ? `<div class="reward"><img src="${A}ui-chest.png" alt=""><div><div class="h-font" style="font-size: 19px; color: var(--gold-2)">Treasure found!</div><div style="font-size: 13px; font-weight: 800">${reward}</div></div></div>` : ''}
    ${last ? '<div class="meta">You cleared every level in Gemfall. More caverns are coming soon!</div>' : ''}
    <div class="actions">
      ${last ? '' : '<button class="btn btn-green" data-act="next" style="height: 62px; font-size: 28px">Next level</button>'}
      <div class="row"><button class="btn btn-purple" data-act="restart">Replay</button><button class="btn btn-purple" data-act="map">Map</button></div>
    </div>`);
  for (let k = 0; k < res.stars; k++) setTimeout(() => { const s = $('ws' + k); if (s) { s.classList.add('on'); audio.sfx('star', k); } }, 350 + k * 380);
}
function showFail() {
  const g = game;
  const left = g.goals.filter((x) => (x.type === 'score' ? g.score < x.target : x.left > 0));
  modal(`<img class="mascot" src="${A}mascot-oops.png" alt="Digby scratching his head">
    <div class="sub">LEVEL ${current + 1}</div>
    <h2 class="gold-title">Out of moves</h2>
    <div class="meta" style="margin-top: 8px">So close! Still to go:</div>
    <div class="goals">${left.map((x) => `<div class="goal"><img src="${goalIcon(x)}" alt=""><span>${(x.type === 'score' ? x.target - g.score : x.left).toLocaleString()}</span></div>`).join('')}</div>
    <div class="tip"><img src="${A}sp-streak.png" alt="" style="width: 50px; flex-shrink: 0"><div><b>TIP</b>Make special gems early and save them for the hard spots. Retrying is always free: no lives, no waiting.</div></div>
    <div class="actions"><button class="btn btn-green" data-act="restart" style="height: 62px; font-size: 28px">Try again</button>
    <button class="btn btn-purple" data-act="map">Back to map</button></div>`);
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
  if (on && !tip) { const t = document.createElement('div'); t.className = 'hammer-tip'; t.textContent = 'Tap a gem or stone to smash it'; $('frame').appendChild(t); }
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
    if (game.busy || !k || !k.playable || (!k.piece && k.stone <= 0) || (k.piece && k.piece.kind === 'chest')) { audio.sfx('bad'); return; }
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
  if (Math.max(Math.abs(dx), Math.abs(dy)) < rd.cell * 0.32) return;
  drag.moved = true;
  const t = Math.abs(dx) > Math.abs(dy) ? { r: drag.cell.r, c: drag.cell.c + Math.sign(dx) } : { r: drag.cell.r + Math.sign(dy), c: drag.cell.c };
  sel = null; rd.selected = null;
  game.trySwap(drag.cell, t);
});
cv.addEventListener('pointerup', () => {
  if (!drag || !game) { drag = null; return; }
  const d = drag; drag = null;
  if (d.moved) return;
  const c = d.cell;
  if (sel && Math.abs(sel.r - c.r) + Math.abs(sel.c - c.c) === 1) { const a = sel; sel = null; rd.selected = null; game.trySwap(a, c); return; }
  if (sel && sel.r === c.r && sel.c === c.c) { sel = null; rd.selected = null; return; }
  if (game.pieceAt(c.r, c.c)) { sel = c; rd.selected = c; audio.sfx('click'); }
});
cv.addEventListener('pointercancel', () => { drag = null; });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('overlay').classList.contains('hidden')) closeModal(); });

// debugging and automated tests
window.__gemfall = { get game() { return game; }, startLevel, openMap, get save() { return save; }, get rd() { return rd; } };

(async () => {
  await preload();
  rd = new Renderer(cv, IMG);
  iceIcon = rd.sprites.ice[1].toDataURL();
  $('loading').classList.add('hidden');
  openTitle();
})();
