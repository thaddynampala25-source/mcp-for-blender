// Quick look at the Speech Mode layout at several sizes.
const {chromium} = require('playwright');
(async () => { const b = await chromium.launch({args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']}); const out = process.argv[2] || 'audit/wip';
  for (const [w, h, tag] of [[360, 640, 'p360'], [390, 844, 'p390'], [1440, 900, 'd1440']]) { const p = await b.newPage({viewport: {width: w, height: h}, hasTouch: w < 500, isMobile: w < 500}); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto('http://localhost:8765/speech-mode/', {waitUntil: 'networkidle'}); await p.waitForTimeout(1500);
    const m = async () => p.evaluate(() => { const r = id => { const e = document.getElementById(id); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; }; return {state: document.getElementById('sm').dataset.state, nav: document.querySelector('.nav').offsetHeight, stage: r('buddy'), bar: r('composer'), mic: r('speakMic'), field: r('speakInput'), help: r('helpBtn'), sub: r('smSub'), scrollH: document.documentElement.scrollHeight, over: document.documentElement.scrollWidth - innerWidth, vh: innerHeight}; });
    console.log(tag, JSON.stringify(await m()), errs.slice(0, 3)); await p.screenshot({path: out + '-' + tag + '-landing.png'});
    await p.click('#smStart'); await p.waitForTimeout(900); await p.screenshot({path: out + '-' + tag + '-speaking.png'});
    await p.fill('#speakInput', 'I have 25 years and I want a coffee'); await p.click('#speakSend'); await p.waitForTimeout(900); console.log(tag, 'after send', JSON.stringify(await m())); await p.screenshot({path: out + '-' + tag + '-fix.png'});
    await p.click('#helpBtn'); await p.click('#helpBtn'); await p.waitForTimeout(600); await p.screenshot({path: out + '-' + tag + '-help.png'});
    if (w < 500) { await p.click('#smMenu'); await p.waitForTimeout(700); await p.screenshot({path: out + '-' + tag + '-sheet.png'}); }
    await p.close(); }
  await b.close(); })();
