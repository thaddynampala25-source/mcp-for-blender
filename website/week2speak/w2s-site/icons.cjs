const { chromium } = require('playwright');
const nm = require('path').join(__dirname, '../w2s-show/node_modules/@fontsource-variable');
const ff = `@font-face{font-family:B;src:url("file://${nm}/bricolage-grotesque/files/bricolage-grotesque-latin-standard-normal.woff2");font-weight:200 800;font-stretch:75% 100%}@font-face{font-family:F;src:url("file://${nm}/figtree/files/figtree-latin-wght-normal.woff2");font-weight:300 900}`;
const og = `<html><head><style>${ff}body{margin:0;width:1200px;height:630px;background:#2D4BFF;color:#fff;font-family:F;position:relative;overflow:hidden}
.logo{position:absolute;left:72px;top:60px;font:800 44px/1 B;letter-spacing:-.03em}.two{display:inline-block;background:#FFD93B;color:#101642;padding:.06em .22em;margin:0 .04em;border-radius:.2em;transform:rotate(-4deg)}
h1{position:absolute;left:72px;top:150px;margin:0;font:800 132px/.92 B;font-stretch:78%;letter-spacing:-.025em}.m{background:#FFD93B;color:#101642;padding:0 .1em;border-radius:.14em;display:inline-block;transform:rotate(-2deg)}
p{position:absolute;left:76px;top:430px;margin:0;font:600 32px/1.35 F;color:#D9DFFF;max-width:600px}
.b{position:absolute;right:70px;width:330px;background:#fff;color:#101642;border-radius:24px;padding:20px 26px;box-shadow:0 20px 40px rgba(8,16,90,.35);font:700 28px/1.25 F}.b s{color:#E0245E;font-size:20px;display:block;font-weight:600}.b i{font-style:normal;color:#087F63}
.bar{position:absolute;left:0;right:0;bottom:0;height:22px;background:#FFD93B}</style></head><body>
<div class="logo">Week<span class="two">2</span>Speak</div><h1><span class="m">Speak</span> English<br>in 7 days.</h1>
<p>Real sentences out loud from day one, with a tutor who speaks Spanish.</p>
<div class="b" style="top:300px"><s>I have 25 years</s><i>✓ I'm 25 years old</i></div><div class="b" style="top:440px;right:110px"><s>I am agree</s><i>✓ I agree</i></div><div class="bar"></div></body></html>`;
const icon = s => `<html><head><style>${ff}body{margin:0;width:${s}px;height:${s}px;background:#2D4BFF;display:grid;place-items:center}div{width:62%;height:68%;background:#FFD93B;border-radius:18%;transform:rotate(-6deg);display:grid;place-items:center;font:800 ${Math.round(s*.55)}px/1 B;color:#101642}</style></head><body><div>2</div></body></html>`;
(async () => { const b = await chromium.launch(); const shot = async (html, w, h, out) => { const p = await (await b.newContext({viewport:{width:w,height:h}, deviceScaleFactor:1})).newPage(); const f = require('path').join(__dirname, 'tmp_' + w + '.html'); require('fs').writeFileSync(f, html); await p.goto('file://' + f); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300); await p.screenshot({path: out}); };
  await shot(og, 1200, 630, 'dist/media/og.png'); await shot(icon(180), 180, 180, 'dist/apple-touch-icon.png'); await shot(icon(512), 512, 512, 'dist/icon-512.png'); await shot(icon(32), 32, 32, 'dist/favicon-32.png'); await b.close(); console.log('icons ok'); })();
