// Rough difficulty estimate: the bot with slow reactions and shaky aim, as a stand-in for a new player.
import { Sim } from '../src/sim/sim'; import { botInput } from './bot'; import { getLevel, NIGHT_COUNT } from '../src/sim/levels'; import { BOATS } from '../src/sim/boats'; import { mulberry } from '../src/sim/rng';
const rnd = mulberry(42);
for (let i = 0; i < NIGHT_COUNT; i++) {
  let wins = 0, hits = 0, flies = 0, time = 0; const N = 8; let tot = 0, par = 0;
  for (let k = 0; k < N; k++) {
    const lvl = getLevel(i); par = lvl.par; tot = lvl.flies.length;
    const sim = new Sim(lvl, { boat: BOATS[0], power: 'none', magnet: 0, hull: 0, streak: 0, viewW: 760 });
    const ideal = { sx: 150, y: 100 }, m = { sx: 150, y: 100 }, held = { sx: 150, y: 100 }; let lag = 0;
    while (sim.done === 'no' && sim.t < 300) {
      botInput(sim, ideal, 1 / 60); lag -= 1 / 60;
      if (lag <= 0) { lag = 0.3 + rnd() * 0.25; held.sx = ideal.sx + (rnd() - 0.5) * 70; held.y = ideal.y + (rnd() - 0.5) * 44; }
      m.sx += (held.sx - m.sx) * 0.12; m.y += (held.y - m.y) * 0.12;
      sim.update(1 / 60, { moonSX: m.sx, moonY: m.y, power: false });
    }
    if (sim.done === 'win') { wins++; time += sim.t; } hits += sim.hits; flies += sim.fliesGot / tot;
  }
  console.log(`night ${String(i + 1).padStart(2)} wins ${wins}/${N} avg hits ${(hits / N).toFixed(1)} flies ${(flies / N * 100).toFixed(0)}% avg time ${wins ? (time / wins).toFixed(0) : '-'} par ${par}`);
}
