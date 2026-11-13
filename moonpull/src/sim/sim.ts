import { Ev, Input, LevelDef, Ob, RunCfg, SEA, MOON_TOP, MOON_LOW } from './types';

const DX = 6;
const STEP = 1 / 120;
const SIGMA = 95;
const K = 34, DAMP = 3.0, SPREAD = 1500;
const GRAV = 620;
const SLOPE_G = 300;
export const FLOW = 62;
const MAXV = 250;

export function pullOf(moonY: number) {
  return Math.max(0, Math.min(1, (moonY - MOON_TOP) / (MOON_LOW - MOON_TOP)));
}

export class Sim {
  level: LevelDef; cfg: RunCfg;
  t = 0; acc = 0;
  // water columns, world anchored
  i0 = 0; n: number; h: Float32Array; v: Float32Array;
  camX = 0;
  moonX = 0; moonY = 90; moonDim = false;
  boat = { x: 60, y: SEA, vx: FLOW, vy: 0, air: false, ang: 0, hp: 2, inv: 0, stranded: false, whirlT: 0 };
  mult = 1; multPeak = 1; score = 0; fliesGot = 0; fliesTotal = 0; bonus = 0; nearCount = 0; surfTime = 0; hits = 0;
  powerCd = 0; powerMax = 1; stillT = 0;
  done: 'no' | 'win' | 'lose' = 'no';
  events: Ev[] = [];
  trace: number[] = []; traceT = 0;
  revived = false;
  private genX = 0;
  private lastPower = false;

  constructor(level: LevelDef, cfg: RunCfg) {
    this.level = level; this.cfg = cfg;
    this.n = Math.ceil((cfg.viewW + 520) / DX) + 2;
    this.h = new Float32Array(this.n); this.v = new Float32Array(this.n);
    this.boat.hp = cfg.boat.hp + cfg.hull;
    this.fliesTotal = level.flies.length;
    this.camX = this.boat.x - cfg.viewW * 0.3;
    this.moonX = this.camX + cfg.viewW * 0.2;
    this.i0 = Math.floor((this.camX - 160) / DX);
    for (let i = 0; i < this.n; i++) this.h[i] = this.target((this.i0 + i) * DX);
    this.boat.y = this.surface(this.boat.x);
    this.extend();
  }

  private extend() {
    if (!this.cfg.endless) return;
    const want = this.boat.x + 2400;
    if (want > this.genX) {
      const from = Math.max(this.genX, 500);
      this.cfg.endless(from, want + 1200, this.level);
      this.genX = want + 1200;
      // drop what is far behind
      const cut = this.boat.x - 900;
      this.level.obs = this.level.obs.filter(o => o.x + o.w > cut);
      this.level.flies = this.level.flies.filter(f => f.x > cut);
    }
  }

  pullFactor(): number {
    let f = this.level.pull;
    this.moonDim = false;
    for (const o of this.level.obs) {
      if (o.t === 'cloud' && this.moonX > o.x && this.moonX < o.x + o.w && this.moonY > o.y0 && this.moonY < o.y1) { this.moonDim = true; f *= 0.22; break; }
    }
    return f;
  }
  private pf = 1;

  target(x: number): number {
    if (this.stillT > 0) return SEA - 3;
    const p = pullOf(this.moonY) * this.pf;
    const A = 5 * this.pf + 72 * Math.pow(p, 1.15);
    const d = (x - this.moonX) / SIGMA;
    let y = SEA - 20 * p - A * Math.exp(-d * d);
    for (const o of this.level.obs) {
      if (o.t === 'whirl') { const e = (x - o.x) / 40; if (e > -3 && e < 3) y += 40 * Math.exp(-e * e); }
    }
    return y;
  }

  surface(x: number): number {
    const fx = x / DX - this.i0;
    const i = Math.floor(fx);
    if (i < 0 || i >= this.n - 1) return this.target(x);
    const a = fx - i;
    return this.h[i] * (1 - a) + this.h[i + 1] * a;
  }
  slope(x: number): number { return (this.surface(x + 7) - this.surface(x - 7)) / 14; }

  /** rock top under the boat (reef/bar), Infinity if open water */
  floorAt(x: number): { top: number; bar: boolean } {
    let top = Infinity, bar = false;
    for (const o of this.level.obs) {
      if (o.t === 'reef') {
        const c = o.x + o.w / 2, r = Math.abs(x - c) / (o.w / 2);
        if (r < 1) { const y = o.top + (360 - o.top) * Math.pow(r, 1.6); if (y < top) { top = y; bar = false; } }
      } else if (o.t === 'bar') {
        if (x > o.x && x < o.x + o.w) {
          const edge = Math.min(x - o.x, o.x + o.w - x);
          const y = o.top + Math.max(0, 30 - edge) * 1.6;
          if (y < top) { top = y; bar = true; }
        }
      }
    }
    return { top, bar };
  }
  ceilAt(x: number): number {
    let b = -Infinity;
    for (const o of this.level.obs) {
      if (o.t === 'over' && x > o.x && x < o.x + o.w) {
        const edge = Math.min(x - o.x, o.x + o.w - x);
        const y = o.bottom - Math.max(0, 16 - edge) * 0.8;
        if (y > b) b = y;
      }
    }
    return b;
  }
  flowAt(x: number): number {
    for (const o of this.level.obs) if (o.t === 'rip' && x > o.x && x < o.x + o.w) return -46;
    return FLOW;
  }

  usePower() {
    if (this.powerCd > 0 || this.cfg.power === 'none' || this.done !== 'no') return;
    if (this.cfg.power === 'spring') {
      for (let i = 0; i < this.n; i++) { const d = ((this.i0 + i) * DX - this.moonX) / 120; this.v[i] -= 330 * Math.exp(-d * d); }
      this.powerMax = this.powerCd = 11;
    } else {
      this.stillT = 2.4; this.powerMax = this.powerCd = 13;
    }
    this.events.push({ k: 'power', p: this.cfg.power });
  }

  revive() { this.done = 'no'; this.boat.hp = 1; this.boat.inv = 3; this.revived = true; this.boat.vx = Math.max(this.boat.vx, 90); }

  update(dt: number, inp: Input) {
    this.acc += Math.min(dt, 0.1);
    if (inp.power && !this.lastPower) this.usePower();
    this.lastPower = inp.power;
    while (this.acc >= STEP) { this.acc -= STEP; this.step(inp); }
  }

  private step(inp: Input) {
    const dt = STEP, b = this.boat, W = this.cfg.viewW;
    if (this.done === 'lose') return;
    this.t += dt;
    // camera
    const lead = 0.3 - Math.min(0.08, Math.max(0, (b.vx - 100) / 1800));
    const tx = b.x - W * lead;
    this.camX += (tx - this.camX) * Math.min(1, dt * 5);
    this.moonX = this.camX + Math.max(20, Math.min(W - 20, inp.moonSX));
    this.moonY = Math.max(MOON_TOP, Math.min(MOON_LOW, inp.moonY));
    this.pf = this.pullFactor();
    if (this.powerCd > 0) this.powerCd -= dt;
    if (this.stillT > 0) this.stillT -= dt;

    // shift water window
    const want = Math.floor((this.camX - 160) / DX);
    const sh = want - this.i0;
    if (sh > 0) {
      if (sh < this.n) { this.h.copyWithin(0, sh); this.v.copyWithin(0, sh); }
      this.i0 = want;
      for (let i = Math.max(0, this.n - sh); i < this.n; i++) { this.h[i] = this.target((this.i0 + i) * DX); this.v[i] = 0; }
    }
    // water dynamics
    const h = this.h, v = this.v, n = this.n;
    const damp = Math.exp(-(this.stillT > 0 ? 9 : DAMP) * dt);
    for (let i = 0; i < n; i++) {
      const l = h[i > 0 ? i - 1 : i], r = h[i < n - 1 ? i + 1 : i];
      v[i] = (v[i] + (K * (this.target((this.i0 + i) * DX) - h[i]) + SPREAD * (l + r - 2 * h[i])) * dt) * damp;
    }
    for (let i = 0; i < n; i++) h[i] += v[i] * dt;

    // boat
    const st = this.cfg.boat;
    if (b.inv > 0) b.inv -= dt;
    const yOld = b.y;
    let surf = this.surface(b.x + b.vx * dt);
    const fl = this.floorAt(b.x);
    b.stranded = false;
    if (fl.bar && surf > fl.top - 5) { surf = fl.top - 5; b.stranded = surf < this.surface(b.x) - 0.5 || true; }
    const yFree = b.y + b.vy * dt + 0.5 * GRAV * dt * dt;
    if (yFree < surf - 0.6) {
      // airborne
      if (!b.air && surf - yFree > 3) b.air = true;
      b.y = yFree; b.vy += GRAV * dt;
      b.vx -= (b.vx - FLOW) * 0.08 * dt;
    } else {
      if (b.air) { b.air = false; this.events.push({ k: 'splash', x: b.x, y: surf, s: Math.min(1, Math.abs(b.vy) / 260) }); }
      b.y = surf;
      b.vy = Math.max(-420, Math.min(420, (surf - yOld) / dt));
      const s = this.slope(b.x);
      if (b.stranded) {
        b.vx *= Math.exp(-6 * dt);
        if (Math.abs(b.vx) < 12 && !this.strandFlag) { this.strandFlag = true; this.events.push({ k: 'strand' }); }
      } else {
        this.strandFlag = false;
        b.vx += (SLOPE_G * st.accel * s + (this.flowAt(b.x) - b.vx) * st.drag) * dt;
      }
    }
    if (b.inv > 0 && b.vx < 90) b.vx = 90;
    b.vx = Math.max(-140, Math.min(MAXV, b.vx));
    b.x += b.vx * dt;
    if (b.x < this.camX + 14) { b.x = this.camX + 14; if (b.vx < 0) b.vx = 0; }
    const ta = b.air ? Math.atan2(b.vy, Math.max(60, b.vx)) * 0.6 : Math.atan(this.slope(b.x));
    b.ang += (ta - b.ang) * Math.min(1, dt * 10);

    // hazards
    let hit = false;
    if (b.inv <= 0 && this.done === 'no') {
      if (!fl.bar && b.y + 5 > fl.top) hit = true;
      const c = this.ceilAt(b.x);
      if (c > -Infinity && b.y - 30 < c) hit = true;
      let inWhirl = false;
      for (const o of this.level.obs) if (o.t === 'whirl' && Math.abs(b.x - o.x) < 16 && !b.air && this.surface(o.x) > SEA + 12) inWhirl = true;
      if (inWhirl) { b.whirlT += dt; if (b.whirlT > 1.0) hit = true; } else b.whirlT = Math.max(0, b.whirlT - dt * 2);
    }
    if (hit) {
      this.hits++;
      if (!this.cfg.noFail) b.hp--;
      b.inv = 1.7; b.whirlT = 0; b.vy = -120; b.vx = Math.max(b.vx * 0.5, 90);
      this.setMult(1);
      this.events.push({ k: 'hit', x: b.x, y: b.y });
      if (b.hp <= 0) { this.done = 'lose'; this.events.push({ k: 'lose' }); return; }
    }

    // near misses + pass bookkeeping
    for (const o of this.level.obs) {
      if (o.t === 'cloud' || o.t === 'rip' || o.passed) continue;
      const c = o.x + o.w / 2;
      if (b.x > c) {
        o.passed = true;
        if (b.inv > 0) continue;
        let near = false;
        if (o.t === 'reef') near = o.top - (b.y + 5) < 11;
        if (o.t === 'over') near = (b.y - 30) - o.bottom < 9;
        if (near) { this.nearCount++; this.bonus += 2; this.setMult(Math.min(5, this.mult + 0.5)); this.events.push({ k: 'near', x: b.x, y: b.y }); }
      }
    }

    // fireflies
    const rad = 24 + this.cfg.magnet * 9;
    for (const f of this.level.flies) {
      if (f.got) continue;
      const dx = f.x - b.x; if (dx > rad + 60) continue; if (dx < -rad - 60) continue;
      const dy = f.y - (b.y - 22);
      const d2 = dx * dx + dy * dy;
      if (this.cfg.magnet > 0 && d2 < (rad + 40) * (rad + 40)) { f.x -= dx * dt * 4; f.y -= dy * dt * 4; }
      if (d2 < rad * rad) {
        f.got = true; this.fliesGot++; this.score += 25 * Math.floor(this.mult);
        this.events.push({ k: 'fly', x: f.x, y: f.y, n: this.fliesGot });
      }
    }

    // multiplier and score
    const fast = b.vx > 138;
    if (fast) { this.surfTime += dt; this.setMult(Math.min(5, this.mult + dt * 0.42 * st.multGain)); }
    else if (b.vx < 100) this.setMult(Math.max(1, this.mult - dt * (0.7 - this.cfg.streak * 0.15)));
    this.score += Math.max(0, b.vx) * dt * Math.floor(this.mult) * 0.1;

    // trace for ghost
    this.traceT += dt;
    if (this.traceT >= 0.1) { this.traceT -= 0.1; this.trace.push(Math.round(b.x), Math.round(b.y)); }

    this.extend();
    if (this.done === 'no' && b.x >= this.level.length) { this.done = 'win'; this.events.push({ k: 'win' }); }
  }
  private strandFlag = false;
  private setMult(m: number) {
    if (Math.floor(m) !== Math.floor(this.mult)) this.events.push({ k: 'mult', m: Math.floor(m) });
    this.mult = m; if (m > this.multPeak) this.multPeak = m;
  }
}
