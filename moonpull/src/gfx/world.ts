// Paints the play scene into a 2D canvas. Post.ts adds the glow and grading afterwards.
import { Sim, Surface } from '../sim/surf';
import { BASE, Level } from '../sim/types';
import { INKS, Ink, FEVER } from './inks';
import { moonTex, cloudTex, coastStrip, Strip, paperTex, fbm } from './tex';
import { mulberry } from '../sim/rng';

type G = CanvasRenderingContext2D;
export interface Cam { x: number; top: number; k: number; W: number; H: number }
export const BOTTOM = 352;

export interface P { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; c: string; g: number; add?: boolean; kind?: 'dot' | 'streak' | 'ring' }
export interface Pop { x: number; y: number; s: string; life: number; c: string; size: number }
export class Fx {
  ps: P[] = []; pops: Pop[] = []; shake = 0; flash = 0;
  burst(x: number, y: number, n: number, c: string, sp: number, g = 500, r = 2.4, add = false, up = 0.6) {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = sp * (0.35 + Math.random() * 0.65); this.ps.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - sp * up, life: 0.5 + Math.random() * 0.5, max: 1, r: r * (0.5 + Math.random() * 0.8), c, g, add }); }
  }
  ring(x: number, y: number, c: string, r = 10) { this.ps.push({ x, y, vx: 0, vy: 0, life: 0.6, max: 0.6, r, c, g: 0, add: true, kind: 'ring' }); }
  pop(x: number, y: number, s: string, c: string, size = 26) { this.pops.push({ x, y, s, life: 1, c, size }); }
  step(dt: number) {
    this.shake = Math.max(0, this.shake - dt * 3); this.flash = Math.max(0, this.flash - dt * 2.5);
    for (const p of this.ps) { p.life -= dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.kind === 'ring') p.r += dt * 90; }
    this.ps = this.ps.filter(p => p.life > 0); if (this.ps.length > 600) this.ps.splice(0, this.ps.length - 600);
    for (const p of this.pops) p.life -= dt * 0.85; this.pops = this.pops.filter(p => p.life > 0);
  }
}

const STARS = (() => { const r = mulberry(31); return Array.from({ length: 140 }, () => ({ x: r(), y: r() * 0.62, s: 0.4 + r() * r() * 1.8, p: r() * 7 })); })();

export class Painter {
  ink: Ink; coast = -1; moon!: HTMLCanvasElement; clouds: HTMLCanvasElement[] = []; strips: Strip[] = []; paper!: CanvasPattern | null; private n = fbm(3);
  constructor(coast: number) { this.ink = INKS[0]; this.setCoast(coast); }
  setCoast(c: number) {
    if (c === this.coast) return; this.coast = c; this.ink = INKS[c]; this.glowTex = null;
    this.moon = moonTex(this.ink); this.clouds = [0, 1, 2, 3].map(i => cloudTex(this.ink, 11 + i * 7 + c * 3, 380 + i * 60, 130 + i * 14));
    this.strips = [0, 1, 2].map(l => coastStrip(this.ink, c, l, 100 + c * 13 + l * 5));
    const p = document.createElement('canvas').getContext('2d')!; this.paper = p.createPattern(paperTex(), 'repeat');
  }

  sy(cam: Cam, wy: number) { return (wy - cam.top) * cam.k; }
  sx(cam: Cam, wx: number) { return (wx - cam.x) * cam.k; }
  horizon(cam: Cam) { return this.sy(cam, BASE - 52); }

  sky(g: G, cam: Cam, t: number, moonX: number, moonY: number, moonR: number, pull: number, stormDark = 0) {
    const { W, H } = cam, ink = this.ink, hz = this.horizon(cam);
    const sg = g.createLinearGradient(0, 0, 0, Math.max(hz, 10));
    sg.addColorStop(0, ink.sky[0]); sg.addColorStop(0.45, ink.sky[1]); sg.addColorStop(0.85, ink.sky[2]); sg.addColorStop(1, ink.sky[3]);
    g.fillStyle = sg; g.fillRect(0, 0, W, Math.max(hz + 2, 0));
    // stars
    g.fillStyle = '#fff';
    for (const s of STARS) {
      const x = ((s.x * W * 1.3 - cam.x * cam.k * 0.015) % (W * 1.3) + W * 1.3) % (W * 1.3); if (x > W) continue;
      const y = s.y * hz; const a = (0.35 + 0.5 * Math.sin(t * 1.7 + s.p)) * ink.stars * (1 - stormDark);
      if (a <= 0.02) continue; g.globalAlpha = a; g.fillRect(x, y, s.s * cam.k * 0.35 + 0.6, s.s * cam.k * 0.35 + 0.6);
    }
    g.globalAlpha = 1;
    // moon halo
    g.globalCompositeOperation = 'lighter';
    const halo = g.createRadialGradient(moonX, moonY, moonR * 0.6, moonX, moonY, moonR * (4 + pull * 1.5));
    halo.addColorStop(0, hexA(ink.moonGlow, 0.35 + pull * 0.25)); halo.addColorStop(0.3, hexA(ink.moonGlow, 0.1 + pull * 0.08)); halo.addColorStop(1, hexA(ink.moonGlow, 0));
    g.fillStyle = halo; g.fillRect(moonX - moonR * 6, moonY - moonR * 6, moonR * 12, moonR * 12);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1 - stormDark * 0.6; g.drawImage(this.moon, moonX - moonR, moonY - moonR, moonR * 2, moonR * 2); g.globalAlpha = 1;
    // clouds drift across, some in front of the moon
    const cn = this.coast === 2 ? 7 : this.coast === 1 ? 4 : 5;
    for (let i = 0; i < cn; i++) {
      const tex = this.clouds[i % 4], par = 0.03 + (i % 3) * 0.02, sc = cam.k * (0.55 + (i % 3) * 0.2) * (this.coast === 2 ? 1.3 : 1);
      const span = W + tex.width * sc;
      const x = (((i * 0.37 * span) - cam.x * cam.k * par - t * (6 + i * 2)) % span + span) % span - tex.width * sc;
      const y = hz * (0.12 + ((i * 0.29) % 0.6)) + (this.coast === 2 ? hz * 0.05 : 0);
      g.globalAlpha = this.coast === 2 ? 0.95 : 0.8; g.drawImage(tex, x, y, tex.width * sc, tex.height * sc);
    }
    g.globalAlpha = 1;
  }

  coastline(g: G, cam: Cam, t: number) {
    const hz = this.horizon(cam), { W } = cam;
    const pars = [0.05, 0.11, 0.2], scales = [0.75, 0.95, 1.1];
    for (let l = 0; l < 3; l++) {
      const s = this.strips[l], sc = cam.k * scales[l] * 0.8, w = s.w * sc;
      const off = ((cam.x * cam.k * pars[l]) % w + w) % w;
      const y = hz - s.base * sc + 6 + l * 4 * cam.k;
      for (let x = -off; x < W; x += w) g.drawImage(s.c, x, y, w + 1, s.h * sc);
    }
  }

  farSea(g: G, cam: Cam, t: number, moonX: number) {
    const ink = this.ink, hz = this.horizon(cam), { W, H } = cam;
    const fg = g.createLinearGradient(0, hz, 0, H); fg.addColorStop(0, ink.back); fg.addColorStop(0.5, ink.sea); fg.addColorStop(1, ink.deep);
    g.fillStyle = fg; g.fillRect(0, hz, W, H - hz);
    // moon glitter path on the far water
    g.globalCompositeOperation = 'lighter'; g.fillStyle = ink.moon;
    for (let i = 0; i < 70; i++) {
      const v = (i * 0.618) % 1, y = hz + 2 + v * v * (H * 0.3), spread = 6 + v * 40 * cam.k;
      const x = moonX + Math.sin(i * 12.9 + t * 0.9) * spread, a = (0.5 + 0.5 * Math.sin(t * 3 + i * 1.7)) * (1 - v) * 0.55;
      g.globalAlpha = a; g.fillRect(x - 3 - v * 8, y, 6 + v * 16, 1 + v * 1.5);
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }

  /** the swell band behind the play surface */
  midSwell(g: G, cam: Cam, t: number) {
    const ink = this.ink, { W, H } = cam;
    g.fillStyle = ink.back; g.globalAlpha = 0.85; g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W + 10; x += 10) { const wx = cam.x * 0.55 + x / cam.k; const y = BASE - 30 + 10 * Math.sin(wx * 0.006 + t * 0.4) + 6 * Math.sin(wx * 0.017 - t * 0.7); g.lineTo(x, this.sy(cam, y)); }
    g.lineTo(W + 10, H); g.closePath(); g.fill(); g.globalAlpha = 1;
  }

  /** the playfield water. surf(x) gives world y. */
  sea(g: G, cam: Cam, t: number, surf: (x: number) => number, moonX: number, fever: number, lantern?: { x: number; y: number; a: number; c: string }) {
    const ink = this.ink, { W, H } = cam, step = Math.max(7, Math.round(W / 130));
    const pts: number[] = []; let minY = 1e9;
    for (let x = -step; x <= W + step; x += step) { const wx = cam.x + x / cam.k; const y = this.sy(cam, surf(wx) + ripple(wx, t)); pts.push(y); if (y < minY) minY = y; }
    const sea = fever > 0 ? mix(ink.sea, FEVER.sea, fever * 0.5) : ink.sea;
    const gr = g.createLinearGradient(0, minY, 0, H); gr.addColorStop(0, sea); gr.addColorStop(0.45, mix(sea, ink.deep, 0.6)); gr.addColorStop(1, ink.deep);
    const path = new Path2D(); path.moveTo(-step, H + 4); pts.forEach((y, i) => path.lineTo(i * step - step, y)); path.lineTo(W + step, H + 4); path.closePath();
    g.fillStyle = gr; g.fill(path);
    g.save(); g.clip(path);
    // light caught inside the crest
    const line = new Path2D(); pts.forEach((y, i) => i ? line.lineTo(i * step - step, y + 10 * cam.k) : line.moveTo(-step, y + 10 * cam.k));
    g.strokeStyle = fever > 0 ? mix(ink.seaLight, FEVER.light, fever) : ink.seaLight; g.globalAlpha = 0.32; g.lineWidth = 22 * cam.k; g.stroke(line);
    g.globalAlpha = 1;
    // drifting streaks under the surface
    g.strokeStyle = ink.seaLight; g.lineWidth = 1.4 * cam.k; g.globalAlpha = 0.22; g.beginPath();
    for (let i = 0; i < 26; i++) {
      const wx = Math.floor(cam.x / 160) * 160 + i * 160 + this.n(i * 3.1) * 120, x = this.sx(cam, wx - t * 14);
      const y = this.sy(cam, surf(wx) + 22 + this.n(i * 7.7 + Math.floor(cam.x / 160)) * 90);
      g.moveTo(x, y); g.quadraticCurveTo(x + 12 * cam.k, y - 4 * cam.k, x + 26 * cam.k, y);
    }
    g.stroke(); g.globalAlpha = 1;
    // moon column on the water
    g.globalCompositeOperation = 'lighter'; g.fillStyle = ink.moon;
    const my = this.sy(cam, surf(cam.x + moonX / cam.k));
    for (let i = 0; i < 26; i++) {
      const v = i / 26, y = my + 8 + v * (H - my), w = (10 + v * 34 + Math.sin(t * 2.6 + i * 2.1) * 8) * cam.k * 0.6;
      g.globalAlpha = (0.32 - v * 0.26) * (0.6 + 0.4 * Math.sin(t * 4 + i)); g.fillRect(moonX - w / 2 + Math.sin(t * 1.3 + i) * 6, y, w, 2 * cam.k);
    }
    // lantern light pooled on the water
    if (lantern && lantern.a > 0) {
      const r = 150 * cam.k, lg = g.createRadialGradient(lantern.x, lantern.y + 10 * cam.k, 0, lantern.x, lantern.y + 10 * cam.k, r);
      lg.addColorStop(0, hexA(lantern.c, 0.42 * lantern.a)); lg.addColorStop(0.4, hexA(lantern.c, 0.12 * lantern.a)); lg.addColorStop(1, hexA(lantern.c, 0));
      g.globalAlpha = 1; g.fillStyle = lg; g.fillRect(lantern.x - r, lantern.y - r, r * 2, r * 2);
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.restore();
    // foam along the crest line
    g.strokeStyle = fever > 0 ? mix(ink.foam, FEVER.foam, fever) : ink.foam; g.lineCap = 'round';
    g.lineWidth = 2.6 * cam.k; g.globalAlpha = 0.9; g.beginPath();
    let on = false;
    pts.forEach((y, i) => { const x = i * step - step, wx = cam.x + x / cam.k; const keep = this.n(wx * 0.012 + t * 0.15) > 0.34; if (keep) { if (!on) g.moveTo(x, y); else g.lineTo(x, y); } on = keep; });
    g.stroke();
    // whitecaps at crests
    g.fillStyle = g.strokeStyle as string; g.globalAlpha = 0.75;
    for (let i = 2; i < pts.length - 2; i++) if (pts[i] < pts[i - 2] && pts[i] <= pts[i + 2] && pts[i] < this.sy(cam, BASE - 18)) {
      const x = i * step - step; for (let j = 0; j < 5; j++) { g.beginPath(); g.arc(x + (j - 2) * 7 * cam.k + Math.sin(t * 3 + j) * 2, pts[i] + 2 + Math.abs(j - 2) * 2 * cam.k, (2.6 - Math.abs(j - 2) * 0.5) * cam.k, 0, 7); g.fill(); }
    }
    g.globalAlpha = 1;
    return pts;
  }

  /** reef breaking through a crest. Drawn in front of the water; the part below the surface is tinted by the sea. */
  rock(g: G, cam: Cam, surf: Surface, o: { x: number; w: number; top: number }, t: number) {
    const ink = this.ink, k = cam.k, cx = o.x + o.w / 2, half = o.w / 2 + 44;
    const x0 = this.sx(cam, cx - half), x1 = this.sx(cam, cx + half); if (x1 < -40 || x0 > cam.W + 40) return;
    const n = 16, pts: [number, number][] = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n * 2 - 1, wx = cx + u * half, a = Math.abs(u);
      const spike = (i % 3 === 1 ? -9 : i % 3 === 2 ? 2 : -3) * (1 - a) + (this.n(o.x * 0.1 + i * 1.7) - 0.5) * 10 * (1 - a * 0.5);
      pts.push([this.sx(cam, wx), this.sy(cam, o.top - 4 + (BASE + 120 - o.top) * Math.pow(a, 1.25) + spike)]);
    }
    const ty = this.sy(cam, o.top - 10);
    const gr = g.createLinearGradient(x0, ty, x1, ty + 90 * k); gr.addColorStop(0, ink.rockLit); gr.addColorStop(0.28, mix(ink.rock, ink.rockLit, 0.35)); gr.addColorStop(0.6, ink.rock); gr.addColorStop(1, ink.rock);
    const body = new Path2D(); body.moveTo(pts[0][0], cam.H + 4); for (const [x, y] of pts) body.lineTo(x, y); body.lineTo(pts[n][0], cam.H + 4); body.closePath();
    g.fillStyle = gr; g.fill(body);
    g.save(); g.clip(body);
    g.strokeStyle = hexA(ink.rockLit, 0.35); g.lineWidth = 1.4 * k; g.beginPath();
    for (let j = 0; j < 5; j++) { const fx = x0 + (x1 - x0) * (0.2 + j * 0.15); g.moveTo(fx, ty + 6 * k); g.lineTo(fx + (j % 2 ? 8 : -6) * k, ty + 40 * k); g.lineTo(fx + 2 * k, ty + 80 * k); }
    g.stroke();
    // water in front of the submerged part
    const wl = new Path2D(); let first = true;
    for (let x = x0 - 4; x <= x1 + 4; x += 5) { const wx = cam.x + x / k, y = this.sy(cam, surf.y(wx) + ripple(wx, t)); if (first) { wl.moveTo(x, y); first = false; } else wl.lineTo(x, y); }
    wl.lineTo(x1 + 4, cam.H + 4); wl.lineTo(x0 - 4, cam.H + 4); wl.closePath();
    g.fillStyle = hexA(ink.sea, 0.62); g.fill(wl);
    g.restore();
    g.strokeStyle = ink.rockLit; g.lineWidth = 2.2 * k; g.globalAlpha = 0.85; g.beginPath();
    for (let i = 0; i <= n * 0.6; i++) i ? g.lineTo(pts[i][0], pts[i][1]) : g.moveTo(pts[i][0], pts[i][1]);
    g.stroke(); g.globalAlpha = 1;
    g.fillStyle = ink.foam;
    for (let i = 0; i < 12; i++) { const wx = cx - half * 0.9 + (half * 1.8 * i) / 11, y = this.sy(cam, surf.y(wx)), r = (2.4 + 1.8 * Math.sin(t * 6 + i * 1.3)) * k; g.globalAlpha = 0.85; g.beginPath(); g.arc(this.sx(cam, wx), y, Math.max(0.8, r), 0, 7); g.fill(); }
    g.globalAlpha = 1;
  }

  /** a natural rock arch. 'back' draws the legs behind the boat, 'front' the bridge over it. */
  arch(g: G, cam: Cam, o: { x: number; w: number; bottom: number }, t: number, layer: 'back' | 'front') {
    const ink = this.ink, k = cam.k, L = o.x - 120, R = o.x + o.w + 120, thick = 64;
    if (this.sx(cam, R) < -40 || this.sx(cam, L) > cam.W + 40) return;
    if (layer === 'back') {
      for (const [a, b] of [[L, o.x - 20], [o.x + o.w + 20, R]]) {
        const top = o.bottom - thick + 6, lg = g.createLinearGradient(this.sx(cam, a), 0, this.sx(cam, b), 0);
        lg.addColorStop(0, mix(ink.rock, ink.rockLit, 0.3)); lg.addColorStop(0.5, mix(ink.rock, ink.mid, 0.35)); lg.addColorStop(1, ink.rock);
        g.fillStyle = lg; g.beginPath(); g.moveTo(this.sx(cam, a + 10), this.sy(cam, top));
        for (let i = 1; i <= 7; i++) g.lineTo(this.sx(cam, a + 10 + (this.n(a * 0.01 + i) - 0.5) * 26 - i * 7), this.sy(cam, top + i * 40));
        for (let i = 7; i >= 0; i--) g.lineTo(this.sx(cam, b - 10 + (this.n(b * 0.01 + i) - 0.5) * 26 + i * 8), this.sy(cam, top + i * 40));
        g.closePath(); g.fill();
        g.strokeStyle = hexA(ink.rockLit, 0.3); g.lineWidth = 1.5 * k; g.beginPath();
        for (let j = 1; j < 6; j++) { const y = this.sy(cam, top + j * 34); g.moveTo(this.sx(cam, a + 14 - j * 5), y); g.lineTo(this.sx(cam, (a + b) / 2 + Math.sin(j) * 8), y + 4 * k); }
        g.stroke();
      }
      return;
    }
    const n = 28, under: [number, number][] = [], over: [number, number][] = [];
    for (let i = 0; i <= n; i++) {
      const wx = L + (R - L) * (i / n), e = Math.min(wx - o.x, o.x + o.w - wx);
      const sag = e < 0 ? -Math.min(30, -e * 0.25) : -Math.max(0, 22 - e) * 1.2;
      const jag = (this.n(o.x * 0.07 + i * 0.9) - 0.5) * 12;
      under.push([this.sx(cam, wx), this.sy(cam, o.bottom + sag - Math.abs(jag) * 0.5)]);
      over.push([this.sx(cam, wx), this.sy(cam, o.bottom - thick + sag * 0.6 - 14 * Math.sin((i / n) * Math.PI) + jag * 0.8)]);
    }
    const gr = g.createLinearGradient(0, over[n >> 1][1], 0, under[n >> 1][1]); gr.addColorStop(0, mix(ink.rock, ink.rockLit, 0.6)); gr.addColorStop(0.3, mix(ink.rock, ink.rockLit, 0.25)); gr.addColorStop(1, mix(ink.rock, ink.rockLit, 0.12));
    g.fillStyle = gr; g.beginPath(); over.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); for (let i = n; i >= 0; i--) g.lineTo(under[i][0], under[i][1]); g.closePath(); g.fill();
    g.strokeStyle = ink.rockLit; g.globalAlpha = 0.75; g.lineWidth = 2.2 * k; g.beginPath(); over.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
    g.globalAlpha = 0.35; g.lineWidth = 1.5 * k; g.beginPath(); under.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
    g.globalAlpha = 0.9; g.strokeStyle = mix(ink.rock, ink.seaLight, 0.5); g.lineWidth = 2 * k; g.beginPath();
    for (let i = 8; i < n - 7; i += 2) { const [x, y] = under[i], l = (9 + this.n(i * 3.3 + o.x) * 16) * k; g.moveTo(x, y - 2); g.quadraticCurveTo(x + Math.sin(t * 1.6 + i) * 4 * k, y + l * 0.6, x + Math.sin(t * 1.2 + i) * 3 * k, y + l); }
    for (let i = 2; i < n - 1; i += 3) { const [x, y] = over[i]; g.moveTo(x, y + 1); g.lineTo(x - 3 * k, y - 6 * k); g.moveTo(x + 2 * k, y + 1); g.lineTo(x + 4 * k, y - 7 * k); }
    g.stroke(); g.globalAlpha = 1;
  }

  whale(g: G, cam: Cam, surf: Surface, o: { x: number; w: number; used?: boolean; at?: number }, t: number, simT: number) {
    const ink = this.ink, cx = o.x + o.w / 2, x = this.sx(cam, cx); if (x < -200 || x > cam.W + 200) return;
    const k = cam.k, sy = this.sy(cam, surf.y(cx));
    let rise = 10 + 4 * Math.sin(t * 1.5), ang = 0;
    if (o.used && o.at !== undefined) { const a = simT - o.at; if (a < 1.6) { rise = 10 + Math.sin(Math.min(1, a / 1.4) * Math.PI) * 70; ang = -0.5 + a * 0.6; } else rise = -40; }
    g.save(); g.translate(x, sy - rise * k + 26 * k); g.rotate(ang); g.scale(k, k);
    g.fillStyle = mix(ink.rock, ink.sea, 0.35);
    g.beginPath(); g.ellipse(0, 0, 78, 26, 0, Math.PI, 0); g.quadraticCurveTo(70, 18, 0, 20); g.quadraticCurveTo(-70, 18, -78, 0); g.fill();
    g.beginPath(); g.moveTo(-70, -4); g.quadraticCurveTo(-100, -26, -112, -18); g.quadraticCurveTo(-96, -4, -116, 6); g.quadraticCurveTo(-92, 4, -72, 6); g.fill();
    g.fillStyle = mix(ink.rockLit, ink.foam, 0.3); g.globalAlpha = 0.5; g.beginPath(); g.ellipse(4, -18, 60, 7, 0, Math.PI, 0); g.fill(); g.globalAlpha = 1;
    g.fillStyle = ink.foam; g.beginPath(); g.arc(46, -6, 2.4, 0, 7); g.fill();
    g.restore();
    if (!o.used) { // spout hint
      g.globalCompositeOperation = 'lighter'; g.fillStyle = hexA(ink.foam, 0.35 + 0.25 * Math.sin(t * 3)); for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(x + 20 * k + Math.sin(t * 4 + i) * 3 * k, sy - (34 + i * 10) * k, (4 - i * 0.6) * k, 0, 7); g.fill(); } g.globalCompositeOperation = 'source-over';
    }
  }

  ring(g: G, cam: Cam, o: { x: number; y: number; got?: boolean }, t: number) {
    if (o.got) return; const x = this.sx(cam, o.x), y = this.sy(cam, o.y), k = cam.k; if (x < -60 || x > cam.W + 60) return;
    const ink = this.ink, r = 28 * k;
    g.globalCompositeOperation = 'lighter';
    const gl = g.createRadialGradient(x, y, r * 0.6, x, y, r * 1.8); gl.addColorStop(0, hexA(ink.fly, 0)); gl.addColorStop(0.5, hexA(ink.fly, 0.22)); gl.addColorStop(1, hexA(ink.fly, 0));
    g.fillStyle = gl; g.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
    g.strokeStyle = hexA(ink.fly, 0.8); g.lineWidth = 2.2 * k; g.beginPath(); g.ellipse(x, y, r * 0.62, r, 0, 0, 7); g.stroke();
    g.fillStyle = ink.fly; for (let i = 0; i < 10; i++) { const a = t * 1.6 + (i / 10) * Math.PI * 2; g.beginPath(); g.arc(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r, 2.2 * k, 0, 7); g.fill(); }
    g.globalCompositeOperation = 'source-over';
  }

  flies(g: G, cam: Cam, lvl: Level, t: number) {
    const ink = this.ink, k = cam.k;
    g.globalCompositeOperation = 'lighter';
    for (const f of lvl.flies) {
      if (f.got) continue; const x = this.sx(cam, f.x); if (x < -20 || x > cam.W + 20) continue;
      const y = this.sy(cam, f.y + Math.sin(t * 2.4 + f.x * 0.05) * 3), p = 0.65 + 0.35 * Math.sin(t * 5 + f.x);
      g.globalAlpha = p; g.drawImage(this.glow(), x - 13 * k, y - 13 * k, 26 * k, 26 * k);
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }
  private glowTex: HTMLCanvasElement | null = null;
  /** firefly glow, painted once */
  glow() {
    if (this.glowTex) return this.glowTex;
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!;
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, hexA(this.ink.fly, 0.6)); gr.addColorStop(1, hexA(this.ink.fly, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); g.fillStyle = '#fffbe8'; g.beginPath(); g.arc(32, 32, 6, 0, 7); g.fill();
    return (this.glowTex = c);
  }

  harbour(g: G, cam: Cam, surf: Surface, endX: number, t: number, lantern: string) {
    const x = this.sx(cam, endX + 160); if (x > cam.W + 300 || x < -400) return;
    const ink = this.ink, k = cam.k, base = this.sy(cam, BASE - 10);
    // lighthouse on a rock
    g.fillStyle = ink.rock; g.beginPath(); g.moveTo(x - 90 * k, cam.H); g.lineTo(x - 70 * k, base - 10 * k); g.quadraticCurveTo(x + 10 * k, base - 40 * k, x + 120 * k, base - 6 * k); g.lineTo(x + 160 * k, cam.H); g.fill();
    g.fillStyle = ink.foam; g.beginPath(); g.moveTo(x - 14 * k, base - 30 * k); g.lineTo(x - 10 * k, base - 190 * k); g.lineTo(x + 10 * k, base - 190 * k); g.lineTo(x + 14 * k, base - 30 * k); g.fill();
    g.fillStyle = mix(ink.lantern, '#ff3b2f', 0.4); for (let i = 0; i < 3; i++) g.fillRect(x - (13 - i * 1.2) * k, base - (60 + i * 46) * k, (26 - i * 2.4) * k, 16 * k);
    g.fillStyle = ink.rock; g.fillRect(x - 15 * k, base - 216 * k, 30 * k, 28 * k); g.beginPath(); g.moveTo(x - 18 * k, base - 216 * k); g.lineTo(x, base - 236 * k); g.lineTo(x + 18 * k, base - 216 * k); g.fill();
    g.globalCompositeOperation = 'lighter';
    const ly = base - 202 * k; const beamA = t * 0.9;
    for (const s of [1, -1]) { const a = beamA + (s < 0 ? Math.PI : 0), len = 900 * k; const bg = g.createLinearGradient(x, ly, x + Math.cos(a) * len, ly + Math.sin(a) * len * 0.25); bg.addColorStop(0, hexA(ink.windows, 0.4)); bg.addColorStop(1, hexA(ink.windows, 0));
      g.fillStyle = bg; g.beginPath(); g.moveTo(x, ly); g.lineTo(x + Math.cos(a) * len, ly + Math.sin(a) * len * 0.25 - 50 * k); g.lineTo(x + Math.cos(a) * len, ly + Math.sin(a) * len * 0.25 + 50 * k); g.closePath(); g.fill(); }
    const lg = g.createRadialGradient(x, ly, 0, x, ly, 60 * k); lg.addColorStop(0, hexA('#fff3c0', 0.95)); lg.addColorStop(1, hexA(ink.windows, 0)); g.fillStyle = lg; g.fillRect(x - 60 * k, ly - 60 * k, 120 * k, 120 * k);
    g.globalCompositeOperation = 'source-over';
    // pier with a string of lanterns
    const py = this.sy(cam, surf.y(endX - 40)) - 22 * k;
    g.fillStyle = ink.rock; g.fillRect(x - 380 * k, py, 300 * k, 7 * k); for (let i = 0; i < 7; i++) g.fillRect(x - (376 - i * 48) * k, py, 6 * k, cam.H - py);
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 8; i++) { const lx = x - (370 - i * 40) * k, lyy = py - 30 * k + Math.sin(i * 0.8) * 6 * k; const gg = g.createRadialGradient(lx, lyy, 0, lx, lyy, 14 * k); gg.addColorStop(0, hexA(lantern, 0.9)); gg.addColorStop(1, hexA(lantern, 0)); g.fillStyle = gg; g.fillRect(lx - 14 * k, lyy - 14 * k, 28 * k, 28 * k); }
    g.globalCompositeOperation = 'source-over';
  }

  storm(g: G, cam: Cam, sx: number, t: number, near: number) {
    if (sx < -260) return;
    const { H } = cam, ink = this.ink;
    const edge = (y: number) => sx + Math.sin(y * 0.02 + t * 2.1) * 26 * cam.k + Math.sin(y * 0.051 - t * 3.3) * 14 * cam.k;
    const gr = g.createLinearGradient(sx - 280 * cam.k, 0, sx + 40 * cam.k, 0); gr.addColorStop(0, hexA('#020406', 0.97)); gr.addColorStop(0.75, hexA('#05080d', 0.85)); gr.addColorStop(1, hexA('#05080d', 0));
    g.fillStyle = gr; g.beginPath(); g.moveTo(-10, -10); for (let y = -10; y <= H + 10; y += 14) g.lineTo(edge(y), y); g.lineTo(-10, H + 10); g.closePath(); g.fill();
    // rain sheets
    g.strokeStyle = hexA(ink.foam, 0.22); g.lineWidth = 1.2; g.beginPath();
    for (let i = 0; i < 70; i++) { const x = sx + 60 * cam.k - ((i * 37.7) % (sx + 380)), y = ((i * 91.3 + t * 900) % (H + 60)) - 30; if (x > sx + 70 * cam.k) continue; g.moveTo(x, y); g.lineTo(x - 7, y + 22); }
    g.stroke();
    if (near > 0.5 && Math.sin(t * 7.3) > 0.985) { g.fillStyle = hexA('#dfe9ff', 0.25); g.fillRect(0, 0, sx + 40, H); }
  }

  boat(g: G, x: number, y: number, ang: number, k: number, kind: string, lantern: string, t: number, alpha = 1, squash = 0) {
    const ink = this.ink;
    g.save(); g.translate(x, y + 2 * k); g.rotate(ang); g.scale(k * 1.2, k * 1.2 * (1 - squash * 0.12)); g.globalAlpha = alpha;
    const flick = 0.85 + 0.15 * Math.sin(t * 11) * Math.sin(t * 6.7);
    const hullA = kind === 'swan' ? '#fff8f0' : kind === 'reed' ? '#d9b47a' : kind === 'swift' ? '#f3ece0' : ink.foam;
    const hullB = kind === 'reed' ? '#8f6a3a' : '#b9b3c9';
    // hull
    g.fillStyle = hullB; g.beginPath(); g.moveTo(-22, -6); g.lineTo(22, -6); g.lineTo(12, 7); g.lineTo(-12, 7); g.closePath(); g.fill();
    g.fillStyle = hullA; g.beginPath(); g.moveTo(-22, -6); g.lineTo(22, -6); g.lineTo(14, 2); g.lineTo(-14, 2); g.closePath(); g.fill();
    if (kind === 'swan') { g.strokeStyle = hullA; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(18, -6); g.quadraticCurveTo(30, -18, 22, -28); g.stroke(); g.fillStyle = '#ff9a3c'; g.beginPath(); g.moveTo(22, -29); g.lineTo(29, -27); g.lineTo(22, -25); g.fill(); }
    if (kind === 'reed') { g.strokeStyle = '#6b4a22'; g.lineWidth = 1; g.beginPath(); for (const px of [-12, -4, 4, 12]) { g.moveTo(px, -6); g.lineTo(px * 0.7, 7); } g.stroke(); }
    // sail (paper fold)
    if (kind !== 'reed') {
      g.fillStyle = hullA; g.beginPath(); g.moveTo(-11, -6); g.lineTo(0, -22); g.lineTo(11, -6); g.closePath(); g.fill();
      g.fillStyle = 'rgba(60,50,90,.25)'; g.beginPath(); g.moveTo(0, -22); g.lineTo(11, -6); g.lineTo(0, -6); g.closePath(); g.fill();
    }
    // mast and lantern
    g.strokeStyle = '#2a2238'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-4, -6); g.lineTo(-4, -34); g.stroke();
    g.globalCompositeOperation = 'lighter';
    const lg = g.createRadialGradient(-4, -38, 0, -4, -38, 26); lg.addColorStop(0, hexA(lantern, 0.75 * flick)); lg.addColorStop(0.35, hexA(lantern, 0.25 * flick)); lg.addColorStop(1, hexA(lantern, 0));
    g.fillStyle = lg; g.fillRect(-32, -66, 56, 56);
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#2a2238'; g.fillRect(-9, -46, 10, 2.5); g.fillRect(-9, -31, 10, 2.5);
    g.fillStyle = lantern; g.fillRect(-8, -44, 8, 13);
    g.fillStyle = '#fff6d8'; g.beginPath(); g.ellipse(-4, -37 - flick, 2, 3.4 * flick, 0, 0, 7); g.fill();
    g.restore();
  }

  particles(g: G, cam: Cam, fx: Fx) {
    for (const p of fx.ps) {
      const x = this.sx(cam, p.x), y = this.sy(cam, p.y); if (x < -30 || x > cam.W + 30) continue;
      const a = Math.max(0, p.life / p.max);
      if (p.add) g.globalCompositeOperation = 'lighter';
      if (p.kind === 'ring') { g.strokeStyle = hexA(p.c, a * 0.8); g.lineWidth = 2 * cam.k; g.beginPath(); g.ellipse(x, y, p.r * cam.k, p.r * cam.k * 0.3, 0, 0, 7); g.stroke(); }
      else { g.globalAlpha = a; g.fillStyle = p.c; g.beginPath(); g.arc(x, y, p.r * cam.k, 0, 7); g.fill(); g.globalAlpha = 1; }
      g.globalCompositeOperation = 'source-over';
    }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const p of fx.pops) {
      const x = this.sx(cam, p.x), y = this.sy(cam, p.y) - (1 - p.life) * 40 * cam.k, s = p.size * cam.k * (p.life > 0.85 ? 1 + (p.life - 0.85) * 3 : 1);
      g.globalAlpha = Math.min(1, p.life * 2.5); g.font = `${s.toFixed(1)}px Shrikhand, Georgia, serif`;
      g.lineJoin = 'round'; g.lineWidth = s * 0.22; g.strokeStyle = 'rgba(8,10,30,.85)'; g.strokeText(p.s, x, y); g.fillStyle = p.c; g.fillText(p.s, x, y);
    }
    g.globalAlpha = 1;
  }

  grain(g: G, cam: Cam) { if (this.paper) { g.fillStyle = this.paper; g.globalCompositeOperation = 'overlay'; g.fillRect(0, 0, cam.W, cam.H); g.globalCompositeOperation = 'source-over'; } }
}

export function ripple(x: number, t: number) { return 1.6 * Math.sin(x * 0.045 + t * 2.1) + 1.1 * Math.sin(x * 0.11 - t * 2.9); }
export function hexA(hex: string, a: number) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a)).toFixed(3)})`; }
export function mix(a: string, b: string, t: number) {
  const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16), m = (s: number) => Math.round(((x >> s) & 255) * (1 - t) + ((y >> s) & 255) * t);
  return '#' + ((1 << 24) + (m(16) << 16) + (m(8) << 8) + m(0)).toString(16).slice(1);
}
