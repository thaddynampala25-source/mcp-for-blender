// Phone-first audit: screenshots and measurements for every page.
const {chromium} = require('playwright'); const fs = require('fs');
const OUT = process.argv[2] || 'audit/before';
const PAGES = ['/', '/speech-mode/', '/games/', '/shadowing/', '/7-day-sprint/', '/course/', '/tutor/', '/join/', '/common-mistakes/', '/about/', '/privacy/'];
const SIZES = [[360, 640, 'p360'], [390, 844, 'p390'], [1440, 900, 'd1440']];
const GL = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
(async () => {
  const b = await chromium.launch({args: GL}); const R = {};
  for (const [w, h, tag] of SIZES) {
    const ctx = await b.newContext({viewport: {width: w, height: h}, deviceScaleFactor: 1, hasTouch: w < 500, isMobile: w < 500});
    for (const u of PAGES) {
      const p = await ctx.newPage(); const errs = []; let bytes = 0, reqs = 0;
      p.on('pageerror', e => errs.push(e.message.slice(0, 120))); p.on('console', m => { if (m.type() === 'error') errs.push('C:' + m.text().slice(0, 120)); });
      p.on('response', async r => { reqs++; try { const hd = r.headers(); bytes += +(hd['content-length'] || 0); } catch (e) {} });
      await p.goto('http://localhost:8765' + u, {waitUntil: 'networkidle'}); await p.waitForTimeout(900);
      const name = (u === '/' ? 'home' : u.replace(/\//g, '')) + '-' + tag;
      await p.screenshot({path: OUT + '/' + name + '.png'});
      const m = await p.evaluate(() => {
        const W = innerWidth, H = innerHeight, vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
        const small = [], tiny = [];
        document.querySelectorAll('a,button,input,select,[role=button]').forEach(e => { if (!vis(e)) return; const r = e.getBoundingClientRect(); if (r.top > H * 3) return; if ((r.width < 44 || r.height < 44) && !(e.closest('p,li,td,.prose,footer') && e.tagName === 'A')) small.push((e.textContent || e.getAttribute('aria-label') || e.id || e.tagName).trim().slice(0, 24) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); });
        document.querySelectorAll('p,li,span,a,button,label,td').forEach(e => { if (!vis(e) || !e.textContent.trim() || e.children.length) return; const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < 14) tiny.push(e.textContent.trim().slice(0, 22) + ' ' + fs.toFixed(1)); });
        const main = document.querySelector('main'); const cta = [...document.querySelectorAll('main .key.primary, main .key.hl, main button[type=submit], main .key.cobalt')].filter(vis)[0];
        const h1 = document.querySelector('h1');
        return {overflow: document.documentElement.scrollWidth - W, pageH: document.documentElement.scrollHeight, h1: h1 ? h1.textContent.trim().slice(0, 50) : '', h1Bottom: h1 ? Math.round(h1.getBoundingClientRect().bottom) : null,
          firstCta: cta ? cta.textContent.trim().slice(0, 30) + ' @y=' + Math.round(cta.getBoundingClientRect().top) : 'none', smallTargets: [...new Set(small)].slice(0, 12), smallCount: small.length, tinyText: [...new Set(tiny)].slice(0, 8), tinyCount: tiny.length};
      });
      R[name] = Object.assign(m, {errors: errs, kb: Math.round(bytes / 1024), requests: reqs});
      await p.close();
    }
    await ctx.close();
  }
  // Speech Mode: where is the reply box on phones?
  for (const [w, h] of [[360, 640], [390, 844]]) { const p = await b.newPage({viewport: {width: w, height: h}}); await p.goto('http://localhost:8765/speech-mode/', {waitUntil: 'networkidle'}); await p.waitForTimeout(600);
    R['speech-reply-' + w] = await p.evaluate(() => ({composerTop: Math.round(document.getElementById('composer').getBoundingClientRect().top + scrollY), viewport: innerHeight, screensDown: +((document.getElementById('composer').getBoundingClientRect().top + scrollY) / innerHeight).toFixed(1), header: document.querySelector('.nav').offsetHeight})); await p.close(); }
  fs.writeFileSync(OUT + '/metrics.json', JSON.stringify(R, null, 1)); await b.close(); console.log('pages', Object.keys(R).length);
})();
