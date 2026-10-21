// ================= kit de construção =================
// contexto de um objeto colocado no planeta: matriz local (x direita, y cima, z frente)
import * as THREE from 'three';
import { LOW, R } from '../core/config.js';
import { C, dirOf, frameMatrix, headingVec, lerp, rand, Y } from '../core/math.js';
import { chunkGeo, chunkOf } from './chunks.js';
import { blobG, cylG, DOME, GEO, sphG, TM, torG } from './geo.js';
import { groundAt, H } from './terrain.js';
import { texPoster, texWin } from './textures.js';

export function placeDir(d, fwd, o = {}) {
  const up = d.clone().normalize();
  const h = o.h !== undefined ? o.h : H(up);
  const pos = up.clone().multiplyScalar(R + h + (o.lift || 0));
  const W = frameMatrix(pos, up, fwd, new THREE.Matrix4());
  return { W, d: up, fwd: fwd.clone().addScaledVector(up, -fwd.dot(up)).normalize(), h, ch: chunkOf(up), layer: o.layer || 'main' };
}
export function placeAt(lat, lon, heading, o = {}) { const d = dirOf(lat, lon); return placeDir(d, headingVec(d, heading), o); }
// assenta uma peça (x, z) no chão de verdade: sobe ou desce o contexto até o pé encostar
export function drop(c, x, z) {
  const p = ctxPoint(c, x, 0, z), up = p.clone().normalize();
  const dh = p.length() - R - groundAt(up);
  if (dh > 0.6 || dh < -0.35 || Math.abs(dh) < 0.01) return c;
  return subCtx(c, 0, -dh, 0);
}
// sub-contexto deslocado dentro de outro objeto
export function subCtx(c, x, y, z, ry = 0) {
  const L = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(Y, ry), new THREE.Vector3(1, 1, 1));
  return Object.assign({}, c, { W: c.W.clone().multiply(L) });
}
// ponto do mundo a partir de coordenadas locais
export function ctxPoint(c, x, y, z, out = new THREE.Vector3()) { return out.set(x, y, z).applyMatrix4(c.W); }
export function ctxDir(c, x, z) { const p = ctxPoint(c, x, 0, z); return p.normalize(); }
export function G(c, o) { return chunkGeo(c.ch, (o && o.layer) || c.layer); }

// prisma (telhado de duas águas): cumeeira ao longo de x, base em y = 0, largura total em z
const PRISM = (() => {
  const g = new THREE.BufferGeometry();
  const P = [], N = [], UV = [];
  const tri = (a, b, c) => {
    const ab = new THREE.Vector3().subVectors(b, a), ac = new THREE.Vector3().subVectors(c, a), n = ab.cross(ac).normalize();
    for (const p of [a, b, c]) { P.push(p.x, p.y, p.z); N.push(n.x, n.y, n.z); UV.push(p.x + 0.5, p.y); }
  };
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  const A = v(-0.5, 0, 0.5), B = v(0.5, 0, 0.5), Cc = v(0.5, 1, 0), D = v(-0.5, 1, 0), E = v(-0.5, 0, -0.5), F = v(0.5, 0, -0.5);
  tri(A, B, Cc); tri(A, Cc, D);           // água da frente
  tri(F, E, D); tri(F, D, Cc);            // água de trás
  tri(B, F, Cc); tri(E, A, D);            // empenas
  tri(A, E, F); tri(A, F, B);             // base
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
  return g;
})();

export const K = {
  box(c, x, y, z, w, h, d, color, o = {}) { G(c, o).add(GEO.box, TM(x, y + h / 2, z, w, h, d, o.ry || 0, o.rx || 0, o.rz || 0), c.W, { c: C(color), pat: o.pat, id: o.id ?? 4, ps: o.ps, uv: o.uv, sway: o.sway, swayH: o.swayH }); },
  // caixa pelo centro (para peças giradas)
  boxc(c, x, y, z, w, h, d, color, o = {}) { G(c, o).add(GEO.box, TM(x, y, z, w, h, d, o.ry || 0, o.rx || 0, o.rz || 0), c.W, { c: C(color), pat: o.pat, id: o.id ?? 5, uv: o.uv, sway: o.sway, swayH: o.swayH }); },
  cyl(c, x, y, z, r, h, color, o = {}) {
    const g = cylG(o.n || 10, o.top ?? 1, o.open);
    const M = o.center ? TM(x, y, z, r, h, o.rz2 ? r * o.rz2 : r, o.ry || 0, o.rx || 0, o.rz || 0) : TM(x, y + h / 2, z, r, h, o.rz2 ? r * o.rz2 : r, o.ry || 0, o.rx || 0, o.rz || 0);
    G(c, o).add(g, M, c.W, { c: o.cf ? null : C(color), cf: o.cf, id: o.id ?? 5, pat: o.pat, sway: o.sway, swayH: o.swayH, uv: o.uv });
  },
  sph(c, x, y, z, rx, ry, rz, color, o = {}) { G(c, o).add(o.geo || sphG(o.w || 12, o.h || 8), TM(x, y, z, rx, ry, rz, o.ry || 0, o.rx || 0, o.rz || 0), c.W, { c: o.cf ? null : C(color), cf: o.cf, id: o.id ?? 7, sway: o.sway, swayH: o.swayH }); },
  blob(c, x, y, z, sx, sy, sz, cf, o = {}) { G(c, Object.assign({ layer: 'fol' }, o)).add(blobG(o.seed ?? Math.floor(rand() * 6), o.det ?? (LOW ? 1 : 2)), TM(x, y, z, sx, sy, sz, o.ry ?? rand() * 6, 0, 0), c.W, { cf, id: o.id ?? 7, sway: o.sway ?? 1, swayH: o.swayH || 3 }); },
  pl(c, x, y, z, w, h, uv, o = {}) { G(c, o).add(GEO.plane, TM(x, y, z, w, h, 1, o.ry || 0, o.rx || 0, o.rz || 0), c.W, { c: C(o.c || '#ffffff'), uv, id: o.id ?? 6 }); },
  // plano texturizado com moldura em caixa (placas)
  board(c, x, y, z, w, h, uv, o = {}) {
    K.box(c, x, y - h / 2 - 0.03, z - 0.05, w + 0.08, h + 0.06, 0.08, o.frame || '#4b5658', { id: 5, ry: o.ry, layer: o.layer });
    const dz = 0.006;
    if (o.ry) { const s = Math.sin(o.ry), co = Math.cos(o.ry); K.pl(c, x + s * dz, y, z + co * dz, w, h, uv, o); }
    else K.pl(c, x, y, z + dz, w, h, uv, o);
  },
  prism(c, x, y, z, w, h, d, color, o = {}) { G(c, o).add(PRISM, TM(x, y, z, w, h, d, o.ry || 0), c.W, { c: C(color), pat: o.pat, id: o.id ?? 5, ps: o.ps }); },
  tor(c, x, y, z, r, t, color, o = {}) { G(c, o).add(torG(1, t / r, o.rs || 6, o.ts || 18, o.arc || Math.PI * 2), TM(x, y, z, r, r, r, o.ry || 0, o.rx || 0, o.rz || 0), c.W, { c: C(color), id: o.id ?? 5 }); },
};

// ================= peças de fachada =================
export const WALLS = ['#e3d7c0', '#d9c7b8', '#c4cdc5', '#e8c9b4', '#f0dcae', '#bcc7c0', '#e6e1d3', '#a9c2b1', '#dcb9a8', '#cfd8d6', '#efd0a0', '#c8d3b8'];
export const HOUSEW = ['#f0d3a8', '#e8b9a9', '#a9d1c4', '#f3e1b0', '#c9dcae', '#f4f4ef', '#bcd4e6', '#e6c3d0', '#f0c98f', '#d4e4c0'];
export const ROOFS = ['#c4734f', '#b5654a', '#8f9b96', '#a85d4a', '#c98a5e', '#6f8a8e'];
export function addWindow(c, x, y, z, kind, o = {}) {
  const w = o.w || 0.82, h = o.h || 1.05, ry = o.ry || 0;
  K.pl(c, x + Math.sin(ry) * 0.012, y + h / 2, z + Math.cos(ry) * 0.012, w, h, texWin(kind, o.frame), { ry, id: 6 });
  if (ry) return;
  K.box(c, x, y - 0.09, z + 0.04, w + 0.18, 0.09, 0.16, o.sill || '#e9e6dc', { id: 5 });
  if (o.shut) { K.box(c, x - w / 2 - 0.16, y - 0.02, z + 0.03, 0.26, h + 0.04, 0.05, o.shut, { id: 5, pat: 7 }); K.box(c, x + w / 2 + 0.16, y - 0.02, z + 0.03, 0.26, h + 0.04, 0.05, o.shut, { id: 5, pat: 7 }); }
  if (o.lintel) K.box(c, x, y + h + 0.02, z + 0.03, w + 0.14, 0.1, 0.08, o.sill || '#e9e6dc', { id: 5 });
}
export function addAC(c, x, y, z) {
  K.box(c, x, y, z + 0.18, 0.58, 0.42, 0.34, '#e4e7e0', { id: 5, layer: 'small' });
  K.cyl(c, x - 0.05, y + 0.21, z + 0.355, 0.13, 0.01, '#9aa39e', { rx: Math.PI / 2, center: true, n: 10, layer: 'small' });
  K.cyl(c, x + 0.2, y - 0.4, z + 0.08, 0.015, 0.4, '#8d9792', { n: 4, layer: 'small' });
}
export function addTank(c, x, y, z, s = 1) {
  K.box(c, x, y, z, 1.1 * s, 0.25, 1.1 * s, '#b9bdb4', { id: 5 });
  K.cyl(c, x, y + 0.25, z, 0.5 * s, 0.68 * s, '#4f86b8', { n: 14, top: 0.94 });
  K.cyl(c, x, y + 0.25 + 0.68 * s, z, 0.5 * s, 0.1, '#5d95c6', { n: 14, top: 0.7 });
}
export function addAntenna(c, x, y, z) {
  K.cyl(c, x, y, z, 0.03, 1.8, '#7d8a88', { n: 4, layer: 'small' });
  for (let i = 0; i < 3; i++) K.boxc(c, x, y + 1.1 + i * 0.22, z, 0.7 - i * 0.15, 0.03, 0.03, '#7d8a88', { layer: 'small' });
}
export function addDish(c, x, y, z, ry = 0) {
  K.cyl(c, x, y, z, 0.03, 0.5, '#8d9792', { n: 4, layer: 'small' });
  K.sph(c, x, y + 0.55, z, 0.34, 0.34, 0.12, '#e9ebe4', { geo: DOME, rx: -1.2, ry, id: 5, layer: 'small' });
}
export function addSolar(c, x, y, z) {
  K.box(c, x, y, z, 1.2, 0.08, 0.8, '#3d5a73', { rx: -0.45, id: 6, layer: 'small' });
  K.box(c, x, y - 0.25, z + 0.25, 0.06, 0.4, 0.06, '#8d9792', { layer: 'small' });
}
export function addPipe(c, x, y, z, h) { K.cyl(c, x, y, z, 0.05, h, '#8d9792', { n: 6, layer: 'small', id: 5 }); }
export function addPoster(c, x, y, z, kind, ry = 0) { K.pl(c, x, y, z + 0.014, 0.55, 0.75, texPoster(kind), { ry, id: 6 }); }
export function addRailing(c, x0, x1, y, z, h = 0.8, color = '#4b5658') {
  const n = Math.max(2, Math.round((x1 - x0) / 0.24));
  for (let i = 0; i <= n; i++) K.box(c, lerp(x0, x1, i / n), y, z, 0.035, h, 0.035, color, { id: 5, layer: 'small' });
  K.box(c, (x0 + x1) / 2, y + h, z, x1 - x0 + 0.05, 0.06, 0.06, color, { id: 5, layer: 'small' });
}
