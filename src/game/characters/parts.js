// ---------------- geometrias ----------------
import * as THREE from 'three';
import { LOW } from '../core/config.js';
import { D2R, lerp, Y } from '../core/math.js';
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
