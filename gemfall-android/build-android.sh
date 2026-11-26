#!/usr/bin/env bash
# Builds Gemfinity.apk: copies the web game in, creates the Android project, icons and splash, then a signed APK.
# Needs Node 22+, JDK 21 and the Android SDK. GitHub's ubuntu-latest runner has all of them (see .github/workflows/gemfall-apk.yml).
# VERSION_CODE (a whole number that goes up each build) lets a new APK install over the old one and keep progress.
set -euo pipefail
cd "$(dirname "$0")"
VERSION_CODE="${VERSION_CODE:-1}"
KEY_PASS=gemfall-share  # not secret: the key is committed so every build is signed the same way

./copy-web.sh
# stamp the build number into the game so it knows which version it is
cat > www/js/build-info.js <<JS
// Written by build-android.sh.
export const BUILD = { number: ${VERSION_CODE}, commit: '${GITHUB_SHA:-local}' };
JS
# the game content as a zip, for players who already have the app (live update)
rm -f gemfall-web.zip && (cd www && python3 -c "import shutil; shutil.make_archive('../gemfall-web', 'zip', '.')")
node make-update-json.mjs "$VERSION_CODE" gemfall-web.zip update.json
npm ci --no-audit --no-fund
rm -rf android
npx cap add android
npx capacitor-assets generate --android \
  --iconBackgroundColor '#5411af' --iconBackgroundColorDark '#5411af' \
  --splashBackgroundColor '#1a1233' --splashBackgroundColorDark '#1a1233'

# keep the game's text at 100% whatever the phone's font size setting: the layout is fixed, so larger
# system text pushes the score and buttons off screen
APP_ID=$(node -p "require('./capacitor.config.json').appId")
ACTIVITY="android/app/src/main/java/$(echo "$APP_ID" | tr . /)/MainActivity.java"
test -f "$ACTIVITY"
cat > "$ACTIVITY" <<JAVA
package $APP_ID;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().getSettings().setTextZoom(100);
        }
    }
}
JAVA

# portrait only, and a version number that goes up with every build
sed -i 's|android:name=".MainActivity"|android:name=".MainActivity"\n            android:screenOrientation="portrait"|' android/app/src/main/AndroidManifest.xml
sed -i "s/versionCode 1\$/versionCode ${VERSION_CODE}/; s/versionName \"1.0\"/versionName \"1.${VERSION_CODE}\"/" android/app/build.gradle
grep -q 'screenOrientation="portrait"' android/app/src/main/AndroidManifest.xml
grep -q "versionCode ${VERSION_CODE}\$" android/app/build.gradle
grep -q 'setTextZoom(100)' "$ACTIVITY"

[ "${SKIP_GRADLE:-}" = 1 ] && { echo "Android project ready (Gradle skipped)"; exit 0; }

cd android
chmod +x gradlew
./gradlew --no-daemon assembleRelease
UNSIGNED=app/build/outputs/apk/release/app-release-unsigned.apk

# Sign with all three schemes (v1 JAR + v2 + v3). Some phone makers' installers (Xiaomi, OPPO, Realme, Vivo)
# reject an APK that only has the v2 signature with "package appears to be invalid".
BT=$(ls -d "${ANDROID_HOME:-$ANDROID_SDK_ROOT}"/build-tools/* | sort -V | tail -1)
"$BT/zipalign" -f -p 4 "$UNSIGNED" aligned.apk
"$BT/apksigner" sign --ks ../gemfall-share.keystore --ks-pass "pass:$KEY_PASS" --key-pass "pass:$KEY_PASS" --ks-key-alias gemfall \
  --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true --out ../Gemfinity.apk aligned.apk
"$BT/apksigner" verify --verbose --min-sdk-version 18 ../Gemfinity.apk | tee verify.txt
grep -q "v1 scheme (JAR signing): true" verify.txt
grep -q "v2 scheme (APK Signature Scheme v2): true" verify.txt
ls -l ../Gemfinity.apk

# ---- Google Play: an App Bundle with version name "1.<build>-play", so the game knows to send players
# to Google Play for app updates. Google re-signs it; we sign it with the private upload key, which comes
# from GitHub secrets (never from the repository). Without the key the bundle is built but left unsigned.
sed -i "s/versionName \"1.${VERSION_CODE}\"/versionName \"1.${VERSION_CODE}-play\"/" app/build.gradle
grep -q "versionName \"1.${VERSION_CODE}-play\"" app/build.gradle
./gradlew --no-daemon bundleRelease
AAB=app/build/outputs/bundle/release/app-release.aab
rm -f ../Gemfinity-play.aab ../Gemfinity-play-unsigned.aab
if [ -n "${PLAY_UPLOAD_KEYSTORE:-}" ] && [ -n "${PLAY_UPLOAD_PASSWORD:-}" ]; then
  KS="$(mktemp)"
  echo "$PLAY_UPLOAD_KEYSTORE" | base64 -d > "$KS"
  jarsigner -sigalg SHA256withRSA -digestalg SHA-256 -keystore "$KS" -storepass:env PLAY_UPLOAD_PASSWORD -keypass:env PLAY_UPLOAD_PASSWORD \
    -signedjar ../Gemfinity-play.aab "$AAB" upload
  rm -f "$KS"
  jarsigner -verify ../Gemfinity-play.aab | grep -q "jar verified"
  ls -l ../Gemfinity-play.aab
else
  cp "$AAB" ../Gemfinity-play-unsigned.aab
  echo "No Play upload key in this build (secrets PLAY_UPLOAD_KEYSTORE and PLAY_UPLOAD_PASSWORD): Gemfinity-play-unsigned.aab can't be uploaded to Google Play."
fi
