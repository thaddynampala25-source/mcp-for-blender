const { chromium } = require('playwright'); const fs = require('fs');
const NM = require('path').join(__dirname, '../w2s-show/node_modules');
const fontCss = `@font-face{font-family:"Bricolage Grotesque";src:url("http://localhost:8765/__f/b.woff2") format("woff2");font-weight:200 800;font-stretch:75% 100%}@font-face{font-family:"Figtree";src:url("http://localhost:8765/__f/f.woff2") format("woff2");font-weight:300 900}`;
const B = 'http://localhost:8765';
async function wire(ctx) {
  await ctx.route('**/fonts.googleapis.com/**', r => r.fulfill({contentType: 'text/css', body: fontCss}));
  await ctx.route('**/__f/b.woff2', r => r.fulfill({contentType: 'font/woff2', body: fs.readFileSync(NM + '/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-standard-normal.woff2')}));
  await ctx.route('**/__f/f.woff2', r => r.fulfill({contentType: 'font/woff2', body: fs.readFileSync(NM + '/@fontsource-variable/figtree/files/figtree-latin-wght-normal.woff2')}));
  await ctx.route('**/cdnjs.cloudflare.com/**/gsap.min.js', r => r.fulfill({contentType: 'text/javascript', body: fs.readFileSync(NM + '/gsap/dist/gsap.min.js')}));
  await ctx.route('**/cdnjs.cloudflare.com/**/ScrollTrigger.min.js', r => r.fulfill({contentType: 'text/javascript', body: fs.readFileSync(NM + '/gsap/dist/ScrollTrigger.min.js')}));
}
(async () => {
  const b = await chromium.launch(); const errs = []; const res = {};
  const ctx = await b.newContext({viewport: {width: 1280, height: 800}}); await wire(ctx);
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(p.url() + ' PAGEERROR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(p.url() + ' ' + m.text().slice(0, 160)); });
  p.on('response', r => { if (r.status() >= 400 && r.url().startsWith(B)) errs.push('HTTP ' + r.status() + ' ' + r.url()); });
  const pages = ['/', '/speech-mode/', '/games/', '/shadowing/', '/7-day-sprint/', '/course/', '/tutor/', '/join/', '/common-mistakes/', '/about/', '/privacy/'];
  for (const u of pages) {
    await p.goto(B + u); await p.waitForTimeout(1200);
    res[u] = await p.evaluate(() => ({title: document.title, h1: [...document.querySelectorAll('h1')].map(h => h.getAttribute('aria-label') || h.textContent.trim()).join(' | '), visible: [...document.querySelectorAll('[data-view]')].filter(v => !v.hidden).map(v => v.dataset.view).join(','), current: (document.querySelector('.tabs a[aria-current]') || {}).textContent, canon: document.querySelector('link[rel=canonical]').href, mic: document.documentElement.classList.contains('has-mic'), robots: document.querySelector('meta[name=robots]').content}));
    await p.screenshot({path: 'p' + (u.replace(/\//g, '') || 'home') + '.png'});
  }
  // links on every page resolve
  const hrefs = new Set(); for (const u of pages) { await p.goto(B + u); (await p.$$eval('a[href^="/"]', as => as.map(a => a.getAttribute('href')))).forEach(h => hrefs.add(h.split('#')[0])); }
  const bad = []; for (const h of hrefs) { const r = await p.request.get(B + h); if (r.status() >= 400) bad.push(h + ' ' + r.status()); }
  // cross-page go link: course -> shadowing clip
  await p.goto(B + '/course/'); await p.waitForTimeout(600); await p.locator('#lesson a[data-go]').first().click(); await p.waitForLoadState(); await p.waitForTimeout(800);
  const go = await p.evaluate(() => location.pathname + ' clip=' + (document.querySelector('#clips [aria-pressed="true"]') || {}).textContent);
  // speech mode works
  await p.goto(B + '/speech-mode/'); await p.waitForTimeout(600); await p.fill('#speakInput', 'I have 25 years and I want a coffee'); await p.click('#speakSend'); await p.waitForTimeout(300);
  const fixes = await p.locator('.fix').count();
  // join with no config
  await p.goto(B + '/join/'); await p.waitForTimeout(500); await p.fill('#jName', 'Test'); await p.click('#jSend'); await p.waitForTimeout(400); const jm = await p.locator('#jMsg').innerText();
  // home film + home Word Order still work
  await p.goto(B + '/'); await p.waitForTimeout(800); await p.evaluate(() => document.getElementById('try').scrollIntoView()); await p.waitForTimeout(500);
  for (const w of ['Where','is','the','bus','station']) await p.locator('#gPool .tile').filter({hasText: new RegExp('^' + w + '$')}).first().click();
  await p.waitForTimeout(400); const gm = await p.locator('#gMsg').innerText(); const xp = await p.locator('#stXp').innerText();
  // phone overflow
  const m = await (async () => { const c = await b.newContext({viewport: {width: 390, height: 800}}); await wire(c); return c.newPage(); })(); const over = {};
  for (const u of pages) { await m.goto(B + u); await m.waitForTimeout(500); over[u] = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); }
  await m.goto(B + '/'); await m.waitForTimeout(1200); await m.screenshot({path: 'phone-home.png'});
  const nf = await p.request.get(B + '/nope/');
  console.log(JSON.stringify({errs, res, bad, go, fixes, jm, gm, xp, over}, null, 1)); await b.close();
})();
