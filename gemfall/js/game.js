// Core match-3 rules: matching, special gems, combos, blockers, gravity, goals and end-of-level Gem Rush.
import { sfx } from './audio.js';

const SPECIAL = new Set(['streakH', 'streakV', 'burst', 'prism']);
const isStreak = (k) => k === 'streakH' || k === 'streakV';
const key = (r, c) => r * 32 + c;
let nid = 1;
function makePiece(color, kind = 'gem', r = 0, c = 0) {
  return { id: nid++, color, kind, x: c, y: r, scale: 1, alpha: 1, rot: 0, flash: 0, primed: false, fuse: 0, sx: 1, sy: 1, lift: 0, ox: 0, oy: 0 };
}
const blocker = (cell) => cell.stone > 0 || cell.crystal > 0;
const wall = (cell) => cell.stone > 0 || cell.crystal > 0 || cell.lock > 0;

export class Game {
  constructor(level, index, renderer, hooks) {
    this.L = level; this.index = index; this.rd = renderer; this.h = hooks;
    this.R = level.layout.length; this.C = level.layout[0].length;
    this.colors = level.colors; this.moves = level.moves; this.score = 0;
    this.busy = false; this.ended = false; this.cascade = 0; this.ghosts = [];
    this.hintTimer = null; this.chestsSpawned = 0; this.sinceChest = 0;
    this.crystalBroken = false; this.movesAtGoal = null; this.failReason = '';
    const counts = { ice: 0, stone: 0, lock: 0, crystal: 0 };
    this.bombCells = [];
    this.grid = level.layout.map((row, r) => row.split('').map((ch, c) => {
      const cell = {
        r, c, playable: ch !== '_', piece: null, shake: 0, grow: 1, lockA: 1,
        ice: 'ik'.includes(ch) ? 1 : ch === 'I' ? 2 : 0,
        stone: ch === 's' ? 1 : ch === 'S' ? 2 : 0,
        lock: 'lk'.includes(ch) ? 1 : 0,
        crystal: ch === 'c' ? 1 : 0
      };
      if (ch === 'b') this.bombCells.push(cell);
      for (const k in counts) counts[k] += cell[k];
      return cell;
    }));
    this.goals = level.goals.map((g) => {
      const o = Object.assign({}, g);
      if (g.type in counts) o.target = counts[g.type];
      o.left = o.target;
      return o;
    });
    const cg = this.goals.find((g) => g.type === 'chest');
    this.chestGoal = cg ? cg.target : 0;
    this.fill();
  }

  // ---------- board helpers ----------
  cell(r, c) { return r >= 0 && r < this.R && c >= 0 && c < this.C ? this.grid[r][c] : null; }
  cellK(k) { return this.grid[Math.floor(k / 32)][k % 32]; }
  pieceAt(r, c) { const k = this.cell(r, c); return k ? k.piece : null; }
  colorAt(r, c) { const p = this.pieceAt(r, c); return !p || p.kind === 'prism' || p.kind === 'chest' ? -1 : p.color; }
  allPieces() {
    const out = [];
    for (let r = 0; r < this.R; r++) for (let c = 0; c < this.C; c++) { const p = this.grid[r][c].piece; if (p) out.push({ p, r, c }); }
    return out;
  }
  randColor() { return Math.floor(Math.random() * this.colors); }

  fill() {
    for (let attempt = 0; attempt < 100; attempt++) {
      for (let r = 0; r < this.R; r++) for (let c = 0; c < this.C; c++) {
        const cell = this.grid[r][c];
        cell.piece = cell.playable && !blocker(cell) ? makePiece(this.pickSafeColor(r, c), 'gem', r, c) : null;
      }
      this.bombCells.forEach((cell) => { if (cell.piece) cell.piece.fuse = (this.L.bombs && this.L.bombs.fuse) || 12; });
      if (this.chestGoal > 0) {
        // the first chest starts a third of the way down so new players see it travel quickly
        const spots = [];
        for (let r = 2; r <= Math.min(4, this.R - 2); r++) for (let c = 1; c < this.C - 1; c++) { const cell = this.grid[r][c]; if (cell.playable && cell.piece && !cell.lock) spots.push(cell); }
        if (spots.length) { const t = spots[Math.floor(Math.random() * spots.length)]; t.piece = makePiece(-1, 'chest', t.r, t.c); this.chestsSpawned = 1; }
      }
      if (!this.findMatches().length && this.findMove()) return;
    }
  }
  pickSafeColor(r, c) {
    const bad = new Set();
    const cl = (rr, cc) => { const p = this.pieceAt(rr, cc); return p && p.kind === 'gem' ? p.color : -1; };
    if (cl(r, c - 1) >= 0 && cl(r, c - 1) === cl(r, c - 2)) bad.add(cl(r, c - 1));
    if (cl(r - 1, c) >= 0 && cl(r - 1, c) === cl(r - 2, c)) bad.add(cl(r - 1, c));
    let col;
    do { col = this.randColor(); } while (bad.has(col) && bad.size < this.colors);
    return col;
  }

  // ---------- matching ----------
  findMatches() {
    const runs = [];
    for (let r = 0; r < this.R; r++) {
      let c = 0;
      while (c < this.C) {
        const col = this.colorAt(r, c);
        if (col < 0) { c++; continue; }
        let e = c + 1;
        while (e < this.C && this.colorAt(r, e) === col) e++;
        if (e - c >= 3) { const cells = []; for (let k = c; k < e; k++) cells.push({ r, c: k }); runs.push({ dir: 'h', color: col, cells }); }
        c = e;
      }
    }
    for (let c = 0; c < this.C; c++) {
      let r = 0;
      while (r < this.R) {
        const col = this.colorAt(r, c);
        if (col < 0) { r++; continue; }
        let e = r + 1;
        while (e < this.R && this.colorAt(e, c) === col) e++;
        if (e - r >= 3) { const cells = []; for (let k = r; k < e; k++) cells.push({ r: k, c }); runs.push({ dir: 'v', color: col, cells }); }
        r = e;
      }
    }
    const parent = runs.map((_, i) => i);
    const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    const owner = new Map();
    runs.forEach((run, i) => run.cells.forEach((cl) => {
      const k = key(cl.r, cl.c);
      if (owner.has(k)) parent[find(i)] = find(owner.get(k)); else owner.set(k, i);
    }));
    const groups = new Map();
    runs.forEach((run, i) => {
      const root = find(i);
      if (!groups.has(root)) groups.set(root, { color: run.color, runs: [], cells: new Map() });
      const g = groups.get(root); g.runs.push(run);
      run.cells.forEach((cl) => g.cells.set(key(cl.r, cl.c), cl));
    });
    return [...groups.values()].map((g) => ({ color: g.color, runs: g.runs, cells: [...g.cells.values()] }));
  }
  groupSpecial(g) {
    const maxLen = Math.max(...g.runs.map((r) => r.cells.length));
    const hasH = g.runs.some((r) => r.dir === 'h'), hasV = g.runs.some((r) => r.dir === 'v');
    if (maxLen >= 5) return 'prism';
    if (hasH && hasV) return 'burst';
    if (maxLen === 4) return g.runs.find((r) => r.cells.length === 4).dir === 'h' ? 'streakH' : 'streakV';
    return null;
  }
  pickCreate(g, swapCells, kind) {
    const ok = (cl) => !this.grid[cl.r][cl.c].lock;
    if (swapCells) for (const s of swapCells) if (ok(s) && g.cells.some((x) => x.r === s.r && x.c === s.c)) return s;
    if (kind === 'burst') {
      const inH = new Set(), inV = new Set();
      g.runs.forEach((run) => run.cells.forEach((cl) => (run.dir === 'h' ? inH : inV).add(key(cl.r, cl.c))));
      const x = g.cells.find((cl) => ok(cl) && inH.has(key(cl.r, cl.c)) && inV.has(key(cl.r, cl.c)));
      if (x) return x;
    }
    const run = g.runs.reduce((a, b) => (b.cells.length > a.cells.length ? b : a));
    const mid = run.cells[Math.floor((run.cells.length - 1) / 2)];
    return ok(mid) ? mid : (g.cells.find(ok) || null);
  }
  matchAt(r, c) {
    const col = this.colorAt(r, c);
    if (col < 0) return false;
    let n = 1;
    for (let k = c - 1; this.colorAt(r, k) === col; k--) n++;
    for (let k = c + 1; this.colorAt(r, k) === col; k++) n++;
    if (n >= 3) return true;
    n = 1;
    for (let k = r - 1; this.colorAt(k, c) === col; k--) n++;
    for (let k = r + 1; this.colorAt(k, c) === col; k++) n++;
    return n >= 3;
  }
  findMove() {
    for (let r = 0; r < this.R; r++) for (let c = 0; c < this.C; c++) for (const [dr, dc] of [[0, 1], [1, 0]]) {
      const A = this.cell(r, c), B = this.cell(r + dr, c + dc);
      if (!A || !B || !A.piece || !B.piece || A.lock || B.lock) continue;
      const pa = A.piece, pb = B.piece;
      if ((pa.kind === 'prism' && pb.kind !== 'chest') || (pb.kind === 'prism' && pa.kind !== 'chest')) return [pa, pb];
      if (SPECIAL.has(pa.kind) && SPECIAL.has(pb.kind)) return [pa, pb];
      A.piece = pb; B.piece = pa;
      const ok = this.matchAt(r, c) || this.matchAt(r + dr, c + dc);
      A.piece = pa; B.piece = pb;
      if (ok) return [pa, pb];
    }
    return null;
  }
  mostCommonColor() {
    const n = new Array(6).fill(0);
    this.allPieces().forEach(({ p }) => { if (p.kind === 'gem') n[p.color]++; });
    let best = 0;
    n.forEach((v, i) => { if (v > n[best]) best = i; });
    return best;
  }

  // ---------- goals and HUD ----------
  hud() { this.h.hud(this); }
  goalDec(type, n, color) {
    let hit = false;
    for (const g of this.goals) {
      if (g.type !== type || (type === 'collect' && g.color !== color) || g.left <= 0) continue;
      g.left = Math.max(0, g.left - n); hit = true;
    }
    return hit;
  }
  goalsDone() { return this.goals.every((g) => (g.type === 'score' ? this.score >= g.target : g.left <= 0)); }
  crystalCount() { let n = 0; for (const row of this.grid) for (const cl of row) n += cl.crystal; return n; }
  starsEarned() { return this.L.stars.filter((s) => this.score >= s).length; }

  // ---------- turn flow ----------
  async trySwap(a, b) {
    if (this.busy || this.ended) return;
    if (Math.abs(a.r - b.r) + Math.abs(a.c - b.c) !== 1) return;
    const ca = this.cell(a.r, a.c), cb = this.cell(b.r, b.c);
    if (!ca || !cb || !ca.piece || !cb.piece) return;
    if (ca.lock || cb.lock) {
      sfx('bad');
      const lk = ca.lock ? ca : cb;
      lk.shake = 1; this.rd.tween(lk, { shake: 0 }, 300);
      return;
    }
    this.busy = true; this.clearHint();
    this.crystalBroken = false;
    const pa = ca.piece, pb = cb.piece;
    const combo = (pa.kind === 'prism' && pb.kind !== 'chest') || (pb.kind === 'prism' && pa.kind !== 'chest') || (SPECIAL.has(pa.kind) && SPECIAL.has(pb.kind));
    ca.piece = pb; cb.piece = pa;
    const matches = combo || this.findMatches().length > 0;
    ca.piece = pa; cb.piece = pb;
    if (!matches) {
      sfx('bad');
      await this.rd.bump(pa, a, pb, b);
      this.busy = false; this.armHint();
      return;
    }
    sfx('swap');
    await this.rd.swap(pa, a, pb, b);
    ca.piece = pb; cb.piece = pa;
    this.moves--; this.hud();
    if (combo) {
      this.cascade = 1;
      await this.comboStep(pa, b, pb, a);
      await this.collapse();
      await this.resolve(null);
    } else {
      await this.resolve([b, a]);
    }
    await this.afterTurn();
  }

  async resolve(swapCells) {
    let first = true;
    for (let guard = 0; guard < 80; guard++) {
      const primed = this.allPieces().filter((x) => x.p.primed);
      const groups = this.findMatches();
      if (!groups.length && !primed.length) break;
      this.cascade++;
      if (this.cascade >= 2 && groups.length) this.h.combo(this.cascade);
      const triggers = primed.map((x) => ({ r: x.r, c: x.c }));
      if (groups.length) await this.matchStep(groups, first ? swapCells : null, triggers);
      else await this.executeClear({ clear: new Map(), triggers });
      first = false;
      await this.collapse();
    }
    this.cascade = 0;
  }

  async matchStep(groups, swapCells, triggers) {
    const clear = new Map(), creations = [], stoneHits = new Set();
    for (const g of groups) {
      let kind = this.groupSpecial(g);
      const at = kind ? this.pickCreate(g, swapCells, kind) : null;
      if (!at) kind = null;
      for (const cl of g.cells) {
        const isAt = at && cl.r === at.r && cl.c === at.c;
        if (isAt) {
          const p = this.pieceAt(cl.r, cl.c);
          if (p && p.kind !== 'gem') clear.set(key(cl.r, cl.c), cl);
        } else clear.set(key(cl.r, cl.c), cl);
        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const n = this.cell(cl.r + dr, cl.c + dc);
          if (n && n.playable && blocker(n)) stoneHits.add(key(n.r, n.c));
        }
      }
      if (kind) creations.push({ r: at.r, c: at.c, kind, color: g.color, from: g.cells.filter((x) => !(x.r === at.r && x.c === at.c)) });
    }
    await this.executeClear({ clear, stoneHits, creations, triggers, matched: true });
  }

  expand(init, triggers = [], skip = new Set()) {
    const clear = new Map(init), queue = [...init.values()], hit = new Set(), blast = new Set();
    const effects = [], done = new Set(skip), keepPrimed = new Set();
    const add = (r, c) => {
      const cell = this.cell(r, c);
      if (!cell || !cell.playable) return;
      const k = key(r, c); hit.add(k);
      const p = cell.piece;
      if (!p || p.kind === 'chest' || keepPrimed.has(p.id)) return;
      if (!clear.has(k)) { clear.set(k, { r, c }); blast.add(k); queue.push({ r, c }); }
    };
    const fire = (r, c, p) => {
      done.add(p.id);
      if (p.kind === 'streakH') { effects.push({ type: 'beam', dir: 'h', index: r, color: p.color }); for (let cc = 0; cc < this.C; cc++) add(r, cc); }
      else if (p.kind === 'streakV') { effects.push({ type: 'beam', dir: 'v', index: c, color: p.color }); for (let rr = 0; rr < this.R; rr++) add(rr, c); }
      else if (p.kind === 'burst') {
        const second = p.primed;
        effects.push({ type: 'ring', r, c, rad: second ? 2.4 : 1.9, color: p.color });
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (dr || dc) add(r + dr, c + dc);
        if (!second) { p.primed = true; keepPrimed.add(p.id); clear.delete(key(r, c)); }
      } else if (p.kind === 'prism') {
        const col = this.mostCommonColor();
        effects.push({ type: 'prism' });
        for (let rr = 0; rr < this.R; rr++) for (let cc = 0; cc < this.C; cc++) if (this.colorAt(rr, cc) === col) { effects.push({ type: 'bolt', r0: r, c0: c, r1: rr, c1: cc, color: col }); add(rr, cc); }
      }
    };
    for (const t of triggers) {
      const p = this.pieceAt(t.r, t.c);
      if (!p || done.has(p.id)) continue;
      if (!clear.has(key(t.r, t.c))) clear.set(key(t.r, t.c), { r: t.r, c: t.c });
      fire(t.r, t.c, p);
    }
    while (queue.length) {
      const { r, c } = queue.shift();
      const p = this.pieceAt(r, c);
      if (!p || done.has(p.id)) continue;
      if (SPECIAL.has(p.kind)) fire(r, c, p);
    }
    return { clear, hit, blast, effects, keepPrimed };
  }

  async executeClear(o) {
    const ex = this.expand(o.clear, o.triggers || [], o.skip || new Set());
    if (o.extraHit) o.extraHit.forEach((k) => ex.hit.add(k));
    const effects = [...(o.effects || []), ...ex.effects];
    let beams = 0, rings = 0, prism = false;
    for (const f of effects) {
      if (f.type === 'beam') { this.rd.beam(f.dir, f.index, f.color); beams++; }
      else if (f.type === 'ring') { this.rd.ring(f.r, f.c, f.rad, f.color); rings++; }
      else if (f.type === 'bolt') this.rd.bolt(f.r0, f.c0, f.r1, f.c1, f.color);
      else if (f.type === 'prism') prism = true;
    }
    if (beams) sfx('streak');
    if (rings) { sfx('burst'); this.rd.shake(this.rd.cell * 0.14 * Math.min(3, rings), 320); }
    if (prism) { sfx('prism'); this.rd.flash = Math.max(this.rd.flash, 0.6); }
    if (beams + rings > 0 || prism) await this.rd.wait(prism ? 260 : 120);

    // gems being merged into a new special slide towards it first
    const slides = [];
    for (const cr of o.creations || []) for (const f of cr.from) {
      const p = this.pieceAt(f.r, f.c);
      if (p && p.kind === 'gem' && !this.grid[f.r][f.c].lock && ex.clear.has(key(f.r, f.c))) { p.absorbed = true; slides.push(this.rd.tween(p, { x: cr.c, y: cr.r, scale: 0.7 }, 130, 'inQuad')); }
    }
    if (slides.length) await Promise.all(slides);

    const mult = Math.max(1, this.cascade);
    let gained = 0, flies = 0, sumR = 0, sumC = 0, n = 0;
    let locks = 0, defused = 0;
    for (const [k, cl] of ex.clear) {
      const cell = this.grid[cl.r][cl.c], p = cell.piece;
      if (!p || p.kind === 'chest' || ex.keepPrimed.has(p.id)) continue;
      if (cell.lock > 0) {
        cell.lock = 0; locks++; gained += 80; this.goalDec('lock', 1);
        this.rd.chainBreak(cl.r, cl.c);
        continue;
      }
      if (p.fuse > 0) { defused++; gained += 200; }
      cell.piece = null; this.ghosts.push(p);
      gained += (ex.blast.has(k) ? 30 : 20) * mult; sumR += cl.r; sumC += cl.c; n++;
      if (p.kind !== 'prism') {
        if (this.goalDec('collect', 1, p.color) && flies < 8) { flies++; this.h.fly('collect', cl.r, cl.c, p.color); }
        this.rd.pop(cl.r, cl.c, p.color, p.absorbed ? 3 : 9);
      } else this.rd.pop(cl.r, cl.c, 5, 14);
      const done = () => { this.ghosts = this.ghosts.filter((q) => q !== p); };
      this.rd.popOut(p, p.absorbed).then(done);
    }
    // ice cracks under every cleared or blasted cell
    let ice = 0;
    for (const k of new Set([...ex.clear.keys(), ...ex.hit])) {
      const cell = this.cellK(k);
      if (cell.playable && cell.ice > 0) { cell.ice--; ice++; gained += 60; this.goalDec('ice', 1); this.rd.iceShards(cell.r, cell.c); }
    }
    // hammer on a chain that sits on an empty spot of the clear set
    ex.hit.forEach((k) => {
      const cell = this.cellK(k);
      if (cell.lock > 0 && !ex.clear.has(k)) { cell.lock = 0; locks++; gained += 80; this.goalDec('lock', 1); this.rd.chainBreak(cell.r, cell.c); }
    });
    // stones and crystal crack next to matches and inside blasts
    const stones = new Set(o.stoneHits || []);
    ex.hit.forEach((k) => { if (blocker(this.cellK(k))) stones.add(k); });
    let crystals = 0;
    for (const k of stones) {
      const cell = this.cellK(k);
      if (cell.stone > 0) {
        cell.stone--; gained += 40; this.goalDec('stone', 1); this.rd.dust(cell.r, cell.c);
        cell.shake = 1; this.rd.tween(cell, { shake: 0 }, 260);
      } else if (cell.crystal > 0) {
        cell.crystal = 0; crystals++; gained += 80; this.goalDec('crystal', 1); this.crystalBroken = true;
        this.rd.crystalShards(cell.r, cell.c);
      }
    }
    if (stones.size) sfx('stone');
    if (crystals) sfx('crystal');
    if (locks) sfx('chain');
    if (defused) { sfx('defuse'); this.h.banner(defused > 1 ? 'Bombs defused!' : 'Defused!'); }
    if (ice) sfx('ice');
    if (o.matched) sfx('match', this.cascade - 1);
    this.score += gained;
    if (gained && n) this.rd.scoreText(sumR / n, sumC / n, gained);

    for (const cr of o.creations || []) {
      const cell = this.grid[cr.r][cr.c];
      if (cell.piece) {
        const old = cell.piece; this.ghosts.push(old);
        this.rd.tween(old, { alpha: 0 }, 120).then(() => { this.ghosts = this.ghosts.filter((q) => q !== old); });
      }
      const np = makePiece(cr.color, cr.kind, cr.r, cr.c);
      np.scale = 0.2; np.flash = 1; cell.piece = np;
      this.rd.tween(np, { scale: 1 }, 280, 'outBack'); this.rd.tween(np, { flash: 0 }, 600);
      this.rd.ring(cr.r, cr.c, 0.9, cr.kind === 'prism' ? 5 : cr.color, 420);
      this.score += cr.kind === 'prism' ? 200 : cr.kind === 'burst' ? 120 : 60;
      sfx('special');
      this.h.special(cr.kind);
    }
    this.hud();
    await this.rd.wait(210);
  }

  async comboStep(p1, at1, p2, at2) {
    const clear = new Map(), extraHit = new Set(), effects = [];
    const blastCell = (r, c) => {
      const cl = this.cell(r, c);
      if (!cl || !cl.playable) return;
      extraHit.add(key(r, c));
      if (cl.piece && cl.piece.kind !== 'chest') clear.set(key(r, c), { r, c });
    };
    clear.set(key(at1.r, at1.c), at1); clear.set(key(at2.r, at2.c), at2);
    const skip = new Set([p1.id, p2.id]);
    this.h.combo('mega');
    if (p1.kind === 'prism' && p2.kind === 'prism') {
      for (let r = 0; r < this.R; r++) for (let c = 0; c < this.C; c++) blastCell(r, c);
      this.rd.flash = 1; this.rd.shake(this.rd.cell * 0.3, 700);
      effects.push({ type: 'prism' });
      for (let i = 0; i < 16; i++) effects.push({ type: 'bolt', r0: at1.r, c0: at1.c, r1: Math.floor(Math.random() * this.R), c1: Math.floor(Math.random() * this.C), color: i % 6 });
      await this.executeClear({ clear, extraHit, effects, skip });
      return;
    }
    if (p1.kind === 'prism' || p2.kind === 'prism') {
      const pr = p1.kind === 'prism' ? p1 : p2, other = pr === p1 ? p2 : p1;
      const prAt = pr === p1 ? at1 : at2, col = other.color;
      const targets = [];
      for (let r = 0; r < this.R; r++) for (let c = 0; c < this.C; c++) if (this.colorAt(r, c) === col) targets.push({ r, c });
      sfx('prism');
      if (other.kind === 'gem') {
        targets.forEach((t) => { clear.set(key(t.r, t.c), t); effects.push({ type: 'bolt', r0: prAt.r, c0: prAt.c, r1: t.r, c1: t.c, color: col }); });
        await this.executeClear({ clear, effects, skip });
      } else {
        for (const t of targets) {
          const p = this.pieceAt(t.r, t.c);
          this.rd.bolt(prAt.r, prAt.c, t.r, t.c, col);
          if (p.kind === 'gem' && !this.grid[t.r][t.c].lock) { p.kind = other.kind === 'burst' ? 'burst' : (Math.random() < 0.5 ? 'streakH' : 'streakV'); p.flash = 1; this.rd.tween(p, { flash: 0 }, 400); }
          clear.set(key(t.r, t.c), t);
          sfx('rush', targets.indexOf(t));
          await this.rd.wait(45);
        }
        await this.rd.wait(300);
        await this.executeClear({ clear, skip: new Set([pr.id]) });
      }
      return;
    }
    const t = at1;
    if (isStreak(p1.kind) && isStreak(p2.kind)) {
      effects.push({ type: 'beam', dir: 'h', index: t.r, color: p1.color }, { type: 'beam', dir: 'v', index: t.c, color: p2.color });
      for (let c = 0; c < this.C; c++) blastCell(t.r, c);
      for (let r = 0; r < this.R; r++) blastCell(r, t.c);
    } else if (p1.kind === 'burst' && p2.kind === 'burst') {
      effects.push({ type: 'ring', r: t.r, c: t.c, rad: 3.4, color: p1.color });
      for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) blastCell(t.r + dr, t.c + dc);
      this.rd.shake(this.rd.cell * 0.3, 500);
    } else {
      const col = isStreak(p1.kind) ? p1.color : p2.color;
      for (let d = -1; d <= 1; d++) {
        effects.push({ type: 'beam', dir: 'h', index: t.r + d, color: col }, { type: 'beam', dir: 'v', index: t.c + d, color: col });
        for (let c = 0; c < this.C; c++) blastCell(t.r + d, c);
        for (let r = 0; r < this.R; r++) blastCell(r, t.c + d);
      }
      this.rd.shake(this.rd.cell * 0.25, 450);
    }
    await this.executeClear({ clear, extraHit, effects, skip });
  }

  // ---------- gravity ----------
  spawnPiece() {
    if (this.chestsSpawned < this.chestGoal) {
      this.sinceChest++;
      const onBoard = this.allPieces().filter((x) => x.p.kind === 'chest').length;
      if ((onBoard === 0 && this.sinceChest > 3) || (onBoard < 2 && Math.random() < 0.05)) {
        this.chestsSpawned++; this.sinceChest = 0;
        return makePiece(-1, 'chest');
      }
    }
    const p = makePiece(this.randColor());
    const b = this.L.bombs;
    if (b && Math.random() < b.rate && this.allPieces().filter((x) => x.p.fuse > 0).length < 3) p.fuse = b.fuse;
    return p;
  }
  gravity() {
    const moves = [];
    for (let c = 0; c < this.C; c++) {
      const segs = [];
      let cur = [], open = true;
      for (let r = 0; r < this.R; r++) {
        const cell = this.grid[r][c];
        if (!cell.playable) continue;
        if (wall(cell)) { if (cur.length) segs.push({ rows: cur, open }); cur = []; open = false; continue; }
        cur.push(r);
      }
      if (cur.length) segs.push({ rows: cur, open });
      for (const seg of segs) {
        const pcs = seg.rows.map((r) => this.grid[r][c].piece).filter(Boolean);
        const empties = seg.rows.length - pcs.length;
        if (!empties) continue;
        seg.rows.forEach((r) => { this.grid[r][c].piece = null; });
        pcs.forEach((p, i) => {
          const r = seg.rows[empties + i];
          this.grid[r][c].piece = p;
          if (p.y !== r || p.x !== c) moves.push({ p, r, c });
        });
        if (seg.open) {
          for (let i = 0; i < empties; i++) {
            const r = seg.rows[i], p = this.spawnPiece();
            p.x = c; p.y = seg.rows[0] - (empties - i);
            this.grid[r][c].piece = p; moves.push({ p, r, c });
          }
        }
      }
    }
    if (moves.length) return moves;
    for (let r = this.R - 1; r >= 1; r--) for (let c = 0; c < this.C; c++) {
      const cell = this.grid[r][c];
      if (!cell.playable || wall(cell) || cell.piece) continue;
      for (const dc of [-1, 1]) {
        const src = this.cell(r - 1, c + dc);
        if (!src || !src.playable || wall(src) || !src.piece) continue;
        const below = this.cell(r, c + dc);
        if (below && below.playable && !wall(below) && !below.piece) continue;
        cell.piece = src.piece; src.piece = null; moves.push({ p: cell.piece, r, c });
        break;
      }
    }
    return moves;
  }
  async collapse() {
    for (let guard = 0; guard < 60; guard++) {
      const moves = this.gravity();
      if (!moves.length) {
        if (await this.collectChests()) continue;
        break;
      }
      // lower gems start a moment earlier, so each column ripples down instead of moving as a slab
      await Promise.all(moves.map((m) => this.rd.fall(m.p, m.r, m.c, (this.R - 1 - m.r) * 11 + m.c * 4)));
    }
  }
  async collectChests() {
    const anims = [];
    for (let c = 0; c < this.C; c++) {
      let r = this.R - 1;
      while (r >= 0 && !this.grid[r][c].playable) r--;
      if (r < 0) continue;
      const cell = this.grid[r][c];
      if (!cell.piece || cell.piece.kind !== 'chest') continue;
      const p = cell.piece;
      cell.piece = null; this.ghosts.push(p);
      this.goalDec('chest', 1); this.score += 1000; this.rd.scoreText(r, c, 1000);
      sfx('chest'); this.h.fly('chest', r, c);
      anims.push(this.rd.tween(p, { y: p.y - 0.7, scale: 1.35 }, 240).then(() => this.rd.tween(p, { alpha: 0, scale: 0.3 }, 260)).then(() => { this.ghosts = this.ghosts.filter((q) => q !== p); }));
    }
    if (!anims.length) return false;
    this.hud();
    await Promise.all(anims);
    return true;
  }

  // ---------- boosters, hints, end ----------
  async hammer(r, c) {
    if (this.busy || this.ended) return false;
    const cell = this.cell(r, c);
    if (!cell || !cell.playable || (cell.piece && cell.piece.kind === 'chest')) return false;
    if (!cell.piece && !blocker(cell)) return false;
    this.busy = true; this.clearHint();
    this.crystalBroken = true;
    sfx('hammer'); this.rd.ring(r, c, 1.1, 1, 380); this.rd.shake(this.rd.cell * 0.2, 300);
    const clear = new Map();
    if (cell.piece) clear.set(key(r, c), { r, c });
    this.cascade = 1;
    await this.executeClear({ clear, extraHit: new Set([key(r, c)]) });
    await this.collapse();
    await this.resolve(null);
    await this.afterTurn(false);
    return true;
  }
  async shuffleNow() {
    if (this.busy || this.ended) return false;
    this.busy = true; this.clearHint();
    await this.shuffleBoard();
    await this.resolve(null);
    await this.afterTurn(false);
    return true;
  }
  async shuffleBoard() {
    const cells = this.allPieces().filter((x) => x.p.kind === 'gem' && !this.grid[x.r][x.c].lock).map((x) => this.grid[x.r][x.c]);
    const pcs = cells.map((cl) => cl.piece);
    let ok = false;
    for (let tries = 0; tries < 300 && !ok; tries++) {
      for (let i = pcs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pcs[i], pcs[j]] = [pcs[j], pcs[i]]; }
      cells.forEach((cl, i) => { cl.piece = pcs[i]; });
      if (tries > 150) pcs.forEach((p) => { p.color = this.randColor(); });
      ok = !this.findMatches().length && !!this.findMove();
    }
    this.h.banner('Shuffle!'); sfx('shuffle');
    await this.rd.shuffle(cells);
  }
  armHint() {
    clearTimeout(this.hintTimer);
    this.hintTimer = setTimeout(() => this.showHint(), 5000);
  }
  showHint() {
    if (this.busy || this.ended) return;
    const m = this.findMove();
    if (m) this.rd.hint = m;
  }
  clearHint() { clearTimeout(this.hintTimer); this.rd.hint = null; }

  async afterTurn(playerMove = true) {
    this.hud();
    if (this.goalsDone()) { this.movesAtGoal = this.moves; await this.gemRush(); this.finish(true); return; }
    if (playerMove) {
      if (!this.crystalBroken && this.crystalCount() > 0) await this.spreadCrystal();
      this.crystalBroken = false;
      const bombs = this.allPieces().filter((x) => x.p.fuse > 0);
      bombs.forEach((x) => { x.p.fuse--; if (x.p.fuse <= 3) { x.p.flash = 0.8; this.rd.tween(x.p, { flash: 0 }, 300); } });
      const boom = bombs.find((x) => x.p.fuse <= 0);
      if (boom) {
        sfx('burst'); this.rd.ring(boom.r, boom.c, 3, 0, 700); this.rd.flash = 1; this.rd.shake(this.rd.cell * 0.35, 700);
        this.h.banner('Boom!');
        await this.rd.wait(900);
        this.failReason = 'bomb'; this.finish(false); return;
      }
    }
    if (this.moves <= 0) { this.failReason = 'moves'; this.finish(false); return; }
    for (let tries = 0; tries < 6 && !this.findMove(); tries++) {
      await this.rd.wait(250);
      if (tries < 2) await this.shuffleBoard();
      else await this.clearTheWay();
      await this.collapse();
      await this.resolve(null);
    }
    this.busy = false; this.armHint();
  }
  async spreadCrystal() {
    const options = [];
    for (const row of this.grid) for (const cl of row) {
      if (!cl.crystal) continue;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = this.cell(cl.r + dr, cl.c + dc);
        if (n && n.playable && !wall(n) && n.piece && n.piece.kind === 'gem' && !n.piece.fuse) options.push(n);
      }
    }
    if (!options.length) return;
    const n = options[Math.floor(Math.random() * options.length)];
    const p = n.piece; n.piece = null; this.ghosts.push(p);
    this.rd.tween(p, { scale: 0, alpha: 0 }, 260).then(() => { this.ghosts = this.ghosts.filter((q) => q !== p); });
    n.crystal = 1; n.grow = 0; this.rd.tween(n, { grow: 1 }, 380, 'outBack');
    for (const g of this.goals) if (g.type === 'crystal') g.left++;
    sfx('creep'); this.hud();
    await this.rd.wait(380);
  }
  async clearTheWay() {
    // last resort when no move exists: Digby breaks the most central blocker for free
    const list = [];
    for (const row of this.grid) for (const cl of row) if (cl.playable && wall(cl)) list.push(cl);
    if (!list.length) { await this.shuffleBoard(); return; }
    list.sort((a, b) => Math.hypot(a.r - 3.5, a.c - 3.5) - Math.hypot(b.r - 3.5, b.c - 3.5));
    const t = list[0];
    this.h.banner('Digby digs!');
    sfx('hammer'); this.rd.ring(t.r, t.c, 1.1, 1, 380);
    this.cascade = 1;
    await this.executeClear({ clear: new Map(), extraHit: new Set([key(t.r, t.c)]) });
  }
  async gemRush() {
    if (this.moves <= 0) return;
    this.h.banner('Gem Rush!');
    await this.rd.wait(800);
    let n = 0;
    while (this.moves > 0) {
      const gems = this.allPieces().filter((x) => x.p.kind === 'gem' && !this.grid[x.r][x.c].lock);
      if (!gems.length) break;
      const g = gems[Math.floor(Math.random() * gems.length)];
      g.p.kind = Math.random() < 0.5 ? 'streakH' : 'streakV'; g.p.flash = 1; this.rd.tween(g.p, { flash: 0 }, 400);
      this.rd.ring(g.r, g.c, 0.8, g.p.color, 300);
      this.moves--; this.score += 300; sfx('rush', n++); this.hud();
      await this.rd.wait(110);
    }
    for (let guard = 0; guard < 60; guard++) {
      const sp = this.allPieces().filter((x) => SPECIAL.has(x.p.kind) || x.p.primed);
      if (!sp.length) break;
      const s = sp[0];
      this.cascade = 1;
      await this.executeClear({ clear: new Map([[key(s.r, s.c), { r: s.r, c: s.c }]]) });
      await this.collapse();
      await this.resolve(null);
    }
    this.hud();
  }
  finish(win) {
    this.ended = true; this.busy = false; this.clearHint();
    const stars = win ? Math.max(1, this.starsEarned()) : 0;
    this.h.end({ win, score: this.score, stars, reason: this.failReason });
  }
  destroy() { this.ended = true; this.clearHint(); }
}
