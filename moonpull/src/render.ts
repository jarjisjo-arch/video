import { Sim } from './sim/sim';
import { SEA, VH } from './sim/types';
import { Ink } from './palettes';
import { mulberry } from './sim/rng';

export interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; c: string; g: number }
export interface Fx { particles: Particle[]; shake: number; flash: number; texts: { x: number; y: number; s: string; life: number; c: string }[] }
export const newFx = (): Fx => ({ particles: [], shake: 0, flash: 0, texts: [] });

// cheap 1D value noise for coastline silhouettes
function vnoise(x: number, seed: number) {
  const i = Math.floor(x), f = x - i;
  const h = (n: number) => { const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return s - Math.floor(s); };
  const u = f * f * (3 - 2 * f);
  return h(i) * (1 - u) + h(i + 1) * u;
}

let grain: HTMLCanvasElement | null = null;
function grainTex(): HTMLCanvasElement {
  if (grain) return grain;
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d')!; const d = g.createImageData(256, 256); const r = mulberry(5);
  for (let i = 0; i < d.data.length; i += 4) {
    const v = r(); const on = v > 0.8;
    d.data[i] = 239; d.data[i + 1] = 230; d.data[i + 2] = 210; d.data[i + 3] = on ? 9 + r() * 15 : 0;
  }
  g.putImageData(d, 0, 0); grain = c; return c;
}

const starCache: { x: number; y: number; r: number; p: number }[] = [];
(() => { const r = mulberry(77); for (let i = 0; i < 70; i++) starCache.push({ x: r(), y: r() * 0.55, r: 0.5 + r() * 1.2, p: r() * 6 }); })();

export function drawBoat(g: CanvasRenderingContext2D, kind: string, x: number, y: number, ang: number, ink: Ink, lantern: string, alpha = 1, t = 0) {
  g.save(); g.translate(x, y + 2); g.rotate(ang); g.globalAlpha = alpha;
  const flick = 0.85 + 0.15 * Math.sin(t * 9) * Math.sin(t * 5.3);
  // lantern
  g.strokeStyle = ink.rock; g.lineWidth = 1.6; g.beginPath(); g.moveTo(0, -4); g.lineTo(0, -24); g.stroke();
  g.fillStyle = lantern; g.globalAlpha = alpha * 0.16 * flick; g.beginPath(); g.arc(0, -27, 15, 0, 7); g.fill();
  g.globalAlpha = alpha * 0.3 * flick; g.beginPath(); g.arc(0, -27, 9, 0, 7); g.fill();
  g.globalAlpha = alpha; g.beginPath(); g.roundRect(-3.5, -32, 7, 10, 2); g.fill();
  g.fillStyle = ink.paper;
  if (kind === 'raft') {
    g.fillStyle = ink.sand; g.beginPath(); g.roundRect(-20, -5, 40, 5, 2); g.fill();
    g.fillStyle = ink.paper; g.beginPath(); g.roundRect(-18, 0, 36, 5, 2); g.fill();
    g.strokeStyle = ink.rock; g.lineWidth = 1; g.beginPath(); for (const px of [-10, 0, 10]) { g.moveTo(px, -5); g.lineTo(px, 5); } g.stroke();
  } else if (kind === 'skiff') {
    g.beginPath(); g.moveTo(-20, -4); g.lineTo(24, -5); g.lineTo(13, 5); g.lineTo(-14, 5); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(-2, -5); g.lineTo(-2, -22); g.lineTo(-16, -5); g.closePath(); g.fill();
    g.fillStyle = lantern; g.beginPath(); g.moveTo(-20, -4); g.lineTo(-10, -4); g.lineTo(-14, 5); g.closePath(); g.fill();
  } else {
    g.beginPath(); g.moveTo(-19, -5); g.lineTo(19, -5); g.lineTo(11, 6); g.lineTo(-11, 6); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(-9, -5); g.lineTo(0, -17); g.lineTo(9, -5); g.closePath(); g.fill();
    g.fillStyle = 'rgba(0,0,0,.14)'; g.beginPath(); g.moveTo(0, -17); g.lineTo(9, -5); g.lineTo(0, -5); g.closePath(); g.fill();
  }
  g.restore();
}

export function drawMoon(g: CanvasRenderingContext2D, x: number, y: number, r: number, ink: Ink, dim = false, phase = 1) {
  g.fillStyle = ink.moon;
  g.globalAlpha = dim ? 0.05 : 0.1; g.beginPath(); g.arc(x, y, r * 1.9, 0, 7); g.fill();
  g.globalAlpha = dim ? 0.08 : 0.16; g.beginPath(); g.arc(x, y, r * 1.45, 0, 7); g.fill();
  g.globalAlpha = dim ? 0.45 : 1; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  g.fillStyle = ink.sky; g.globalAlpha = dim ? 0.1 : 0.16;
  g.beginPath(); g.arc(x - r * 0.33, y - r * 0.25, r * 0.17, 0, 7); g.fill();
  g.beginPath(); g.arc(x + r * 0.3, y + r * 0.34, r * 0.25, 0, 7); g.fill();
  g.beginPath(); g.arc(x + r * 0.2, y - r * 0.45, r * 0.1, 0, 7); g.fill();
  if (phase < 0.99) { // waning: shade one limb
    g.globalAlpha = 0.5; g.beginPath(); g.arc(x, y, r, -Math.PI / 2, Math.PI / 2); const k = (phase - 0.5) * 2;
    g.ellipse(x, y, Math.abs(k) * r, r, 0, Math.PI / 2, -Math.PI / 2, k > 0); g.fill();
  }
  g.globalAlpha = 1;
}

export interface View { w: number; h: number; scale: number; vw: number }

export function render(g: CanvasRenderingContext2D, view: View, sim: Sim, ink: Ink, o: { boatKind: string; lantern: string; fx: Fx; time: number; ghost?: number[]; contrast: boolean; hideMoonUi?: boolean }) {
  const { scale, vw } = view, t = o.time, b = sim.boat, lvl = sim.level;
  g.setTransform(scale, 0, 0, scale, 0, 0);
  const shx = o.fx.shake > 0 ? (Math.sin(t * 90) * o.fx.shake * 5) : 0, shy = o.fx.shake > 0 ? Math.cos(t * 77) * o.fx.shake * 4 : 0;
  const cam = sim.camX + shx;
  // sky
  const sg = g.createLinearGradient(0, 0, 0, SEA); sg.addColorStop(0, ink.sky); sg.addColorStop(1, ink.sky2);
  g.fillStyle = sg; g.fillRect(0, 0, vw, VH);
  g.fillStyle = ink.star;
  for (const s of starCache) {
    const sx = ((s.x * 1400 - cam * 0.03) % 1400 + 1400) % 1400; if (sx > vw) continue;
    g.globalAlpha = 0.35 + 0.35 * Math.sin(t * 1.3 + s.p); g.beginPath(); g.arc(sx, s.y * VH, s.r, 0, 7); g.fill();
  }
  g.globalAlpha = 1;
  g.save(); g.translate(0, shy);
  // far coast, two parallax layers
  // horizon glow
  const hg = g.createLinearGradient(0, 150, 0, SEA); hg.addColorStop(0, 'rgba(0,0,0,0)'); hg.addColorStop(1, ink.back);
  g.globalAlpha = 0.28; g.fillStyle = hg; g.fillRect(0, 150, vw, SEA - 150); g.globalAlpha = 1;
  for (let L = 0; L < 2; L++) {
    const par = L ? 0.3 : 0.12, base = L ? 236 : 214, amp = L ? 44 : 70, f = L ? 0.006 : 0.0035;
    g.fillStyle = L ? ink.hill2 : ink.hill; g.beginPath(); g.moveTo(0, VH);
    for (let x = 0; x <= vw + 12; x += 12) {
      const wx = x + cam * par;
      const y = base - amp * (vnoise(wx * f, 3 + L * 9 + lvl.coast * 5) * 0.75 + vnoise(wx * f * 3.1, 8 + L) * 0.25) + 14;
      g.lineTo(x, y);
    }
    g.lineTo(vw + 12, VH); g.closePath(); g.fill();
    if (L === 0) { // far village lights
      g.fillStyle = ink.moon;
      for (let k = Math.floor((cam * par) / 90); k < (cam * par + vw) / 90 + 1; k++) {
        if (vnoise(k * 7.3, 31 + lvl.coast) < 0.7) continue;
        const wx = k * 90 + vnoise(k, 5) * 60, x = wx - cam * par;
        const y = base - amp * (vnoise(wx * f, 3 + lvl.coast * 5) * 0.75 + vnoise(wx * f * 3.1, 8) * 0.25) + 14;
        g.globalAlpha = 0.5 + 0.3 * Math.sin(t * 2 + k); g.fillRect(x, y + 8, 2, 2); g.fillRect(x + 7, y + 12, 2, 2);
      }
      g.globalAlpha = 1;
    }
  }
  // moon (drawn before clouds so cloud cover reads)
  const mx = sim.moonX - cam, my = sim.moonY;
  drawMoon(g, mx, my, 21, ink, sim.moonDim, lvl.pull >= 0.99 ? 1 : lvl.pull >= 0.9 ? 0.86 : lvl.pull >= 0.85 ? 0.74 : 0.64);

  // clouds
  for (const ob of lvl.obs) {
    if (ob.t !== 'cloud') continue; const x0 = ob.x - cam, x1 = x0 + ob.w; if (x1 < -80 || x0 > vw + 80) continue;
    g.fillStyle = ink.cloud; g.globalAlpha = 0.9;
    const cy = (ob.y0 + ob.y1) / 2, hh = (ob.y1 - ob.y0) / 2;
    g.beginPath();
    const n = Math.ceil(ob.w / 54);
    for (let i = 0; i <= n; i++) {
      const px = x0 + (ob.w * i) / n, e = Math.sin((i / n) * Math.PI), rr = hh * (0.45 + 0.55 * e) * (0.8 + 0.3 * vnoise(i * 1.7 + ob.x, 4));
      const dy = Math.sin(t * 0.4 + i) * 2;
      g.moveTo(px + rr * 1.3, cy + dy); g.ellipse(px, cy + dy, rr * 1.3, rr, 0, 0, 7);
    }
    g.fill(); g.globalAlpha = 1;
  }

  // back wave
  g.fillStyle = ink.back; g.beginPath(); g.moveTo(0, VH);
  for (let x = 0; x <= vw + 8; x += 8) {
    const wx = x + cam;
    const y = SEA - 12 + (sim.surface(wx + 26) - SEA) * 0.62 + 3 * Math.sin(wx * 0.03 + t * 0.9) + 2 * Math.sin(wx * 0.071 - t * 1.4);
    g.lineTo(x, y);
  }
  g.lineTo(vw + 8, VH); g.closePath(); g.fill();

  // harbour at the finish
  if (isFinite(lvl.length)) {
    const hx = lvl.length - cam + 30;
    if (hx < vw + 200) {
      g.fillStyle = ink.rock; g.fillRect(hx, 150, 10, 220); g.fillRect(hx - 60, 236, 200, 8);
      for (let i = 0; i < 4; i++) g.fillRect(hx - 50 + i * 45, 240, 6, 130);
      g.beginPath(); g.moveTo(hx - 6, 150); g.lineTo(hx + 16, 150); g.lineTo(hx + 5, 132); g.closePath(); g.fill();
      g.fillStyle = o.lantern; g.globalAlpha = 0.25 + 0.1 * Math.sin(t * 3); g.beginPath(); g.arc(hx + 5, 160, 26, 0, 7); g.fill();
      g.globalAlpha = 1; g.fillRect(hx - 1, 152, 12, 14);
    }
  }

  // rocks: reefs, bars, overhangs. Drawn once behind the water and again faintly over it so submerged rock still reads.
  const rocks = (pass: number) => {
  g.globalAlpha = pass ? 0.42 : 1;
  for (const ob of lvl.obs) {
    const x0 = ob.x - cam, x1 = x0 + ob.w; if (x1 < -40 || x0 > vw + 40) continue;
    if (pass && ob.t === 'over') continue;
    if (ob.t === 'reef') {
      g.fillStyle = ink.rock; g.beginPath(); g.moveTo(x0, VH + 4);
      const n = 12;
      for (let i = 0; i <= n; i++) {
        const u = i / n, r = Math.abs(u - 0.5) * 2;
        const y = ob.top + (360 - ob.top) * Math.pow(r, 1.6) + (i > 0 && i < n && i !== n / 2 ? (vnoise(ob.x + i * 3.3, 2) - 0.5) * 9 : 0);
        g.lineTo(x0 + u * ob.w, Math.max(ob.top, y));
      }
      g.lineTo(x1, VH + 4); g.closePath(); g.fill();
      if (o.contrast || pass) { g.strokeStyle = ink.paper; g.lineWidth = 1.5; g.globalAlpha = o.contrast ? 1 : 0.3; g.stroke(); g.globalAlpha = pass ? 0.42 : 1; }
    } else if (ob.t === 'bar') {
      g.fillStyle = ink.sand; g.beginPath(); g.moveTo(x0 - 60, VH + 4);
      for (let x = 0; x <= ob.w; x += 10) {
        const edge = Math.min(x, ob.w - x); const y = ob.top + Math.max(0, 30 - edge) * 1.6 + (vnoise(ob.x + x * 0.05, 6) - 0.5) * 3;
        g.lineTo(x0 + x, y);
      }
      g.lineTo(x1 + 60, VH + 4); g.closePath(); g.fill();
      if (o.contrast || pass) { g.strokeStyle = ink.paper; g.lineWidth = 1.5; g.globalAlpha = o.contrast ? 1 : 0.3; g.stroke(); g.globalAlpha = pass ? 0.42 : 1; }
    } else if (ob.t === 'over') {
      g.fillStyle = ink.rock; g.beginPath(); g.moveTo(x0 - 26, -4);
      for (let x = -10; x <= ob.w + 10; x += 10) {
        const xx = Math.max(0, Math.min(ob.w, x)); const edge = Math.min(xx, ob.w - xx);
        const y = ob.bottom - Math.max(0, 16 - edge) * 0.8 - (vnoise(ob.x + x * 0.09, 12)) * 7 - (x < 0 || x > ob.w ? 40 : 0);
        g.lineTo(x0 + x, y);
      }
      g.lineTo(x1 + 26, -4); g.closePath(); g.fill();
      // hanging roots
      g.strokeStyle = ink.rock; g.lineWidth = 2; g.beginPath();
      for (let i = 1; i < 4; i++) { const px = x0 + (ob.w * i) / 4 + 8; g.moveTo(px, ob.bottom - 6); g.lineTo(px + Math.sin(t * 1.4 + i) * 2, ob.bottom + 1); }
      g.stroke();
      if (o.contrast) { g.strokeStyle = ink.paper; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x0, ob.bottom); g.lineTo(x1, ob.bottom); g.stroke(); }
    }
  }

  g.globalAlpha = 1;
  };
  rocks(0);

  // ghost of best run
  if (o.ghost && o.ghost.length > 4) {
    const gi = Math.floor(sim.t * 10) * 2;
    if (gi + 3 < o.ghost.length) {
      const a = (sim.t * 10) % 1; const gx = o.ghost[gi] * (1 - a) + o.ghost[gi + 2] * a, gy = o.ghost[gi + 1] * (1 - a) + o.ghost[gi + 3] * a;
      if (gx - cam > -30 && gx - cam < vw + 30) drawBoat(g, o.boatKind, gx - cam, gy, 0, ink, ink.paper, 0.28, t);
    }
  }

  // boat (behind front water edge slightly)
  const blink = b.inv > 0 ? (Math.sin(t * 30) > 0 ? 0.35 : 0.9) : 1;
  if (sim.done !== 'lose') drawBoat(g, o.boatKind, b.x - cam, b.y, b.ang, ink, o.lantern, blink, t);

  // front water
  const wg = g.createLinearGradient(0, SEA - 60, 0, VH); wg.addColorStop(0, ink.sea); wg.addColorStop(1, ink.deep);
  g.fillStyle = wg; g.globalAlpha = 0.84; g.beginPath(); g.moveTo(0, VH + 4);
  const pts: number[] = [];
  for (let x = 0; x <= vw + 6; x += 6) { const y = sim.surface(x + cam) + 1.2 * Math.sin((x + cam) * 0.09 + t * 2.2); pts.push(y); g.lineTo(x, y + 3); }
  g.lineTo(vw + 6, VH + 4); g.closePath(); g.fill(); g.globalAlpha = 1;
  rocks(1);
  // crest line
  g.strokeStyle = ink.paper; g.globalAlpha = 0.5; g.lineWidth = 1.6; g.beginPath();
  for (let i = 0; i < pts.length; i++) { const x = i * 6; if (vnoise((x + cam) * 0.02, 9) > 0.42) { if (i === 0) g.moveTo(x, pts[i] + 3); else g.lineTo(x, pts[i] + 3); } else g.moveTo(x, pts[i] + 3); }
  g.stroke();
  // moon reflection
  const ry = sim.surface(sim.moonX);
  g.strokeStyle = ink.moon; g.globalAlpha = sim.moonDim ? 0.2 : 0.6; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath();
  for (let i = 0; i < 3; i++) { const w = 20 - i * 6 + Math.sin(t * 2 + i) * 2; g.moveTo(mx - w, ry + 14 + i * 12); g.lineTo(mx + w, ry + 14 + i * 12); }
  g.stroke(); g.globalAlpha = 1;
  // drifting foam marks
  g.strokeStyle = ink.paper; g.lineWidth = 1.6; g.globalAlpha = 0.22; g.beginPath();
  for (let i = 0; i < 9; i++) {
    const wx = Math.floor(cam / 140) * 140 + i * 140 + vnoise(i + Math.floor(cam / 140), 21) * 90, x = wx - cam;
    const y = sim.surface(wx) + 34 + vnoise(wx * 0.01, 5) * 70;
    g.moveTo(x, y); g.quadraticCurveTo(x + 8, y - 5, x + 16, y);
  }
  g.stroke(); g.globalAlpha = 1;

  // surface features: riptide streaks and whirlpools
  for (const ob of lvl.obs) {
    const x0 = ob.x - cam; if (x0 > vw + 80 || x0 + ob.w < -80) continue;
    if (ob.t === 'rip') {
      g.strokeStyle = ink.paper; g.lineWidth = 2; g.globalAlpha = 0.55; g.beginPath();
      for (let wx = ob.x + 20; wx < ob.x + ob.w - 10; wx += 46) {
        const ph = ((t * 46) % 46); const x = wx - cam - ph, y = sim.surface(wx - ph) + 14 + ((wx / 46) % 2) * 9;
        if (wx - ph < ob.x) continue;
        g.moveTo(x + 16, y); g.lineTo(x, y); g.lineTo(x + 6, y - 4); g.moveTo(x, y); g.lineTo(x + 6, y + 4);
      }
      g.stroke(); g.globalAlpha = 1;
    } else if (ob.t === 'whirl') {
      const y = sim.surface(ob.x) + 6;
      g.fillStyle = ink.rock; g.globalAlpha = 0.35; g.beginPath(); g.ellipse(x0, y + 4, 40, 10, 0, 0, 7); g.fill();
      g.strokeStyle = ink.paper; g.lineWidth = 2.2; g.globalAlpha = 0.85;
      for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(x0, y + k * 4, 42 - k * 10, 9 - k * 2, 0, t * 5 + k * 1.7, t * 5 + k * 1.7 + 4.4); g.stroke(); }
      g.globalAlpha = 1;
    }
  }

  // fireflies
  for (const f of lvl.flies) {
    if (f.got) continue; const x = f.x - cam; if (x < -20 || x > vw + 20) continue;
    const bob = Math.sin(t * 2.2 + f.x * 0.05) * 3, pulse = 0.6 + 0.4 * Math.sin(t * 4 + f.x);
    g.fillStyle = ink.moon; g.globalAlpha = 0.18 * pulse; g.beginPath(); g.arc(x, f.y + bob, 8, 0, 7); g.fill();
    g.globalAlpha = 1; g.beginPath(); g.arc(x, f.y + bob, 2.8, 0, 7); g.fill();
    if (o.contrast) { g.strokeStyle = ink.rock; g.lineWidth = 1; g.stroke(); }
  }

  // particles
  for (const p of o.fx.particles) {
    g.globalAlpha = Math.max(0, p.life / p.max); g.fillStyle = p.c; g.beginPath(); g.arc(p.x - cam, p.y, p.r, 0, 7); g.fill();
  }
  g.globalAlpha = 1;
  g.textAlign = 'center';
  for (const tx of o.fx.texts) {
    g.globalAlpha = Math.min(1, tx.life * 2); g.fillStyle = tx.c; g.font = '600 24px Caveat, cursive'; g.fillText(tx.s, tx.x - cam, tx.y - (1 - tx.life) * 26);
  }
  g.globalAlpha = 1;
  // multiplier near boat
  if (sim.mult >= 2 && sim.done === 'no') {
    g.font = '600 30px Caveat, cursive'; g.fillStyle = o.lantern; g.textAlign = 'left';
    g.fillText('×' + Math.floor(sim.mult), b.x - cam + 24, b.y - 34);
    g.fillStyle = ink.paper; g.globalAlpha = 0.6; g.fillRect(b.x - cam + 24, b.y - 28, 26 * (sim.mult % 1), 2.5); g.globalAlpha = 1;
  }
  g.restore();

  if (o.fx.flash > 0) { g.fillStyle = ink.paper; g.globalAlpha = o.fx.flash * 0.35; g.fillRect(0, 0, vw, VH); g.globalAlpha = 1; }
  // paper grain
  g.setTransform(1, 0, 0, 1, 0, 0);
  const pat = g.createPattern(grainTex(), 'repeat'); if (pat) { g.fillStyle = pat; g.fillRect(0, 0, view.w, view.h); }
}

export function stepFx(fx: Fx, dt: number) {
  fx.shake = Math.max(0, fx.shake - dt * 2.6); fx.flash = Math.max(0, fx.flash - dt * 3);
  for (const p of fx.particles) { p.life -= dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  fx.particles = fx.particles.filter(p => p.life > 0);
  for (const tx of fx.texts) tx.life -= dt * 0.9;
  fx.texts = fx.texts.filter(x => x.life > 0);
}
export function burst(fx: Fx, x: number, y: number, n: number, c: string, sp: number, g = 300, r = 2.2) {
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = sp * (0.4 + Math.random() * 0.6); fx.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - sp * 0.4, life: 0.5 + Math.random() * 0.4, max: 0.9, r: r * (0.6 + Math.random() * 0.7), c, g }); }
}
