import '@fontsource/shrikhand/400.css';
import '@fontsource-variable/baloo-2';
import './style.css';
import { load } from './state';
import { Game } from './game';
import { initUI } from './ui';

load();
const game = new Game(document.getElementById('c') as HTMLCanvasElement);
initUI(game);
(document as any).fonts?.load('40px Shrikhand');
(window as any).__game = game;
