// ================= atlas de texturas (placas, janelas, cartazes) =================
const ATL = { S: 2048, cv: document.createElement('canvas'), sky: [{ x: 22, y: 0, w: 2026 }, { x: 0, y: 22, w: 22 }], map: new Map(), area: 0, miss: 0 };
ATL.sky.sort((a, b) => a.x - b.x);
ATL.cv.width = ATL.cv.height = ATL.S;
ATL.g = ATL.cv.getContext('2d');
ATL.tex = new THREE.CanvasTexture(ATL.cv);
ATL.tex.colorSpace = THREE.SRGBColorSpace; ATL.tex.anisotropy = 4;
ATL.g.fillStyle = '#ffffff'; ATL.g.fillRect(0, 0, 16, 16);
const WHITE_UV = [8 / ATL.S, 1 - 8 / ATL.S];
// empacotamento "skyline": cada item desce até onde couber, mais embaixo e à esquerda possível
function skyFit(i, w, h) {
  const K = ATL.sky, S = ATL.S;
  if (K[i].x + w > S) return -1;
  let left = w, j = i, y = 0;
  while (left > 0) {
    if (j >= K.length) return -1;
    y = Math.max(y, K[j].y);
    if (y + h > S) return -1;
    left -= K[j].w; j++;
  }
  return y;
}
function skyPlace(i, x, y, w, h) {
  const K = ATL.sky;
  K.splice(i, 0, { x, y: y + h, w });
  for (let j = i + 1; j < K.length; j++) {
    const prev = K[j - 1], cur = K[j];
    if (cur.x >= prev.x + prev.w) break;
    const cut = prev.x + prev.w - cur.x;
    cur.x += cut; cur.w -= cut;
    if (cur.w <= 0) { K.splice(j, 1); j--; } else break;
  }
  for (let j = 0; j < K.length - 1; j++) if (K[j].y === K[j + 1].y) { K[j].w += K[j + 1].w; K.splice(j + 1, 1); j--; }
}
function atlasAdd(key, w, h, draw) {
  if (ATL.map.has(key)) return ATL.map.get(key);
  const pad = 4, W = w + pad, Hh = h + pad, K = ATL.sky;
  let best = -1, by = 1e9, bw = 1e9;
  for (let i = 0; i < K.length; i++) {
    const y = skyFit(i, W, Hh);
    if (y >= 0 && (y + Hh < by || (y + Hh === by && K[i].w < bw))) { best = i; by = y + Hh; bw = K[i].w; }
  }
  if (best < 0) { ATL.miss++; console.warn('atlas cheio', key); return [WHITE_UV[0], WHITE_UV[1], WHITE_UV[0], WHITE_UV[1]]; }
  const x = K[best].x, y = by - Hh, g = ATL.g;
  skyPlace(best, x, y, W, Hh);
  ATL.area += w * h;
  g.save(); g.translate(x, y); g.beginPath(); g.rect(0, 0, w, h); g.clip();
  draw(g, w, h);
  g.restore();
  const S = ATL.S, uv = [x / S, 1 - (y + h) / S, (x + w) / S, 1 - y / S];
  ATL.map.set(key, uv);
  return uv;
}

// cores em cache
const _colc = new Map();
function C(hex) { let c = _colc.get(hex); if (!c) _colc.set(hex, c = new THREE.Color(hex)); return c; }

// ================= construtor de geometria em lote =================
const _srcCache = new WeakMap();
function srcData(geo) {
  let s = _srcCache.get(geo);
  if (s) return s;
  const p = geo.attributes.position.array, n = geo.attributes.normal ? geo.attributes.normal.array : null;
  const uv = geo.attributes.uv ? geo.attributes.uv.array : null;
  const count = geo.attributes.position.count;
  let idx;
  if (geo.index) idx = geo.index.array; else { idx = new Uint32Array(count); for (let i = 0; i < count; i++) idx[i] = i; }
  s = { p, n, uv, idx, count };
  _srcCache.set(geo, s);
  return s;
}
const _nm = new THREE.Matrix3(), _nm2 = new THREE.Matrix3(), _cc = new THREE.Color(), _det = new THREE.Matrix4();
class Geo {
  constructor(skin = false) {
    this.cap = 2048; this.vc = 0; this.icap = 4096; this.ic = 0; this.skin = skin;
    this.P = new Float32Array(this.cap * 3); this.N = new Float32Array(this.cap * 3); this.C = new Uint8Array(this.cap * 3);
    this.T = new Float32Array(this.cap * 2); this.A = new Float32Array(this.cap * 3); this.I = new Uint32Array(this.icap);
    if (skin) { this.SI = new Uint16Array(this.cap * 4); this.SW = new Float32Array(this.cap * 4); }
  }
  grow(nv, ni) {
    if (this.vc + nv > this.cap) {
      let c = this.cap; while (this.vc + nv > c) c *= 2;
      const g = (a, k) => { const b = new a.constructor(c * k); b.set(a); return b; };
      this.P = g(this.P, 3); this.N = g(this.N, 3); this.C = g(this.C, 3); this.T = g(this.T, 2); this.A = g(this.A, 3);
      if (this.skin) { this.SI = g(this.SI, 4); this.SW = g(this.SW, 4); }
      this.cap = c;
    }
    if (this.ic + ni > this.icap) {
      let c = this.icap; while (this.ic + ni > c) c *= 2;
      const b = new Uint32Array(c); b.set(this.I); this.I = b; this.icap = c;
    }
  }
  // src: BufferGeometry; L: matriz local da peça (ou null); W: matriz do objeto (ou null)
  // o: { c: cor, cf(x,y,z,nx,ny,nz)->cor, uv: [u0,v0,u1,v1], pat, id, sway, swayH, bone, ps, face }
  add(src, L, W, o = {}) {
    const s = srcData(src);
    const nv = s.count, ni = s.idx.length, v0 = this.vc;
    this.grow(nv, ni);
    const le = L ? L.elements : null, we = W ? W.elements : null;
    let nle = null, nwe = null;
    if (L) nle = _nm.getNormalMatrix(L).elements.slice();
    if (W) nwe = _nm2.getNormalMatrix(W).elements.slice();
    let det = 1;
    if (L && W) det = _det.multiplyMatrices(W, L).determinant(); else if (L) det = L.determinant(); else if (W) det = W.determinant();
    const P = this.P, N = this.N, C = this.C, T = this.T, A = this.A;
    let cr = 255, cg = 255, cb = 255;
    if (o.c) { cr = Math.round(o.c.r * 255); cg = Math.round(o.c.g * 255); cb = Math.round(o.c.b * 255); }
    const uv = o.uv, pat = o.pat || 0, id = o.id || 0, code = pat * 8 + id, ps = o.ps || 1;
    const sway = o.sway || 0, swayH = o.swayH || 1;
    for (let i = 0; i < nv; i++) {
      let x = s.p[i * 3], y = s.p[i * 3 + 1], z = s.p[i * 3 + 2];
      let nx = s.n ? s.n[i * 3] : 0, ny = s.n ? s.n[i * 3 + 1] : 1, nz = s.n ? s.n[i * 3 + 2] : 0;
      if (le) {
        const X = le[0] * x + le[4] * y + le[8] * z + le[12], Yy = le[1] * x + le[5] * y + le[9] * z + le[13], Z = le[2] * x + le[6] * y + le[10] * z + le[14];
        x = X; y = Yy; z = Z;
        const NX = nle[0] * nx + nle[3] * ny + nle[6] * nz, NY = nle[1] * nx + nle[4] * ny + nle[7] * nz, NZ = nle[2] * nx + nle[5] * ny + nle[8] * nz;
        const l = Math.hypot(NX, NY, NZ) || 1; nx = NX / l; ny = NY / l; nz = NZ / l;
      }
      const k = v0 + i;
      // cor
      if (o.cf) { const c = o.cf(x, y, z, nx, ny, nz); C[k * 3] = Math.round(c.r * 255); C[k * 3 + 1] = Math.round(c.g * 255); C[k * 3 + 2] = Math.round(c.b * 255); }
      else { C[k * 3] = cr; C[k * 3 + 1] = cg; C[k * 3 + 2] = cb; }
      // ossos: um só (peça rígida) ou vários pesos por vértice (skinF -> [osso, peso, osso, peso, ...])
      if (this.skin) {
        if (o.skinF) { const sw = o.skinF(x, y, z); for (let j = 0; j < 4; j++) { this.SI[k * 4 + j] = sw[j * 2] || 0; this.SW[k * 4 + j] = sw[j * 2 + 1] || 0; } }
        else { this.SI[k * 4] = o.bone || 0; this.SW[k * 4] = 1; }
      }
      // padrão (coordenadas planares locais, em unidades do mundo)
      if (sway) { A[k * 3] = sway * clamp(y / swayH, 0, 1.4); A[k * 3 + 1] = 0; }
      else if (pat) {
        const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
        if (ay > ax && ay > az) { A[k * 3] = x * ps; A[k * 3 + 1] = z * ps + 5; }
        else if (ax > az) { A[k * 3] = z * ps; A[k * 3 + 1] = y * ps; }
        else { A[k * 3] = x * ps; A[k * 3 + 1] = y * ps; }
      } else { A[k * 3] = 0; A[k * 3 + 1] = o.face ? 1 : 0; }
      A[k * 3 + 2] = code;
      // mundo
      if (we) {
        const X = we[0] * x + we[4] * y + we[8] * z + we[12], Yy = we[1] * x + we[5] * y + we[9] * z + we[13], Z = we[2] * x + we[6] * y + we[10] * z + we[14];
        x = X; y = Yy; z = Z;
        const NX = nwe[0] * nx + nwe[3] * ny + nwe[6] * nz, NY = nwe[1] * nx + nwe[4] * ny + nwe[7] * nz, NZ = nwe[2] * nx + nwe[5] * ny + nwe[8] * nz;
        const l = Math.hypot(NX, NY, NZ) || 1; nx = NX / l; ny = NY / l; nz = NZ / l;
      }
      P[k * 3] = x; P[k * 3 + 1] = y; P[k * 3 + 2] = z;
      N[k * 3] = nx; N[k * 3 + 1] = ny; N[k * 3 + 2] = nz;
      if (uv && s.uv) { T[k * 2] = uv[0] + s.uv[i * 2] * (uv[2] - uv[0]); T[k * 2 + 1] = uv[1] + s.uv[i * 2 + 1] * (uv[3] - uv[1]); }
      else { T[k * 2] = WHITE_UV[0]; T[k * 2 + 1] = WHITE_UV[1]; }
    }
    const I = this.I;
    if (det >= 0) for (let i = 0; i < ni; i++) I[this.ic + i] = s.idx[i] + v0;
    else for (let i = 0; i < ni; i += 3) { I[this.ic + i] = s.idx[i] + v0; I[this.ic + i + 1] = s.idx[i + 2] + v0; I[this.ic + i + 2] = s.idx[i + 1] + v0; }
    this.vc += nv; this.ic += ni;
  }
  // quadrilátero cru em coordenadas do mundo (p0..p3 no sentido anti-horário visto de fora)
  quad(p0, p1, p2, p3, c, o = {}) {
    this.grow(4, 6);
    const v0 = this.vc;
    const nx = (p1.y - p0.y) * (p3.z - p0.z) - (p1.z - p0.z) * (p3.y - p0.y);
    const ny = (p1.z - p0.z) * (p3.x - p0.x) - (p1.x - p0.x) * (p3.z - p0.z);
    const nz = (p1.x - p0.x) * (p3.y - p0.y) - (p1.y - p0.y) * (p3.x - p0.x);
    const l = Math.hypot(nx, ny, nz) || 1;
    const pts = [p0, p1, p2, p3], uvq = o.q || [[0, 0], [1, 0], [1, 1], [0, 1]];
    const code = (o.pat || 0) * 8 + (o.id || 0);
    for (let i = 0; i < 4; i++) {
      const k = v0 + i, p = pts[i];
      this.P[k * 3] = p.x; this.P[k * 3 + 1] = p.y; this.P[k * 3 + 2] = p.z;
      const n = o.n ? o.n[i] : null;
      this.N[k * 3] = n ? n.x : nx / l; this.N[k * 3 + 1] = n ? n.y : ny / l; this.N[k * 3 + 2] = n ? n.z : nz / l;
      const cc = Array.isArray(c) ? c[i] : c;
      this.C[k * 3] = Math.round(cc.r * 255); this.C[k * 3 + 1] = Math.round(cc.g * 255); this.C[k * 3 + 2] = Math.round(cc.b * 255);
      this.T[k * 2] = WHITE_UV[0]; this.T[k * 2 + 1] = WHITE_UV[1];
      this.A[k * 3] = uvq[i][0]; this.A[k * 3 + 1] = uvq[i][1]; this.A[k * 3 + 2] = code;
      if (this.skin) { this.SI[k * 4] = 0; this.SW[k * 4] = 1; }
    }
    const I = this.I, ic = this.ic;
    I[ic] = v0; I[ic + 1] = v0 + 1; I[ic + 2] = v0 + 2; I[ic + 3] = v0; I[ic + 4] = v0 + 2; I[ic + 5] = v0 + 3;
    this.vc += 4; this.ic += 6;
  }
  build() {
    const g = new THREE.BufferGeometry(), n = this.vc;
    g.setAttribute('position', new THREE.BufferAttribute(this.P.slice(0, n * 3), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(this.N.slice(0, n * 3), 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.C.slice(0, n * 3), 3, true));
    g.setAttribute('uv', new THREE.BufferAttribute(this.T.slice(0, n * 2), 2));
    g.setAttribute('aPat', new THREE.BufferAttribute(this.A.slice(0, n * 3), 3));
    if (this.skin) {
      g.setAttribute('skinIndex', new THREE.BufferAttribute(this.SI.slice(0, n * 4), 4));
      g.setAttribute('skinWeight', new THREE.BufferAttribute(this.SW.slice(0, n * 4), 4));
    }
    const idx = n < 65536 ? new Uint16Array(this.I.subarray(0, this.ic)) : this.I.slice(0, this.ic);
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeBoundingSphere();
    return g;
  }
}

// ================= peças-base =================
const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  plane: new THREE.PlaneGeometry(1, 1),
};
const HULL = new THREE.SphereGeometry(1, 14, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
const DOME = new THREE.SphereGeometry(1, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2);
const _gc = new Map();
function cylG(n = 10, top = 1, open = false) { const k = 'c' + n + '_' + top + open; if (!_gc.has(k)) _gc.set(k, new THREE.CylinderGeometry(top, 1, 1, n, 1, open)); return _gc.get(k); }
function sphG(w = 12, h = 8) { const k = 's' + w + '_' + h; if (!_gc.has(k)) _gc.set(k, new THREE.SphereGeometry(1, w, h)); return _gc.get(k); }
function icoG(d = 1) { const k = 'i' + d; if (!_gc.has(k)) _gc.set(k, icoGeometry(d)); return _gc.get(k); }
function torG(r = 1, t = 0.1, rs = 6, ts = 16, arc = Math.PI * 2) { const k = 't' + r + t + rs + ts + arc; if (!_gc.has(k)) _gc.set(k, new THREE.TorusGeometry(r, t, rs, ts, arc)); return _gc.get(k); }
function blobG(seed, det = 1) {
  const k = 'b' + seed + '_' + det;
  if (!_gc.has(k)) _gc.set(k, icoGeometry(det, (x, y, z) => 1 + (vnoise3(x * 2.1 + seed * 7.3, y * 2.1 + seed, z * 2.1 - seed * 3.1) - 0.5) * 0.42 + (vnoise3(x * 5 + seed, y * 5, z * 5) - 0.5) * 0.14));
  return _gc.get(k);
}
const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _ml = new THREE.Matrix4();
// matriz local: posição, escala, rotação (y, x, z)
function TM(x, y, z, sx = 1, sy = 1, sz = 1, ry = 0, rx = 0, rz = 0) {
  _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(sx, sy, sz);
  return _ml.compose(_p, _q, _s);
}

// ================= pedaços do planeta (culling por horizonte) =================
const NCH = 60;
const CH = [];
for (let i = 0; i < NCH; i++) {
  const y = 1 - (i + 0.5) / NCH * 2, r = Math.sqrt(1 - y * y), a = i * Math.PI * (3 - Math.sqrt(5));
  CH.push({ dir: new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r), geo: {}, mesh: {}, ang: 0, top: 0, inst: [] });
}
function chunkOf(d) {
  let best = 0, bd = -2;
  for (let i = 0; i < NCH; i++) { const v = CH[i].dir.dot(d); if (v > bd) { bd = v; best = i; } }
  return CH[best];
}
function chunkGeo(ch, layer) { return ch.geo[layer] || (ch.geo[layer] = new Geo()); }
const MAT = {};
function makeMaterials() {
  MAT.world = toon({ vc: true, map: ATL.tex, pat: true, nearFade: true });
  MAT.fol = toon({ vc: true, pat: true, wind: true, nearFade: true });
  MAT.ground = toon({ vc: true, ground: true, grad: grad2 });
  MAT.road = toon({ vc: true, pat: true, grad: grad2 });
  MAT.dyn = MAT.world;
}
function buildChunks() {
  for (const ch of CH) {
    for (const layer in ch.geo) {
      const g = ch.geo[layer]; if (!g.vc) continue;
      const geo = g.build();
      const m = new THREE.Mesh(geo, layer === 'fol' ? MAT.fol : layer === 'road' ? MAT.road : MAT.world);
      m.castShadow = layer !== 'road' && !(LOW && layer === 'small'); m.receiveShadow = true; m.matrixAutoUpdate = false;
      scene.add(m); ch.mesh[layer] = m;
      // alcance angular e altura máxima do pedaço
      const p = geo.attributes.position.array; let ang = 0, top = 0;
      for (let i = 0; i < p.length; i += 3) {
        const l = Math.hypot(p[i], p[i + 1], p[i + 2]);
        const c = (p[i] * ch.dir.x + p[i + 1] * ch.dir.y + p[i + 2] * ch.dir.z) / l;
        ang = Math.max(ang, Math.acos(clamp(c, -1, 1))); top = Math.max(top, l - R);
      }
      ch.ang = Math.max(ch.ang, ang); ch.top = Math.max(ch.top, top);
    }
    ch.geo = null;
  }
}
// visível se não estiver escondido atrás da curva do planeta
function overHorizon(dir, ang, top, camPos, D) {
  const Rp = R - 1.2;
  if (D <= Rp + 0.01) return true;
  const c = (camPos.x * dir.x + camPos.y * dir.y + camPos.z * dir.z) / D;
  const a = Math.acos(clamp(c, -1, 1));
  return a - ang < Math.acos(Rp / D) + Math.acos(Rp / (R + Math.max(top, 0.6)));
}
function updateChunks(camPos, far) {
  const D = camPos.length();
  for (const ch of CH) {
    const vis = overHorizon(ch.dir, ch.ang, ch.top, camPos, D);
    const cx = ch.dir.x * R - camPos.x, cy = ch.dir.y * R - camPos.y, cz = ch.dir.z * R - camPos.z;
    const near = Math.hypot(cx, cy, cz) - ch.ang * R;
    for (const layer in ch.mesh) {
      const m = ch.mesh[layer];
      m.visible = vis && (layer !== 'small' || (far ? !LOW : near < 34));
    }
    for (const im of ch.inst) im.visible = vis && !far && near < 30;
  }
}
