# Gemfall

A match-3 puzzle game set in a glowing crystal mine. Swap gems, set off special gems, and dig down through 20 levels with Digby the mole miner.

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

### Extras

- **Gem Rush**: when you finish a level with moves left, each spare move becomes a Streak gem that fires for bonus points.
- **Stars**: earn 1 to 3 stars per level depending on your score.
- **Hints**: a possible move glows after a few seconds without a move, or tap Hint at any time.
- **Auto-shuffle**: if no moves are left, the board reshuffles for free.
- **Boosters**: Hammer smashes one gem or stone; Shuffle mixes the board. Clearing levels 3, 6, 9 and so on for the first time opens a treasure chest with one more of each.
- **Fair play**: there are no lives, timers, purchases or paid continues. Retrying is always free.

Progress, stars and settings are saved in the browser's local storage.

## Code layout

| File | Purpose |
| --- | --- |
| `index.html` | Page structure and all styles |
| `js/main.js` | Screens, level map, HUD, pop-ups, input, boosters and saved progress |
| `js/game.js` | Game rules: matching, special gems and combos, obstacles, gravity, goals, Gem Rush |
| `js/render.js` | Canvas drawing, animations, particles, beams and explosions |
| `js/levels.js` | The 20 level layouts, goals, move limits and star scores |
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

Goal types are `score`, `ice`, `stone`, `chest` and `collect` (with a `color` from 0 to 5: ruby, topaz, emerald, sapphire, amethyst, pearl). Ice and stone goal counts are worked out from the layout.

## Art

The gems, special gems, items, cave background, level map, Digby and the logo were generated with Figma's AI image generator for this project. The originals are in the "Gemfall game art" Figma file.
