// Generates launcher icons, splash screens and the Play feature graphic. Run: node tools/assets.cjs
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const res = path.join(__dirname, '../android/app/src/main/res'); const store = path.join(__dirname, '../store');
const font = fs.readFileSync(path.join(__dirname, '../node_modules/@fontsource/gloock/files/gloock-latin-400-normal.woff2')).toString('base64');
const hand = fs.readFileSync(path.join(__dirname, '../node_modules/@fontsource/caveat/files/caveat-latin-600-normal.woff2')).toString('base64');
const css = `@font-face{font-family:G;src:url(data:font/woff2;base64,${font})}@font-face{font-family:H;src:url(data:font/woff2;base64,${hand})}*{margin:0}`;
// art is drawn in a 108x108 box (Android adaptive icon units); the middle 66 is always visible
const boat = (x, y, a, s = 1) => `<g transform="translate(${x},${y}) rotate(${a}) scale(${s})"><path d="M0,-4 V-25" stroke="#0f1528" stroke-width="1.6"/><circle cx="0" cy="-28" r="11" fill="#e4572e" opacity=".28"/><rect x="-4" y="-34" width="8" height="11" rx="2" fill="#e4572e"/><path d="M-19,-5 L19,-5 L11,6 L-11,6 Z" fill="#efe6d2"/><path d="M-9,-5 L0,-17 L9,-5 Z" fill="#efe6d2"/><path d="M0,-17 L9,-5 L0,-5 Z" fill="#000" opacity=".14"/></g>`;
const fg = `<circle cx="43" cy="40" r="22" fill="#f4d58d" opacity=".16"/><circle cx="43" cy="40" r="15" fill="#f4d58d"/><circle cx="38" cy="36" r="2.6" fill="#1b2440" opacity=".16"/><circle cx="48" cy="45" r="3.6" fill="#1b2440" opacity=".14"/>
<path d="M0,74 C20,72 30,56 46,56 C62,56 72,72 108,70 V108 H0 Z" fill="#3e6c8a"/>${boat(66, 64.5, 22, 0.62)}
<path d="M0,80 C22,78 32,62 48,62 C64,62 76,78 108,76 V108 H0 Z" fill="#234a6e"/><path d="M36,74 h16 M40,80 h9" stroke="#f4d58d" stroke-width="2" stroke-linecap="round" opacity=".7"/>`;
const svg = (inner, bg, vb = '0 0 108 108') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="100%" height="100%">${bg ? `<rect x="-200" y="-200" width="600" height="600" fill="#1b2440"/>` : ''}${inner}</svg>`;

(async () => {
  const b = await chromium.launch();
  const shot = async (html, w, h, file, transparent = false, clip = '') => {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.setContent(`<style>${css}html,body{width:${w}px;height:${h}px;overflow:hidden;background:${transparent ? 'transparent' : '#161d36'}}${clip}</style>${html}`);
    await p.evaluate(() => document.fonts.ready);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await p.screenshot({ path: file, omitBackground: transparent }); await p.close();
  };
  const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [d, k] of Object.entries(dens)) {
    await shot(svg(fg, false), 108 * k, 108 * k, `${res}/mipmap-${d}/ic_launcher_foreground.png`, true);
    await shot(svg(fg, true, '18 18 72 72'), 48 * k, 48 * k, `${res}/mipmap-${d}/ic_launcher.png`, true, 'svg{border-radius:18%}');
    await shot(svg(fg, true, '18 18 72 72'), 48 * k, 48 * k, `${res}/mipmap-${d}/ic_launcher_round.png`, true, 'svg{border-radius:50%}');
  }
  await shot(svg(fg, true, '18 18 72 72'), 512, 512, `${store}/icon-512.png`);
  // splash screens: same size as the files Capacitor generated
  const splash = (w, h) => { const m = Math.min(w, h); return `<div style="width:${w}px;height:${h}px;display:grid;place-items:center;background:#161d36"><div style="width:${m * 0.2}px;height:${m * 0.2}px;border-radius:50%;background:#f4d58d;box-shadow:0 0 0 ${m * 0.05}px rgba(244,213,141,.16)"></div></div>`; };
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  for (const f of walk(res).filter(f => f.endsWith('splash.png'))) {
    const buf = fs.readFileSync(f); const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
    await shot(splash(w, h), w, h, f);
  }
  // Play feature graphic 1024x500
  const scene = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 500" width="1024" height="500"><rect width="1024" height="500" fill="#1b2440"/>
  ${Array.from({ length: 60 }, (_, i) => `<circle cx="${(Math.sin(i * 91.7) * 0.5 + 0.5) * 1024}" cy="${(Math.sin(i * 47.3) * 0.5 + 0.5) * 300}" r="${1 + (i % 3) * 0.6}" fill="#efe6d2" opacity=".55"/>`).join('')}
  <path d="M0,330 C120,300 220,340 340,310 C470,280 560,335 700,300 C820,275 920,320 1024,300 V500 H0 Z" fill="#2c3a66"/>
  <g transform="translate(120 0)">
  <circle cx="700" cy="150" r="92" fill="#f4d58d" opacity=".12"/><circle cx="700" cy="150" r="60" fill="#f4d58d"/><circle cx="680" cy="134" r="10" fill="#1b2440" opacity=".16"/><circle cx="722" cy="172" r="15" fill="#1b2440" opacity=".14"/><circle cx="714" cy="122" r="6" fill="#1b2440" opacity=".14"/>
  <path d="M-200,392 C240,392 520,380 620,300 C680,262 730,262 790,300 C860,352 940,384 1024,384 V500 H-200 Z" fill="#3e6c8a"/>
  ${boat(858, 345, 30, 2.1)}
  <path d="M-200,412 C240,412 520,400 630,322 C690,284 740,284 800,322 C870,372 950,404 1024,404 V500 H-200 Z" fill="#234a6e"/>
  <path d="M650,352 h100 M670,380 h62 M688,408 h28" stroke="#f4d58d" stroke-width="8" stroke-linecap="round" opacity=".65"/>
  </g>
  <text x="64" y="232" font-family="G" font-size="118" fill="#f4d58d">Moonpull</text><text x="70" y="290" font-family="H" font-size="46" fill="#efe6d2">You are the moon. Move the sea.</text></svg>`;
  await shot(scene, 1024, 500, `${store}/feature-graphic-1024x500.png`);
  await b.close(); console.log('assets written');
})();
