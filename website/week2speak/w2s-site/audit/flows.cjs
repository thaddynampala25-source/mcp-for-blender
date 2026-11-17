const {chromium} = require('playwright');
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({viewport: {width: 390, height: 844}, hasTouch: true, isMobile: true}); const p = await ctx.newPage(); const R = {};
  const B = 'http://localhost:8765';
  // Speech Mode scene: taps and scrolling needed
  await p.goto(B + '/speech-mode/', {waitUntil: 'networkidle'}); await p.waitForTimeout(500);
  let taps = 0, sends = 0; const y0 = await p.evaluate(() => Math.round(document.getElementById('composer').getBoundingClientRect().top + scrollY));
  for (let i = 0; i < 12; i++) { if (await p.locator('#speakInput').isDisabled()) break; await p.fill('#speakInput', 'I would like a coffee please'); await p.click('#speakSend'); taps += 2; sends++; await p.waitForTimeout(250); }
  R.speech = {composerY: y0, screensToScroll: +(y0 / 844).toFixed(1), replies: sends, tapsTyping: taps, tapsWithMic: sends, lastMsgVisibleWithComposer: await p.evaluate(() => { const c = document.getElementById('chat').getBoundingClientRect(), f = document.getElementById('composer').getBoundingClientRect(); return Math.round(f.bottom - c.top); })};
  // Home to first spoken sentence
  await p.goto(B + '/', {waitUntil: 'networkidle'}); await p.waitForTimeout(600);
  R.home = await p.evaluate(() => { const t = document.getElementById('try'); const cta = [...document.querySelectorAll('main a.key')].filter(a => a.offsetParent)[0]; return {firstCta: cta.textContent.trim(), ctaHref: cta.getAttribute('href'), tryY: t ? Math.round(t.getBoundingClientRect().top + scrollY) : null, pageH: document.documentElement.scrollHeight}; });
  await p.goto(B + '/7-day-sprint/', {waitUntil: 'networkidle'}); await p.waitForTimeout(500);
  R.sprint = await p.evaluate(() => { const n = document.querySelector('#today .key.primary'); const ticks = document.querySelectorAll('#today [data-tick]').length; return {next: n && n.textContent.trim(), nextY: n && Math.round(n.getBoundingClientRect().top + scrollY), todayTasks: document.querySelectorAll('.day.open .task, .day[open] .task').length, ticks}; });
  await p.goto(B + '/join/', {waitUntil: 'networkidle'}); await p.waitForTimeout(400);
  R.join = await p.evaluate(() => { const f = document.querySelector('main form'); return {fields: [...f.querySelectorAll('input,select,textarea')].filter(e => e.offsetParent).map(e => (e.id || e.name) + (e.required ? '*' : '')), submitY: Math.round(document.getElementById('jSend').getBoundingClientRect().top + scrollY)}; });
  console.log(JSON.stringify(R, null, 1)); await b.close(); })();
