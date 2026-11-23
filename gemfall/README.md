# Gemfall

A match-3 puzzle game set in a glowing crystal mine. Swap gems, set off special gems, and dig down through 60 levels across 7 worlds with Digby the mole miner, then keep going in the never-ending Endless Dig.

## Play it

The game is plain HTML, CSS and JavaScript with no build step. Serve this folder with any static web server and open it in a browser:

```sh
cd gemfall
python3 -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` straight from the file system will not work, because browsers block JavaScript modules on `file://` pages.

## How to play

- **Swap** two neighbouring gems by swiping, or by tapping one gem and then the next.
- **Match 3 or more** of the same gem in a row or column to break them. New gems fall in and can set off chain reactions.
- Finish every goal shown at the top before you run out of moves.

### Special gems

| Match | You get | What it does |
| --- | --- | --- |
| 4 in a line | Streak | Blasts its whole row (horizontal match) or column (vertical match) |
| L or T shape | Burst | Explodes the 3 × 3 square around it, then explodes again after the gems fall |
| 5 in a line | Prism | Swap it with any gem to clear every gem of that color |

Swap two special gems together for a combo:

| Combo | Effect |
| --- | --- |
| Streak + Streak | Clears a full row and column |
| Streak + Burst | Clears 3 rows and 3 columns |
| Burst + Burst | Giant 5 × 5 blast |
| Prism + gem | Clears every gem of that color |
| Prism + Streak or Burst | Turns every gem of that color into that special, then sets them all off |
| Prism + Prism | Clears the whole board |

### Goals and obstacles

- **Score**: reach a target score.
- **Glowing ice**: sits under gems. Make matches on top of it to crack it. Thick ice needs two hits.
- **Stone blocks**: take up a space. Match next to them or blast them to break them. Thick stones (gold frame) need two hits.
- **Treasure chests**: bring them down to the bottom row, marked with gold arrows, to collect them.
- **Collect**: break a set number of one gem color.
- **Chains**: lock a gem in place so it can't be swapped or fall. Match the chained gem, or blast it, to snap the chain.
- **Creeping crystal**: blocks a space like stone, but if you finish a move without breaking any crystal, it grows onto a gem next to it. Match beside it or blast it to clear it.
- **Fuse bombs**: gems carrying a bomb with a countdown. The number drops by one after every move. Match or blast the gem before it reaches 0, or the level ends. Bombs glow red at 3 or less.

### Extras

- **Gem Rush**: when you finish a level with moves left, each spare move becomes a Streak gem that fires for bonus points.
- **Stars**: earn 1 to 3 stars per level depending on your score.
- **The Endless Dig**: after level 60, every level is generated from its number, so level 75 is always the same board. Difficulty creeps up slowly, and every fifth level is a lighter one.
- **Hints**: a possible move glows after a few seconds without a move, or tap Hint at any time.
- **Auto-shuffle**: if no moves are left, the board reshuffles for free.
- **Boosters**: Hammer smashes one gem or stone; Shuffle mixes the board. Clearing levels 3, 6, 9 and so on for the first time opens a treasure chest with one more of each.
- **Lives**: you have 3 lives. Failing a level, or leaving one after making a move, costs a life; winning never does. One life refills every 20 minutes, up to 3, and the title and map screens show the countdown. There are no purchases of any kind.
- **Stuck boards**: if no move is possible even after a shuffle, Digby breaks a blocker for free so a level can never jam.

Progress, stars and settings are saved in the browser's local storage.

## Code layout

| File | Purpose |
| --- | --- |
| `index.html` | Page structure and all styles |
| `js/main.js` | Screens, level map, HUD, pop-ups, input, boosters and saved progress |
| `js/game.js` | Game rules: matching, special gems and combos, obstacles, gravity, goals, Gem Rush |
| `js/render.js` | Canvas drawing, animations, particles, beams and explosions |
| `js/levels.js` | The 60 level layouts, goals, move limits and star scores, plus the Endless Dig level generator |
| `js/audio.js` | Sound effects and background music, generated in the browser with Web Audio |
| `assets/` | Game art |

### Adding a level

Add an entry to `LEVELS` in `js/levels.js`. Each board row is a string of 8 characters:

| Character | Cell |
| --- | --- |
| `.` | Gem |
| `_` | Hole (not part of the board) |
| `i` / `I` | Gem on ice / thick ice |
| `s` / `S` | Stone / thick stone |
| `l` / `k` | Chained gem / chained gem on ice |
| `c` | Creeping crystal |
| `b` | Gem carrying a fuse bomb |

Goal types are `score`, `ice`, `stone`, `lock`, `crystal`, `chest` and `collect` (with a `color` from 0 to 5: ruby, topaz, emerald, sapphire, amethyst, pearl). Ice, stone, chain and crystal counts are worked out from the layout. Add `bombs: { rate, fuse }` to make fuse bombs drop in during play. Star scores are worked out from the move count unless you set `stars`.

Move counts were tuned by having a bot play every level several times; most levels leave it only a few moves to spare.

## Art

The gems, special gems, items, obstacles, life and timer icons, cave background, level map, Digby and the logo were generated with Figma's AI image generator for this project. The originals are in the "Gemfall game art" Figma file.
