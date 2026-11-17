const {chromium} = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({viewport: {width: 390, height: 844}});
  for (const u of ['/games/', '/shadowing/', '/7-day-sprint/', '/course/']) { await p.goto('http://localhost:8765' + u, {waitUntil: 'networkidle'}); await p.waitForTimeout(500);
    console.log(u, await p.evaluate(() => [...document.querySelectorAll('main button, main a.key, main [data-go]')].filter(e => e.offsetParent).slice(0, 60).map(e => (e.id ? '#' + e.id : e.className.split(' ').slice(0, 2).join('.')) + ':' + e.textContent.trim().slice(0, 18) + '@' + Math.round(e.getBoundingClientRect().top + scrollY)).join(' | '))); }
  await b.close(); })();
