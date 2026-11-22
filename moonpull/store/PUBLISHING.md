# Publishing Moonpull on Google Play

## 1. Get a build onto your phone

Every push builds the game on GitHub and puts it in the "Moonpull test build" release:
open https://github.com/jarjisjo-arch/video/releases/tag/moonpull-latest on your phone, tap `moonpull.apk`,
then open the downloaded file and allow installing from this source when Android asks.
(The same file is also attached to each workflow run as `moonpull-debug-apk`, but that one comes zipped.)

## 2. Create your signing key (once, and keep it safe)

On any computer with Java installed:

```
keytool -genkeypair -v -keystore moonpull.jks -alias moonpull -keyalg RSA -keysize 2048 -validity 10000
```

Choose a password and write it down. If you lose this file or the password you cannot update the game later,
so back it up somewhere private. Never commit it to the repository.

Then add four repository secrets on GitHub (Settings > Secrets and variables > Actions):

| Secret | Value |
| --- | --- |
| `MOONPULL_KEYSTORE_BASE64` | output of `base64 -w0 moonpull.jks` |
| `MOONPULL_KEYSTORE_PASSWORD` | the keystore password |
| `MOONPULL_KEY_ALIAS` | `moonpull` |
| `MOONPULL_KEY_PASSWORD` | the key password (same as the keystore password unless you chose another) |

Run the workflow again. `moonpull-release-aab` now contains a signed `app-release.aab`.

## 3. Play Console

1. Create a developer account at play.google.com/console (one-time 25 USD fee, identity check).
2. Create app: name Moonpull, type Game, Free.
3. The package name is `com.moonpull.game`. To change it, do so before the first upload (it is in
   `capacitor.config.ts`, `android/app/build.gradle` and the `MainActivity.java` folder); it can never change afterwards.
4. Fill in the store listing from `store/listing.md` and upload the graphics from `store/`.
5. Host `store/privacy-policy.md` at a public web address (GitHub Pages works) and paste the link. Add your contact email to it first.
6. Complete the content rating, target audience, data safety and ads declarations (answers are in `listing.md`).
7. Upload `app-release.aab` to a **closed testing** track.
8. New personal developer accounts must have at least 12 testers opted in for 14 days before Google lets you apply for production. Invite them by email from the closed test page.
9. After the 14 days, apply for production access and promote the release.

## 4. Updates

For each new upload raise `versionCode` by one (it is 2 now) (and `versionName` as you like) in `android/app/build.gradle`.

## Not included yet

These need IDs from your own Google accounts, so they are not in version 1.0.0:

- Google Play Games achievements, leaderboards and cloud save
- Rewarded ads or a remove-ads purchase
- The in-app "rate this game" prompt
