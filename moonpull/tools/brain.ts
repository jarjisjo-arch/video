// A reasonable player: hold on downslopes, release on upslopes, dive in the air when that gives a cleaner landing.
import { Sim, G, DIVE } from '../src/sim/surf';
import { Level } from '../src/sim/types';
import { BOATS } from '../src/sim/boats';

function predict(sim: Sim, dive: boolean) {
  const b = sim.b, S = sim.surf, st = sim.cfg.boat;
  let x = b.x, y = b.y, vx = b.vx, vy = b.vy; const dt = 1 / 60;
  for (let i = 0; i < 240; i++) {
    vy += G * st.air * (dive ? DIVE : 1) * dt; x += vx * dt; y += vy * dt;
    const sy = S.y(x);
    if (y >= sy) { const d = Math.abs(Math.atan2(vy, vx) - Math.atan(S.d1(x))); return { x, y, diff: d, down: S.d1(x) > 0.06, ok: !hitsRock(sim, x, y) }; }
    if (hitsAnything(sim, x, y)) return { x, y, diff: 9, down: false, ok: false };
  }
  return { x, y, diff: 1, down: false, ok: true };
}
function hitsRock(sim: Sim, x: number, y: number) { for (const o of sim.lvl.obs) if (o.t === 'rock' && y - 5 > sim.rockTop(o, x)) return true; return false; }
function hitsAnything(sim: Sim, x: number, y: number) {
  for (const o of sim.lvl.obs) { if (o.t === 'rock' && y - 5 > sim.rockTop(o, x)) return true; if (o.t === 'arch' && y - 26 < sim.archBottom(o, x)) return true; }
  return false;
}
/** returns whether to hold, given a skill 0..1 (1 = sharp) */
export function decide(sim: Sim, skill = 1): boolean {
  const b = sim.b, S = sim.surf;
  // arches: stay pressed into the water from just before until past
  for (const o of sim.lvl.obs) if (o.t === 'arch' && o.x - b.x < 260 && o.x + o.w - b.x > -30) return true;
  // rocks ahead in the next trough: do not press on the upslope before them, launch instead
  if (!b.air) {
    const d1 = S.d1(b.x);
    if (d1 > 0.02) {
      // pressing on a downslope only pays if we are not about to land in a rock-filled trough with too little speed
      return true;
    }
    return false;
  }
  if (b.vy < -40 && skill < 1) return false;
  const a = predict(sim, false), d = predict(sim, true);
  const score = (p: any) => (p.ok ? 0 : 10) + (p.down ? 0 : 1) + p.diff;
  return score(d) + 0.05 < score(a);
}
export function run(lvl: Level, boatId = 0, maxT = 300) {
  
  const sim = new Sim(lvl, { boat: BOATS[boatId], magnet: 0, hearts: BOATS[boatId].hearts });
  while (sim.done === 'no' && sim.t < maxT) { sim.update(1 / 60, decide(sim)); }
  return sim;
}
