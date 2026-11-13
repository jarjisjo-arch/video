import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { App } from '@capacitor/app';
import { save } from './state';

export const native = Capacitor.isNativePlatform();
export function buzz(kind: 'light' | 'medium' | 'heavy' = 'light') {
  if (!save.settings.haptics) return;
  try {
    if (native) Haptics.impact({ style: kind === 'heavy' ? ImpactStyle.Heavy : kind === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light }).catch(() => {});
    else if (navigator.vibrate) navigator.vibrate(kind === 'heavy' ? 40 : kind === 'medium' ? 20 : 8);
  } catch { /* no haptics */ }
}
export function onBack(fn: () => void) { if (native) App.addListener('backButton', fn); else window.addEventListener('keydown', e => { if (e.key === 'Escape') fn(); }); }
export function onPause(fn: () => void) {
  document.addEventListener('visibilitychange', () => { if (document.hidden) fn(); });
  if (native) App.addListener('appStateChange', s => { if (!s.isActive) fn(); });
}
export function onResume(fn: () => void) {
  document.addEventListener('visibilitychange', () => { if (!document.hidden) fn(); });
  if (native) App.addListener('appStateChange', s => { if (s.isActive) fn(); });
}
export function exitApp() { if (native) App.exitApp(); }

/** Share a canvas snapshot. Uses the native share sheet in the app, the Web Share API in browsers. Returns false if nothing could be shared. */
export async function shareCanvas(canvas: HTMLCanvasElement, text: string): Promise<boolean> {
  try {
    const dataUrl = canvas.toDataURL('image/png');
    if (native) {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');
      const name = `moonpull-${Date.now()}.png`;
      const res = await Filesystem.writeFile({ path: name, data: dataUrl.split(',')[1], directory: Directory.Cache });
      await Share.share({ text, files: [res.uri] });
      return true;
    }
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], 'moonpull.png', { type: 'image/png' });
    const nav = navigator as any;
    if (nav.canShare && nav.canShare({ files: [file] })) { await nav.share({ files: [file], text }); return true; }
  } catch { /* cancelled or unsupported */ }
  return false;
}
