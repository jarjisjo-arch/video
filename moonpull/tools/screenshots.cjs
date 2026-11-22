// Store screenshots (1920x1080). Needs `npm run build && npx vite preview --port 4173` running.
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const out = path.join(__dirname, '../store/screenshots'); fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 2 });
  await p.addInitScript(() => { if (!localStorage.getItem('moonpull.save.v2')) localStorage.setItem('moonpull.save.v2', JSON.stringify({ seen: { intro: true, held: true, h_start: true, h_rock: true, h_arch: true, h_whale: true, h_ring: true, h_storm: true, coast1: true },
    stars: [7, 7, 5, 7, 3, 7, 5, 7, 7, 5, 3, 1].concat(Array(12).fill(0)), flies: 640, boats: ['paper', 'reed'], built: ['pier', 'net', 'bakery', 'school', 'market'], xp: 1250, rankSeen: 5 })); });
  await p.goto('http://localhost:4173/'); await p.waitForTimeout(1800);
  await p.screenshot({ path: out + '/1-village.png' });
  const scene = async (n, t, dx, hold, wait, file, mut) => {
    await p.evaluate(([n, t, dx, hold, mut]) => { const g = window.__game; g.start('night', n); const ui = document.getElementById('ui'); ui.innerHTML = ''; ui.className = ''; document.getElementById('hud').hidden = false; document.getElementById('hint').hidden = true;
      const s = g.sim; const o = s.lvl.obs.filter(o => o.t === t)[1] || s.lvl.obs.find(o => o.t === t); s.b.x = o.x + dx; s.b.y = s.surf.y(s.b.x); s.b.s = 500; s.storm = s.b.x - 520; g.cam.x = s.b.x - 300; s.flies = 21; s.fliesGot = 19; s.score = 8420;
      if (mut) { s.chain = 10; s.fever = true; }
      document.getElementById('pause').innerHTML = '<svg viewBox="0 0 24 24"><rect x="6.5" y="5" width="4" height="14" rx="1.5" fill="currentColor"/><rect x="13.5" y="5" width="4" height="14" rx="1.5" fill="currentColor"/></svg>';
      clearInterval(window.__drv); window.__drv = setInterval(() => { const b = s.b; g.hold = hold === 'always' ? true : hold === 'never' ? false : (b.air ? (b.vy > 0 && s.surf.d1(b.x + b.vx * 0.25) > 0) : s.surf.d1(b.x) > 0.02); }, 16); }, [n, t, dx, hold, mut]);
    await p.waitForTimeout(wait); await p.evaluate(() => { window.__game.paused = true; }); await p.waitForTimeout(80); await p.screenshot({ path: out + '/' + file });
    await p.evaluate(() => { window.__game.paused = false; });
  };
  await scene(6, 'whale', 30, 'never', 700, '2-breach.png');
  await scene(4, 'rock', -260, 'never', 200, '3-reef.png');
  await scene(9, 'ring', -170, 'auto', 520, '4-ring.png');
  await scene(4, 'arch', -150, 'always', 650, '5-arch.png');
  await scene(17, 'rock', -330, 'auto', 520, '6-moonrise.png', true);
  await p.evaluate(() => { clearInterval(window.__drv); const g = window.__game; g.home(); }); await p.reload(); await p.waitForTimeout(1200);
  await p.click('.tile:has-text("Voyage")'); await p.waitForTimeout(500); await p.screenshot({ path: out + '/7-voyage.png' });
  await p.click('[data-a="go:home"]'); await p.click('.tile:has-text("Letter")'); await p.click('text=The storm'); await p.waitForTimeout(1000);
  for (let i = 0; i < 3; i++) { await p.mouse.click(300, 150); await p.waitForTimeout(800); } await p.waitForTimeout(2500); await p.screenshot({ path: out + '/8-story.png' });
  await b.close(); console.log('screenshots written');
})();
