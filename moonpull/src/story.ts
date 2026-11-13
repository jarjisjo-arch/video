import { Ink, inkById } from './palettes';
import { drawBoat, drawMoon, View } from './render';
import { VH } from './sim/types';

type G = CanvasRenderingContext2D;
interface Panel { ink: string; text: string; draw: (g: G, vw: number, t: number, ink: Ink) => void }

function sea(g: G, vw: number, t: number, ink: Ink, y = 250, amp = 4) {
  g.fillStyle = ink.back; g.beginPath(); g.moveTo(0, VH);
  for (let x = 0; x <= vw + 10; x += 10) g.lineTo(x, y - 10 + amp * Math.sin(x * 0.03 + t * 0.8));
  g.lineTo(vw + 10, VH); g.fill();
  g.fillStyle = ink.sea; g.beginPath(); g.moveTo(0, VH);
  for (let x = 0; x <= vw + 10; x += 10) g.lineTo(x, y + amp * Math.sin(x * 0.025 - t * 1.1) + amp * 0.5 * Math.sin(x * 0.07 + t));
  g.lineTo(vw + 10, VH); g.fill();
}
const seaY = (x: number, t: number, y = 250, amp = 4) => y + amp * Math.sin(x * 0.025 - t * 1.1) + amp * 0.5 * Math.sin(x * 0.07 + t);
function sky(g: G, vw: number, ink: Ink, stars = true) {
  const sg = g.createLinearGradient(0, 0, 0, 250); sg.addColorStop(0, ink.sky); sg.addColorStop(1, ink.sky2); g.fillStyle = sg; g.fillRect(0, 0, vw, VH);
  if (!stars) return; g.fillStyle = ink.star;
  for (let i = 0; i < 40; i++) { const x = (Math.sin(i * 91.7) * 0.5 + 0.5) * vw, y = (Math.sin(i * 47.3) * 0.5 + 0.5) * 170; g.globalAlpha = 0.5; g.beginPath(); g.arc(x, y, 1, 0, 7); g.fill(); }
  g.globalAlpha = 1;
}
function hills(g: G, vw: number, ink: Ink, base = 236, seed = 1) {
  g.fillStyle = ink.hill; g.beginPath(); g.moveTo(0, VH);
  for (let x = 0; x <= vw + 20; x += 20) g.lineTo(x, base - 30 - 26 * Math.sin(x * 0.006 + seed) - 12 * Math.sin(x * 0.017 + seed * 3));
  g.lineTo(vw + 20, VH); g.fill();
}
function shore(g: G, ink: Ink, w: number, right = false, vw = 0) {
  g.fillStyle = ink.rock; g.beginPath();
  if (!right) { g.moveTo(0, VH); g.lineTo(0, 226); g.quadraticCurveTo(w * 0.6, 222, w, 262); g.lineTo(w + 40, VH); }
  else { g.moveTo(vw, VH); g.lineTo(vw, 226); g.quadraticCurveTo(vw - w * 0.6, 222, vw - w, 262); g.lineTo(vw - w - 40, VH); }
  g.fill();
}
function house(g: G, x: number, y: number, ink: Ink, lit: string) {
  g.fillStyle = ink.rock; g.fillRect(x, y - 30, 44, 30); g.beginPath(); g.moveTo(x - 6, y - 30); g.lineTo(x + 22, y - 52); g.lineTo(x + 50, y - 30); g.fill();
  g.fillStyle = lit; g.globalAlpha = 0.9; g.fillRect(x + 26, y - 22, 10, 11); g.globalAlpha = 1;
}
function pier(g: G, x: number, w: number, ink: Ink) { g.fillStyle = ink.rock; g.fillRect(x, 238, w, 6); for (let i = 0; i <= w; i += 34) g.fillRect(x + i, 240, 5, 130); }
function child(g: G, x: number, y: number, ink: Ink, arm = 0) {
  g.fillStyle = ink.rock; g.beginPath(); g.arc(x, y - 27, 5.5, 0, 7); g.fill();
  g.beginPath(); g.moveTo(x - 6, y); g.lineTo(x, y - 22); g.lineTo(x + 6, y); g.fill();
  g.strokeStyle = ink.rock; g.lineWidth = 2.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y - 17); g.lineTo(x + 10, y - 17 - arm * 12); g.stroke();
}
function trawler(g: G, x: number, y: number, s: number, ink: Ink, ang = 0, lamp?: string) {
  g.save(); g.translate(x, y); g.rotate(ang); g.scale(s, s); g.fillStyle = ink.rock;
  g.beginPath(); g.moveTo(-34, -8); g.lineTo(38, -8); g.lineTo(28, 8); g.lineTo(-28, 8); g.fill();
  g.fillRect(-8, -24, 20, 16); g.fillRect(-20, -50, 3, 42);
  g.beginPath(); g.moveTo(-17, -48); g.lineTo(-17, -14); g.lineTo(-44, -14); g.fill();
  if (lamp) { g.fillStyle = lamp; g.fillRect(-2, -20, 6, 6); }
  g.restore();
}
function clouds(g: G, vw: number, t: number, ink: Ink, y: number, dark = false) {
  g.fillStyle = dark ? ink.rock : ink.cloud; g.globalAlpha = dark ? 0.75 : 0.85; g.beginPath();
  for (let i = 0; i < 12; i++) { const x = ((i * 97 + t * 8) % (vw + 200)) - 100; g.moveTo(x + 70, y); g.ellipse(x, y + Math.sin(i * 2.1) * 16, 70, 26 + (i % 3) * 8, 0, 0, 7); }
  g.fill(); g.globalAlpha = 1;
}
function lights(g: G, vw: number, t: number, ink: Ink, n: number) {
  for (let i = 0; i < n; i++) {
    const x = (Math.sin(i * 53.1) * 0.5 + 0.5) * vw, yy = seaY(x, t) - 6 - (i % 3) * 1;
    g.fillStyle = ink.moon; g.globalAlpha = 0.2 + 0.1 * Math.sin(t * 2 + i); g.beginPath(); g.arc(x, yy, 9, 0, 7); g.fill();
    g.globalAlpha = 1; g.fillRect(x - 2, yy - 3, 4, 5); g.fillStyle = ink.paper; g.fillRect(x - 6, yy + 2, 12, 3);
  }
}
const L = '#e4572e';

export const SCENES: Record<string, Panel[]> = {
  intro: [
    { ink: 'storm', text: 'The storm came faster than anyone said it would.', draw(g, vw, t, k) { sky(g, vw, k, false); hills(g, vw, k); clouds(g, vw, t, k, 70, true); clouds(g, vw, t * 1.6, k, 120); sea(g, vw, t * 2, k, 250, 9);
      for (let i = 0; i < 3; i++) { const x = vw * (0.35 + i * 0.2) + t * 6; trawler(g, x, seaY(x, t * 2, 250, 9) - 4, 0.7 - i * 0.12, k, Math.sin(t * 2 + i) * 0.12, k.moon); } shore(g, k, 150); house(g, 30, 228, k, k.moon); } },
    { ink: 'dawn', text: 'By morning the boats were gone. Baba’s too.', draw(g, vw, t, k) { sky(g, vw, k, false); hills(g, vw, k); sea(g, vw, t, k); shore(g, k, 170); house(g, 34, 228, k, k.sky); pier(g, 150, 150, k); child(g, 286, 238, k); } },
    { ink: 'indigo', text: 'So a child folded a paper boat, lit a lantern, and gave it to the sea.', draw(g, vw, t, k) { sky(g, vw, k); hills(g, vw, k); drawMoon(g, vw * 0.74, 78, 22, k); sea(g, vw, t, k); shore(g, k, 170); house(g, 34, 228, k, k.moon); pier(g, 150, 150, k); child(g, 286, 238, k, 0.6 + 0.3 * Math.sin(t * 2));
      const bx = 330 + Math.min(120, t * 14); drawBoat(g, 'paper', bx, seaY(bx, t) - 1, Math.sin(t * 1.5) * 0.08, k, L, 1, t); } },
    { ink: 'indigo', text: 'A paper boat cannot cross a sea. But the moon was watching. You are the moon.', draw(g, vw, t, k) { sky(g, vw, k); const mx = vw * 0.5, r = 58 + Math.sin(t * 0.8) * 2; drawMoon(g, mx, 120, r, k);
      g.fillStyle = k.back; g.beginPath(); g.moveTo(0, VH); for (let x = 0; x <= vw + 10; x += 10) { const d = (x - mx) / 150; g.lineTo(x, 262 - 44 * Math.exp(-d * d) + 3 * Math.sin(x * 0.03 + t)); } g.lineTo(vw + 10, VH); g.fill();
      g.fillStyle = k.sea; g.beginPath(); g.moveTo(0, VH); const f = (x: number) => { const d = (x - mx) / 130; return 274 - 40 * Math.exp(-d * d) + 2 * Math.sin(x * 0.05 - t); }; for (let x = 0; x <= vw + 10; x += 10) g.lineTo(x, f(x)); g.lineTo(vw + 10, VH); g.fill();
      const bx = mx + 96; drawBoat(g, 'paper', bx, f(bx), Math.atan((f(bx + 5) - f(bx - 5)) / 10), k, L, 1, t); } },
  ],
  coast1: [
    { ink: 'plum', text: 'Past the bay, the water was full of small lights. Other lanterns. Other people waiting.', draw(g, vw, t, k) { sky(g, vw, k); hills(g, vw, k, 244, 4); drawMoon(g, vw * 0.2, 70, 20, k); sea(g, vw, t, k); lights(g, vw, t, k, 16);
      const bx = vw * 0.5; drawBoat(g, 'paper', bx, seaY(bx, t), Math.sin(t) * 0.06, k, L, 1, t); } },
  ],
  coast2: [
    { ink: 'storm', text: 'Ahead, the sky closed over. Somewhere in that dark, the fleet was drifting.', draw(g, vw, t, k) { sky(g, vw, k, false); drawMoon(g, vw * 0.16, 64, 20, k); clouds(g, vw, t, k, 60, true); clouds(g, vw, t * 1.5, k, 110);
      sea(g, vw, t * 1.8, k, 250, 8); const bx = vw * 0.3; drawBoat(g, 'paper', bx, seaY(bx, t * 1.8, 250, 8), Math.sin(t * 1.8) * 0.14, k, L, 1, t); } },
  ],
  ending: [
    { ink: 'storm', text: 'In the middle of the storm, a tired man saw a light where no light should be.', draw(g, vw, t, k) { sky(g, vw, k, false); clouds(g, vw, t, k, 60, true); clouds(g, vw, t * 1.6, k, 115); sea(g, vw, t * 2, k, 250, 10);
      const tx = vw * 0.66; trawler(g, tx, seaY(tx, t * 2, 250, 10) - 5, 1, k, Math.sin(t * 2) * 0.1);
      const bx = vw * 0.3; g.fillStyle = L; g.globalAlpha = 0.14 + 0.05 * Math.sin(t * 3); g.beginPath(); g.arc(bx, seaY(bx, t * 2, 250, 10) - 26, 46, 0, 7); g.fill(); g.globalAlpha = 1; drawBoat(g, 'paper', bx, seaY(bx, t * 2, 250, 10), Math.sin(t * 2) * 0.14, k, L, 1, t); } },
    { ink: 'indigo', text: 'He turned his boat toward it. So did the others.', draw(g, vw, t, k) { sky(g, vw, k); hills(g, vw, k, 246, 7); drawMoon(g, vw * 0.3, 74, 22, k); sea(g, vw, t, k, 250, 5);
      const bx = vw * 0.22; drawBoat(g, 'paper', bx, seaY(bx, t, 250, 5), Math.sin(t) * 0.06, k, L, 1, t);
      for (let i = 0; i < 4; i++) { const x = vw * (0.42 + i * 0.16); trawler(g, x, seaY(x, t, 250, 5) - 4, 0.8 - i * 0.1, k, Math.sin(t + i) * 0.05, k.moon); } } },
    { ink: 'dawn', text: 'The moon never touched the boat. It only moved the water. Sometimes that is enough.', draw(g, vw, t, k) { sky(g, vw, k, false); hills(g, vw, k); drawMoon(g, vw * 0.8, 60, 16, k, true); sea(g, vw, t, k); shore(g, k, 170); house(g, 34, 228, k, L); pier(g, 150, 150, k); child(g, 286, 238, k, 1);
      const x = Math.max(340, vw - t * 16); trawler(g, x, seaY(x, t) - 4, 0.9, k, Math.sin(t) * 0.04); child(g, 262, 238, k); drawBoat(g, 'paper', 318, seaY(318, t), 0, k, L, 1, t); } },
  ],
};

export function drawPanel(g: G, view: View, p: Panel, t: number, fade: number) {
  const ink = inkById(p.ink);
  g.setTransform(view.scale, 0, 0, view.scale, 0, 0);
  p.draw(g, view.vw, t, ink);
  if (fade > 0) { g.fillStyle = '#0b0f1e'; g.globalAlpha = fade; g.fillRect(0, 0, view.vw, VH); g.globalAlpha = 1; }
}
