// Contact sheet: put several screenshots side by side so they can be reviewed at once.
const {chromium} = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => { const [dir, out, w, ...names] = process.argv.slice(2); const b = await chromium.launch(); const p = await b.newPage({viewport: {width: 1600, height: 900}});
  const html = '<body style="margin:0;background:#222;display:flex;flex-wrap:wrap;gap:8px;padding:8px;font:12px sans-serif;color:#fff">' + names.map(n => '<div><div>' + n + '</div><img style="width:' + w + 'px;display:block" src="data:image/png;base64,' + fs.readFileSync(path.join(dir, n + '.png')).toString('base64') + '"></div>').join('') + '</body>';
  await p.setContent(html); await p.waitForTimeout(300); await p.screenshot({path: out, fullPage: true}); await b.close(); })();
