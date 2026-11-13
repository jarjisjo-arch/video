import { Sim, FLOW } from './sim/sim';
import { LevelDef, RunCfg, SEA, VH, MOON_LOW, MOON_TOP } from './sim/types';
import { getLevel, specialLevel, COASTS } from './sim/levels';
import { BOATS } from './sim/boats';
import { hashStr } from './sim/rng';
import { render, newFx, stepFx, burst, Fx, View } from './render';
import { COAST_INK, inkById, LANTERNS, Ink } from './palettes';
import { save, persist, today, bump, starCount, claimRanks } from './state';
import { sfx, music, quietWater } from './audio';
import { buzz } from './platform';
import { SCENES, drawPanel } from './story';

export type Mode = 'night' | 'endless' | 'daily' | 'drift' | 'attract';
export interface Result {
  mode: Mode; night: number; win: boolean; time: number; par: number; flies: number; fliesTotal: number; score: number; near: number; peak: number;
  mask: number; oldMask: number; earned: number; xp: number; best: boolean; dist: number; unlocks: string[]; canRevive: boolean; quit?: boolean;
}

const HINTS: Record<string, string> = {
  reef: 'Rocks ahead. Pull the moon low, close to the boat, to lift the sea over them.',
  over: 'Low rock above. Push the moon up and away so the sea goes flat.',
  bar: 'A sandbar. Keep the tide high the whole way across or the boat will sit on the sand.',
  whirl: 'A whirlpool. Fill it with a swell, or hit it fast.',
  rip: 'A riptide pulls backward here. Keep the moon behind the boat and surf through.',
  cloud: 'Clouds weaken the moon. Keep it in clear sky.',
};

export class Game {
  canvas: HTMLCanvasElement; g: CanvasRenderingContext2D;
  view: View = { w: 0, h: 0, scale: 1, vw: 760 };
  sim: Sim | null = null; fx: Fx = newFx();
  mode: Mode = 'attract'; night = 0; level!: LevelDef;
  paused = false; photo = false; ended = false;
  moon = { sx: 200, y: 100 }; power = false;
  time = 0; last = 0; slow = 0;
  ink: Ink = inkById('indigo'); lantern = '#e4572e'; boatKind = 'paper';
  ghost?: number[];
  onEnd: (r: Result) => void = () => {};
  onHud: (s: Sim) => void = () => {};
  onHint: (s: string) => void = () => {};
  private hintT = 0; private introHints = 0; private x5 = false; private endT = 0;
  // story playback
  story: { panels: typeof SCENES[string]; i: number; t: number; done: () => void } | null = null;
  onStoryText: (s: string, i: number, n: number) => void = () => {};

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas; this.g = canvas.getContext('2d')!;
    this.resize(); window.addEventListener('resize', () => this.resize());
    this.bindInput();
    requestAnimationFrame(t => this.frame(t));
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth, h = window.innerHeight;
    this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
    let scale = this.canvas.height / VH, vw = this.canvas.width / scale;
    if (vw < 520) { vw = 520; scale = this.canvas.width / vw; }       // very narrow (portrait browser): letterbox by zooming out
    if (vw > 900) { vw = 900; }
    this.view = { w: this.canvas.width, h: this.canvas.height, scale: this.canvas.width / vw, vw };
    if (this.sim) this.sim.cfg.viewW = vw;
  }

  private bindInput() {
    let id = -1, lx = 0, ly = 0;
    const c = this.canvas;
    c.addEventListener('pointerdown', e => {
      if (this.story) { this.advanceStory(); return; }
      if (id !== -1) return; id = e.pointerId; lx = e.clientX; ly = e.clientY; try { c.setPointerCapture(id); } catch { /* fine */ }
    });
    c.addEventListener('pointermove', e => {
      if (e.pointerId !== id || this.paused || !this.sim || this.mode === 'attract') return;
      const k = (this.view.vw / window.innerWidth) * 1.25;
      this.moon.sx = Math.max(20, Math.min(this.view.vw - 20, this.moon.sx + (e.clientX - lx) * k));
      this.moon.y = Math.max(MOON_TOP, Math.min(MOON_LOW, this.moon.y + (e.clientY - ly) * k));
      lx = e.clientX; ly = e.clientY;
    });
    const up = (e: PointerEvent) => { if (e.pointerId === id) id = -1; };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
    window.addEventListener('keydown', e => { if (e.code === 'Space') this.power = true; });
    window.addEventListener('keyup', e => { if (e.code === 'Space') this.power = false; });
  }

  private pickInk(coast: number) { this.ink = inkById(save.ink === 'auto' ? COAST_INK[coast] : save.ink); }

  start(mode: Mode, night = 0) {
    this.story = null;
    this.mode = mode; this.night = night; this.ended = false; this.paused = false; this.photo = false; this.fx = newFx(); this.slow = 0; this.x5 = false; this.endT = 0;
    let gen: RunCfg['endless'];
    if (mode === 'night') this.level = getLevel(night);
    else if (mode === 'attract') { const s = specialLevel('drift', 7); this.level = s.level; gen = s.gen; }
    else { const s = specialLevel(mode, mode === 'daily' ? hashStr(today()) : (Math.random() * 1e9) | 0); this.level = s.level; gen = s.gen; }
    const boat = BOATS.find(b => b.id === save.boat) ?? BOATS[0];
    this.boatKind = boat.id; this.lantern = (LANTERNS.find(l => l.id === save.lantern) ?? LANTERNS[0]).c;
    this.pickInk(this.level.coast);
    const cfg: RunCfg = { boat, power: mode === 'attract' || mode === 'drift' ? 'none' : save.power, magnet: save.up.magnet, hull: save.up.hull, streak: save.up.streak, viewW: this.view.vw, endless: gen, noFail: mode === 'drift' || mode === 'attract' };
    this.sim = new Sim(this.level, cfg);
    this.moon = { sx: this.view.vw * 0.2, y: 110 };
    this.ghost = mode === 'night' ? save.ghosts['n' + (night + 1)] : undefined;
    this.hintT = 0; this.introHints = 0;
    if (mode === 'night' && night === 0 && !save.seen.tut) { this.onHint('Drag anywhere to move the moon. The sea rises under it.'); this.hintT = 6; this.introHints = 1; }
  }

  playStory(key: string, done: () => void) {
    this.sim = null; quietWater();
    this.story = { panels: SCENES[key], i: 0, t: 0, done };
    this.onStoryText(this.story.panels[0].text, 0, this.story.panels.length);
  }
  advanceStory() {
    const s = this.story; if (!s || s.t < 0.6) return;
    s.i++; s.t = 0; sfx.click();
    if (s.i >= s.panels.length) { this.story = null; this.onStoryText('', 0, 0); s.done(); }
    else this.onStoryText(s.panels[s.i].text, s.i, s.panels.length);
  }
  skipStory() { const s = this.story; if (!s) return; this.story = null; this.onStoryText('', 0, 0); s.done(); }

  setPaused(p: boolean) { this.paused = p; if (p) quietWater(); }
  revive() { if (!this.sim) return; this.sim.revive(); this.ended = false; this.endT = 0; }

  private attractInput(sim: Sim) {
    const t = this.time;
    this.moon.sx = sim.boat.x - sim.camX - 60 + Math.sin(t * 0.5) * 50;
    this.moon.y = 118 + Math.sin(t * 0.8) * 46;
  }

  private frame(now: number) {
    requestAnimationFrame(t => this.frame(t));
    let dt = Math.min(0.05, (now - this.last) / 1000 || 0); this.last = now;
    this.time += dt;
    if (this.story) {
      const s = this.story; s.t += dt;
      drawPanel(this.g, this.view, s.panels[s.i], this.time, Math.max(0, 1 - s.t * 2));
      music(0.1, 0.4, 0.1, true);
      return;
    }
    const sim = this.sim; if (!sim) return;
    if (!this.paused) {
      if (this.slow > 0) { this.slow -= dt; dt *= 0.4; }
      if (this.mode === 'attract') this.attractInput(sim);
      sim.update(dt, { moonSX: this.moon.sx, moonY: this.moon.y, power: this.power });
      this.handleEvents(sim);
      stepFx(this.fx, dt);
      this.hints(sim, dt);
      // wake
      if (!sim.boat.air && sim.boat.vx > 120 && Math.random() < dt * 30) this.fx.particles.push({ x: sim.boat.x - 16, y: sim.boat.y + 2, vx: -30 - Math.random() * 40, vy: -20 - Math.random() * 30, life: 0.4, max: 0.4, r: 1.5, c: this.ink.paper, g: 200 });
      const b = sim.boat;
      const swell = Math.min(1, Math.abs(b.vy) / 120 + Math.abs(sim.slope(b.x)) * 1.2);
      music(Math.min(1, Math.max(0, (b.vx - FLOW) / 170)), Math.min(1, Math.max(0, (SEA - b.y) / 80)), swell, this.mode === 'drift' || this.mode === 'attract');
      if (this.mode !== 'attract') this.onHud(sim);
      if (sim.done !== 'no' && !this.ended) { this.endT += dt; if (this.endT > (sim.done === 'win' ? 1.1 : 0.9)) { this.ended = true; this.finish(sim); } }
    }
    render(this.g, this.view, sim, this.ink, { boatKind: this.boatKind, lantern: this.lantern, fx: this.fx, time: this.time, ghost: this.ghost, contrast: save.settings.contrast });
  }

  private handleEvents(sim: Sim) {
    const quiet = this.mode === 'attract', red = save.settings.reduced;
    for (const e of sim.events) {
      if (quiet) continue;
      switch (e.k) {
        case 'fly': sfx.fly(); burst(this.fx, e.x, e.y, 6, this.ink.moon, 70, 60, 1.8); buzz('light'); break;
        case 'hit': sfx.hit(); buzz('heavy'); burst(this.fx, e.x, e.y, 16, this.ink.paper, 160); if (!red) { this.fx.shake = 1; this.fx.flash = 0.8; } break;
        case 'near': sfx.near(); buzz('medium'); this.fx.texts.push({ x: e.x, y: e.y - 44, s: 'close!', life: 1, c: this.lantern }); if (!red) this.slow = 0.28; break;
        case 'splash': sfx.splash(e.s); burst(this.fx, e.x, e.y, 5 + Math.round(e.s * 10), this.ink.paper, 60 + e.s * 120); break;
        case 'strand': this.fx.texts.push({ x: sim.boat.x, y: sim.boat.y - 44, s: 'aground!', life: 1, c: this.ink.paper }); buzz('medium'); break;
        case 'mult': if (e.m > 1) sfx.mult(e.m); if (e.m >= 5 && !this.x5) { this.x5 = true; bump('x5', 1); } if (e.m < 5) this.x5 = false; break;
        case 'power': sfx.power(); buzz('heavy'); if (!red) this.fx.flash = 0.5; break;
        case 'win': sfx.win(); buzz('medium'); for (let i = 0; i < 4; i++) burst(this.fx, sim.boat.x + i * 14, sim.boat.y - 20, 12, i % 2 ? this.ink.moon : this.lantern, 190, 220); break;
        case 'lose': sfx.lose(); burst(this.fx, sim.boat.x, sim.boat.y, 24, this.lantern, 150); break;
      }
    }
    sim.events.length = 0;
  }

  private hints(sim: Sim, dt: number) {
    if (this.mode !== 'night') return;
    if (this.hintT > 0) { this.hintT -= dt; if (this.hintT <= 0) { this.onHint(''); if (this.introHints === 1) { this.introHints = 2; this.onHint('Keep the moon just behind the boat to push it along.'); this.hintT = 6; } else if (this.introHints === 2) { this.introHints = 3; save.seen.tut = true; } } return; }
    for (const o of sim.level.obs) {
      const d = o.x - sim.boat.x; if (d < 60 || d > 430) continue;
      if (!save.seen['h_' + o.t]) { save.seen['h_' + o.t] = true; this.onHint(HINTS[o.t]); this.hintT = 6.5; break; }
    }
  }

  private finish(sim: Sim) {
    const win = sim.done === 'win', m = this.mode;
    if (m === 'attract') return;
    const r: Result = { mode: m, night: this.night, win, time: sim.t, par: this.level.par, flies: sim.fliesGot, fliesTotal: sim.fliesTotal, score: Math.round(sim.score), near: sim.nearCount, peak: Math.floor(sim.multPeak),
      mask: 0, oldMask: 0, earned: 0, xp: 0, best: false, dist: Math.round(sim.boat.x / 10), unlocks: [], canRevive: !win && !sim.revived && m !== 'drift' };
    if (!win && r.canRevive && save.flies >= 40) { this.onEnd(r); return; } // offer revive first; commit happens when declined
    this.commit(r);
    this.onEnd(r);
  }

  /** Apply a finished run to the save. Called once per run. */
  commit(r: Result) {
    const sim = this.sim!; r.canRevive = false;
    bump('fly', r.flies); bump('near', r.near); bump('surf', Math.round(sim.surfTime));
    save.stats.fliesAll += r.flies; save.stats.near += r.near; save.stats.dist += r.dist;
    if (r.mode === 'night') {
      const i = r.night; r.oldMask = save.stars[i];
      if (r.win) {
        r.mask = 1 | (r.flies >= Math.ceil(r.fliesTotal * 0.8) ? 2 : 0) | (r.time <= r.par ? 4 : 0);
        const merged = r.oldMask | r.mask; const gained = starCount(merged) - starCount(r.oldMask);
        save.stars[i] = merged; bump('star', gained); bump('night', 1); if (sim.hits === 0) bump('clean', 1);
        save.stats.nights++;
        if (!save.bestTime[i] || r.time < save.bestTime[i]) { save.bestTime[i] = r.time; save.ghosts['n' + (i + 1)] = sim.trace.slice(0, 2400); r.best = true; }
        r.earned = r.flies + sim.bonus + Math.floor(r.score / 500); r.xp = 40 + gained * 25 + Math.floor(r.flies / 2);
      } else { r.earned = Math.floor(r.flies / 2); r.xp = 8; }
    } else if (r.mode === 'endless') {
      r.earned = r.flies + sim.bonus + Math.floor(r.score / 700); r.xp = 15 + Math.floor(r.dist / 40);
      if (r.score > save.endlessBest) { save.endlessBest = r.score; r.best = true; }
    } else if (r.mode === 'daily') {
      const first = save.dailyBest.date !== today();
      r.earned = r.flies + sim.bonus + Math.floor(r.score / 700) + (r.win && first ? 50 : 0); r.xp = 20 + (r.win ? 40 : 0);
      if (first || r.score > save.dailyBest.score) { save.dailyBest = { date: today(), score: r.score }; r.best = true; }
    } else { r.earned = Math.floor(r.flies / 3); r.xp = Math.min(30, Math.floor(r.flies / 4)); }
    save.flies += r.earned; save.xp += r.xp;
    r.unlocks = claimRanks();
    persist();
  }

  /** Leave a drift or endless run by choice. */
  quitRun(): Result | null {
    const sim = this.sim; if (!sim || this.ended || this.mode === 'attract') return null;
    this.ended = true;
    const r: Result = { mode: this.mode, night: this.night, win: this.mode === 'drift', time: sim.t, par: 0, flies: sim.fliesGot, fliesTotal: sim.fliesTotal, score: Math.round(sim.score), near: sim.nearCount, peak: Math.floor(sim.multPeak), mask: 0, oldMask: 0, earned: 0, xp: 0, best: false, dist: Math.round(sim.boat.x / 10), unlocks: [], canRevive: false, quit: true };
    if (this.mode === 'night') return null;
    this.commit(r); return r;
  }
}
export { COASTS };
