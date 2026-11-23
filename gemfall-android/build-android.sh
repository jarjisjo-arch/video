#!/usr/bin/env bash
# Builds Gemfall.apk: copies the web game in, creates the Android project, icons and splash, then a signed APK.
# Needs Node 22+, JDK 21 and the Android SDK. GitHub's ubuntu-latest runner has all of them (see .github/workflows/gemfall-apk.yml).
# VERSION_CODE (a whole number that goes up each build) lets a new APK install over the old one and keep progress.
set -euo pipefail
cd "$(dirname "$0")"
VERSION_CODE="${VERSION_CODE:-1}"
KEY_PASS=gemfall-share

./copy-web.sh
npm ci --no-audit --no-fund
rm -rf android
npx cap add android
npx capacitor-assets generate --android \
  --iconBackgroundColor '#5411af' --iconBackgroundColorDark '#5411af' \
  --splashBackgroundColor '#1a1233' --splashBackgroundColorDark '#1a1233'

# portrait only, and a version number that goes up with every build
sed -i 's|android:name=".MainActivity"|android:name=".MainActivity"\n            android:screenOrientation="portrait"|' android/app/src/main/AndroidManifest.xml
sed -i "s/versionCode 1\$/versionCode ${VERSION_CODE}/; s/versionName \"1.0\"/versionName \"1.${VERSION_CODE}\"/" android/app/build.gradle
grep -q 'screenOrientation="portrait"' android/app/src/main/AndroidManifest.xml
grep -q "versionCode ${VERSION_CODE}\$" android/app/build.gradle

[ "${SKIP_GRADLE:-}" = 1 ] && { echo "Android project ready (Gradle skipped)"; exit 0; }

cd android
chmod +x gradlew
./gradlew --no-daemon assembleRelease \
  -Pandroid.injected.signing.store.file="$PWD/../gemfall-share.keystore" \
  -Pandroid.injected.signing.store.password="$KEY_PASS" \
  -Pandroid.injected.signing.key.alias=gemfall \
  -Pandroid.injected.signing.key.password="$KEY_PASS"
OUT=app/build/outputs/apk/release
if [ -f "$OUT/app-release.apk" ]; then
  cp "$OUT/app-release.apk" ../Gemfall.apk
else
  # fall back to signing by hand if Gradle left the APK unsigned
  BT=$(ls -d "$ANDROID_HOME"/build-tools/* | sort -V | tail -1)
  "$BT/zipalign" -f 4 "$OUT/app-release-unsigned.apk" aligned.apk
  "$BT/apksigner" sign --ks ../gemfall-share.keystore --ks-pass "pass:$KEY_PASS" --key-pass "pass:$KEY_PASS" --ks-key-alias gemfall --out ../Gemfall.apk aligned.apk
fi
ls -l ../Gemfall.apk
