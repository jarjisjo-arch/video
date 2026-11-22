// The home screen: the fishing village the storm broke. It fills with light as the player rebuilds it.
import { Painter, Cam, hexA, mix, BOTTOM } from './world';
import { BASE } from '../sim/types';

type G = CanvasRenderingContext2D;
export interface VillageState { built: Set<string>; boats: number; baba: boolean; lantern: string; boatKind: string }

// house slots on the cliff, in cliff-relative units (0..1 across the cliff, y in world units above sea)
const HOUSES = [
  { u: 0.08, y: 48, w: 30, h: 22, item: 'home' }, { u: 0.16, y: 40, w: 26, h: 20, item: 'net' }, { u: 0.18, y: 62, w: 26, h: 24, item: 'bakery' }, { u: 0.27, y: 80, w: 34, h: 26, item: 'bakery' },
  { u: 0.38, y: 98, w: 28, h: 30, item: 'school' }, { u: 0.47, y: 112, w: 36, h: 26, item: 'school' }, { u: 0.33, y: 132, w: 24, h: 22, item: 'market' },
  { u: 0.56, y: 128, w: 30, h: 28, item: 'market' }, { u: 0.66, y: 146, w: 26, h: 24, item: 'garden' }, { u: 0.45, y: 154, w: 22, h: 46, item: 'bell', tower: true },
  { u: 0.76, y: 160, w: 34, h: 26, item: 'boathouse' }, { u: 0.86, y: 176, w: 28, h: 24, item: 'garden' },
];

export function drawVillage(p: Painter, g: G, W: number, H: number, t: number, v: VillageState) {
  const k = H / (BOTTOM + 30), cam: Cam = { x: 0, top: -30, k, W, H };
  const moonX = W * 0.3, moonY = H * 0.2, moonR = H * 0.09;
  p.sky(g, cam, t, moonX, moonY, moonR, 0.2);
  p.coastline(g, cam, t);
  p.farSea(g, cam, t, moonX);
  p.midSwell(g, cam, t);
  const surf = (x: number) => BASE + 6 + 9 * Math.sin(x * 0.008 + t * 0.7) + 5 * Math.sin(x * 0.021 - t * 1.1);
  const ink = p.ink;
  const cliffX = W * 0.5;
  const sy = (wy: number) => (wy + 30) * k;
  const seaY = sy(BASE + 6);
  // cliff
  g.fillStyle = ink.near; g.beginPath(); g.moveTo(cliffX - 40 * k, H);
  const top = (u: number) => sy(BASE - 20 - 190 * Math.pow(u, 0.7) - 14 * Math.sin(u * 9));
  for (let i = 0; i <= 40; i++) { const u = i / 40; g.lineTo(cliffX + (W - cliffX) * u, top(u)); }
  g.lineTo(W + 4, H); g.closePath(); g.fill();
  g.strokeStyle = ink.rim; g.globalAlpha = 0.25; g.lineWidth = 2; g.beginPath(); for (let i = 0; i <= 40; i++) { const u = i / 40; i ? g.lineTo(cliffX + (W - cliffX) * u, top(u)) : g.moveTo(cliffX, top(0)); } g.stroke(); g.globalAlpha = 1;
  // lighthouse
  const lx = W - 46 * k, ly = top(0.97);
  g.fillStyle = mix(ink.foam, ink.near, 0.35); g.beginPath(); g.moveTo(lx - 12 * k, ly + 4); g.lineTo(lx - 8 * k, ly - 96 * k); g.lineTo(lx + 8 * k, ly - 96 * k); g.lineTo(lx + 12 * k, ly + 4); g.fill();
  g.fillStyle = ink.near; g.fillRect(lx - 12 * k, ly - 116 * k, 24 * k, 22 * k); g.beginPath(); g.moveTo(lx - 15 * k, ly - 116 * k); g.lineTo(lx, ly - 132 * k); g.lineTo(lx + 15 * k, ly - 116 * k); g.fill();
  if (v.built.has('light')) {
    g.globalCompositeOperation = 'lighter'; const a = t * 0.6;
    const bg = g.createLinearGradient(lx, ly - 104 * k, lx - Math.abs(Math.cos(a)) * W, ly - 104 * k); bg.addColorStop(0, hexA(ink.windows, 0.35)); bg.addColorStop(1, hexA(ink.windows, 0));
    g.fillStyle = bg; g.beginPath(); g.moveTo(lx, ly - 104 * k); g.lineTo(lx - Math.abs(Math.cos(a)) * W, ly - 104 * k - 70 * k); g.lineTo(lx - Math.abs(Math.cos(a)) * W, ly - 104 * k + 70 * k); g.fill();
    glow(g, lx, ly - 104 * k, 50 * k, '#fff2c0', 0.95); g.globalCompositeOperation = 'source-over';
  } else { g.fillStyle = mix(ink.near, ink.windows, 0.15); g.fillRect(lx - 7 * k, ly - 112 * k, 14 * k, 12 * k); }
  // houses
  for (const h of HOUSES) {
    const x = cliffX + (W - cliffX) * h.u, y = Math.min(top(h.u) + 6 * k, sy(BASE - h.y)), lit = h.item === 'home' || v.built.has(h.item);
    g.fillStyle = mix(ink.near, ink.mid, 0.4); g.fillRect(x, y - h.h * k, h.w * k, h.h * k + 8 * k);
    g.fillStyle = ink.near; g.beginPath(); g.moveTo(x - 4 * k, y - h.h * k); g.lineTo(x + h.w * k / 2, y - (h.h + (h.tower ? 18 : 12)) * k); g.lineTo(x + (h.w + 4) * k, y - h.h * k); g.fill();
    const wins = h.tower ? [[h.w / 2 - 3, 10]] : [[5, h.h - 14], [h.w - 11, h.h - 14]];
    for (const [wx, wy] of wins) {
      const X = x + wx * k, Y = y - wy * k;
      if (lit) { g.globalCompositeOperation = 'lighter'; glow(g, X + 3 * k, Y + 3 * k, 16 * k, ink.windows, 0.5 + 0.08 * Math.sin(t * 2 + h.u * 9)); g.globalCompositeOperation = 'source-over'; g.fillStyle = ink.windows; }
      else g.fillStyle = mix(ink.near, ink.sky[1], 0.5);
      g.fillRect(X, Y, 6 * k, 6 * k);
    }
    if (h.tower && lit) { g.fillStyle = ink.windows; g.beginPath(); g.arc(x + h.w * k / 2, y - (h.h - 8) * k, 4 * k, 0, 7); g.fill(); }
  }
  // festival string of lanterns across the cliff
  if (v.built.has('festival')) {
    g.strokeStyle = hexA(ink.foam, 0.4); g.lineWidth = 1; g.beginPath();
    const ax = cliffX + 20 * k, ay = top(0.05) - 30 * k, bx = cliffX + (W - cliffX) * 0.7, by = top(0.7) - 26 * k;
    g.moveTo(ax, ay); g.quadraticCurveTo((ax + bx) / 2, Math.max(ay, by) + 40 * k, bx, by); g.stroke();
    g.globalCompositeOperation = 'lighter';
    for (let i = 1; i < 12; i++) { const u = i / 12, x = (1 - u) ** 2 * ax + 2 * (1 - u) * u * (ax + bx) / 2 + u * u * bx, y = (1 - u) ** 2 * ay + 2 * (1 - u) * u * (Math.max(ay, by) + 40 * k) + u * u * by;
      glow(g, x, y + 4 * k, 9 * k, ['#ff7a5a', '#ffd25a', '#7ad6ff', '#ff9ad2'][i % 4], 0.9); }
    g.globalCompositeOperation = 'source-over';
  }
  // lantern garden: small ground lights
  if (v.built.has('garden')) { g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 9; i++) { const u = 0.58 + i * 0.045, x = cliffX + (W - cliffX) * u; glow(g, x, top(u) + 2 * k, 7 * k, ink.fly, 0.6 + 0.3 * Math.sin(t * 3 + i)); } g.globalCompositeOperation = 'source-over'; }

  // sea in front
  const pts = p.sea(g, cam, t, surf, moonX, 0);
  // pier
  const pierY = seaY - 16 * k, pierL = cliffX - W * 0.36, pierR = cliffX + 10 * k;
  g.fillStyle = mix(ink.near, ink.rock, 0.5); g.fillRect(pierL, pierY, pierR - pierL, 6 * k);
  for (let x = pierL; x <= pierR; x += 34 * k) g.fillRect(x, pierY, 5 * k, H - pierY);
  if (v.built.has('pier')) { g.globalCompositeOperation = 'lighter'; for (let x = pierL + 10 * k; x <= pierR; x += 46 * k) { g.fillStyle = v.lantern; glow(g, x, pierY - 18 * k, 14 * k, v.lantern, 0.85); } g.globalCompositeOperation = 'source-over';
    for (let x = pierL + 10 * k; x <= pierR; x += 46 * k) { g.fillStyle = ink.rock; g.fillRect(x - 1, pierY - 14 * k, 2, 14 * k); g.fillStyle = v.lantern; g.fillRect(x - 3 * k, pierY - 24 * k, 6 * k, 8 * k); } }
  // the child waits at the end of the pier
  const cx = pierL + 16 * k;
  g.fillStyle = ink.rock; g.beginPath(); g.arc(cx, pierY - 24 * k, 5 * k, 0, 7); g.fill(); g.beginPath(); g.moveTo(cx - 6 * k, pierY); g.lineTo(cx, pierY - 20 * k); g.lineTo(cx + 6 * k, pierY); g.fill();
  if (v.baba) { const bx = cx + 14 * k; g.beginPath(); g.arc(bx, pierY - 34 * k, 6.5 * k, 0, 7); g.fill(); g.beginPath(); g.moveTo(bx - 8 * k, pierY); g.lineTo(bx, pierY - 28 * k); g.lineTo(bx + 8 * k, pierY); g.fill(); }
  // returned fishing boats bobbing at the pier
  for (let i = 0; i < v.boats; i++) {
    const x = pierL + (60 + i * 62) * k; if (x > pierR + 40 * k) break; const wy = surf(x / k) + 4;
    trawler(g, x, sy(wy) - 4 * k, k * 0.62, ink.near, Math.sin(t * 1.3 + i) * 0.05, ink.windows);
  }
  // the paper boat itself, bobbing beside the pier
  const bx = pierL - 40 * k; p.boat(g, bx, sy(surf(bx / k) + 2), Math.sin(t * 1.4) * 0.08, k, v.boatKind, v.lantern, t);
  p.grain(g, cam);
  return pts;
}

function glow(g: G, x: number, y: number, r: number, c: string, a: number) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, hexA(c, a)); gr.addColorStop(1, hexA(c, 0)); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
}
function trawler(g: G, x: number, y: number, s: number, c: string, ang: number, lamp: string) {
  g.save(); g.translate(x, y); g.rotate(ang); g.scale(s, s); g.fillStyle = c;
  g.beginPath(); g.moveTo(-34, -8); g.lineTo(38, -8); g.lineTo(28, 8); g.lineTo(-28, 8); g.fill();
  g.fillRect(-8, -24, 20, 16); g.fillRect(-20, -50, 3, 42);
  g.beginPath(); g.moveTo(-17, -48); g.lineTo(-17, -14); g.lineTo(-44, -14); g.fill();
  g.fillStyle = lamp; g.fillRect(-2, -20, 6, 6);
  g.restore();
}
