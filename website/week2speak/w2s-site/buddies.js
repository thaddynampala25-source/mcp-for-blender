/* Week2Speak Language Buddies, version 2: Ruby and Max, two human avatars loaded from GLB files.
   The page talks to them with window events: w2s:speak, w2s:word, w2s:speakend, w2s:mic, w2s:good, w2s:oops, w2s:help, w2s:done, w2s:buddy.
   Face rig: morph targets when the model has them (jawOpen, mouthPucker, mouthWide, mouthSmile, mouthFrown, or ARKit / viseme names), eyelids, eyes and brows as nodes.
   Body rig: bones named Hips, Spine, Neck, Head, Left/RightArm, Left/RightForeArm, Left/RightHand, Left/RightUpLeg. See buddy-models/README.md. */
import * as THREE from './vendor/three-0.170.0.module.min.js';
import {GLTFLoader} from './vendor/GLTFLoader-0.170.0.js';

const wrap = document.getElementById('buddy'), stage = document.getElementById('buddyStage'), sm = document.getElementById('sm');
const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const FILE = {mila: 'ruby', rio: 'max'};
const D = window.W2SBuddies = {ready: false, id: null, log: [], fps: 0, turns: 0, spun: 0, mouth: 0, blink: 0, speaking: false, listening: false, info: {}, delights: {}, quality: 0, renderer: '', reduced: RM, rig: ''};
const lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => v < a ? a : v > b ? b : v, rnd = (a, b) => a + Math.random() * (b - a);
class Spring { constructor(x = 0, k = 140, d = 17) { this.x = x; this.t = x; this.v = 0; this.k = k; this.d = d; } step(dt) { this.v += ((this.t - this.x) * this.k - this.v * this.d) * dt; this.x += this.v * dt; return this.x; } }

/* ---------- sound effects (tiny synth, silent until the first tap) ---------- */
let AC = null, muted = false, touched = false; try { muted = localStorage.getItem('w2s.buddyMute') === '1'; } catch (e) {}
function tone(f, dur = 0.12, type = 'sine', vol = 0.08, slide = 0, delay = 0) {
  if (muted || !touched) return; try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), t + dur); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + dur + 0.03); } catch (e) {}
}
const SFX = {pop: () => tone(520, 0.09, 'triangle', 0.09, 380), boop: () => tone(300, 0.12, 'sine', 0.1, 260), whoosh: () => tone(900, 0.22, 'sawtooth', 0.03, -700), giggle: () => { tone(660, 0.07, 'triangle', 0.06); tone(820, 0.07, 'triangle', 0.06, 0, 0.09); tone(740, 0.09, 'triangle', 0.06, 0, 0.18); }, good: () => { tone(660, 0.1, 'triangle', 0.08); tone(990, 0.16, 'triangle', 0.08, 0, 0.1); }, hmm: () => tone(260, 0.2, 'sine', 0.07, -60), win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.08, 0, i * 0.1)), sip: () => tone(180, 0.25, 'sine', 0.05, 120)};
const buzz = ms => { if (touched && navigator.vibrate && !RM) try { navigator.vibrate(ms); } catch (e) {} };

/* ---------- renderer, scene, lights ---------- */
let renderer, scene, camera, canvas, shadowLight, ground, blob, raf = 0, running = false, visible = true, W = 1, H = 1, last = 0;
const QUAL = [{pr: 2, sh: true}, {pr: 1.5, sh: true}, {pr: 1, sh: true}, {pr: 1, sh: false}];   // steps down: pixel ratio first, then shadows
function boot() {
  try { if (!document.createElement('canvas').getContext('webgl2')) throw new Error('no WebGL 2'); canvas = document.createElement('canvas'); canvas.className = 'buddy-canvas'; canvas.tabIndex = 0; canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', 'Your Language Buddy. Drag to spin, tap to poke.');
    renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: true, powerPreference: 'high-performance'}); } catch (e) { wrap.classList.add('no-3d'); return false; }
  const gl = renderer.getContext(); try { const x = gl.getExtension('WEBGL_debug_renderer_info'); D.renderer = String(x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)); } catch (e) {}
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.setClearColor(0x000000, 0);
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(24, 1, 0.5, 60);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe2d8ea, 1.3));
  shadowLight = new THREE.DirectionalLight(0xfff1dd, 2.1); shadowLight.position.set(2.4, 4.6, 5); shadowLight.castShadow = true; shadowLight.shadow.mapSize.set(1024, 1024); Object.assign(shadowLight.shadow.camera, {left: -1.7, right: 1.7, top: 2.9, bottom: -0.6, near: 1, far: 16}); shadowLight.shadow.bias = -0.0006; shadowLight.shadow.normalBias = 0.025; scene.add(shadowLight);
  const rim = new THREE.DirectionalLight(0xffc58a, 2.6); rim.position.set(-3, 3.2, -4); scene.add(rim);     // warm rim light from behind
  const fill = new THREE.DirectionalLight(0xcdd7ff, 0.55); fill.position.set(-3.5, 1.5, 3); scene.add(fill);
  ground = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.ShadowMaterial({opacity: 0.2})); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(11,16,58,.5)'); gr.addColorStop(0.55, 'rgba(11,16,58,.2)'); gr.addColorStop(1, 'rgba(11,16,58,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  blob = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.95), new THREE.MeshBasicMaterial({map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false})); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.006; scene.add(blob);   // contact shadow under the feet
  stage.appendChild(canvas); return true;
}
function setQuality(q) { D.quality = clamp(q, 0, QUAL.length - 1); const Q = QUAL[D.quality]; renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q.pr)); renderer.shadowMap.enabled = Q.sh; shadowLight.castShadow = Q.sh; ground.visible = Q.sh; renderer.setSize(W, H, false); }

/* ---------- a Buddy: model, rig lookup, pose channels ---------- */
const buddies = {}, loading = {}; let B = null, pending = null;
const IDLE = {hx: 0, hy: 0, hz: 0, sx: 0, sy: 0, sz: 0, lax: 0.1, lay: -0.62, laz: -0.04, lfx: -1.32, lfz: 0.1, rax: 0, ray: 0, raz: 0, rfx: -0.14, rfz: 0, rhz: 0, shrug: 0, brow: 0, browTilt: 0, squint: 0, cross: 0, legL: 0, legR: 0, lean: 0, headS: 1, armsOut: 0};
const FACE_KEYS = ['brow', 'browTilt', 'squint', 'cross', 'hx', 'hz', 'hy'];
const RIM = {value: new THREE.Color(1.0, 0.8, 0.58).multiplyScalar(0.34)};
function rimPatch(m) { if (m.userData.rim) return; m.userData.rim = 1; m.onBeforeCompile = s => { s.uniforms.uRim = RIM; s.fragmentShader = s.fragmentShader.replace('void main() {', 'uniform vec3 uRim;\nvoid main() {').replace('#include <opaque_fragment>', 'float rimF = pow(1.0 - saturate(dot(normalize(vViewPosition), normal)), 2.6);\noutgoingLight += uRim * rimF * smoothstep(-0.35, 0.7, normal.y);\n#include <opaque_fragment>'); }; }
async function fetchModel(name) {
  const base = '/assets/buddies/' + name + '.glb';
  if ('DecompressionStream' in window) try { const r = await fetch(base + '.gz'); if (r.ok) { const buf = await r.arrayBuffer(), u = new Uint8Array(buf, 0, 4); if (u[0] === 0x67 && u[1] === 0x6C) return buf; return await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer(); } } catch (e) {}
  const r = await fetch(base); if (!r.ok) throw new Error('model ' + r.status); return r.arrayBuffer();
}
function load(id) { if (buddies[id]) return Promise.resolve(buddies[id]); if (loading[id]) return loading[id];
  return loading[id] = fetchModel(FILE[id]).then(buf => new Promise((ok, no) => new GLTFLoader().parse(buf, '', g => ok(buddies[id] = make(g, id)), no))); }
function make(gltf, id) {
  const model = gltf.scene, ex = model.userData.w2s || {}, full = ex.rig === 'w2s-1';
  const N = (...names) => { for (const n of names) { const o = model.getObjectByName(n); if (o) return o; } return null; };
  const b = {id, model, ex, full, P: {}, M: {jaw: 0, pucker: 0, wide: 0, smile: 0.3, frown: 0}, Mt: {jaw: 0, pucker: 0, wide: 0, smile: 0.3, frown: 0}, morph: [], blink: 0, gaze: {x: new Spring(0, 90, 14), y: new Spring(0, 90, 14)}, rot: 0, rotV: 0, hop: 0, hopV: 0, sq: new Spring(1, 260, 14), pop: new Spring(1, 170, 13), pony: new Spring(0, 60, 5), pony2: new Spring(0, 60, 5), nextBlink: rnd(1.5, 3.5), shades: null, shadesS: new Spring(0, 180, 13)};
  for (const k in IDLE) b.P[k] = new Spring(IDLE[k], k === 'headS' ? 90 : 130, k === 'headS' ? 9 : 16);
  b.spin = new THREE.Group(); b.tilt = new THREE.Group(); b.sqG = new THREE.Group(); b.spin.add(b.tilt); b.tilt.add(b.sqG); b.sqG.add(model);
  model.traverse(o => { if (!o.isMesh) return; o.frustumCulled = false; o.castShadow = !/Shine/.test(o.name); o.receiveShadow = !/Eye|Shine|Lid|Lash|Head|Mouth|Brow|Freckle/.test(o.name); const m = o.material; if (m && m.isMeshStandardMaterial) { if (!/Eye|Shine/.test(m.name)) rimPatch(m); if (/Shine/.test(m.name)) m.emissive = new THREE.Color(1, 1, 1); }
    if (o.morphTargetDictionary) b.morph.push(o); });
  b.bones = {hips: N('Hips', 'mixamorigHips', 'pelvis'), spine: N('Spine', 'Spine1', 'Chest', 'mixamorigSpine1'), neck: N('Neck', 'mixamorigNeck'), head: N('Head', 'mixamorigHead'), la: N('LeftArm'), lf: N('LeftForeArm'), lh: N('LeftHand'), ra: N('RightArm'), rf: N('RightForeArm'), rh: N('RightHand'), ll: N('LeftUpLeg'), rl: N('RightUpLeg')};
  b.lid = [N('LidL'), N('LidR')]; b.low = [N('LowLidL'), N('LowLidR')]; b.eye = [N('EyeL'), N('EyeR')]; b.brow = [N('BrowL'), N('BrowR')]; b.ponyN = N('Pony'); b.prop = N('Prop');
  b.rest = {}; for (const k of ['la', 'ra']) if (b.bones[k]) b.rest[k] = b.bones[k].position.y; b.browY = b.brow.map(n => n ? n.position.y : 0);
  const box = new THREE.Box3().setFromObject(model); b.H = ex.height || box.max.y; b.fw = ex.faceWidth || b.H * 0.34; b.lidOpen = ex.lidOpen != null ? ex.lidOpen : -0.6; b.lidClosed = ex.lidClosed || 1.25; b.lowLid = ex.lowLid || 0.9;
  // which morph target names this model offers for each mouth control
  const ALIAS = {jaw: ['jawOpen', 'mouthOpen', 'viseme_aa', 'MouthOpen'], pucker: ['mouthPucker', 'mouthFunnel', 'viseme_U', 'viseme_O'], wide: ['mouthWide', 'mouthStretchLeft', 'mouthStretchRight', 'viseme_I', 'viseme_E'], smile: ['mouthSmile', 'mouthSmileLeft', 'mouthSmileRight'], frown: ['mouthFrown', 'mouthFrownLeft', 'mouthFrownRight'], blink: ['eyeBlinkLeft', 'eyeBlinkRight', 'eyesClosed', 'blink', 'Blink']};
  b.mt = {}; for (const k in ALIAS) { b.mt[k] = []; for (const o of b.morph) for (const n of ALIAS[k]) if (n in o.morphTargetDictionary) { b.mt[k].push([o, o.morphTargetDictionary[n]]); if (k === 'jaw' || k === 'pucker') break; } }
  D.rig = full ? 'w2s-1' : (b.mt.jaw.length ? 'generic with morph targets' : 'generic');
  return b;
}
const setM = (b, k, v) => { for (const [o, i] of b.mt[k]) o.morphTargetInfluences[i] = v; };

/* ---------- mouth shapes and lip sync ---------- */
const SHAPE = {rest: [0, 0, 0], A: [0.8, 0, 0.2], E: [0.42, 0, 0.6], I: [0.26, 0, 0.85], O: [0.6, 0.75, 0], U: [0.3, 1, 0], closed: [0, 0.12, 0], F: [0.12, 0, 0.25], cons: [0.3, 0, 0.25], L: [0.4, 0, 0.1], laugh: [0.7, 0, 0.7], oh: [0.55, 0.6, 0], hmm: [0, 0.3, 0]};
const VIS = {a: 'A', e: 'E', i: 'I', y: 'I', o: 'O', u: 'U', w: 'U', m: 'closed', b: 'closed', p: 'closed', f: 'F', v: 'F', l: 'L', t: 'cons', d: 'cons', n: 'cons', s: 'cons', z: 'cons', r: 'cons', k: 'cons', g: 'cons', c: 'cons', j: 'cons', h: 'A', q: 'U', x: 'cons'};
let speaking = false, listening = false, lastWord = 0, vq = [], vqT = 0, sayUntil = 0;
function mouth(shape) { if (!B) return; const s = SHAPE[shape] || SHAPE.rest; B.Mt.jaw = s[0]; B.Mt.pucker = s[1]; B.Mt.wide = s[2]; }
function say(shape, sec) { mouth(shape); sayUntil = performance.now() + sec * 1000; }
function sayWord(w) { const q = []; let prev = ''; for (const ch of String(w).toLowerCase()) { const v = VIS[ch]; if (v && v !== prev) { q.push(v); prev = v; } } if (!q.length) q.push('cons'); vq = q.slice(0, 5); vqT = 0; lastWord = performance.now(); }
function lipSync(dt, now) {
  if (now < sayUntil) { /* a reaction is holding the mouth */ }
  else if (speaking) { vqT -= dt; if (vqT <= 0) { if (vq.length) { mouth(vq.shift()); vqT = 0.075; } else if (now - lastWord > 420) { mouth(['A', 'E', 'O', 'cons', 'I', 'closed', 'A', 'U'][Math.floor(Math.random() * 8)]); vqT = rnd(0.09, 0.16); } else { mouth('cons'); B.Mt.jaw = 0.14; vqT = 0.06; } } }
  else if (sayUntil) { sayUntil = 0; mouth('rest'); }
  const k = 1 - Math.exp(-dt * 22); for (const key of ['jaw', 'pucker', 'wide', 'smile', 'frown']) { B.M[key] = lerp(B.M[key], B.Mt[key], k); setM(B, key, B.M[key]); }
  D.mouth = +B.M.jaw.toFixed(3);
}

/* ---------- timeline, poses, reactions ---------- */
let timers = [], lastR = '', pokes = [], busyUntil = 0, recent = [];
const at = (ms, fn) => { const t = setTimeout(() => { timers = timers.filter(x => x !== t); fn(); }, ms); timers.push(t); };
const cancel = () => { timers.forEach(clearTimeout); timers = []; if (B) { B.hold = null; B.gazeHold = null; } };
function pose(o) { if (!B) return; for (const k in o) { if (RM && !FACE_KEYS.includes(k)) continue; if (B.P[k]) B.P[k].t = o[k]; } }
const talkPose = () => pose({rfx: -1.05, rax: 0.12, raz: -0.1, hz: 0, brow: 0.25});
const listenPose = () => pose({hz: 0.15, hx: 0.05, brow: 0.6, lean: 0.07, rfx: -0.14, raz: 0});
function relax() { if (!B) return; for (const k in IDLE) B.P[k].t = IDLE[k]; B.Mt.smile = speaking ? 0.15 : 0.3; B.Mt.frown = 0; if (!speaking) mouth('rest'); if (listening) listenPose(); else if (speaking) talkPose(); }
const hop = v => { if (B && !RM && B.hop <= 0.001) B.hopV = v; };
const eyes = (amount, ms) => { if (!B) return; B.hold = amount; at(ms, () => { if (B) B.hold = null; }); };
function seq(name, steps, total, o = {}) { cancel(); D.log.push(name); lastR = name; busyUntil = performance.now() + total; steps.forEach(([ms, what]) => at(ms, () => typeof what === 'function' ? what() : pose(what))); at(total, relax); if (o.sfx) SFX[o.sfx](); if (o.buzz) buzz(o.buzz); }
const R = {
  giggle: () => seq('giggle', [[0, {hx: -0.14, hz: 0.1, squint: 1, sx: -0.04}], [0, () => { B.Mt.smile = 1; say('laugh', 0.75); eyes(0.85, 700); hop(1.6); }], [170, () => hop(1.4)], [340, () => hop(1.2)]], 800, {sfx: 'giggle', buzz: 12}),
  boop: () => seq('boop', [[0, {cross: 1, brow: 1, hx: 0.06}], [0, () => { B.sq.v = -3; say('oh', 0.3); }], [260, () => eyes(1, 140)]], 620, {sfx: 'boop', buzz: 10}),
  hairflick: () => { const p = !!B.ponyN; seq('hairflick', [[0, {hy: -0.55, hz: -0.14, raz: p ? 0 : -2.45, rfz: p ? 0 : -1.5, rfx: p ? -0.14 : -0.6}], [0, () => { B.pony.v = 9; B.pony2.v = -7; B.Mt.smile = 0.8; }], [190, {hy: 0.5, hz: 0.12}], [190, () => { B.pony2.v = 9; }], [430, {hy: 0, hz: 0}]], 760, {sfx: 'whoosh', buzz: 8}); },
  tickle: () => seq('tickle', [[0, {sz: 0.13, hz: -0.1, squint: 0.8}], [0, () => { B.Mt.smile = 1; say('laugh', 0.6); B.sq.v = 2.4; }], [130, {sz: -0.13, hz: 0.1}], [260, {sz: 0.1, hz: -0.08}], [390, {sz: -0.07, hz: 0.05}]], 640, {sfx: 'giggle', buzz: 14}),
  shrug: () => seq('shrug', [[0, {shrug: 1, hz: 0.17, rfx: -0.95, rfz: -0.4, raz: -0.28, brow: 1, lfz: 0.3}], [0, () => { B.Mt.smile = 0.7; say('hmm', 0.5); }]], 820, {sfx: 'pop'}),
  wave: () => seq('wave', [[0, {raz: -2.3, rfz: -0.55, hz: -0.08, brow: 0.5}], [0, () => { B.Mt.smile = 1; }], [190, {rfz: 0.3}], [350, {rfz: -0.6}], [510, {rfz: 0.3}], [670, {rfz: -0.5}]], 900, {sfx: 'pop', buzz: 8}),
  sip: () => seq('sip', [[0, {lfx: -2.3, lax: -0.42, lay: -0.8, hx: -0.14}], [250, () => { eyes(0.8, 420); mouth('U'); SFX.sip(); }], [720, {hx: 0, lfx: -1.6}], [760, () => { B.Mt.smile = 1; mouth('rest'); }]], 1050, {buzz: 8}),
  startled: () => seq('startled', [[0, {brow: 1, hx: -0.1, shrug: 0.8}], [0, () => { hop(2.6); say('oh', 0.4); }]], 620, {sfx: 'pop', buzz: 16}),
  tapdance: () => seq('tapdance', [[0, {legL: -0.55, sz: 0.06}], [0, () => hop(1.2)], [130, {legL: 0, legR: -0.55, sz: -0.06}], [130, () => hop(1.2)], [260, {legR: 0, legL: -0.55, sz: 0.06}], [260, () => hop(1.2)], [390, {legL: 0, legR: -0.55, sz: -0.06}], [390, () => hop(1.2)], [520, {legR: 0, sz: 0}]], 700, {sfx: 'pop', buzz: 10}),
  spinjump: () => seq('spinjump', [[0, () => { hop(3.2); if (!RM) B.rotV += 13; B.Mt.smile = 1; }], [0, {armsOut: 0.6}]], 800, {sfx: 'whoosh', buzz: 14}),
  sideeye: () => seq('sideeye', [[0, {hy: -0.14, browTilt: 1, hz: 0.06}], [0, () => { B.gazeHold = [0.95, 0.05]; B.Mt.smile = 0; B.Mt.frown = 0.25; say('hmm', 0.9); }], [1000, () => { B.gazeHold = null; }]], 1150, {sfx: 'hmm'})
};
const PARTS = {face: ['giggle', 'boop'], hair: ['hairflick', 'startled'], torso: ['tickle', 'shrug'], arm: ['wave', 'shrug'], prop: ['sip', 'wave'], legs: ['tapdance', 'spinjump']};
const ALL = ['giggle', 'hairflick', 'tickle', 'wave', 'sip', 'tapdance', 'boop', 'shrug', 'startled', 'spinjump'];
function poke(part) {
  if (!B) return; const now = performance.now(); pokes = pokes.filter(t => now - t < 1900); pokes.push(now); B.pop.v = 2.2;
  if (pokes.length >= 5) { pokes = []; R.sideeye(); return; }
  let opts = (PARTS[part] || ALL).filter(n => n !== lastR); if (!opts.length) opts = ALL.filter(n => n !== lastR);   // never the same reaction twice in a row
  const age = n => { const i = recent.lastIndexOf(n); return i < 0 ? 99 : recent.length - i; }; opts.sort((a, b) => age(b) - age(a) || Math.random() - 0.5);   // and the one seen longest ago comes first
  recent.push(opts[0]); if (recent.length > 8) recent.shift(); R[opts[0]]();
}

/* ---------- conversation reactions ---------- */
function onSpeak() { speaking = D.speaking = true; if (!B) return; B.Mt.smile = 0.15; if (performance.now() > busyUntil) talkPose(); }
function onWord(e) { if (!B) return; sayWord(e.detail && e.detail.word || ''); if (performance.now() > busyUntil && !RM) { B.P.rfx.v += rnd(-2.2, 2.2); B.P.rfz.v += rnd(-1.6, 1.6); B.P.rhz.v += rnd(-3, 3); B.P.hx.v += rnd(-0.5, 0.7); B.P.hz.v += rnd(-0.4, 0.4); } }
function onSpeakEnd() { speaking = D.speaking = false; vq = []; if (!B) return; mouth('rest'); if (performance.now() > busyUntil) relax(); }
function onMic(e) { listening = D.listening = !!(e.detail && e.detail.on); if (B && performance.now() > busyUntil) relax(); }
function onGood() { if (!B) return; seq('good', [[0, {hx: 0.24, brow: 0.6}], [0, () => { B.Mt.smile = 1; hop(1.5); }], [170, {hx: -0.04}], [330, {hx: 0.2}], [480, {hx: 0}]], 760, {sfx: 'good'}); if (!RM) confetti(14); }
function onOops() { if (!B) return; seq('oops', [[0, {hx: 0.15, hz: -0.12, brow: 0.7, rfx: -0.8, rfz: 0.2}], [0, () => { B.gazeHold = [0, -0.55]; B.Mt.smile = 0.1; say('oh', 0.35); }], [900, {hx: 0.16, hz: 0}], [900, () => { B.gazeHold = null; B.Mt.smile = 0.8; }], [1060, {hx: 0}], [1220, {hx: 0.14}]], 1500, {sfx: 'hmm'}); }   // looks down at the correction card, then nods
function onHelp() { if (!B) return; seq('help', [[0, {raz: -0.55, rfx: -2.25, rfz: 0.5, hz: 0.13, brow: 0.9}], [0, () => { B.gazeHold = [-0.5, 0.6]; say('hmm', 0.9); }], [1100, () => { B.gazeHold = null; B.Mt.smile = 0.9; }]], 1400, {sfx: 'pop'}); }
function onDone() { if (!B) return; seq('done', [[0, {raz: -2.7, rfz: -0.2, lax: -1.2, lfx: -1.5, brow: 1, hx: -0.12}], [0, () => { B.Mt.smile = 1; say('laugh', 1.1); hop(3); }], [420, () => hop(2.6)], [840, () => hop(2)]], 1500, {sfx: 'win', buzz: 30}); if (!RM) confetti(70); }

/* ---------- three hidden extras: sunglasses (double tap the face), big head (long press), helicopter (three full turns) ---------- */
function shadesOn() { if (!B) return; D.delights.shades = true; D.log.push('shades');
  if (!B.shades && B.eye[0] && B.bones.head) { const g = new THREE.Group(), dark = new THREE.MeshStandardMaterial({color: 0x0b103a, roughness: 0.15, metalness: 0.3}), yel = new THREE.MeshStandardMaterial({color: 0xffd93b, roughness: 0.4});
    const ex = B.eye[0].position, ax = Math.abs(ex.x), r = ax * 0.92; for (const s of [1, -1]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.96, 0.03, 28), dark); l.rotation.x = Math.PI / 2; l.position.set(ax * s, 0, 0); g.add(l); const a = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.025, 0.32), yel); a.position.set((ax + r) * s, 0.01, -0.16); g.add(a); }
    const br = new THREE.Mesh(new THREE.BoxGeometry(ax * 0.5, 0.03, 0.03), yel); br.position.y = 0.02; g.add(br); g.position.set(0, ex.y + 0.005, ex.z + 0.115); B.shadesY = ex.y + 0.005; B.bones.head.add(g); B.shades = g; g.scale.setScalar(0.001); }
  B.shadesOn = !B.shadesOn; B.shadesS.t = B.shadesOn ? 1 : 0; B.Mt.smile = 1; SFX.good(); buzz(20); if (!RM) { B.P.hx.v -= 2.5; confetti(18); } }
let inflating = false, heliBlock = 0;
function inflateStart() { if (!B || inflating) return; inflating = true; cancel(); B.P.headS.t = RM ? 1.12 : 1.36; pose({brow: 1}); mouth('U'); sayUntil = performance.now() + 60000; SFX.whoosh(); }
function inflateEnd() { if (!B || !inflating) return; inflating = false; D.delights.inflate = true; D.log.push('inflate'); heliBlock = performance.now() + 3000; B.P.headS.t = 1; B.P.headS.v = -6; sayUntil = 0; say('oh', 0.3); relax(); SFX.pop(); buzz(25); if (!RM) confetti(24); }
function helicopter() { if (!B) return; D.delights.helicopter = true; seq('helicopter', [[0, {armsOut: 1, lfx: -0.3, brow: 1}], [0, () => { B.heli = RM ? 0 : 1.6; B.Mt.smile = 1; say('laugh', 1.4); }], [1500, {cross: 1}]], 2300, {sfx: 'win', buzz: 30}); if (!RM) confetti(40); }

/* ---------- confetti ---------- */
let conf = null; const CN = 90, cp = [], dummy = new THREE.Object3D();
function confetti(n) { if (!scene) return; if (!conf) { conf = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.05, 0.03), new THREE.MeshBasicMaterial({side: THREE.DoubleSide}), CN); conf.frustumCulled = false; const cols = [0x2d4bff, 0xffd93b, 0xffffff, 0x19c79c, 0xff8fb1]; for (let i = 0; i < CN; i++) { conf.setColorAt(i, new THREE.Color(cols[i % cols.length])); cp.push({life: 0}); } scene.add(conf); }
  let k = 0; for (const p of cp) { if (k >= n) break; if (p.life > 0) continue; k++; p.life = rnd(0.9, 1.6); p.x = rnd(-0.3, 0.3); p.y = (B ? B.H : 2) * rnd(0.55, 0.95); p.z = rnd(0.2, 0.5); p.vx = rnd(-1.6, 1.6); p.vy = rnd(1.5, 3.6); p.vz = rnd(-0.4, 1); p.r = rnd(0, 6); p.vr = rnd(-9, 9); } }
function confStep(dt) { if (!conf) return; let any = false; cp.forEach((p, i) => { if (p.life > 0) { any = true; p.life -= dt; p.vy -= 5.5 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.r += p.vr * dt; dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(p.r, p.r * 0.7, p.r * 1.3); dummy.scale.setScalar(p.life > 0.25 ? 1 : Math.max(0.001, p.life * 4)); } else dummy.scale.setScalar(0.0001); dummy.updateMatrix(); conf.setMatrixAt(i, dummy.matrix); }); conf.instanceMatrix.needsUpdate = true; conf.visible = any; }

/* ---------- which Buddy is on stage ---------- */
let firstShow = true;
function show(id, instant) {
  pending = id;
  return load(id).then(b => { if (pending !== id) return; const old = B;
    const swap = () => { if (old && old !== b) scene.remove(old.spin); B = b; D.id = id; scene.add(b.spin); b.rot = 0; b.rotV = 0; turnAcc = 0; frameCam(); relax();
      if (instant || RM) { b.pop.x = 1; b.pop.t = 1; b.pop.v = 0; } else { b.pop.x = 0.02; b.pop.t = 1; b.pop.v = 6; hop(2.4); confetti(26); SFX.pop(); }
      if (!RM && (firstShow || !instant)) at(firstShow ? 700 : 280, () => { if (performance.now() > busyUntil) R.wave(); }); firstShow = false;
      wrap.classList.add('is-3d'); D.ready = true; };
    if (old && old !== b && !instant && !RM) { cancel(); D.ready = false; old.pop.t = 0.02; old.rotV = 16; SFX.whoosh(); setTimeout(swap, 300); } else swap(); })
    .catch(() => { if (!B) wrap.classList.add('no-3d'); });
}

/* ---------- camera: the face is large; on a phone the body runs on behind the subtitle ---------- */
let camForce = null;
function frameCam() {
  if (!B || !camera) return; const kb = sm && sm.classList.contains('kb'), phone = window.matchMedia('(max-width: 899px)').matches;
  const topPad = kb ? 10 : phone ? 62 : Math.max(64, H * 0.08), headH = B.fw * 1.14;
  let ppu = Math.min((phone ? 0.42 : 0.36) * W / B.fw, 0.6 * H / headH), cy;
  const fit = (H - topPad - 16) / (B.H * 1.04); if (ppu < fit) ppu = fit;          // never smaller than "the whole body fits"
  if (camForce === 'full') { ppu = (H - 40) / (B.H * 1.08); cy = B.H * 0.5; } else if (camForce === 'face') { ppu = 0.62 * H / headH; cy = B.H - headH * 0.5; }
  else cy = B.H + 0.035 - (H / 2 - topPad) / ppu;
  const d = H / (2 * ppu * Math.tan(camera.fov * Math.PI / 360)); camera.aspect = W / H; camera.position.set(0, cy, d); camera.lookAt(0, cy, 0); camera.updateProjectionMatrix(); if (sm && !camForce) sm.style.setProperty('--sm-chin', Math.round(topPad + headH * ppu * 0.93) + 'px');   // cards over the stage stop below the chin
  D.info.ppu = Math.round(ppu); D.info.faceShare = +(B.fw * ppu / W).toFixed(2);
}
function resize() { const r = stage.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return; W = Math.round(r.width); H = Math.round(r.height); renderer.setSize(W, H, false); frameCam(); }

/* ---------- per-frame update ---------- */
let ptr = {x: 0, y: 0, t: -1e9}, dragging = false, turnAcc = 0;
function update(dt, now) {
  const b = B; if (!b) return; const P = b.P, t = now / 1000, idle = RM ? 0 : 1;
  for (const k in P) P[k].step(dt);
  // spin with inertia, then settle facing the learner
  if (!dragging) { if (Math.abs(b.rotV) > 1.2 && !(b.heli > 0)) turnAcc += b.rotV * dt; b.rot += b.rotV * dt; b.rotV *= Math.exp(-dt * (b.heli > 0 ? 0.2 : 2.6));
    if (b.heli > 0) { b.heli -= dt; b.rotV = lerp(b.rotV, 15, dt * 4); } else if (Math.abs(b.rotV) < 1.2 && D.hold == null) { const home = Math.round(b.rot / (Math.PI * 2)) * Math.PI * 2; b.rot = lerp(b.rot, home, 1 - Math.exp(-dt * 5)); if (Math.abs(b.rot - home) < 0.02) turnAcc = 0; } }
  if (D.hold != null) { b.rot = D.hold; b.rotV = 0; }
  D.turns = +(Math.abs(turnAcc) / (Math.PI * 2)).toFixed(2); D.settled = !dragging && !(b.heli > 0) && Math.abs(b.rotV) < 0.3 && Math.abs(b.rot - Math.round(b.rot / (Math.PI * 2)) * Math.PI * 2) < 0.05 && now > busyUntil;
  if (!dragging && Math.abs(turnAcc) >= Math.PI * 6 && !b.heliDone && now > heliBlock) { b.heliDone = true; helicopter(); } if (Math.abs(turnAcc) < 0.5) b.heliDone = false;
  // hop with gravity and a landing squash
  if (b.hop > 0 || b.hopV > 0) { b.hopV -= 14 * dt; b.hop += b.hopV * dt; if (b.hop <= 0) { b.hop = 0; b.sq.v = -Math.min(4, Math.abs(b.hopV) * 1.1); b.hopV = 0; } } if (b.heli > 0) b.hop = lerp(b.hop, 0.35, dt * 3);
  b.sq.step(dt); b.pop.step(dt); b.shadesS.step(dt);
  const sq = clamp(b.sq.x, 0.8, 1.2), pop = Math.max(0.001, b.pop.x);
  D.hopY = +b.hop.toFixed(3); b.spin.rotation.y = b.rot; b.spin.position.y = b.hop; b.spin.scale.setScalar(pop);
  b.tilt.rotation.z = Math.sin(t * 0.9) * 0.012 * idle; b.tilt.rotation.x = P.lean.x;
  b.sqG.scale.set(1 + (1 - sq) * 0.6, sq, 1 + (1 - sq) * 0.6);
  blob.scale.setScalar(pop * (1 - Math.min(0.5, b.hop * 0.5))); blob.material.opacity = 1 - Math.min(0.6, b.hop * 0.7);
  // gaze follows the pointer or the last touch for a few seconds, then drifts
  const g = b.gazeHold || (now - ptr.t < 4000 ? [ptr.x, ptr.y] : [Math.sin(t * 0.31) * 0.12 * idle, Math.sin(t * 0.23) * 0.06 * idle]);
  const sgn = Math.cos(b.rot) >= 0 ? 1 : -1; b.gaze.x.t = clamp(g[0], -1, 1) * sgn; b.gaze.y.t = clamp(g[1], -1, 1); const gx = b.gaze.x.step(dt), gy = b.gaze.y.step(dt);
  // blinking with the eyelids
  b.nextBlink -= dt; if (b.nextBlink <= 0) { b.blinkT = 0.16; b.nextBlink = rnd(2.2, 5.5); } let bl = 0; if (b.blinkT > 0) { b.blinkT -= dt; bl = Math.sin(clamp(1 - b.blinkT / 0.16, 0, 1) * Math.PI); } if (b.hold != null) bl = Math.max(bl, b.hold); b.blink = bl; D.blink = +bl.toFixed(2);
  const K = b.bones, smile = b.M.smile;
  if (b.full) {
    const br = Math.sin(t * 1.7) * 0.009 * idle;   // breathing
    if (K.spine) { K.spine.rotation.set(P.sx.x + br * 0.6, P.sy.x, P.sz.x); K.spine.scale.set(1 + br * 0.5, 1 + br, 1 + br * 1.2); }
    if (K.head) { K.head.rotation.set(P.hx.x - gy * 0.16 + Math.sin(t * 0.7) * 0.012 * idle, P.hy.x + gx * 0.26, P.hz.x + Math.sin(t * 0.53) * 0.014 * idle); K.head.scale.setScalar(P.headS.x); }
    const ao = P.armsOut.x;
    if (K.la) { K.la.rotation.set(P.lax.x, P.lay.x * (1 - ao), P.laz.x + ao * 0.9); K.la.position.y = b.rest.la + P.shrug.x * 0.055; } if (K.lf) K.lf.rotation.set(P.lfx.x * (1 - ao * 0.7), 0, P.lfz.x);
    if (K.ra) { K.ra.rotation.set(P.rax.x, P.ray.x, P.raz.x - ao * 0.9 + Math.sin(t * 1.1) * 0.012 * idle); K.ra.position.y = b.rest.ra + P.shrug.x * 0.055; } if (K.rf) K.rf.rotation.set(P.rfx.x, 0, P.rfz.x); if (K.rh) K.rh.rotation.z = P.rhz.x;
    if (K.ll) K.ll.rotation.x = P.legL.x; if (K.rl) K.rl.rotation.x = P.legR.x; if (K.hips) K.hips.rotation.z = Math.sin(t * 0.6) * 0.008 * idle;
    const open = b.lidOpen + 0.3 * clamp(P.squint.x * 0.6 + smile * 0.12, 0, 1) - gy * 0.12 - P.brow.x * 0.08;
    b.lid.forEach(n => { if (n) n.rotation.x = lerp(open, b.lidClosed, bl); }); b.low.forEach(n => { if (n) n.rotation.x = b.lowLid - clamp(P.squint.x * 0.3 + smile * 0.14, 0, 0.45) - bl * 0.2; });
    b.eye.forEach((n, i) => { if (n) n.rotation.set(-gy * 0.3, gx * 0.42 + P.cross.x * (i ? 0.4 : -0.4), 0); });
    b.brow.forEach((n, i) => { if (n) { n.position.y = b.browY[i] + P.brow.x * 0.03 - P.squint.x * 0.008; n.rotation.z = (i ? 1 : -1) * P.brow.x * 0.06 + P.browTilt.x * 0.22; } });
    if (b.ponyN) { b.pony.t = clamp(-b.rotV * 0.02, -0.6, 0.6) + P.hx.x * 0.5; b.pony2.t = -P.hy.x * 0.5; b.ponyN.rotation.set(clamp(b.pony.step(dt), -0.9, 0.9) + Math.sin(t * 1.3) * 0.02 * idle, 0, clamp(b.pony2.step(dt), -0.9, 0.9)); }
  } else setM(b, 'blink', bl);
  if (b.shades) { const s = b.shadesS.x; b.shades.visible = s > 0.02; b.shades.scale.setScalar(Math.max(0.001, s)); b.shades.position.y = b.shadesY + (1 - s) * 0.5; }
  lipSync(dt, now); confStep(dt);
}

/* ---------- frame loop, pausing, automatic quality, optional readout ---------- */
let frames = 0, slowFor = 0, settle = 0, fpsT = 0; const FPS = /[?&]fps=1/.test(location.search), fpsEl = document.getElementById('smFps');
function frame(now) {
  raf = requestAnimationFrame(frame); const dt = Math.min(0.25, (now - last) / 1000 || 0.016), steps = Math.max(1, Math.ceil(dt / 0.034)); last = now;
  for (let i = 0; i < steps; i++) update(dt / steps, now);   // on a slow device the motion keeps real time (several small steps per drawn frame), so lip sync stays with the voice
  renderer.render(scene, camera);
  frames++; if (!fpsT) fpsT = now; const span = (now - fpsT) / 1000;          // measured on the real clock, not the clamped step
  if (span >= 0.5) { D.fps = Math.round(frames / span); D.info.calls = renderer.info.render.calls; D.info.tris = renderer.info.render.triangles; settle += span;
    if (settle > 2 && D.ready && !D.lockQuality) { slowFor = D.fps < 40 ? slowFor + span : 0; if (slowFor >= 2 && D.quality < QUAL.length - 1) { setQuality(D.quality + 1); slowFor = 0; settle = 0.5; } }   // under 40 fps for two seconds: step down
    D.info.slowFor = +slowFor.toFixed(1); frames = 0; fpsT = now;
    if (FPS && fpsEl) { fpsEl.hidden = false; fpsEl.textContent = D.fps + ' fps\n' + D.info.calls + ' draw calls, ' + Math.round(D.info.tris / 1000) + 'k triangles\nquality step ' + D.quality + ' of ' + (QUAL.length - 1) + ' (' + renderer.getPixelRatio().toFixed(2) + 'x, shadows ' + (QUAL[D.quality].sh ? 'on' : 'off') + ')\n' + D.renderer.slice(0, 46); } }
}
function run() { const want = visible && !document.hidden && !wrap.classList.contains('is-hidden'); if (want && !running) { running = true; last = performance.now(); settle = 0; slowFor = 0; fpsT = 0; frames = 0; raf = requestAnimationFrame(frame); } else if (!want && running) { running = false; cancelAnimationFrame(raf); } D.running = running; }

/* ---------- pointer: spin, poke, double tap, long press ---------- */
const ray = new THREE.Raycaster();
function partAt(cx, cy) {
  if (!B) return null; const r = canvas.getBoundingClientRect(); ray.setFromCamera(new THREE.Vector2((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1), camera);
  const hits = ray.intersectObject(B.model, true); if (!hits.length) return null; const n = hits[0].object.name, p = B.model.worldToLocal(hits[0].point.clone());
  if (B.prop && hits[0].point.distanceTo(B.prop.getWorldPosition(new THREE.Vector3())) < 0.19) return 'prop';   // the cup or flask, and the hand round it
  if (/Hair|Pony/.test(n)) return 'hair'; if (/Head|Mouth|Eye|Lid|Lash|Brow|Shine|Freckle/.test(n)) return 'face'; if (/Prop|Headphones|Badge|HandL/.test(n)) return 'prop'; if (/Hand/.test(n)) return 'arm'; if (/Trousers|Shoe/.test(n)) return 'legs';
  if (/Jacket/.test(n)) return Math.abs(p.x) > 0.34 ? 'arm' : 'torso'; return p.y > B.H * 0.63 ? 'face' : p.y > B.H * 0.28 ? 'torso' : 'legs';
}
function bindPointer() {
  let down = null, lastTap = 0, lastPart = '', press = 0, lx = 0, lt = 0, vel = 0;
  canvas.addEventListener('pointerdown', e => { touched = true; down = {x: e.clientX, y: e.clientY, part: partAt(e.clientX, e.clientY), moved: false}; lx = e.clientX; lt = e.timeStamp; vel = 0; try { canvas.setPointerCapture(e.pointerId); } catch (x) {}
    clearTimeout(press); if (down.part) press = setTimeout(() => { if (down && !down.moved) { down.long = true; inflateStart(); } }, 560); });
  canvas.addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); ptr = {x: clamp(((e.clientX - r.left) / r.width - 0.5) * 2.4, -1, 1), y: clamp(-((e.clientY - r.top) / r.height - 0.3) * 2.2, -1, 1), t: performance.now()};
    if (!down || !B) return; const dx = e.clientX - down.x, dy = e.clientY - down.y; if (!down.moved && !down.long && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) { down.moved = true; dragging = true; clearTimeout(press); canvas.classList.add('grabbing'); }
    if (down.moved) { const d = (e.clientX - lx) * Math.PI * 2.5 / Math.max(160, W); B.rot += d; turnAcc += d; D.spun = +(D.spun + Math.abs(d)).toFixed(3); vel = lerp(vel, d / (Math.max(1, e.timeStamp - lt) / 1000), 0.5); lx = e.clientX; lt = e.timeStamp; } });
  canvas.addEventListener('pointerup', e => { clearTimeout(press); if (!down) return; const d = down; down = null; canvas.classList.remove('grabbing'); ptr.t = performance.now();
    if (d.long) { inflateEnd(); dragging = false; return; }
    if (d.moved) { dragging = false; if (B) B.rotV = RM ? 0 : clamp(vel, -22, 22); return; }
    if (!d.part) return; if (d.part === 'face' && lastPart === 'face' && e.timeStamp - lastTap < 500) { lastTap = 0; cancel(); shadesOn(); return; } lastTap = e.timeStamp; lastPart = d.part; poke(d.part); });
  canvas.addEventListener('pointercancel', () => { clearTimeout(press); if (down && down.long) inflateEnd(); down = null; dragging = false; canvas.classList.remove('grabbing'); });
  canvas.addEventListener('keydown', e => { touched = true; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); poke(['face', 'hair', 'torso', 'arm', 'prop', 'legs'][Math.floor(Math.random() * 6)]); } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); if (B) { const d = (e.key === 'ArrowLeft' ? -1 : 1) * 0.5; B.rot += d; turnAcc += d; D.spun = +(D.spun + 0.5).toFixed(3); } } });
  window.addEventListener('pointerdown', () => { touched = true; }, {passive: true});
}

/* ---------- start ---------- */
function start() {
  if (!wrap || !stage || !boot()) return;
  resize(); setQuality(0); bindPointer();
  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver(es => { visible = es[0].isIntersecting; run(); }, {threshold: 0.02}).observe(stage);
  document.addEventListener('visibilitychange', run);
  const on = (n, f) => window.addEventListener('w2s:' + n, f);
  on('speak', onSpeak); on('word', onWord); on('speakend', onSpeakEnd); on('mic', onMic); on('good', onGood); on('oops', onOops); on('help', onHelp); on('done', onDone);
  on('buddy', e => { touched = true; show(e.detail && e.detail.id === 'rio' ? 'rio' : 'mila', false); });
  on('mute', e => { muted = !!(e.detail && e.detail.on); if (!muted) { touched = true; SFX.pop(); } });
  on('shown', run); on('layout', () => setTimeout(resize, 30)); on('start', () => { touched = true; });
  // hooks for the tests, the turnaround renders and the static pictures
  D.anchor = part => { if (!B) return null; const v = new THREE.Vector3(), n = {face: B.bones.head, hair: B.bones.head, torso: B.bones.spine, arm: B.bones.rf || B.bones.ra, prop: B.prop || B.bones.lh, legs: B.bones.ll}[part]; if (!n) return null; n.getWorldPosition(v);
    if (part === 'face') { v.y += B.fw * 0.36; v.z += 0.1; } if (part === 'hair') v.y += B.fw * 0.93; if (part === 'torso') v.y += 0.22; if (part === 'legs') v.y -= 0.25; if (part === 'arm') v.y -= 0.1;
    v.project(camera); const r = canvas.getBoundingClientRect(), x = r.left + (v.x + 1) / 2 * r.width, y = r.top + (1 - v.y) / 2 * r.height; return {x, y, part: partAt(x, y)}; };
  D.say = (s, sec) => say(s, sec || 0.5); D.poke = p => poke(p); D.react = n => R[n] && R[n](); D.setQuality = setQuality;
  D.view = o => { o = o || {}; camForce = o.frame || null; D.hold = o.rot != null ? o.rot : null; if (o.pose) pose(o.pose); if (o.blink != null && B) B.hold = o.blink; frameCam(); };
  D.snap = () => { update(0.016, performance.now()); renderer.render(scene, camera); return canvas.toDataURL('image/png'); };
  show(window.W2S_BUDDY === 'rio' ? 'rio' : 'mila', true);   // the other Buddy is only downloaded when the learner switches
  run();
}
start();
