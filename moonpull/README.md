# Moonpull

A one-thumb mobile game. You are the moon: drag it across the sky and the sea swells beneath it. A paper lantern boat goes wherever the water sends it.

## What is in version 1.0.0

- 30 nights across three coasts (Quiet Bay, The Shallows, Stormwater), each with three stars
- Six hazards: reefs, overhangs, sandbars, whirlpools, riptides and cloud banks
- A short illustrated story with one line of a letter per night
- Daily Tide, Endless Night and Drift (no-fail) modes
- Three boats, two moon powers, three upgrades, five colour palettes, five lantern colours
- Voyage rank, rotating tasks, a seven-day daily gift, ghost of your best run, photo mode
- Synthesised music that follows the wave; no audio files
- Offline, no accounts, no ads, no data collection

## Run it

```
npm install
npm run dev        # play in a browser (use a landscape window)
npm run bot        # check that every night can be finished
npm run build      # production web build in dist/
```

## Android

The Android project is in `android/` (Capacitor). Building needs the Android SDK, so the GitHub workflow
`.github/workflows/moonpull-android.yml` does it on every push and attaches two files to the run:

- `moonpull-debug-apk`: install this on a phone to test
- `moonpull-release-aab`: the file Google Play asks for (unsigned until you add a signing key)

Locally, with Android Studio installed: `npm run android:sync`, then open `android/` in Android Studio.

See `store/PUBLISHING.md` for the signing key and the Play Console steps.

## Where things are

| Path | What |
| --- | --- |
| `src/sim/` | Water, boat and level logic. No browser code, so it also runs in the test bot. |
| `src/sim/levels.ts` | The 30 nights, written in a small level script, plus the generator for the other modes |
| `src/render.ts`, `src/story.ts` | Everything drawn on screen |
| `src/game.ts`, `src/ui.ts` | Game loop, input, menus |
| `src/state.ts` | Save data, ranks, shop, tasks, daily gift |
| `tools/` | Level-check bot, difficulty estimate, icon and screenshot generators |
| `store/` | Play listing text, graphics, screenshots, privacy policy |
