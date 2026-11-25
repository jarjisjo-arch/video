# Launching Gemfall on Google Play

Everything Play needs from the game is in this folder or built automatically. The steps below are the ones only the account owner can do.

## What's ready

| Item | Where |
| --- | --- |
| The app bundle Google Play needs (`.aab`) | Built by GitHub on every push and attached to the [gemfall-latest release](https://github.com/jarjisjo-arch/video/releases/tag/gemfall-latest) as `Gemfall-play.aab`, once step 1 is done |
| App icon, feature graphic, 6 phone screenshots | `icon-512.png`, `feature-graphic.png`, `screenshots/` |
| Name, descriptions, release notes, category, tags | `store-listing.md` |
| Privacy policy | `privacy-policy.md`, published at https://github.com/jarjisjo-arch/video/blob/ccr-589b2a74-kj2uok/gemfall-android/play/privacy-policy.md |
| Answers for every App content form | Step 5 below |
| Update flow for Play players | The Play build is versioned `1.<build>-play`. New levels still arrive as live updates; "Update needed" and "New version available" send Play players to Google Play instead of the APK |
| Moving progress from the shared APK | Settings > **Move my progress** |

## 1. Add the upload key to GitHub (5 minutes)

Google Play only accepts bundles signed with your own private **upload key**. It was created for you and sent as files in the chat (`gemfall-upload.jks`, `gemfall-upload.jks.base64.txt` and the password). It is **not** in the repository and must never be.

1. Save the three files somewhere safe and make a backup. If the key is ever lost, Play Console can reset it, but it takes a few days.
2. On GitHub, open the repository, then **Settings > Secrets and variables > Actions > New repository secret**. Add two secrets:
   - Name `PLAY_UPLOAD_KEYSTORE`, value: the whole text of `gemfall-upload.jks.base64.txt`
   - Name `PLAY_UPLOAD_PASSWORD`, value: the password
3. Open **Actions**, select the latest "Build Gemfall Android app" run and choose **Re-run all jobs** (or ask Claude to push any change). When it finishes, `Gemfall-play.aab` appears on the release.

## 2. Create the developer account

1. Go to https://play.google.com/console/signup and choose a **personal** account.
2. Pay the one-time registration fee (25 US dollars at the time of writing) and complete identity verification. Verification can take a few days.

## 3. Create the app

In Play Console, choose **Create app**:

- App name: `Gemfall: Gem Match Puzzle`
- Default language: English (United States)
- App or game: **Game**. Free or paid: **Free**
- Accept the declarations.

The package name is `com.gemfall.game` and is fixed once the first bundle is uploaded. If Play says it is already taken, tell Claude; the app ID has to change before the first upload.

## 4. Store listing

Copy the text from `store-listing.md` and upload the graphics from this folder (**Grow users > Store presence > Main store listing**). Add a contact email; the privacy policy needs the same address in place of `REPLACE-WITH-CONTACT-EMAIL`.

## 5. App content forms

Under **Policy and programs > App content**:

| Form | Answer |
| --- | --- |
| Privacy policy | The privacy policy URL above |
| App access | All functionality is available without special access |
| Ads | No, the app doesn't contain ads |
| Content rating | Category: **Game**. Answer **No** to violence, fear, sexual content, crude humor, language, controlled substances, gambling (Gemfall has no real or simulated gambling: chests and daily gifts are fixed rewards), user interaction or chat, sharing location, and digital purchases. Expect **Everyone / PEGI 3** |
| Target audience | Gemfall's cartoon style appeals to children, so choosing age groups that include under 13 is the honest answer. That puts it under Google's Families policy, which Gemfall already meets: no ads, no accounts, no data collection, no tracking. If you pick 13 and over only, Google may still decide it appeals to children and ask for the same checks |
| Data safety | "Does your app collect or share any of the required user data types?" **No**. Progress stays on the phone; the update check downloads files from GitHub and sends no user data |
| Advertising ID | No, the app doesn't use an advertising ID |
| Government, financial, health, news apps | No to each |

## 6. Closed test: 12 testers for 14 days (required for new personal accounts)

1. **Testing > Closed testing > Create track** (or use the default Alpha track).
2. Create a release and upload `Gemfall-play.aab` from the release page. When asked about app signing, keep the default: Google creates and protects the app signing key, and your upload key signs what you upload.
3. **Testers:** create an email list with at least 12 Google accounts. Aim for 15 in case someone drops out: Google counts testers who stay opted in for **14 days in a row**.
4. Send the testers the opt-in link with the message below. Each one must accept and install from Google Play.
5. Roll out the release to the closed track. Google reviews it first, which can take from hours to a few days.
6. Ask testers to actually play and tell you about problems. When applying for production, Google asks what you learned from the test.

Message for testers:

> Hi! I'm launching my game Gemfall on Google Play and need testers for two weeks. Please:
> 1. Open this link on your Android phone and tap "Become a tester": [paste the opt-in link]
> 2. Install Gemfall from the Google Play link on that page.
> 3. Play a few levels now and then over the next 14 days, and keep it installed until I say we're done.
> Tell me if anything looks wrong. Thank you!

## 7. Apply for production

After 14 days with at least 12 testers, Play Console shows **Apply for production** on the dashboard. Answer the questions about the test; Google's review can take up to about a week. Then go to **Production > Create new release**, add the latest `Gemfall-play.aab`, and roll out.

## After launch

- **New levels and fixes** still reach every player as live updates, with no Play review needed. Content updates must stay within what the listing describes (Google's rules for code that runs in a web view).
- **App updates** (native changes such as a new plugin): upload the newest `Gemfall-play.aab` to Production. Each build has a higher version code, as Play requires.
- **Forcing an update:** `forceAppBelow` in `update-policy.json` works for Play players too; their "Update needed" screen opens Gemfall's Google Play page.
- **Players on the shared APK** can't install the Play version over it, because the two are signed with different keys. They should open Settings > **Move my progress** and copy the code, uninstall the APK, install from Google Play, then paste the code there.
- Keep sharing the APK only for testing before release, so most players are on the Play version.
