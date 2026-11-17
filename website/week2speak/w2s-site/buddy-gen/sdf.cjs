// Small signed-distance toolkit + surface-nets mesher + GLB writer. No dependencies.
// Shapes are blended with smooth unions, so a body part is one continuous sculpted surface, not primitives stuck together.
'use strict';
const smin = (a, b, k) => { if (k <= 0) return Math.min(a, b); const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
const smax = (a, b, k) => -smin(-a, -b, k);
const sstep = (a, b, x) => { let t = (x - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };
const norm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

const sphere = (c, r) => (x, y, z) => Math.hypot(x - c[0], y - c[1], z - c[2]) - r;
const ellipsoid = (c, r) => (x, y, z) => { const px = (x - c[0]) / r[0], py = (y - c[1]) / r[1], pz = (z - c[2]) / r[2]; const k0 = Math.hypot(px, py, pz), k1 = Math.hypot(px / r[0], py / r[1], pz / r[2]); return k1 < 1e-9 ? -Math.min(r[0], r[1], r[2]) : k0 * (k0 - 1) / k1; };
const capsule = (a, b, ra, rb = ra) => { const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2], bb = bx * bx + by * by + bz * bz || 1e-9; return (x, y, z) => { const px = x - a[0], py = y - a[1], pz = z - a[2]; let t = (px * bx + py * by + pz * bz) / bb; t = t < 0 ? 0 : t > 1 ? 1 : t; return Math.hypot(px - bx * t, py - by * t, pz - bz * t) - (ra + (rb - ra) * t); }; };
const box = (c, h, r) => (x, y, z) => { const qx = Math.abs(x - c[0]) - h[0] + r, qy = Math.abs(y - c[1]) - h[1] + r, qz = Math.abs(z - c[2]) - h[2] + r; return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r; };
const torus = (c, n, R, r) => { n = norm(n); return (x, y, z) => { const vx = x - c[0], vy = y - c[1], vz = z - c[2]; const h = vx * n[0] + vy * n[1] + vz * n[2]; const rad = Math.sqrt(Math.max(vx * vx + vy * vy + vz * vz - h * h, 0)); return Math.hypot(rad - R, h) - r; }; };
const cyl = (a, b, r, e = 0.006, rb = r) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), n = norm(sub(b, a)); return (x, y, z) => { const vx = x - a[0], vy = y - a[1], vz = z - a[2]; const h = vx * n[0] + vy * n[1] + vz * n[2]; const rad = Math.sqrt(Math.max(vx * vx + vy * vy + vz * vz - h * h, 0)); const rr = r + (rb - r) * Math.min(Math.max(h / L, 0), 1); const dx = rad - rr + e, dy = Math.abs(h - L / 2) - L / 2 + e; return Math.min(Math.max(dx, dy), 0) + Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) - e; }; };
const plane = (p, n) => { n = norm(n); return (x, y, z) => (x - p[0]) * n[0] + (y - p[1]) * n[1] + (z - p[2]) * n[2]; };   // negative behind the plane
const U = (k, ...f) => (x, y, z) => { let d = f[0](x, y, z); for (let i = 1; i < f.length; i++) d = smin(d, f[i](x, y, z), k); return d; };
const SUB = (f, g, k) => (x, y, z) => smax(f(x, y, z), -g(x, y, z), k);
const INT = (f, g, k) => (x, y, z) => smax(f(x, y, z), g(x, y, z), k);
const mirrorX = f => (x, y, z) => f(Math.abs(x), y, z);
const flipX = f => (x, y, z) => f(-x, y, z);
const arc = (c, R, r, a0, a1, segs, zoff = 0) => { const f = []; for (let i = 0; i < segs; i++) { const t0 = a0 + (a1 - a0) * i / segs, t1 = a0 + (a1 - a0) * (i + 1) / segs; f.push(capsule([c[0] + Math.cos(t0) * R, c[1] + Math.sin(t0) * R, c[2] + zoff], [c[0] + Math.cos(t1) * R, c[1] + Math.sin(t1) * R, c[2] + zoff], r)); } return U(0, ...f); };   // arc in the x-y plane
// Front surface (largest z with f = 0) on the line through (x, y).
const surfZ = (f, x, y, z1 = 0.6, z0 = -0.2) => { let a = z1, step = 0.01; while (a > z0 && f(x, y, a) > 0) a -= step; if (a <= z0) return null; let lo = a, hi = a + step; for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (f(x, y, m) > 0) hi = m; else lo = m; } return (lo + hi) / 2; };

const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };

// ---- naive surface nets: one vertex per surface cell, quads across every sign-changing grid edge ----
function mesh(f, lo, hi, cell, color) {
  const nx = Math.ceil((hi[0] - lo[0]) / cell) + 1, ny = Math.ceil((hi[1] - lo[1]) / cell) + 1, nz = Math.ceil((hi[2] - lo[2]) / cell) + 1;
  const g = new Float32Array(nx * ny * nz); let o = 0;
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) g[o++] = f(lo[0] + i * cell, lo[1] + j * cell, lo[2] + k * cell);
  const G = (i, j, k) => g[i + nx * (j + ny * k)];
  const cx = nx - 1, cy = ny - 1, cz = nz - 1, cv = new Int32Array(cx * cy * cz).fill(-1), pos = [];
  const EDG = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  for (let k = 0; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) {
    const v = [G(i, j, k), G(i + 1, j, k), G(i, j + 1, k), G(i + 1, j + 1, k), G(i, j, k + 1), G(i + 1, j, k + 1), G(i, j + 1, k + 1), G(i + 1, j + 1, k + 1)];
    let m = 0; for (let c = 0; c < 8; c++) if (v[c] < 0) m |= 1 << c; if (m === 0 || m === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of EDG) { if ((v[a] < 0) === (v[b] < 0)) continue; const t = v[a] / (v[a] - v[b]); const ax = a & 1, ay = (a >> 1) & 1, az = (a >> 2) & 1, bx = b & 1, by = (b >> 1) & 1, bz = (b >> 2) & 1; sx += ax + (bx - ax) * t; sy += ay + (by - ay) * t; sz += az + (bz - az) * t; n++; }
    cv[i + cx * (j + cy * k)] = pos.length / 3; pos.push(lo[0] + (i + sx / n) * cell, lo[1] + (j + sy / n) * cell, lo[2] + (k + sz / n) * cell);
  }
  const C = (i, j, k) => cv[i + cx * (j + cy * k)], idx = [];
  const quad = (a, b, c, d, flip) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; if (flip) idx.push(a, c, b, a, d, c); else idx.push(a, b, c, a, c, d); };
  for (let k = 1; k < cz; k++) for (let j = 1; j < cy; j++) for (let i = 0; i < cx; i++) { const a = G(i, j, k), b = G(i + 1, j, k); if ((a < 0) !== (b < 0)) quad(C(i, j - 1, k - 1), C(i, j, k - 1), C(i, j, k), C(i, j - 1, k), !(a < 0)); }
  for (let k = 1; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 1; i < cx; i++) { const a = G(i, j, k), b = G(i, j + 1, k); if ((a < 0) !== (b < 0)) quad(C(i - 1, j, k - 1), C(i - 1, j, k), C(i, j, k), C(i, j, k - 1), !(a < 0)); }
  for (let k = 0; k < cz; k++) for (let j = 1; j < cy; j++) for (let i = 1; i < cx; i++) { const a = G(i, j, k), b = G(i, j, k + 1); if ((a < 0) !== (b < 0)) quad(C(i - 1, j - 1, k), C(i, j - 1, k), C(i, j, k), C(i - 1, j, k), !(a < 0)); }
  const n = pos.length / 3, P = new Float32Array(pos), N = new Float32Array(n * 3), Col = new Uint8Array(n * 4), e = cell * 0.5;
  for (let v = 0; v < n; v++) { const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2]; const nn = norm([f(x + e, y, z) - f(x - e, y, z), f(x, y + e, z) - f(x, y - e, z), f(x, y, z + e) - f(x, y, z - e)]); N[v * 3] = nn[0]; N[v * 3 + 1] = nn[1]; N[v * 3 + 2] = nn[2];
    const c = color ? color(x, y, z, nn) : [255, 255, 255]; Col[v * 4] = Math.round(lin(c[0]) * 255); Col[v * 4 + 1] = Math.round(lin(c[1]) * 255); Col[v * 4 + 2] = Math.round(lin(c[2]) * 255); Col[v * 4 + 3] = 255; }
  // winding check against the field gradient
  let good = 0, bad = 0; for (let t = 0; t < idx.length; t += 3 * Math.max(1, Math.floor(idx.length / 3 / 400))) { const a = idx[t], b = idx[t + 1], c = idx[t + 2]; const ux = P[b * 3] - P[a * 3], uy = P[b * 3 + 1] - P[a * 3 + 1], uz = P[b * 3 + 2] - P[a * 3 + 2], vx = P[c * 3] - P[a * 3], vy = P[c * 3 + 1] - P[a * 3 + 1], vz = P[c * 3 + 2] - P[a * 3 + 2]; const d = (uy * vz - uz * vy) * N[a * 3] + (uz * vx - ux * vz) * N[a * 3 + 1] + (ux * vy - uy * vx) * N[a * 3 + 2]; if (d >= 0) good++; else bad++; }
  if (bad > good) for (let t = 0; t < idx.length; t += 3) { const s = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = s; }
  return {P, N, C: Col, I: idx, n};
}

// ---- analytic pieces (eyes, lids) ----
function uvSphere(r, seg, rings, pole, t0, t1, color) {   // pole 'z' or 'y' or '-y'; theta from t0 to t1 measured from the pole
  const P = [], N = [], Cc = [], I = [];
  for (let a = 0; a <= rings; a++) { const th = t0 + (t1 - t0) * a / rings; for (let b = 0; b <= seg; b++) { const ph = b / seg * Math.PI * 2; const s = Math.sin(th), c = Math.cos(th); let v = [s * Math.cos(ph), s * Math.sin(ph), c];
      if (pole === 'y') v = [v[0], v[2], -v[1]]; if (pole === '-y') v = [v[0], -v[2], v[1]];
      P.push(v[0] * r, v[1] * r, v[2] * r); N.push(v[0], v[1], v[2]); const col = color(th, ph, v); Cc.push(Math.round(lin(col[0]) * 255), Math.round(lin(col[1]) * 255), Math.round(lin(col[2]) * 255), 255); } }
  const w = seg + 1; for (let a = 0; a < rings; a++) for (let b = 0; b < seg; b++) { const i0 = a * w + b, i1 = i0 + 1, i2 = i0 + w, i3 = i2 + 1; I.push(i0, i2, i1, i1, i2, i3); }
  const m = {P: new Float32Array(P), N: new Float32Array(N), C: new Uint8Array(Cc), I, n: P.length / 3};
  // fix winding so faces point outwards
  const a = I[0], b = I[1], c = I[2], ux = P[b * 3] - P[a * 3], uy = P[b * 3 + 1] - P[a * 3 + 1], uz = P[b * 3 + 2] - P[a * 3 + 2], vx = P[c * 3] - P[a * 3], vy = P[c * 3 + 1] - P[a * 3 + 1], vz = P[c * 3 + 2] - P[a * 3 + 2];
  const cxn = [(uy * vz - uz * vy), (uz * vx - ux * vz), (ux * vy - uy * vx)], mid = [(P[a * 3] + P[b * 3] + P[c * 3]), (P[a * 3 + 1] + P[b * 3 + 1] + P[c * 3 + 1]), (P[a * 3 + 2] + P[b * 3 + 2] + P[c * 3 + 2])];
  let dsum = 0; for (let t = 0; t < I.length; t += 3) { const A = I[t], B = I[t + 1], Cc2 = I[t + 2]; const u = [P[B * 3] - P[A * 3], P[B * 3 + 1] - P[A * 3 + 1], P[B * 3 + 2] - P[A * 3 + 2]], v = [P[Cc2 * 3] - P[A * 3], P[Cc2 * 3 + 1] - P[A * 3 + 1], P[Cc2 * 3 + 2] - P[A * 3 + 2]]; dsum += (u[1] * v[2] - u[2] * v[1]) * P[A * 3] + (u[2] * v[0] - u[0] * v[2]) * P[A * 3 + 1] + (u[0] * v[1] - u[1] * v[0]) * P[A * 3 + 2]; }
  if (dsum < 0) for (let t = 0; t < I.length; t += 3) { const s = I[t + 1]; I[t + 1] = I[t + 2]; I[t + 2] = s; }
  return m;
}
function merge(...ms) { let n = 0; ms.forEach(m => n += m.n); const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Uint8Array(n * 4), I = []; let o = 0; ms.forEach(m => { P.set(m.P, o * 3); N.set(m.N, o * 3); C.set(m.C, o * 4); for (const i of m.I) I.push(i + o); o += m.n; }); return {P, N, C, I, n}; }
function moved(m, d) { const P = new Float32Array(m.P); for (let i = 0; i < m.n; i++) { P[i * 3] += d[0]; P[i * 3 + 1] += d[1]; P[i * 3 + 2] += d[2]; } return Object.assign({}, m, {P}); }

// ---- GLB writer ----
class Glb {
  constructor(extras) { this.j = {asset: {version: '2.0', generator: 'week2speak buddy-gen'}, extensionsUsed: ['KHR_mesh_quantization'], extensionsRequired: ['KHR_mesh_quantization'], scene: 0, scenes: [{nodes: [0], extras}], nodes: [], meshes: [], materials: [], accessors: [], bufferViews: [], buffers: [{byteLength: 0}], skins: []}; this.chunks = []; this.len = 0; this.mat = {}; this.byName = {}; }
  view(typed, target, stride) { const pad = (4 - this.len % 4) % 4; if (pad) { this.chunks.push(Buffer.alloc(pad)); this.len += pad; } const b = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength); this.chunks.push(b); const v = {buffer: 0, byteOffset: this.len, byteLength: b.length}; if (target) v.target = target; if (stride) v.byteStride = stride; this.len += b.length; this.j.bufferViews.push(v); return this.j.bufferViews.length - 1; }
  acc(o) { this.j.accessors.push(o); return this.j.accessors.length - 1; }
  scaleUnder(i, fn, k) { this.xf = fn; this.xk = k; this.xs = new Set([i]); }
  node(name, parent, pos) { if (this.xs && this.xs.has(parent)) { pos = this.xf(pos); } const wp = pos || [0, 0, 0], pw = parent != null ? this.j.nodes[parent].__w : [0, 0, 0]; const n = {name, translation: sub(wp, pw), __w: wp}; this.j.nodes.push(n); const i = this.j.nodes.length - 1; if (parent != null) (this.j.nodes[parent].children = this.j.nodes[parent].children || []).push(i); if (this.xs && this.xs.has(parent)) this.xs.add(i); this.byName[name] = i; return i; }
  material(name, rough, opts = {}) { if (this.mat[name] != null) return this.mat[name]; this.j.materials.push(Object.assign({name, pbrMetallicRoughness: {baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: rough}}, opts)); return this.mat[name] = this.j.materials.length - 1; }
  // m: {P,N,C,I,n}; node: index the mesh hangs on (vertices are stored relative to it); skin: {J: Uint8Array n*4, W: Uint8Array n*4}; morphs: [{name, D: Float32Array n*3}]
  mesh(name, m, node, material, o = {}) {
    if (this.xs && this.xs.has(node) && !o.skin) { const P2 = new Float32Array(m.P.length); for (let i = 0; i < m.n; i++) { const q = this.xf([m.P[i * 3], m.P[i * 3 + 1], m.P[i * 3 + 2]]); P2[i * 3] = q[0]; P2[i * 3 + 1] = q[1]; P2[i * 3 + 2] = q[2]; } m = Object.assign({}, m, {P: P2}); if (o.morphs) o = Object.assign({}, o, {morphs: o.morphs.map(t => ({name: t.name, D: t.D.map(v => v * this.xk)}))}); }
    const w = this.j.nodes[node].__w, P = new Float32Array(m.n * 3), mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    for (let i = 0; i < m.n; i++) for (let c = 0; c < 3; c++) { const v = m.P[i * 3 + c] - (o.skin ? 0 : w[c]); P[i * 3 + c] = v; if (v < mn[c]) mn[c] = v; if (v > mx[c]) mx[c] = v; }
    const N8 = new Int8Array(m.n * 4); for (let i = 0; i < m.n; i++) for (let c = 0; c < 3; c++) N8[i * 4 + c] = Math.max(-127, Math.min(127, Math.round(m.N[i * 3 + c] * 127)));
    const attr = {POSITION: this.acc({bufferView: this.view(P, 34962), componentType: 5126, count: m.n, type: 'VEC3', min: mn, max: mx}),
      NORMAL: this.acc({bufferView: this.view(N8, 34962, 4), componentType: 5120, normalized: true, count: m.n, type: 'VEC3'}),
      COLOR_0: this.acc({bufferView: this.view(m.C, 34962), componentType: 5121, normalized: true, count: m.n, type: 'VEC4'})};
    if (o.skin) { attr.JOINTS_0 = this.acc({bufferView: this.view(o.skin.J, 34962), componentType: 5121, count: m.n, type: 'VEC4'}); attr.WEIGHTS_0 = this.acc({bufferView: this.view(o.skin.W, 34962), componentType: 5121, normalized: true, count: m.n, type: 'VEC4'}); }
    const I = m.n < 65536 ? new Uint16Array(m.I) : new Uint32Array(m.I);
    const prim = {attributes: attr, indices: this.acc({bufferView: this.view(I, 34963), componentType: m.n < 65536 ? 5123 : 5125, count: I.length, type: 'SCALAR'}), material, mode: 4};
    const mesh = {name, primitives: [prim]};
    if (o.morphs && o.morphs.length) { prim.targets = []; mesh.extras = {targetNames: o.morphs.map(t => t.name)}; mesh.weights = o.morphs.map(() => 0);
      for (const t of o.morphs) { const ids = [], vals = [], lo = [0, 0, 0], hi = [0, 0, 0]; for (let i = 0; i < m.n; i++) { const dx = t.D[i * 3], dy = t.D[i * 3 + 1], dz = t.D[i * 3 + 2]; if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) < 2e-5) continue; ids.push(i); vals.push(dx, dy, dz); [dx, dy, dz].forEach((v, c) => { if (v < lo[c]) lo[c] = v; if (v > hi[c]) hi[c] = v; }); }
        if (!ids.length) { ids.push(0); vals.push(0, 0, 0); }
        const iv = this.view(m.n < 65536 ? new Uint16Array(ids) : new Uint32Array(ids)), vv = this.view(new Float32Array(vals));
        prim.targets.push({POSITION: this.acc({componentType: 5126, count: m.n, type: 'VEC3', min: lo, max: hi, sparse: {count: ids.length, indices: {bufferView: iv, componentType: m.n < 65536 ? 5123 : 5125}, values: {bufferView: vv}}})}); } }
    this.j.meshes.push(mesh); const mi = this.j.meshes.length - 1;
    if (o.skin) { const sn = this.node(name, 0, [0, 0, 0]); this.j.nodes[sn].mesh = mi; this.j.nodes[sn].skin = 0; }
    else if (o.own) { const sn = this.node(name, node, w); this.j.nodes[sn].mesh = mi; }
    else if (this.j.nodes[node].mesh == null) this.j.nodes[node].mesh = mi; else { const sn = this.node(name, node, w); this.j.nodes[sn].mesh = mi; }
    return m.n;
  }
  skin(names) { const joints = names.map(n => this.byName[n]), M = new Float32Array(names.length * 16); joints.forEach((ji, k) => { const w = this.j.nodes[ji].__w; M.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -w[0], -w[1], -w[2], 1], k * 16); }); this.j.skins.push({joints, inverseBindMatrices: this.acc({bufferView: this.view(M), componentType: 5126, count: names.length, type: 'MAT4'}), skeleton: this.byName[names[0]]}); }
  rot(name, q) { this.j.nodes[this.byName[name]].rotation = q; }
  write(file) { const pad = (4 - this.len % 4) % 4; if (pad) { this.chunks.push(Buffer.alloc(pad)); this.len += pad; } this.j.buffers[0].byteLength = this.len; if (!this.j.skins.length) delete this.j.skins;
    const js = JSON.stringify(this.j, (k, v) => k === '__w' ? undefined : v); let jb = Buffer.from(js); const jp = (4 - jb.length % 4) % 4; if (jp) jb = Buffer.concat([jb, Buffer.alloc(jp, 0x20)]);
    const bin = Buffer.concat(this.chunks), head = Buffer.alloc(12); head.writeUInt32LE(0x46546C67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + jb.length + 8 + bin.length, 8);
    const jh = Buffer.alloc(8); jh.writeUInt32LE(jb.length, 0); jh.writeUInt32LE(0x4E4F534A, 4); const bh = Buffer.alloc(8); bh.writeUInt32LE(bin.length, 0); bh.writeUInt32LE(0x004E4942, 4);
    require('fs').writeFileSync(file, Buffer.concat([head, jh, jb, bh, bin])); return 12 + 8 + jb.length + 8 + bin.length; }
}
module.exports = {smin, smax, sstep, norm, add, sub, mul, lerp3, sphere, ellipsoid, capsule, box, torus, cyl, plane, U, SUB, INT, mirrorX, flipX, arc, surfZ, hex, mix, lin, mesh, uvSphere, merge, moved, Glb};
