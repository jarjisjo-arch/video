import '@fontsource/shrikhand/400.css';
import '@fontsource-variable/baloo-2';
import './style.css';
import { load } from './state';
import { Game } from './game';
import { initUI } from './ui';

// show unexpected errors on screen so they can be reported from a phone
const report = (msg: string) => { const t = document.getElementById('toast'); if (!t) return; t.textContent = 'Something went wrong: ' + msg.slice(0, 140); t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 9000); };
window.addEventListener('error', e => report(String(e.message || e.error)));
window.addEventListener('unhandledrejection', e => report(String((e as PromiseRejectionEvent).reason)));

load();
const game = new Game(document.getElementById('c') as HTMLCanvasElement);
initUI(game);
(document as any).fonts?.load('40px Shrikhand');
(window as any).__game = game;
