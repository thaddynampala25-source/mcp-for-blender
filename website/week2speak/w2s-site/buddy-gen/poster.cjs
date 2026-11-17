// Static pictures of both Buddies (the no-WebGL fallback and the placeholder before the 3D loads), rendered from the real models.
const {chromium} = require('playwright'); const fs = require('fs'); const {execFileSync} = require('child_process');
(async () => { const b = await chromium.launch({args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
  for (const [id, name] of [['mila', 'ruby'], ['rio', 'max']]) { const ctx = await b.newContext({viewport: {width: 360, height: 640}, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true}); const p = await ctx.newPage();
    await p.addInitScript(i => { try { const s = JSON.parse(localStorage.getItem('w2s.v1') || '{}'); s.buddy = i; localStorage.setItem('w2s.v1', JSON.stringify(s)); } catch (e) {} }, id);
    await p.goto('http://localhost:8765/speech-mode/', {waitUntil: 'networkidle'}); await p.waitForFunction(() => window.W2SBuddies && window.W2SBuddies.ready, null, {timeout: 60000}); await p.waitForTimeout(2600);
    const url = await p.evaluate(() => { const D = window.W2SBuddies; D.view({rot: 0, blink: 0}); return D.snap(); });
    fs.writeFileSync('buddy-gen/out/' + name + '.png', Buffer.from(url.split(',')[1], 'base64')); console.log(name, await p.evaluate(() => window.W2SBuddies.id + ' ' + JSON.stringify(window.W2SBuddies.info))); await ctx.close(); }
  await b.close();
  execFileSync('python3', ['-c', "from PIL import Image\nfor n in ('ruby','max'):\n    im=Image.open('buddy-gen/out/%s.png'%n); im.save('buddy-gen/out/%s.webp'%n,'WEBP',quality=84,method=6); print(n, im.size)"], {stdio: 'inherit'}); })();
