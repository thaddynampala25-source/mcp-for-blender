/* Week2Speak Language Buddies: two procedural 3D characters for Speech Mode.
   Mila and Rio are built from primitives; their faces are drawn at runtime so the mouth can follow speech.
   Listens to window events sent by the app: w2s:speak, w2s:word, w2s:speakend, w2s:mic, w2s:good, w2s:oops, w2s:help, w2s:done, w2s:buddy. */
import * as THREE from './vendor/three-0.170.0.module.min.js';

const stage = document.getElementById('buddyStage');
const wrap = document.getElementById('buddy');
if (stage && wrap) boot();

function boot() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const AMP = reduced ? 0.25 : 1;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({antialias: true, alpha: true, powerPreference: 'low-power'});
    if (!renderer.getContext()) throw new Error('no context');
  } catch (e) { wrap.classList.add('no-3d'); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const canvas = renderer.domElement;
  canvas.className = 'buddy-canvas'; canvas.tabIndex = 0; canvas.setAttribute('role', 'img');
  stage.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xc4ceff, 1.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.35); key.position.set(1.8, 3.5, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xcdd8ff, 1.3); rim.position.set(-3.5, 3, -4); scene.add(rim);

  const C = {cobalt: 0x2D4BFF, cobaltLt: 0x7389FF, yellow: 0xFFD93B, yellowLt: 0xFFEC96, night: 0x0B103A, ink: 0x101642, white: 0xffffff, mint: 0x19C79C, pink: 0xFF8FB1, cream: 0xFFF6DC};
  const mat = (color, rough = 0.46) => new THREE.MeshStandardMaterial({color, roughness: rough, metalness: 0});
  const flat = (color, opacity = 1) => new THREE.MeshBasicMaterial({color, transparent: opacity < 1, opacity});
  const mesh = (geo, material, part) => { const m = new THREE.Mesh(geo, material); if (part) m.userData.part = part; return m; };
  const group = (...kids) => { const g = new THREE.Group(); kids.forEach(k => g.add(k)); return g; };
  const sph = (r = 1, w = 24, h = 16) => new THREE.SphereGeometry(r, w, h);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];

  /* ---------- stage: podium, trapdoor, shadow ---------- */
  const podium = group();
  const base = mesh(new THREE.CylinderGeometry(1.3, 1.42, 0.2, 56), mat(C.night, 0.6)); base.position.y = -0.1;
  const ring = mesh(new THREE.TorusGeometry(1.3, 0.035, 10, 64), mat(C.yellow, 0.4)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.0;
  const hatch = mesh(new THREE.CircleGeometry(0.95, 40), flat(0x05071c)); hatch.rotation.x = -Math.PI / 2; hatch.position.y = 0.004; hatch.scale.setScalar(0.001);
  const shadow = mesh(new THREE.CircleGeometry(0.75, 32), flat(0x000000, 0.28)); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.006;
  podium.add(base, ring, hatch, shadow); scene.add(podium);

  /* ---------- springs ---------- */
  class Spring { constructor(x = 0, k = 190, d = 13) { this.x = x; this.t = x; this.v = 0; this.k = k; this.d = d; } step(dt) { this.v += (-this.k * (this.x - this.t) - this.d * this.v) * dt; this.x += this.v * dt; return this.x; } }

  /* ---------- mouth: a small canvas redrawn from shape numbers ---------- */
  const MOUTH = {
    rest: {open: 0, wide: 0.72, round: 0, smile: 1, teeth: 0, tongue: 0},
    wideA: {open: 0.85, wide: 0.9, round: 0, smile: 0.2, teeth: 0.3, tongue: 0},
    wideE: {open: 0.5, wide: 1, round: 0, smile: 0.3, teeth: 0.5, tongue: 0},
    wideI: {open: 0.32, wide: 1, round: 0, smile: 0.4, teeth: 0.6, tongue: 0},
    round: {open: 0.62, wide: 0.1, round: 1, smile: 0, teeth: 0, tongue: 0},
    roundU: {open: 0.36, wide: 0, round: 1, smile: 0, teeth: 0, tongue: 0},
    closed: {open: 0, wide: 0.35, round: 0, smile: 0.05, teeth: 0, tongue: 0},
    teeth: {open: 0.2, wide: 0.7, round: 0, smile: 0.1, teeth: 1, tongue: 0},
    tongue: {open: 0.42, wide: 0.7, round: 0, smile: 0.1, teeth: 0.4, tongue: 1},
    cons: {open: 0.22, wide: 0.6, round: 0, smile: 0.2, teeth: 0.3, tongue: 0},
    laugh: {open: 0.95, wide: 1, round: 0, smile: 1, teeth: 0.6, tongue: 0},
    oh: {open: 0.5, wide: 0, round: 1, smile: 0, teeth: 0, tongue: 0},
    flatline: {open: 0, wide: 0.5, round: 0, smile: -0.25, teeth: 0, tongue: 0},
    smirk: {open: 0, wide: 0.7, round: 0, smile: 0.9, teeth: 0, tongue: 0},
    hmm: {open: 0, wide: 0.2, round: 0.6, smile: 0.1, teeth: 0, tongue: 0},
    listen: {open: 0, wide: 0.42, round: 0, smile: 0.55, teeth: 0, tongue: 0},
    blow: {open: 0.2, wide: 0, round: 1, smile: 0, teeth: 0, tongue: 0}
  };
  function drawMouth(ctx, p) {
    const W = 192, H = 144, cx = 96, cy = 52;
    ctx.clearRect(0, 0, W, H);
    const w = 30 + 40 * p.wide - 16 * p.round, h = 54 * p.open * (1 + 0.25 * p.round);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#101642';
    if (h < 4) {
      const c = 40 * p.smile;
      ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(cx - w, cy - c * 0.3); ctx.quadraticCurveTo(cx, cy + c, cx + w, cy - c * 0.3); ctx.stroke();
      return;
    }
    const lift = 10 * p.smile;
    const lips = new Path2D(); lips.moveTo(cx - w, cy - lift);
    lips.bezierCurveTo(cx - w * 0.6, cy - h * 0.5, cx + w * 0.6, cy - h * 0.5, cx + w, cy - lift);
    lips.bezierCurveTo(cx + w, cy + h * 1.3, cx - w, cy + h * 1.3, cx - w, cy - lift);
    lips.closePath();
    ctx.fillStyle = '#4a0f2b'; ctx.fill(lips);
    ctx.save(); ctx.clip(lips);
    ctx.fillStyle = '#ff7f9f'; ctx.beginPath(); ctx.ellipse(cx, cy + h * 1.02, w * 0.62, h * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    if (p.teeth > 0.05) { ctx.fillStyle = '#fff'; ctx.fillRect(cx - w, cy - h, w * 2, h * (0.66 + 0.5 * p.teeth) + 4 * p.teeth); }
    if (p.tongue > 0.05) { ctx.fillStyle = '#ff9db6'; ctx.beginPath(); ctx.ellipse(cx, cy + h * 0.5, w * 0.5, h * 0.55 * p.tongue, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    ctx.lineWidth = 8; ctx.stroke(lips);
  }
  const spiralTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 96; const x = c.getContext('2d'); x.strokeStyle = '#101642'; x.lineWidth = 7; x.lineCap = 'round'; x.beginPath(); for (let a = 0; a < Math.PI * 5.2; a += 0.15) { const r = 3 + a * 2.5; const px = 48 + Math.cos(a) * r, py = 48 + Math.sin(a) * r; a ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();

  /* ---------- body shape ---------- */
  const shape = (t, Rb, Rt) => (Rb + (Rt - Rb) * t) * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(2 * t - 1), 2.7)), 1 / 2.3);
  function bean(H, Rb, Rt) { const pts = []; for (let i = 0; i <= 30; i++) { const t = i / 30; pts.push(new THREE.Vector2(Math.max(0.0005, shape(t, Rb, Rt)), t * H)); } return new THREE.LatheGeometry(pts, 44); }

  function makeBuddy(cfg) {
    const B = {id: cfg.id, name: cfg.name, cfg};
    const legH = 0.34, H = cfg.H, R = t => shape(t, cfg.Rb, cfg.Rt);
    B.root = group(); B.spin = group(); B.tilt = group(); B.sq = group(); B.torso = group();
    B.root.add(B.spin); B.spin.add(B.tilt); B.tilt.add(B.sq); B.sq.add(B.torso);
    B.torso.position.y = legH;
    const bodyMat = mat(cfg.body, 0.42), limbMat = mat(cfg.limb || cfg.body, 0.46);
    B.body = mesh(bean(H, cfg.Rb, cfg.Rt), bodyMat, 'body'); B.torso.add(B.body);
    // belly patch
    const belly = mesh(sph(1, 28, 18), mat(cfg.belly, 0.5), 'belly');
    belly.scale.set(R(0.28) * 0.62, H * 0.17, R(0.28) * 0.5); belly.position.set(0, H * 0.25, R(0.28) * 0.52); B.torso.add(belly);

    // legs and feet
    B.legs = [-1, 1].map((s, i) => {
      const g = group(); g.position.set(s * cfg.Rb * 0.38, legH + 0.08, 0);
      const leg = mesh(new THREE.CapsuleGeometry(0.115, 0.2, 6, 14), limbMat, 'feet'); leg.position.y = -0.16;
      const sock = mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.1, 18), mat(cfg.socks[i], 0.6), 'feet'); sock.position.y = -0.27;
      const foot = mesh(sph(1, 20, 14), mat(cfg.shoe, 0.4), 'feet'); foot.scale.set(0.17, 0.11, 0.25); foot.position.set(0, -0.36, 0.07);
      g.add(leg, sock, foot); B.sq.add(g); return g;
    });
    // arms
    const sy = 0.56;
    B.arms = [-1, 1].map(s => {
      const g = group(); g.position.set(s * (R(sy) - 0.02), H * sy, 0);
      const arm = mesh(new THREE.CapsuleGeometry(0.095, 0.26, 6, 14), limbMat, 'body'); arm.position.y = -0.2;
      const hand = mesh(sph(0.125, 18, 14), mat(cfg.hand, 0.45), 'body'); hand.position.y = -0.43;
      g.add(arm, hand); B.torso.add(g); return g;
    });

    // face, laid on the curved front of the body
    const ft = cfg.faceT, fr = R(ft), fy = H * ft;
    B.faceY = legH + fy; B.H = legH + H; B.faceR = fr; B.fy = fy; B.R = R;
    B.face = group(); B.face.position.set(0, fy, 0); B.torso.add(B.face);
    const onFace = (o, x, y, lift = 0.012) => { const rr = R(clamp((fy + y) / H, 0.05, 0.95)); o.position.set(x, y, Math.sqrt(Math.max(0.01, rr * rr - x * x)) + lift); o.rotation.y = Math.asin(clamp(x / rr, -1, 1)); return o; };
    const ex = fr * 0.36;
    B.eyes = [-1, 1].map(s => {
      const g = onFace(group(), s * ex, 0.06);
      const white = mesh(sph(1, 24, 18), mat(C.white, 0.3), 'face'); white.scale.set(0.155, 0.2, 0.05);
      const pupil = mesh(sph(1, 18, 14), flat(C.ink), 'face'); pupil.scale.set(0.078, 0.1, 0.03); pupil.position.z = 0.04;
      const shine = mesh(sph(0.026, 10, 8), flat(C.white)); shine.position.set(0.03, 0.04, 0.07);
      const open = group(white, pupil, shine);
      const arc = mesh(new THREE.TorusGeometry(0.1, 0.024, 8, 18, Math.PI), flat(C.ink), 'face'); arc.position.set(0, -0.03, 0.03); arc.visible = false;
      const spiral = mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({map: spiralTex, transparent: true, depthWrite: false})); spiral.position.z = 0.08; spiral.visible = false;
      g.add(open, arc, spiral);
      if (cfg.lashes) [[0.12, 0.16, 0.75], [0.155, 0.1, 1.15]].forEach(([lx, ly, lr]) => { const l = mesh(new THREE.CapsuleGeometry(0.013, 0.065, 3, 6), flat(C.ink)); l.position.set(s * lx, ly, 0.02); l.rotation.z = -s * lr; open.add(l); });
      return {g, open, pupil, shine, arc, spiral};
    });
    B.brows = [-1, 1].map(s => { const b = onFace(mesh(new THREE.CapsuleGeometry(cfg.browW, 0.12, 4, 8), flat(C.ink), 'face'), s * ex, cfg.browY, 0.03); b.geometry.rotateZ(Math.PI / 2); b.userData.y0 = cfg.browY; b.userData.s = s; return b; });
    [-1, 1].forEach(s => { const ch = onFace(mesh(new THREE.CircleGeometry(0.075, 20), flat(C.pink, 0.55)), s * fr * 0.62, -0.2, 0.016); B.face.add(ch); });
    B.eyes.forEach(e => B.face.add(e.g)); B.brows.forEach(b => B.face.add(b));
    const mc = document.createElement('canvas'); mc.width = 192; mc.height = 144;
    B.mctx = mc.getContext('2d'); B.mtex = new THREE.CanvasTexture(mc); B.mtex.colorSpace = THREE.SRGBColorSpace;
    B.mouthMesh = onFace(mesh(new THREE.PlaneGeometry(0.6, 0.45), new THREE.MeshBasicMaterial({map: B.mtex, transparent: true, depthWrite: false}), 'face'), 0, -0.4, 0.03);
    B.face.add(B.mouthMesh);
    // sunglasses for the double-tap surprise
    B.shades = group(); [-1, 1].forEach(s => { const l = mesh(new THREE.BoxGeometry(0.37, 0.3, 0.04), mat(0x0a0a14, 0.2)); onFace(l, s * ex, 0.07, 0.09); B.shades.add(l); });
    const bridge = mesh(new THREE.BoxGeometry(0.2, 0.045, 0.03), mat(0x0a0a14, 0.2)); bridge.position.set(0, 0.1, fr + 0.085); B.shades.add(bridge); B.shades.visible = false; B.face.add(B.shades);
    // dizzy stars
    B.stars = group(); for (let i = 0; i < 3; i++) { const s = mesh(new THREE.OctahedronGeometry(0.07), mat(C.yellow, 0.3)); s.userData.a = i * Math.PI * 2 / 3; B.stars.add(s); } B.stars.position.y = H + 0.22; B.stars.visible = false; B.torso.add(B.stars);

    // accessories
    B.acc = group(); B.acc.position.y = H; B.torso.add(B.acc);       // pops off on a poke
    B.ant = group(); B.acc.add(B.ant);                                // wobbles
    cfg.build(B, {R, H, mat, mesh, group, sph, C, onFace});

    // springs
    B.s = {sq: new Spring(0, 240, 11), leanX: new Spring(0, 120, 12), leanZ: new Spring(0, 120, 10), aL: new Spring(0, 150, 13), aR: new Spring(0, 150, 13), aLf: new Spring(0, 150, 14), aRf: new Spring(0, 150, 14),
      eye: new Spring(1, 420, 26), brow: new Spring(0, 200, 16), browT: new Spring(0, 200, 16), accY: new Spring(0, 150, 9), accR: new Spring(0, 90, 6), ant: new Spring(0, 70, 3.2), antX: new Spring(0, 70, 3.2),
      inflate: new Spring(1, 110, 10), lookX: new Spring(0, 160, 20), lookY: new Spring(0, 160, 20), cross: new Spring(0, 200, 16), shades: new Spring(1.4, 160, 12), legs: new Spring(0, 160, 10)};
    B.mouth = Object.assign({}, MOUTH.rest); B.mouthDrawn = null;
    B.root.visible = false; scene.add(B.root);
    return B;
  }

  const MILA = makeBuddy({id: 'mila', name: 'Mila', H: 1.74, Rb: 0.66, Rt: 0.56, faceT: 0.66, body: C.cobalt, belly: C.cobaltLt, hand: C.cobaltLt, socks: [C.white, C.white], shoe: C.yellow, lashes: true, browW: 0.017, browY: 0.36,
    build(B, {R, H, mat, mesh, group, sph, C}) {
      const er = R(0.68), ey = -(H * 0.32), topY = 0.05;
      // headphones: a band over the top and two cups
      const band = mesh(new THREE.TorusGeometry(1, 0.075, 10, 36, Math.PI), mat(C.yellow, 0.4), 'acc'); band.scale.set(er + 0.05, topY - ey, 0.9); band.position.y = ey; B.acc.add(band);
      [-1, 1].forEach(s => { const cup = mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.13, 26), mat(C.yellow, 0.4), 'acc'); cup.rotation.z = Math.PI / 2; cup.position.set(s * (er + 0.07), ey, 0);
        const pad = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.14, 22), mat(C.night, 0.6), 'acc'); pad.rotation.z = Math.PI / 2; pad.position.copy(cup.position); B.acc.add(cup, pad); });
      // signature: a little speech bubble on a springy stalk
      const stalk = mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.26, 8), mat(C.night, 0.5), 'acc'); stalk.position.y = 0.13;
      const bub = mesh(sph(1, 22, 16), mat(C.yellow, 0.4), 'acc'); bub.scale.set(0.2, 0.15, 0.09); bub.position.y = 0.36;
      const tail = mesh(new THREE.ConeGeometry(0.05, 0.1, 10), mat(C.yellow, 0.4), 'acc'); tail.position.set(-0.07, 0.24, 0); tail.rotation.z = Math.PI + 0.5;
      const dots = [-1, 0, 1].map(k => { const d = mesh(sph(0.022, 8, 6), new THREE.MeshBasicMaterial({color: C.ink})); d.position.set(k * 0.07, 0.36, 0.085); return d; });
      B.ant.position.y = topY + 0.03; B.ant.add(stalk, bub, tail, ...dots);
    }});
  const RIO = makeBuddy({id: 'rio', name: 'Rio', H: 1.58, Rb: 0.76, Rt: 0.68, faceT: 0.585, body: C.yellow, belly: C.cream, hand: C.yellowLt, socks: [C.cobalt, C.mint], shoe: C.white, lashes: false, browW: 0.03, browY: 0.31,
    build(B, {R, H, mat, mesh, group, sph, C}) {
      const cr = R(0.84) + 0.035, cy = -(H * 0.16);
      // backwards cap
      const dome = mesh(new THREE.SphereGeometry(cr, 30, 14, 0, Math.PI * 2, 0, Math.PI / 2), mat(C.cobalt, 0.5), 'acc'); dome.scale.y = (0.02 - cy) / cr + 0.12; dome.position.y = cy; B.acc.add(dome);
      const brim = mesh(new THREE.CylinderGeometry(cr * 0.8, cr * 0.8, 0.045, 26, 1, false, Math.PI / 2, Math.PI), mat(C.cobalt, 0.5), 'acc'); brim.scale.z = 1.25; brim.position.set(0, cy + 0.03, -cr * 0.55); B.acc.add(brim);
      const strap = mesh(new THREE.TorusGeometry(cr * 0.99, 0.022, 6, 30, Math.PI), mat(C.night, 0.5), 'acc'); strap.rotation.x = Math.PI / 2; strap.position.y = cy + 0.02; B.acc.add(strap);
      // signature: a propeller button on the cap
      const pin = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 8), mat(C.night, 0.5), 'acc'); pin.position.y = 0.08;
      const prop = group(); [0, 1].forEach(k => { const bl = mesh(sph(1, 14, 10), mat(k ? C.mint : C.yellow, 0.4), 'acc'); bl.scale.set(0.17, 0.02, 0.055); bl.position.x = k ? 0.15 : -0.15; prop.add(bl); }); prop.position.y = 0.14; B.prop = prop;
      B.ant.position.y = (0.02 - cy) + cy + 0.1; B.ant.add(pin, prop);
      // tiny backpack with a keychain
      const pack = mesh(new THREE.BoxGeometry(0.62, 0.6, 0.26, 2, 2, 2), mat(C.cobalt, 0.55), 'body'); pack.position.set(0, H * 0.42, -(R(0.42) + 0.02)); B.torso.add(pack);
      const pocket = mesh(new THREE.BoxGeometry(0.4, 0.24, 0.08), mat(C.night, 0.6), 'body'); pocket.position.set(0, H * 0.36, -(R(0.42) + 0.17)); B.torso.add(pocket);
      B.charm = mesh(sph(0.07, 12, 10), mat(C.mint, 0.4), 'body'); B.charm.position.set(0.24, H * 0.3, -(R(0.42) + 0.2)); B.torso.add(B.charm);
    }});
  const BUDDIES = {mila: MILA, rio: RIO};

  /* ---------- particles: confetti, puff ---------- */
  const N = 44, conf = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.09, 0.05), new THREE.MeshBasicMaterial({side: THREE.DoubleSide}), N);
  conf.count = 0; conf.frustumCulled = false; scene.add(conf);
  const cp = Array.from({length: N}, () => ({p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Vector3(), life: 0}));
  const dummy = new THREE.Object3D(), ccol = [0x2D4BFF, 0xFFD93B, 0x19C79C, 0xE0245E, 0xffffff].map(c => new THREE.Color(c));
  cp.forEach((_, i) => conf.setColorAt(i, ccol[i % ccol.length])); conf.instanceColor.needsUpdate = true;
  function confetti(n = 26) { n = Math.round(n * (reduced ? 0.4 : 1)); conf.count = N; let k = 0; for (const c of cp) { if (k >= n) break; if (c.life > 0) continue; c.p.set(rand(-0.3, 0.3), cur.H * 0.75, 0.4); c.v.set(rand(-2.4, 2.4), rand(3, 6), rand(-1, 1.6)); c.r.set(rand(0, 6), rand(0, 6), rand(0, 6)); c.life = rand(1, 1.7); k++; } }
  const puffs = Array.from({length: 7}, () => { const m = mesh(sph(0.14, 10, 8), flat(0xffffff, 0.9)); m.visible = false; scene.add(m); return {m, v: new THREE.Vector3(), life: 0}; });
  function puff() { puffs.forEach((p, i) => { const a = i / puffs.length * Math.PI * 2; p.m.position.set(Math.cos(a) * 0.45, 0.12, Math.sin(a) * 0.45); p.v.set(Math.cos(a) * 1.7, 0.5, Math.sin(a) * 1.7); p.life = 0.45; p.m.visible = true; }); }

  /* ---------- sound and haptics ---------- */
  let ac = null, muted = false; try { muted = localStorage.getItem('w2s.buddyMute') === '1'; } catch (e) {}
  function unlock() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } else if (ac.state === 'suspended') ac.resume().catch(() => {}); }
  function tone(f, d = 0.12, type = 'sine', v = 0.07, to = 0, delay = 0) { if (muted || !ac || ac.state !== 'running') return; const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + d); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d + 0.03); }
  const SFX = {boing: () => tone(220, 0.22, 'sine', 0.09, 520), pop: () => tone(700, 0.08, 'triangle', 0.09, 1300), bloop: () => tone(420, 0.16, 'sine', 0.09, 180), giggle: () => [0, 1, 2, 3].forEach(i => tone(620 + i * 90, 0.07, 'triangle', 0.06, 760 + i * 90, i * 0.075)),
    whoosh: () => tone(300, 0.3, 'sawtooth', 0.025, 900), hmph: () => tone(170, 0.18, 'square', 0.03, 120), ding: () => { tone(880, 0.12, 'sine', 0.07); tone(1320, 0.2, 'sine', 0.06, 0, 0.09); }, thud: () => { tone(140, 0.16, 'sine', 0.12, 70); tone(380, 0.16, 'sine', 0.06, 620, 0.1); },
    fanfare: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.07, 0, i * 0.11)), pfft: () => tone(260, 0.5, 'sawtooth', 0.035, 60), cool: () => { tone(330, 0.1, 'triangle', 0.06); tone(494, 0.18, 'triangle', 0.06, 0, 0.1); }, heli: () => tone(120, 1.4, 'sawtooth', 0.02, 190), tick: () => tone(1500, 0.03, 'square', 0.02)};
  const sfx = n => { try { SFX[n](); } catch (e) {} };
  let touched = false; addEventListener('pointerdown', () => { touched = true; }, {capture: true, passive: true}); addEventListener('keydown', () => { touched = true; }, {capture: true, passive: true});
  const buzz = ms => { try { if (touched && navigator.vibrate) navigator.vibrate(ms); } catch (e) {} };

  /* ---------- state ---------- */
  let camDist = 6, camLift = 0;
  let spinK = 0.02;   // radians per pixel: one drag across the stage is a turn and a quarter
  let cur = null, now = 0, rot = 0, rotV = 0, dragging = false, tiltT = 0, hopY = 0, hopV = 0, liftY = 0, liftT = 0, switchY = 0, jig = 0, ripple = 0, busyUntil = 0, lastTouch = 0, lastFidget = 0, nextFidget = 8, lastWave = -99, nextBlink = 2;
  let heliBlock = 0, dizzyArmed = false, dizzyUntil = 0, turnsFrom = 0, heliUntil = 0, listening = false, inflating = false, shadesUntil = 0, happyUntil = 0, mouthHold = null, mouthHoldUntil = 0, dance = 0, tap = 0, switching = false, look = {x: 0, y: 0}, lookHold = null, lookHoldUntil = 0, tiltDev = 0;
  const timeline = [];
  const at = (ms, fn) => timeline.push({t: now + ms / 1000, fn});
  const dbg = window.W2SBuddies = {ready: false, id: null, log: [], fps: 0, turns: 0, spun: 0, mouth: null, speaking: false, listening: false, info: null, delights: [],
    anchor(part) { const B = cur, v = new THREE.Vector3(), L = 0.34, H = B.cfg.H;
      const P = {head: [0, B.faceY + 0.52, B.R((B.fy + 0.52) / H)], face: [0, B.faceY - 0.1, B.faceR], belly: [0, L + H * 0.27, B.R(0.3) * 1.02], feet: [B.cfg.Rb * 0.38, 0.05, 0.22], acc: B.id === 'mila' ? [0, L + H + 0.44, 0] : [0, L + H + 0.02, 0.2]}[part] || [0, 1, 0.5];
      v.set(P[0] * Math.cos(rot) + P[2] * Math.sin(rot), P[1] + B.root.position.y, -P[0] * Math.sin(rot) + P[2] * Math.cos(rot)).project(camera); const r = canvas.getBoundingClientRect(); return {x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height}; }};
  dbg.say = (shape, sec) => say(shape, sec);
  const note = name => { dbg.log.push(name); if (dbg.log.length > 60) dbg.log.shift(); };

  /* ---------- lip sync ---------- */
  let speaking = false, queue = [], qAt = 0, lastWord = 0, speakRate = 1;
  function visemes(word) {
    const w = String(word).toLowerCase().replace(/[^a-z']/g, ''), out = [];
    for (let i = 0; i < w.length && out.length < 7; i++) {
      const c = w[i], n = w[i + 1];
      let s = null;
      if (c === 't' && n === 'h') { s = 'tongue'; i++; }
      else if (c === 'a') s = 'wideA'; else if (c === 'e') s = 'wideE'; else if (c === 'i' || c === 'y') s = 'wideI';
      else if (c === 'o') s = 'round'; else if (c === 'u' || c === 'w') s = 'roundU';
      else if ('mbp'.includes(c)) s = 'closed'; else if ('fv'.includes(c)) s = 'teeth'; else if (c === 'l') s = 'tongue';
      else if (c !== "'" && c !== 'h') s = 'cons';
      if (s && s !== out[out.length - 1]) out.push(s);
    }
    return out.length ? out : ['cons'];
  }
  addEventListener('w2s:speak', () => { speaking = true; queue = []; lastWord = now; dbg.speaking = true; });
  addEventListener('w2s:word', e => {
    if (!cur) return; speaking = true; lastWord = now; const v = visemes(e.detail.word), each = clamp(0.3 / v.length, 0.055, 0.1);
    queue = v.map(s => ({s, d: each})); qAt = now;
    cur.s.sq.v += 0.5 * AMP; cur.s.ant.v += 2.2 * (Math.random() < 0.5 ? -1 : 1); if (Math.random() < 0.3) cur.s.brow.v += 3; if (Math.random() < 0.35) cur.s[Math.random() < 0.5 ? 'aL' : 'aR'].v += 2.5 * AMP;
  });
  addEventListener('w2s:speakend', () => { speaking = false; queue = []; dbg.speaking = false; });
  function mouthTarget() {
    if (speaking || queue.length) {
      while (queue.length && now - qAt > queue[0].d) { qAt += queue[0].d; queue.shift(); }
      if (queue.length) return MOUTH[queue[0].s];
      // no word events for a while: keep the mouth moving at speaking pace
      if (speaking && now - lastWord > 0.45 && (!window.speechSynthesis || window.speechSynthesis.speaking)) return MOUTH[['wideA', 'closed', 'round', 'cons', 'wideE', 'closed'][Math.floor(now * 9) % 6]];
      if (speaking) return MOUTH.cons.open ? Object.assign({}, MOUTH.rest, {open: 0.06}) : MOUTH.rest;
    }
    if (mouthHold && now < mouthHoldUntil) return MOUTH[mouthHold];
    return MOUTH.rest;
  }

  /* ---------- face helpers ---------- */
  const say = (shape, sec) => { mouthHold = shape; mouthHoldUntil = now + sec; };
  const gaze = (x, y, sec) => { lookHold = {x, y}; lookHoldUntil = now + sec; };
  const happy = sec => { happyUntil = now + sec; };
  const busy = sec => { busyUntil = Math.max(busyUntil, now + sec); };
  const hop = v => { if (hopY < 0.02) hopV = v * (reduced ? 0.4 : 1); };

  /* ---------- reactions ---------- */
  const R = {
    giggle() { jig = 1; happy(0.9); say('laugh', 0.8); cur.s.aL.v += 6; cur.s.aR.v += 6; sfx('giggle'); busy(1); },
    startled() { hop(4.6); cur.s.eye.t = 1.35; cur.s.brow.t = 1; say('oh', 0.7); cur.s.aL.t = 1.9; cur.s.aR.t = 1.9; sfx('boing'); busy(1); at(650, () => { cur.s.eye.t = 1; cur.s.brow.t = 0; cur.s.aL.t = 0; cur.s.aR.t = 0; }); },
    ripple() { ripple = 1; cur.s.sq.v -= 3.2 * AMP; say('oh', 0.35); at(350, () => { say('smirk', 0.7); }); sfx('bloop'); busy(1); },
    accpop() { cur.s.accY.v = 7.5 * (reduced ? 0.4 : 1); cur.s.accR.v = (Math.random() < 0.5 ? -1 : 1) * 9 * AMP; cur.s.eye.t = 1.25; gaze(0, 1, 0.6); say('oh', 0.5); sfx('pop'); busy(1.2); at(620, () => { cur.s.eye.t = 1; cur.s.sq.v -= 1.6 * AMP; say('smirk', 0.6); sfx('tick'); }); },
    spinjump() { hop(5.4); spinBy(Math.PI * 2, 0.62); cur.s.aL.t = 2.2; cur.s.aR.t = 2.2; happy(0.7); say('laugh', 0.7); sfx('whoosh'); busy(1.1); at(640, () => { cur.s.aL.t = 0; cur.s.aR.t = 0; }); },
    boop() { cur.s.cross.t = 1; cur.s.sq.v -= 1.8 * AMP; say('hmm', 0.5); sfx('pop'); busy(1.1); at(420, () => { cur.s.cross.t = 0; cur.s.eye.x = 0.05; }); at(560, () => { cur.s.eye.x = 0.05; jig = 0.5; say('laugh', 0.5); }); },
    tapdance() { tap = 1; cur.s.aL.t = 0.7; cur.s.aR.t = 0.7; happy(1); say('smirk', 1); busy(1.2); [0, 150, 300, 450, 600].forEach(d => at(d, () => { sfx('tick'); hop(1.6); })); at(820, () => { tap = 0; cur.s.aL.t = 0; cur.s.aR.t = 0; }); },
    sideeye() { cur.s.aLf.t = -1.25; cur.s.aRf.t = -1.25; cur.s.aL.t = -0.55; cur.s.aR.t = -0.55; cur.s.browT.t = 1; cur.s.brow.t = -0.6; cur.s.eye.t = 0.62; gaze(0.95, 0.1, 1.5); say('flatline', 1.5); cur.s.leanZ.v += 1.6; sfx('hmph'); busy(2.2);
      at(500, () => { tap = 0.6; }); at(1500, () => { tap = 0; cur.s.aLf.t = 0; cur.s.aRf.t = 0; cur.s.aL.t = 0; cur.s.aR.t = 0; cur.s.browT.t = 0; cur.s.brow.t = 0; cur.s.eye.t = 1; say('smirk', 0.8); }); }
  };
  const PARTS = {head: ['startled', 'spinjump'], face: ['boop', 'startled'], belly: ['giggle', 'ripple'], body: ['giggle', 'ripple'], acc: ['accpop', 'startled'], feet: ['tapdance', 'spinjump']};
  let lastReaction = '', pokes = [], sideEyeUntil = 0;
  function poke(part) {
    if (switching || !cur || now < sideEyeUntil) return; lastTouch = now; unlock(); buzz(10);
    pokes = pokes.filter(t => now - t < 2.4); pokes.push(now);
    let name;
    if (pokes.length >= 5 && lastReaction !== 'sideeye') { name = 'sideeye'; pokes = []; sideEyeUntil = now + 1.3; }
    else { const opts = (PARTS[part] || PARTS.belly).filter(n => n !== lastReaction); name = opts[0] === undefined ? 'giggle' : (part === 'belly' || part === 'body' ? pick(opts) : opts[0]); }
    lastReaction = name; note(name); R[name]();
  }
  let spinTween = null;
  function spinBy(angle, sec) { if (reduced) return; spinTween = {from: rot, by: angle, t0: now, d: sec}; rotV = 0; }

  /* hidden delights */
  function shadesOn() { for (let i = timeline.length - 1; i >= 0; i--) if (!timeline[i].run) timeline.splice(i, 1); Object.values(cur.s).forEach(sp => { if (sp !== cur.s.inflate && sp !== cur.s.shades) sp.t = sp === cur.s.eye ? 1 : 0; }); tap = 0; note('shades'); dbg.delights.push('shades'); cur.shades.visible = true; cur.s.shades.x = 1.4; cur.s.shades.t = 0; shadesUntil = now + 4; say('smirk', 4); cur.s.aLf.t = -1.2; cur.s.aRf.t = -1.2; cur.s.aL.t = -0.5; cur.s.aR.t = -0.5; cur.s.leanX.t = -0.1; sfx('cool'); busy(4.3);
    at(3900, () => { cur.s.shades.t = 1.4; cur.s.aLf.t = 0; cur.s.aRf.t = 0; cur.s.aL.t = 0; cur.s.aR.t = 0; cur.s.leanX.t = 0; }); at(4400, () => { cur.shades.visible = false; }); }
  function inflateStart() { inflating = true; note('inflate'); dbg.delights.push('inflate'); cur.s.inflate.t = 1.36; cur.s.eye.t = 0.45; say('closed', 9); busy(9); tone(180, 1.6, 'sine', 0.05, 520); buzz(30); }
  function inflateEnd() { if (!inflating) return; inflating = false; cur.s.inflate.t = 1; cur.s.inflate.v = -5 * AMP; cur.s.eye.t = 1; say('blow', 0.9); busyUntil = now + 1.2; if (!reduced) rotV = 26; heliBlock = now + 3; dizzyArmed = false; hop(3); sfx('pfft'); at(900, () => say('smirk', 0.6)); }
  function helicopter() { note('helicopter'); dbg.delights.push('helicopter'); heliUntil = now + 1.9; liftT = 0.75; cur.s.aL.t = 1.5; cur.s.aR.t = 1.5; happy(1.9); say('laugh', 1.9); sfx('heli'); busy(2.4); at(1900, () => { liftT = 0; cur.s.aL.t = 0; cur.s.aR.t = 0; }); at(2250, () => { cur.s.sq.v -= 3; puff(); sfx('thud'); }); }

  /* conversation reactions */
  addEventListener('w2s:good', () => { if (!cur || switching) return; note('good'); hop(3.6); confetti(22); happy(0.9); say('laugh', 0.8); cur.s.aL.t = 2.3; cur.s.aR.t = 2.3; sfx('ding'); busy(1.1); at(700, () => { cur.s.aL.t = 0; cur.s.aR.t = 0; }); });
  addEventListener('w2s:oops', () => { if (!cur || switching) return; note('oops'); cur.s.leanZ.t = 0.17; say('smirk', 1.3); cur.s.brow.t = 0.5; busy(1.4); at(450, () => { cur.s.leanX.v += 1.6; }); at(1300, () => { cur.s.leanZ.t = 0; cur.s.brow.t = 0; }); });
  addEventListener('w2s:help', () => { if (!cur || switching) return; note('help'); cur.s.leanX.v += 2.2; busy(2.2); at(260, () => { cur.s.leanX.v += 2.2; }); at(520, () => { cur.s.aRf.t = -1.5; cur.s.aR.t = -0.35; gaze(-0.6, 0.8, 1.4); cur.s.brow.t = 0.8; say('hmm', 1.4); }); at(1950, () => { cur.s.aRf.t = 0; cur.s.aR.t = 0; cur.s.brow.t = 0; }); });
  addEventListener('w2s:done', () => { if (!cur || switching) return; note('done'); dance = 1; confetti(44); happy(2.6); say('laugh', 2.6); sfx('fanfare'); busy(3); [0, 420, 840, 1260].forEach((d, i) => at(d, () => { hop(3.4); cur.s.aL.t = i % 2 ? 2.4 : 0.6; cur.s.aR.t = i % 2 ? 0.6 : 2.4; cur.s.leanZ.v += (i % 2 ? 1 : -1) * 2.4; })); at(1680, () => { hop(5.2); spinBy(Math.PI * 2, 0.6); cur.s.aL.t = 2.4; cur.s.aR.t = 2.4; confetti(30); }); at(2600, () => { dance = 0; cur.s.aL.t = 0; cur.s.aR.t = 0; }); });
  addEventListener('w2s:mic', e => { listening = !!(e.detail && e.detail.on); dbg.listening = listening; if (!cur) return; cur.s.leanX.t = listening ? 0.14 : 0; cur.s.leanZ.t = listening ? 0.1 : 0; cur.s.eye.t = listening ? 1.22 : 1; cur.s.brow.t = listening ? 0.7 : 0; if (listening) { note('listening'); say('listen', 30); } else mouthHoldUntil = 0; });

  /* ---------- switching ---------- */
  function show(id, instant) {
    const next = BUDDIES[id] || MILA;
    canvas.setAttribute('aria-label', next.name + ', your Language Buddy. Drag to spin, tap to poke. Arrow keys spin, Enter pokes.');
    if (!cur || instant || reduced) {
      if (cur) cur.root.visible = false;
      cur = next; cur.root.visible = true; rot = 0; rotV = 0; switchY = 0; dbg.id = id;
      if (reduced && !instant) { canvas.style.opacity = '0.2'; requestAnimationFrame(() => { canvas.style.opacity = '1'; }); }
      return;
    }
    if (next === cur) return;
    switching = true; note('switch'); const old = cur; busy(1.2); unlock();
    // the floor opens and the old Buddy drops; the new one falls in from above
    old.s.eye.t = 1.35; old.s.aL.t = 2.4; old.s.aR.t = 2.4; mouthHold = 'oh'; mouthHoldUntil = now + 0.4; sfx('bloop');
    const t0 = now;
    timeline.push({t: now, fn: () => {}, run: () => {
      const k = now - t0;
      hatch.scale.setScalar(clamp(k < 0.42 ? k / 0.1 : 1 - (k - 0.42) / 0.1, 0.001, 1));
      if (cur === old) { const f = clamp((k - 0.06) / 0.3, 0, 1); switchY = -3.1 * f * f; old.sq.scale.setScalar(1 - 0.25 * f);
        if (k >= 0.38) { old.root.visible = false; old.s.eye.t = 1; old.s.aL.t = 0; old.s.aR.t = 0; cur = next; dbg.id = id; cur.root.visible = true; rot = 0; rotV = 0; hopY = 0; hopV = 0; cur.s.aL.x = 2.2; cur.s.aR.x = 2.2; cur.s.eye.x = 1.3; mouthHold = 'laugh'; mouthHoldUntil = now + 0.7; } }
      else { const f = clamp((k - 0.38) / 0.3, 0, 1); switchY = 3.6 * (1 - f * f);
        if (f >= 1 && switching) { switching = false; switchY = 0; cur.s.sq.v = -7; cur.s.ant.v += 9; cur.s.accY.v += 2.5; puff(); sfx('thud'); buzz(18); happy(0.7); return true; } }
      return false;
    }});
  }
  addEventListener('w2s:buddy', e => { if (e.detail && e.detail.id) show(e.detail.id, false); });

  /* ---------- pointer: spin, tilt, poke, long-press, double-tap ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function partAt(cx, cy) {
    const r = canvas.getBoundingClientRect(); ndc.set((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera); const hit = ray.intersectObject(cur.root, true).find(h => h.object.visible && h.object.userData.part);
    if (!hit) return null; let part = hit.object.userData.part;
    if (part === 'body') { const lp = cur.torso.worldToLocal(hit.point.clone()); part = lp.z > 0 && Math.abs(lp.y - cur.fy + 0.1) < 0.42 && Math.abs(lp.x) < cur.faceR * 0.85 ? 'face' : lp.y > cur.fy + 0.3 ? 'head' : 'belly'; }
    return part;
  }
  let pd = null, pressTimer = 0, lastTapAt = -9, lastTapPart = '';
  canvas.addEventListener('pointerdown', e => {
    if (!cur || switching) return; unlock(); lastTouch = now;
    pd = {x: e.clientX, y: e.clientY, lx: e.clientX, lt: e.timeStamp, t: e.timeStamp, moved: false, part: partAt(e.clientX, e.clientY), id: e.pointerId, vel: 0};
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    clearTimeout(pressTimer); if (pd.part) pressTimer = setTimeout(() => { if (pd && !pd.moved) { pd.long = true; inflateStart(); } }, 560);
  });
  canvas.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect(); look.x = clamp((e.clientX - r.left) / r.width * 2 - 1, -1, 1); look.y = clamp(-((e.clientY - r.top) / r.height * 2 - 1), -1, 1);
    if (!pd || e.pointerId !== pd.id) return;
    const dx = e.clientX - pd.x, dy = e.clientY - pd.y;
    if (!pd.moved && Math.abs(dx) + Math.abs(dy) > 7) { pd.moved = true; dragging = true; clearTimeout(pressTimer); inflateEnd(); spinTween = null; canvas.classList.add('grabbing'); if (Math.abs(rotV) < 1.2) turnsFrom = rot; }
    if (pd.moved) { const t = e.timeStamp, ddx = e.clientX - pd.lx, dt = Math.max(4, t - pd.lt); rot += ddx * spinK; dbg.spun += Math.abs(ddx * spinK); pd.vel = pd.vel * 0.6 + (ddx * spinK) / (dt / 1000) * 0.4; pd.lx = e.clientX; pd.lt = t; tiltT = clamp(dy * 0.004, -0.35, 0.35); lastTouch = now; }
  });
  function release(e) {
    if (!pd || (e && e.pointerId !== pd.id)) return; clearTimeout(pressTimer); const p = pd; pd = null; canvas.classList.remove('grabbing');
    if (p.long) { inflateEnd(); dragging = false; return; }
    if (p.moved) { dragging = false; tiltT = 0; rotV = (e ? e.timeStamp : performance.now()) - p.lt < 110 ? clamp(p.vel, -40, 40) : 0; if (Math.abs(rotV) > 13) dizzyArmed = true; if (Math.abs(rotV) > 6) sfx('whoosh'); return; }
    if (e && e.type === 'pointercancel') return;
    const part = p.part; if (!part) return;
    if (now - lastTapAt < 0.34 && (part === 'face' || part === 'head') && (lastTapPart === 'face' || lastTapPart === 'head') && now > shadesUntil) { lastTapAt = -9; shadesOn(); return; }
    lastTapAt = now; lastTapPart = part; poke(part);
  }
  canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
  addEventListener('pointermove', e => { if (pd) return; const r = canvas.getBoundingClientRect(); if (!r.width) return; look.x = clamp((e.clientX - (r.left + r.width / 2)) / 320, -1, 1); look.y = clamp(-(e.clientY - (r.top + r.height * 0.4)) / 320, -1, 1); }, {passive: true});
  canvas.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); rotV += (e.key === 'ArrowRight' ? 1 : -1) * 5; turnsFrom = dragging ? turnsFrom : rot; lastTouch = now; }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); poke(pick(['belly', 'head', 'acc', 'feet', 'face'])); }
  });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission !== 'function') addEventListener('deviceorientation', e => { if (e.gamma != null) tiltDev = clamp(e.gamma / 90, -0.5, 0.5) * 0.5; }, {passive: true});

  /* ---------- per-frame ---------- */
  function fidget() {
    const f = pick(['look', 'scratch', 'bounce', 'acc', 'stretch']); note('fidget:' + f);
    if (f === 'look') { gaze(-0.9, 0.2, 0.7); at(750, () => gaze(0.9, 0.2, 0.7)); }
    else if (f === 'scratch') { cur.s.aR.t = 2.5; at(200, () => { cur.s.aR.v += 5; }); at(450, () => { cur.s.aR.v -= 5; }); at(900, () => { cur.s.aR.t = 0; }); say('hmm', 0.9); }
    else if (f === 'bounce') { hop(2.2); at(380, () => hop(2.2)); }
    else if (f === 'acc') { cur.s.accR.v += 5; cur.s.ant.v += 7; gaze(0, 1, 0.6); }
    else { cur.s.sq.v += 2.2; cur.s.aL.t = 2.6; cur.s.aR.t = 2.6; say('oh', 0.8); cur.s.eye.t = 0.5; at(850, () => { cur.s.aL.t = 0; cur.s.aR.t = 0; cur.s.eye.t = 1; }); }
  }
  function wave() { note('wave'); lastWave = now; cur.s.aR.t = 2.5; happy(1.4); say('laugh', 1.2); [150, 400, 650, 900].forEach((d, i) => at(d, () => { cur.s.aR.v += (i % 2 ? -1 : 1) * 7; })); at(1250, () => { cur.s.aR.t = 0; }); busy(1.6); }

  function update(dt) {
    const B = cur, s = B.s;
    for (let i = timeline.length - 1; i >= 0; i--) { const ev = timeline[i]; if (ev.run) { if (ev.run()) timeline.splice(i, 1); } else if (now >= ev.t) { timeline.splice(i, 1); try { ev.fn(); } catch (e) {} } }
    // spin with inertia, then drift back to face the learner
    if (spinTween) { const k = clamp((now - spinTween.t0) / spinTween.d, 0, 1), e = 1 - Math.pow(1 - k, 3); rot = spinTween.from + spinTween.by * e; if (k >= 1) spinTween = null; }
    else if (!dragging) {
      rot += rotV * dt; dbg.spun += Math.abs(rotV * dt); rotV *= Math.exp(-1.9 * dt);
      const turns = Math.abs(rot - turnsFrom) / (Math.PI * 2); dbg.turns = Math.max(dbg.turns, turns);
      if (turns >= 3 && now > heliUntil && now > heliBlock && Math.abs(rotV) > 2 && !reduced) { turnsFrom = rot; dizzyArmed = false; helicopter(); }
      if (Math.abs(rotV) < 1.2) {
        if (dizzyArmed && now > heliUntil) { dizzyArmed = false; dizzyUntil = now + 1.9; note('dizzy'); say('hmm', 1.9); busy(2.2); sfx('bloop'); }
        if (now - lastTouch > 1.1 || Math.abs(rotV) < 0.2) { const home = Math.round(rot / (Math.PI * 2)) * Math.PI * 2; rot += (home - rot) * Math.min(1, dt * 3.2); turnsFrom = rot; }
      }
    } else { const turns = Math.abs(rot - turnsFrom) / (Math.PI * 2); dbg.turns = Math.max(dbg.turns, turns); }
    // hop with gravity; landing squashes
    if (hopY > 0 || hopV > 0) { hopV -= 17 * dt; hopY += hopV * dt; if (hopY <= 0) { if (hopV < -1.2) { s.sq.v -= Math.min(6, -hopV * 0.9) * AMP; s.ant.v += 6; if (hopV < -3) buzz(8); } hopY = 0; hopV = 0; } }
    liftY += (liftT - liftY) * Math.min(1, dt * 4);
    const idle = now > busyUntil && !listening && !speaking && !dragging && !switching;
    if (idle && now - lastTouch > 20 && now - lastWave > 40 && !reduced) wave();
    else if (idle && now - lastFidget > nextFidget && !reduced) { lastFidget = now; nextFidget = rand(6, 10); fidget(); }
    if (now > nextBlink && now > happyUntil && now > dizzyUntil) { s.eye.x = 0.06; nextBlink = now + rand(1.8, 4.6); }
    const dizzy = now < dizzyUntil, heli = now < heliUntil;
    jig = Math.max(0, jig - dt * 1.5); ripple = Math.max(0, ripple - dt * 1.4);
    Object.values(s).forEach(sp => sp.step(dt));
    const breath = reduced ? 0 : Math.sin(now * 1.9) * 0.012, sway = reduced ? 0 : Math.sin(now * 0.7) * 0.022;
    const inf = s.inflate.x, sq = clamp(s.sq.x, -0.45, 0.5) + (hopV > 0 ? Math.min(0.14, hopV * 0.025) : 0);
    const jx = Math.sin(now * 38) * 0.06 * jig * AMP, rp = Math.sin(now * 26) * 0.09 * ripple * AMP;
    B.root.position.y = hopY + liftY + switchY;
    B.spin.rotation.y = rot;
    B.tilt.rotation.x = tiltT + s.leanX.x; tiltT *= dragging ? 1 : Math.exp(-8 * dt);
    B.tilt.rotation.z = s.leanZ.x + sway + tiltDev + (dizzy ? Math.sin(now * 5) * 0.16 * AMP : 0) + (dance ? Math.sin(now * 9) * 0.1 : 0);
    B.sq.scale.set(inf * (1 - sq * 0.55 + jx + rp), inf * (1 + sq + breath - rp * 0.5), inf * (1 - sq * 0.55 - jx + rp * 1.4));
    if (switching && switchY < 0) B.sq.scale.multiplyScalar(clamp(1 + switchY / 9, 0.6, 1));
    const armSway = reduced ? 0 : Math.sin(now * 1.3) * 0.05;
    B.arms[0].rotation.z = -(0.32 + s.aL.x + armSway) - (heli ? 0.2 * Math.sin(now * 30) : 0); B.arms[1].rotation.z = 0.32 + s.aR.x + armSway;
    B.arms[0].rotation.x = s.aLf.x; B.arms[1].rotation.x = s.aRf.x;
    const tp = tap ? Math.sin(now * 22) * 0.5 * tap : 0;
    B.legs[0].rotation.x = Math.max(0, tp) * -0.9; B.legs[1].rotation.x = Math.max(0, -tp) * -0.9 + (hopY > 0.05 ? -0.25 : 0); B.legs[0].rotation.z = hopY > 0.05 ? -0.18 : 0; B.legs[1].rotation.z = hopY > 0.05 ? 0.18 : 0;
    // accessory, antenna, propeller
    B.acc.position.y = B.cfg.H + Math.max(0, s.accY.x); B.acc.rotation.z = s.accR.x * (0.1 + Math.max(0, s.accY.x) * 0.5);
    s.ant.v += (-rotV * 0.6 + hopV * 0.25) * dt * 8; B.ant.rotation.z = clamp(s.ant.x * 0.1, -0.9, 0.9); B.ant.rotation.x = clamp(s.antX.x * 0.1, -0.6, 0.6);
    if (B.prop) B.prop.rotation.y += dt * (heli ? 44 : (speaking ? 9 : 1.2) + Math.abs(rotV) * 1.5 + Math.abs(hopV) * 2);
    if (B.charm) B.charm.position.y = B.cfg.H * 0.3 + Math.sin(now * 3 + rot) * 0.012 - Math.abs(s.sq.x) * 0.1;
    if (B.id === 'mila' && heli) B.ant.rotation.y += dt * 40; else if (B.id === 'mila') B.ant.rotation.y *= 0.9;
    // eyes
    const isHappy = now < happyUntil && !dizzy;
    const lk = lookHold && now < lookHoldUntil ? lookHold : (listening ? {x: 0, y: 0.1} : look); s.lookX.t = lk.x; s.lookY.t = lk.y;
    B.eyes.forEach((e, i) => {
      e.open.visible = !isHappy && !dizzy; e.arc.visible = isHappy; e.spiral.visible = dizzy;
      e.open.scale.y = clamp(s.eye.x, 0.05, 1.45); e.open.scale.x = 1 + (s.eye.x - 1) * 0.35;
      e.pupil.position.x = s.lookX.x * 0.055 + (i ? -1 : 1) * s.cross.x * 0.06; e.pupil.position.y = s.lookY.x * 0.06 - s.cross.x * 0.02; e.shine.position.x = 0.03 + e.pupil.position.x * 0.7; e.shine.position.y = 0.04 + e.pupil.position.y * 0.7;
      if (dizzy) e.spiral.rotation.z -= dt * 9 * (i ? 1 : -1);
    });
    B.brows.forEach(b => { b.position.y = b.userData.y0 + s.brow.x * 0.07 + (s.eye.x - 1) * 0.08; b.rotation.z = -b.userData.s * (s.browT.x * 0.45 - (isHappy ? 0.12 : 0)); });
    B.stars.visible = dizzy; if (dizzy) B.stars.children.forEach(st => { st.userData.a += dt * 5; st.position.set(Math.cos(st.userData.a) * 0.42, Math.sin(now * 6 + st.userData.a) * 0.04, Math.sin(st.userData.a) * 0.42); st.rotation.y += dt * 6; });
    if (B.shades.visible) B.shades.position.y = Math.max(0, s.shades.x);
    // mouth
    const mt = mouthTarget(), m = B.mouth, sp = Math.min(1, dt * (speaking || queue.length ? 34 : 26)); let ch = 0;
    for (const k in m) { const d = (mt[k] - m[k]) * sp; m[k] += d; ch += Math.abs(d); }
    if (ch > 0.002 || !B.mouthDrawn) { drawMouth(B.mctx, m); B.mtex.needsUpdate = true; B.mouthDrawn = true; }
    dbg.mouth = {open: +m.open.toFixed(3), wide: +m.wide.toFixed(3), round: +m.round.toFixed(3)};
    camLift += ((hopY + liftY) * 0.45 - camLift) * Math.min(1, dt * 6); camera.position.y = 1.42 + camLift; camera.lookAt(0, 1.16 + camLift, 0);
    // shadow, particles
    const h = hopY + liftY + Math.max(0, switchY); shadow.scale.setScalar(clamp(1 - h * 0.28, 0.25, 1) * (0.9 + B.cfg.Rb * 0.5) * (switchY < -0.2 ? 0.001 : 1)); shadow.material.opacity = 0.28 * clamp(1 - h * 0.25, 0.2, 1);
    let live = 0; cp.forEach((c, i) => { if (c.life > 0) { c.life -= dt; c.v.y -= 9 * dt; c.v.multiplyScalar(1 - 0.8 * dt); c.p.addScaledVector(c.v, dt); dummy.position.copy(c.p); dummy.rotation.set(c.r.x + now * 7, c.r.y + now * 5, c.r.z); dummy.scale.setScalar(c.life > 0 ? Math.min(1, c.life * 3) : 0); live++; } else dummy.scale.setScalar(0); dummy.updateMatrix(); conf.setMatrixAt(i, dummy.matrix); });
    if (live || conf.count) { conf.instanceMatrix.needsUpdate = true; if (!live) conf.count = 0; }
    puffs.forEach(p => { if (p.life > 0) { p.life -= dt; p.m.position.addScaledVector(p.v, dt); p.v.multiplyScalar(1 - 3 * dt); const k = Math.max(0, p.life / 0.45); p.m.scale.setScalar(0.6 + (1 - k) * 1.3); p.m.material.opacity = 0.85 * k; if (p.life <= 0) p.m.visible = false; } });
  }

  /* ---------- sizing, visibility, loop ---------- */
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; spinK = Math.PI * 2.5 / w;
    const need = 3.0, d = need / (2 * Math.tan(THREE.MathUtils.degToRad(15))) * Math.max(1, 0.92 / camera.aspect);
    camDist = d; camera.position.set(0, 1.42, d); camera.lookAt(0, 1.16, 0); camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage); resize();
  let onScreen = true; new IntersectionObserver(es => { onScreen = es[0].isIntersecting; }, {threshold: 0.02}).observe(stage);
  let last = performance.now(), frames = 0, fpsAt = last;
  function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    if (!onScreen || document.hidden || wrap.classList.contains('is-hidden') || !cur) return;
    now += dt; update(dt); renderer.render(scene, camera);
    frames++; if (t - fpsAt >= 1000) { dbg.fps = Math.round(frames * 1000 / (t - fpsAt)); frames = 0; fpsAt = t; dbg.info = {calls: renderer.info.render.calls, triangles: renderer.info.render.triangles}; }
  }

  // sound toggle
  const mute = document.getElementById('buddyMute');
  const paintMute = () => { if (mute) { mute.setAttribute('aria-pressed', String(!muted)); mute.textContent = muted ? 'Sound off' : 'Sound on'; } };
  if (mute) { paintMute(); mute.addEventListener('click', () => { muted = !muted; try { localStorage.setItem('w2s.buddyMute', muted ? '1' : '0'); } catch (e) {} unlock(); paintMute(); if (!muted) setTimeout(() => sfx('pop'), 60); }); }

  show(wrap.dataset.buddy || window.W2S_BUDDY || 'mila', true);
  wrap.classList.add('is-3d'); dbg.ready = true; lastTouch = 0; now = 0.001;
  // a little entrance so the first sight is alive
  if (!reduced) { switchY = 0; hopY = 2.2; hopV = 0; cur.s.aL.x = 2; cur.s.aR.x = 2; at(420, () => { puff(); }); happyUntil = 0.9; mouthHold = 'laugh'; mouthHoldUntil = 0.9; }
  requestAnimationFrame(frame);
}
