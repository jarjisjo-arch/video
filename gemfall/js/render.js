// Canvas renderer: board, gems, ice, stones, special-gem sprites, tweens and effects.
export const GEM_COLORS = ['#ff3b4d', '#ffb21a', '#2fd36a', '#2f8bff', '#b05cff', '#efe6ff'];

export const EASE = {
  linear: (t) => t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inQuad: (t) => t * t,
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outBounce: (t) => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
};

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function canvas(n) { const c = document.createElement('canvas'); c.width = c.height = n; return c; }

function starPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x, y, x + s, y); ctx.quadraticCurveTo(x, y, x, y + s);
  ctx.quadraticCurveTo(x, y, x - s, y); ctx.quadraticCurveTo(x, y, x, y - s); ctx.closePath();
}

export function buildSprites(img) {
  const S = 256;
  const streakH = [], streakV = [], burst = [];
  img.gems.forEach((gem) => {
    for (const vertical of [false, true]) {
      const c = canvas(S), x = c.getContext('2d');
      x.drawImage(gem, S * 0.06, S * 0.06, S * 0.88, S * 0.88);
      x.globalCompositeOperation = 'source-atop';
      x.save();
      if (vertical) { x.translate(S / 2, S / 2); x.rotate(Math.PI / 2); x.translate(-S / 2, -S / 2); }
      x.shadowColor = '#ffffff'; x.shadowBlur = 16;
      for (const k of [-1, 0, 1]) {
        x.fillStyle = 'rgba(255,255,255,0.88)';
        rr(x, S * 0.02, S / 2 + k * 50 - 10, S * 0.96, 20, 10); x.fill();
      }
      x.restore();
      x.globalCompositeOperation = 'source-over';
      x.save();
      if (vertical) { x.translate(S / 2, S / 2); x.rotate(Math.PI / 2); x.translate(-S / 2, -S / 2); }
      for (const side of [-1, 1]) {
        const tip = S / 2 + side * 124, base = S / 2 + side * 88;
        x.beginPath(); x.moveTo(tip, S / 2); x.lineTo(base, S / 2 - 30); x.lineTo(base, S / 2 + 30); x.closePath();
        const g = x.createLinearGradient(0, S / 2 - 30, 0, S / 2 + 30); g.addColorStop(0, '#fff3a8'); g.addColorStop(1, '#f0a10e');
        x.fillStyle = g; x.lineWidth = 6; x.strokeStyle = '#7a3e00'; x.lineJoin = 'round'; x.stroke(); x.fill();
      }
      x.restore();
      (vertical ? streakV : streakH).push(c);
    }
    const c = canvas(S), x = c.getContext('2d');
    const halo = x.createRadialGradient(S / 2, S / 2, S * 0.2, S / 2, S / 2, S * 0.5);
    halo.addColorStop(0, 'rgba(255,220,120,0.75)'); halo.addColorStop(1, 'rgba(255,200,80,0)');
    x.fillStyle = halo; x.fillRect(0, 0, S, S);
    x.drawImage(gem, S * 0.15, S * 0.15, S * 0.7, S * 0.7);
    const bands = [[S * 0.4, S * 0.4], [S * 0.12, S * 0.4], [S * 0.4, S * 0.12]];
    const gold = x.createLinearGradient(0, 0, S, S); gold.addColorStop(0, '#fff2a8'); gold.addColorStop(0.5, '#f2b22a'); gold.addColorStop(1, '#b8700a');
    for (const [w, lw, col] of [[22, 0, '#5a3000'], [13, 0, gold], [3, 0, 'rgba(255,255,255,0.7)']]) {
      x.lineWidth = w; x.strokeStyle = col;
      bands.forEach(([rx, ry]) => { x.beginPath(); x.ellipse(S / 2, S / 2, rx, ry, 0, 0, Math.PI * 2); x.stroke(); });
    }
    for (const yy of [S * 0.09, S * 0.91]) {
      x.beginPath(); x.arc(S / 2, yy, 15, 0, Math.PI * 2); x.fillStyle = gold; x.fill(); x.lineWidth = 4; x.strokeStyle = '#5a3000'; x.stroke();
    }
    burst.push(c);
  });
  const ice = [null, iceSprite(1), iceSprite(2)];
  return { streakH, streakV, burst, ice };
}

function iceSprite(layers) {
  const S = 128, c = canvas(S), x = c.getContext('2d');
  rr(x, 4, 4, S - 8, S - 8, 24);
  const g = x.createLinearGradient(0, 0, S, S);
  g.addColorStop(0, layers > 1 ? 'rgba(200,245,255,0.85)' : 'rgba(170,232,255,0.62)');
  g.addColorStop(1, layers > 1 ? 'rgba(110,150,255,0.75)' : 'rgba(120,160,255,0.42)');
  x.fillStyle = g; x.fill();
  x.lineWidth = layers > 1 ? 7 : 4; x.strokeStyle = layers > 1 ? 'rgba(255,255,255,0.95)' : 'rgba(225,248,255,0.8)'; x.stroke();
  x.strokeStyle = 'rgba(255,255,255,0.55)'; x.lineWidth = 5; x.lineCap = 'round';
  x.beginPath(); x.moveTo(24, 46); x.lineTo(46, 24); x.moveTo(24, 70); x.lineTo(70, 24); x.stroke();
  if (layers > 1) {
    x.strokeStyle = 'rgba(255,255,255,0.7)'; x.lineWidth = 3;
    x.beginPath(); x.moveTo(S - 20, S - 50); x.lineTo(S - 50, S - 20); x.moveTo(S - 20, S - 74); x.lineTo(S - 74, S - 20); x.stroke();
  }
  return c;
}

export class Renderer {
  constructor(cv, img) {
    this.cv = cv; this.ctx = cv.getContext('2d'); this.img = img;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.size = 320; this.R = 8; this.C = 8; this.cell = 40; this.ox = 0; this.oy = 0;
    this.game = null; this.tweens = []; this.parts = []; this.fx = []; this.texts = [];
    this.now = performance.now(); this.shakeAmp = 0; this.shakeEnd = 0; this.flash = 0;
    this.selected = null; this.hint = null; this.speed = 1;
    this.sprites = buildSprites(img);
    const loop = (t) => { this.frame(t); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  resize(px) {
    this.size = px;
    this.cv.style.width = px + 'px'; this.cv.style.height = px + 'px';
    this.cv.width = Math.round(px * this.dpr); this.cv.height = Math.round(px * this.dpr);
    this.layout();
  }
  setGame(g) {
    this.game = g; this.R = g.R; this.C = g.C;
    this.tweens.forEach((t) => t.res()); this.tweens = []; this.parts = []; this.fx = []; this.texts = [];
    this.selected = null; this.hint = null; this.flash = 0;
    this.layout();
  }
  layout() {
    this.cell = this.size / Math.max(this.R, this.C);
    this.ox = (this.size - this.cell * this.C) / 2; this.oy = (this.size - this.cell * this.R) / 2;
  }
  cellAt(px, py) {
    const c = Math.floor((px - this.ox) / this.cell), r = Math.floor((py - this.oy) / this.cell);
    if (r < 0 || c < 0 || r >= this.R || c >= this.C) return null;
    return { r, c };
  }
  center(r, c) { return { x: this.ox + (c + 0.5) * this.cell, y: this.oy + (r + 0.5) * this.cell }; }

  tween(obj, to, dur, ease = 'outQuad', delay = 0) {
    return new Promise((res) => {
      this.tweens.push({ obj, to, from: null, dur: Math.max(1, dur / this.speed), ease: EASE[ease] || EASE.outQuad, t0: this.now + delay / this.speed, res });
    });
  }
  wait(ms) { return this.tween({ v: 0 }, { v: 1 }, ms, 'linear'); }
  shake(amp, ms) { this.shakeAmp = Math.max(this.shakeAmp * (this.now < this.shakeEnd ? 1 : 0), amp); this.shakeEnd = this.now + ms; }

  // ---------- effects ----------
  beam(dir, index, colorIdx) { this.fx.push({ type: 'beam', dir, index, color: GEM_COLORS[colorIdx] || '#fff', t0: this.now, dur: 480 }); }
  ring(r, c, radiusCells, colorIdx, dur = 520) { const p = this.center(r, c); this.fx.push({ type: 'ring', x: p.x, y: p.y, rad: radiusCells * this.cell, color: GEM_COLORS[colorIdx] || '#ffd66b', t0: this.now, dur }); }
  bolt(r0, c0, r1, c1, colorIdx) { const a = this.center(r0, c0), b = this.center(r1, c1); this.fx.push({ type: 'bolt', a, b, color: GEM_COLORS[colorIdx] || '#fff', t0: this.now, dur: 520 }); }
  pop(r, c, colorIdx, n = 9) {
    const p = this.center(r, c), cs = this.cell, col = GEM_COLORS[colorIdx] || '#ddd';
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = (0.35 + Math.random() * 0.9) * cs * 6;
      this.parts.push({ k: 'shard', x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - cs * 3, g: cs * 26, life: 0, max: 0.55 + Math.random() * 0.35, s: cs * (0.08 + Math.random() * 0.08), col, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14 });
    }
    for (let i = 0; i < 3; i++) {
      const a = Math.random() * Math.PI * 2, sp = cs * (1 + Math.random() * 2);
      this.parts.push({ k: 'spark', x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0, life: 0, max: 0.45 + Math.random() * 0.3, s: cs * (0.14 + Math.random() * 0.12), col: '#fff', rot: 0, vr: 0 });
    }
  }
  dust(r, c) {
    const p = this.center(r, c), cs = this.cell;
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2, sp = cs * (2 + Math.random() * 4);
      this.parts.push({ k: 'shard', x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - cs * 2, g: cs * 22, life: 0, max: 0.5 + Math.random() * 0.4, s: cs * (0.07 + Math.random() * 0.09), col: i % 2 ? '#8c7e6e' : '#c9bba8', rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12 });
    }
  }
  iceShards(r, c) {
    const p = this.center(r, c), cs = this.cell;
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2, sp = cs * (2 + Math.random() * 3);
      this.parts.push({ k: 'shard', x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - cs * 2, g: cs * 20, life: 0, max: 0.5 + Math.random() * 0.3, s: cs * (0.06 + Math.random() * 0.07), col: i % 2 ? '#c9f2ff' : '#ffffff', rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12 });
    }
  }
  text(x, y, str, size, color = '#fff', dur = 900) { this.texts.push({ x, y, str, size, color, t0: this.now, dur }); }
  scoreText(r, c, n) { const p = this.center(r, c); this.text(p.x, p.y, String(n), this.cell * 0.5, '#fff6b0'); }

  // ---------- frame ----------
  frame(t) {
    const dt = Math.min(0.05, (t - this.now) / 1000);
    this.now = t;
    const keep = [];
    for (const tw of this.tweens) {
      if (t < tw.t0) { keep.push(tw); continue; }
      if (!tw.from) { tw.from = {}; for (const k in tw.to) tw.from[k] = tw.obj[k]; }
      const p = Math.min(1, (t - tw.t0) / tw.dur), e = tw.ease(p);
      for (const k in tw.to) tw.obj[k] = tw.from[k] + (tw.to[k] - tw.from[k]) * e;
      if (p >= 1) tw.res(); else keep.push(tw);
    }
    this.tweens = keep;
    for (const p of this.parts) { p.life += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.985; p.rot += p.vr * dt; }
    this.parts = this.parts.filter((p) => p.life < p.max);
    this.fx = this.fx.filter((f) => t - f.t0 < f.dur);
    this.texts = this.texts.filter((x) => t - x.t0 < x.dur);
    this.flash *= Math.pow(0.02, dt);
    this.draw();
  }

  draw() {
    const ctx = this.ctx, d = this.dpr, g = this.game, cs = this.cell, t = this.now;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.clearRect(0, 0, this.size, this.size);
    if (!g) return;
    if (t < this.shakeEnd) {
      const k = (this.shakeEnd - t) / 300;
      ctx.translate((Math.random() * 2 - 1) * this.shakeAmp * Math.min(1, k), (Math.random() * 2 - 1) * this.shakeAmp * Math.min(1, k));
    }
    // cells and ice
    for (let r = 0; r < this.R; r++) for (let c = 0; c < this.C; c++) {
      const cell = g.grid[r][c];
      if (!cell.playable) continue;
      const x = this.ox + c * cs, y = this.oy + r * cs;
      rr(ctx, x + 1.5, y + 1.5, cs - 3, cs - 3, cs * 0.2);
      ctx.fillStyle = (r + c) % 2 ? 'rgba(150,120,255,0.17)' : 'rgba(150,120,255,0.29)'; ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(x + cs * 0.2, y + 2, cs * 0.6, 1.5);
      if (cell.ice > 0) {
        ctx.save(); ctx.globalAlpha = cell.iceA ?? 1;
        ctx.drawImage(this.sprites.ice[Math.min(2, cell.ice)], x, y, cs, cs); ctx.restore();
      }
    }
    // selection
    if (this.selected) {
      const x = this.ox + this.selected.c * cs, y = this.oy + this.selected.r * cs;
      ctx.save(); ctx.shadowColor = '#ffd66b'; ctx.shadowBlur = 16; ctx.lineWidth = 3; ctx.strokeStyle = '#ffe9a0';
      rr(ctx, x + 2, y + 2, cs - 4, cs - 4, cs * 0.22); ctx.stroke(); ctx.restore();
    }
    // stones
    for (let r = 0; r < this.R; r++) for (let c = 0; c < this.C; c++) {
      const cell = g.grid[r][c];
      if (!cell.playable || cell.stone <= 0) continue;
      const x = this.ox + c * cs, y = this.oy + r * cs, sh = cell.shake || 0;
      const jx = sh ? (Math.random() - 0.5) * sh * cs * 0.2 : 0;
      ctx.drawImage(this.img.stone, x + cs * 0.02 + jx, y + cs * 0.02, cs * 0.96, cs * 0.96);
      if (cell.stone > 1) {
        ctx.save(); ctx.lineWidth = Math.max(2, cs * 0.08); ctx.strokeStyle = '#e7b23e'; ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 4;
        rr(ctx, x + cs * 0.1 + jx, y + cs * 0.1, cs * 0.8, cs * 0.8, cs * 0.16); ctx.stroke();
        ctx.fillStyle = '#ffe08a';
        for (const [a, b] of [[0.18, 0.18], [0.82, 0.18], [0.18, 0.82], [0.82, 0.82]]) { ctx.beginPath(); ctx.arc(x + cs * a + jx, y + cs * b, cs * 0.06, 0, 7); ctx.fill(); }
        ctx.restore();
      }
    }
    // pieces (clipped to the board so spawning gems slide in from the top edge)
    ctx.save();
    ctx.beginPath(); ctx.rect(this.ox, this.oy, this.C * cs, this.R * cs); ctx.clip();
    const hint = this.hint, pulse = 1 + 0.09 * Math.sin(t / 110);
    for (let r = 0; r < this.R; r++) for (let c = 0; c < this.C; c++) {
      const p = g.grid[r][c].piece;
      if (p) this.drawPiece(p, hint && (hint[0] === p || hint[1] === p) ? pulse : 1);
    }
    for (const p of g.ghosts) this.drawPiece(p, 1);
    ctx.restore();
    // chest exits under the bottom row of each column
    if (g.chestGoal > 0) {
      const bob = Math.sin(t / 220) * cs * 0.04;
      for (let c = 0; c < this.C; c++) {
        let r = this.R - 1;
        while (r >= 0 && !g.grid[r][c].playable) r--;
        if (r < 0) continue;
        const x = this.ox + (c + 0.5) * cs, y = this.oy + (r + 1) * cs - cs * 0.06 + bob;
        ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = '#ffd66b'; ctx.strokeStyle = '#5a3000'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x - cs * 0.14, y - cs * 0.12); ctx.lineTo(x + cs * 0.14, y - cs * 0.12); ctx.lineTo(x, y + cs * 0.02); ctx.closePath();
        ctx.stroke(); ctx.fill(); ctx.restore();
      }
    }
    // effects
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const f of this.fx) {
      const p = (t - f.t0) / f.dur;
      if (f.type === 'beam') {
        const th = cs * (0.2 + 0.9 * Math.sin(Math.min(1, p) * Math.PI)), a = 1 - p;
        const len = (this.C * cs) * Math.min(1, p * 3);
        ctx.save();
        if (f.dir === 'h') { const y = this.oy + (f.index + 0.5) * cs; ctx.translate(this.ox + this.C * cs / 2, y); }
        else { const x = this.ox + (f.index + 0.5) * cs; ctx.translate(x, this.oy + this.R * cs / 2); ctx.rotate(Math.PI / 2); }
        const gr = ctx.createLinearGradient(0, -th, 0, th);
        gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.35, f.color); gr.addColorStop(0.5, '#ffffff'); gr.addColorStop(0.65, f.color); gr.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = a; ctx.fillStyle = gr; ctx.fillRect(-len / 2, -th, len, th * 2);
        ctx.restore();
      } else if (f.type === 'ring') {
        const e = EASE.outCubic(Math.min(1, p));
        ctx.globalAlpha = 1 - p; ctx.lineWidth = cs * 0.35 * (1 - p) + 1; ctx.strokeStyle = f.color;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.rad * e, 0, Math.PI * 2); ctx.stroke();
        if (p < 0.35) {
          const gl = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.rad * 0.8);
          gl.addColorStop(0, 'rgba(255,255,230,0.9)'); gl.addColorStop(1, 'rgba(255,200,80,0)');
          ctx.globalAlpha = 1 - p / 0.35; ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(f.x, f.y, f.rad * 0.8, 0, 7); ctx.fill();
        }
      } else if (f.type === 'bolt') {
        ctx.globalAlpha = 1 - p; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.shadowColor = f.color; ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.moveTo(f.a.x, f.a.y);
        for (let i = 1; i < 8; i++) { const k = i / 8; ctx.lineTo(f.a.x + (f.b.x - f.a.x) * k + (Math.random() - 0.5) * cs * 0.5, f.a.y + (f.b.y - f.a.y) * k + (Math.random() - 0.5) * cs * 0.5); }
        ctx.lineTo(f.b.x, f.b.y); ctx.stroke(); ctx.shadowBlur = 0;
      }
    }
    ctx.restore();
    // particles
    for (const p of this.parts) {
      const a = 1 - p.life / p.max;
      ctx.save(); ctx.globalAlpha = a; ctx.translate(p.x, p.y);
      if (p.k === 'spark') { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#fff'; starPath(ctx, 0, 0, p.s); ctx.fill(); }
      else {
        ctx.rotate(p.rot); ctx.fillStyle = p.col;
        ctx.beginPath(); ctx.moveTo(0, -p.s); ctx.lineTo(p.s * 0.7, 0); ctx.lineTo(0, p.s); ctx.lineTo(-p.s * 0.7, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.moveTo(0, -p.s); ctx.lineTo(p.s * 0.35, -p.s * 0.2); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    // floating texts
    for (const x of this.texts) {
      const p = (t - x.t0) / x.dur;
      ctx.save(); ctx.globalAlpha = p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4;
      ctx.font = `${x.size * (p < 0.15 ? 0.6 + p / 0.15 * 0.4 : 1)}px "Lilita One", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = Math.max(3, x.size * 0.18); ctx.strokeStyle = '#2a1060'; ctx.lineJoin = 'round';
      const y = x.y - p * this.cell * 0.9;
      ctx.strokeText(x.str, x.x, y); ctx.fillStyle = x.color; ctx.fillText(x.str, x.x, y);
      ctx.restore();
    }
    if (this.flash > 0.01) { ctx.fillStyle = `rgba(255,250,230,${this.flash * 0.6})`; ctx.fillRect(0, 0, this.size, this.size); }
  }

  drawPiece(p, extra) {
    if (p.alpha <= 0.01 || p.scale <= 0.01) return;
    const ctx = this.ctx, cs = this.cell;
    const x = this.ox + (p.x + 0.5) * cs, y = this.oy + (p.y + 0.5) * cs;
    const s = cs * 0.92 * p.scale * extra;
    const spr = this.spriteFor(p);
    ctx.save(); ctx.globalAlpha = p.alpha; ctx.translate(x, y);
    if (p.rot) ctx.rotate(p.rot);
    if (p.kind === 'prism') ctx.rotate(this.now / 900);
    if (p.primed) { ctx.shadowColor = '#ffd66b'; ctx.shadowBlur = 20; }
    ctx.drawImage(spr, -s / 2, -s / 2, s, s);
    if (p.flash > 0.01) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = p.alpha * p.flash; ctx.drawImage(spr, -s / 2, -s / 2, s, s); }
    ctx.restore();
  }
  spriteFor(p) {
    switch (p.kind) {
      case 'streakH': return this.sprites.streakH[p.color];
      case 'streakV': return this.sprites.streakV[p.color];
      case 'burst': return this.sprites.burst[p.color];
      case 'prism': return this.img.prism;
      case 'chest': return this.img.chest;
      default: return this.img.gems[p.color];
    }
  }
}
