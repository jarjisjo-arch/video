// Updates for the Android app. On launch it reads update.json from the GitHub release and then either:
//  - blocks play until the player installs a newer app, when the app is older than `forceAppBelow`;
//  - downloads newer game content (levels, art, sounds, fixes) and switches to it, using the Capgo updater
//    plugin, which rolls back by itself if the new content fails to start;
//  - or, when newer content needs a newer app, suggests installing it.
// Nothing here runs in a normal browser.
import { BUILD } from './build-info.js';

const MANIFEST = 'https://github.com/jarjisjo-arch/video/releases/download/gemfall-latest/update.json';
const cap = window.Capacitor;
export const isApp = !!(cap && typeof cap.nativePromise === 'function' && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
const call = (plugin, method, options = {}) => cap.nativePromise(plugin, method, options);

// Tell the updater this content started fine. Without this call, content that fails to load
// is rolled back to the previous version on the next launch.
export function appReady() {
  if (isApp) call('CapacitorUpdater', 'notifyAppReady').catch(() => {});
}

// The installed app: its build number and where it came from. The version name is "1.<build>" for the
// APK shared from GitHub and "1.<build>-play" for the Google Play build.
export async function appInfo() {
  if (!isApp) return { build: 0, channel: 'web' };
  try {
    const name = String((await call('CapacitorUpdater', 'current')).native || '');
    const n = parseInt(name.split('.')[1], 10);
    return { build: Number.isFinite(n) ? n : 0, channel: /play/i.test(name) ? 'play' : 'github' };
  } catch (e) { return { build: 0, channel: 'github' }; }
}
export async function appBuild() { return (await appInfo()).build; }

async function fetchManifest() {
  // native request: GitHub's release downloads don't allow requests from web pages
  const res = await call('CapacitorHttp', 'request', {
    url: `${MANIFEST}?t=${Date.now()}`, method: 'GET', responseType: 'text', headers: { 'Cache-Control': 'no-cache' }
  });
  if (res.status !== 200) throw new Error(`update.json: HTTP ${res.status}`);
  return typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
}

// What to do, from the manifest, the app's build and the content's build. Pure, so it can be tested.
export function decide(m, app, content) {
  if (!m) return { action: 'none' };
  if (app > 0 && app < (m.forceAppBelow || 0)) return { action: 'forceApp' };
  const c = m.content;
  if (!c || !(c.build > content)) return { action: 'none' };
  if (app < (c.minApp || 0)) return { action: 'suggestApp' };
  return { action: content < (m.forceContentBelow || 0) ? 'contentNow' : 'content' };
}

// ui: { forceApp(url, message, channel), suggestApp(url, message, channel), contentReady(restart, notes), contentApplying() }
export async function checkForUpdates(ui) {
  if (!isApp) return;
  let m, info;
  try { [m, info] = await Promise.all([fetchManifest(), appInfo()]); } catch (e) { return; /* offline: try next launch */ }
  const d = decide(m, info.build, BUILD.number);
  // a Google Play install must update through Google Play, never from a downloaded APK
  const store = info.channel === 'play' ? (m.play && m.play.url) : (m.apk && m.apk.url);
  if (d.action === 'forceApp') { ui.forceApp(store, m.message, info.channel); return; }
  if (d.action === 'suggestApp') { if (store) ui.suggestApp(store, m.message, info.channel); return; }
  if (d.action === 'none') return;
  try {
    const version = String(m.content.build);
    const { bundles = [] } = await call('CapacitorUpdater', 'list');
    let bundle = bundles.find((b) => b.version === version && b.status !== 'error' && b.status !== 'downloading');
    if (!bundle) bundle = await call('CapacitorUpdater', 'download', { url: m.content.url, version, checksum: m.content.sha256 });
    if (d.action === 'contentNow') {
      ui.contentApplying();
      await call('CapacitorUpdater', 'set', { id: bundle.id }); // reloads the game straight away
      return;
    }
    // switches over the next time the app is closed or put in the background, or now if the player taps Restart
    await call('CapacitorUpdater', 'next', { id: bundle.id });
    ui.contentReady(() => call('CapacitorUpdater', 'set', { id: bundle.id }), m.content.notes || '');
  } catch (e) { /* download failed or checksum mismatch: try again next launch */ }
}
