# Moonpull

A one-thumb mobile game. You are the moon: drag it across the sky and the sea swells beneath it. A paper lantern boat goes wherever the water sends it.

## How it plays

You are the moon. Hold anywhere and the moon pulls the sea down: the boat presses into the water and gains speed going downhill. Let go before a crest and the sea throws the boat into the air. Land with the slope for a perfect landing and a speed boost. Reefs break through some crests (fly over them); low arches hang over others (hold to stay in the water). A storm follows every night, and a slow boat gets caught.

## What is in version 2.0.0

- 24 hand-built nights across three coasts (Quiet Bay, Lantern Reach, Stormwater), three stars each
- Reefs, arches, whales that throw the boat high, lantern rings, fireflies and a storm that chases you
- Perfect landings, chains, near misses and Moonrise (fever mode) for big scores
- A village home screen that you rebuild with fireflies, and boats that come home as you progress
- Daily Tide, Endless Night and Drift modes
- Four boats, five lantern colours, upgrades, voyage ranks, star jars, daily gifts and tasks
- The story of the paper boat, told in illustrated scenes and a letter, one line per night
- WebGL lighting (glow, colour grading, grain) over a painted 2D scene
- Adaptive synthesised music and sound, no audio files
- Offline, no accounts, no ads, no data collection

## Run it

```
npm install
npm run dev        # play in a browser (use a landscape window)
npm run bot        # check that every night can be finished by a test player
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
| `src/sim/` | Sea, boat and level logic. No browser code, so it also runs in the test bot. |
| `src/sim/levels.ts` | The 24 nights, written in a small level script, plus the generator for the other modes |
| `src/gfx/` | The painted scene, the village, textures, colour palettes and the WebGL finishing pass |
| `src/story.ts` | The illustrated story scenes |
| `src/game.ts`, `src/ui.ts` | Game loop, input, menus |
| `src/state.ts` | Save data, ranks, village, shop, tasks, star jar, daily gift |
| `tools/` | Test player and level checks (`bot.ts`, `brain.ts`), feel measurements, icon and screenshot generators |
| `store/` | Play listing text, graphics, screenshots, privacy policy |
