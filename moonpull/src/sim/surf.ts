import { BASE, BoatStats, Ev, Level } from './types';

export const G = 560;          // gravity
export const HOLD = 2.9;       // extra weight while the moon pulls (on the water)
export const DIVE = 2.4;       // extra weight while the moon pulls (in the air)
export const VMIN = 120, VMAX = 760;
export const LIFT = 0.42;
export const THROW = 0.3;      // upward kick the sea gives as it lets the boat go      // how easily the released sea throws the boat off a rounded crest
const STEP = 1 / 120;

/** Smooth surface through alternating extrema, cosine-interpolated. */
export class Surface {
  ex: number[]; ey: number[]; private i = 0;
  constructor(ex: number[], ey: number[]) { this.ex = ex; this.ey = ey; }
  private seg(x: number) {
    const ex = this.ex;
    if (x < ex[0]) return -1;
    let i = this.i;
    if (i >= ex.length - 1 || x < ex[i]) { let lo = 0, hi = ex.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (ex[m] <= x) lo = m; else hi = m; } i = lo; }
    while (i < ex.length - 2 && x >= ex[i + 1]) i++;
    this.i = i; return i;
  }
  y(x: number) {
    const i = this.seg(x); if (i < 0) return this.ey[0]; if (i >= this.ex.length - 1) return this.ey[this.ey.length - 1];
    const L = this.ex[i + 1] - this.ex[i], u = Math.min(1, (x - this.ex[i]) / L);
    return this.ey[i] + (this.ey[i + 1] - this.ey[i]) * (1 - Math.cos(Math.PI * u)) / 2;
  }
  d1(x: number) {
    const i = this.seg(x); if (i < 0 || i >= this.ex.length - 1) return 0;
    const L = this.ex[i + 1] - this.ex[i], u = Math.min(1, (x - this.ex[i]) / L);
    return (this.ey[i + 1] - this.ey[i]) * Math.PI / (2 * L) * Math.sin(Math.PI * u);
  }
  d2(x: number) {
    const i = this.seg(x); if (i < 0 || i >= this.ex.length - 1) return 0;
    const L = this.ex[i + 1] - this.ex[i], u = Math.min(1, (x - this.ex[i]) / L);
    return (this.ey[i + 1] - this.ey[i]) * Math.PI * Math.PI / (2 * L * L) * Math.cos(Math.PI * u);
  }
}

export interface SimCfg { boat: BoatStats; magnet: number; hearts: number; endless?: (lvl: Level, toX: number) => void; noFail?: boolean; noStorm?: boolean }

export class Sim {
  lvl: Level; cfg: SimCfg; surf: Surface;
  t = 0; acc = 0;
  b = { x: 80, y: BASE, vx: 200, vy: 0, s: 200, air: false, ang: 0, airT: 0, inv: 0, hearts: 3, lastAir: 0 };
  hold = false; pull = 0;          // pull: smoothed 0..1 for visuals
  storm = 0; stormV = 0;
  chain = 0; bestChain = 0; fever = false;
  score = 0; flies = 0; fliesGot = 0; fliesTotal = 0; perfects = 0; nears = 0; crashes = 0; rings = 0; airTotal = 0; bestAir = 0;
  done: 'no' | 'win' | 'lose' = 'no'; why: 'storm' | 'wreck' | '' = '';
  events: Ev[] = []; trace: number[] = []; private tr = 0;
  revived = false;

  constructor(lvl: Level, cfg: SimCfg) {
    this.lvl = lvl; this.cfg = cfg; this.surf = new Surface(lvl.ex, lvl.ey);
    this.b.hearts = cfg.hearts; this.b.y = this.surf.y(this.b.x);
    this.fliesTotal = lvl.flies.length;
    this.storm = this.b.x - lvl.storm.gap;
    if (cfg.endless) cfg.endless(lvl, this.b.x + 4000);
  }

  get progress() { return isFinite(this.lvl.length) ? Math.min(1, this.b.x / this.lvl.length) : 0; }
  get mult() { return 1 + Math.min(4, Math.floor(this.chain / 3)) + (this.fever ? 1 : 0); }
  get stormGap() { return this.b.x - this.storm; }

  update(dt: number, hold: boolean) {
    this.hold = hold;
    this.acc += Math.min(dt, 0.1);
    while (this.acc >= STEP) { this.acc -= STEP; this.step(STEP); }
  }

  revive() { this.done = 'no'; this.why = ''; this.revived = true; this.b.hearts = 1; this.b.inv = 2.5; this.storm = Math.min(this.storm, this.b.x - 520); this.b.s = Math.max(this.b.s, 260); }

  private setChain(n: number) {
    const was = this.chain; this.chain = n; if (n > this.bestChain) this.bestChain = n;
    if (n > was && n % 3 === 0) this.events.push({ k: 'chain', n });
    const f = n >= 9; if (f !== this.fever) { this.fever = f; this.events.push({ k: 'fever', on: f }); }
  }

  private step(dt: number) {
    if (this.done === 'lose') return;
    const b = this.b, S = this.surf, st = this.cfg.boat, h = this.hold && this.done === 'no';
    this.t += dt;
    this.pull += ((h ? 1 : 0) - this.pull) * Math.min(1, dt * 10);
    if (b.inv > 0) b.inv -= dt;

    if (!b.air) {
      const d1 = S.d1(b.x), d2 = S.d2(b.x), n = Math.sqrt(1 + d1 * d1);
      const g = G * st.grav * (h ? HOLD : 1);
      b.s += g * (d1 / n) * dt;
      b.s -= (0.00042 * b.s * b.s + 6) * dt;
      b.s = Math.max(VMIN, Math.min(VMAX, b.s));
      b.vx = b.s / n; b.vy = b.vx * d1;
      // leave the water when the swell curves away faster than gravity can hold the boat down
      if (!h && d2 * b.vx * b.vx > G * LIFT && d1 < 0.05) {
        b.air = true; b.airT = 0; b.vy -= THROW * b.s; this.events.push({ k: 'launch', x: b.x, y: b.y, v: b.s });
      } else {
        b.x += b.vx * dt; b.y = S.y(b.x);
        b.ang += (Math.atan(S.d1(b.x)) - b.ang) * Math.min(1, dt * 16);
      }
    }
    if (b.air) {
      b.vy += G * st.air * (h ? DIVE : 1) * dt;
      b.x += b.vx * dt; b.y += b.vy * dt; b.airT += dt;
      b.ang += (Math.atan2(b.vy, b.vx) * 0.85 - b.ang) * Math.min(1, dt * 8);
      const sy = S.y(b.x);
      if (b.y >= sy) this.land(sy);
    }

    if (this.done === 'no') this.hazards(dt);
    this.collect();

    // storm
    if (!this.cfg.noStorm && this.done === 'no') {
      const s = this.lvl.storm, p = isFinite(this.lvl.length) ? this.progress : Math.min(1, b.x / 60000);
      this.stormV = s.v0 + (s.v1 - s.v0) * p;
      this.storm += this.stormV * dt;
      if (this.storm < b.x - 720) this.storm = b.x - 720;
      if (this.storm >= b.x - 18 && !this.cfg.noFail) this.lose('storm');
    }
    this.score += b.s * dt * 0.05 * this.mult;

    this.tr += dt; if (this.tr >= 0.1) { this.tr -= 0.1; this.trace.push(Math.round(b.x), Math.round(b.y)); }
    if (this.cfg.endless) { const want = b.x + 3000; if (this.lvl.ex[this.lvl.ex.length - 1] < want) this.cfg.endless(this.lvl, want + 2000); }
    if (this.done === 'no' && b.x >= this.lvl.length) { this.done = 'win'; this.events.push({ k: 'win' }); }
  }

  private land(sy: number) {
    const b = this.b, S = this.surf, d1 = S.d1(b.x);
    const va = Math.atan2(b.vy, b.vx), sa = Math.atan(d1), diff = Math.abs(va - sa);
    const v = Math.hypot(b.vx, b.vy);
    const win = this.cfg.boat.land;
    let q: 'perfect' | 'good' | 'bad';
    if (diff < 0.27 * win && d1 > 0.04) { q = 'perfect'; b.s = v * Math.cos(diff) * 1.04 + 40; }
    else if (diff < 0.62 * win) { q = 'good'; b.s = v * Math.cos(diff); }
    else { q = 'bad'; b.s = v * Math.cos(diff) * 0.55; }
    b.s = Math.max(VMIN, Math.min(VMAX, b.s));
    b.air = false; b.y = sy; b.lastAir = b.airT;
    this.airTotal += b.airT; if (b.airT > this.bestAir) this.bestAir = b.airT;
    if (b.airT > 0.25) this.score += Math.round(b.airT * 120) * this.mult;
    if (q === 'perfect') { this.perfects++; this.score += 150 * this.mult; this.setChain(this.chain + 1); }
    else if (q === 'bad' && b.airT > 0.2) this.setChain(0);
    this.events.push({ k: 'land', x: b.x, y: sy, q, air: b.airT, v: b.s });
  }

  rockTop(o: { x: number; w: number; top: number }, x: number) {
    const u = Math.abs(x - (o.x + o.w / 2)) / (o.w / 2); if (u >= 1) return Infinity;
    return o.top + (BASE + 140 - o.top) * Math.pow(u, 1.7);
  }
  archBottom(o: { x: number; w: number; bottom: number }, x: number) {
    const e = Math.min(x - o.x, o.x + o.w - x); if (e < 0) return -Infinity;
    return o.bottom - Math.max(0, 22 - e) * 1.2;
  }

  private hazards(dt: number) {
    const b = this.b;
    for (const o of this.lvl.obs) {
      if (o.t === 'ring') continue;
      const far = o.t === 'whale' ? o.x - b.x > 120 || b.x - o.x - o.w > 60 : o.x - b.x > 60 || b.x - o.x - o.w > 60;
      if (far) continue;
      if (o.t === 'rock') {
        if (b.inv <= 0 && b.y - 5 > this.rockTop(o, b.x)) { this.crash(o.x + o.w / 2 + o.w * 0.55); return; }
        if (!o.passed && b.x > o.x + o.w / 2) {
          o.passed = true;
          if (b.inv <= 0 && b.air && o.top - b.y < 34) { this.nears++; this.score += 200 * this.mult; this.setChain(this.chain + 1); this.events.push({ k: 'near', x: b.x, y: b.y }); }
        }
      } else if (o.t === 'arch') {
        if (b.inv <= 0 && b.y - 26 < this.archBottom(o, b.x)) { this.crash(o.x + o.w + 30); return; }
        if (!o.passed && b.x > o.x + o.w) { o.passed = true; if (b.inv <= 0) { this.nears++; this.score += 150 * this.mult; this.setChain(this.chain + 1); this.events.push({ k: 'near', x: b.x, y: b.y }); } }
      } else if (o.t === 'whale') {
        if (!o.used && !b.air && b.x > o.x + o.w * 0.35 && b.x < o.x + o.w) {
          o.used = true; o.at = this.t; b.air = true; b.airT = 0; b.vy = -560; b.vx = Math.max(b.vx, 330); b.s = Math.max(b.s, 330);
          this.score += 100 * this.mult; this.events.push({ k: 'whale', x: b.x, y: b.y });
        }
      }
    }
  }

  private crash(toX: number) {
    const b = this.b;
    this.crashes++; this.setChain(0);
    this.events.push({ k: 'crash', x: b.x, y: b.y });
    if (!this.cfg.noFail) b.hearts--;
    b.inv = 1.6; b.s = VMIN + 20; b.air = false; b.x = Math.max(b.x, Math.min(toX, b.x + 40)); b.y = this.surf.y(b.x);
    if (b.hearts <= 0) this.lose('wreck');
  }
  private lose(why: 'storm' | 'wreck') { this.done = 'lose'; this.why = why; this.events.push({ k: 'lose', why }); }

  private collect() {
    const b = this.b, r = 24 + this.cfg.magnet * 10, cy = b.y - 14;
    for (const f of this.lvl.flies) {
      if (f.got) continue; const dx = f.x - b.x; if (dx > r + 80 || dx < -r - 20) continue;
      const dy = f.y - cy, d2 = dx * dx + dy * dy;
      if (this.cfg.magnet > 0 && d2 < (r + 50) ** 2) { f.x -= dx * 0.06; f.y -= dy * 0.06; }
      if (d2 < r * r) { f.got = true; this.fliesGot++; this.flies += this.fever ? 2 : 1; this.score += 40 * this.mult; this.events.push({ k: 'fly', x: f.x, y: f.y }); }
    }
    for (const o of this.lvl.obs) {
      if (o.t !== 'ring' || o.got) continue; const dx = o.x - b.x; if (Math.abs(dx) > 34) continue;
      if (Math.abs(o.y - cy) < 34) { o.got = true; this.rings++; this.flies += 3; this.score += 300 * this.mult; this.setChain(this.chain + 1); this.events.push({ k: 'ring', x: o.x, y: o.y }); }
    }
  }
}
