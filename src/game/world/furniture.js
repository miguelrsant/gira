// ================= mobiliário urbano (camada de detalhes) =================
import { C, lerp, pickR, rand, rr } from '../core/math.js';
import { HULL } from './geo.js';
import { ctxDir, ctxPoint, drop, K, subCtx } from './kit.js';
import { BENCHES, solid } from './places.js';
import { leafCF, LEAVES } from './plants.js';
import { texVending, texWin } from './textures.js';

export const SM = { layer: 'small' };
export function lampPost(c, x, z) {
  c = drop(c, x, z, { radial: true });
  solid(c, x, z, 0.14);
  K.cyl(c, x, 0, z, 0.07, 3.6, '#4b5658', { n: 6, layer: 'small' });
  K.cyl(c, x, 3.55, z + 0.3, 0.05, 0.7, '#4b5658', { rx: Math.PI / 2, center: true, n: 5, layer: 'small' });
  K.box(c, x, 3.38, z + 0.6, 0.3, 0.14, 0.42, '#4b5658', { layer: 'small' });
  K.box(c, x, 3.33, z + 0.6, 0.22, 0.05, 0.32, '#f6e7b5', { id: 6, layer: 'small' });
}
// poste com fios: devolve o ponto de amarração
export function utilPole(c, x, z) {
  c = drop(c, x, z, { radial: true });
  solid(c, x, z, 0.18);
  K.cyl(c, x, 0, z, 0.11, 6.2, '#8d968f', { n: 7, top: 0.75, layer: 'small' });
  K.boxc(c, x, 5.6, z, 1.5, 0.1, 0.1, '#6f7a74', { layer: 'small' });
  K.boxc(c, x, 5.0, z, 1.1, 0.08, 0.08, '#6f7a74', { layer: 'small' });
  if (rand() < 0.4) K.cyl(c, x + 0.25, 4.3, z + 0.18, 0.2, 0.55, '#9aa39e', { n: 8, layer: 'small' });
  for (const sx of [-0.6, 0, 0.6]) K.cyl(c, x + sx, 5.65, z, 0.04, 0.12, '#e9e6dc', { n: 5, layer: 'small' });
  return [ctxPoint(c, x - 0.6, 5.72, z), ctxPoint(c, x, 5.72, z), ctxPoint(c, x + 0.6, 5.72, z), ctxPoint(c, x, 5.06, z)];
}
export function trashBin(c, x, z) { c = drop(c, x, z); solid(c, x, z, 0.3); K.cyl(c, x, 0, z, 0.25, 0.75, '#5a8f73', { n: 10, top: 1.1, layer: 'small' }); K.cyl(c, x, 0.75, z, 0.29, 0.07, '#4b7a62', { n: 10, layer: 'small' }); }
export function hydrant(c, x, z) { c = drop(c, x, z); solid(c, x, z, 0.16); K.cyl(c, x, 0, z, 0.13, 0.55, '#c25959', { n: 8, layer: 'small' }); K.sph(c, x, 0.55, z, 0.13, 0.1, 0.13, '#c25959', { layer: 'small', w: 8, h: 5 }); K.cyl(c, x, 0.35, z, 0.05, 0.42, '#f3c258', { rz: Math.PI / 2, center: true, n: 6, layer: 'small' }); }
export function cone(c, x, z) { c = drop(c, x, z); solid(c, x, z, 0.22); K.cyl(c, x, 0, z, 0.2, 0.6, '#de794e', { n: 10, top: 0.15, layer: 'small' }); K.cyl(c, x, 0.28, z, 0.15, 0.1, '#f4f4ef', { n: 10, top: 0.85, layer: 'small' }); K.box(c, x, 0, z, 0.46, 0.05, 0.46, '#de794e', SM); }
export function bollard(c, x, z) { c = drop(c, x, z); solid(c, x, z, 0.12); K.cyl(c, x, 0, z, 0.09, 0.8, '#f3c258', { n: 8, layer: 'small' }); K.cyl(c, x, 0.55, z, 0.095, 0.1, '#373f42', { n: 8, layer: 'small' }); }
export function bench(c, x, z, ry = 0, o = {}) {
  c = drop(c, x, z);
  solid(c, x, z, 0, 1.75, 0.6, ry);
  const s = subCtx(c, x, 0, z, ry);
  if (!o.occupy) BENCHES.push({ d: ctxDir(s, 0, 0), fwd: s.fwd.clone(), h: s.h });
  for (let i = 0; i < 3; i++) K.box(s, 0, 0.44, -0.12 + i * 0.13, 1.8, 0.06, 0.11, '#b48d63', { id: 3, layer: 'small' });
  for (let i = 0; i < 2; i++) K.box(s, 0, 0.66 + i * 0.16, -0.27, 1.8, 0.1, 0.05, '#b48d63', { id: 3, layer: 'small', rx: -0.15 });
  for (const sx of [-0.75, 0.75]) { K.box(s, sx, -0.5, 0, 0.07, 0.94, 0.42, '#4b5658', { layer: 'small' }); K.box(s, sx, 0.44, -0.27, 0.07, 0.45, 0.06, '#4b5658', { layer: 'small' }); }
}
export function vending(c, x, z, kind, ry = 0) {
  c = drop(c, x, z);
  solid(c, x, z, 0, 0.95, 0.75, ry);
  const s = subCtx(c, x, 0, z, ry);
  const bg = kind === 'foco' ? '#f3c258' : kind === 'cafe' ? '#c25959' : '#66bde6';
  K.box(s, 0, -0.5, 0, 0.95, 2.35, 0.75, bg, { id: 4 });
  K.pl(s, 0, 0.93, 0.38, 0.85, 1.7, texVending(kind), { id: 6 });
}
export function pot(c, x, z, s = 1) { c = drop(c, x, z); solid(c, x, z, 0.28 * s); K.cyl(c, x, 0, z, 0.22 * s, 0.36 * s, '#c9744f', { n: 9, top: 1.25, layer: 'small' }); K.blob(c, x, 0.5 * s, z, 0.3 * s, 0.32 * s, 0.3 * s, leafCF(LEAVES[1]), { sway: 0.3, swayH: 1, det: 1 }); }
export function planter(c, x, z, w = 2) { c = drop(c, x, z); solid(c, x, z, 0, w, 0.6); K.box(c, x, -0.5, z, w, 1.0, 0.6, '#b9b4a4', { id: 5, layer: 'small', pat: 2 }); for (let i = 0; i < Math.round(w / 0.6); i++) K.blob(c, x - w / 2 + 0.3 + i * 0.6, 0.62, z, 0.36, 0.3, 0.3, leafCF(LEAVES[i % 3]), { sway: 0.2, swayH: 1, det: 1 }); }
export function crate(c, x, z, s = 0.7, ry = 0) { c = drop(c, x, z); solid(c, x, z, 0, s, s, ry); K.box(c, x, 0, z, s, s, s, '#b48d63', { id: 3, pat: 3, layer: 'small', ry }); }
export function barrel(c, x, z, color = '#4f86b8') { c = drop(c, x, z); solid(c, x, z, 0.32); K.cyl(c, x, 0, z, 0.3, 0.9, color, { n: 12, layer: 'small' }); K.cyl(c, x, 0.3, z, 0.31, 0.05, '#4b5658', { n: 12, layer: 'small' }); K.cyl(c, x, 0.65, z, 0.31, 0.05, '#4b5658', { n: 12, layer: 'small' }); }
export function gasCyl(c, x, z) { c = drop(c, x, z); solid(c, x, z, 0.2); K.cyl(c, x, -0.2, z, 0.18, 0.7, '#c25959', { n: 10, layer: 'small' }); K.sph(c, x, 0.5, z, 0.18, 0.1, 0.18, '#c25959', { layer: 'small', w: 8, h: 5 }); }
export function rock(c, x, z, s = 1, y = 0) { if (s > 0.7) solid(c, x, z, s * 0.55); K.blob(c, x, y + s * 0.2, z, s * rr(0.6, 1.0), s * rr(0.35, 0.6), s * rr(0.6, 1.0), () => C(rand() < 0.5 ? '#a7aea6' : '#9aa39a'), { layer: 'main', sway: 0, det: 1, id: 7 }); }
export function signPost(c, x, z, uv, w = 0.8, h = 0.8, ry = 0) {
  c = drop(c, x, z, { radial: true });
  solid(c, x, z, 0.1);
  const s = subCtx(c, x, 0, z, ry);
  K.cyl(s, 0, -0.35, 0, 0.04, 2.75, '#7d8a88', { n: 5, layer: 'small' });
  K.board(s, 0, 2.15, 0.06, w, h, uv, { layer: 'small' });
}
export function fence(c, x0, x1, z, h = 1.0, color = '#f4f4ef') {
  const n = Math.max(1, Math.round((x1 - x0) / 0.3));
  for (let i = 0; i <= n; i++) {
    const xi = lerp(x0, x1, i / n);
    const pc = drop(c, xi, z);
    K.box(pc, xi, -0.35, z, 0.08, h + 0.35, 0.05, color, { id: 3, layer: 'small' });
  }
  const mc = drop(c, (x0 + x1) / 2, z);
  K.box(mc, (x0 + x1) / 2, h * 0.65, z - 0.04, x1 - x0, 0.08, 0.04, color, { id: 3, layer: 'small' });
  // cerca é parede: sem colisor a Duda atravessava a da horta e a do portão da mansão
  solid(mc, (x0 + x1) / 2, z, 0, x1 - x0 + 0.1, 0.16);
}
export function guardRail(c, x0, x1, z) {
  const n = Math.max(1, Math.round(Math.abs(x1 - x0) / 2));
  for (let i = 0; i <= n; i++) {
    const xi = lerp(x0, x1, i / n);
    const pc = drop(c, xi, z);
    K.box(pc, xi, -0.35, z, 0.1, 1.1, 0.1, '#e9ebe4', { layer: 'small' });
  }
  const mc = drop(c, (x0 + x1) / 2, z);
  K.box(mc, (x0 + x1) / 2, 0.45, z + 0.06, Math.abs(x1 - x0), 0.28, 0.04, '#e9ebe4', { layer: 'small', id: 5 });
  solid(mc, (x0 + x1) / 2, z, 0, Math.abs(x1 - x0) + 0.1, 0.22);
}
// carrinho redondo de desenho animado
const CARC = ['#e8b9a9', '#66bde6', '#f3c258', '#8cc48c', '#f4f4ef', '#c25959', '#a9c2b1'];
export function car(c, x, z, ry = 0, color) {
  c = drop(c, x, z);
  solid(c, x, z, 0, 2.15, 1.15, ry);
  const s = subCtx(c, x, 0, z, ry), body = color || pickR(CARC), glass = C('#4d6670'), bc = C(body);
  K.sph(s, 0, 0.55, 0, 1.06, 0.37, 0.56, body, { id: 4, w: 16, h: 10 });
  K.sph(s, -0.1, 0.88, 0, 0.62, 0.37, 0.48, null, { id: 6, w: 14, h: 9, cf: (px, py, pz, nx, ny) => (ny < 0.75 && py > 0.88 ? glass : bc) });
  // para-choques cromados, grade dianteira, placa e retrovisores
  K.boxc(s, 1.04, 0.34, 0, 0.12, 0.11, 0.98, '#e9ebe4', { id: 5, layer: 'small' });
  K.boxc(s, -1.04, 0.34, 0, 0.12, 0.11, 0.98, '#e9ebe4', { id: 5, layer: 'small' });
  K.boxc(s, 1.03, 0.48, 0, 0.06, 0.12, 0.44, '#373f42', { id: 6, layer: 'small' });
  K.boxc(s, 1.09, 0.33, 0, 0.04, 0.1, 0.28, '#f4f4ef', { id: 6, layer: 'small' });
  for (const sz of [-1, 1]) {
    K.sph(s, 1.0, 0.58, sz * 0.33, 0.065, 0.075, 0.085, '#f6e7b5', { id: 6, w: 6, h: 5 });
    K.boxc(s, -1.0, 0.55, sz * 0.34, 0.06, 0.1, 0.14, '#c25959', { id: 6, layer: 'small' });
    K.sph(s, 0.24, 0.82, sz * 0.53, 0.05, 0.045, 0.07, body, { id: 5, w: 6, h: 4, layer: 'small' });
  }
  for (const [wx, wz] of [[-0.62, 0.47], [0.62, 0.47], [-0.62, -0.47], [0.62, -0.47]]) {
    K.cyl(s, wx, 0.25, wz, 0.25, 0.19, '#373f42', { rx: Math.PI / 2, center: true, n: 12, id: 7 });
    K.cyl(s, wx, 0.25, wz + Math.sign(wz) * 0.065, 0.12, 0.08, '#e9ebe4', { rx: Math.PI / 2, center: true, n: 8, id: 5 });
  }
}
export function bike(c, x, z, ry = 0, color) {
  c = drop(c, x, z);
  solid(c, x, z, 0, 1.3, 0.34, ry);
  const s = subCtx(c, x, 0, z, ry), F = color || pickR(['#c25959', '#66bde6', '#f3c258', '#5a8f73']);
  for (const wx of [-0.45, 0.45]) {
    K.tor(s, wx, 0.34, 0, 0.3, 0.036, '#373f42', { ts: 16, rs: 5, layer: 'small' });
    K.cyl(s, wx, 0.34, 0, 0.04, 0.06, '#d9dcd3', { rx: Math.PI / 2, center: true, n: 6, layer: 'small' });
  }
  K.boxc(s, 0, 0.5, 0, 0.82, 0.048, 0.048, F, { rz: 0.15, layer: 'small' });
  K.boxc(s, -0.15, 0.56, 0, 0.048, 0.46, 0.048, F, { rz: 0.3, layer: 'small' });
  K.boxc(s, 0.34, 0.6, 0, 0.045, 0.5, 0.045, F, { rz: -0.22, layer: 'small' });
  K.boxc(s, -0.22, 0.8, 0, 0.22, 0.055, 0.13, '#373f42', { layer: 'small' });
  K.boxc(s, -0.45, 0.68, 0, 0.26, 0.035, 0.12, F, { layer: 'small' });
  K.boxc(s, 0.38, 0.86, 0, 0.045, 0.045, 0.42, '#4b5658', { layer: 'small' });
  for (const sz of [-0.2, 0.2]) K.cyl(s, 0.38, 0.86, sz, 0.028, 0.09, '#373f42', { rx: Math.PI / 2, center: true, n: 6, layer: 'small' });
  // cestinha de vime na frente
  K.boxc(s, 0.5, 0.72, 0, 0.18, 0.17, 0.24, '#c9a26b', { id: 3, pat: 3, layer: 'small' });
  K.boxc(s, -0.08, 0.16, 0.08, 0.03, 0.34, 0.03, '#4b5658', { rx: 0.38, layer: 'small' });
}
export function umbrella(c, x, z, c1 = '#f4f4ef', c2 = '#c25959') {
  c = drop(c, x, z, { radial: true });
  solid(c, x, z, 0.1);
  K.cyl(c, x, -0.35, z, 0.04, 2.45, '#e9e6dc', { n: 5, layer: 'small' });
  const A = C(c1), B = C(c2);
  K.cyl(c, x, 1.85, z, 1.2, 0.45, null, { n: 12, top: 0.02, id: 7, cf: (px, py, pz) => (Math.floor((Math.atan2(pz - z, px - x) + Math.PI) / (Math.PI / 4)) % 2 ? A : B) });
}
export function towel(c, x, z, ry, color) { c = drop(c, x, z); K.box(c, x, 0.02, z, 0.84, 0.025, 1.74, color, { ry, id: 7, layer: 'small' }); }
export function boat(c, x, z, ry = 0, o = {}) {
  const s = subCtx(c, x, o.y || 0, z, ry), W = C('#f4f4ef'), B = C(o.color || '#3f8fc2');
  K.sph(s, 0, 0.62, 0, 2.2, 0.75, 0.85, null, { geo: HULL, id: 4, cf: (px, py) => (py < 0.28 ? B : W) });
  K.box(s, 0.1, 0.55, 0, 3.6, 0.1, 1.4, '#b48d63', { id: 3, pat: 3 });
  K.box(s, -0.5, 0.65, 0, 1.3, 0.85, 1.0, '#f4f4ef', { id: 4 });
  K.pl(s, -0.5, 1.15, 0.505, 0.9, 0.4, texWin('dark'), { id: 6 });
  K.box(s, -0.5, 1.5, 0, 1.45, 0.08, 1.15, '#3f8fc2', { id: 5 });
  K.cyl(s, 0.6, 0.65, 0, 0.04, 1.8, '#e9e6dc', { n: 5 });
}
export function buoy(c, x, z, y = 0) { K.cyl(c, x, y, z, 0.25, 0.5, '#de794e', { n: 10, top: 0.6 }); K.cyl(c, x, y + 0.2, z, 0.26, 0.12, '#f4f4ef', { n: 10 }); }
export function picnic(c, x, z, ry = 0) {
  c = drop(c, x, z);
  solid(c, x, z, 0, 1.6, 1.5, ry);
  const s = subCtx(c, x, 0, z, ry);
  K.box(s, 0, 0.72, 0, 1.6, 0.08, 0.8, '#b48d63', { id: 3, layer: 'small', pat: 3 });
  for (const sz of [-0.65, 0.65]) K.box(s, 0, 0.42, sz, 1.6, 0.06, 0.28, '#b48d63', { id: 3, layer: 'small' });
  for (const sx of [-0.6, 0.6]) K.box(s, sx, -0.5, 0, 0.08, 1.22, 1.4, '#8e6c4b', { id: 3, layer: 'small' });
}
export function swing(c, x, z) {
  c = drop(c, x, z);
  for (const sx of [-1.1, 1.1]) solid(c, x + sx, z, 0, 0.2, 1.3);
  for (const sx of [-1.1, 1.1]) { K.boxc(c, x + sx, 0.95, z - 0.44, 0.08, 2.6, 0.08, '#c25959', { rx: 0.35, layer: 'small' }); K.boxc(c, x + sx, 0.95, z + 0.44, 0.08, 2.6, 0.08, '#c25959', { rx: -0.35, layer: 'small' }); }
  K.boxc(c, x, 2.15, z, 2.4, 0.08, 0.08, '#c25959', { layer: 'small' });
  for (const sx of [-0.45, 0.45]) { K.box(c, x + sx - 0.18, 0.45, z, 0.02, 1.7, 0.02, '#4b5658', SM); K.box(c, x + sx + 0.18, 0.45, z, 0.02, 1.7, 0.02, '#4b5658', SM); K.box(c, x + sx, 0.42, z, 0.45, 0.05, 0.2, '#f3c258', SM); }
}
export function slide(c, x, z) {
  c = drop(c, x, z);
  solid(c, x - 0.6, z, 0, 1.9, 0.8);
  K.box(c, x - 0.9, -0.45, z, 0.8, 1.95, 0.8, '#66bde6', { id: 5, layer: 'small' });
  K.boxc(c, x + 0.25, 0.76, z, 0.6, 0.06, 2.05, '#f3c258', { ry: Math.PI / 2, rx: 0.6, layer: 'small', id: 6 });
  for (let i = 0; i < 4; i++) K.box(c, x - 1.45, i * 0.37, z, 0.3, 0.06, 0.6, '#c25959', SM);
}
export function goal(c, x, z, ry) {
  c = drop(c, x, z);
  const s = subCtx(c, x, 0, z, ry);
  for (const sx of [-1.4, 1.4]) solid(s, sx, -0.4, 0, 0.15, 0.9);
  solid(s, 0, -0.8, 0, 2.9, 0.12);
  for (const sx of [-1.4, 1.4]) K.box(s, sx, -0.4, 0, 0.1, 2.0, 0.1, '#f4f4ef', { layer: 'small' });
  K.box(s, 0, 1.6, 0, 2.9, 0.1, 0.1, '#f4f4ef', { layer: 'small' });
  // rede: fundo, laterais e teto inclinado, presos na trave
  K.box(s, 0, 0, -0.8, 2.8, 1.1, 0.02, '#e9ebe4', { layer: 'small', id: 7, pat: 6 });
  for (const sx of [-1.4, 1.4]) {
    K.box(s, sx, 0, -0.4, 0.02, 1.1, 0.8, '#e9ebe4', { layer: 'small', id: 7 });
    K.boxc(s, sx, 1.35, -0.4, 0.02, 0.5, 0.9, '#e9ebe4', { layer: 'small', id: 7, rx: -0.55 });
  }
  K.boxc(s, 0, 1.38, -0.4, 2.8, 0.02, 0.9, '#e9ebe4', { layer: 'small', id: 7, rx: -0.55 });
  for (const sx of [-1.4, 1.4]) K.box(s, sx, -0.4, -0.8, 0.06, 1.5, 0.06, '#f4f4ef', { layer: 'small' });
}
export function clothesline(c, x, z, len = 3, ry = 0) {
  c = drop(c, x, z);
  const s = subCtx(c, x, 0, z, ry);
  for (const sx of [-len / 2, len / 2]) solid(s, sx, 0, 0.08);
  for (const sx of [-len / 2, len / 2]) K.cyl(s, sx, -0.35, 0, 0.04, 2.25, '#8d9792', { n: 4, layer: 'small' });
  K.boxc(s, 0, 1.82, 0, len, 0.015, 0.015, '#4b5658', SM);
  for (let i = 0; i < 4; i++) K.box(s, -len / 2 + 0.5 + i * (len - 1) / 3, 1.25, 0, 0.42, 0.55, 0.015, pickR(['#f4f4ef', '#66bde6', '#e7a58c', '#f3c258', '#8cc48c', '#c25959']), { id: 7, layer: 'small' });
}
export function bunting(c, x0, y0, z0, x1, y1, z1, n = 9) {
  const cols = ['#c25959', '#f3c258', '#66bde6', '#8cc48c', '#de794e', '#f4f4ef'];
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const sag = Math.sin(t * Math.PI) * 0.36;
    const px = lerp(x0, x1, t), py = lerp(y0, y1, t) - sag, pz = lerp(z0, z1, t);
    K.boxc(c, px, py, pz, 0.22, 0.26, 0.02, cols[i % cols.length], { id: 7, layer: 'small', rz: Math.PI / 4 });
  }
}
export function mailbox(c, x, z) { c = drop(c, x, z, { radial: true }); solid(c, x, z, 0.14); K.cyl(c, x, -0.35, z, 0.04, 1.35, '#4b5658', { n: 4, layer: 'small' }); K.box(c, x, 1.0, z, 0.32, 0.3, 0.42, '#c25959', { id: 5, layer: 'small' }); }
