// Builds the two Language Buddies (Ruby and Max) as rigged GLB files.
// Usage: node buddy-gen/gen.cjs [ruby|max]   ->  buddy-gen/out/<name>.glb
// The characters are sculpted from smooth-blended distance fields, meshed, coloured per vertex, rigged and written with morph targets.
'use strict';
const S = require('./sdf.cjs');
const {sstep, norm, add, sub, mul, lerp3, sphere, ellipsoid, capsule, box, torus, cyl, plane, U, SUB, INT, mirrorX, flipX, arc, surfZ, hex, mix, mesh, uvSphere, merge, moved, Glb, smax} = S;
const path = require('path');

const NECK = 0.035;                     // lifts the head so a little neck shows above the collar
const HS = 1.13;                        // head scale about the neck
const YM = 1.515;                       // mouth line
const EYE = {x: 0.13, y: 1.693, r: 0.094};
const SH = [0.30, 1.25, -0.01], EL = [0.415, 0.99, 0.0], WR = [0.475, 0.75, 0.035];   // character's left arm (+x), A-pose
const DF = norm(sub(WR, EL));           // direction down the forearm
const HAND = add(WR, mul(DF, 0.07));
const JOINTS = ['Hips', 'Spine', 'LeftArm', 'LeftForeArm', 'RightArm', 'RightForeArm', 'LeftUpLeg', 'RightUpLeg'];
const MORPHS = ['jawOpen', 'mouthPucker', 'mouthWide', 'mouthSmile', 'mouthFrown'];

function fields(x, y, z) {              // how the lower face moves for each mouth shape
  const ax = Math.abs(x), sx = x < 0 ? -1 : 1, front = sstep(0.05, 0.2, z);
  const wj = front * sstep(-0.002, 0.006, YM - y) * sstep(1.30, 1.39, y) * (1 - 0.5 * sstep(0.15, 0.30, ax));
  const dy = y - YM, m = Math.exp(-(x * x) / (2 * 0.085 * 0.085) - (dy * dy) / (2 * 0.05 * 0.05)) * front;
  const m2 = Math.exp(-(x * x) / (2 * 0.12 * 0.12) - (dy * dy) / (2 * 0.05 * 0.05)) * front;
  const cn = Math.exp(-((ax - 0.085) * (ax - 0.085)) / (2 * 0.04 * 0.04) - (dy * dy) / (2 * 0.04 * 0.04)) * front;
  const ck = Math.exp(-((ax - 0.17) * (ax - 0.17)) / (2 * 0.07 * 0.07) - ((y - 1.58) * (y - 1.58)) / (2 * 0.06 * 0.06)) * front;
  return [[0, -0.072 * wj, -0.012 * wj], [-x * 0.5 * m, 0, 0.024 * m], [x * 0.3 * m2, 0, -0.05 * ax * m2], [sx * 0.02 * cn, 0.036 * cn + 0.012 * ck, -0.006 * cn + 0.008 * ck], [0, -0.028 * cn, 0]];
}
function morphs(m) { const out = MORPHS.map(name => ({name, D: new Float32Array(m.n * 3)})); for (let i = 0; i < m.n; i++) { const f = fields(m.P[i * 3], m.P[i * 3 + 1], m.P[i * 3 + 2]); for (let t = 0; t < MORPHS.length; t++) { out[t].D[i * 3] = f[t][0]; out[t].D[i * 3 + 1] = f[t][1]; out[t].D[i * 3 + 2] = f[t][2]; } } return out; }

function head(c) {
  const cr = ellipsoid([0, 1.74, 0], [0.335, 0.33, 0.325]), jaw = ellipsoid([0, 1.61, 0.035], [c.jawW, 0.232, 0.262]);
  const chin = sphere([0, 1.445, 0.17], c.chin), cheek = mirrorX(sphere([0.16, 1.565, 0.17], 0.10)), neck = capsule([0, 1.22, -0.02], [0, 1.50, -0.01], 0.10, 0.098);
  let f = U(0.09, cr, jaw); f = U(0.06, f, cheek, chin); f = U(0.035, f, neck);
  const brow = mirrorX(ellipsoid([0.13, 1.81, 0.262], [0.10, 0.028, 0.04])); f = U(0.05, f, brow);
  const bare = f;
  const zN = surfZ(bare, 0, 1.62);
  const nose = U(0.022, capsule([0, 1.705, zN - 0.02], [0, 1.63, zN + 0.012], 0.026, 0.034), sphere([0, 1.612, zN + 0.022], c.nose), mirrorX(sphere([c.nose * 0.72, 1.598, zN + 0.002], c.nose * 0.62)));
  f = U(0.03, f, nose);
  const ear = mirrorX(ellipsoid([0.338, 1.655, -0.012], [0.04, 0.088, 0.062])); f = U(0.022, f, ear);
  f = SUB(f, mirrorX(ellipsoid([0.372, 1.655, 0.012], [0.018, 0.05, 0.03])), 0.012);
  const ez = surfZ(bare, EYE.x, EYE.y) - 0.066, eyeC = [EYE.x, EYE.y, ez];
  const socket = mirrorX(sphere(eyeC, EYE.r + 0.003)); f = SUB(f, socket, 0.007);
  const zm = surfZ(bare, 0, YM), carve = ellipsoid([0, YM, zm - 0.03], [0.088, 0.014, 0.085]);
  f = SUB(f, carve, 0.008);
  const skin = hex(c.skin), blush = hex(c.blush), dark = hex(c.mouthIn);
  const color = (x, y, z) => { if (carve(x, y, z) < 0.004) return dark; let col = mix(skin, mix(skin, blush, 0.5), 0.16 * (1 - sstep(1.36, 1.75, y)));
    const ax = Math.abs(x), b = Math.exp(-((ax - 0.185) ** 2) / (2 * 0.055 ** 2) - ((y - 1.585) ** 2) / (2 * 0.045 ** 2)) * sstep(0.05, 0.2, z); col = mix(col, blush, 0.42 * b);
    const nt = Math.exp(-((x) ** 2 + (y - 1.61) ** 2) / (2 * 0.035 ** 2)) * sstep(0.2, 0.33, z); col = mix(col, blush, 0.3 * nt);
    if (ax > 0.33) col = mix(col, blush, 0.3); const so = socket(x, y, z); if (so < 0.025 && y > EYE.y) col = mix(col, mul(col, 0.9), (1 - sstep(0.0, 0.025, so)) * sstep(EYE.y, EYE.y + 0.03, y)); return col; };
  return {f, bare, color, eyeC, zm, zN};
}

function eyeParts(g, c, H, headNode) {
  const iris = hex(c.iris), irisD = mul(iris, 0.55), white = [250, 250, 248], pup = [14, 12, 16], skin = hex(c.skin), lash = hex(c.lash);
  const ball = uvSphere(EYE.r, 40, 26, 'z', 0, Math.PI, th => th < 0.27 ? pup : th < 0.30 ? mix(pup, iris, 0.5) : th < 0.64 ? mix(iris, irisD, sstep(0.4, 0.64, th) * 0.75) : th < 0.69 ? irisD : mix(white, [228, 222, 226], sstep(0.9, 1.7, th)));
  const lidUp = uvSphere(EYE.r + 0.0055, 28, 9, 'y', 0, Math.PI / 2, () => skin), lidLo = uvSphere(EYE.r + 0.0032, 28, 9, '-y', 0, Math.PI / 2, () => hex(c.skin));
  // lash line along the front rim of the upper lid (the rim circle lies in the lid's x-z plane)
  const R = EYE.r + 0.0055, lf = [], n = 9; for (let i = 0; i < n; i++) { const a0 = (-70 + 140 * i / n) * Math.PI / 180, a1 = (-70 + 140 * (i + 1) / n) * Math.PI / 180; lf.push(capsule([Math.sin(a0) * R, -0.001, Math.cos(a0) * R], [Math.sin(a1) * R, -0.001, Math.cos(a1) * R], c.lashR)); }
  const mEye = g.material('Eye', 0.08), mLid = g.material('Lid', 0.55, {doubleSided: true}), mHair = g.material('Hair', 0.5);
  for (const [side, sx] of [['L', 1], ['R', -1]]) { const pos = [H.eyeC[0] * sx, H.eyeC[1], H.eyeC[2]];
    const e = g.node('Eye' + side, headNode, pos); g.mesh('Eye' + side, moved(ball, pos), e, mEye);
    const lu = g.node('Lid' + side, headNode, pos); g.mesh('Lid' + side, moved(lidUp, pos), lu, mLid);
    let lashF = U(0, ...lf); if (c.wing) lashF = U(0.004, lashF, capsule([Math.sin(1.2) * R * sx, 0, Math.cos(1.2) * R], [Math.sin(1.45) * (R + 0.02) * sx, 0.012, Math.cos(1.45) * (R + 0.006)], c.lashR, 0.002));
    const lm = mesh(lashF, [-0.12, -0.03, -0.02], [0.12, 0.04, 0.11], 0.004, () => lash); g.mesh('Lash' + side, moved(lm, pos), lu, mHair, {own: true});
    const ll = g.node('LowLid' + side, headNode, pos); g.mesh('LowLid' + side, moved(lidLo, pos), ll, mLid);
    const sp = add(pos, [-0.032, 0.036, EYE.r - 0.012]); const sh = uvSphere(0.017, 10, 8, 'z', 0, Math.PI, () => [255, 255, 255]); g.mesh('Shine' + side, moved(sh, sp), headNode, g.material('Shine', 0.1, {emissiveFactor: [1, 1, 1]}), {own: true}); }
}

function mouthParts(g, c, H, headNode) {
  const on = (x, y, off) => [x, y, surfZ(H.bare, x, y) + off], lip = hex(c.lip), lipD = mul(lip, 0.86);
  const up = mirrorX(U(0.004, capsule(on(0.086, YM + 0.001, -0.008), on(0.036, YM + 0.0105, -0.003), 0.007, 0.0115), capsule(on(0.036, YM + 0.0105, -0.003), on(0, YM + 0.008, -0.001), 0.0115, 0.0105)));
  const lo = mirrorX(U(0.004, capsule(on(0.083, YM - 0.002, -0.008), on(0.034, YM - 0.0165, -0.003), 0.007, 0.014), capsule(on(0.034, YM - 0.0165, -0.003), on(0, YM - 0.0185, -0.001), 0.014, 0.0155)));
  const teeth = box([0, YM + 0.012, H.zm - 0.04], [0.05, 0.012, 0.012], 0.007), tongue = ellipsoid([0, YM - 0.022, H.zm - 0.055], [0.05, 0.013, 0.045]);
  const f = U(0, U(0.003, up, lo), teeth, tongue);
  const col = (x, y, z) => { const a = Math.min(up(x, y, z), lo(x, y, z)), b = teeth(x, y, z), t = tongue(x, y, z); if (b < a && b < t) return [250, 248, 244]; if (t < a) return hex(c.tongue); return up(x, y, z) < lo(x, y, z) ? lipD : lip; };
  const m = mesh(f, [-0.115, YM - 0.075, H.zm - 0.12], [0.115, YM + 0.05, H.zm + 0.04], 0.0052, col);
  g.mesh('Mouth', m, headNode, g.material('Lip', 0.42), {own: true, morphs: morphs(m)}); return m.n;
}

// ---------------- hair ----------------
function rubyHair(H) {
  const on = (x, y, off) => [x, y, (surfZ(H.bare, x, y) || 0) + off];
  let h = U(0.05, ellipsoid([0, 1.76, -0.06], [0.385, 0.372, 0.352]), ellipsoid([0, 1.955, 0.0], [0.32, 0.19, 0.325]));
  h = SUB(h, ellipsoid([0, 1.565, 0.37], [0.30, 0.355, 0.355]), 0.03);
  h = (f => (x, y, z) => smax(f(x, y, z), 1.50 - y, 0.04))(h);
  // a side-swept fringe from a parting on the character's right, in two layered sweeps
  const fr = U(0.018, capsule(on(-0.12, 2.045, 0.03), on(0.06, 2.0, 0.055), 0.085, 0.082), capsule(on(0.06, 2.0, 0.055), on(0.225, 1.905, 0.045), 0.082, 0.06), capsule(on(0.225, 1.905, 0.045), on(0.315, 1.765, 0.03), 0.06, 0.028));
  const fr2 = U(0.018, capsule(on(-0.14, 2.035, 0.03), on(-0.27, 1.925, 0.04), 0.072, 0.056), capsule(on(-0.27, 1.925, 0.04), on(-0.33, 1.78, 0.03), 0.056, 0.028));
  const back = mirrorX(ellipsoid([0.26, 1.67, -0.15], [0.135, 0.20, 0.17]));
  // layered locks flowing from the crown to the nape, kept as separate forms by a tight blend
  const locks = []; for (let i = -3; i <= 3; i++) { const a = i * 0.36; locks.push(capsule([Math.sin(a) * 0.2, 2.06 - Math.abs(i) * 0.02, -0.12 - Math.cos(a) * 0.14], [Math.sin(a) * 0.36, 1.62, -0.06 - Math.cos(a) * 0.33], 0.11, 0.085)); }
  const f = U(0.022, h, fr, fr2, back, U(0.012, ...locks));
  const pony = U(0.03, sphere([0, 1.955, -0.37], 0.085), capsule([0, 1.95, -0.42], [0, 1.78, -0.575], 0.125, 0.115), capsule([0, 1.78, -0.575], [0.015, 1.52, -0.54], 0.115, 0.05));
  const tie = torus([0, 1.955, -0.365], [0, 0.3, -1], 0.07, 0.024);
  return {f, pony, tie, pivot: [0, 1.96, -0.31]};
}
function maxHair(H) {
  let fade = ellipsoid([0, 1.745, -0.012], [0.345, 0.34, 0.336]);
  const curls = []; const N = 54, ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) { const t = (i + 0.5) / N, th = Math.acos(1 - t * 0.66), ph = i * ga, d = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)]; const r = 0.05 + 0.018 * ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1; curls.push(sphere([d[0] * 0.33, 1.755 + d[1] * 0.335, -0.015 + d[2] * 0.325], r)); }
  let f = U(0.02, fade, U(0.024, ...curls));
  f = SUB(f, ellipsoid([0, 1.555, 0.34], [0.315, 0.385, 0.345]), 0.02);
  f = (g2 => (x, y, z) => smax(g2(x, y, z), 1.565 - y - 0.05 * sstep(-0.1, 0.3, z), 0.03))(f);
  f = SUB(f, mirrorX(sphere([0.36, 1.635, 0.0], 0.095)), 0.02);
  return {f, fadeTop: 1.86};
}

// ---------------- body ----------------
function torso() { return U(0.08, ellipsoid([0, 0.90, 0], [0.305, 0.36, 0.245]), ellipsoid([0, 1.13, -0.005], [0.30, 0.235, 0.215]), capsule([-0.265, 1.245, -0.01], [0.265, 1.245, -0.01], 0.10)); }
const upperArm = capsule(SH, EL, 0.105, 0.098), foreArm = capsule(EL, WR, 0.098, 0.088);
function jacket(c) {
  const T = torso(), arm = U(0.03, upperArm, foreArm);
  let f = U(0.05, T, mirrorX(arm));
  f = (g2 => (x, y, z) => smax(g2(x, y, z), 0.585 - y, 0.012))(f);
  const base = f;   // the jacket before its trims: a vertex belongs to a trim when the trim is the nearer surface, so colour edges sit in the creases
  const hem = (g2 => (x, y, z) => smax(g2(x, y, z), 0.585 - y, 0.01))(ellipsoid([0, 0.625, 0], [0.33, 0.055, 0.265])); f = U(0.012, f, hem);
  const cuff = mirrorX(torus(add(WR, mul(DF, -0.03)), DF, 0.082, 0.026)); f = U(0.012, f, cuff);
  const collar = c.hood ? torus([0, 1.345, -0.012], [0, 1, 0.12], 0.128, 0.04) : torus([0, 1.34, -0.012], [0, 1, 0.1], 0.126, 0.03); f = U(0.018, f, collar);
  let hood = null; if (c.hood) { hood = ellipsoid([0, 1.30, -0.215], [0.23, 0.15, 0.12]); f = U(0.04, f, hood); }
  // the opening at the neck: a shallow V where the layer underneath shows
  const zc = surfZ(T, 0, 1.2), vee = U(0.02, capsule([0, 1.33, zc + 0.03], [0, 1.33 - c.vee, zc + 0.045], 0.075, 0.012));
  f = SUB(f, vee, 0.01);
  const pocket = mirrorX(box([0.16, 0.80, surfZ(T, 0.16, 0.80) + 0.004], [0.07, 0.012, 0.012], 0.008)); if (c.pockets) f = U(0.01, f, pocket);
  const btn = []; if (c.buttons) for (let i = 0; i < 4; i++) { const y = 1.02 - i * 0.115; btn.push(ellipsoid([0, y, surfZ(T, 0, y) + 0.002], [0.021, 0.021, 0.012])); }
  const letter = []; if (c.letter) { const z = y => surfZ(T, -0.14, y) + 0.004, P = (x, y) => [x, y, z(y)]; letter.push(capsule(P(-0.185, 1.03), P(-0.185, 1.13), 0.014), capsule(P(-0.185, 1.13), P(-0.145, 1.075), 0.014), capsule(P(-0.145, 1.075), P(-0.105, 1.13), 0.014), capsule(P(-0.105, 1.13), P(-0.105, 1.03), 0.014)); }
  const body = hex(c.body), sleeve = hex(c.sleeve), trim = hex(c.trim), under = hex(c.under), zip = hex(c.zip), stripe = hex(c.stripe);
  const color = (x, y, z) => { const ax = Math.abs(x);
    if (vee(x, y, z) < 0.012 && z > 0.05) return mix(under, mul(under, 0.9), sstep(1.2, 1.33, y));
    if (collar(x, y, z) < base(x, y, z) + 0.003 && y > 1.2) return trim;
    if (cuff(ax, y, z) < base(x, y, z) + 0.003) return trim;
    if (hem(x, y, z) < base(x, y, z) + 0.003) return trim;
    if (c.zipLine && ax < 0.013 && z > 0.1 && y < 1.33 - c.vee + 0.03) return zip;
    if (c.pockets && pocket(x, y, z) < 0.006) return trim;
    if (hood && hood(x, y, z) < 0.02 && z < -0.12) return mul(body, 0.9);
    const isArm = sstep(-0.004, 0.004, T(ax, y, z) - arm(ax, y, z) - 0.012); let col = mix(body, sleeve, isArm); return mix(mul(col, 0.9), col, sstep(0.6, 1.15, y)); };
  const badge = btn.length || letter.length ? {f: U(0.003, ...btn, ...letter), color: (x, y, z) => { for (const b of btn) if (b(x, y, z) < 0.004) return stripe; return sleeve; }} : null;
  return {f, color, T, arm, badge};
}
function skinJacket(m, J) { const Jn = new Uint8Array(m.n * 4), W = new Uint8Array(m.n * 4);
  for (let i = 0; i < m.n; i++) { const x = m.P[i * 3], y = m.P[i * 3 + 1], z = m.P[i * 3 + 2], ax = Math.abs(x), left = x >= 0;
    const wa = sstep(-0.05, 0.05, J.T(ax, y, z) - J.arm(ax, y, z)), wf = sstep(-0.035, 0.035, upperArm(ax, y, z) - foreArm(ax, y, z));
    let w = [1 - wa, wa * (1 - wf), wa * wf].map(v => Math.round(v * 255)); w[0] += 255 - (w[0] + w[1] + w[2]);
    Jn.set([1, left ? 2 : 4, left ? 3 : 5, 0], i * 4); W.set([w[0], w[1], w[2], 0], i * 4); }
  return {J: Jn, W}; }
function trousers(c) {
  const leg = capsule([0.14, 0.62, 0], [0.145, 0.175, 0.0], 0.125, 0.108);
  let f = U(0.05, ellipsoid([0, 0.63, 0], [0.275, 0.15, 0.215]), mirrorX(leg));
  const cuff = mirrorX(torus([0.145, 0.185, 0], [0, 1, 0], 0.103, 0.024)); f = U(0.012, f, cuff);
  const a = hex(c.legs), b = hex(c.legCuff); return {f, color: (x, y, z) => cuff(x, y, z) < 0.01 ? b : mix(mul(a, 0.88), a, sstep(0.15, 0.6, y))};
}
function skinLegs(m) { const Jn = new Uint8Array(m.n * 4), W = new Uint8Array(m.n * 4); for (let i = 0; i < m.n; i++) { const x = m.P[i * 3], y = m.P[i * 3 + 1]; const wl = Math.round((1 - sstep(0.44, 0.60, y)) * 255); Jn.set([0, x >= 0 ? 6 : 7, 0, 0], i * 4); W.set([255 - wl, wl, 0, 0], i * 4); } return {J: Jn, W}; }
function shoe(c) {   // left foot (+x)
  const sole = box([0.147, 0.032, 0.045], [0.088, 0.032, 0.158], 0.03), upper = U(0.03, ellipsoid([0.147, 0.095, 0.02], [0.092, 0.085, 0.13]), ellipsoid([0.147, 0.075, 0.125], [0.084, 0.06, 0.085]));
  const col = c.high ? capsule([0.147, 0.13, -0.01], [0.147, 0.20, -0.012], 0.105, 0.108) : null; let f = U(0.02, sole, upper); if (col) f = U(0.02, f, col);
  const tongue = ellipsoid([0.147, 0.145, 0.075], [0.05, 0.035, 0.06]); f = U(0.015, f, tongue);
  const u = hex(c.shoe), s = hex(c.sole), acc = hex(c.shoeAcc);
  return {f, color: (x, y, z) => y < 0.05 ? s : (z > 0.15 && y < 0.1 ? mix(u, s, c.toeCap ? 1 : 0) : (tongue(x, y, z) < 0.008 && y > 0.1 ? acc : (z < -0.09 && y > 0.07 ? acc : u)))};
}
function openHand(c) {   // on the +x side; mirrored for the character's right hand
  const X = norm([DF[1], -DF[0], 0]);  // across the palm, away from the body
  const Z = [0, 0, 1]; const P = (d, x, z) => add(add(add(HAND, mul(DF, d)), mul(X, x)), mul(Z, z));
  const palm = ellipsoid(P(0.0, 0, 0), [0.048, 0.07, 0.06]); const fingers = [];
  for (let i = 0; i < 4; i++) { const zo = (i - 1.5) * 0.029 - 0.004; fingers.push(capsule(P(0.035, 0.004, zo), P(0.105 - Math.abs(i - 1.4) * 0.012, -0.012, zo * 1.12), 0.0185, 0.0165)); }
  const thumb = U(0.008, capsule(P(-0.02, 0, 0.045), P(0.02, -0.004, 0.088), 0.022, 0.02), capsule(P(0.02, -0.004, 0.088), P(0.06, -0.012, 0.094), 0.02, 0.017));
  const wrist = capsule(add(WR, mul(DF, -0.05)), HAND, 0.07, 0.055);
  return U(0.014, U(0.022, palm, wrist), U(0.0085, ...fingers), thumb);
}
function gripHand(c, CUP, R) {   // character's left hand (+x), curled round something whose axis points forward in the A-pose
  const palm = ellipsoid(add(WR, mul(DF, 0.045)), [0.058, 0.055, 0.058]), wrist = capsule(add(WR, mul(DF, -0.05)), add(WR, mul(DF, 0.04)), 0.07, 0.058);
  const fingers = []; for (let i = 0; i < 4; i++) fingers.push(arc(CUP, R + 0.017, 0.019, 1.15, -2.2 + i * 0.05, 6, (i - 1.5) * 0.034));
  const thumb = arc(CUP, R + 0.017, 0.021, 1.75, 3.5, 4, 0.012);
  return U(0.014, U(0.03, palm, wrist), U(0.006, ...fingers), thumb);
}

function build(c, file) {
  const g = new Glb({w2s: {rig: 'w2s-1', id: c.id, name: c.name, height: 1.40 + NECK + 0.74 * HS, faceWidth: 0.7 * HS, eyeY: 1.40 + NECK + (EYE.y - 1.40) * HS, mouthY: 1.40 + NECK + (YM - 1.40) * HS, lidOpen: c.lidOpen, lidClosed: 1.25, lowLid: 1.12}});
  const root = g.node('Root', null, [0, 0, 0]), hips = g.node('Hips', root, [0, 0.62, 0]), spine = g.node('Spine', hips, [0, 0.74, 0]);
  const neck = g.node('Neck', spine, [0, 1.34, -0.01]), hd = g.node('Head', neck, [0, 1.44, -0.005]);
  g.scaleUnder(hd, p => [p[0] * HS, 1.40 + NECK + (p[1] - 1.40) * HS, p[2] * HS], HS);   // a bigger head: about a third of the height
  const la = g.node('LeftArm', spine, SH), lf = g.node('LeftForeArm', la, EL), lh = g.node('LeftHand', lf, WR);
  const M = p => [-p[0], p[1], p[2]]; const ra = g.node('RightArm', spine, M(SH)), rf = g.node('RightForeArm', ra, M(EL)), rh = g.node('RightHand', rf, M(WR));
  const ll = g.node('LeftUpLeg', hips, [0.14, 0.60, 0]), rl = g.node('RightUpLeg', hips, [-0.14, 0.60, 0]);
  g.skin(JOINTS); const stat = {};
  const mSkin = g.material('Skin', 0.55), mHair = g.material('Hair', 0.5), mCloth = g.material('Cloth', c.jacketRough), mLegs = g.material('Legs', 0.85), mShoe = g.material('Shoe', 0.6), mProp = g.material('Prop', 0.35);

  // head
  const H = head(c); let m = mesh(H.f, [-0.43, 1.2, -0.37], [0.43, 2.1, 0.43], 0.0172, H.color); stat.head = g.mesh('HeadSkin', m, hd, mSkin, {own: true, morphs: morphs(m)});
  stat.mouth = mouthParts(g, c, H, hd); eyeParts(g, c, H, hd);
  const on = (x, y, off) => [x, y, surfZ(H.bare, x, y) + off], bc = hex(c.brow);
  for (const [side, sx] of [['L', 1], ['R', -1]]) { const p = [on(0.062 * sx, 1.818 + c.browY, 0.003), on(0.13 * sx, 1.83 + c.browY, 0.004), on(0.208 * sx, 1.808 + c.browY, 0.0)];
    const bf = U(0.004, capsule(p[0], p[1], c.browR, c.browR * 1.05), capsule(p[1], p[2], c.browR * 1.05, c.browR * 0.55)); const bm = mesh(bf, [-0.25, 1.75, 0.1], [0.25, 1.92, 0.4], 0.0055, () => bc);
    const bn = g.node('Brow' + side, hd, p[1]); g.mesh('Brow' + side, bm, bn, mHair); }
  if (c.freckles) { const fs = []; [[0.055, 1.632], [0.095, 1.612], [0.135, 1.635], [0.17, 1.61], [0.11, 1.652], [0.2, 1.64], [0.02, 1.66]].forEach(([x, y], i) => { for (const sx of (x < 0.03 ? [1] : [1, -1])) { const xx = x * sx + (i % 2 ? 0.006 : -0.004) * sx; fs.push(sphere([xx, y, surfZ(H.f, xx, y) - 0.0035], 0.0072)); } });
    const fm = mesh(U(0, ...fs), [-0.25, 1.58, 0.15], [0.25, 1.69, 0.4], 0.0048, () => hex(c.freckle)); stat.freckles = g.mesh('Freckles', fm, hd, mSkin, {own: true}); }
  const hc = hex(c.hair), hl = hex(c.hairLight), skinC = hex(c.skin);
  if (c.id === 'mila') { const R = rubyHair(H); const hcol = (x, y, z, n) => mix(hc, hl, 0.55 * sstep(-0.1, 0.95, n[1]) + 0.2 * sstep(0.2, 0.34, z));
    m = mesh(R.f, [-0.47, 1.42, -0.48], [0.47, 2.2, 0.44], 0.0225, hcol); stat.hair = g.mesh('Hair', m, hd, mHair, {own: true});
    const pn = g.node('Pony', hd, R.pivot); m = mesh(R.pony, [-0.22, 1.42, -0.74], [0.22, 2.1, -0.2], 0.02, hcol); stat.pony = g.mesh('Pony', m, pn, mHair);
    m = mesh(R.tie, [-0.13, 1.83, -0.48], [0.13, 2.08, -0.26], 0.011, () => hex('#FFD93B')); g.mesh('HairTie', m, hd, mProp, {own: true}); }
  else { const X = maxHair(H); m = mesh(X.f, [-0.44, 1.5, -0.44], [0.44, 2.2, 0.44], 0.0195, (x, y, z, n) => mix(mix(hc, hl, 0.5 * sstep(0.2, 1, n[1])), skinC, 0.42 * (1 - sstep(1.60, X.fadeTop, y)))); stat.hair = g.mesh('Hair', m, hd, mHair, {own: true}); }

  // jacket (skinned to spine and arms), trousers (skinned to hips and legs)
  const J = jacket(c); m = mesh(J.f, [-0.64, 0.55, -0.42], [0.64, 1.48, 0.36], 0.02, J.color); stat.jacket = g.mesh('Jacket', m, root, mCloth, {skin: skinJacket(m, J)});
  if (J.badge) { m = mesh(J.badge.f, [-0.24, 0.6, 0.1], [0.08, 1.2, 0.32], 0.0062, J.badge.color); stat.badge = g.mesh('Badge', m, spine, mProp, {own: true}); }
  const T = trousers(c); m = mesh(T.f, [-0.34, 0.04, -0.28], [0.34, 0.82, 0.28], 0.024, T.color); stat.legs = g.mesh('Trousers', m, root, mLegs, {skin: skinLegs(m)});
  const Sh = shoe(c); m = mesh(Sh.f, [0.02, -0.02, -0.16], [0.28, 0.34, 0.24], 0.018, Sh.color); stat.shoes = 2 * g.mesh('ShoeL', m, ll, mShoe, {own: true});
  m = mesh(flipX(Sh.f), [-0.28, -0.02, -0.16], [-0.02, 0.34, 0.24], 0.018, (x, y, z) => Sh.color(-x, y, z)); g.mesh('ShoeR', m, rl, mShoe, {own: true});

  // hands: the character's right hand is open (it waves and gestures), the left holds the prop
  const sk = hex(c.skin), handCol = () => mix(sk, hex(c.blush), 0.18);
  const OH = flipX(openHand(c)); m = mesh(OH, [-0.66, 0.5, -0.1], [-0.36, 0.84, 0.2], 0.0125, handCol); stat.hands = g.mesh('HandR', m, rh, mSkin);
  const CUP = add(WR, mul(DF, 0.108)); const GH = gripHand(c, CUP, c.propR); m = mesh(GH, [0.36, 0.5, -0.1], [0.68, 0.84, 0.2], 0.0125, handCol); stat.hands += g.mesh('HandL', m, lh, mSkin);
  const pr = c.prop(CUP); m = mesh(pr.f, [CUP[0] - 0.1, CUP[1] - 0.1, CUP[2] - 0.2], [CUP[0] + 0.1, CUP[1] + 0.1, CUP[2] + 0.24], 0.0105, pr.color); const pn2 = g.node('Prop', lh, CUP); stat.prop = g.mesh('Prop', m, pn2, mProp);
  if (c.headphones) { const y = hex('#FFD93B'), n = hex('#0B103A'); const band = (f => (x, y2, z) => smax(f(x, y2, z), z - 0.085, 0.01))(torus([0, 1.375, -0.02], [0, 1, 0.22], 0.155, 0.02));
    const cup = mirrorX(cyl([0.118, 1.325, 0.105], [0.172, 1.31, 0.125], 0.068, 0.014)), pad = mirrorX(cyl([0.104, 1.329, 0.1], [0.122, 1.324, 0.107], 0.06, 0.01));
    m = mesh(U(0.008, band, cup, pad), [-0.28, 1.2, -0.24], [0.28, 1.48, 0.26], 0.0125, (x, y2, z) => pad(x, y2, z) < 0.004 ? n : y); stat.headphones = g.mesh('Headphones', m, spine, mProp, {own: true}); }
  const bytes = g.write(file); console.log(c.name, JSON.stringify(stat), 'bytes', bytes); return bytes;
}

const RUBY = {id: 'mila', name: 'Ruby', skin: '#F4C9A6', blush: '#EE8F82', mouthIn: '#5A1F28', lip: '#D9737C', tongue: '#E77B8A', iris: '#3F8F6A', lash: '#3A1E14', lashR: 0.0062, wing: true, lidOpen: -0.8,
  jawW: 0.252, chin: 0.07, nose: 0.034, brow: '#8A3D1D', browR: 0.0105, browY: 0.0, freckles: true, freckle: '#CE8E66', hair: '#A8461F', hairLight: '#DE8444',
  body: '#2D4BFF', sleeve: '#2D4BFF', trim: '#1B2FB8', under: '#FFF6DC', zip: '#FFD93B', stripe: '#FFD93B', hood: true, zipLine: true, pockets: true, vee: 0.10, jacketRough: 0.38,
  legs: '#1B2466', legCuff: '#4C5FD0', shoe: '#FFFFFF', sole: '#FFD93B', shoeAcc: '#2D4BFF', headphones: true, propR: 0.047,
  prop: C => { const body = cyl([C[0], C[1], C[2] - 0.115], [C[0], C[1], C[2] + 0.1], 0.047, 0.012), cap = cyl([C[0], C[1], C[2] + 0.095], [C[0], C[1], C[2] + 0.155], 0.04, 0.012), ring = torus([C[0], C[1], C[2] + 0.092], [0, 0, 1], 0.045, 0.008);
    return {f: U(0.004, body, cap, ring), color: (x, y, z) => z > C[2] + 0.1 ? hex('#0B103A') : ring(x, y, z) < 0.006 ? hex('#F3F5FF') : hex('#FFD93B')}; }};
const MAX = {id: 'rio', name: 'Max', skin: '#8C5A3C', blush: '#B4634A', mouthIn: '#3E1418', lip: '#8A463F', tongue: '#C4606A', iris: '#4A2A16', lash: '#120C0A', lashR: 0.0042, wing: false, lidOpen: -0.74,
  jawW: 0.272, chin: 0.082, nose: 0.042, brow: '#17110E', browR: 0.0155, browY: 0, freckles: false, hair: '#191310', hairLight: '#3A2C24',
  body: '#2D4BFF', sleeve: '#FFD93B', trim: '#0B103A', under: '#FFFFFF', zip: '#F3F5FF', stripe: '#F3F5FF', hood: false, rib: true, buttons: true, letter: true, vee: 0.12, jacketRough: 0.8,
  legs: '#5B6278', legCuff: '#454B5E', shoe: '#0B103A', sole: '#F3F5FF', shoeAcc: '#FFD93B', high: true, toeCap: true, headphones: false, propR: 0.05,
  prop: C => { const body = cyl([C[0], C[1], C[2] - 0.1], [C[0], C[1], C[2] + 0.09], 0.044, 0.008, 0.054), lid = cyl([C[0], C[1], C[2] + 0.085], [C[0], C[1], C[2] + 0.108], 0.058, 0.008), top = cyl([C[0], C[1], C[2] + 0.1], [C[0], C[1], C[2] + 0.12], 0.047, 0.008);
    return {f: U(0.003, body, lid, top), color: (x, y, z) => z > C[2] + 0.084 ? hex('#0B103A') : Math.abs(z - C[2] + 0.01) < 0.05 ? hex('#2D4BFF') : hex('#F7F5EF')}; }};

const want = process.argv[2], out = path.join(__dirname, 'out');
if (!want || want === 'ruby') build(RUBY, path.join(out, 'ruby.glb'));
if (!want || want === 'max') build(MAX, path.join(out, 'max.glb'));
