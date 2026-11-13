import '@fontsource/gloock/400.css';
import '@fontsource/caveat/600.css';
import '@fontsource-variable/bricolage-grotesque';
import './style.css';
import { load } from './state';
import { Game } from './game';
import { initUI } from './ui';

load();
const game = new Game(document.getElementById('c') as HTMLCanvasElement);
initUI(game);
// fonts drawn on canvas need to be loaded before first use
(document as any).fonts?.load('600 24px Caveat');
(window as any).__game = game;
