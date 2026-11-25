// Gemfall level data.
// Layout legend (one character per cell, 8 columns per row):
//   .  gem
//   _  hole (not part of the board)
//   i  gem on glowing ice (1 layer)
//   I  gem on thick ice (2 layers)
//   s  stone block (1 hit)
//   S  thick stone block (2 hits)
//   l  gem locked by a chain
//   k  chained gem on ice
//   c  creeping crystal (spreads to a nearby gem each turn none is broken)
//   b  gem carrying a fuse bomb
// Goal types: score, ice, stone, lock, crystal, chest, collect (color index: 0 ruby, 1 topaz, 2 emerald, 3 sapphire, 4 amethyst, 5 pearl)
// Optional: bombs: { rate, fuse } makes fuse bombs drop in; stars default to a score scale based on moves.

const FULL = ['........', '........', '........', '........', '........', '........', '........', '........'];

export const LEVELS = [
  {
    moves: 15, colors: 5, stars: [1200, 6000, 10000], layout: FULL,
    goals: [{ type: 'score', target: 1200 }],
    tip: 'Swap two gems next to each other to line up 3 of the same kind.'
  },
  {
    moves: 18, colors: 5, stars: [3000, 9000, 15000], layout: FULL,
    goals: [{ type: 'collect', color: 0, target: 15 }, { type: 'collect', color: 3, target: 15 }],
    tip: 'Match 4 in a line to make a Streak gem. It blasts a whole row or column!'
  },
  {
    moves: 20, colors: 5, stars: [3000, 9000, 14000],
    layout: ['........', '........', '..iiii..', '..iiii..', '..iiii..', '..iiii..', '........', '........'],
    goals: [{ type: 'ice' }],
    tip: 'Glowing ice hides under some gems. Make matches on top of it to crack it.'
  },
  {
    moves: 22, colors: 5, stars: [4000, 11000, 18000], layout: FULL,
    goals: [{ type: 'collect', color: 2, target: 20 }, { type: 'collect', color: 4, target: 20 }],
    tip: 'Match in an L or T shape to make a Burst gem. It explodes twice!'
  },
  {
    moves: 22, colors: 5, stars: [4000, 11000, 18000],
    layout: ['........', '........', '........', '........', 'ss....ss', 'ss....ss', '..ssss..', '........'],
    goals: [{ type: 'stone' }],
    tip: 'Stone blocks crack when you match gems right next to them.'
  },
  {
    moves: 28, colors: 5, stars: [4000, 9000, 14000],
    layout: ['___..___', '__.ii.__', '_.iiii._', '.iiiiii.', '.iiiiii.', '_.iiii._', '__.ii.__', '___..___'],
    goals: [{ type: 'ice' }],
    tip: 'Line up 5 to make a Prism. Swap it with any gem to clear every gem of that color!'
  },
  {
    moves: 30, colors: 5, stars: [4000, 9000, 14000], layout: FULL,
    goals: [{ type: 'chest', target: 2 }],
    tip: 'Bring the treasure chests down to the bottom row to collect them.'
  },
  {
    moves: 32, colors: 5, stars: [6000, 13000, 20000],
    layout: ['........', '.iiiiii.', '.i....i.', '.i.ss.i.', '.i.ss.i.', '.i....i.', '.iiiiii.', '........'],
    goals: [{ type: 'ice' }, { type: 'stone' }],
    tip: 'Swap two special gems together for a giant combo!'
  },
  {
    moves: 20, colors: 5, stars: [6000, 12000, 18000], layout: FULL,
    goals: [{ type: 'score', target: 6000 }]
  },
  {
    moves: 25, colors: 5, stars: [6000, 12000, 18000],
    layout: ['........', '........', 'S.S..S.S', '........', '.S.SS.S.', '........', '........', '........'],
    goals: [{ type: 'stone' }, { type: 'collect', color: 1, target: 20 }],
    tip: 'Thick stones need two hits to break.'
  },
  {
    moves: 32, colors: 6, stars: [5000, 10000, 15000],
    layout: ['........', '........', '........', '........', '........', 'iiiiiiii', 'IIIIIIII', '........'],
    goals: [{ type: 'ice' }],
    tip: 'Thick ice needs two matches on top of it.'
  },
  {
    moves: 32, colors: 5, stars: [8000, 16000, 26000],
    layout: ['........', '........', '_......_', '__....__', '__....__', '_......_', '........', '........'],
    goals: [{ type: 'chest', target: 2 }]
  },
  {
    moves: 28, colors: 5, stars: [8000, 16000, 24000],
    layout: ['........', '........', 'ssssssss', 'iiiiiiii', 'iiiiiiii', '........', '........', '........'],
    goals: [{ type: 'stone' }, { type: 'ice' }],
    tip: 'Break through the stone wall to reach the ice below.'
  },
  {
    moves: 24, colors: 5, stars: [6000, 12000, 18000], layout: FULL,
    goals: [{ type: 'collect', color: 0, target: 20 }, { type: 'collect', color: 2, target: 20 }, { type: 'collect', color: 3, target: 20 }]
  },
  {
    moves: 32, colors: 6, stars: [6000, 11000, 17000],
    layout: ['__....__', '__.ii.__', '..iiii..', '.iiIIii.', '.iiIIii.', '..iiii..', '__.ii.__', '__....__'],
    goals: [{ type: 'ice' }]
  },
  {
    moves: 30, colors: 5, stars: [10000, 22000, 34000],
    layout: ['........', '........', '........', 's.s..s.s', '........', '.s.ss.s.', '........', '........'],
    goals: [{ type: 'chest', target: 2 }, { type: 'stone' }]
  },
  {
    moves: 26, colors: 5, stars: [12000, 18000, 26000], layout: FULL,
    goals: [{ type: 'score', target: 12000 }]
  },
  {
    moves: 34, colors: 5, stars: [10000, 20000, 30000],
    layout: ['........', '........', '.sSSSSs.', '.siiiis.', '.siiiis.', '.sSSSSs.', '........', '........'],
    goals: [{ type: 'stone' }, { type: 'ice' }],
    tip: 'Burst and Streak gems smash stones from a distance.'
  },
  {
    moves: 34, colors: 6, stars: [8000, 15000, 24000],
    layout: ['........', '........', '........', 'i.i.i.i.', '.i.i.i.i', 'i.i.i.i.', '.i.i.i.i', 'i.i.i.i.'],
    goals: [{ type: 'ice' }, { type: 'chest', target: 2 }]
  },
  {
    moves: 38, colors: 6, stars: [10000, 20000, 32000],
    layout: ['_......_', '..iiii..', '.iSiiSi.', '.ii..ii.', '.ii..ii.', '.iSiiSi.', '..iiii..', '_......_'],
    goals: [{ type: 'ice' }, { type: 'stone' }, { type: 'chest', target: 2 }],
    tip: 'A tough one! Use everything you have learned so far.'
  },
  // ---------- Glowing Depths (continued): chains arrive ----------
  {
    moves: 17, colors: 5,
    layout: ['........', '........', '........', '.llllll.', '........', '........', '........', '........'],
    goals: [{ type: 'lock' }],
    tip: 'Chains lock gems in place. Match a chained gem to snap its chain.'
  },
  {
    moves: 24, colors: 5,
    layout: ['........', 'iiiiiiii', '........', '..llll..', '..llll..', '........', 'iiiiiiii', '........'],
    goals: [{ type: 'ice' }, { type: 'lock' }]
  },
  {
    moves: 26, colors: 5,
    layout: ['l......l', '.l....l.', '..l..l..', '...ll...', '...ll...', '..l..l..', '.l....l.', 'l......l'],
    goals: [{ type: 'lock' }, { type: 'collect', color: 3, target: 20 }]
  },
  {
    moves: 20, colors: 5, stars: [6000, 10000, 15000], layout: FULL,
    goals: [{ type: 'score', target: 6000 }]
  },
  {
    moves: 20, colors: 5,
    layout: ['........', '........', '........', '........', '........', '........', 'cc....cc', 'cc....cc'],
    goals: [{ type: 'crystal' }],
    tip: 'Purple crystal grows onto a nearby gem every turn you don\'t break any. Match next to it to stop it!'
  },
  {
    moves: 24, colors: 5,
    layout: ['........', '........', '........', 'l.l..l.l', '........', '........', '........', '........'],
    goals: [{ type: 'chest', target: 2 }, { type: 'lock' }]
  },
  {
    moves: 18, colors: 5,
    layout: ['_......_', '__....__', '...ss...', '.iissii.', '.iissii.', '...ss...', '__....__', '_......_'],
    goals: [{ type: 'stone' }, { type: 'ice' }]
  },
  // ---------- Frozen Grotto ----------
  {
    moves: 34, colors: 5,
    layout: ['iiiiiiii', 'i......i', 'i......i', 'i......i', 'i......i', 'i......i', 'i......i', 'iiiiiiii'],
    goals: [{ type: 'ice' }],
    tip: 'Ice on the edges is tricky. Streak gems reach all the way across!'
  },
  {
    moves: 26, colors: 5,
    layout: ['........', '........', 'iiiiiiii', 'iiiiiiii', '........', '........', 'c......c', 'cc....cc'],
    goals: [{ type: 'crystal' }, { type: 'ice' }]
  },
  {
    moves: 18, colors: 5, bombs: { rate: 0.03, fuse: 14 },
    layout: ['........', '........', '...b....', '........', '....b...', '........', '........', '........'],
    goals: [{ type: 'collect', color: 0, target: 25 }],
    tip: 'Fuse bombs count down every move. Match them before they reach zero, or the level ends!'
  },
  {
    moves: 16, colors: 5, layout: FULL,
    goals: [{ type: 'collect', color: 1, target: 20 }, { type: 'collect', color: 2, target: 20 }]
  },
  {
    moves: 24, colors: 5,
    layout: ['........', '.s.ll.s.', '..l..l..', '.l.ss.l.', '.l.ss.l.', '..l..l..', '.s.ll.s.', '........'],
    goals: [{ type: 'lock' }, { type: 'stone' }]
  },
  {
    moves: 30, colors: 5,
    layout: ['........', '........', '........', '........', '........', 'c......c', 'cc....cc', 'ccc..ccc'],
    goals: [{ type: 'chest', target: 2 }, { type: 'crystal' }]
  },
  {
    moves: 38, colors: 5,
    layout: ['iiiiiiii', '_iiiiii_', '__....__', '___..___', '___..___', '__....__', '_iiiiii_', 'iiiiiiii'],
    goals: [{ type: 'ice' }]
  },
  {
    moves: 32, colors: 5, bombs: { rate: 0.03, fuse: 12 },
    layout: ['........', 'kkkkkkkk', '........', '........', '........', '........', 'kkkkkkkk', '........'],
    goals: [{ type: 'lock' }, { type: 'ice' }]
  },
  {
    moves: 22, colors: 5, stars: [7000, 12000, 18000], layout: FULL,
    goals: [{ type: 'score', target: 7000 }]
  },
  // ---------- Lava Forge ----------
  {
    moves: 16, colors: 5,
    layout: ['........', '........', '...cc...', '..cccc..', '..cccc..', '...cc...', '........', '........'],
    goals: [{ type: 'crystal' }]
  },
  {
    moves: 28, colors: 5,
    layout: ['........', '........', 'SS....SS', '........', '........', 'SS....SS', '........', '........'],
    goals: [{ type: 'stone' }, { type: 'chest', target: 2 }]
  },
  {
    moves: 32, colors: 5,
    layout: ['l.l..l.l', '........', '.l.ll.l.', '........', '........', '.l.ll.l.', '........', 'l.l..l.l'],
    goals: [{ type: 'lock' }, { type: 'collect', color: 2, target: 20 }, { type: 'collect', color: 4, target: 20 }]
  },
  {
    moves: 32, colors: 5,
    layout: ['_i....i_', 'iiS..Sii', 'i......i', '..cccc..', '..cccc..', 'i......i', 'iiS..Sii', '_i....i_'],
    goals: [{ type: 'ice' }, { type: 'stone' }, { type: 'crystal' }],
    tip: 'A big one! Break the crystal early so it can\'t spread.'
  },
  {
    moves: 18, colors: 5, layout: FULL,
    goals: [{ type: 'collect', color: 1, target: 25 }]
  },
  {
    moves: 28, colors: 5, bombs: { rate: 0.03, fuse: 12 },
    layout: ['........', '........', 'iiiiiiii', 'iiiiiiii', 'iiiiiiii', 'iiiiiiii', '........', '........'],
    goals: [{ type: 'ice' }]
  },
  {
    moves: 30, colors: 5,
    layout: ['........', '........', 'l......l', '.l....l.', '..l..l..', '...ll...', '........', '........'],
    goals: [{ type: 'chest', target: 3 }, { type: 'lock' }]
  },
  {
    moves: 32, colors: 5,
    layout: ['ss....ss', 's......s', '........', '........', '........', '........', 'c......c', 'cc....cc'],
    goals: [{ type: 'stone' }, { type: 'crystal' }]
  },
  {
    moves: 38, colors: 5,
    layout: ['kk....kk', 'k......k', '..SSSS..', '..S..S..', '..S..S..', '..SSSS..', 'k......k', 'kk....kk'],
    goals: [{ type: 'lock' }, { type: 'ice' }, { type: 'stone' }]
  },
  // ---------- Sunken Ruins ----------
  {
    moves: 31, colors: 5,
    layout: ['___..___', '__....__', '_......_', '........', '........', '_......_', '__....__', '___..___'],
    goals: [{ type: 'chest', target: 3 }]
  },
  {
    moves: 30, colors: 6,
    layout: ['........', '........', '........', '........', 'cc....cc', 'c......c', '........', '........'],
    goals: [{ type: 'crystal' }, { type: 'collect', color: 5, target: 20 }],
    tip: 'Six gem colors now. Matches are harder to find, so plan ahead.'
  },
  {
    moves: 22, colors: 5, stars: [6500, 11000, 17000], layout: FULL,
    goals: [{ type: 'score', target: 6500 }]
  },
  {
    moves: 30, colors: 5,
    layout: ['l.l.l.l.', 'l.l.l.l.', '........', '........', '........', '........', '.l.l.l.l', '.l.l.l.l'],
    goals: [{ type: 'lock' }]
  },
  {
    moves: 34, colors: 5, bombs: { rate: 0.03, fuse: 12 },
    layout: ['iiiiiiii', '........', '........', '..c..c..', '..c..c..', '........', '........', 'iiiiiiii'],
    goals: [{ type: 'ice' }, { type: 'crystal' }]
  },
  {
    moves: 20, colors: 5, layout: FULL,
    goals: [{ type: 'collect', color: 0, target: 20 }, { type: 'collect', color: 3, target: 20 }]
  },
  {
    moves: 36, colors: 6,
    layout: ['...ii...', '...ii...', '...ii...', 'iiiiiiii', 'iiiiiiii', '...ii...', '...ii...', '...ii...'],
    goals: [{ type: 'ice' }]
  },
  {
    moves: 22, colors: 5,
    layout: ['........', 's.s..s.s', '........', '.s.ss.s.', '........', 's.s..s.s', '........', '........'],
    goals: [{ type: 'stone' }, { type: 'chest', target: 2 }]
  },
  {
    moves: 23, colors: 5,
    layout: ['........', '........', '........', '........', '........', '........', 'c......c', 'cc....cc'],
    goals: [{ type: 'crystal' }]
  },
  // ---------- Heart of the Mountain ----------
  {
    moves: 33, colors: 5,
    layout: ['_kk..kk_', 'k......k', 'k..ss..k', '...ss...', '...ss...', 'k..ss..k', 'k......k', '_kk..kk_'],
    goals: [{ type: 'lock' }, { type: 'ice' }, { type: 'stone' }]
  },
  {
    moves: 22, colors: 5, bombs: { rate: 0.035, fuse: 13 },
    layout: FULL,
    goals: [{ type: 'collect', color: 4, target: 25 }, { type: 'collect', color: 2, target: 25 }]
  },
  {
    moves: 23, colors: 5, stars: [7000, 12000, 18000], layout: FULL,
    goals: [{ type: 'score', target: 7000 }]
  },
  {
    moves: 30, colors: 5,
    layout: ['........', '........', '.ss..ss.', '........', '........', 'c......c', 'cc....cc', '........'],
    goals: [{ type: 'stone' }, { type: 'crystal' }, { type: 'chest', target: 2 }]
  },
  {
    moves: 33, colors: 6,
    layout: ['........', '........', 'iiiiiiii', 'iiiiiiii', 'iiiiiiii', 'iiiiiiii', 'iiiiiiii', 'iiiiiiii'],
    goals: [{ type: 'ice' }]
  },
  {
    moves: 30, colors: 5, bombs: { rate: 0.03, fuse: 12 },
    layout: ['_k....k_', 'k.i..i.k', '..S..S..', '.i.cc.i.', '.i.cc.i.', '..S..S..', 'k.i..i.k', '_k....k_'],
    goals: [{ type: 'lock' }, { type: 'ice' }, { type: 'stone' }, { type: 'crystal' }],
    tip: 'The Heart of the Mountain fights back. Use everything you have learned!'
  },
  {
    moves: 32, colors: 5,
    layout: ['........', '.iiiiii.', '.i.SS.i.', '.i.SS.i.', '.i....i.', '.iiiiii.', '........', '........'],
    goals: [{ type: 'ice' }, { type: 'stone' }, { type: 'chest', target: 2 }]
  },
  {
    moves: 26, colors: 5, bombs: { rate: 0.035, fuse: 12 },
    layout: ['c......c', '........', '........', '........', '........', '........', '........', 'c......c'],
    goals: [{ type: 'crystal' }, { type: 'collect', color: 3, target: 22 }]
  },
  {
    moves: 32, colors: 5,
    layout: ['_..kk.._', '..SkkS..', '.S.ii.S.', 'kkiIIikk', 'kkiIIikk', '.S.ii.S.', '..S..S..', '_......_'],
    goals: [{ type: 'lock' }, { type: 'ice' }, { type: 'stone' }],
    tip: 'The innermost chamber of the Heart. Beyond it lies the Golden Vault!'
  },
  // ---------- Golden Vault ----------
  {
    moves: 30, colors: 5,
    layout: ['........', '........', '........', 's.s..s.s', '........', '........', '........', '........'],
    goals: [{ type: 'chest', target: 3 }, { type: 'stone' }],
    tip: 'Welcome to the Golden Vault! Treasure chests everywhere. Clear a way down for them.'
  },
  {
    moves: 19, colors: 5, layout: FULL,
    goals: [{ type: 'collect', color: 1, target: 32 }]
  },
  {
    moves: 32, colors: 5,
    layout: ['ll.ll.ll', 'l......l', 'l......l', 'l......l', 'l......l', 'l......l', 'l......l', 'll.ll.ll'],
    goals: [{ type: 'lock' }],
    tip: 'The vault doors are chained shut. Snap every chain!'
  },
  {
    moves: 24, colors: 5, bombs: { rate: 0.04, fuse: 12 }, stars: [8000, 13000, 19000], layout: FULL,
    goals: [{ type: 'score', target: 8000 }]
  },
  {
    moves: 34, colors: 5,
    layout: ['ssssssss', 's......s', '..S..S..', '........', '........', '..S..S..', 's......s', 'ssssssss'],
    goals: [{ type: 'stone' }, { type: 'chest', target: 2 }]
  },
  {
    moves: 34, colors: 5,
    layout: ['___ii___', '__iiii__', '_iiiiii_', 'iiiIIiii', 'iiiIIiii', '_iiiiii_', '__iiii__', '___ii___'],
    goals: [{ type: 'ice' }]
  },
  {
    moves: 32, colors: 5,
    layout: ['c......c', 'c......c', '........', '........', '........', '........', '........', '........'],
    goals: [{ type: 'crystal' }, { type: 'chest', target: 3 }]
  },
  {
    moves: 29, colors: 5, bombs: { rate: 0.03, fuse: 12 },
    layout: ['l......l', '.l....l.', '........', '........', '........', '........', '.l....l.', 'l......l'],
    goals: [{ type: 'collect', color: 1, target: 22 }, { type: 'collect', color: 4, target: 22 }, { type: 'lock' }]
  },
  {
    moves: 38, colors: 5,
    layout: ['kk....kk', 'kSS..SSk', '.S.cc.S.', '...cc...', '...cc...', '.S.cc.S.', 'kSS..SSk', 'kk....kk'],
    goals: [{ type: 'lock' }, { type: 'ice' }, { type: 'stone' }, { type: 'crystal' }],
    tip: 'The vault\'s treasure room. Every trick you know!'
  },
  // ---------- Overgrown Temple ----------
  {
    moves: 15, colors: 5,
    layout: ['........', '........', '........', 'cccccccc', '........', '........', '........', '........'],
    goals: [{ type: 'crystal' }],
    tip: 'In the Overgrown Temple, crystal grows like vines. Break some every turn!'
  },
  {
    moves: 36, colors: 5,
    layout: ['iiiiiiii', 'iIIIIIIi', 'i......i', 'i......i', 'i......i', 'i......i', 'iIIIIIIi', 'iiiiiiii'],
    goals: [{ type: 'ice' }]
  },
  {
    moves: 34, colors: 5,
    layout: ['........', '.S.SS.S.', '.S....S.', '.S....S.', '.S....S.', '.S....S.', '........', '........'],
    goals: [{ type: 'stone' }, { type: 'chest', target: 3 }]
  },
  {
    moves: 30, colors: 5, bombs: { rate: 0.04, fuse: 11 },
    layout: ['c......c', '........', '........', '........', '........', '........', '........', 'c......c'],
    goals: [{ type: 'crystal' }, { type: 'collect', color: 2, target: 25 }]
  },
  {
    moves: 28, colors: 6,
    layout: ['__....__', '__....__', '........', '........', '........', '........', '__....__', '__....__'],
    goals: [{ type: 'collect', color: 2, target: 25 }, { type: 'collect', color: 5, target: 20 }]
  },
  {
    moves: 32, colors: 5,
    layout: ['k.k..k.k', '.k....k.', 'k.k..k.k', '........', '........', 'k.k..k.k', '.k....k.', 'k.k..k.k'],
    goals: [{ type: 'lock' }, { type: 'ice' }]
  },
  {
    moves: 30, colors: 6, stars: [6000, 10000, 15000], layout: FULL,
    goals: [{ type: 'score', target: 6000 }]
  },
  {
    moves: 36, colors: 5, bombs: { rate: 0.03, fuse: 12 },
    layout: ['ss....ss', 's.c..c.s', '........', '...SS...', '...SS...', '........', 's.c..c.s', 'ss....ss'],
    goals: [{ type: 'stone' }, { type: 'crystal' }]
  },
  {
    moves: 42, colors: 5, bombs: { rate: 0.03, fuse: 13 },
    layout: ['_kk..kk_', 'k.c..c.k', 'k.SiiS.k', 'k.iIIi.k', 'k.iIIi.k', 'k.SiiS.k', 'k.c..c.k', '_kk..kk_'],
    goals: [{ type: 'lock' }, { type: 'ice' }, { type: 'stone' }, { type: 'crystal' }],
    tip: 'The deepest chamber of all! Beat it and the Endless Dig opens.'
  }
];

export const WORLDS = [
  { name: 'Amber Caverns', from: 1 },
  { name: 'Crystal Mine', from: 10 },
  { name: 'Glowing Depths', from: 19 },
  { name: 'Frozen Grotto', from: 28 },
  { name: 'Lava Forge', from: 37 },
  { name: 'Sunken Ruins', from: 46 },
  { name: 'Heart of the Mountain', from: 55 },
  { name: 'Golden Vault', from: 64 },
  { name: 'Overgrown Temple', from: 73 },
  { name: 'The Endless Dig', from: LEVELS.length + 1 }
];

// Platform centres on the painted map (map.jpg is 864 x 1536), listed bottom to top.
export const MAP_PLATFORMS = [
  [396.9, 1387.0], [467.9, 1223.8], [437.3, 1061.0], [460.7, 898.3], [419.9, 690.0],
  [504.4, 564.9], [424.2, 443.5], [523.8, 309.4], [439.7, 199.6]
];

// One painted map per world (9 platforms each, 864 x 1536, bottom to top). Sections past world 9 reuse the Endless map.
export const WORLD_MAPS = [
  { img: 'map.jpg', pts: MAP_PLATFORMS },
  { img: 'map-w2.jpg', pts: [[404.8, 1315.3], [473.4, 1145.1], [388.2, 999.4], [475.6, 864.7], [389.0, 737.8], [473.3, 606.4], [385.6, 487.3], [512.7, 378.3], [462.4, 258.3]] },
  { img: 'map-w3.jpg', pts: [[506.1, 1274.1], [395.7, 1088.1], [501.4, 924.7], [372.8, 767.7], [530.5, 630.6], [416.1, 495.5], [565.1, 372.8], [464.2, 259.3], [490.2, 133.3]] },
  { img: 'map-w4.jpg', pts: [[427.1, 1345.3], [387.6, 1140.9], [504.8, 961.9], [403.1, 813.2], [500.6, 670.4], [430.5, 531.6], [479.5, 395.2], [383.9, 273.8], [438, 157]] },
  { img: 'map-w5.jpg', pts: [[414.1, 1208.2], [523.9, 1024.5], [430.4, 868.0], [476.9, 712.6], [360.2, 588.2], [473.4, 464.1], [426.5, 329.4], [525.0, 223.9], [432.4, 130.3]] },
  { img: 'map-w6.jpg', pts: [[423.6, 1341.1], [472.8, 1134.5], [540.8, 956.4], [436.9, 813.3], [359.6, 681.9], [469.4, 556.8], [499.2, 426.2], [407.5, 310.4], [409.4, 197.9]] },
  { img: 'map-w7.jpg', pts: [[398.1, 1251.2], [456.2, 1093.8], [383.2, 962.7], [478.7, 835.8], [403.4, 721.3], [466.6, 607.2], [398.4, 502.2], [438.7, 389.5], [392.3, 285.8]] },
  { img: 'map-w8.jpg', pts: [[437.3, 1315.8], [460.2, 1114.7], [397.4, 962.7], [498.4, 825.6], [465.0, 690.7], [429.9, 568.7], [470.2, 447.6], [394.6, 347.8], [452.9, 244.0]] },
  { img: 'map-w9.jpg', pts: [[446.9, 1316.3], [393.2, 1123.9], [480.4, 959.7], [408.7, 813.2], [504.9, 689.6], [433.7, 559.2], [518.7, 432.3], [448.1, 311.9], [536.2, 200.7]] },
  { img: 'map-endless.jpg', pts: [[415.8, 1338.0], [503.4, 1110.8], [374.1, 940.4], [503.8, 785.6], [371.3, 635.0], [505.7, 489.9], [397.2, 358.1], [501.5, 229.7], [385.5, 119.0]] }
];
export const mapFor = (section) => WORLD_MAPS[Math.min(section, WORLD_MAPS.length - 1)];

// ---------- helpers ----------
export function layoutCount(layout, type) {
  let n = 0;
  for (const ch of layout.join('')) {
    if (type === 'ice') n += 'ik'.includes(ch) ? 1 : ch === 'I' ? 2 : 0;
    if (type === 'stone') n += ch === 's' ? 1 : ch === 'S' ? 2 : 0;
    if (type === 'lock') n += 'lk'.includes(ch) ? 1 : 0;
    if (type === 'crystal') n += ch === 'c' ? 1 : 0;
  }
  return n;
}
function withStars(lv) {
  if (!lv.stars) {
    const r = (x) => Math.round(x / 100) * 100;
    lv.stars = [r(lv.moves * 190), r(lv.moves * 400), r(lv.moves * 640)];
  }
  return lv;
}
LEVELS.forEach(withStars);

// ---------- endless levels (61 and up), the same layout every time for a given number ----------
function rng(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const SHAPES = [
  ['........', '........', '........', '........', '........', '........', '........', '........'],
  ['___..___', '__....__', '_......_', '........', '........', '_......_', '__....__', '___..___'],
  ['........', '_......_', '__....__', '___..___', '___..___', '__....__', '_......_', '........'],
  ['__....__', '__....__', '........', '........', '........', '........', '__....__', '__....__'],
  ['_......_', '........', '........', '........', '........', '........', '........', '_......_'],
  ['........', '........', '_......_', '__....__', '__....__', '_......_', '........', '........'],
  ['.._..._.', '........', '........', '........', '........', '........', '........', '._..._..'].map((r) => r.replace(/_/g, '.'))
];
export function makeEndless(n) {
  const r = rng(n * 7919 + 13);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const t = n - LEVELS.length;
  const d = Math.min(1, t / 60);
  const relief = t % 5 === 0;
  const g = pick(SHAPES).map((row) => row.split(''));
  const cells = [];
  for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++) if (g[y][x] === '.' && g[y][7 - x] === '.') cells.push([y, x]);
  const put = (y, x, ch) => { if (g[y][x] === '.' || (ch === 'k' && g[y][x] === 'i')) g[y][x] = ch; if (g[y][7 - x] === '.' || (ch === 'k' && g[y][7 - x] === 'i')) g[y][7 - x] = ch; };
  const pool = ['ice', 'stone', 'lock', 'crystal', 'chest', 'collect'];
  const count = relief ? 1 : (r() < 0.45 + 0.35 * d ? 2 : 1);
  const types = [];
  while (types.length < count) { const p = pick(pool); if (!types.includes(p)) types.push(p); }
  const goals = [];
  let chests = 0, collect = 0;
  for (const type of types) {
    if (type === 'ice') {
      const top = 1 + Math.floor(r() * 4), rows = 2 + Math.floor(r() * 2), thick = r() < 0.15 + 0.4 * d;
      for (let y = top; y < Math.min(8, top + rows); y++) for (let x = 0; x < 4; x++) put(y, x, thick && r() < 0.5 ? 'I' : 'i');
      goals.push({ type: 'ice' });
    } else if (type === 'stone') {
      const k = 3 + Math.floor(r() * 3 + d * 2), thick = r() < 0.2 + 0.4 * d;
      for (let i = 0; i < k; i++) { const [y, x] = pick(cells); if (y > 0) put(y, x, thick && r() < 0.5 ? 'S' : 's'); }
      goals.push({ type: 'stone' });
    } else if (type === 'lock') {
      const k = 3 + Math.floor(r() * 3 + d * 2);
      for (let i = 0; i < k; i++) { const [y, x] = pick(cells); put(y, x, g[y][x] === 'i' ? 'k' : 'l'); }
      goals.push({ type: 'lock' });
    } else if (type === 'crystal') {
      const k = 2 + Math.floor(r() * 2 + d * 2), y0 = r() < 0.5 ? 7 : 0, dir = y0 === 7 ? -1 : 1;
      for (let i = 0; i < k; i++) put(y0 + dir * Math.floor(i / 2), i % 2, 'c');
      goals.push({ type: 'crystal' });
    } else if (type === 'chest') {
      chests = 1 + (r() < 0.4 + 0.4 * d ? 1 : 0);
      goals.push({ type: 'chest', target: chests });
    } else {
      collect = 18 + Math.floor(r() * 8 + d * 6);
      goals.push({ type: 'collect', color: Math.floor(r() * 5), target: collect });
    }
  }
  const layout = g.map((row) => row.join(''));
  const colors = r() < 0.2 + 0.3 * d ? 6 : 5;
  const work = layoutCount(layout, 'ice') * 0.45 + layoutCount(layout, 'stone') * 0.5 + layoutCount(layout, 'lock') * 0.55 +
    layoutCount(layout, 'crystal') * 0.8 + chests * 7 + collect * 0.35;
  let moves = Math.round((14 + work) * (1 - 0.1 * d) + (colors === 6 ? 3 : 0) + (relief ? 4 : 0));
  moves = Math.max(18, Math.min(40, moves));
  const lv = { moves, colors, layout, goals, endless: true };
  if (!relief && d > 0.25 && r() < 0.3) lv.bombs = { rate: 0.03, fuse: Math.max(8, 13 - Math.round(4 * d)) };
  return withStars(lv);
}
export function getLevel(n) { return n <= LEVELS.length ? LEVELS[n - 1] : makeEndless(n); }
