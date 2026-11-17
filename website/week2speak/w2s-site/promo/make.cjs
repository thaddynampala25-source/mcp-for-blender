// 15 to 20 second vertical clip (1080x1920) of the new Speech Mode. Frames are captured one by one on a controlled clock, then encoded with ffmpeg.
// Usage: node promo/make.cjs    (dist/ served on http://localhost:8765)
const {chromium} = require('playwright'); const {spawn} = require('child_process'); const path = require('path');
const FPS = 24, OUT = path.join(__dirname, 'week2speak-speech-mode.mp4');
(async () => {
  const b = await chromium.launch({args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
  const ctx = await b.newContext({viewport: {width: 360, height: 640}, deviceScaleFactor: 3, isMobile: true, hasTouch: true}); const p = await ctx.newPage(); p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('http://localhost:8765/speech-mode/', {waitUntil: 'networkidle'}); await p.waitForFunction(() => window.W2SBuddies && window.W2SBuddies.ready, null, {timeout: 90000});
  await p.evaluate(() => { const D = window.W2SBuddies; D.lockQuality = true; D.setQuality(0); const d = document.createElement('div'); d.id = 'tapdot'; d.style.cssText = 'position:fixed;z-index:999;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgba(255,217,59,.55);box-shadow:0 0 0 3px rgba(11,16,58,.5);pointer-events:none;opacity:0;transition:opacity .15s,transform .15s;transform:scale(.6)'; document.body.appendChild(d); });
  await p.clock.install(); await p.clock.pauseAt(new Date(Date.now() + 1000));
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-vf', 'scale=1080:1920:flags=lanczos', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', OUT]); ff.stderr.on('data', d => process.stderr.write(d));
  let n = 0; const frames = async sec => { for (let i = 0; i < Math.round(sec * FPS); i++) { await p.clock.runFor(1000 / FPS); const buf = await p.screenshot({type: 'jpeg', quality: 88}); if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r)); n++; } };
  const dot = async sel => { const r = await p.locator(sel).boundingBox(); await p.evaluate(([x, y]) => { const d = document.getElementById('tapdot'); d.style.left = x + 'px'; d.style.top = y + 'px'; d.style.opacity = 1; d.style.transform = 'scale(1)'; }, [r.x + r.width / 2, r.y + r.height / 2]); await frames(0.3); await p.evaluate(() => { const d = document.getElementById('tapdot'); d.style.opacity = 0; d.style.transform = 'scale(.6)'; }); };
  const ev = (name, detail) => p.evaluate(([n2, d]) => window.dispatchEvent(new CustomEvent('w2s:' + n2, {detail: d || {}})), [name, detail]);
  await p.evaluate(() => window.W2SBuddies.react('wave')); await frames(1.6);                                   // landing: the Buddy waves
  await dot('#smStart'); await p.tap('#smStart'); await frames(3.4);                                           // tutor line, word by word
  await ev('mic', {on: true}); await p.evaluate(() => { document.getElementById('speakMic').classList.add('listening'); }); await frames(0.5);
  for (const t of ['I have', 'I have 25 years', 'I have 25 years and I want a coffee']) { await p.evaluate(v => { document.getElementById('speakInput').value = v; }, t); await frames(0.45); }
  await ev('mic', {on: false}); await p.evaluate(() => { document.getElementById('speakMic').classList.remove('listening'); document.getElementById('composer').requestSubmit(); }); await frames(3.6);   // the fix
  await p.tap('.sm-x'); await dot('#helpBtn'); await p.tap('#helpBtn'); await frames(0.5); await p.tap('#helpBtn'); await frames(2.2);                     // Help me
  await p.evaluate(() => { document.getElementById('speakInput').value = 'A small one, please.'; document.getElementById('composer').requestSubmit(); }); await frames(2.4);
  await dot('#buddySwitch'); await p.tap('#buddySwitch'); await frames(3.6);                                   // Switch Buddy: Max arrives
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close(); console.log('frames', n, 'seconds', (n / FPS).toFixed(1), OUT);
})().catch(e => { console.error('PROMO FAILED', e.message); process.exit(1); });
