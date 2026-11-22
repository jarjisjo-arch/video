import { Game, Result, Mode } from './game';
import { COASTS, NIGHT_COUNT, getLevel } from './sim/levels';
import { BOATS } from './sim/boats';
import { I } from './icons';
import {
  save, persist, starCount, totalStars, nightUnlocked, modeUnlocked, COAST_NEED, rankProgress, rankOf, UPGRADES, buyUpgrade, buyBoat, missionText, claimMission,
  dailyAvailable, claimDaily, DAILY_GIFT, resetAll, today, VILLAGE, buildItem, nextBuild, LANTERNS, JAR, openJar, completed,
} from './state';
import { sfx, initAudio, applyVolumes, suspendAudio } from './audio';
import { shareCanvas, onBack, onPause, onResume, exitApp, buzz } from './platform';
import { Sim } from './sim/surf';

const $ = (id: string) => document.getElementById(id)!;
const ui = $('ui');
let game: Game;
let screen = 'home', arg: any = null, lastResult: Result | null = null, tab = 'boats', mapCoast = -1;
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const ic = (k: keyof typeof I, cls = '') => `<span class="ic ${cls}">${I[k]}</span>`;
const num = (n: number) => n.toLocaleString('en-US');

let toastT = 0;
export function toast(s: string) { const t = $('toast'); t.textContent = s; t.classList.add('on'); clearTimeout(toastT); toastT = window.setTimeout(() => t.classList.remove('on'), 2200); }
function nextNight() { let i = 0; while (i < NIGHT_COUNT - 1 && (save.stars[i] & 1) && nightUnlocked(i + 1)) i++; return i; }
const head = (title: string, back = 'home') => `<header><button class="round" data-a="go:${back}" aria-label="Back">${I.back}</button><h2>${title}</h2><span class="chip"><span class="ic">${I.fly}</span>${num(save.flies)}</span></header>`;
const modal = (inner: string, narrow = false) => `<div class="modal"><div class="panel ${narrow ? 'narrow' : ''}">${inner}</div></div>`;
const taskBadge = () => { const n = save.missions.filter(m => m.done).length + (dailyAvailable() ? 1 : 0) + (save.jar >= JAR ? 1 : 0); return n ? `<span class="badge">${n}</span>` : ''; };

const POWERS_NOTE = '';
const screens: Record<string, (a: any) => string> = {
  home: () => {
    const n = nextNight(), rp = rankProgress(), nb = nextBuild(), done = completed() === NIGHT_COUNT;
    const tile = (a: string, icon: keyof typeof I, label: string, extra = '', locked = false) => `<button class="tile ${locked ? 'lockd' : ''}" data-a="${a}"><span class="round">${I[icon]}</span>${label}${extra}</button>`;
    return `<div class="home">
      <div class="logo"><h1>Moonpull</h1><p>You are the moon. Move the sea.</p></div>
      <div class="topr"><span class="chip"><span class="ic">${I.fly}</span>${num(save.flies)}</span><span class="chip star"><span class="ic">${I.star}</span>${totalStars()}</span>
        <span class="rank" title="Voyage rank"><i>${rp.rank}</i><span class="bar"><i style="width:${Math.round(rp.frac * 100)}%"></i></span></span></div>
      ${nb ? `<button class="build" data-a="go:village">${ic('house')}<span>Rebuild the village: <b>${nb.name}</b></span><span class="chip"><span class="ic">${I.fly}</span>${nb.cost}</span></button>` : ''}
      <div class="dock">
        ${tile('go:map', 'map', 'Voyage')}${tile('go:modes', 'waves', 'Waters', '', !modeUnlocked('daily'))}${tile('go:harbour', 'boat', 'Harbour')}
        ${tile('go:village', 'house', 'Village')}${tile('go:tasks', 'scroll', 'Tasks', taskBadge())}${tile('go:letter', 'letter', 'Letter')}${tile('go:settings', 'gear', 'Settings')}
      </div>
      <div class="playbox"><button class="btn ember big" data-a="pre:${n}">${ic('play')}${done ? 'Sail again' : 'Play'}</button><span class="sub">Night ${n + 1} · ${COASTS[Math.floor(n / 8)].name}</span></div>
    </div>`;
  },
  map: () => {
    const nx = nextNight(); if (mapCoast < 0) mapCoast = Math.floor(nx / 8);
    const ci = mapCoast, ts = totalStars();
    const open = ts >= COAST_NEED[ci] && (ci === 0 || (save.stars[ci * 8 - 1] & 1));
    const why = !open ? (!(save.stars[ci * 8 - 1] & 1) ? `Finish Night ${ci * 8} to sail here.` : `Needs ${COAST_NEED[ci]} stars. You have ${ts}.`) : '';
    const W = 640, xs = Array.from({ length: 8 }, (_, k) => 50 + k * (W - 100) / 7), ys = xs.map((_, k) => 96 + Math.sin(k * 1.1 + ci) * 46);
    const path = xs.map((x, k) => `${k ? 'L' : 'M'}${x},${ys[k]}`).join(' ');
    const got = save.stars.slice(ci * 8, ci * 8 + 8).reduce((a, m) => a + starCount(m), 0);
    return modal(`${head('Voyage')}<div class="body">
      <div class="tabs">${COASTS.map((c, k) => `<button class="tab ${k === ci ? 'on' : ''}" data-a="coast:${k}">${c.name}</button>`).join('')}</div>
      <span class="muted">${COASTS[ci].sub} · ${got} of 24 stars${why ? ` · <span style="color:#ffb3a8">${why}</span>` : ''}</span>
      <div class="scrollx"><div class="route"><svg class="path" viewBox="0 0 ${W} 200" preserveAspectRatio="none"><path d="${path}" fill="none" stroke="rgba(255,230,170,.35)" stroke-width="3" stroke-dasharray="2 10" stroke-linecap="round"/></svg>
        ${xs.map((x, k) => { const i = ci * 8 + k, u = nightUnlocked(i), m = save.stars[i];
          return `<button class="node ${!u ? 'locked' : m & 1 ? 'done' : ''} ${i === nx && u ? 'next' : ''}" style="left:${(x / W) * 100}%;top:${ys[k]}px" ${u ? `data-a="pre:${i}"` : 'disabled'} aria-label="Night ${i + 1}">${u ? i + 1 : I.lock}${u ? `<span class="st">${[1, 2, 4].map(b => `<span class="ic ${m & b ? 'on' : ''}">${I.star}</span>`).join('')}</span>` : ''}</button>`; }).join('')}
      </div></div></div>`);
  },
  pre: (i: number) => {
    const L = getLevel(i), m = save.stars[i], boat = BOATS.find(b => b.id === save.boat)!;
    const st = (b: number) => `<span class="ic ${m & b ? 'on' : ''}">${I.star}</span>`;
    return modal(`${head(`Night ${i + 1}`, 'map')}<div class="body">
      <p class="quote">“${L.line}”</p>
      <div class="goals"><div>${st(1)}Reach the harbour before the storm</div><div>${st(2)}Gather ${Math.ceil(L.flies.length * 0.7)} of ${L.flies.length} fireflies</div><div>${st(4)}Arrive within ${fmt(L.par)}${save.bestTime[i] ? ` <span class="muted">· best ${fmt(save.bestTime[i])}</span>` : ''}</div></div>
      <span class="muted">${COASTS[L.coast].name} · ${boat.name}</span>
      </div><footer><button class="btn glass" data-a="go:harbour">${ic('boat')}Boat</button><button class="btn ember big" data-a="play:${i}">${ic('play')}Set sail</button></footer>`, true);
  },
  modes: () => {
    const card = (id: string, name: string, blurb: string, need: string, extra: string) => { const u = modeUnlocked(id);
      return `<div class="card"><div class="pic">${I[id === 'daily' ? 'gift' : id === 'endless' ? 'moon' : 'waves']}</div><div class="t"><b>${name}</b><span class="muted">${u ? blurb : need}</span>${u && extra ? `<span class="muted">${extra}</span>` : ''}</div><button class="btn ${u ? 'ember' : 'glass'} sm" ${u ? `data-a="mode:${id}"` : 'disabled'}>${u ? 'Sail' : ic('lock')}</button></div>`; };
    return modal(`${head('Other waters')}<div class="body">
      ${card('daily', 'Daily Tide', 'A new coast every day. 60 bonus fireflies the first time you finish it.', 'Finish Night 3 to open.', save.dailyBest.date === today() ? `Today's best: ${num(save.dailyBest.score)}` : 'Not sailed today')}
      ${card('endless', 'Endless Night', 'No harbour. The storm never stops. How far can you go?', 'Finish Night 8 to open.', save.endlessBest ? `Best: ${num(save.endlessBest)}` : '')}
      ${card('drift', 'Drift', 'No rocks, no storm. Just the sea, the moon and the music.', 'Finish Night 4 to open.', '')}
    </div>`, true);
  },
  harbour: () => {
    const tabs = [['boats', 'Boats'], ['lanterns', 'Lanterns'], ['upgrades', 'Upgrades']];
    let body = '';
    if (tab === 'boats') body = BOATS.map(b => { const own = save.boats.includes(b.id), sel = save.boat === b.id;
      const action = own ? `<button class="btn sm ${sel ? 'glass' : 'teal'}" ${sel ? 'disabled' : `data-a="boat:${b.id}"`}>${sel ? 'Sailing' : 'Choose'}</button>`
        : b.price ? `<button class="btn sm" ${save.flies >= b.price ? `data-a="buyboat:${b.id}"` : 'disabled'}><span class="ic">${I.fly}</span>${b.price}</button>` : `<span class="muted">Voyage rank ${b.rank}</span>`;
      return `<div class="card ${sel ? 'sel' : ''}"><div class="pic"><canvas data-boat="${b.id}" width="112" height="88"></canvas></div><div class="t"><b>${b.name}</b><span class="muted">${b.blurb}</span><span class="muted">${b.hearts + save.up.hearts} lanterns</span></div>${action}</div>`; }).join('');
    if (tab === 'lanterns') body = LANTERNS.map(l => { const own = save.lanterns.includes(l.id), sel = save.lantern === l.id;
      return `<div class="card ${sel ? 'sel' : ''}"><div class="pic" style="color:${l.c}"><span class="ic" style="width:30px;height:30px;filter:drop-shadow(0 0 8px ${l.c})">${I.lantern}</span></div><div class="t"><b>${l.name}</b><span class="muted">${own ? 'Lights the water around the boat' : 'Earned from voyage ranks and star jars'}</span></div>${own ? `<button class="btn sm ${sel ? 'glass' : 'teal'}" ${sel ? 'disabled' : `data-a="lantern:${l.id}"`}>${sel ? 'Lit' : 'Light'}</button>` : ic('lock')}</div>`; }).join('');
    if (tab === 'upgrades') body = UPGRADES.map(u => { const lv = save.up[u.id], c = u.cost[lv];
      return `<div class="card"><div class="pic">${I[u.id === 'magnet' ? 'lantern' : 'boat']}</div><div class="t"><b>${u.name}</b><span class="muted">${u.blurb}</span><span class="pips">${u.cost.map((_, k) => `<i class="${k < lv ? 'on' : ''}"></i>`).join('')}</span></div>${c !== undefined ? `<button class="btn sm" ${save.flies >= c ? `data-a="up:${u.id}"` : 'disabled'}><span class="ic">${I.fly}</span>${c}</button>` : '<span class="muted">Complete</span>'}</div>`; }).join('');
    return modal(`${head('Harbour')}<div class="body"><div class="tabs">${tabs.map(([id, n]) => `<button class="tab ${tab === id ? 'on' : ''}" data-a="tab:${id}">${n}</button>`).join('')}</div>${body}</div>`);
  },
  village: () => {
    const built = save.built.length;
    return modal(`${head('The village')}<div class="body">
      <span class="muted">The storm left the village dark. Spend fireflies to light it again. ${built} of ${VILLAGE.length} restored. Every four nights you finish, another boat comes home.</span>
      ${VILLAGE.map(v => { const has = save.built.includes(v.id), canBuy = !has && save.flies >= v.cost, isNext = nextBuild()?.id === v.id;
        return `<div class="card ${has ? 'sel' : ''}"><div class="pic" style="color:${has ? 'var(--gold1)' : '#56608f'}">${I.house}</div><div class="t"><b>${v.name}</b><span class="muted">${v.blurb}</span></div>${has ? '<span class="muted">Lit</span>' : `<button class="btn sm ${canBuy ? '' : 'glass'}" ${canBuy && isNext ? `data-a="build:${v.id}"` : 'disabled'}><span class="ic">${I.fly}</span>${v.cost}</button>`}</div>`; }).join('')}
    </div>`);
  },
  tasks: () => {
    const rp = rankProgress(), avail = dailyAvailable(), day = avail ? save.daily.streak % 7 : (save.daily.streak - 1) % 7;
    return modal(`${head('Tasks and gifts')}<div class="body">
      <div class="card"><div class="pic">${I.gift}</div><div class="t"><b>Daily gift</b><div class="week">${DAILY_GIFT.map((g, k) => `<div class="${k < day || (!avail && k === day) ? 'got' : avail && k === day ? 'now' : ''}">Day ${k + 1}<b>${g}</b></div>`).join('')}</div></div></div>
      ${avail ? `<button class="btn ember" data-a="gift">${ic('gift')}Collect today's gift</button>` : '<span class="muted">Come back tomorrow for the next gift. Miss a day and the week starts over.</span>'}
      <div class="card"><div class="pic">${I.jar}</div><div class="t"><b>Star jar</b><span class="muted">Every ${JAR} stars you earn fill a jar of fireflies.</span><div class="bar gold"><i style="width:${Math.min(100, save.jar / JAR * 100)}%"></i></div></div>${save.jar >= JAR ? `<button class="btn sm" data-a="jar">Open</button>` : `<span class="muted">${save.jar}/${JAR}</span>`}</div>
      <div class="card"><div class="pic" style="color:var(--teal1)">${I.moon}</div><div class="t"><b>Voyage rank ${rp.rank}</b><div class="bar"><i style="width:${Math.round(rp.frac * 100)}%"></i></div><span class="muted">${rp.next ? `Next: ${rp.next}` : 'Top rank reached'}</span></div></div>
      ${save.missions.map((m, i) => `<div class="card"><div class="pic">${I.scroll}</div><div class="t"><b>${missionText(m)}</b><div class="bar gold"><i style="width:${Math.round(m.prog / m.goal * 100)}%"></i></div><span class="muted">${m.prog} / ${m.goal}</span></div><button class="btn sm ${m.done ? '' : 'glass'}" ${m.done ? `data-a="claim:${i}"` : 'disabled'}><span class="ic">${I.fly}</span>${m.reward}</button></div>`).join('')}
    </div>`);
  },
  letter: () => {
    const done = save.stars.map(s => s & 1), n = done.filter(Boolean).length;
    return modal(`${head('The letter')}<div class="body letter">
      ${n === 0 ? '<span class="muted">The letter is folded inside the boat. Each night you finish unfolds one more line.</span>' : ''}
      ${Array.from({ length: NIGHT_COUNT }, (_, i) => done[i] ? `<p class="${i % 8 === 0 && i ? 'gap' : ''}">${getLevel(i).line}</p>` : '').join('')}
      ${n > 0 && n < NIGHT_COUNT ? `<span class="muted">${NIGHT_COUNT - n} lines still folded away.</span>` : ''}
      <div class="tabs"><button class="tab" data-a="scene:intro">The storm</button>${save.seen.coast1 ? '<button class="tab" data-a="scene:coast1">The lights</button>' : ''}${save.seen.coast2 ? '<button class="tab" data-a="scene:coast2">The dark</button>' : ''}${save.seen.ending ? '<button class="tab" data-a="scene:ending">Home</button>' : ''}</div>
    </div>`, true);
  },
  settings: () => {
    const t = (k: keyof typeof save.settings, name: string, sub = '') => `<div class="toggle"><div><b>${name}</b>${sub ? `<br><span class="muted">${sub}</span>` : ''}</div><button class="sw ${save.settings[k] ? 'on' : ''}" data-a="set:${k}" role="switch" aria-checked="${save.settings[k]}" aria-label="${name}"></button></div>`;
    return modal(`${head('Settings')}<div class="body">
      ${t('music', 'Music')}${t('sfx', 'Sound effects')}${t('haptics', 'Vibration')}
      ${t('reduced', 'Reduce motion', 'No screen shake, flashes or slow motion.')}
      <div class="toggle"><div><b>Start over</b><br><span class="muted">Erases all progress on this device.</span></div><button class="btn sm glass" data-a="${arg === 'confirm' ? 'reset' : 'askreset'}">${arg === 'confirm' ? 'Yes, erase it all' : 'Erase'}</button></div>
      <span class="muted">Moonpull 2.0.0 · Plays offline · Your progress stays on this device and the game collects no personal data.</span>
    </div>`, true);
  },
  pause: () => modal(`<header><h2>Paused</h2></header><div class="body">
      <button class="btn ember" data-a="resume">${ic('play')}Resume</button><button class="btn glass" data-a="restart">${ic('retry')}Restart</button>
      <button class="btn glass" data-a="photo">${ic('camera')}Photo mode</button><button class="btn glass" data-a="quit">${game.mode === 'night' ? 'Leave this night' : 'End run'}</button></div>`, true),
  revive: () => modal(`<div class="ribbon lost">${lastResult?.why === 'storm' ? 'The storm caught you' : 'The lantern went out'}</div><div class="body" style="padding-top:14px"><p style="text-align:center;font-size:17px">Relight the lantern and carry on from here?</p></div>
      <footer><button class="btn glass" data-a="norevive">No thanks</button><button class="btn ember" data-a="revive">Relight · <span class="ic">${I.fly}</span>40</button></footer>`, true),
  result: (r: Result) => {
    const rp = rankProgress(), night = r.mode === 'night';
    const title = r.win ? (night ? 'Harbour reached!' : r.mode === 'daily' ? 'Daily Tide done!' : 'What a drift') : r.quit ? 'Run ended' : r.why === 'storm' ? 'The storm caught you' : 'The lantern went out';
    const stars = night && r.win ? `<div class="stars">${[1, 2, 4].map((b, k) => `<span class="ic ${(r.mask | r.oldMask) & b ? 'on' : ''} ${r.mask & b ? 'pop' : ''}" style="animation-delay:${0.2 + k * 0.28}s" data-s="${r.mask & b ? k : ''}">${I.star}</span>`).join('')}</div>` : '';
    const s = (v: string | number, l: string) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`;
    const canNext = night && r.win && r.night < NIGHT_COUNT - 1 && nightUnlocked(r.night + 1);
    const blocked = night && r.win && r.night < NIGHT_COUNT - 1 && !canNext;
    return modal(`<div class="ribbon ${r.win ? '' : 'lost'}">${title}</div><div class="body" style="padding-top:12px">
      ${stars}
      <div class="big-score" data-count="${r.score}">0</div>
      <div class="stats">${s(r.perfects, 'perfect')}${s('×' + r.chain, 'best chain')}${s(r.air.toFixed(1) + 's', 'in the air')}${night ? s(`${r.fliesGot}/${r.fliesTotal}`, 'fireflies') : s(r.dist + 'm', 'distance')}</div>
      <div class="card"><span class="chip"><span class="ic">${I.fly}</span>+${r.earned}</span><div class="t"><div class="bar"><i style="width:${Math.round(rp.frac * 100)}%"></i></div><span class="muted">Voyage rank ${rp.rank}${rp.next ? ` · next: ${rp.next}` : ''}${night && r.win ? ` · best time ${fmt(save.bestTime[r.night])}` : ''}</span></div></div>
      ${r.unlocks.map(u => `<div class="unlock">${ic('star')}Rank up! ${u}</div>`).join('')}
      ${night && r.jar ? `<div class="jar">${ic('jar')}<div class="bar gold"><i style="width:${Math.min(100, save.jar / JAR * 100)}%"></i></div><span class="muted">${save.jar >= JAR ? '<b style="color:var(--gold1)">Jar full! Open it in Tasks</b>' : `${save.jar}/${JAR}`}</span></div>` : ''}
      ${blocked ? `<span class="lockmsg">The next coast needs ${COAST_NEED[Math.floor((r.night + 1) / 8)]} stars. You have ${totalStars()}.</span>` : ''}
      </div><footer><button class="round" data-a="share" aria-label="Share">${I.share}</button><button class="btn glass" data-a="go:${night ? 'map' : 'home'}">${night ? ic('map') + 'Map' : 'Home'}</button><button class="btn ${canNext ? 'glass' : 'ember'}" data-a="again">${ic('retry')}${r.win ? 'Again' : 'Try again'}</button>${canNext ? `<button class="btn ember" data-a="pre:${r.night + 1}">Next night${ic('play')}</button>` : ''}</footer>`);
  },
};

export function go(name: string, a: any = null) {
  screen = name; arg = a;
  ui.innerHTML = screens[name] ? screens[name](a) : '';
  ui.className = name === '' || name === 'home' ? '' : 'scrim';
  $('hud').hidden = name !== '' || game.photo || !!game.story || game.scene !== 'play';
  if (name !== '') $('holdtip').hidden = true;
  if (name === 'result') afterRender(a);
  if (name === 'harbour') paintBoats();
}
function afterRender(r: Result) {
  ui.querySelectorAll<HTMLElement>('.stars .pop').forEach(el => { const k = +(el.dataset.s || 0); setTimeout(() => { sfx.star(k); buzz('light'); }, 200 + k * 280); });
  const el = ui.querySelector<HTMLElement>('[data-count]'); if (!el) return; const target = +el.dataset.count!; const t0 = performance.now();
  const tick = (t: number) => { const u = Math.min(1, (t - t0) / 900); el.textContent = num(Math.round(target * (1 - Math.pow(1 - u, 3)))); if (u < 1 && el.isConnected) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}
function paintBoats() {
  ui.querySelectorAll<HTMLCanvasElement>('canvas[data-boat]').forEach(c => { const g = c.getContext('2d')!; g.clearRect(0, 0, c.width, c.height); game.painter.boat(g, 58, 70, 0, 1.25, c.dataset.boat!, '#ff8a3d', 1); });
}

function play(mode: Mode, night = 0) {
  const begin = () => { game.start(mode, night); setupHud(); go(''); if (mode === 'night' && night === 0 && !save.seen.held) $('holdtip').hidden = false; };
  if (mode === 'night' && night === 0 && !save.seen.intro) { save.seen.intro = true; persist(); story('intro', begin); }
  else begin();
}
function story(key: string, done: () => void) { go(''); $('hud').hidden = true; $('hint').hidden = true; $('storybar').hidden = false; game.playStory(key, () => { $('storybar').hidden = true; done(); }); }
function home() { game.home(); go('home'); }

let lastKey = '';
function setupHud() { lastKey = ''; $('trackflag').innerHTML = I.flag; $('trackstorm').innerHTML = I.storm; $('hfi').innerHTML = I.fly; $('pause').innerHTML = I.pause; }
function hud(sim: Sim) {
  if (!$('holdtip').hidden && game.hold) { $('holdtip').hidden = true; save.seen.held = true; }
  const fin = isFinite(sim.lvl.length), b = sim.b;
  const key = `${b.hearts}|${sim.flies}|${Math.round(b.x / 30)}|${sim.chain}|${sim.fever}|${Math.round(sim.score / 10)}|${Math.round(sim.storm / 30)}`;
  if (key === lastKey) return; lastKey = key;
  const max = sim.cfg.hearts;
  $('hearts').innerHTML = game.mode === 'drift' ? '' : Array.from({ length: max }, (_, i) => `<span class="ic ${i < b.hearts ? '' : 'off'}">${I.lantern}</span>`).join('');
  $('hf').textContent = String(sim.flies);
  $('score').textContent = num(Math.round(sim.score));
  const L = fin ? sim.lvl.length : b.x + 2000, p = Math.min(1, b.x / L), sp = Math.max(0, Math.min(1, sim.storm / L));
  $('trackfill').style.width = p * 100 + '%'; $('trackboat').style.left = p * 100 + '%';
  $('trackstorm').style.left = sp * 100 + '%'; $('trackstorm').hidden = sim.cfg.noStorm || !fin; $('trackflag').hidden = !fin; $('track').style.visibility = fin ? 'visible' : 'hidden';
  const ch = $('chain'); ch.classList.toggle('on', sim.chain > 0); ch.classList.toggle('fever', sim.fever);
  $('mult').textContent = '×' + sim.mult;
  $('dots').innerHTML = Array.from({ length: 3 }, (_, i) => `<i class="${i < sim.chain % 3 || sim.chain >= 15 ? 'on' : ''}"></i>`).join('');
  $('danger').classList.toggle('on', !sim.cfg.noStorm && sim.stormGap < 300 && sim.done === 'no');
}

function afterResult(r: Result) {
  lastResult = r;
  const show = () => { if (game.scene !== 'play') game.home(); go('result', r); };
  if (r.mode === 'night' && r.win) {
    const key = r.night === 7 ? 'coast1' : r.night === 15 ? 'coast2' : r.night === 23 ? 'ending' : '';
    if (key && !save.seen[key]) { save.seen[key] = true; persist(); story(key, show); return; }
  }
  show();
}

const actions: Record<string, (a: string) => void | Promise<void>> = {
  go: a => { if (a === 'home' || game.scene !== 'play' || game.ended) { if (a === 'home') return home(); } if (game.scene === 'play' && game.ended) game.home(); if (a === 'map') mapCoast = -1; go(a); },
  coast: a => { mapCoast = +a; go('map'); },
  pre: a => { if (game.scene === 'play' && game.ended) game.home(); go('pre', +a); },
  play: a => play('night', +a),
  mode: a => play(a as Mode),
  tab: a => { tab = a; go('harbour'); },
  boat: a => { save.boat = a; persist(); go('harbour'); },
  buyboat: a => { if (buyBoat(a)) { sfx.buy(); save.boat = a; persist(); toast('New boat!'); } go('harbour'); },
  lantern: a => { save.lantern = a; persist(); go('harbour'); },
  up: a => { if (buyUpgrade(a as any)) { sfx.buy(); toast('Upgraded'); } go('harbour'); },
  build: a => { if (buildItem(a)) { sfx.buy(); buzz('medium'); toast(`${VILLAGE.find(v => v.id === a)!.name} restored`); home(); } else go('village'); },
  claim: a => { const n = claimMission(+a); if (n) { sfx.coin(); toast(`+${n} fireflies`); } go('tasks'); },
  gift: () => { const n = claimDaily(); if (n) { sfx.buy(); toast(`Day ${((save.daily.streak - 1) % 7) + 1} gift: +${n} fireflies`); } go('tasks'); },
  jar: () => { const r = openJar(); if (r) { sfx.buy(); buzz('medium'); toast(`Star jar: +${r.flies} fireflies${r.extra ? ' and the ' + r.extra : ''}`); } go('tasks'); },
  set: a => { const k = a as keyof typeof save.settings; save.settings[k] = !save.settings[k]; persist(); applyVolumes(); go('settings'); },
  askreset: () => go('settings', 'confirm'),
  reset: () => { resetAll(); toast('Progress erased'); home(); },
  scene: a => story(a, () => { home(); go('letter'); }),
  resume: () => { game.setPaused(false); go(''); },
  restart: () => play(game.mode, game.night),
  photo: () => { game.photo = true; go(''); $('hud').hidden = true; $('hint').hidden = true; $('photobar').hidden = false; },
  photoback: () => { game.photo = false; $('photobar').hidden = true; go('pause'); },
  photoshare: async () => { if (!(await shareCanvas(game.out, 'Moonpull'))) toast('Sharing is not available here'); },
  quit: () => { game.setPaused(false); const r = game.quitRun(); if (r) afterResult(r); else { home(); go('map'); } },
  revive: () => { if (save.flies >= 40) { save.flies -= 40; persist(); game.revive(); go(''); } },
  norevive: () => { if (lastResult) { game.commit(lastResult); afterResult(lastResult); } },
  again: () => { if (lastResult) play(lastResult.mode, lastResult.night); },
  share: async () => { const r = lastResult; if (!r) return; if (!(await shareCanvas(game.out, r.mode === 'night' ? `Night ${r.night + 1} in Moonpull: ${num(r.score)} points` : `${num(r.score)} points in Moonpull`))) toast('Sharing is not available here'); },
  skipstory: () => game.skipStory(),
};

export function initUI(g: Game) {
  game = g;
  document.addEventListener('click', e => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-a]'); if (!el) return;
    initAudio(); sfx.click(); buzz('light');
    const [k, ...rest] = el.dataset.a!.split(':'); actions[k]?.(rest.join(':'));
  });
  document.addEventListener('pointerdown', () => initAudio(), { once: true });
  $('pause').addEventListener('click', e => { e.stopPropagation(); if (game.sim && !game.ended && screen === '') { game.setPaused(true); go('pause'); } });
  $('pause').addEventListener('pointerdown', e => e.stopPropagation());
  game.onHud = hud;
  game.onHint = s => { const h = $('hint'); h.textContent = s; h.hidden = !s || game.photo; };
  game.onStoryText = (s, i, n) => { $('storytext').textContent = s; $('storydots').textContent = n ? `${i + 1} / ${n} · tap to continue` : ''; };
  game.onEnd = r => { $('hint').hidden = true; $('danger').classList.remove('on'); lastResult = r; if (r.canRevive) go('revive'); else afterResult(r); };
  onBack(() => {
    if (game.story) return game.skipStory();
    if (game.photo) return void actions.photoback('');
    if (screen === '') { if (game.sim && !game.ended) { game.setPaused(true); go('pause'); } return; }
    if (screen === 'pause') return void actions.resume('');
    if (screen === 'home') return exitApp();
    if (screen === 'revive') return void actions.norevive('');
    if (screen === 'pre') return go('map');
    home();
  });
  onPause(() => { if (screen === '' && game.sim && !game.ended && !game.story) { game.setPaused(true); go('pause'); } suspendAudio(true); });
  onResume(() => suspendAudio(false));
  home();
  if (dailyAvailable() && save.stats.nights > 0) setTimeout(() => toast('A daily gift is waiting in Tasks'), 900);
}
void POWERS_NOTE; void rankOf;
