const {chromium} = require('playwright');
(async () => { const b = await chromium.launch({args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']}); const p = await b.newPage({viewport: {width: 390, height: 844}, deviceScaleFactor: 2}); p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('http://localhost:8765/speech-mode/?fps=1', {waitUntil: 'networkidle'}); await p.waitForFunction(() => window.W2SBuddies && window.W2SBuddies.ready, null, {timeout: 90000});
  for (let i = 0; i < 12; i++) { await p.waitForTimeout(1000); console.log(await p.evaluate(() => { const D = window.W2SBuddies; return D.fps + ' fps, quality ' + D.quality + ', slowFor ' + D.info.slowFor; })); }
  console.log((await p.locator('#smFps').innerText()).replace(/\n/g, ' | ')); await b.close(); })();
