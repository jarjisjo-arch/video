// Pre-painted textures: moon, clouds and coastline strips, made once per coast and reused every frame.
import { Ink } from './inks';
import { mulberry } from '../sim/rng';

export const canvas = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };

function noise1(seed: number) {
  const r = mulberry(seed); const v = Array.from({ length: 512 }, () => r());
  return (x: number) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return v[i & 511] * (1 - u) + v[(i + 1) & 511] * u; };
}
export function fbm(seed: number) {
  const a = noise1(seed), b = noise1(seed + 7), c = noise1(seed + 19);
  return (x: number) => a(x) * 0.55 + b(x * 2.3) * 0.3 + c(x * 5.1) * 0.15;
}

export function moonTex(ink: Ink, size = 256) {
  const c = canvas(size, size), g = c.getContext('2d')!, r = size / 2, R = mulberry(4);
  const grd = g.createRadialGradient(r * 0.8, r * 0.75, r * 0.1, r, r, r);
  grd.addColorStop(0, '#ffffff'); grd.addColorStop(0.55, ink.moon); grd.addColorStop(1, ink.moonGlow);
  g.fillStyle = grd; g.beginPath(); g.arc(r, r, r - 1, 0, 7); g.fill();
  g.save(); g.beginPath(); g.arc(r, r, r - 1, 0, 7); g.clip();
  // maria: large soft patches
  for (let i = 0; i < 7; i++) { const x = r + (R() - 0.5) * r * 1.2, y = r + (R() - 0.5) * r * 1.2, s = r * (0.18 + R() * 0.3); const m = g.createRadialGradient(x, y, 0, x, y, s); m.addColorStop(0, 'rgba(120,110,140,.28)'); m.addColorStop(1, 'rgba(120,110,140,0)'); g.fillStyle = m; g.fillRect(0, 0, size, size); }
  // craters
  for (let i = 0; i < 26; i++) {
    const x = R() * size, y = R() * size, s = 2 + R() * r * 0.12;
    g.fillStyle = 'rgba(90,80,110,.22)'; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = Math.max(1, s * 0.25); g.beginPath(); g.arc(x - s * 0.15, y - s * 0.15, s, 2.4, 5.2); g.stroke();
  }
  // limb shading
  const l = g.createRadialGradient(r * 0.85, r * 0.8, r * 0.5, r, r, r); l.addColorStop(0, 'rgba(0,0,0,0)'); l.addColorStop(1, 'rgba(40,30,80,.35)');
  g.fillStyle = l; g.fillRect(0, 0, size, size); g.restore();
  return c;
}

/** a soft painted cloud, lit from the moon side (top-left) */
export function cloudTex(ink: Ink, seed: number, w = 420, h = 150) {
  const c = canvas(w, h), g = c.getContext('2d')!, R = mulberry(seed);
  const puffs: [number, number, number][] = [];
  for (let i = 0; i < 26; i++) { const u = R(); const x = w * (0.12 + u * 0.76), e = Math.sin(u * Math.PI); puffs.push([x, h * (0.68 - e * 0.28 + (R() - 0.5) * 0.12), h * (0.16 + e * 0.26) * (0.7 + R() * 0.5)]); }
  g.fillStyle = ink.cloud; for (const [x, y, s] of puffs) { g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); }
  g.globalCompositeOperation = 'source-atop';
  const lit = g.createLinearGradient(0, 0, 0, h); lit.addColorStop(0, ink.cloudLit); lit.addColorStop(0.55, 'rgba(0,0,0,0)');
  g.globalAlpha = 0.85; for (const [x, y, s] of puffs) { g.fillStyle = lit; g.beginPath(); g.arc(x - s * 0.12, y - s * 0.18, s * 0.92, 0, 7); g.fill(); }
  g.globalAlpha = 1; g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, h * 0.72, w, h);
  g.globalCompositeOperation = 'source-over';
  return c;
}

export interface Strip { c: HTMLCanvasElement; w: number; h: number; base: number }
/** A tileable band of coastline silhouette. kind: 0 rolling hills + village, 1 sea stacks + lighthouse, 2 jagged cliffs */
export function coastStrip(ink: Ink, coast: number, layer: number, seed: number): Strip {
  const W = 2400, H = 260, c = canvas(W, H), g = c.getContext('2d')!, R = mulberry(seed);
  const n = fbm(seed);
  const col = layer === 0 ? ink.far : layer === 1 ? ink.mid : ink.near;
  const amp = [70, 90, 60][layer] * (coast === 2 ? 1.25 : 1), base = H - 30;
  const ys: number[] = [];
  for (let x = 0; x <= W; x += 6) {
    // wrap seamlessly: blend the end into the start
    const u = x / W, a = n(x * 0.004 * (layer + 1)), b = n((x - W) * 0.004 * (layer + 1));
    let v = a * (1 - u) + b * u;
    if (coast === 1) v = Math.pow(v, 2.2) * 1.6;            // isolated stacks
    if (coast === 2) v = v + Math.abs(Math.sin(x * 0.013)) * 0.18; // jagged
    ys.push(base - 20 - v * amp * 1.7);
  }
  g.fillStyle = col; g.beginPath(); g.moveTo(0, H);
  ys.forEach((y, i) => g.lineTo(i * 6, y)); g.lineTo(W, H); g.closePath(); g.fill();
  // rim light along ridges facing the moon
  g.strokeStyle = ink.rim; g.globalAlpha = layer === 0 ? 0.18 : 0.28; g.lineWidth = 1.5; g.beginPath();
  for (let i = 1; i < ys.length; i++) { if (ys[i] < ys[i - 1]) { g.moveTo((i - 1) * 6, ys[i - 1] + 1); g.lineTo(i * 6, ys[i] + 1); } }
  g.stroke(); g.globalAlpha = 1;
  // mist at the foot
  const m = g.createLinearGradient(0, H - 90, 0, H); m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(1, ink.mist);
  g.globalCompositeOperation = 'source-atop'; g.globalAlpha = layer === 0 ? 0.55 : 0.35; g.fillStyle = m; g.fillRect(0, 0, W, H); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  // details: houses with lit windows, a lighthouse, trees
  if (layer === 1) {
    for (let k = 0; k < 9; k++) {
      const x = 60 + R() * (W - 160), i = Math.round(x / 6), y = ys[i];
      if (coast === 0 || (coast === 1 && R() < 0.5)) {
        for (let j = 0; j < 2 + Math.floor(R() * 4); j++) {
          const hx = x + j * 15, hy = ys[Math.round(hx / 6)] ?? y, hw = 11 + R() * 5, hh = 9 + R() * 7;
          g.fillStyle = col; g.fillRect(hx, hy - hh, hw, hh + 6); g.beginPath(); g.moveTo(hx - 2, hy - hh); g.lineTo(hx + hw / 2, hy - hh - 7); g.lineTo(hx + hw + 2, hy - hh); g.fill();
          if (R() < 0.7) { g.fillStyle = ink.windows; g.fillRect(hx + 3, hy - hh + 4, 3, 3); }
        }
      } else if (coast === 2 && R() < 0.4) {
        g.fillStyle = col; for (let j = 0; j < 3; j++) { const tx = x + j * 9; g.beginPath(); g.moveTo(tx, y + 2); g.lineTo(tx + 4, y - 22 - R() * 8); g.lineTo(tx + 8, y + 2); g.fill(); }
      }
    }
    if (coast === 1) { // lighthouse
      const x = W * 0.62, y = ys[Math.round(x / 6)]; g.fillStyle = col; g.beginPath(); g.moveTo(x - 9, y + 2); g.lineTo(x - 5, y - 58); g.lineTo(x + 5, y - 58); g.lineTo(x + 9, y + 2); g.fill();
      g.fillRect(x - 7, y - 66, 14, 8); g.fillStyle = ink.windows; g.fillRect(x - 4, y - 65, 8, 6);
    }
  }
  return { c, w: W, h: H, base };
}

/** fine paper fibre texture used to break up flat colour */
export function paperTex() {
  const c = canvas(256, 256), g = c.getContext('2d')!, R = mulberry(9), d = g.createImageData(256, 256);
  for (let i = 0; i < d.data.length; i += 4) { const v = R(); d.data[i] = d.data[i + 1] = d.data[i + 2] = 255; d.data[i + 3] = v > 0.86 ? 10 + R() * 14 : 0; }
  g.putImageData(d, 0, 0);
  g.strokeStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < 60; i++) { g.beginPath(); const x = R() * 256, y = R() * 256; g.moveTo(x, y); g.quadraticCurveTo(x + 10, y + R() * 6, x + 18 + R() * 20, y + (R() - 0.5) * 8); g.stroke(); }
  return c;
}
