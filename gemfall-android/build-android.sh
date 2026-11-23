#!/usr/bin/env bash
# Builds Gemfall.apk: copies the web game in, creates the Android project, icons and splash, then a signed APK.
# Needs Node 22+, JDK 21 and the Android SDK. GitHub's ubuntu-latest runner has all of them (see .github/workflows/gemfall-apk.yml).
# VERSION_CODE (a whole number that goes up each build) lets a new APK install over the old one and keep progress.
set -euo pipefail
cd "$(dirname "$0")"
VERSION_CODE="${VERSION_CODE:-1}"
KEY_PASS=gemfall-share  # not secret: the key is committed so every build is signed the same way

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
./gradlew --no-daemon assembleRelease
UNSIGNED=app/build/outputs/apk/release/app-release-unsigned.apk

# Sign with all three schemes (v1 JAR + v2 + v3). Some phone makers' installers (Xiaomi, OPPO, Realme, Vivo)
# reject an APK that only has the v2 signature with "package appears to be invalid".
BT=$(ls -d "${ANDROID_HOME:-$ANDROID_SDK_ROOT}"/build-tools/* | sort -V | tail -1)
"$BT/zipalign" -f -p 4 "$UNSIGNED" aligned.apk
"$BT/apksigner" sign --ks ../gemfall-share.keystore --ks-pass "pass:$KEY_PASS" --key-pass "pass:$KEY_PASS" --ks-key-alias gemfall \
  --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true --out ../Gemfall.apk aligned.apk
"$BT/apksigner" verify --verbose --min-sdk-version 18 ../Gemfall.apk | tee verify.txt
grep -q "v1 scheme (JAR signing): true" verify.txt
grep -q "v2 scheme (APK Signature Scheme v2): true" verify.txt
ls -l ../Gemfall.apk
