// Generates launcher icons, splash screens and the Play feature graphic. Run: node tools/assets.cjs
// The feature graphic uses the real game renderer, so `npm run build && npx vite preview --port 4173` must be running.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const res = path.join(__dirname, '../android/app/src/main/res'); const store = path.join(__dirname, '../store');
const font = f => fs.readFileSync(path.join(__dirname, '../node_modules', f)).toString('base64');
const css = `@font-face{font-family:S;src:url(data:font/woff2;base64,${font('@fontsource/shrikhand/files/shrikhand-latin-400-normal.woff2')})}
@font-face{font-family:B;src:url(data:font/woff2;base64,${font('@fontsource-variable/baloo-2/files/baloo-2-latin-wght-normal.woff2')})}*{margin:0}`;
// icon art in a 108x108 box (Android adaptive icon units); the middle 66 is always visible
const boat = (x, y, a, s) => `<g transform="translate(${x},${y}) rotate(${a}) scale(${s})">
  <circle cx="-4" cy="-38" r="22" fill="url(#lg)"/>
  <path d="M-22,-6 L22,-6 L12,7 L-12,7Z" fill="#b9b3c9"/><path d="M-22,-6 L22,-6 L14,2 L-14,2Z" fill="#fffaf0"/>
  <path d="M-11,-6 L0,-22 L11,-6Z" fill="#fffaf0"/><path d="M0,-22 L11,-6 L0,-6Z" fill="#3c325a" opacity=".25"/>
  <path d="M-4,-6 V-34" stroke="#2a2238" stroke-width="1.6"/><rect x="-8" y="-44" width="8" height="13" rx="1.5" fill="#ff8a3d"/><ellipse cx="-4" cy="-37" rx="2" ry="3.4" fill="#fff6d8"/></g>`;
const defs = `<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#060a1f"/><stop offset=".55" stop-color="#16225a"/><stop offset="1" stop-color="#3a4a8e"/></linearGradient>
  <radialGradient id="halo"><stop offset="0" stop-color="#ffd98a" stop-opacity=".55"/><stop offset=".45" stop-color="#ffd98a" stop-opacity=".14"/><stop offset="1" stop-color="#ffd98a" stop-opacity="0"/></radialGradient>
  <radialGradient id="moon" cx=".4" cy=".38" r=".7"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#fff2cf"/><stop offset="1" stop-color="#ffd98a"/></radialGradient>
  <radialGradient id="lg"><stop offset="0" stop-color="#ffb070" stop-opacity=".95"/><stop offset=".4" stop-color="#ff8a3d" stop-opacity=".35"/><stop offset="1" stop-color="#ff8a3d" stop-opacity="0"/></radialGradient>
  <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a66a8"/><stop offset=".5" stop-color="#123063"/><stop offset="1" stop-color="#07122b"/></linearGradient></defs>`;
const fg = `${defs}
  <circle cx="40" cy="38" r="30" fill="url(#halo)"/><circle cx="40" cy="38" r="14" fill="url(#moon)"/>
  <circle cx="35" cy="34" r="2.4" fill="#8a7aa8" opacity=".3"/><circle cx="45" cy="43" r="3.2" fill="#8a7aa8" opacity=".25"/>
  <path d="M0,80 C18,80 30,70 44,62 C58,55 68,58 80,66 C92,74 100,76 108,76 V108 H0Z" fill="url(#sea)"/>
  <path d="M0,80 C18,80 30,70 44,62 C58,55 68,58 80,66 C92,74 100,76 108,76" fill="none" stroke="#eaf2ff" stroke-width="1.8" stroke-linecap="round"/>
  ${boat(70, 52, -14, 0.62)}
  <g fill="#fffbe6"><circle cx="52" cy="47" r="1.1"/><circle cx="57" cy="44" r="1.3"/><circle cx="84" cy="42" r="1"/></g>`;
const svg = (inner, bg, vb = '0 0 108 108') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="100%" height="100%">${bg ? `<rect x="-200" y="-200" width="600" height="600" fill="url(#sky)"/>` : ''}${inner}</svg>`;

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const shot = async (html, w, h, file, transparent = false, extra = '') => {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.setContent(`<style>${css}html,body{width:${w}px;height:${h}px;overflow:hidden;background:${transparent ? 'transparent' : '#070b1e'}}${extra}</style>${html}`);
    await p.evaluate(() => document.fonts.ready);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await p.screenshot({ path: file, omitBackground: transparent }); await p.close();
  };
  // adaptive icon: background layer is plain sky, foreground carries the art (with its own sky so the legacy icons match)
  const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [d, k] of Object.entries(dens)) {
    await shot(svg(fg, true), 108 * k, 108 * k, `${res}/mipmap-${d}/ic_launcher_foreground.png`, true);
    await shot(svg(fg, true, '18 18 72 72'), 48 * k, 48 * k, `${res}/mipmap-${d}/ic_launcher.png`, true, 'svg{border-radius:22%}');
    await shot(svg(fg, true, '18 18 72 72'), 48 * k, 48 * k, `${res}/mipmap-${d}/ic_launcher_round.png`, true, 'svg{border-radius:50%}');
  }
  await shot(svg(fg, true, '18 18 72 72'), 512, 512, `${store}/icon-512.png`);
  // splash screens at the sizes Capacitor generated
  const splash = (w, h) => { const m = Math.min(w, h); return `<div style="width:${w}px;height:${h}px;display:grid;place-items:center;background:radial-gradient(circle at 50% 45%,#1a2556,#070b1e 70%)"><div style="width:${m * 0.2}px;height:${m * 0.2}px;border-radius:50%;background:radial-gradient(circle at 40% 38%,#fff,#fff2cf 55%,#ffd98a);box-shadow:0 0 ${m * 0.12}px ${m * 0.03}px rgba(255,217,138,.35)"></div></div>`; };
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  for (const f of walk(res).filter(f => f.endsWith('splash.png'))) { const buf = fs.readFileSync(f); await shot(splash(buf.readUInt32BE(16), buf.readUInt32BE(20)), buf.readUInt32BE(16), buf.readUInt32BE(20), f); }
  // feature graphic 1024x500: a real frame from the game with the logo on top
  const p = await b.newPage({ viewport: { width: 1024, height: 500 } });
  await p.addInitScript(() => localStorage.setItem('moonpull.save.v2', JSON.stringify({ seen: { intro: true, held: true, h_start: true, h_rock: true, h_arch: true, h_whale: true, h_ring: true, h_storm: true } })));
  await p.goto('http://localhost:4173/'); await p.waitForTimeout(1200);
  await p.evaluate(() => { const g = window.__game; g.start('night', 11); const s = g.sim; const o = s.lvl.obs.filter(o => o.t === 'whale')[1]; s.b.x = o.x + 20; s.b.y = s.surf.y(s.b.x); s.b.s = 520; s.storm = -9e9; g.cam.x = s.b.x - 760;
    document.getElementById('ui').innerHTML = ''; document.getElementById('hud').hidden = true; window.__drv = setInterval(() => { g.hold = false; }, 16); });
  await p.waitForTimeout(700);
  await p.evaluate(() => { window.__game.paused = true; window.__game.fx.pops = []; const d = document.createElement('div'); d.innerHTML = '<h1>Moonpull</h1><p>You are the moon. Move the sea.</p>';
    d.style.cssText = 'position:fixed;right:52px;top:36px;text-align:right;'; document.body.appendChild(d);
    const h = d.querySelector('h1'); h.style.cssText = 'font-family:Shrikhand;font-weight:400;font-size:112px;line-height:1;background:linear-gradient(180deg,#fff6d6 10%,#ffd36b 55%,#ff9e3d 95%);-webkit-background-clip:text;color:transparent;filter:drop-shadow(0 4px 0 #6a2b06) drop-shadow(0 10px 24px rgba(0,0,0,.6));transform:rotate(-3deg);transform-origin:right center';
    const q = d.querySelector('p'); q.style.cssText = 'font:700 30px "Baloo 2 Variable";color:#fff4df;margin:6px 0 0 8px;text-shadow:0 2px 10px rgba(0,0,0,.8)'; });
  await p.waitForTimeout(300); await p.screenshot({ path: `${store}/feature-graphic-1024x500.png` });
  await b.close(); console.log('assets written');
})();
