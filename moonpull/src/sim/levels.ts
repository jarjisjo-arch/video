import { BASE, Level } from './types';
import { mulberry } from './rng';
import { PARS, STORMS } from './pars';

/* Level script, read left to right. Each swell token adds a trough and the crest after it.
   s<L>:<A>   swell of length L and height A (trough at BASE+A/2, crest at BASE-A/2)
   Modifiers, joined to a swell with '/':
     r<h>   reef breaking through this crest, h above the water (fly over it)
     a      low arch over this crest (hold to stay in the water)
     w      whale in this trough (a free launch)
     o<h>   lantern ring h above and just past this crest, where a flight passes
     f      fireflies along this swell's downslope
     F      fireflies over the far side of this crest, along a flight          */
export function build(script: string, lvl: Level) {
  const ex = lvl.ex, ey = lvl.ey;
  if (!ex.length) { ex.push(-500, 120); ey.push(BASE - 20, BASE - 20); }
  let x = ex[ex.length - 1], crestY = ey[ey.length - 1];
  for (const tok of script.trim().split(/\s+/)) {
    const [head, ...mods] = tok.split('/');
    if (head[0] !== 's') continue;
    const [L, A] = head.slice(1).split(':').map(Number);
    const tx = x + L / 2, ty = BASE + A / 2, cx = x + L, cy = BASE - A / 2, px = x, py = crestY;
    ex.push(tx, cx); ey.push(ty, cy);
    for (const m of mods) {
      const k = m[0], n = parseFloat(m.slice(1)) || 0;
      if (k === 'r') lvl.obs.push({ t: 'rock', x: cx + 18, w: 64, top: cy - (n || 8) });
      if (k === 'a') { const w = Math.min(240, L * 0.5); lvl.obs.push({ t: 'arch', x: cx - w * 0.6, w, bottom: cy - 34 }); }
      if (k === 'w') lvl.obs.push({ t: 'whale', x: tx - 80, w: 160 });
      if (k === 'o') lvl.obs.push({ t: 'ring', x: cx + 90, y: cy - (n || 30) });
      if (k === 'f') for (let i = 0; i < 4; i++) { const u = 0.1 + i * 0.1; lvl.flies.push({ x: px + L * u, y: py + (ty - py) * (1 - Math.cos(Math.PI * u * 2)) / 2 - 14 }); }
      if (k === 'F') for (let i = 0; i < 5; i++) { const d = 40 + i * 55; lvl.flies.push({ x: cx + d, y: cy - 34 - 26 * Math.sin((i / 4) * Math.PI) + i * 6 }); }
    }
    x = cx; crestY = cy;
  }
  return x;
}

export function blank(id: string, coast: number, index: number): Level {
  return { id, coast, index, ex: [], ey: [], length: Infinity, obs: [], flies: [], storm: { v0: 220, v1: 280, gap: 700 }, par: 60 };
}

export const COASTS = [
  { name: 'Quiet Bay', sub: 'Where he learned the water' },
  { name: 'Lantern Reach', sub: 'Where the lights gather' },
  { name: 'Stormwater', sub: 'Where the fleet was lost' },
];

// [script, unused, unused, letter line]. Storm speeds and par times are measured by tools/bot.ts --write.
const N: [string, number, number, string][] = [
  // ---- Quiet Bay
  ['s520:60/f s600:70 s640:80/F s600:70/f s700:90 s640:80/F s560:70 s700:90/f s760:100/F s640:80 s700:90/F s600:70 s760:100/f s700:90', 0, 0, 'Baba, I folded this boat the way you showed me.'],
  ['s560:70/f s640:80/F s720:100 s600:70/o20 s760:110/F s640:80 s720:100/o25 s600:70/f s800:120/F s680:90 s720:100/o20 s640:80/F s780:110 s700:90', 0, 0, 'The storm took the whole fleet out past the bay.'],
  ['s560:70 s680:90/F s720:100/r4 s640:80/f s700:90/F s760:100/r5 s640:80 s720:100/o20 s680:90/r5 s760:110/F s640:80/f s720:100/r7 s700:90 s760:100', 0, 0, 'Everyone says to wait. I am not good at waiting.'],
  ['s600:80/f s700:90/r5 s640:80/F s760:110/r7 s680:90/o25 s720:100/f s800:120/r8 s640:80/F s720:100/r7 s700:90/o20 s780:110/F s640:80/r7 s720:100 s760:110', 0, 0, 'So I lit your lantern and set it on the water.'],
  ['s600:80/f s700:90 s640:70/a s700:90/F s760:100/r5 s620:70/a s720:100/F s680:90/o20 s600:70/a s760:110/f s700:90/r7 s640:80/a s720:100/F s780:110', 0, 0, 'It is small. The sea is not.'],
  ['s620:80/F s720:100/r6 s600:70/a s740:100/o25 s680:90/r7 s620:70/a s780:110/F s700:90/f s640:80/a s760:110/r8 s700:90/o25 s620:70/a s780:110/F s720:100/r8 s760:110', 0, 0, 'But the moon is out, and the tide is kind tonight.'],
  ['s600:80/f s700:90 s900:110/w s700:90/F s760:100/r7 s680:90/o35 s900:120/w s640:80/F s720:100/a s760:110/r8 s880:120/w s700:90/o45 s760:100/F s700:90', 0, 0, 'I think the moon is helping. Do not laugh.'],
  ['s640:80/f s740:100/r7 s620:70/a s900:120/w s720:100/o45 s780:110/r9 s640:80/a s760:110/F s700:90/r8 s900:120/w s740:100/o45 s640:80/a s800:110/r9 s720:100/F s780:110 s700:90', 0, 0, 'Now it is past the bay. Past where I can see.'],
  // ---- Lantern Reach
  ['s600:80/f s760:110/o25 s700:90/o35 s820:120/F s680:90/r8 s760:110/o35 s640:80/o25 s800:120/F s720:100/r8 s780:110/o45 s700:90/f s820:120/o45 s760:110', 0, 0, 'Mama says the reach is full of other lights.'],
  ['s620:80/F s760:110/r8 s640:80/r7 s780:110/o35 s700:90/r9 s620:70/a s820:120/F s700:90/r9 s640:80/r8 s780:110/o45 s720:100/r9 s640:80/a s800:120/F s740:100', 0, 0, 'Other lanterns. Other people waiting.'],
  ['s600:80/f s720:100/a s640:80/a s780:110/F s700:90/r8 s620:70/a s680:90/a s820:120/o45 s720:100/r9 s640:80/a s700:90/a s800:120/F s740:100/r9 s780:110', 0, 0, 'I drew your map from memory. It is mostly right.'],
  ['s620:80/f s900:130/w s720:100/o55 s680:90/r9 s900:130/w s760:110/o65 s640:80/a s880:130/w s740:100/F s780:110/r10 s900:130/w s720:100/o65 s800:110/F s760:110', 0, 0, 'I counted nine nights. I kept your dinner anyway.'],
  ['s600:80 s700:90/r9 s560:70/r7 s740:100/o35 s600:70/a s760:110/r10 s580:70/r8 s800:120/F s640:80/a s720:100/r10 s600:70/r8 s820:120/o45 s700:90/a s760:110/F s720:100', 0, 0, 'Your coat is still on the hook by the door.'],
  ['s620:80/F s800:120/o45 s680:90/r10 s900:130/w s700:90/a s760:110/r10 s620:80/a s840:120/o55 s700:90/r10 s900:130/w s740:100/o65 s640:80/a s800:120/r10 s720:100/F s780:110', 0, 0, 'The lights out here are kind to each other.'],
  ['s600:80/f s760:110/r7 s600:70/a s820:120/r7 s640:80/a s900:130/w s720:100/o65 s780:110/r7 s620:70/a s840:120/r7 s680:90/a s760:110/o55 s900:130/w s740:100/r7 s800:120/F s760:110', 0, 0, 'Some of them follow mine for a while.'],
  ['s640:80/F s800:120/r10 s620:70/a s580:70/r8 s860:130/o55 s700:90/a s900:130/w s760:110/r10 s640:80/a s820:120/r11 s700:90/o55 s600:70/a s880:130/w s760:110/r11 s680:90/a s800:120/F s760:110', 0, 0, 'The reach is behind it now. I felt it.'],
  // ---- Stormwater
  ['s640:90/f s800:120 s720:110/r7 s860:130/F s760:120/r8 s680:100/a s840:130/o45 s760:120/r8 s900:140/F s720:110/r8 s820:130/o55 s700:100/a s880:140/F s800:120', 0, 0, 'The clouds are coming in. I can hardly see the moon.'],
  ['s660:90/F s820:130/r8 s700:100/a s900:140/w s780:120/r9 s660:90/a s860:130/o55 s740:110/r9 s900:140/w s700:100/a s840:130/r9 s760:120/F s880:140/o55 s800:120', 0, 0, 'When it goes dark I hold my breath.'],
  ['s640:90/f s800:120/r7 s600:80/r6 s840:130/r8 s680:100/a s620:90/a s880:140/F s740:110/r8 s620:90/r7 s860:130/o55 s700:100/a s640:90/a s900:140/w s780:120/r8 s820:130', 0, 0, 'Then the light comes back and so does the tide.'],
  ['s660:90/F s860:130/r7 s720:110/a s900:140/w s760:120/r7 s640:90/a s880:140/o65 s720:110/r7 s600:80/r6 s860:130/F s700:100/a s900:140/w s760:120/r7 s680:100/a s860:130/r7 s800:120', 0, 0, 'I think this is where the wind turned on you.'],
  ['s640:90/f s820:130/r9 s600:80/a s860:130/r9 s620:90/a s900:140/w s740:110/o65 s820:130/r9 s620:90/a s600:80/r8 s880:140/F s700:100/a s840:130/r9 s640:90/a s900:140/w s800:120', 0, 0, 'I am not scared. I am a little scared.'],
  ['s660:90/F s880:140/r7 s680:100/a s620:90/r6 s900:140/w s760:120/r7 s640:90/a s860:130/o65 s700:100/r7 s620:90/a s880:140/r8 s700:100/a s900:140/w s780:120/r7 s660:90/a s860:130/F s820:130', 0, 0, 'A boat this small should not get this far.'],
  ['s640:90/f s860:130/r9 s620:90/a s880:140/r10 s640:90/a s600:80/r8 s900:140/w s780:120/r10 s640:90/a s860:130/o65 s700:100/r10 s620:90/a s900:140/w s760:120/r10 s640:90/a s880:140/r10 s800:120', 0, 0, 'If you see a light on the water, it is ours.'],
  ['s660:90/F s900:140/r7 s680:100/a s620:90/r6 s900:140/w s780:120/r7 s640:90/a s880:140/o75 s700:100/r7 s620:90/a s600:80/r5 s900:140/w s760:120/r8 s640:90/a s880:140/r8 s680:100/a s900:140/w s840:130/F s820:130', 0, 0, 'Come home, Baba. I will be on the shore.'],
];
export const NIGHT_COUNT = N.length;

export function getLevel(i: number): Level {
  const [script, , , line] = N[i];
  const lvl = blank('n' + (i + 1), Math.floor(i / 8), i);
  build(script, lvl);
  // harbour stretch: a few calm swells
  build('s700:60 s800:50 s900:40', lvl);
  lvl.length = lvl.ex[lvl.ex.length - 5];
  const sv = STORMS[i]; lvl.storm = sv ? { v0: sv[0], v1: sv[1], gap: 760 } : { v0: 0, v1: 0, gap: 99999 };
  lvl.par = PARS[i] ?? 60; lvl.line = line;
  return lvl;
}

const BITS = ['s{L}:{A}', 's{L}:{A}/F', 's{L}:{A}/f', 's{L}:{A}/r{R}', 's{L}:{A}/a', 's{L}:{A}/o{O}', 's900:{B}/w', 's{L}:{A}/r{R} s{L}:{A}/a'];
/** Endless Night, Daily Tide and Drift: an endless supply of swells. */
export function generator(seed: number, mode: 'endless' | 'daily' | 'drift') {
  const rnd = mulberry(seed); let last = -1;
  return (lvl: Level, toX: number) => {
    while (lvl.ex[lvl.ex.length - 1] < toX) {
      const x = lvl.ex[lvl.ex.length - 1];
      const d = mode === 'endless' ? Math.min(1, x / 40000) : mode === 'daily' ? 0.6 : 0;
      let k = mode === 'drift' ? (rnd() < 0.5 ? 1 : 5) : Math.floor(rnd() * Math.min(BITS.length, 3 + d * 6));
      if (k === last && k > 2) k = 1; last = k;
      const L = Math.round(600 + rnd() * 260), A = Math.round(L * (0.12 + rnd() * 0.04)), R = Math.round(4 + d * 8), O = Math.round(80 + rnd() * 40);
      const tok = BITS[k].replace(/\{L\}/g, String(L)).replace(/\{A\}/g, String(A)).replace('{R}', String(R)).replace('{O}', String(O)).replace('{B}', String(Math.round(120 + d * 20)));
      build(tok + (k >= 3 && mode !== 'drift' ? ` s${L}:${A}` : ''), lvl);
    }
    // forget what is far behind
    const cut = mode === 'daily' ? -1 : lvl.ex.findIndex(v => v > toX - 9000);
    if (cut > 4) { lvl.ex.splice(0, cut - 2); lvl.ey.splice(0, cut - 2); }
  };
}
export function specialLevel(mode: 'endless' | 'daily' | 'drift', seed: number): { lvl: Level; gen?: (l: Level, x: number) => void } {
  const lvl = blank(mode, mode === 'drift' ? 0 : mode === 'daily' ? seed % 3 : 2, -1);
  build('s560:60/f s640:80/F', lvl);
  if (mode === 'daily') { generator(seed, 'daily')(lvl, 14000); lvl.length = lvl.ex[lvl.ex.length - 3]; lvl.storm = { v0: 250, v1: 320, gap: 760 }; return { lvl }; }
  lvl.storm = mode === 'endless' ? { v0: 210, v1: 420, gap: 800 } : { v0: 0, v1: 0, gap: 99999 };
  return { lvl, gen: generator(seed, mode) };
}
