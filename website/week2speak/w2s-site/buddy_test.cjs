// Language Buddies v2 (Ruby and Max) and the Speech Mode screen: behaviour test.
// Usage: node buddy_test.cjs <outdir>   (dist/ must be served on http://localhost:8765)
const {chromium} = require('playwright'); const fs = require('fs');
const OUT = process.argv[2] || 'buddy-test-out'; fs.mkdirSync(OUT, {recursive: true});
const GL = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'], NOGL = ['--disable-gpu', '--disable-webgl', '--disable-webgl2', '--disable-3d-apis'];
const U = 'http://localhost:8765/speech-mode/', R = {}, errors = [], hosts = new Set();
const watch = p => { p.on('pageerror', e => errors.push('PAGEERROR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); }); p.on('request', r => { try { const h = new URL(r.url()).host; if (h !== 'localhost:8765' && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) hosts.add(h); } catch (e) {} }); };
const ready = async p => { await p.waitForFunction(() => window.W2SBuddies && window.W2SBuddies.ready, null, {timeout: 90000}); await p.evaluate(() => { window.W2SBuddies.lockQuality = true; window.W2SBuddies.setQuality(3); }); await p.waitForTimeout(1900); };   // the software renderer used here is slow, so behaviour is tested at the lowest quality step; the fps check below covers the stepping
const D = (p, f) => p.evaluate(f);
const tap = async (p, part) => { const a = await p.evaluate(x => window.W2SBuddies.anchor(x), part); await p.mouse.click(a.x, a.y); return a.part; };
(async () => {
  let b = await chromium.launch({args: GL});
  // ---------- desktop: lip sync, pokes, spin, extras, switch ----------
  let ctx = await b.newContext({viewport: {width: 1440, height: 900}}), p = await ctx.newPage(); watch(p);
  await p.goto(U, {waitUntil: 'networkidle'}); await ready(p);
  R.loaded = await D(p, () => ({id: window.W2SBuddies.id, rig: window.W2SBuddies.rig, renderer: window.W2SBuddies.renderer, name: document.getElementById('buddyName').textContent, is3d: document.getElementById('buddy').classList.contains('is-3d'), state: document.getElementById('sm').dataset.state}));
  // lip sync: the mouth moves while the tutor line is spoken, and closes after it
  await p.click('#smStart'); let mx = 0, said = 0, spoke = false; const t0 = Date.now();
  while (Date.now() - t0 < 9000) { const s = await D(p, () => ({m: window.W2SBuddies.mouth, sp: window.W2SBuddies.speaking, on: document.querySelectorAll('#smLine .w.on, #smLine .w.said').length})); if (s.sp) { spoke = true; mx = Math.max(mx, s.m); said = Math.max(said, s.on); } else if (spoke) break; await p.waitForTimeout(60); }
  await p.waitForTimeout(700); R.lipsync = {spoke, mouthMaxWhileSpeaking: mx, wordsHighlighted: said, mouthAfter: await D(p, () => window.W2SBuddies.mouth), stateAfter: await D(p, () => document.getElementById('sm').dataset.state)};
  R.lipsync.pass = spoke && mx > 0.2 && R.lipsync.mouthAfter < 0.04 && said > 0;
  // pokes: at least six different reactions, never the same one twice in a row
  await p.waitForTimeout(900); const n0 = await D(p, () => window.W2SBuddies.log.length), hit = [];
  for (const part of ['face', 'hair', 'torso', 'arm', 'prop', 'face', 'hair', 'torso', 'arm', 'prop', 'face', 'torso']) { hit.push(part + '>' + await tap(p, part)); await p.waitForTimeout(1250); }
  const log = (await D(p, () => window.W2SBuddies.log)).slice(n0); let repeats = 0; for (let i = 1; i < log.length; i++) if (log[i] === log[i - 1]) repeats++;
  R.pokes = {hit, log, distinct: [...new Set(log)], repeats, pass: new Set(log).size >= 6 && repeats === 0};
  await p.screenshot({path: OUT + '/t-poke.png'});
  // five quick pokes: the side-eye
  const fa = await D(p, () => window.W2SBuddies.anchor('torso')); for (let i = 0; i < 5; i++) { await p.mouse.click(fa.x, fa.y); await p.waitForTimeout(140); } await p.waitForTimeout(300);
  R.rapid = {last: await D(p, () => window.W2SBuddies.log.slice(-1)[0])}; R.rapid.pass = R.rapid.last === 'sideeye'; await p.waitForTimeout(1300);
  // spin past 360 degrees with one drag and a flick
  const box = await p.locator('.buddy-canvas').boundingBox(), cy = box.y + box.height * 0.5; const s0 = await D(p, () => window.W2SBuddies.spun);
  await p.mouse.move(box.x + 20, cy); await p.mouse.down(); for (let i = 1; i <= 24; i++) { await p.mouse.move(box.x + 20 + (box.width - 40) * i / 24, cy); await p.waitForTimeout(12); } await p.mouse.up(); await p.waitForTimeout(200);
  R.spin = {radiansDragged: +(await D(p, () => window.W2SBuddies.spun) - s0).toFixed(2), turns: await D(p, () => window.W2SBuddies.turns)}; R.spin.degrees = Math.round(R.spin.radiansDragged * 180 / Math.PI); R.spin.pass = R.spin.radiansDragged > Math.PI * 2;
  await p.waitForTimeout(2500);
  // hidden extra 1: three full turns start the helicopter
  for (let k = 0; k < 4; k++) { await p.mouse.move(box.x + 20, cy); await p.mouse.down(); for (let i = 1; i <= 10; i++) { await p.mouse.move(box.x + 20 + (box.width - 40) * i / 10, cy); await p.waitForTimeout(8); } await p.mouse.up(); await p.waitForTimeout(40); }
  await p.waitForTimeout(900); await p.screenshot({path: OUT + '/t-helicopter.png'}); await p.waitForTimeout(3200);
  // hidden extra 2: double tap on the face puts sunglasses on
  await p.waitForFunction(() => window.W2SBuddies.settled, null, {timeout: 30000}); await p.waitForTimeout(300);
  const f2 = await D(p, () => window.W2SBuddies.anchor('face')); await p.mouse.click(f2.x, f2.y); await p.waitForTimeout(40); await p.mouse.click(f2.x, f2.y); await p.waitForTimeout(900); await p.screenshot({path: OUT + '/t-shades.png'});
  // hidden extra 3: a long press blows the head up
  await p.waitForFunction(() => window.W2SBuddies.settled, null, {timeout: 30000}); const f3 = await D(p, () => window.W2SBuddies.anchor('torso')); await p.mouse.move(f3.x, f3.y); await p.mouse.down(); await p.waitForTimeout(1100); await p.screenshot({path: OUT + '/t-bighead.png'}); await p.mouse.up(); await p.waitForTimeout(700);
  R.delights = await D(p, () => window.W2SBuddies.delights); R.delights.pass = Object.keys(R.delights).length >= 3;
  // conversation reactions and the listening pose
  await p.fill('#speakInput', 'I have 25 years and I want a coffee'); await p.click('#speakSend'); await p.waitForTimeout(500);
  const conv = {afterMistake: await D(p, () => window.W2SBuddies.log.slice(-1)[0]), card: await p.locator('#smCard:not([hidden]) .sm-fix').count()}; await p.screenshot({path: OUT + '/t-correction.png'}); await p.waitForTimeout(1600);
  await p.fill('#speakInput', 'A small coffee, please'); await p.click('#speakSend'); await p.waitForTimeout(400); conv.afterGood = await D(p, () => window.W2SBuddies.log.slice(-1)[0]); await p.waitForTimeout(1200);
  await p.click('#helpBtn'); await p.waitForTimeout(300); conv.afterHelp = await D(p, () => window.W2SBuddies.log.slice(-1)[0]); conv.hintOpen = await p.locator('#hint:not([hidden])').count();
  await D(p, () => window.dispatchEvent(new CustomEvent('w2s:mic', {detail: {on: true}}))); await p.waitForTimeout(300); conv.listening = await D(p, () => window.W2SBuddies.listening); await D(p, () => window.dispatchEvent(new CustomEvent('w2s:mic', {detail: {on: false}})));
  conv.pass = conv.afterMistake === 'oops' && conv.card === 1 && conv.afterGood === 'good' && conv.afterHelp === 'help' && conv.listening === true; R.conversation = conv;
  // replay button speaks the line again
  await p.waitForTimeout(1500); await p.click('#smReplay'); await p.waitForTimeout(250); R.replay = {speaking: await D(p, () => window.W2SBuddies.speaking)}; R.replay.pass = R.replay.speaking;
  // Switch Buddy: by tap, announced, saved, survives a reload; then by keyboard
  await p.waitForTimeout(1200); await p.click('#buddySwitch'); await p.waitForFunction(() => window.W2SBuddies.id === 'rio' && window.W2SBuddies.ready, null, {timeout: 60000}); await p.waitForTimeout(1500);
  const sw = {afterTap: await D(p, () => ({id: window.W2SBuddies.id, name: document.getElementById('buddyName').textContent, speaker: document.getElementById('smSpeaker').textContent, live: document.getElementById('buddyLive').textContent, saved: JSON.parse(localStorage.getItem('w2s.v1')).buddy, gender: window.W2S_BUDDY_GENDER}))};
  await p.screenshot({path: OUT + '/t-max.png'});
  await p.reload({waitUntil: 'networkidle'}); await ready(p); sw.afterReload = await D(p, () => ({id: window.W2SBuddies.id, name: document.getElementById('buddyName').textContent}));
  await p.focus('#buddySwitch'); await p.keyboard.press('Enter'); await p.waitForFunction(() => window.W2SBuddies.id === 'mila' && window.W2SBuddies.ready, null, {timeout: 60000}); await p.waitForTimeout(800);
  sw.afterKeyboard = await D(p, () => ({id: window.W2SBuddies.id, name: document.getElementById('buddyName').textContent, live: document.getElementById('buddyLive').textContent}));
  await p.reload({waitUntil: 'networkidle'}); await ready(p); sw.afterReload2 = await D(p, () => window.W2SBuddies.id);
  sw.pass = sw.afterTap.id === 'rio' && sw.afterTap.name === 'Max' && /Max is your Buddy now/.test(sw.afterTap.live) && sw.afterTap.saved === 'rio' && sw.afterTap.gender === 'm' && sw.afterReload.id === 'rio' && sw.afterReload.name === 'Max' && sw.afterKeyboard.id === 'mila' && sw.afterKeyboard.name === 'Ruby' && sw.afterReload2 === 'mila'; R.switch = sw;
  // sound toggle
  await p.click('#buddyMute'); const snd = {offPressed: await p.getAttribute('#buddyMute', 'aria-pressed'), stored: await D(p, () => localStorage.getItem('w2s.buddyMute'))}; await p.click('#buddyMute'); snd.onPressed = await p.getAttribute('#buddyMute', 'aria-pressed'); snd.pass = snd.offPressed === 'false' && snd.stored === '1' && snd.onPressed === 'true'; R.sound = snd;
  // desktop layout: the Buddy takes at least half the width
  R.desktop = await D(p, () => { const s = document.getElementById('buddy').getBoundingClientRect(), a = document.getElementById('sm').getBoundingClientRect(), c = document.getElementById('smSheet').getBoundingClientRect(); return {stageShare: +(s.width / a.width).toFixed(2), stageH: Math.round(s.height), panelH: Math.round(a.height), conversationBeside: c.left >= s.right - 1}; }); R.desktop.pass = R.desktop.stageShare >= 0.5 && R.desktop.stageH === R.desktop.panelH && R.desktop.conversationBeside;
  await ctx.close();
  // ---------- frame-rate readout and automatic quality ----------
  ctx = await b.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 2, isMobile: true, hasTouch: true}); p = await ctx.newPage(); watch(p);
  await p.goto(U + '?fps=1', {waitUntil: 'networkidle'}); await p.waitForFunction(() => window.W2SBuddies && window.W2SBuddies.ready, null, {timeout: 90000}); const q = [];
  for (let i = 0; i < 9; i++) { await p.waitForTimeout(1500); q.push(await D(p, () => window.W2SBuddies.fps + 'fps q' + window.W2SBuddies.quality)); }
  R.fps = {readout: (await p.locator('#smFps').innerText()).replace(/\n/g, ' | '), samples: q, renderer: await D(p, () => window.W2SBuddies.renderer), info: await D(p, () => window.W2SBuddies.info)}; R.fps.pass = /fps/.test(R.fps.readout) && /draw calls/.test(R.fps.readout) && /quality step/.test(R.fps.readout);
  await p.screenshot({path: OUT + '/t-fps.png'});
  await p.goto(U, {waitUntil: 'networkidle'}); R.fps.hiddenWithoutFlag = await p.locator('#smFps').isHidden(); await ctx.close();
  // ---------- phone 360x640: one screen, keyboard, bottom sheet, pausing ----------
  ctx = await b.newContext({viewport: {width: 360, height: 640}, deviceScaleFactor: 2, isMobile: true, hasTouch: true}); p = await ctx.newPage(); watch(p);
  await p.goto(U, {waitUntil: 'networkidle'}); await ready(p);
  const lay = () => D(p, () => { const r = id => document.getElementById(id).getBoundingClientRect(), bar = r('composer'), st = r('buddy'), mic = r('speakMic'), a = window.W2SBuddies.anchor('face'); return {vh: innerHeight, nav: document.querySelector('.nav').offsetHeight, stageH: Math.round(st.height), barH: Math.round(bar.height), barBottom: Math.round(bar.bottom), mic: Math.round(mic.width), faceY: a ? Math.round(a.y) : null, faceShare: window.W2SBuddies.info.faceShare, scrollY: Math.round(scrollY), overflow: document.documentElement.scrollWidth - innerWidth, kb: document.getElementById('sm').classList.contains('kb')}; });
  const ph = await lay(); ph.pass = ph.nav <= 48 && ph.stageH >= 330 && ph.barH <= 76 && ph.barBottom <= ph.vh && ph.mic >= 64 && ph.faceY > ph.nav && ph.faceY < ph.barBottom - ph.barH && ph.overflow === 0 && ph.scrollY === 0; R.phone = ph;
  await p.tap('#smStart'); await p.waitForTimeout(600); await p.tap('#smMenu'); await p.waitForTimeout(700);
  R.sheet = await D(p, () => ({open: document.getElementById('sm').classList.contains('sheet-open'), has: ['missions', 'chat', 'sSent', 'speakAloud'].every(id => document.getElementById('smSheet').contains(document.getElementById(id))) && !!document.querySelector('#smSheet [data-accents]'), focusInside: document.getElementById('smSheet').contains(document.activeElement)})); await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  R.sheet.closedByEscape = await D(p, () => !document.getElementById('sm').classList.contains('sheet-open') && document.getElementById('smSheet').inert === true); R.sheet.pass = R.sheet.open && R.sheet.has && R.sheet.focusInside && R.sheet.closedByEscape;
  await p.focus('#speakInput'); await p.setViewportSize({width: 360, height: 350}); await p.waitForTimeout(900); const kb = await lay(); kb.stageShareOfScreen = +(kb.stageH / 640).toFixed(2); kb.micHidden = await p.locator('#speakMic').isHidden(); kb.fieldVisible = await p.locator('#speakInput').isVisible();
  kb.pass = kb.kb && kb.barBottom <= kb.vh && kb.fieldVisible && kb.stageShareOfScreen >= 0.25 && kb.stageShareOfScreen <= 0.42 && kb.faceY > 0 && kb.faceY < kb.barBottom - kb.barH; R.keyboard = kb; await p.screenshot({path: OUT + '/t-keyboard.png'});
  await p.evaluate(() => document.activeElement.blur()); await p.setViewportSize({width: 360, height: 640}); await p.waitForTimeout(700); R.keyboard.restored = !(await lay()).kb;
  await p.evaluate(() => document.querySelector('.guide').scrollIntoView()); await p.waitForTimeout(700); R.pause = {runningOffScreen: await D(p, () => window.W2SBuddies.running)}; await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(500); R.pause.runningOnScreen = await D(p, () => window.W2SBuddies.running); R.pause.pass = R.pause.runningOffScreen === false && R.pause.runningOnScreen === true;
  await ctx.close();
  // ---------- no speech recognition: the text field leads and the mic is hidden ----------
  ctx = await b.newContext({viewport: {width: 360, height: 640}, isMobile: true, hasTouch: true}); p = await ctx.newPage(); watch(p); await p.addInitScript(() => { try { delete window.webkitSpeechRecognition; delete window.SpeechRecognition; Object.defineProperty(window, 'webkitSpeechRecognition', {value: undefined}); Object.defineProperty(window, 'SpeechRecognition', {value: undefined}); } catch (e) {} });
  await p.goto(U, {waitUntil: 'networkidle'}); await p.waitForTimeout(800); R.noMic = await D(p, () => ({hasMic: document.documentElement.classList.contains('has-mic'), micVisible: !!document.getElementById('speakMic').offsetParent, fieldLeft: Math.round(document.getElementById('speakInput').getBoundingClientRect().left), fieldW: Math.round(document.getElementById('speakInput').getBoundingClientRect().width)})); R.noMic.pass = !R.noMic.hasMic && !R.noMic.micVisible && R.noMic.fieldLeft < 20; await p.screenshot({path: OUT + '/t-no-mic.png'}); await ctx.close();
  // ---------- reduced motion: lip sync still runs, nothing hops or spins by itself ----------
  ctx = await b.newContext({viewport: {width: 390, height: 844}, reducedMotion: 'reduce', isMobile: true, hasTouch: true}); p = await ctx.newPage(); watch(p);
  await p.goto(U, {waitUntil: 'networkidle'}); await ready(p); await p.tap('#smStart'); let rm = 0, rmSpoke = false; const t1 = Date.now(); while (Date.now() - t1 < 6000) { const s = await D(p, () => ({m: window.W2SBuddies.mouth, sp: window.W2SBuddies.speaking})); if (s.sp) { rmSpoke = true; rm = Math.max(rm, s.m); } else if (rmSpoke) break; await p.waitForTimeout(60); }
  await D(p, () => window.W2SBuddies.poke('legs')); let hopMax = 0; for (let i = 0; i < 10; i++) { hopMax = Math.max(hopMax, await D(p, () => window.W2SBuddies.hopY)); await p.waitForTimeout(60); }
  await p.tap('#buddySwitch'); await p.waitForFunction(() => window.W2SBuddies.id === 'rio', null, {timeout: 60000});
  R.reducedMotion = {flag: await D(p, () => window.W2SBuddies.reduced), mouthMax: rm, hopMax, switched: await D(p, () => window.W2SBuddies.id), sheetTransition: await D(p, () => getComputedStyle(document.getElementById('smSheet')).transitionDuration)}; R.reducedMotion.pass = R.reducedMotion.flag && rm > 0.2 && hopMax === 0 && R.reducedMotion.switched === 'rio'; await p.screenshot({path: OUT + '/t-reduced-motion.png'}); await ctx.close();
  await b.close();
  // ---------- no WebGL: static pictures, everything else works ----------
  b = await chromium.launch({args: NOGL}); ctx = await b.newContext({viewport: {width: 360, height: 640}, isMobile: true, hasTouch: true}); p = await ctx.newPage(); watch(p);
  await p.goto(U, {waitUntil: 'networkidle'}); await p.waitForTimeout(2500);
  const ng = await D(p, () => { const w = document.getElementById('buddy'), im = [...document.querySelectorAll('.buddy-fallback .bf')].filter(i => i.offsetParent)[0]; return {no3d: w.classList.contains('no-3d'), is3d: w.classList.contains('is-3d'), picture: im ? im.getAttribute('src') : null, pictureLoaded: !!(im && im.naturalWidth > 0), alt: im ? im.alt.slice(0, 22) : ''}; });
  await p.tap('#smStart'); await p.waitForTimeout(500); ng.subtitle = (await p.locator('#smLine').innerText()).slice(0, 30); await p.fill('#speakInput', 'I have 25 years'); await p.tap('#speakSend'); await p.waitForTimeout(400); ng.fixCard = await p.locator('#smCard:not([hidden])').count();
  await p.locator('.sm-x').tap(); await p.tap('#buddySwitch'); await p.waitForTimeout(600); ng.afterSwitch = await D(p, () => ({name: document.getElementById('buddyName').textContent, picture: [...document.querySelectorAll('.buddy-fallback .bf')].filter(i => i.offsetParent)[0].getAttribute('src')}));
  ng.pass = ng.no3d && !ng.is3d && ng.pictureLoaded && /ruby/.test(ng.picture) && ng.subtitle.length > 3 && ng.fixCard === 1 && ng.afterSwitch.name === 'Max' && /max/.test(ng.afterSwitch.picture); R.noWebGL = ng; await p.screenshot({path: OUT + '/t-no-webgl.png'}); await b.close();
  R.errors = errors; R.externalHosts = [...hosts];
  const checks = ['lipsync', 'pokes', 'rapid', 'spin', 'delights', 'conversation', 'replay', 'switch', 'sound', 'desktop', 'fps', 'phone', 'sheet', 'keyboard', 'pause', 'noMic', 'reducedMotion', 'noWebGL'];
  R.summary = Object.fromEntries(checks.map(c => [c, !!(R[c] && R[c].pass)])); R.summary.noErrors = errors.length === 0; R.summary.noExternalRequests = hosts.size === 0; R.allPass = Object.values(R.summary).every(Boolean);
  fs.writeFileSync(OUT + '/result.json', JSON.stringify(R, null, 1)); console.log(JSON.stringify(R, null, 1));
})().catch(e => { console.error('TEST CRASHED', e); process.exit(1); });
