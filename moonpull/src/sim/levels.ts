import { Fly, LevelDef, Ob, SEA } from './types';
import { mulberry } from './rng';

/* Level script: space separated tokens placed left to right.
   g<n>           open water for n units
   r<top>[:w]     reef whose tip is at y=top (needs high water)
   o<bottom>[:w]  overhang with underside y=bottom (needs low water)
   b<top>:<w>     sandbar (strands the boat unless the tide covers it)
   w              whirlpool
   c<w>[:h|l]     cloud bank over the next w units, high or low in the sky (does not advance)
   t<w>           riptide over the next w units (does not advance)
   fh fl fw       firefly trails: high, low, wave
*/
export function build(script: string, start = 420): { obs: Ob[]; flies: Fly[]; end: number } {
  const obs: Ob[] = [], flies: Fly[] = [];
  let x = start;
  for (const tok of script.trim().split(/\s+/)) {
    const k = tok[0], rest = tok.slice(1), a = rest.split(':');
    const n0 = parseFloat(a[0]), n1 = a[1] !== undefined ? parseFloat(a[1]) : NaN;
    if (k === 'g') x += n0;
    else if (k === 'r') {
      const w = isNaN(n1) ? 110 : n1;
      obs.push({ t: 'reef', x, w, top: n0 });
      const c = x + w / 2;
      flies.push({ x: c - 46, y: n0 - 34 }, { x: c, y: n0 - 40 }, { x: c + 46, y: n0 - 34 });
      x += w;
    } else if (k === 'o') {
      const w = isNaN(n1) ? 130 : n1;
      obs.push({ t: 'over', x, w, bottom: n0 });
      for (let i = 1; i <= 3; i++) flies.push({ x: x + (w * i) / 4, y: SEA - 22 });
      x += w;
    } else if (k === 'b') {
      obs.push({ t: 'bar', x, w: n1, top: n0 });
      const m = Math.max(2, Math.floor(n1 / 70));
      for (let i = 1; i <= m; i++) flies.push({ x: x + (n1 * i) / (m + 1), y: n0 - 34 });
      x += n1;
    } else if (k === 'w') {
      obs.push({ t: 'whirl', x: x + 60, w: 0 });
      flies.push({ x: x + 20, y: 196 }, { x: x + 60, y: 186 }, { x: x + 100, y: 196 });
      x += 120;
    } else if (k === 'c') {
      const low = a[1] === 'l';
      obs.push({ t: 'cloud', x, w: n0, y0: low ? 108 : 0, y1: low ? 200 : 104 });
    } else if (k === 't') {
      obs.push({ t: 'rip', x, w: n0 });
    } else if (k === 'f') {
      const kind = rest;
      for (let i = 0; i < 5; i++) {
        const fx = x + 20 + i * 42;
        const y = kind === 'h' ? 186 - Math.sin((i / 4) * Math.PI) * 14 : kind === 'l' ? SEA - 22 : 208 - Math.sin((i / 4) * Math.PI * 2) * 22;
        flies.push({ x: fx, y });
      }
      x += 210;
    }
  }
  return { obs, flies, end: x + 380 };
}

export const COASTS = [
  { name: 'Quiet Bay', sub: 'Where he learned the water', ink: 'indigo' },
  { name: 'The Shallows', sub: 'Sandbars and turning water', ink: 'plum' },
  { name: 'Stormwater', sub: 'Where the fleet was lost', ink: 'storm' },
];

// [script, moon pull, letter line]
const NIGHTS: [string, number, string][] = [
  // ---- Quiet Bay
  ['g200 fl g260 fh g240 r244 g320 fw g200 r240 g300', 1, 'Baba, I folded this boat the way you showed me.'],
  ['g200 r242 g300 fh g200 r236 g320 fl g160 r238 g280', 1, 'The storm took the whole fleet out past the bay.'],
  ['g200 fl g200 o192 g320 r240 g300 o196 g280 fw g200', 1, 'Everyone says to wait. I am not good at waiting.'],
  ['g200 r236 g340 o198 g300 fh g160 r232 g340 o200:160 g260', 1, 'So I lit your lantern and set it on the water.'],
  ['g180 fh g160 r230 g280 r236 g320 o200 g260 fw g140 r228 g280', 1, 'It is small. The sea is not.'],
  ['g200 o200:170 g300 r230 g300 o202 g280 r226:130 g300 fl g200', 1, 'But the moon is out, and the tide is kind tonight.'],
  ['g180 r230 g250 o202 g250 r226 g270 fh g140 o204:150 g240 r232 g260', 1, 'I think the moon is helping. Do not laugh.'],
  ['g180 fw g140 r224:130 g260 r230 g260 o204 g230 o200 g260 r222:130 g280', 1, 'It passed the rocks where we caught the big one.'],
  ['g180 o204:160 g230 r224 g220 o206 g260 fh g120 r220:130 g250 o204 g230 r226 g260', 1, 'It passed under the old bridge without touching.'],
  ['g180 r222:130 g215 o206 g215 r220:130 g230 fw g120 o206:170 g215 r218:130 g230 o204 g215 r224 g280', 1, 'Now it is past the bay. Past where I can see.'],
  // ---- The Shallows
  ['g200 fl g200 b238:240 g340 fh g200 b236:260 g300 r232 g280', 1, 'Mama says the shallows turn boats around.'],
  ['g200 b236:260 g320 w g320 fw g160 b234:240 g300', 1, 'She says you always knew the way through.'],
  ['g200 w g300 r230 g280 b234:280 g300 o202 g260 w g280', 0.95, 'I drew your map from memory. It is mostly right.'],
  ['g180 b232:300 g260 o204 g260 w g260 r226:130 g260 b234:240 g280', 0.95, 'There are other lights out here. Small ones.'],
  ['g180 fh g140 w g240 b230:300 g240 r224:130 g240 w g240 o204:150 g260', 0.95, 'I think other people sent lanterns too.'],
  ['g180 b230:340 g230 o206 g230 b232:260 g240 w g220 r222:130 g260 fw g180', 0.95, 'Someone is waiting for every one of them.'],
  ['g180 r224:130 g220 b230:300 g220 o206:160 g220 w g200 w g240 b232:260 g260', 0.9, 'The water spins here. Keep going, little boat.'],
  ['g180 w g210 o206 g210 b228:340 g210 r220:130 g220 o206 g210 w g230 fh g180', 0.9, 'I counted nine nights. I kept your dinner anyway.'],
  ['g180 b228:360 g200 w g200 o206:170 g200 r220:130 g200 b230:300 g200 w g210 r222:130 g260', 0.9, 'Your coat is still on the hook by the door.'],
  ['g180 w g190 b226:380 g190 o207 g190 r218:130 g190 w g190 b228:340 g190 o206:170 g190 r220:130 g280', 0.9, 'The shallows are behind it now. I felt it.'],
  // ---- Stormwater
  ['g200 fl g180 t420 g520 fh g200 r232 g300 t380 g480 fw g200', 0.9, 'The clouds are coming in. I can hardly see the moon.'],
  ['g200 c520:l g200 r232 g420 fl g200 c480:h g160 o204 g420 r228 g280', 0.9, 'When it goes dark I hold my breath.'],
  ['g200 t400 g180 r230 g420 c520:l g240 b234:260 g320 o204 g260 fh g180', 0.9, 'Then the light comes back and so does the tide.'],
  ['g180 c460:l g180 r232 g380 t420 g200 fw g300 w g300 c460:h g160 o205 g380 r226:130 g280', 0.85, 'I think this is where the wind turned on you.'],
  ['g180 t460 g180 b232:260 g380 c520:l g200 r234:130 g200 r236 g300 w g260 o205 g260', 0.85, 'I am not scared. I am a little scared.'],
  ['g180 c560:l g160 r234:130 g200 b236:260 g360 t440 g200 fw g260 o206 g300 w g220 r224:130 g280 fw g160', 0.85, 'A boat this small should not get this far.'],
  ['g180 t420 g160 fw g260 w g230 r224:130 g300 c560:l g180 b234:300 g200 r224:130 g330 c420:h g140 o206:160 g420', 0.8, 'But it has. So maybe you have too.'],
  ['g180 c600:l g170 b234:300 g260 r222:130 g380 t420 g150 r224:130 g330 o206 g190 w g330 r222:130 g210 o206 g260', 0.8, 'If you see a light on the water, it is ours.'],
  ['g180 t440 g150 r222:130 g360 o206:160 g300 c620:l g160 r236 g190 b234:340 g200 r220:130 g340 t380 g140 fh g200 w g300', 0.8, 'Follow it. It knows the way back. I made sure.'],
  ['g180 c640:l g160 r234:130 g190 b234:320 g420 t420 g140 r222:130 g330 o207 g190 r218:130 g380 c520:h g140 o206:170 g200 t420 g140 r220:130 g200 w g460', 0.8, 'Come home, Baba. I will be on the shore.'],
];

export const NIGHT_COUNT = NIGHTS.length;
// par times measured by tools/bot.ts (seconds), see PARS below
import { PARS } from './pars';

const KINDS = [['r', 'o', 'f', 'ro'], ['r', 'o', 'f', 'b', 'w', 'ro'], ['r', 'o', 'f', 'b', 'w', 't', 'c', 'ro']];

export function getLevel(i: number): LevelDef {
  const [script, pull, line] = NIGHTS[i];
  const b = build(script);
  const coast = Math.floor(i / 10), k = (i % 10) / 9;
  const level: LevelDef = { id: 'n' + (i + 1), coast, night: i + 1, length: 0, obs: b.obs, flies: b.flies, pull, par: Math.round((PARS[i] ?? 80) * 1.12), line };
  const target = 6200 + i * 70;
  const from = b.end - 380 + 260;
  if (from < target) {
    generator(9000 + i * 131, { kinds: KINDS[coast], fixedDiff: [0.15, 0.42, 0.55][coast] + k * [0.45, 0.4, 0.4][coast], pull })(from, target, level);
  }
  let end = from;
  for (const o of level.obs) end = Math.max(end, o.x + o.w);
  for (const f of level.flies) end = Math.max(end, f.x);
  level.length = end + 420;
  return level;
}

/** Procedural chunks for the tail of each night, Endless Night, Daily Tide and Drift. */
export function generator(seed: number, opts: { ramp?: boolean; calm?: boolean; fixedDiff?: number; kinds?: string[]; pull?: number }) {
  const rnd = mulberry(seed);
  const kinds = opts.kinds ?? KINDS[2];
  let last = '', cur = 0;
  return (from: number, to: number, level: LevelDef) => {
    let x = Math.max(cur, from);
    while (x < to) {
      const d = opts.fixedDiff ?? (opts.ramp ? Math.min(1, 0.1 + x / 30000) : 0.5);
      let s = '';
      if (opts.calm) {
        s = ['fh g160', 'fl g140', 'fw g160', 'g200'][Math.floor(rnd() * 4)];
      } else {
        const gap = Math.round(340 - d * 140 + rnd() * 80);
        let pick = kinds[Math.floor(rnd() * kinds.length)];
        if (pick === last || (pick === 'ro' && d < 0.3)) pick = rnd() < 0.5 ? 'r' : 'o';
        last = pick;
        const reefTop = Math.round(242 - d * 40 * Math.pow(opts.pull ?? 1, 2) - rnd() * 5);
        const overB = Math.round(195 + d * 14);
        const rw = d > 0.5 ? ':130' : '';
        switch (pick) {
          case 'r': s = `r${reefTop}${rw}`; break;
          case 'o': s = `o${overB}:${Math.round(130 + rnd() * 50)}`; break;
          case 'f': s = ['fh', 'fw', 'fl'][Math.floor(rnd() * 3)]; break;
          case 'b': s = `b${Math.round(238 - d * 9)}:${Math.round(220 + d * 150)}`; break;
          case 'w': s = 'w'; break;
          case 't': s = `g200 t${Math.round(360 + d * 140)} g${Math.round(150 + d * 60)} ${rnd() < 0.5 ? 'fw' : 'r' + reefTop} g${Math.round(120 + d * 80)}`; break;
          case 'c': s = `c${Math.round(340 + d * 40)}:${rnd() < 0.7 ? 'l' : 'h'} g170 ${rnd() < 0.6 ? 'r' + Math.max(234, reefTop) + rw : 'b236:240'}`; break;
          default: s = rnd() < 0.5 ? `r${reefTop}${rw} g${Math.round(250 - d * 90)} o${overB}` : `o${overB} g${Math.round(230 - d * 90)} r${reefTop}${rw}`; break;
        }
        s += ` g${gap}`;
      }
      const b = build(s, x);
      level.obs.push(...b.obs); level.flies.push(...b.flies);
      x = b.end - 380;
    }
    cur = x;
  };
}

export function specialLevel(mode: 'endless' | 'daily' | 'drift', seed: number): { level: LevelDef; gen?: (a: number, b: number, l: LevelDef) => void } {
  const level: LevelDef = { id: mode, coast: mode === 'drift' ? 0 : 2, night: 0, length: Infinity, obs: [], flies: [], pull: 1, par: 0 };
  if (mode === 'daily') {
    const g = generator(seed, { fixedDiff: 0.6, pull: 0.9 });
    g(500, 8200, level);
    let end = 0; for (const o of level.obs) end = Math.max(end, o.x + o.w);
    level.length = end + 420; level.coast = seed % 3; level.pull = 0.9;
    return { level };
  }
  return { level, gen: generator(seed, { ramp: mode === 'endless', calm: mode === 'drift' }) };
}
