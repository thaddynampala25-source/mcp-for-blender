const { chromium } = require('playwright');
const B = 'http://localhost:8765', pages = ['/', '/speech-mode/', '/games/', '/shadowing/', '/7-day-sprint/', '/course/', '/join/'];
(async () => { const b = await chromium.launch(); const out = {};
  const noJs = await (await b.newContext({javaScriptEnabled: false})).newPage();
  for (const u of pages) {
    await noJs.goto(B + u);
    out[u] = await noJs.evaluate(() => {
      const vis = el => { for (let e = el; e; e = e.parentElement) if (e.hidden) return false; return true; };
      const words = t => (t.match(/[A-Za-z']+/g) || []).length;
      const main = document.querySelector('main'); let all = 0, shown = 0;
      const tw = document.createTreeWalker(main, NodeFilter.SHOW_TEXT); let n; while ((n = tw.nextNode())) { const w = words(n.textContent); all += w; if (vis(n.parentElement)) shown += w; }
      return {bytes: document.documentElement.outerHTML.length, title: document.title.length, desc: document.querySelector('meta[name=description]').content.length,
        h1: [...document.querySelectorAll('h1')].filter(vis).length, h2: [...document.querySelectorAll('h2')].filter(vis).map(h => h.getAttribute('aria-label') || h.textContent.trim()).slice(0, 12),
        wordsVisible: shown, wordsHiddenInHtml: all - shown, links: document.querySelectorAll('a[href^="/"]').length, imgsNoAlt: [...document.images].filter(i => !i.alt).length};
    });
  }
  console.log(JSON.stringify(out, null, 1)); await b.close(); })();
