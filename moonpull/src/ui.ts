import { Game, Result, Mode } from './game';
import { COASTS, NIGHT_COUNT, getLevel } from './sim/levels';
import { BOATS } from './sim/boats';
import { INKS, LANTERNS } from './palettes';
import { save, persist, starCount, totalStars, nightUnlocked, modeUnlocked, COAST_NEED, rankProgress, rankOf, hasBoat, hasPower, UPGRADES, buyUpgrade, buyInk, buyLantern, missionText, claimMission, dailyAvailable, claimDaily, DAILY_GIFT, resetAll, today, RANKS } from './state';
import { sfx, initAudio, applyVolumes, suspendAudio } from './audio';
import { shareCanvas, onBack, onPause, onResume, exitApp, buzz } from './platform';
import { Sim } from './sim/sim';

const $ = (id: string) => document.getElementById(id)!;
const ui = $('ui');
let game: Game;
let screen = 'title', arg: any = null, lastResult: Result | null = null, harbourTab = 'boats';
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const stars = (m: number, cls = '') => [1, 2, 4].map(b => `<i class="star ${cls} ${m & b ? 'on' : ''}"></i>`).join('');
const POWERS = [
  { id: 'spring', name: 'Spring Tide', blurb: 'One huge swell under the moon, on demand.', rank: 2 },
  { id: 'still', name: 'Still Water', blurb: 'The sea goes flat for a moment.', rank: 5 },
];

let toastT = 0;
export function toast(s: string) { const t = $('toast'); t.textContent = s; t.classList.add('on'); clearTimeout(toastT); toastT = window.setTimeout(() => t.classList.remove('on'), 2400); }

function nextNight() { let i = 0; while (i < NIGHT_COUNT - 1 && (save.stars[i] & 1) && nightUnlocked(i + 1)) i++; return i; }
function missionBadge() { const n = save.missions.filter(m => m.done).length + (dailyAvailable() ? 1 : 0); return n ? `<span class="badge">${n}</span>` : ''; }
const head = (title: string, back = 'title') => `<header><button class="back" data-a="go:${back}" aria-label="Back">&larr;</button><h2>${title}</h2><span class="chip"><i class="fly"></i>${save.flies}</span></header>`;

const screens: Record<string, (a: any) => string> = {
  title: () => {
    const n = nextNight(); const done = save.stars.every(s => s & 1);
    return `<div class="screen title"><div class="brand"><h1>Moonpull</h1><p class="tag">You are the moon. Move the sea.</p>
      <div class="chips"><span class="chip"><i class="fly"></i>${save.flies}</span><span class="chip">${totalStars()} / ${NIGHT_COUNT * 3} stars</span><span class="chip">Voyage rank ${rankOf()}</span></div></div>
      <div class="menu">
        <button class="btn pri" data-a="pre:${n}">${done ? 'Sail again' : save.stats.nights ? 'Continue' : 'Set sail'} &middot; Night ${n + 1}</button>
        <button class="btn" data-a="go:map">Voyage map</button>
        <button class="btn" data-a="go:modes">Other waters</button>
        <button class="btn" data-a="go:harbour">Harbour</button>
        <div class="row"><button class="btn sm" data-a="go:missions">Tasks ${missionBadge()}</button><button class="btn sm" data-a="go:letter">Letter</button><button class="btn sm" data-a="go:settings">Settings</button></div>
      </div></div>`;
  },
  map: () => {
    const ts = totalStars(), nx = nextNight();
    return `<div class="screen"><div class="panel">${head('Voyage map')}<div class="body">${COASTS.map((c, ci) => {
      const open = ts >= COAST_NEED[ci] && (ci === 0 || (save.stars[ci * 10 - 1] & 1));
      const got = save.stars.slice(ci * 10, ci * 10 + 10).reduce((a, m) => a + starCount(m), 0);
      const why = ci > 0 && !open ? (!(save.stars[ci * 10 - 1] & 1) ? `Finish Night ${ci * 10} first` : `Needs ${COAST_NEED[ci]} stars. You have ${ts}.`) : '';
      return `<div class="coast"><h3>${c.name}<small>${c.sub} &middot; ${got}/30 stars</small></h3>${why ? `<span class="lockmsg">${why}</span>` : ''}
        <div class="nights">${Array.from({ length: 10 }, (_, k) => { const i = ci * 10 + k, u = nightUnlocked(i);
          return `<button class="night ${u ? '' : 'locked'} ${i === nx && u ? 'next' : ''}" ${u ? `data-a="pre:${i}"` : 'disabled'} aria-label="Night ${i + 1}">${i + 1}<span class="st">${stars(save.stars[i], 'sm')}</span></button>`; }).join('')}</div></div>`;
    }).join('')}</div></div></div>`;
  },
  pre: (i: number) => {
    const L = getLevel(i), m = save.stars[i]; const boat = BOATS.find(b => b.id === save.boat)!; const pw = POWERS.find(p => p.id === save.power);
    return `<div class="screen"><div class="panel narrow">${head(`Night ${i + 1} &middot; ${COASTS[L.coast].name}`, 'map')}<div class="body">
      <p class="hand">&ldquo;${L.line}&rdquo;</p>
      <div class="goals"><div><i class="star ${m & 1 ? 'on' : ''}"></i>Reach the harbour</div><div><i class="star ${m & 2 ? 'on' : ''}"></i>Gather 4 in 5 fireflies (${L.flies.length} tonight)</div><div><i class="star ${m & 4 ? 'on' : ''}"></i>Arrive within ${fmt(L.par)}${save.bestTime[i] ? ` &middot; your best ${fmt(save.bestTime[i])}` : ''}</div></div>
      <p class="muted">${boat.name}${pw ? ' &middot; ' + pw.name : ''}${L.pull < 1 ? ' &middot; waning moon, weaker pull' : ''}</p>
      </div><footer><button class="btn" data-a="go:harbour">Change boat</button><button class="btn pri" data-a="play:${i}">Set sail</button></footer></div></div>`;
  },
  modes: () => {
    const card = (id: string, name: string, blurb: string, need: string, extra: string) => { const u = modeUnlocked(id);
      return `<div class="item"><div class="t"><b>${name}</b><span class="muted">${u ? blurb : need}</span>${u && extra ? `<span class="muted">${extra}</span>` : ''}</div><button class="btn ${u ? 'pri' : ''} sm" ${u ? `data-a="mode:${id}"` : 'disabled'}>${u ? 'Sail' : 'Locked'}</button></div>`; };
    return `<div class="screen"><div class="panel narrow">${head('Other waters')}<div class="body">
      ${card('daily', 'Daily Tide', 'One new coast every day. 50 extra fireflies the first time you finish it.', 'Finish Night 3 to open', save.dailyBest.date === today() ? `Today's best: ${save.dailyBest.score}` : 'Not sailed today')}
      ${card('endless', 'Endless Night', 'No harbour. See how far the lantern gets.', 'Finish Night 10 to open', save.endlessBest ? `Best score: ${save.endlessBest}` : '')}
      ${card('drift', 'Drift', 'No rocks, nothing to lose. Just the sea, the moon and the music.', 'Finish Night 5 to open', '')}
    </div></div></div>`;
  },
  harbour: () => {
    const tabs = [['boats', 'Boats'], ['powers', 'Moon powers'], ['upgrades', 'Upgrades'], ['inks', 'Inks'], ['lanterns', 'Lanterns']];
    let body = '';
    if (harbourTab === 'boats') body = BOATS.map(b => { const u = hasBoat(b.id), sel = save.boat === b.id;
      return `<div class="item ${sel ? 'sel' : ''}"><div class="t"><b>${b.name}</b><span class="muted">${b.blurb}</span><span class="muted">Speed ${'●'.repeat(Math.round((b.accel - 0.5) * 6))} &middot; Knocks ${b.hp + save.up.hull}</span></div>${u ? `<button class="btn sm" ${sel ? 'disabled' : `data-a="boat:${b.id}"`}>${sel ? 'Sailing' : 'Choose'}</button>` : `<span class="muted">Voyage rank ${b.rank}</span>`}</div>`; }).join('');
    if (harbourTab === 'powers') body = `<p class="muted">One power comes with you each night. Tap the moon button to use it, then wait for it to return.</p>` + POWERS.map(p => { const u = hasPower(p.id), sel = save.power === p.id;
      return `<div class="item ${sel ? 'sel' : ''}"><div class="t"><b>${p.name}</b><span class="muted">${p.blurb}</span></div>${u ? `<button class="btn sm" ${sel ? 'disabled' : `data-a="power:${p.id}"`}>${sel ? 'Equipped' : 'Equip'}</button>` : `<span class="muted">Voyage rank ${p.rank}</span>`}</div>`; }).join('');
    if (harbourTab === 'upgrades') body = UPGRADES.map(u => { const lv = save.up[u.id], c = u.cost[lv];
      return `<div class="item"><div class="t"><b>${u.name}</b><span class="muted">${u.blurb}</span><span class="pips">${u.cost.map((_, k) => `<i class="${k < lv ? 'on' : ''}"></i>`).join('')}</span></div>${c !== undefined ? `<button class="btn sm ${save.flies >= c ? 'pri' : ''}" ${save.flies >= c ? `data-a="up:${u.id}"` : 'disabled'}><i class="fly"></i>${c}</button>` : '<span class="muted">Complete</span>'}</div>`; }).join('');
    if (harbourTab === 'inks') body = `<div class="item ${save.ink === 'auto' ? 'sel' : ''}"><div class="t"><b>Follow the coast</b><span class="muted">Each coast keeps its own colours.</span></div><button class="btn sm" ${save.ink === 'auto' ? 'disabled' : 'data-a="ink:auto"'}>${save.ink === 'auto' ? 'In use' : 'Use'}</button></div>` + INKS.map(k => { const own = save.inks.includes(k.id), sel = save.ink === k.id;
      return `<div class="item ${sel ? 'sel' : ''}"><span class="sw" style="background:linear-gradient(${k.sky} 50%,${k.sea} 50%)"></span><div class="t"><b>${k.name}</b></div>${own ? `<button class="btn sm" ${sel ? 'disabled' : `data-a="ink:${k.id}"`}>${sel ? 'In use' : 'Use'}</button>` : k.id === 'ember' ? '<span class="muted">Voyage rank 10</span>' : `<button class="btn sm ${save.flies >= k.price ? 'pri' : ''}" ${save.flies >= k.price ? `data-a="buyink:${k.id}"` : 'disabled'}><i class="fly"></i>${k.price}</button>`}</div>`; }).join('');
    if (harbourTab === 'lanterns') body = LANTERNS.map(k => { const own = save.lanterns.includes(k.id), sel = save.lantern === k.id; const ranked = k.id === 'jade' ? 8 : k.id === 'pearl' ? 12 : 0;
      return `<div class="item ${sel ? 'sel' : ''}"><span class="sw" style="background:${k.c}"></span><div class="t"><b>${k.name}</b></div>${own ? `<button class="btn sm" ${sel ? 'disabled' : `data-a="lantern:${k.id}"`}>${sel ? 'Lit' : 'Light'}</button>` : ranked ? `<span class="muted">Voyage rank ${ranked}</span>` : `<button class="btn sm ${save.flies >= k.price ? 'pri' : ''}" ${save.flies >= k.price ? `data-a="buylantern:${k.id}"` : 'disabled'}><i class="fly"></i>${k.price}</button>`}</div>`; }).join('');
    return `<div class="screen"><div class="panel">${head('Harbour')}<div class="body"><div class="tabs">${tabs.map(([id, n]) => `<button class="tab ${harbourTab === id ? 'on' : ''}" data-a="tab:${id}">${n}</button>`).join('')}</div>${body}</div></div></div>`;
  },
  missions: () => {
    const rp = rankProgress(); const avail = dailyAvailable(); const day = avail ? (save.daily.streak % 7) : ((save.daily.streak - 1) % 7);
    return `<div class="screen"><div class="panel">${head('Tasks and gifts')}<div class="body">
      <div><b>Voyage rank ${rp.rank}</b><div class="bar"><i style="width:${Math.round(rp.frac * 100)}%"></i></div><span class="muted">${rp.next ? `Next: ${rp.next}, ${rp.toGo} leagues away` : 'Top rank reached'}</span></div>
      <div><b>Daily gift</b><div class="week">${DAILY_GIFT.map((g, k) => `<div class="${k < day || (!avail && k === day) ? 'got' : avail && k === day ? 'now' : ''}">Day ${k + 1}<br><b>${g}</b></div>`).join('')}</div></div>
      ${avail ? `<button class="btn pri" data-a="gift">Collect today's gift</button>` : `<span class="muted">Come back tomorrow for the next gift. Miss a day and the week starts over.</span>`}
      <b>Tasks</b>
      ${save.missions.map((m, i) => `<div class="item"><div class="t"><b>${missionText(m)}</b><div class="bar"><i style="width:${Math.round(m.prog / m.goal * 100)}%"></i></div><span class="muted">${m.prog} / ${m.goal}</span></div><button class="btn sm ${m.done ? 'pri' : ''}" ${m.done ? `data-a="claim:${i}"` : 'disabled'}><i class="fly"></i>${m.reward}</button></div>`).join('')}
    </div></div></div>`;
  },
  letter: () => {
    const done = save.stars.map(s => s & 1);
    const n = done.filter(Boolean).length;
    return `<div class="screen"><div class="panel narrow">${head('The letter')}<div class="body letter">
      ${n === 0 ? '<span class="muted">The letter is folded inside the boat. Each night you finish reveals one line.</span>' : ''}
      ${Array.from({ length: NIGHT_COUNT }, (_, i) => done[i] ? `<p class="${i % 10 === 0 && i ? 'gap' : ''}">${getLevel(i).line}</p>` : '').join('')}
      ${n > 0 && n < NIGHT_COUNT ? `<span class="muted">${NIGHT_COUNT - n} lines still folded away.</span>` : ''}
      <div class="tabs"><button class="tab" data-a="scene:intro">Replay: the storm</button>${save.seen.coast1 ? '<button class="tab" data-a="scene:coast1">Replay: the lights</button>' : ''}${save.seen.coast2 ? '<button class="tab" data-a="scene:coast2">Replay: the dark</button>' : ''}${save.seen.ending ? '<button class="tab" data-a="scene:ending">Replay: home</button>' : ''}</div>
    </div></div></div>`;
  },
  settings: () => {
    const t = (k: keyof typeof save.settings, name: string, sub = '') => `<div class="toggle"><div><b>${name}</b>${sub ? `<br><span class="muted">${sub}</span>` : ''}</div><button class="sw2 ${save.settings[k] ? 'on' : ''}" data-a="set:${k}" role="switch" aria-checked="${save.settings[k]}" aria-label="${name}"></button></div>`;
    return `<div class="screen"><div class="panel narrow">${head('Settings')}<div class="body">
      ${t('sfx', 'Sound effects')}${t('music', 'Music')}${t('haptics', 'Vibration')}
      ${t('left', 'Left-handed', 'Moves the moon power button to the left side.')}
      ${t('contrast', 'High contrast', 'Outlines rocks and fireflies so they stand out in every ink.')}
      ${t('reduced', 'Reduce motion', 'Turns off screen shake, flashes and slow motion.')}
      <div class="toggle"><div><b>Start over</b><br><span class="muted">Erases all progress on this device.</span></div><button class="btn sm" data-a="${arg === 'confirm' ? 'reset' : 'askreset'}">${arg === 'confirm' ? 'Yes, erase everything' : 'Erase'}</button></div>
      <span class="muted">Moonpull 1.0.0. Plays offline. Your progress is stored only on this device; the game collects no personal data.</span>
    </div></div></div>`;
  },
  pause: () => `<div class="screen"><div class="panel narrow"><header><h2>Paused</h2></header><div class="body">
      <button class="btn pri" data-a="resume">Resume</button><button class="btn" data-a="restart">Start this run again</button><button class="btn" data-a="photo">Photo mode</button><button class="btn" data-a="quit">${game.mode === 'night' ? 'Back to the map' : 'End run'}</button></div></div></div>`,
  revive: () => `<div class="screen"><div class="panel narrow"><header><h2>The lantern went out</h2></header><div class="body"><p>Relight it once and carry on from here?</p></div>
      <footer><button class="btn" data-a="norevive">Let it go</button><button class="btn pri" data-a="revive"><i class="fly"></i>40 &middot; Relight</button></footer></div></div>`,
  result: (r: Result) => {
    const rp = rankProgress(); const night = r.mode === 'night';
    const title = r.quit && r.mode !== 'drift' ? 'Run ended' : night ? (r.win ? 'Harbour reached' : 'The lantern went out') : r.mode === 'drift' ? 'Drift ended' : r.mode === 'daily' ? (r.win ? 'Daily Tide finished' : 'The lantern went out') : 'The lantern went out';
    const newMask = r.mask & ~r.oldMask;
    const starRow = night && r.win ? `<div class="bigstars">${[1, 2, 4].map((b, k) => `<i class="star ${(r.mask | r.oldMask) & b ? 'on' : ''} ${r.mask & b ? 'pop' : ''}" style="animation-delay:${0.25 + k * 0.3}s" data-s="${r.mask & b ? k : ''}"></i>`).join('')}</div>` : '';
    const s = (v: string | number, l: string) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`;
    const stats = night ? s(fmt(r.time), `time (goal ${fmt(r.par)})`) + s(`${r.flies}/${r.fliesTotal}`, 'fireflies') + s(r.near, 'close shaves') + s('×' + r.peak, 'best streak')
      : s(r.score, r.best ? 'score, new best' : 'score') + s(r.dist + ' m', 'distance') + s(r.flies, 'fireflies') + s('×' + r.peak, 'best streak');
    const canNext = night && r.win && r.night < NIGHT_COUNT - 1 && nightUnlocked(r.night + 1);
    const blocked = night && r.win && r.night < NIGHT_COUNT - 1 && !canNext;
    return `<div class="screen"><div class="panel"><header><h2>${title}</h2><span class="chip"><i class="fly"></i>+${r.earned}</span></header><div class="body">
      ${starRow}${night && r.win && newMask === 0 && r.oldMask ? '<span class="muted" style="text-align:center">No new stars this time.</span>' : ''}
      <div class="stats">${stats}</div>
      ${r.unlocks.map(u => `<div class="unlock">Voyage rank up: ${u}</div>`).join('')}
      <div><div class="bar"><i style="width:${Math.round(rp.frac * 100)}%"></i></div><span class="muted">Voyage rank ${rp.rank}${rp.next ? ` &middot; next: ${rp.next}` : ''}</span></div>
      ${blocked ? `<span class="lockmsg">The next coast needs ${COAST_NEED[Math.floor((r.night + 1) / 10)]} stars. You have ${totalStars()}. Earn more on earlier nights.</span>` : ''}
      </div><footer><button class="btn sm" data-a="share">Share</button><button class="btn" data-a="go:${night ? 'map' : 'modes'}">${night ? 'Map' : 'Back'}</button><button class="btn ${canNext ? '' : 'pri'}" data-a="again">${r.win ? 'Sail again' : 'Try again'}</button>${canNext ? `<button class="btn pri" data-a="pre:${r.night + 1}">Next night</button>` : ''}</footer></div></div>`;
  },
};

export function go(name: string, a: any = null) {
  screen = name; arg = a;
  ui.innerHTML = screens[name] ? screens[name](a) : '';
  ui.className = name === 'title' || name === '' ? '' : 'dim';
  $('hud').hidden = name !== '' || game.photo || !!game.story;
  if (name === 'result' && a?.win && a.mode === 'night') ui.querySelectorAll<HTMLElement>('.star.pop').forEach(el => { const k = +(el.dataset.s || 0); setTimeout(() => { sfx.star(k); buzz('light'); }, 250 + k * 300); });
}

function play(mode: Mode, night = 0) {
  const begin = () => { game.start(mode, night); setupHud(); go(''); };
  if (mode === 'night' && night === 0 && !save.seen.intro) { save.seen.intro = true; persist(); story('intro', begin); }
  else begin();
}
function story(key: string, done: () => void) { go(''); $('hud').hidden = true; $('hint').hidden = true; game.playStory(key, () => { $('storybar').hidden = true; done(); }); $('storybar').hidden = false; }
function attract() { game.start('attract'); $('hud').hidden = true; $('hint').hidden = true; }

function setupHud() {
  const sim = game.sim!; const p = $('power');
  p.hidden = sim.cfg.power === 'none'; p.classList.toggle('left', save.settings.left);
  $('plabel').innerHTML = sim.cfg.power === 'spring' ? 'SPRING<br>TIDE' : 'STILL<br>WATER';
  $('prog').hidden = !isFinite(sim.level.length);
  lastHud = '';
}
let lastHud = '';
function hud(sim: Sim) {
  const max = sim.cfg.boat.hp + sim.cfg.hull; const key = `${sim.boat.hp}|${sim.fliesGot}|${Math.floor(sim.boat.x / 20)}|${Math.ceil(sim.powerCd * 10)}`;
  if (key === lastHud) return; lastHud = key;
  if (game.mode !== 'drift') $('hp').innerHTML = Array.from({ length: max }, (_, i) => `<i class="${i < sim.boat.hp ? '' : 'off'}"></i>`).join(''); else $('hp').innerHTML = '';
  $('hf').textContent = isFinite(sim.level.length) ? `${sim.fliesGot}/${sim.fliesTotal}` : String(sim.fliesGot);
  if (isFinite(sim.level.length)) { const f = Math.max(0, Math.min(1, sim.boat.x / sim.level.length)); $('progfill').style.width = f * 100 + '%'; $('progboat').style.left = f * 100 + '%'; $('dist').textContent = fmt(sim.t); }
  else $('dist').textContent = game.mode === 'drift' ? '' : `${Math.round(sim.score)}`;
  const cd = sim.powerMax > 0 ? Math.max(0, sim.powerCd) / sim.powerMax : 0;
  $('pring').style.strokeDashoffset = String(163.4 * cd); $('power').classList.toggle('cd', cd > 0);
}

function afterResult(r: Result) {
  lastResult = r;
  const show = () => { attractBehind(); go('result', r); };
  if (r.mode === 'night' && r.win) {
    const key = r.night === 9 ? 'coast1' : r.night === 19 ? 'coast2' : r.night === 29 ? 'ending' : '';
    if (key && !save.seen[key]) { save.seen[key] = true; persist(); story(key, show); return; }
  }
  show();
}
function attractBehind() { /* keep the finished scene on screen behind the result card */ }

const actions: Record<string, (a: string) => void> = {
  go: a => { if (a === 'title' && game.mode !== 'attract') attract(); if ((a === 'map' || a === 'modes') && game.mode !== 'attract') attract(); go(a); },
  pre: a => { if (game.mode !== 'attract') attract(); go('pre', +a); },
  play: a => play('night', +a),
  mode: a => play(a as Mode),
  tab: a => { harbourTab = a; go('harbour'); },
  boat: a => { save.boat = a; persist(); go('harbour'); },
  power: a => { save.power = a as any; persist(); go('harbour'); },
  up: a => { if (buyUpgrade(a as any)) { sfx.buy(); toast('Upgraded'); } go('harbour'); },
  ink: a => { save.ink = a; persist(); go('harbour'); },
  buyink: a => { if (buyInk(a)) { sfx.buy(); save.ink = a; persist(); toast('New ink unlocked'); } go('harbour'); },
  lantern: a => { save.lantern = a; persist(); go('harbour'); },
  buylantern: a => { if (buyLantern(a)) { sfx.buy(); save.lantern = a; persist(); toast('New lantern unlocked'); } go('harbour'); },
  claim: a => { const n = claimMission(+a); if (n) { sfx.buy(); toast(`+${n} fireflies`); } go('missions'); },
  gift: () => { const n = claimDaily(); if (n) { sfx.buy(); toast(`Day ${((save.daily.streak - 1) % 7) + 1} gift: +${n} fireflies`); } go('missions'); },
  set: a => { const k = a as keyof typeof save.settings; save.settings[k] = !save.settings[k]; persist(); applyVolumes(); go('settings'); },
  askreset: () => go('settings', 'confirm'),
  reset: () => { resetAll(); toast('Progress erased'); go('title'); },
  scene: a => story(a, () => { attract(); go('letter'); }),
  resume: () => { game.setPaused(false); go(''); },
  restart: () => { play(game.mode, game.night); },
  photo: () => { game.photo = true; go(''); $('hud').hidden = true; $('hint').hidden = true; $('photobar').hidden = false; },
  photoback: () => { game.photo = false; $('photobar').hidden = true; go('pause'); },
  photoshare: async () => { const ok = await shareCanvas(game.canvas, 'Moonpull'); if (!ok) toast('Sharing is not available here'); },
  quit: () => { game.setPaused(false); const r = game.quitRun(); if (r) afterResult(r); else { attract(); go('map'); } },
  revive: () => { if (save.flies >= 40) { save.flies -= 40; persist(); game.revive(); go(''); } },
  norevive: () => { if (lastResult) { game.commit(lastResult); afterResult(lastResult); } },
  again: () => { if (lastResult) play(lastResult.mode, lastResult.night); },
  share: async () => { const r = lastResult; if (!r) return; const ok = await shareCanvas(game.canvas, r.mode === 'night' ? `Night ${r.night + 1} in Moonpull` : `I scored ${r.score} in Moonpull`); if (!ok) toast('Sharing is not available here'); },
  skipstory: () => game.skipStory(),
};

export function initUI(g: Game) {
  game = g;
  document.addEventListener('click', e => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-a]'); if (!el) return;
    initAudio(); sfx.click();
    const [k, ...rest] = el.dataset.a!.split(':'); actions[k]?.(rest.join(':'));
  });
  document.addEventListener('pointerdown', () => initAudio(), { once: true });
  $('pause').addEventListener('click', () => { if (game.sim && !game.ended && screen === '') { game.setPaused(true); go('pause'); } });
  const pw = $('power');
  pw.addEventListener('pointerdown', e => { e.preventDefault(); game.sim?.usePower(); });
  game.onHud = hud;
  game.onHint = s => { const h = $('hint'); h.textContent = s; h.hidden = !s || game.photo; };
  game.onStoryText = (s, i, n) => { $('storytext').textContent = s; $('storydots').textContent = n ? `${i + 1} / ${n} · tap to continue` : ''; };
  game.onEnd = r => { $('hint').hidden = true; lastResult = r; if (r.canRevive) go('revive'); else afterResult(r); };
  onBack(() => {
    if (game.story) return game.skipStory();
    if (game.photo) return actions.photoback('');
    if (screen === '') { if (game.sim && !game.ended) { game.setPaused(true); go('pause'); } return; }
    if (screen === 'pause') return actions.resume('');
    if (screen === 'title') return exitApp();
    if (screen === 'revive') return actions.norevive('');
    actions.go(screen === 'pre' ? 'map' : 'title');
  });
  onPause(() => { if (screen === '' && game.sim && !game.ended && !game.story && game.mode !== 'attract') { game.setPaused(true); go('pause'); } suspendAudio(true); });
  onResume(() => suspendAudio(false));
  attract(); go('title');
  if (dailyAvailable() && save.stats.nights > 0) setTimeout(() => toast('A daily gift is waiting in Tasks'), 800);
}
export { RANKS };
