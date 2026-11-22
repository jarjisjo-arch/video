import { Sim } from '../src/sim/surf';
import { build, blank } from '../src/sim/levels';
import { decide } from './brain';
const boat = { id: 'paper', grav: 1, air: 1, land: 1, hearts: 3 };
const sets: [string, string][] = [['L500', 's500:70 '.repeat(24)], ['L700', 's700:100 '.repeat(18)], ['L900', 's900:130 '.repeat(14)], ['mixed', 's520:70 s760:110 s900:140 s600:80 '.repeat(5)]];
for (const [name, sc] of sets) for (const pol of ['skill', 'naive', 'idle']) {
  const l = blank('t', 0, 0); build(sc, l); l.length = l.ex[l.ex.length - 1] - 400;
  const sim = new Sim(l, { boat, magnet: 0, hearts: 3, noStorm: true });
  const land = { perfect: 0, good: 0, bad: 0 }; const vs: number[] = []; let flights = 0;
  while (sim.done === 'no' && sim.t < 200) {
    const h = pol === 'skill' ? decide(sim) : pol === 'naive' ? (!sim.b.air && sim.surf.d1(sim.b.x) > 0) : false;
    sim.update(1 / 60, h);
    for (const e of sim.events) if (e.k === 'land' && e.air > 0.2) { land[e.q]++; flights++; }
    sim.events.length = 0; vs.push(sim.b.s);
  }
  vs.sort((a, b) => a - b);
  console.log(name.padEnd(6), pol.padEnd(6), `t=${sim.t.toFixed(1)}s len=${l.length | 0} v10/50/90=${vs[vs.length * .1 | 0] | 0}/${vs[vs.length * .5 | 0] | 0}/${vs[vs.length * .9 | 0] | 0} flights=${flights} p/g/b=${land.perfect}/${land.good}/${land.bad} air=${sim.airTotal.toFixed(1)} best=${sim.bestAir.toFixed(2)} avgSwell=${(sim.t / (l.ex.length / 2)).toFixed(2)}s`);
}
