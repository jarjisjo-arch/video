// Gemfall level data.
// Layout legend (one character per cell, 8 columns per row):
//   .  gem
//   _  hole (not part of the board)
//   i  gem on glowing ice (1 layer)
//   I  gem on thick ice (2 layers)
//   s  stone block (1 hit)
//   S  thick stone block (2 hits)
// Goal types: score, ice, stone, chest, collect (color index: 0 ruby, 1 topaz, 2 emerald, 3 sapphire, 4 amethyst, 5 pearl)

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
    tip: 'The final dig! Use everything you have learned.'
  }
];

export const WORLDS = [
  { name: 'Amber Caverns', from: 1 },
  { name: 'Crystal Mine', from: 10 },
  { name: 'Glowing Depths', from: 19 }
];

// Platform centres on the painted map (map.jpg is 864 x 1536), listed bottom to top.
export const MAP_PLATFORMS = [
  [396.9, 1387.0], [467.9, 1223.8], [437.3, 1061.0], [460.7, 898.3], [419.9, 690.0],
  [504.4, 564.9], [424.2, 443.5], [523.8, 309.4], [439.7, 199.6]
];
