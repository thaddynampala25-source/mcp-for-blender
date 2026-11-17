// Turnaround renders of a generated model: front, three-quarter, side, back, face. node buddy-gen/turn.cjs <outdir> [suffix] [extra query]
const {chromium} = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => { const out = process.argv[2] || 'buddy-gen/renders', tag = process.argv[3] || '', extra = process.argv[4] || ''; fs.mkdirSync(out, {recursive: true});
  const b = await chromium.launch({args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
  const ctx = await b.newContext({viewport: {width: 520, height: 760}});
  await ctx.route('**/__gen/**', r => { const f = r.request().url().split('/__gen/')[1].split('?')[0]; r.fulfill({body: fs.readFileSync(path.join(__dirname, f.endsWith('.glb') ? 'out/' + f : f)), contentType: f.endsWith('.html') ? 'text/html' : 'model/gltf-binary'}); });
  const names = (process.env.ONLY || 'ruby,max').split(','), views = (process.env.VIEWS || 'front,tq,side,back,face').split(',');
  for (const n of names) { const imgs = []; for (const v of views) { const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
      await p.goto('http://localhost:8765/__gen/view.html?m=' + n + '&view=' + v + extra); await p.waitForFunction(() => /^(ready|error)/.test(document.title), null, {timeout: 60000}).catch(() => {}); const t = await p.title(); if (!/^ready/.test(t) || errs.length) console.log(n, v, t, errs.slice(0, 2));
      if (v === views[0]) console.log(n, t); const buf = await p.screenshot(); imgs.push(buf.toString('base64')); await p.close(); }
    const p = await ctx.newPage(); await p.setViewportSize({width: 1320, height: 480}); await p.setContent('<body style="margin:0;display:flex;background:#222">' + imgs.map(i => '<img style="width:264px" src="data:image/png;base64,' + i + '">').join('') + '</body>'); await p.waitForTimeout(200); await p.screenshot({path: path.join(out, n + tag + '.png'), clip: {x: 0, y: 0, width: 1320, height: 386}}); await p.close(); }
  await b.close(); })();
