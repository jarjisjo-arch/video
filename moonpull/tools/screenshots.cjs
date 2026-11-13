// Store screenshots (1920x1080). Needs `npm run build && npx vite preview --port 4173` running.
const { chromium } = require('playwright'); const path = require('path');
const out = path.join(__dirname, '../store/screenshots');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 2 });
  await p.addInitScript(() => { localStorage.setItem('moonpull.save.v1', JSON.stringify({ seen: { intro: true, tut: true, h_reef: true, h_over: true, h_bar: true, h_whirl: true, h_rip: true, h_cloud: true, coast1: true }, stars: [7, 7, 5, 7, 3, 7, 5, 3, 7, 5, 3, 1, 3].concat(Array(17).fill(0)), xp: 1250, flies: 310, power: 'spring', rankSeen: 5, stats: { nights: 13, near: 3, fliesAll: 300, dist: 900 }, daily: { last: new Date().toISOString().slice(0, 10), streak: 3 } })); });
  await p.goto('http://localhost:4173/'); await p.waitForTimeout(1500);
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: out + '/1-title.png' });
  const play = async (n, t, my, mdx, wait, file, mult) => {
    await p.evaluate(([n, t, my, mdx, mult]) => { const g = window.__game; g.start('night', n); const ui = document.getElementById('ui'); ui.innerHTML = ''; ui.className = ''; document.getElementById('hud').hidden = false;
      const s = g.sim; const o = s.level.obs.filter(o => o.t === t)[1] || s.level.obs.find(o => o.t === t); s.boat.x = o.x - (t === 'rip' || t === 'cloud' ? -140 : 150); s.camX = s.boat.x - 250; s.i0 = -99999; s.mult = mult; s.fliesGot = 17; s.t = 31;
      clearInterval(window.__drv); window.__drv = setInterval(() => { g.moon.sx = s.boat.x + mdx - s.camX; g.moon.y = my; }, 16); }, [n, t, my, mdx, mult]);
    await p.waitForTimeout(wait); await p.screenshot({ path: out + '/' + file });
  };
  await play(6, 'reef', 168, -48, 1500, '2-reef.png', 3.4);
  await play(8, 'over', 34, -230, 2300, '3-overhang.png', 1);
  await play(15, 'whirl', 172, -44, 1500, '4-shallows.png', 2.5);
  await play(24, 'cloud', 92, -62, 1500, '5-storm.png', 4.2);
  await p.evaluate(() => { clearInterval(window.__drv); window.__game.start('attract'); document.getElementById('hud').hidden = true; });
  await p.evaluate(() => document.querySelector('#ui').innerHTML = ''); await p.reload(); await p.waitForTimeout(1200);
  await p.click('text=Voyage map'); await p.waitForTimeout(500); await p.screenshot({ path: out + '/6-map.png' });
  await p.click('[data-a="go:title"]'); await p.click('text=Harbour'); await p.waitForTimeout(400); await p.screenshot({ path: out + '/7-harbour.png' });
  await p.click('[data-a="go:title"]'); await p.click('text=Letter'); await p.click('text=Replay: the storm'); await p.waitForTimeout(1200); await p.mouse.click(300, 150); await p.waitForTimeout(900); await p.mouse.click(300, 150); await p.waitForTimeout(3500); await p.screenshot({ path: out + '/8-story.png' });
  await b.close(); console.log('screenshots written');
})();
