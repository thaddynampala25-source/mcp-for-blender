const { chromium } = require('playwright'); const fs = require('fs'); const NM = require('path').join(__dirname, '../w2s-show/node_modules');
const fontCss = `@font-face{font-family:"Bricolage Grotesque";src:url("http://localhost:8765/__f/b.woff2") format("woff2");font-weight:200 800;font-stretch:75% 100%}@font-face{font-family:"Figtree";src:url("http://localhost:8765/__f/f.woff2") format("woff2");font-weight:300 900}`;
async function wire(ctx) {
  await ctx.route('**/fonts.googleapis.com/**', r => r.fulfill({contentType: 'text/css', body: fontCss}));
  await ctx.route('**/__f/b.woff2', r => r.fulfill({body: fs.readFileSync(NM + '/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-standard-normal.woff2')}));
  await ctx.route('**/__f/f.woff2', r => r.fulfill({body: fs.readFileSync(NM + '/@fontsource-variable/figtree/files/figtree-latin-wght-normal.woff2')}));
  await ctx.route('**/gsap.min.js', r => r.fulfill({contentType: 'text/javascript', body: fs.readFileSync(NM + '/gsap/dist/gsap.min.js')}));
  await ctx.route('**/ScrollTrigger.min.js', r => r.fulfill({contentType: 'text/javascript', body: fs.readFileSync(NM + '/gsap/dist/ScrollTrigger.min.js')}));
}
(async () => { const b = await chromium.launch(); const c = await b.newContext({viewport: {width: 1280, height: 800}}); await wire(c); const p = await c.newPage();
  await p.goto('http://localhost:8765/common-mistakes/'); await p.waitForTimeout(1200); await p.screenshot({path: 's1.png'});
  await p.goto('http://localhost:8765/course/'); await p.waitForTimeout(900); await p.evaluate(() => document.querySelector('.guide').scrollIntoView()); await p.waitForTimeout(400); await p.screenshot({path: 's2.png'});
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(900); await p.evaluate(() => document.getElementById('faq').scrollIntoView()); await p.waitForTimeout(600); await p.click('#faq summary'); await p.waitForTimeout(300); await p.screenshot({path: 's3.png'});
  const cc = await b.newContext({viewport: {width: 390, height: 800}}); await wire(cc); const m = await cc.newPage();
  await m.goto('http://localhost:8765/common-mistakes/'); await m.waitForTimeout(900); await m.screenshot({path: 's4.png'});
  await m.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await m.waitForTimeout(500); await m.screenshot({path: 's5.png'});
  await b.close(); })();
