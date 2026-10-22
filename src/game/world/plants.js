// ================= vegetação =================
import * as THREE from 'three';
import { C, pickR, rand, rr } from '../core/math.js';
import { TM } from './geo.js';
import { drop, G, K, subCtx } from './kit.js';
import { vnoise3 } from './noise.js';
import { solid } from './places.js';

export const LEAVES = [
  ['#7cb867', '#5d9c55', '#457f47'], ['#8bc06a', '#6aa85a', '#4e8a4c'], ['#6db07a', '#4f9466', '#3b7454'],
  ['#9cc46a', '#79ab57', '#5c8d48'], ['#6aa66e', '#4c8a5a', '#386b47']
].map((a) => a.map(C));
export function leafCF(set) {
  return (x, y, z, nx, ny) => {
    const n = vnoise3(x * 1.7 + 3, y * 1.7, z * 1.7);
    if (ny > 0.42 || (ny > 0.05 && n > 0.62)) return set[0];
    if (ny < -0.3) return set[2];
    return n < 0.3 ? set[2] : set[1];
  };
}
export function tree(c, x, z, s = 1, o = {}) {
  const set = o.leaf || pickR(LEAVES), th = 1.5 * s, top = th + 1.9 * s;
  const lean = rr(-0.08, 0.08);
  c = drop(c, x, z, { radial: true });
  solid(c, x, z, 0.3 * s);
  K.cyl(c, x, 0, z, 0.15 * s, th + 0.5 * s, '#7a6a58', { n: 7, top: 0.55, layer: 'fol', id: 7, sway: 0.25, swayH: top, rz: lean });
  if (rand() < 0.6) K.cyl(c, x + 0.25 * s, th * 0.75, z, 0.06 * s, 0.75 * s, '#7a6a58', { n: 5, top: 0.5, layer: 'fol', id: 7, rz: -0.8, sway: 0.4, swayH: top });
  const nb = 3 + Math.floor(rand() * 3), cf = leafCF(set);
  K.blob(c, x, th + 0.85 * s, z, 1.0 * s, 0.85 * s, 1.0 * s, cf, { swayH: top });
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * Math.PI * 2 + rand(), rad = rr(0.45, 0.8) * s;
    K.blob(c, x + Math.cos(a) * rad, th + rr(0.45, 1.25) * s, z + Math.sin(a) * rad, rr(0.55, 0.8) * s, rr(0.5, 0.7) * s, rr(0.55, 0.8) * s, cf, { swayH: top });
  }
  if (rand() < 0.5) K.blob(c, x, th + 1.55 * s, z, 0.62 * s, 0.55 * s, 0.62 * s, cf, { swayH: top });
}
export function pine(c, x, z, s = 1) {
  const set = LEAVES[4];
  c = drop(c, x, z, { radial: true });
  solid(c, x, z, 0.3 * s);
  K.cyl(c, x, 0, z, 0.12 * s, 1.2 * s, '#6f5f4e', { n: 6, layer: 'fol', id: 7, sway: 0.1, swayH: 4 * s });
  for (let i = 0; i < 3; i++) K.cyl(c, x, (0.8 + i * 0.85) * s, z, (1.1 - i * 0.28) * s, 1.5 * s, null, { n: 8, top: 0.02, layer: 'fol', id: 7, cf: (px, py, pz, nx, ny) => (ny > 0.55 ? set[0] : set[1]), sway: 1, swayH: 4 * s });
}
// coqueiro: folha arqueada com folíolos em serra, dos dois lados (vista de baixo também aparece)
const FROND = (() => {
  const g = new THREE.BufferGeometry(), P = [], N = [], I = [];
  const L = 2.3, segs = 10;
  const ridge = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, x = t * L, y = 0.55 * t * L - 0.95 * t * t * L * 0.75;
    // largura em serra: cada folíolo abre e fecha
    const env = Math.sin(Math.PI * Math.min(1, t * 1.08)) * 0.5 + 0.05;
    const w = env * (i % 2 ? 1 : 0.62);
    ridge.push([x, y, w, t]);
  }
  const push = (x, y, z, nx, ny, nz) => { P.push(x, y, z); N.push(nx, ny, nz); return P.length / 3 - 1; };
  for (const face of [1, -1]) {
    const base = P.length / 3;
    for (const [x, y, w, t] of ridge) {
      const droop = 0.16 * w; // folíolos caem para os lados
      push(x, y - droop, -w, 0, face, -0.35 * face);
      push(x, y + 0.04, 0, 0, face, 0);
      push(x, y - droop, w, 0, face, 0.35 * face);
    }
    for (let i = 0; i < segs; i++) {
      const a = base + i * 3;
      if (face > 0) I.push(a, a + 1, a + 4, a, a + 4, a + 3, a + 1, a + 2, a + 5, a + 1, a + 5, a + 4);
      else I.push(a, a + 4, a + 1, a, a + 3, a + 4, a + 1, a + 5, a + 2, a + 1, a + 4, a + 5);
    }
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setIndex(I);
  return g;
})();
export function palm(c, x, z, s = 1) {
  const segs = 7, bend = rr(0.15, 0.32), dir = rand() * Math.PI * 2;
  c = drop(c, x, z, { radial: true });
  solid(c, x, z, 0.25 * s);
  let px = x, py = 0, pz = z;
  for (let i = 0; i < segs; i++) {
    const a = bend * (i / segs), hh = 0.55 * s;
    K.cyl(c, px, py, pz, (0.15 - i * 0.008) * s, hh + 0.02, i % 2 ? '#a78b67' : '#b39874', { n: 7, layer: 'fol', id: 7, rx: Math.sin(dir) * a, rz: -Math.cos(dir) * a, sway: 0.5, swayH: 4.5 * s });
    px += Math.cos(dir) * Math.sin(a) * hh; pz += Math.sin(dir) * Math.sin(a) * hh; py += Math.cos(a) * hh;
  }
  const set = LEAVES[3];
  // copa: um miolo redondo e duas camadas de folhas (as de baixo mais caídas)
  K.sph(c, px, py + 0.05, pz, 0.26 * s, 0.2 * s, 0.26 * s, set[2], { layer: 'fol', w: 8, h: 6, id: 7, sway: 1, swayH: 4.5 * s });
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2 + rand() * 0.25, low = i % 2;
    const sc = s * (low ? 0.92 : 1.05);
    G(c, { layer: 'fol' }).add(FROND, TM(px, py + (low ? -0.02 : 0.08), pz, sc, sc, sc, a, 0, low ? rr(-0.45, -0.25) : rr(-0.05, 0.15)), c.W, { c: low ? set[1] : set[0], id: 7, sway: 1.3, swayH: 4.5 * s });
  }
  for (let i = 0; i < 3; i++) K.sph(c, px + Math.cos(i * 2) * 0.15, py - 0.12, pz + Math.sin(i * 2) * 0.15, 0.12 * s, 0.12 * s, 0.12 * s, '#8a6a4f', { layer: 'fol', w: 6, h: 5, sway: 1, swayH: 4.5 * s });
}
export function bush(c, x, z, s = 0.7, set) {
  set = set || pickR(LEAVES);
  const cf = leafCF(set);
  for (let i = 0; i < 3; i++) K.blob(c, x + rr(-0.35, 0.35) * s, (0.45 + rr(-0.1, 0.15)) * s, z + rr(-0.35, 0.35) * s, rr(0.55, 0.8) * s, rr(0.45, 0.65) * s, rr(0.55, 0.8) * s, cf, { sway: 0.4, swayH: 1.5, det: 1 });
}
function hedge(c, x, z, len, ry = 0) {
  const s = subCtx(c, x, 0, z, ry), cf = leafCF(LEAVES[2]);
  const n = Math.max(1, Math.round(len / 0.9));
  for (let i = 0; i < n; i++) K.blob(s, -len / 2 + (i + 0.5) * len / n, 0.5, 0, 0.6, 0.55, 0.45, cf, { sway: 0.2, swayH: 1.5, det: 1 });
}
export function flowers(c, x, z) {
  bush(c, x, z, 0.5);
  const cols = ['#f4f4ef', '#f3c258', '#e7a58c', '#c25959', '#b9a3e3'];
  const fc = pickR(cols);
  for (let i = 0; i < 6; i++) K.sph(c, x + rr(-0.35, 0.35), rr(0.45, 0.62), z + rr(-0.35, 0.35), 0.07, 0.07, 0.07, fc, { layer: 'fol', w: 6, h: 4, sway: 0.4, swayH: 1.5 });
}
