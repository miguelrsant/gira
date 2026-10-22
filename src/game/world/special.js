// ---------------- peças especiais ----------------
import * as THREE from 'three';
import { R } from '../core/config.js';
import { C, tmpV, tmpV2 } from '../core/math.js';
import { scene } from '../core/renderer.js';
import { MAT } from './chunks.js';
import { SM } from './furniture.js';
import { Geo, GEO, HULL, TM } from './geo.js';
import { addRailing, ctxPoint, G, K, placeDir } from './kit.js';
import { DYN, solid } from './places.js';
import { PLATFORMS, waterMat } from './terrain.js';
import { texDoor, texSign } from './textures.js';

export function plazaDisc(c, r) {
  const g = G(c, { layer: 'road' }), n = 40, y = 0.06;
  const P = (a, rr2, yy) => ctxPoint(c, Math.cos(a) * rr2, yy, Math.sin(a) * rr2, new THREE.Vector3());
  const cen = ctxPoint(c, 0, y, 0, new THREE.Vector3());
  const col1 = C('#d2d0c2'), col2 = C('#b9b4a4');
  for (let k = 0; k < n; k++) {
    const a0 = k / n * Math.PI * 2, a1 = (k + 1) / n * Math.PI * 2;
    const p0 = P(a0, r, y), p1 = P(a1, r, y);
    g.quad(cen, p1, p0, cen, col1, { pat: 6, id: 2, q: [[0, 0], [Math.cos(a1) * r, Math.sin(a1) * r], [Math.cos(a0) * r, Math.sin(a0) * r], [0, 0]] });
    g.quad(P(a0, r, y), P(a1, r, y), P(a1, r, -1.2), P(a0, r, -1.2), col2, { id: 2 });
  }
}
export function fieldLine(c, x0, z0, x1, z1) {
  const g = G(c, { layer: 'road' }), w = 0.07, y = 0.03;
  const dx = x1 - x0, dz = z1 - z0, l = Math.hypot(dx, dz), nx = -dz / l * w, nz = dx / l * w;
  const A = ctxPoint(c, x0 - nx, y, z0 - nz, new THREE.Vector3()), B = ctxPoint(c, x0 + nx, y, z0 + nz, new THREE.Vector3());
  const Cc = ctxPoint(c, x1 + nx, y, z1 + nz, new THREE.Vector3()), D = ctxPoint(c, x1 - nx, y, z1 - nz, new THREE.Vector3());
  const up = c.d, n = tmpV.subVectors(B, A).cross(tmpV2.subVectors(D, A));
  if (n.dot(up) >= 0) g.quad(A, B, Cc, D, C('#f4f4ef'), { id: 0 }); else g.quad(A, D, Cc, B, C('#f4f4ef'), { id: 0 });
}
export function poolAt(c, w, d) {
  K.box(c, 0, -1.0, 0, w + 0.6, 1.1, d + 0.6, '#e9ebe4', { id: 5, pat: 6 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), waterMat.clone());
  const dep = new Float32Array(4).fill(1.3); m.geometry.setAttribute('aDepth', new THREE.BufferAttribute(dep, 1));
  m.material.uniforms = THREE.UniformsUtils.clone(waterMat.uniforms);
  m.material.uniforms.cShallow.value.set('#7fd6e0'); m.material.uniforms.cDeep.value.set('#4fb3cf');
  const L = new THREE.Matrix4().compose(new THREE.Vector3(0, 0.12, 0), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2), new THREE.Vector3(1, 1, 1));
  m.matrixAutoUpdate = false; m.matrix.copy(c.W).multiply(L); m.matrixWorldNeedsUpdate = true;
  scene.add(m); DYN.pools = DYN.pools || []; DYN.pools.push(m);
  PLATFORMS.push({ test: () => null });
}
export function loungeChair(c) {
  solid(c, 0, 0.1, 0, 0.75, 1.6);
  // assento (z de -0.3 a 0.9) e encosto subindo para trás a partir da ponta do assento
  K.box(c, 0, 0.22, 0.3, 0.7, 0.08, 1.2, '#f4f4ef', { id: 3 });
  K.boxc(c, 0, 0.3 + Math.sin(0.9) * 0.4, -0.3 - Math.cos(0.9) * 0.4, 0.7, 0.08, 0.8, '#f4f4ef', { id: 3, rx: 0.9 });
  K.boxc(c, 0, 0.36 + Math.sin(0.9) * 0.38, -0.27 - Math.cos(0.9) * 0.38, 0.62, 0.05, 0.74, '#66bde6', { id: 7, rx: 0.9 });
  for (const [x, z] of [[-0.3, 0.8], [0.3, 0.8], [-0.3, -0.2], [0.3, -0.2]]) K.box(c, x, 0, z, 0.05, 0.24, 0.05, '#c9cdc2', SM);
  K.box(c, 0, 0.3, 0.3, 0.62, 0.05, 1.1, '#66bde6', { id: 7 });
}
export function lighthouse(c) {
  const segs = 6;
  for (let i = 0; i < segs; i++) K.cyl(c, 0, -0.4 + i * 1.2, 0, 1.15 - i * 0.07, 1.22, i % 2 ? '#f4f4ef' : '#c25959', { n: 14, top: (1.15 - (i + 1) * 0.07) / (1.15 - i * 0.07), id: 4 });
  K.cyl(c, 0, 6.8, 0, 0.95, 0.15, '#4b5658', { n: 14 });
  K.cyl(c, 0, 6.95, 0, 0.6, 0.9, '#f6e7b5', { n: 10, id: 6 });
  K.cyl(c, 0, 7.85, 0, 0.75, 0.7, '#c25959', { n: 12, top: 0.1 });
  K.pl(c, 0, 0.9, 1.13, 0.75, 1.4, texDoor('wood', '#4f86b8'), { id: 6 });
  addRailing(c, -0.9, 0.9, 6.95, 0.9, 0.5);
}
export function hammock(c1, c2) {
  const a = ctxPoint(c1, 0, 1.2, 0), b = ctxPoint(c2, 0, 1.2, 0);
  const mid = a.clone().lerp(b, 0.5), up = mid.clone().normalize();
  const fwd = b.clone().sub(a).normalize();
  const hc = placeDir(up, fwd, { h: mid.length() - R - 0.55 });
  const len = a.distanceTo(b) - 0.3;
  K.box(hc, 0, 0, 0, 0.9, 0.06, len * 0.6, '#de794e', { id: 7 });
  K.boxc(hc, 0, 0.35, len * 0.4, 0.05, 0.05, len * 0.25, '#e9e6dc', { rx: -0.9 });
  K.boxc(hc, 0, 0.35, -len * 0.4, 0.05, 0.05, len * 0.25, '#e9e6dc', { rx: 0.9 });
}
export function scarecrow(c, x, z) {
  K.cyl(c, x, 0, z, 0.05, 1.8, '#8e6c4b', { n: 5 });
  K.boxc(c, x, 1.35, z, 1.2, 0.06, 0.06, '#8e6c4b');
  K.box(c, x, 0.9, z, 0.5, 0.6, 0.25, '#4f86b8', { id: 7 });
  K.sph(c, x, 1.75, z, 0.2, 0.22, 0.2, '#e9d7a0', { id: 7 });
  K.cyl(c, x, 1.9, z, 0.34, 0.06, '#c9a24f', { n: 10 }); K.cyl(c, x, 1.95, z, 0.17, 0.18, '#c9a24f', { n: 10 });
  K.pl(c, x, 0.95, z + 0.13, 0.4, 0.2, texSign('GIRA', '#de794e', '#f4f4ef', { w: 128, h: 64, font: 'lbl' }), { id: 6 });
}
export function wheelFrame(c) {
  // estrutura fixa; a roda gira à parte
  for (const sx of [-1, 1]) {
    K.boxc(c, sx * 1.55, 1.9, -0.9, 0.18, 4.2, 0.18, '#c25959', { rx: 0.42 });
    K.boxc(c, sx * 1.55, 1.9, 0.9, 0.18, 4.2, 0.18, '#c25959', { rx: -0.42 });
    K.box(c, sx * 1.55, -0.2, 0, 0.3, 0.3, 3.6, '#a94e4e');
  }
  K.cyl(c, 0, 3.8, 0, 0.16, 3.5, '#4b5658', { rz: Math.PI / 2, center: true, n: 10 });
  K.board(c, 2.9, 1.25, 1.9, 1.3, 0.55, texSign('RODA Nº 1', '#f4f4ef', '#c25959', { font: 'lbl', w: 256, h: 112 }), {});
  K.cyl(c, 2.9, 0, 1.85, 0.04, 1.0, '#4b5658', { n: 5 });
  K.board(c, -2.6, 3.0, 1.6, 1.6, 0.6, texSign('VOLTAS HOJE\n12.384', '#2f3a40', '#f3c258', { font: 'lbl', w: 256, h: 112 }), {});
  K.cyl(c, -2.6, 0, 1.55, 0.05, 2.7, '#4b5658', { n: 5 });
}
export function rowboat(c) {
  const g = new Geo();
  const W = new THREE.Matrix4();
  g.add(HULL, TM(0, 0.32, 0, 1.2, 0.4, 0.55), W, { c: C('#c25959'), id: 4 });
  g.add(GEO.box, TM(0, 0.3, 0, 1.9, 0.05, 0.8), W, { c: C('#b48d63'), id: 3, pat: 3 });
  g.add(GEO.box, TM(0, 0.38, 0, 0.2, 0.06, 0.9), W, { c: C('#8e6c4b'), id: 3 });
  const m = new THREE.Mesh(g.build(), MAT.world);
  m.castShadow = true; m.receiveShadow = true;
  scene.add(m);
  return { mesh: m, base: c.W.clone() };
}
