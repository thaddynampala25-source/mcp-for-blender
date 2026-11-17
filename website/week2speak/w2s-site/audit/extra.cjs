// Layout shift, contrast of first-screen text, and sideways scroll at 360px (desktop-style and phone-style viewport).
const {chromium} = require('playwright'); const fs = require('fs');
const OUT = process.argv[2] || 'audit/before';
const PAGES = ['/', '/speech-mode/', '/games/', '/shadowing/', '/7-day-sprint/', '/course/', '/tutor/', '/join/', '/common-mistakes/', '/about/', '/privacy/'];
(async () => { const b = await chromium.launch({args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']}); const R = {};
  for (const mobile of [true, false]) { const ctx = await b.newContext({viewport: {width: 360, height: 640}, isMobile: mobile, hasTouch: mobile});
    for (const u of PAGES) { const p = await ctx.newPage();
      await p.addInitScript(() => { window.__cls = 0; try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({type: 'layout-shift', buffered: true}); } catch (e) {} });
      await p.goto('http://localhost:8765' + u, {waitUntil: 'networkidle'}); await p.waitForTimeout(2500);
      const r = await p.evaluate(() => { const lum = c => { const a = c.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * a[0] + .7152 * a[1] + .0722 * a[2]; };
        const rgb = s => { const m = s.match(/[\d.]+/g); return m ? m.map(Number) : [0, 0, 0, 0]; };
        const bgOf = e => { while (e) { const s = getComputedStyle(e); const c = rgb(s.backgroundColor); if (c.length < 4 || c[3] > .9) { if (s.backgroundImage !== 'none') return null; return c; } if (s.backgroundImage !== 'none') return null; e = e.parentElement; } return [255, 255, 255]; };
        const bad = []; document.querySelectorAll('main p, main span, main a, main button, main label, main li, main h1, main h2, header a, header span').forEach(e => { const r = e.getBoundingClientRect(); if (!r.width || r.top > innerHeight * 2 || !e.textContent.trim() || [...e.children].some(c => c.textContent.trim())) return; const s = getComputedStyle(e); if (s.visibility === 'hidden' || +s.opacity < .9) return; const bg = bgOf(e); if (!bg) return; const fg = rgb(s.color); const L1 = lum(fg), L2 = lum(bg); const cr = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05); const big = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.6 && +s.fontWeight >= 700); if (cr < (big ? 3 : 4.5)) bad.push(e.textContent.trim().slice(0, 20) + ' ' + cr.toFixed(2)); });
        return {cls: +window.__cls.toFixed(3), over: document.documentElement.scrollWidth - innerWidth, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, contrast: [...new Set(bad)].slice(0, 6)}; });
      R[(mobile ? 'm' : 'd') + u] = r; await p.close(); }
    await ctx.close(); }
  fs.writeFileSync(OUT + '/extra.json', JSON.stringify(R, null, 1)); for (const k in R) console.log(k, JSON.stringify(R[k])); await b.close(); })();
