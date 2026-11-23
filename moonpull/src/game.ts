import { Sim, VMAX } from './sim/surf';
import { BASE, Level } from './sim/types';
import { getLevel, specialLevel } from './sim/levels';
import { BOATS } from './sim/boats';
import { hashStr } from './sim/rng';
import { Painter, Cam, Fx, BOTTOM, ripple, hexA } from './gfx/world';
import { drawVillage } from './gfx/village';
import { Post, GRADES } from './gfx/post';
import { canvas } from './gfx/tex';
import { save, persist, today, bump, starCount, claimRanks, lanternColor, addJar, boatsHome, completed } from './state';
import { sfx, score as playScore, quiet } from './audio';
import { buzz } from './platform';
import { SCENES, drawPanel } from './story';

export type Mode = 'night' | 'endless' | 'daily' | 'drift';
export interface Result {
  mode: Mode; night: number; win: boolean; why: string; time: number; par: number; flies: number; fliesGot: number; fliesTotal: number; score: number;
  perfects: number; chain: number; air: number; rings: number; crashes: number;
  mask: number; oldMask: number; earned: number; xp: number; best: boolean; dist: number; unlocks: string[]; canRevive: boolean; quit?: boolean; jar: number;
}

const HINTS: Record<string, string> = {
  start: 'Hold anywhere to charge the moon. Let go and the sea throws the boat. Hold going downhill, let go going uphill.',
  rock: 'A reef breaks the crest ahead. Let go on the slope before it and jump it.',
  arch: 'Low rock above the crest. Keep holding so the sea holds the boat down.',
  whale: 'A whale! Ride over its back for a huge throw.',
  ring: 'Fly through the lantern ring for bonus fireflies.',
  storm: 'The storm is close behind. Keep your speed up.',
};

export class Game {
  out: HTMLCanvasElement; src: HTMLCanvasElement; g: CanvasRenderingContext2D; post: Post; painter: Painter;
  W = 0; H = 0;
  scene: 'home' | 'play' | 'story' = 'home';
  sim: Sim | null = null; fx = new Fx(); mode: Mode = 'night'; night = 0; level!: Level;
  cam: Cam = { x: 0, top: 44, k: 1, W: 0, H: 0 };
  hold = false; paused = false; photo = false; ended = false; private endT = 0; slow = 0;
  time = 0; private last = 0; private wakeT = 0; private ringT = 0; private hintT = 0; private trailT = 0;
  ghost?: number[]; lantern = '#ff8a3d'; boatKind = 'paper';
  story: { panels: typeof SCENES[string]; i: number; t: number; shown: number; done: () => void } | null = null;
  onEnd: (r: Result) => void = () => {}; onHud: (s: Sim) => void = () => {}; onHint: (s: string) => void = () => {};
  onStoryText: (s: string, i: number, n: number) => void = () => {};

  constructor(out: HTMLCanvasElement) {
    this.out = out; this.src = canvas(4, 4); this.g = this.src.getContext('2d')!;
    this.post = new Post(out, this.src);
    if (!this.post.ok) { this.src = out; this.g = out.getContext('2d')!; }
    this.painter = new Painter(0);
    this.resize(); window.addEventListener('resize', () => this.resize());
    this.bindInput();
    requestAnimationFrame(t => this.frame(t));
  }

  /** render quality: 2 sharp + glow, 1 softer + glow, 0 soft without the glow pass. Lowered automatically on slow phones. */
  quality = 2; private perf = { n: 0, t: 0, checked: 0 };
  resize() {
    const dpr = Math.min(this.quality === 2 ? 1.6 : 1.25, window.devicePixelRatio || 1);
    let w = Math.round(window.innerWidth * dpr), h = Math.round(window.innerHeight * dpr);
    const cap = [0.45e6, 0.7e6, 1.05e6][this.quality]; if (w * h > cap) { const s = Math.sqrt(cap / (w * h)); w = Math.round(w * s); h = Math.round(h * s); }
    this.W = w; this.H = h; this.src.width = w; this.src.height = h;
    if (this.post.ok) this.post.resize(w, h); else { this.out.width = w; this.out.height = h; }
    this.cam.W = w; this.cam.H = h;
  }

  private bindInput() {
    const c = this.out; let ids = new Set<number>();
    c.addEventListener('pointerdown', e => { if (this.story) { this.advanceStory(); return; } if (this.scene !== 'play') return; ids.add(e.pointerId); this.hold = true; try { c.setPointerCapture(e.pointerId); } catch { /* ok */ } });
    const up = (e: PointerEvent) => { ids.delete(e.pointerId); if (!ids.size) this.hold = false; };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
    window.addEventListener('keydown', e => { if (e.code === 'Space') { this.hold = true; e.preventDefault(); } });
    window.addEventListener('keyup', e => { if (e.code === 'Space') this.hold = false; });
    window.addEventListener('blur', () => { this.hold = false; ids.clear(); });
  }

  home() { this.scene = 'home'; this.sim = null; this.story = null; this.painter.setCoast(Math.min(2, Math.floor(completed() / 8))); this.post.grade = GRADES[this.painter.coast]; }

  start(mode: Mode, night = 0) {
    this.story = null; this.scene = 'play';
    this.mode = mode; this.night = night; this.ended = false; this.paused = false; this.photo = false; this.fx = new Fx(); this.slow = 0; this.endT = 0; this.hold = false;
    let gen: ((l: Level, x: number) => void) | undefined;
    if (mode === 'night') this.level = getLevel(night);
    else { const s = specialLevel(mode, mode === 'daily' ? hashStr(today()) : (Math.random() * 1e9) | 0); this.level = s.lvl; gen = s.gen; }
    const boat = BOATS.find(b => b.id === save.boat) ?? BOATS[0];
    this.boatKind = boat.id; this.lantern = lanternColor();
    this.painter.setCoast(this.level.coast); this.post.grade = GRADES[this.level.coast];
    this.sim = new Sim(this.level, { boat, magnet: save.up.magnet + (boat.id === 'swan' ? 1 : 0), hearts: boat.hearts + save.up.hearts, endless: gen, noFail: mode === 'drift', noStorm: mode === 'drift' });
    this.cam.x = this.sim.b.x - 200; this.cam.top = 44;
    this.ghost = mode === 'night' ? save.ghosts['n' + (night + 1)] : undefined;
    this.hintT = 0;
    if (mode === 'night' && night === 0 && !save.seen.h_start) { save.seen.h_start = true; this.hint('start', 7); }
  }
  private hint(key: string, secs = 5) { this.onHint(HINTS[key]); this.hintT = secs; }

  playStory(key: string, done: () => void) {
    this.sim = null; this.scene = 'story'; quiet();
    this.story = { panels: SCENES[key], i: 0, t: 0, shown: performance.now(), done };
    this.onStoryText(this.story.panels[0].text, 0, this.story.panels.length);
  }
  advanceStory() {
    const s = this.story; if (!s || performance.now() - s.shown < 350) return;
    s.i++; s.t = 0; s.shown = performance.now(); sfx.click();
    if (s.i >= s.panels.length) { this.story = null; this.onStoryText('', 0, 0); s.done(); }
    else this.onStoryText(s.panels[s.i].text, s.i, s.panels.length);
  }
  skipStory() { const s = this.story; if (!s) return; this.story = null; this.onStoryText('', 0, 0); s.done(); }
  setPaused(p: boolean) { this.paused = p; if (p) { quiet(); this.hold = false; } }
  revive() { if (!this.sim) return; this.sim.revive(); this.ended = false; this.endT = 0; }

  private frame(now: number) {
    requestAnimationFrame(t => this.frame(t));
    const raw = (now - this.last) / 1000 || 0;
    let dt = Math.min(0.07, raw); this.last = now; this.time += dt;
    this.watchPerf(raw);
    const g = this.g, t = this.time;
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (this.story) {
      const s = this.story; s.t += dt;
      const scale = this.H / 360; drawPanel(g, { w: this.W, h: this.H, scale, vw: this.W / scale }, s.panels[s.i], t, Math.max(0, 1 - s.t * 2));
      g.setTransform(1, 0, 0, 1, 0, 0); this.painter.grain(g, this.cam);
      playScore(0.1, 0.4, false, 0, true);
    } else if (this.scene === 'home' || !this.sim) {
      drawVillage(this.painter, g, this.W, this.H, t, { built: new Set(save.built), boats: boatsHome(), baba: !!(save.stars[23] & 1), lantern: lanternColor(), boatKind: save.boat });
      playScore(0.1, 0.5, false, 0, true);
    } else {
      const sim = this.sim;
      if (!this.paused) {
        if (this.slow > 0) { this.slow -= dt; dt *= 0.35; }
        sim.update(dt, this.hold && !this.photo);
        this.events(sim);
        this.fx.step(dt);
        this.ambient(sim, dt);
        const b = sim.b;
        playScore(Math.min(1, b.s / VMAX * 1.3), Math.min(1, Math.max(0, (BASE - b.y) / 160)), sim.fever, sim.cfg.noStorm ? 0 : Math.max(0, 1 - sim.stormGap / 500), this.mode === 'drift');
        this.onHud(sim);
        if (sim.done !== 'no' && !this.ended) { this.endT += dt; if (this.endT > (sim.done === 'win' ? 1.4 : 1.0)) { this.ended = true; this.finish(sim); } }
        if (this.hintT > 0) { this.hintT -= dt; if (this.hintT <= 0) this.onHint(''); }
      }
      this.drawPlay(sim, t);
    }
    this.post.flash = Math.max(this.post.flash - dt * 2.5, this.fx.flash * 0.6);
    this.post.bloomBoost = this.sim?.fever ? 0.35 : 0;
    if (this.post.ok && this.quality > 0) this.post.render(t);
  }

  /** after a few seconds of play, step quality down if frames are slow */
  private watchPerf(raw: number) {
    if (this.scene !== 'play' || this.paused || raw <= 0 || raw > 0.5 || this.quality === 0 || !this.post.ok) { this.perf.n = 0; this.perf.t = 0; return; }
    this.perf.n++; this.perf.t += raw;
    if (this.perf.n >= 90 || (this.perf.t >= 2 && this.perf.n >= 8)) {
      const fps = this.perf.n / this.perf.t; this.perf.n = 0; this.perf.t = 0;
      if (fps < 45) this.setQuality(this.quality - 1);
    }
  }
  setQuality(q: number) {
    q = Math.max(0, Math.min(2, q)); if (q === this.quality) return;
    this.quality = q;
    if (q === 0) { // draw straight to the screen: no texture upload, no glow pass
      const c = document.createElement('canvas'); c.id = 'c'; c.className = this.out.className; this.out.replaceWith(c); this.out = c;
      this.src = c; this.g = c.getContext('2d')!; this.post = new Post(c, c, true); this.bindInput();
    }
    this.resize();
  }

  private camera(sim: Sim, dt: number) {
    const b = sim.b, c = this.cam;
    const topT = Math.min(44, b.y - 150);
    c.top += (topT - c.top) * Math.min(1, dt * (topT < c.top ? 6 : 2.5));
    c.k = this.H / (BOTTOM - c.top);
    const lead = 0.27 - Math.min(0.06, Math.max(0, (b.s - 300) / 6000));
    const xT = b.x - (this.W / c.k) * lead;
    c.x += (xT - c.x) * Math.min(1, dt * 7);
  }

  drawPlay(sim: Sim, t: number) {
    const g = this.g, P = this.painter, c = this.cam, b = sim.b, k = c.k;
    this.camera(sim, 1 / 60);
    const shake = this.fx.shake > 0 && !save.settings.reduced ? this.fx.shake : 0;
    const cam: Cam = { ...c, x: c.x + Math.sin(t * 71) * shake * 6 / k, top: c.top + Math.cos(t * 63) * shake * 5 / k };
    const pull = sim.pull, stormDark = this.level.coast === 2 ? 0.4 : 0;
    const moonX = this.W * 0.72 - pull * this.W * 0.03, moonY = this.H * 0.16 + pull * this.H * 0.03, moonR = this.H * 0.07 * (1 + pull * 0.12);
    P.sky(g, cam, t, moonX, moonY, moonR, pull, stormDark);
    P.coastline(g, cam, t);
    P.farSea(g, cam, t, moonX);
    P.midSwell(g, cam, t);
    if (isFinite(this.level.length)) P.harbour(g, cam, sim.surf, this.level.length, t, this.lantern);
    for (const o of this.level.obs) { if (o.t === 'whale') P.whale(g, cam, sim.surf, o, t, sim.t); else if (o.t === 'arch') P.arch(g, cam, o, t, 'back'); }
    // ghost of the best run
    if (this.ghost && this.ghost.length > 4) {
      const gi = Math.floor(sim.t * 10) * 2;
      if (gi + 3 < this.ghost.length) { const a = (sim.t * 10) % 1, gx = this.ghost[gi] * (1 - a) + this.ghost[gi + 2] * a, gy = this.ghost[gi + 1] * (1 - a) + this.ghost[gi + 3] * a;
        P.boat(g, P.sx(cam, gx), P.sy(cam, gy), 0, k, this.boatKind, '#cfe0ff', t, 0.3); }
    }
    const bx = P.sx(cam, b.x), by = P.sy(cam, b.y + (b.air ? 0 : ripple(b.x, t)));
    const blink = b.inv > 0 ? (Math.sin(t * 34) > 0 ? 0.35 : 1) : 1;
    if (!(sim.done === 'lose' && sim.why === 'wreck')) P.boat(g, bx, by, b.ang, k, this.boatKind, this.lantern, t, blink, b.air ? 0 : pull);
    P.sea(g, cam, t, x => sim.surf.y(x), moonX, sim.fever ? 1 : 0, { x: bx, y: by, a: 1, c: this.lantern });
    for (const o of this.level.obs) { if (o.t === 'rock') P.rock(g, cam, sim.surf, o, t); else if (o.t === 'arch') P.arch(g, cam, o, t, 'front'); else if (o.t === 'ring') P.ring(g, cam, o, t); }
    P.flies(g, cam, this.level, t);
    // the moon's pull: rings spreading on the water under the boat
    if (pull > 0.05 && !b.air) {
      g.globalCompositeOperation = 'lighter'; g.strokeStyle = hexA(P.ink.moon, 0.35 * pull); g.lineWidth = 2 * k;
      for (let i = 0; i < 3; i++) { const r = ((t * 1.6 + i / 3) % 1); g.globalAlpha = 1 - r; g.beginPath(); g.ellipse(bx, by + 4 * k, (20 + r * 60) * k, (4 + r * 10) * k, 0, 0, 7); g.stroke(); }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    }
    // charge ring: fills while the moon is pulling
    if (sim.charge > 0.02 && !b.air) {
      const r = 30 * k, cy = by - 22 * k, full = sim.charge >= 1;
      g.lineCap = 'round'; g.lineWidth = 3.5 * k; g.strokeStyle = hexA(P.ink.foam, 0.18); g.beginPath(); g.arc(bx, cy, r, 0, 7); g.stroke();
      g.globalCompositeOperation = 'lighter'; g.strokeStyle = full ? hexA('#ffe27a', 0.75 + 0.25 * Math.sin(t * 20)) : hexA(P.ink.moon, 0.9);
      g.beginPath(); g.arc(bx, cy, r, -Math.PI / 2, -Math.PI / 2 + sim.charge * Math.PI * 2); g.stroke(); g.globalCompositeOperation = 'source-over';
    }
    P.particles(g, cam, this.fx);
    if (!sim.cfg.noStorm) P.storm(g, cam, P.sx(cam, sim.storm), t, Math.max(0, 1 - sim.stormGap / 500));
    P.grain(g, cam);
  }

  private ambient(sim: Sim, dt: number) {
    const b = sim.b, fx = this.fx, ink = this.painter.ink;
    this.wakeT += dt; this.trailT += dt;
    if (!b.air && b.s > 220 && this.wakeT > 0.03) { this.wakeT = 0; fx.ps.push({ x: b.x - 18, y: b.y + 2, vx: -40 - Math.random() * 60, vy: -30 - Math.random() * 50, life: 0.45, max: 0.45, r: 1.6 + Math.random(), c: ink.foam, g: 300 }); }
    if (b.air && this.trailT > 0.04) { this.trailT = 0; fx.ps.push({ x: b.x - 6, y: b.y - 30, vx: -20, vy: 10, life: 0.5, max: 0.5, r: 1.6, c: sim.fever ? '#ffd25a' : this.lantern, g: 0, add: true }); }
    // contextual hints, once each
    if (this.mode === 'night' && this.hintT <= 0) {
      for (const o of this.level.obs) { const d = o.x - b.x; if (d < 120 || d > 700) continue; const key = o.t === 'rock' ? 'rock' : o.t === 'arch' ? 'arch' : o.t === 'whale' ? 'whale' : 'ring';
        if (!save.seen['h_' + key]) { save.seen['h_' + key] = true; this.hint(key, 5); break; } }
      if (this.hintT <= 0 && !save.seen.h_storm && sim.stormGap < 330 && !sim.cfg.noStorm) { save.seen.h_storm = true; this.hint('storm', 4); }
    }
  }

  private events(sim: Sim) {
    const fx = this.fx, ink = this.painter.ink, red = save.settings.reduced, b = sim.b;
    for (const e of sim.events) {
      switch (e.k) {
        case 'launch': sfx.launch(e.v + (e.surge ? 400 : 0)); fx.burst(e.x, e.y, e.surge ? 22 : 10, ink.foam, e.surge ? 240 : 160, 600, 2.2); if (e.surge) { fx.ring(e.x, e.y + 4, ink.moon, 16); buzz('light'); } break;
        case 'land':
          if (e.q === 'perfect') { sfx.land('perfect', e.air); buzz('medium'); fx.pop(e.x + 30, e.y - 60, 'Perfect!', '#ffd25a', 30); fx.burst(e.x, e.y, 18, '#ffe9a0', 220, 300, 2.2, true); fx.ring(e.x, e.y, '#ffe9a0', 14); }
          else if (e.q === 'good') { if (e.air > 0.25) { sfx.land('good', e.air); fx.burst(e.x, e.y, 12, ink.foam, 150, 600, 2.2); } }
          else { sfx.land('bad', e.air); buzz('medium'); fx.burst(e.x, e.y, 26, ink.foam, 260, 700, 2.8); if (!red) fx.shake = 0.6; if (e.air > 0.3) fx.pop(e.x + 20, e.y - 50, 'Splash', ink.foam, 22); }
          if (e.air > 1.2) fx.pop(e.x - 20, e.y - 96, `${e.air.toFixed(1)}s air`, '#cfe8ff', 20);
          break;
        case 'fly': sfx.fly(); fx.burst(e.x, e.y, 7, ink.fly, 90, 80, 1.8, true); buzz('light'); break;
        case 'ring': sfx.ring(); fx.burst(e.x, e.y, 30, ink.fly, 240, 120, 2.4, true); fx.ring(e.x, e.y, ink.fly, 20); fx.pop(e.x, e.y - 50, '+3', ink.fly, 26); buzz('medium'); break;
        case 'near': sfx.near(); fx.pop(e.x + 20, e.y - 70, 'Close!', '#9fe8ff', 24); if (!red) this.slow = 0.25; buzz('light'); break;
        case 'crash': sfx.crash(); buzz('heavy'); fx.burst(e.x, e.y, 34, ink.foam, 300, 700, 3); fx.burst(e.x, e.y - 30, 10, this.lantern, 200, 500, 2, true); if (!red) { fx.shake = 1; fx.flash = 0.5; this.post.flashC = [0.9, 0.25, 0.2]; } break;
        case 'whale': sfx.whale(); buzz('heavy'); fx.pop(e.x + 40, e.y - 110, 'Breach!', '#bfe9ff', 32); fx.burst(e.x + 30, e.y - 10, 40, ink.foam, 380, 600, 2.6); break;
        case 'chain': sfx.chain(e.n); fx.pop(b.x - 40, b.y - 120, `Chain ×${e.n}`, '#ffb36b', 24); break;
        case 'fever': sfx.fever(e.on); if (e.on) { fx.pop(b.x + 60, b.y - 140, 'Moonrise!', '#ffd25a', 38); fx.flash = 0.35; this.post.flashC = [1, 0.85, 0.5]; buzz('heavy'); } break;
        case 'win': sfx.win(); buzz('medium'); for (let i = 0; i < 5; i++) fx.burst(b.x + i * 30, b.y - 60, 20, i % 2 ? ink.fly : this.lantern, 260, 200, 2.4, true); break;
        case 'lose': sfx.lose(); if (e.why === 'storm') { sfx.thunder(); if (!red) { fx.flash = 0.8; this.post.flashC = [0.85, 0.9, 1]; } } break;
      }
    }
    sim.events.length = 0;
  }

  private finish(sim: Sim) {
    const r: Result = { mode: this.mode, night: this.night, win: sim.done === 'win', why: sim.why, time: sim.t, par: this.level.par, flies: sim.flies, fliesGot: sim.fliesGot, fliesTotal: sim.fliesTotal,
      score: Math.round(sim.score), perfects: sim.perfects, chain: sim.bestChain, air: sim.airTotal, rings: sim.rings, crashes: sim.crashes,
      mask: 0, oldMask: 0, earned: 0, xp: 0, best: false, dist: Math.round(sim.b.x / 10), unlocks: [], canRevive: sim.done !== 'win' && !sim.revived && this.mode !== 'drift', jar: 0 };
    if (r.canRevive && save.flies >= 40) { this.onEnd(r); return; }
    this.commit(r); this.onEnd(r);
  }

  commit(r: Result) {
    const sim = this.sim!; r.canRevive = false;
    bump('fly', r.flies); bump('perfect', r.perfects); bump('chain', r.chain, true); bump('ring', r.rings); bump('air', Math.round(r.air)); bump('near', sim.nears);
    save.stats.flies += r.flies; save.stats.perfects += r.perfects; save.stats.bestChain = Math.max(save.stats.bestChain, r.chain); save.stats.bestAir = Math.max(save.stats.bestAir, sim.bestAir);
    if (r.mode === 'night') {
      const i = r.night; r.oldMask = save.stars[i];
      if (r.win) {
        r.mask = 1 | (r.fliesGot >= Math.ceil(r.fliesTotal * 0.7) ? 2 : 0) | (r.time <= r.par ? 4 : 0);
        const merged = r.oldMask | r.mask, gained = starCount(merged) - starCount(r.oldMask);
        save.stars[i] = merged; addJar(gained); r.jar = gained; bump('night', 1); if (r.crashes === 0) bump('clean', 1); save.stats.nights++;
        if (!save.bestTime[i] || r.time < save.bestTime[i]) { save.bestTime[i] = r.time; save.ghosts['n' + (i + 1)] = sim.trace.slice(0, 3000); r.best = true; }
        if (r.score > save.bestScore[i]) save.bestScore[i] = r.score;
        r.earned = r.flies + Math.floor(r.score / 800); r.xp = 50 + gained * 30 + Math.floor(r.dist / 40);
      } else { r.earned = Math.floor(r.flies / 2); r.xp = 10 + Math.floor(r.dist / 80); }
    } else if (r.mode === 'endless') {
      r.earned = r.flies + Math.floor(r.score / 1000); r.xp = 20 + Math.floor(r.dist / 50);
      if (r.score > save.endlessBest) { save.endlessBest = r.score; r.best = true; }
    } else if (r.mode === 'daily') {
      const first = save.dailyBest.date !== today();
      r.earned = r.flies + Math.floor(r.score / 1000) + (r.win && first ? 60 : 0); r.xp = 30 + (r.win ? 40 : 0);
      if (first || r.score > save.dailyBest.score) { save.dailyBest = { date: today(), score: r.score }; r.best = true; }
    } else { r.earned = Math.floor(r.flies / 2); r.xp = Math.min(40, Math.floor(r.dist / 60)); }
    save.flies += r.earned; save.xp += r.xp; r.unlocks = claimRanks();
    persist();
  }

  quitRun(): Result | null {
    const sim = this.sim; if (!sim || this.ended || this.mode === 'night') return null;
    this.ended = true;
    const r: Result = { mode: this.mode, night: this.night, win: this.mode === 'drift', why: '', time: sim.t, par: 0, flies: sim.flies, fliesGot: sim.fliesGot, fliesTotal: sim.fliesTotal, score: Math.round(sim.score), perfects: sim.perfects, chain: sim.bestChain, air: sim.airTotal, rings: sim.rings, crashes: sim.crashes, mask: 0, oldMask: 0, earned: 0, xp: 0, best: false, dist: Math.round(sim.b.x / 10), unlocks: [], canRevive: false, quit: true, jar: 0 };
    this.commit(r); return r;
  }
}
