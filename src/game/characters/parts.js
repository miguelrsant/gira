// ---------------- geometrias ----------------
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { LOW } from '../core/config.js';
import { D2R, lerp, sstep, Y } from '../core/math.js';
import { _gc } from '../world/geo.js';
import { vnoise3 } from '../world/noise.js';

function weldNormals(geo) {
  const p = geo.attributes.position.array, n = geo.attributes.normal.array, map = new Map();
  for (let i = 0; i < p.length; i += 3) {
    const k = Math.round(p[i] * 1e4) + ',' + Math.round(p[i + 1] * 1e4) + ',' + Math.round(p[i + 2] * 1e4);
    let a = map.get(k); if (!a) map.set(k, a = []); a.push(i);
  }
  for (const a of map.values()) if (a.length > 1) {
    let x = 0, y = 0, z = 0; for (const i of a) { x += n[i]; y += n[i + 1]; z += n[i + 2]; }
    const l = Math.hypot(x, y, z) || 1; for (const i of a) { n[i] = x / l; n[i + 1] = y / l; n[i + 2] = z / l; }
  }
  return geo;
}
// cápsula afunilada: base (r2) em y=0, topo (r1) em y=len
export function taperG(r1, r2, len, n = LOW ? 8 : 10) {
  const pts = [], cs = LOW ? 3 : 4;
  for (let i = 0; i <= cs; i++) { const a = -Math.PI / 2 + i / cs * Math.PI / 2; pts.push(new THREE.Vector2(Math.max(1e-4, Math.cos(a) * r2), Math.sin(a) * r2)); }
  for (let i = 0; i <= cs; i++) { const a = i / cs * Math.PI / 2; pts.push(new THREE.Vector2(Math.max(1e-4, Math.cos(a) * r1), len + Math.sin(a) * r1)); }
  return new THREE.LatheGeometry(pts, n, Math.PI);
}
export function latheG(prof, n = LOW ? 12 : 16) { return new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(Math.max(1e-4, r), y)), n, Math.PI); }
// curva suave (Catmull-Rom) passando pelos pontos [r, y]
export function smoothPts(pts, k = 3) {
  const out = [], n = pts.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    for (let j = 0; j < k; j++) {
      const t = j / k, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - a - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[n - 1]);
  return out;
}
// braço/perna com forma de músculo: rs = raios de baixo (y=0) para cima (y=len), pontas arredondadas
// open: 'bottom' deixa a boca de baixo aberta (barra de manga, bermuda)
export function limbG(rs, len, o = {}) {
  const m = rs.length, cs = LOW ? 3 : 4, pts = [];
  if (o.open !== 'bottom') for (let i = 0; i < cs; i++) { const a = -Math.PI / 2 + i / cs * Math.PI / 2; pts.push([Math.cos(a) * rs[0], Math.sin(a) * rs[0]]); }
  const side = smoothPts(rs.map((r, j) => [r, len * j / (m - 1)]), LOW ? 2 : 3);
  pts.push(...side);
  for (let i = 1; i <= cs; i++) { const a = i / cs * Math.PI / 2; pts.push([Math.cos(a) * rs[m - 1], len + Math.sin(a) * rs[m - 1]]); }
  const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(1e-4, r), y)), o.n || (LOW ? 8 : 12), Math.PI);
  return g;
}
// caixa de cantos redondos (sola de tênis, bolsos): escalada no TM, os cantos acompanham
export function rboxG() {
  if (!_gc.has('rbox')) { const g = new RoundedBoxGeometry(1, 1, 1, LOW ? 2 : 3, 0.32); _gc.set('rbox', g); }
  return _gc.get('rbox');
}

// ---------------- tronco com curvas ----------------
// perfil em "unidades do tronco": y = 0 na cintura (junta do tronco), 0,35 no ombro; r = raio antes da largura
export function torsoProf(P) {
  const b = P.belly || 0, cst = P.chest || 0, shd = P.shoulders || 0, hw = P.hipW ?? 1, ww = P.waistW ?? 1;
  return [
    [0.0, -0.135], [0.07, -0.131], [0.115, -0.115], [0.14 * hw, -0.08], [0.147 * hw, -0.04],
    [0.14 * lerp(hw, ww, 0.6) + b * 0.5, 0.01], [0.13 * ww + b, 0.07], [0.135 * ww + b * 0.7, 0.125],
    [0.145 + cst * 0.5 + b * 0.25, 0.185], [0.152 + cst * 0.4, 0.24], [0.155 + shd, 0.285],
    [0.148 + shd, 0.318], [0.13 + shd * 0.6, 0.348], [0.098 + shd * 0.2, 0.378], [0.06, 0.402], [0.0, 0.415],
  ];
}
const bell = (y, a, m, b) => sstep(a, m, y) * (1 - sstep(m, b, y));
// volume que um torno não dá: busto/peito na frente, bumbum e a curva das costas atrás
export function torsoDZ(P, y, c) {
  const f = Math.max(0, c), k = Math.max(0, -c);
  return (P.bust || 0) * bell(y, 0.12, 0.215, 0.3) * f * f + (P.belly || 0) * 0.6 * bell(y, -0.03, 0.07, 0.17) * f * f
    - (P.butt || 0) * bell(y, -0.135, -0.065, 0.02) * k * k + 0.009 * bell(y, -0.01, 0.075, 0.16) * k * k - 0.007 * bell(y, 0.16, 0.26, 0.35) * k * k;
}
// raio do perfil numa altura (para seguir a superfície: alças do macacão)
export function profR(pts, y) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [r0, y0] = pts[i], [r1, y1] = pts[i + 1];
    if (y >= y0 && y <= y1) return lerp(r0, r1, (y - y0) / Math.max(1e-6, y1 - y0));
  }
  return 0;
}
// pedaço do tronco entre y0 e y1 (unidades do tronco), opcionalmente só uma fatia na frente (phi)
// off: afasta da pele (roupa por cima); flare: [y onde começa, quanto abre] alarga a barra de baixo
export function torsoG(P, o = {}) {
  const w = P.tw, ky = P.ky, td = P.td;
  const full = smoothPts(torsoProf(P), LOW ? 2 : 3);
  const y0 = o.y0 ?? -1, y1 = o.y1 ?? 1;
  const pts = [];
  for (let i = 0; i < full.length; i++) {
    const [r, y] = full[i];
    if (y < y0 || y > y1) continue;
    if (!pts.length && i > 0 && y > y0) pts.push([profR(full, y0), y0]);
    pts.push([r, y]);
  }
  if (pts.length && pts[pts.length - 1][1] < y1 && y1 < 0.415) pts.push([profR(full, y1), y1]);
  const off = o.off || 0, fl = o.flare;
  const v2 = pts.map(([r, y]) => new THREE.Vector2(Math.max(1e-4, r + off + (fl ? fl[1] * sstep(fl[0], y0, y) : 0)), y));
  const g = new THREE.LatheGeometry(v2, o.n || (LOW ? 12 : 18), o.phi0 ?? 0, o.phiL ?? Math.PI * 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = Math.hypot(x, z);
    const c = r > 1e-5 ? z / r : 0;
    p.setXYZ(i, x * w, y * ky, z * w * td + torsoDZ(P, y, c) * (1 + off * 4));
  }
  g.computeVertexNormals(); weldNormals(g);
  return g;
}
// ponto da superfície do tronco (unidades do tronco -> corpo, sem a altura da cintura)
export function torsoPt(P, full, phi, y, off = 0, out = new THREE.Vector3()) {
  const r = profR(full, y) + off, x = Math.sin(phi) * r, z = Math.cos(phi) * r;
  return out.set(x * P.tw, y * P.ky, z * P.tw * P.td + torsoDZ(P, y, Math.cos(phi)));
}
// alça: tubo que segue uma lista de pontos
export function strapG(pts, r) {
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  return new THREE.TubeGeometry(curve, LOW ? 16 : 26, r, LOW ? 4 : 6, false);
}
export const HEADK = {
  adult: { jaw: 0.3, wide: 1, tall: 1.06, deep: 0.97, chin: 0.05 },
  kid: { jaw: 0.16, wide: 1.03, tall: 1.0, deep: 0.98, chin: 0.02 },
  wide: { jaw: 0.12, wide: 1.07, tall: 1.03, deep: 1.0, chin: 0.02 },
  elder: { jaw: 0.22, wide: 0.98, tall: 1.1, deep: 0.97, chin: 0.04 },
  cat: { jaw: 0.25, wide: 1.2, tall: 0.88, deep: 0.92, chin: 0 },
  dog: { jaw: 0.12, wide: 1.06, tall: 0.95, deep: 1.0, chin: 0 },
};
function deformPt(v, k) {
  const t = Math.max(0, -v.y);
  const nar = 1 - k.jaw * Math.pow(t, 1.6);
  v.x *= nar * k.wide;
  v.z *= (1 - k.jaw * 0.35 * Math.pow(t, 1.6)) * k.deep;
  if (v.z > 0) v.z += k.chin * t * t * v.z;
  v.y *= k.tall;
  return v;
}
// cabeça (esfera deformada) + capa do rosto alinhada à mesma grade, um pouco acima da pele
export function headGeos(kind) {
  const key = 'head' + kind; if (_gc.has(key)) return _gc.get(key);
  const k = HEADK[kind], W = LOW ? 20 : 24, Hs = LOW ? 12 : 16;
  const head = new THREE.SphereGeometry(1, W, Hs);
  const stepP = 360 / W, nP = Math.floor(75 / stepP), stepT = 180 / Hs, t0 = 2, t1 = Hs - 1;
  const cap = new THREE.SphereGeometry(1, nP * 2, t1 - t0, (90 - nP * stepP) * D2R, nP * 2 * stepP * D2R, t0 * stepT * D2R, (t1 - t0) * stepT * D2R);
  const v = new THREE.Vector3();
  for (const [g, sc] of [[head, 1], [cap, 1.012]]) {
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      if (g === cap) uv.setXY(i, 0.5 + v.x * 0.5, 0.5 + v.y * 0.5);
      deformPt(v, k).multiplyScalar(sc);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals(); weldNormals(g);
  }
  const out = { head, cap };
  _gc.set(key, out);
  return out;
}
// casca de cabelo: borda (franja/nuca) varia com o rumo; zigue-zague faz as mechas; vira cortina abaixo do equador
export function shellGeo(o) {
  const key = 'sh' + JSON.stringify(o) + LOW; if (_gc.has(key)) return _gc.get(key);
  const NP = LOW ? 28 : 40, NT = LOW ? 7 : 9, th = o.th ?? 0.14, EQ = Math.PI / 2, r0 = o.r ?? 1.1;
  const edgeAt = (phi) => { const a = Math.cos(phi), w = a * Math.abs(a); return a >= 0 ? lerp(o.side, o.front, w) : lerp(o.side, o.back, -w); };
  const zigAt = (phi) => { const a = Math.cos(phi); return a >= 0 ? lerp(o.zigS ?? 0.08, o.zigF ?? 0.2, a * a) : lerp(o.zigS ?? 0.08, o.zigB ?? 0.05, a * a); };
  const point = (phi, theta, inner) => {
    let rad = r0;
    if (o.bump) rad *= 1 + o.bump * (vnoise3(Math.sin(phi) * 2.6 + (o.seed || 0), theta * 2.4, Math.cos(phi) * 2.6) - 0.5) * 2;
    if (o.puff) rad *= 1 + o.puff * Math.sin(Math.min(theta, EQ));
    if (o.flat) rad *= 1 - o.flat * Math.pow(Math.cos(Math.min(theta, EQ)), 2);
    if (inner) rad -= th;
    let y, h;
    if (theta <= EQ) { y = Math.cos(theta) * rad * 1.06; h = Math.sin(theta) * rad; }
    else { y = -(theta - EQ) * (o.drop ?? 1.15); h = rad * (1 - (o.taper ?? 0.05) * (theta - EQ)); }
    return new THREE.Vector3(Math.sin(phi) * h * (o.wide || 1), y, Math.cos(phi) * h);
  };
  const P = [], I = [];
  const push = (v) => { P.push(v.x, v.y, v.z); return P.length / 3 - 1; };
  const grid = (inner) => {
    const pole = push(new THREE.Vector3(0, (r0 - (inner ? th : 0)) * 1.06 * (1 - (o.flat || 0)), 0));
    const ids = [];
    for (let i = 0; i < NP; i++) {
      const phi = i / NP * Math.PI * 2;
      const e = edgeAt(phi) + zigAt(phi) * (i % 2 ? 1 : -0.5);
      const col = [];
      for (let j = 1; j <= NT; j++) col.push(push(point(phi, e * j / NT, inner)));
      ids.push(col);
    }
    return { pole, ids };
  };
  const O = grid(false), In = grid(true);
  const V = (i) => new THREE.Vector3(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
  const tri = (a, b, c, want) => {
    const A = V(a), n = V(b).sub(A).cross(V(c).sub(A));
    if (n.dot(want) < 0) I.push(a, c, b); else I.push(a, b, c);
  };
  const cen = (a, b, c) => V(a).add(V(b)).add(V(c)).multiplyScalar(1 / 3).setY(0).addScaledVector(Y, 0.0001 + Math.max(0, V(a).y) * 0.6);
  for (const [S, sgn] of [[O, 1], [In, -1]]) {
    for (let i = 0; i < NP; i++) {
      const i2 = (i + 1) % NP, A = S.ids[i], B = S.ids[i2];
      { const w = cen(S.pole, A[0], B[0]).multiplyScalar(sgn); tri(S.pole, A[0], B[0], w.lengthSq() < 1e-8 ? Y.clone().multiplyScalar(sgn) : w); }
      for (let j = 0; j < NT - 1; j++) {
        const w = cen(A[j], A[j + 1], B[j + 1]).multiplyScalar(sgn);
        tri(A[j], A[j + 1], B[j + 1], w); tri(A[j], B[j + 1], B[j], w);
      }
    }
  }
  // aro entre a borda de fora e a de dentro
  for (let i = 0; i < NP; i++) {
    const i2 = (i + 1) % NP, a = O.ids[i][NT - 1], b = O.ids[i2][NT - 1], c = In.ids[i2][NT - 1], d = In.ids[i][NT - 1];
    const w = V(a).sub(V(O.ids[i][NT - 2]));
    tri(a, b, c, w); tri(a, c, d, w);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setIndex(I); g.computeVertexNormals();
  _gc.set(key, g);
  return g;
}
// penteados (unidades da cabeça, raio 1)
export const HAIR = {
  bob: { shell: { front: 1.32, side: 2.05, back: 2.15, zigF: 0.24, zigS: 0.12, zigB: 0.07 } },
  pony: { shell: { front: 1.28, side: 1.75, back: 1.7, zigF: 0.22, zigS: 0.1, zigB: 0.04, r: 1.08 }, tail: 'pony' },
  bun: { shell: { front: 1.12, side: 1.62, back: 1.72, zigF: 0.08, zigS: 0.04, zigB: 0.03, r: 1.06, th: 0.1 }, bun: true },
  buns: { shell: { front: 1.3, side: 1.72, back: 1.85, zigF: 0.2, zigS: 0.08, zigB: 0.05, r: 1.08 }, buns: true },
  long: { shell: { front: 1.3, side: 2.5, back: 3.4, zigF: 0.2, zigS: 0.1, zigB: 0.08, taper: 0.03 } },
  braid: { shell: { front: 1.18, side: 1.7, back: 1.8, zigF: 0.12, zigS: 0.06, zigB: 0.04, r: 1.07 }, tail: 'braid' },
  short: { shell: { front: 1.12, side: 1.58, back: 1.95, zigF: 0.2, zigS: 0.1, zigB: 0.08, r: 1.09 }, spikes: 4 },
  spiky: { shell: { front: 1.05, side: 1.55, back: 1.9, zigF: 0.28, zigS: 0.14, zigB: 0.1, r: 1.11 }, spikes: 9 },
  slick: { shell: { front: 0.98, side: 1.56, back: 1.86, zigF: 0.0, zigS: 0.03, zigB: 0.05, r: 1.07, th: 0.1 } },
  buzz: { shell: { front: 1.02, side: 1.6, back: 1.9, zigF: 0.02, zigS: 0.02, zigB: 0.02, r: 1.035, th: 0.06 } },
  curly: { shell: { front: 1.18, side: 1.75, back: 1.95, zigF: 0.14, zigS: 0.1, zigB: 0.1, r: 1.16, bump: 0.09, seed: 3 } },
  afro: { shell: { front: 1.1, side: 1.7, back: 1.95, zigF: 0.05, zigS: 0.05, zigB: 0.05, r: 1.12, bump: 0.08, seed: 5 }, afro: true },
  puff: { shell: { front: 1.05, side: 1.62, back: 1.85, zigF: 0.02, zigS: 0.02, zigB: 0.02, r: 1.06, th: 0.09, bump: 0.05, seed: 8 }, puff: true },
  bald: { sides: true },
};
const HAIR_NAMES = { bob: 'Chanel com franja', pony: 'Rabo de cavalo', bun: 'Coque', buns: 'Dois coquinhos', long: 'Comprido', braid: 'Trança', short: 'Curtinho', spiky: 'Espetado', curly: 'Cacheado', afro: 'Black power', puff: 'Puff' };
