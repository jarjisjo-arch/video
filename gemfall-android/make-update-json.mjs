// Writes update.json, the file the Android app reads on launch to find updates.
// Usage: node make-update-json.mjs <build number> <content zip> <output file>
// Settings come from update-policy.json (see README "Shipping updates"); URLs from RELEASE_BASE.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const [build, zip, out] = process.argv.slice(2);
const n = Number(build);
if (!Number.isInteger(n) || n < 1 || !zip || !out) throw new Error('usage: node make-update-json.mjs <build> <zip> <out>');
const policy = JSON.parse(readFileSync(new URL('./update-policy.json', import.meta.url)));
const base = process.env.RELEASE_BASE || 'https://github.com/jarjisjo-arch/video/releases/download/gemfall-latest';
const manifest = {
  build: n,
  // newer game content that apps at or above minApp can download without reinstalling
  content: { build: n, url: `${base}/gemfall-web.zip`, sha256: createHash('sha256').update(readFileSync(zip)).digest('hex'), minApp: policy.minApp, notes: policy.notes || '' },
  apk: { url: `${base}/Gemfall.apk`, versionCode: n, versionName: `1.${n}` },
  // apps older than this must install the new APK before they can play
  forceAppBelow: policy.forceAppBelow || 0,
  // content older than this switches to the new content immediately instead of at the next restart
  forceContentBelow: policy.forceContentBelow || 0,
  message: policy.message || ''
};
writeFileSync(out, JSON.stringify(manifest, null, 2) + '\n');
console.log(`update.json: build ${n}, content needs app >= ${policy.minApp}, force app below ${manifest.forceAppBelow}, force content below ${manifest.forceContentBelow}`);
