# Gemfall

A match-3 puzzle game set in a glowing crystal mine. Swap gems, set off special gems, and dig down through 81 levels across 9 worlds with Digby the mole miner, then keep going in the never-ending Endless Dig.

## Play it

The game is plain HTML, CSS and JavaScript with no build step. Serve this folder with any static web server and open it in a browser:

```sh
cd gemfall
python3 -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` straight from the file system will not work, because browsers block JavaScript modules on `file://` pages.

### Android app

Every push that changes the game builds an Android app (APK) on GitHub Actions and attaches it to the **gemfall-latest** release:

`https://github.com/jarjisjo-arch/video/releases/download/gemfall-latest/Gemfall.apk`

Open that link on an Android phone, download the file, open it and allow installs from your browser when Android asks. To share the game, send the same link (or the APK file itself). A newer APK installs over the old one and keeps your progress, because every build is signed with the same key.

The app is the same web game wrapped with [Capacitor](https://capacitorjs.com); the wrapper lives in `../gemfall-android`. `build-android.sh` there copies this folder in, creates the Android project, icons and splash screen, and builds the signed APK. The workflow is `.github/workflows/gemfall-apk.yml`. Once it is on the default branch, you can also start it by hand from the repository's Actions tab.

The signing key (`gemfall-android/gemfall-share.keystore`) is committed on purpose, so every build is signed the same way. That is fine for sharing with friends. Before publishing on Google Play, make a new private key and keep it out of the repository.

**Google Play:** each build also makes `Gemfall-play.aab`, the bundle Google Play needs, signed with a private upload key kept in GitHub's secrets. The store icon, feature graphic, screenshots, listing text, privacy policy and a step-by-step launch checklist are in `../gemfall-android/play/` (start with `PLAY-LAUNCH.md`). Play installs are versioned `1.<build>-play`, so the game sends those players to Google Play rather than to the APK when an app update is needed. Players can move their progress between installs with Settings > Move my progress.

iPhones can't install APKs. iPhone players can use the web version and add it to the home screen from Safari's Share menu.

### Shipping updates

Every build publishes three files to the **gemfall-latest** release: `Gemfall.apk`, `gemfall-web.zip` (the game itself: code, levels, art and sounds) and `update.json`, which describes the newest build. The Android app (version 1.6 and later) reads `update.json` each time it starts:

- **New levels and fixes arrive by themselves.** If the game content is newer than the player's, the app downloads `gemfall-web.zip` in the background (checked against its SHA-256) and shows an "Update ready" pop-up on the title or map screen. The new content takes over when the player taps **Restart now**, or the next time they close the app. If the new content fails to start, the app goes back to the previous version on its own. So to add levels, edit `js/levels.js` (and add a map in `WORLD_MAPS` for a new world) and push: nobody needs to reinstall.
- **Forcing an update.** Edit `gemfall-android/update-policy.json` and push:
  - `forceAppBelow`: apps older than `1.<this number>` show an "Update needed" screen and can't be played until the player installs the newest APK. Use it when something is badly wrong in the app itself. The newest version number is in the release notes; the build you push becomes that number plus one.
  - `forceContentBelow`: game content older than this build switches to the newest content straight away instead of at the next restart. Use it for an urgent fix that a content update can deliver.
  - `message`: the text shown on the "Update needed" screen. `notes`: the text shown in the "Update ready" pop-up, such as "World 10 is here!".
  - `minApp`: the oldest app version that can run new content. Raise it to the new build's number when a change needs new native code (a new Capacitor plugin, say); older apps then get a "New version available" pop-up asking them to install the APK instead of receiving content they can't run.
- Settings shows the app version and the game content build.

Players on version 1.5 or older don't have the updater yet, so they need to install the APK once by hand. Updates are checked only when the app starts, the check needs an internet connection, and the game works offline as before.

The updater is [Capgo's capacitor-updater](https://github.com/Cap-go/capacitor-updater) (MPL-2.0), used in its self-hosted manual mode: it talks only to this GitHub release, and its usage reporting is switched off (`statsUrl: ""` in `gemfall-android/capacitor.config.json`).

## How to play

- **Swap** two neighbouring gems by swiping, or by tapping one gem and then the next.
- **Match 3 or more** of the same gem in a row or column to break them. New gems fall in and can set off chain reactions.
- Finish every goal shown at the top before you run out of moves.
- The first time a new idea appears (levels 1 to 7, chains on 21, crystal on 25, bombs on 30), Digby and a pointing hand show you what to do.

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
- **The Endless Dig**: after the last handcrafted level (81), every level is generated from its number, so level 95 is always the same board. Difficulty creeps up slowly, and every fifth level is a lighter one.
- **Hints**: a possible move glows after a few seconds without a move, or tap Hint at any time.
- **Auto-shuffle**: if no moves are left, the board reshuffles for free.
- **Boosters**: Hammer smashes one gem or stone; Shuffle mixes the board. Clearing levels 3, 6, 9 and so on for the first time opens a treasure chest with one more of each.
- **Lives**: you have 3 lives. Failing a level, or leaving one after making a move, costs a life; winning never does. One life refills every 20 minutes, up to 3, and the title and map screens show the countdown. There are no purchases of any kind.
- **Stuck boards**: if no move is possible even after a shuffle, Digby breaks a blocker for free so a level can never jam.
- **Daily treasure**: the first time you open the map each day, claim a gift. Rewards follow a 7-day cycle (boosters, a full set of lives, and a big chest on day 7). Coming back on consecutive days grows your streak, shown by the flame button on the map; missing a day starts the cycle again.
- **Board styles**: in Settings, pick Gem Mine (gems), Orchard Pop (fruit) or Orbit Swap (planets and stars). Only the pieces and background change; the rules and levels stay the same.
- **Worlds**: Amber Caverns, Crystal Mine, Glowing Depths, Frozen Grotto, Lava Forge, Sunken Ruins, Heart of the Mountain, Golden Vault and Overgrown Temple each have 9 levels, a painted map and their own music, and so does the Endless Dig.

Progress, stars, streak and settings are saved on the device (the browser's local storage, or the app's storage on Android).

## Code layout

| File | Purpose |
| --- | --- |
| `index.html` | Page structure and all styles |
| `js/main.js` | Screens, level map, HUD, pop-ups, input, boosters and saved progress |
| `js/game.js` | Game rules: matching, special gems and combos, obstacles, gravity, goals, Gem Rush |
| `js/render.js` | Canvas drawing, animations, particles, beams and explosions |
| `js/levels.js` | The 81 level layouts, goals, move limits and star scores, the worlds and their maps, plus the Endless Dig level generator |
| `js/updates.js` | Android app updates: live content updates and forced app updates (see "Shipping updates") |
| `js/build-info.js` | The build number; the Android build stamps the real one in |
| `js/audio.js` | Sound effects and the music tracks (menu, one per area, Endless), played with Web Audio. `RECIPES` holds the designed effects, `BANK` the plain recorded ones, and `synth` the generated ones |
| `assets/` | Game art |
| `fonts/` | The Lilita One and Nunito fonts, bundled so the game works offline |
| `assets/sfx/` | Recorded sound effects and jingles (MP3) |

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

Goal types are `score`, `ice`, `stone`, `lock`, `crystal`, `chest` and `collect` (with a `color` from 0 to 5: ruby, topaz, emerald, sapphire, amethyst, pearl, or the matching fruit and space pieces). Ice, stone, chain and crystal counts are worked out from the layout. Add `bombs: { rate, fuse }` to make fuse bombs drop in during play. Star scores are worked out from the move count unless you set `stars`.

Move counts were tuned by having a bot play every level several times; most levels leave it only a few moves to spare.

## Art

The gems, fruit and space pieces, special gems, items, obstacles, icons, backgrounds, the eight world maps, Digby, the logo and the app icon were generated with Figma's AI image generator for this project. The originals are in the "Gemfall game art" Figma file.

The sound effects and jingles in `assets/sfx/` come from Kenney's [Interface Sounds](https://kenney.nl/assets/interface-sounds), [Impact Sounds](https://kenney.nl/assets/impact-sounds) and [Music Jingles](https://kenney.nl/assets/music-jingles) packs, released under CC0 (public domain). They were trimmed, normalised and converted to MP3; the license is in `assets/sfx/License-Kenney.txt`.

Most moments (matches, special gems, blasts, stone, ice, stars, win, lose, chests, the daily gift, buttons and wrong moves) use designed sounds: a recording layered with bell tones and sparkle tuned to C major pentatonic, the key of the music, so chain reactions climb the scale. They were chosen by comparing them with the original generated sounds and plain Kenney clips. To change one, edit its entry in `RECIPES` in `js/audio.js`; each entry's `gain` keeps it in balance with the rest.

The fonts are [Lilita One](https://fonts.google.com/specimen/Lilita+One) and [Nunito](https://fonts.google.com/specimen/Nunito), both under the SIL Open Font License.
