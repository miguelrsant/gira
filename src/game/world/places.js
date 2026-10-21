// ================= o mundo: bairros, ruas, marcos =================
import * as THREE from 'three';
import { R } from '../core/config.js';
import { arcDist, dirOf, tmpV } from '../core/math.js';
import { ctxDir, ctxPoint, placeDir, subCtx } from './kit.js';
import { addZone, H } from './terrain.js';

export const FOOT = [];          // pegadas ocupadas (para o loteamento automático não sobrepor)
const RESERVED = [];      // áreas sem loteamento automático
export const BUILDS = [];        // construções a montar depois do terreno
export const COLLIDERS = [];     // { d, r } círculos e { box } caixas
export const INTERACT = [];      // easter eggs: placas, cartazes, objetos
export const PAGES = [];         // páginas de calendário escondidas
export const SPOTS = {};         // posições nomeadas (NPCs, câmera, etc.)
export const DISTRICTS = [];
export const WIRES = [];         // pares de pontos para os fios
export const DYN = {};           // objetos animados

export function reserve(lat, lon, r) { RESERVED.push({ d: dirOf(lat, lon), r }); }
export function isReserved(d, pad = 0) { for (const z of RESERVED) if (arcDist(d, z.d) < z.r + pad) return true; return false; }
export function footOf(c, w, d, cx = 0, cz = 0) {
  const p = ctxPoint(c, cx, 0, cz).normalize();
  const r = new THREE.Vector3().setFromMatrixColumn(c.W, 0).normalize(), f = new THREE.Vector3().setFromMatrixColumn(c.W, 2).normalize();
  return { c: p.multiplyScalar(R), r, f, hw: w / 2, hd: d / 2 };
}
function obbOverlap(A, B, pad = 0.3) {
  const T = tmpV.subVectors(B.c, A.c);
  for (const ax of [A.r, A.f, B.r, B.f]) {
    const ra = A.hw * Math.abs(A.r.dot(ax)) + A.hd * Math.abs(A.f.dot(ax));
    const rb = B.hw * Math.abs(B.r.dot(ax)) + B.hd * Math.abs(B.f.dot(ax));
    if (Math.abs(T.dot(ax)) > ra + rb + pad) return false;
  }
  return true;
}
export function footFree(F, pad = 0.3) { for (const o of FOOT) if (obbOverlap(F, o, pad)) return false; return true; }
// tall: prédio (a câmera não atravessa)
export function addBoxCollider(c, w, d, cx = 0, cz = 0, tall = false) {
  const F = footOf(c, w, d, cx, cz);
  COLLIDERS.push({ box: true, tall, c: F.c.clone().normalize(), r: F.r, f: F.f, hw: F.hw, hd: F.hd, rad: Math.hypot(F.hw, F.hd) });
  return F;
}
export function addCircle(d, r) { COLLIDERS.push({ d: d.clone().normalize(), r }); }
export function addCircleLocal(c, x, z, r) { addCircle(ctxDir(c, x, z), r); }
// colisor de móvel: só vale se a peça está no chão (vaso em cima de balcão ou telhado não bloqueia a rua)
export function solid(c, x, z, r, w, d, ry = 0) {
  const p = ctxPoint(c, x, 0, z), up = p.clone().normalize();
  if (p.length() - R - H(up) > 0.6) return;
  if (w) addBoxCollider(subCtx(c, x, 0, z, ry), w, d); else addCircle(up, r);
}
// lote: registra zona aplainada + pegada + colisor, e agenda a construção
export function lot(c, w, d, o = {}) {
  const F = footOf(c, w + (o.padW || 0), d + (o.padD || 0), o.cx || 0, o.cz || 0);
  FOOT.push(F);
  if (o.zone !== false) addZone(ctxDir(c, o.cx || 0, o.cz || 0), c.fwd, (w + (o.padW || 0)) / 2 + 0.4, (d + (o.padD || 0)) / 2 + 0.4, { h: c.h, pn: c.d, kind: o.kind || 'paved', m: o.m ?? 1.8 });
  if (o.collide !== false) addBoxCollider(c, o.colW || w, o.colD || d, o.ccx || 0, o.ccz || 0, true);
}
// contexto ao longo de uma rua, de frente para ela
export function nearestSample(rd, lat, lon) {
  const d = dirOf(lat, lon); let bi = 0, bd = -2;
  rd.S.forEach((s, i) => { const v = s.d.dot(d); if (v > bd) { bd = v; bi = i; } });
  return bi;
}
export function besideRoad(rd, i, side, depth, setback = 0.4, o = {}) {
  const s = rd.S[i];
  const lat = side * (rd.hw + rd.sw + setback + depth / 2);
  const d = s.d.clone().addScaledVector(s.s, lat / R).normalize();
  const fwd = s.s.clone().multiplyScalar(-side);
  const h = o.h !== undefined ? o.h : H(d);
  return placeDir(d, fwd, { h });
}
// ponto na calçada (para postes, lixeiras, placas)
export function onSidewalk(rd, i, side, inset = 0.35) {
  const s = rd.S[((i % rd.S.length) + rd.S.length) % rd.S.length];
  const lat = side * (rd.hw + rd.sw - inset);
  const d = s.d.clone().addScaledVector(s.s, lat / R).normalize();
  return placeDir(d, s.s.clone().multiplyScalar(-side), { h: s.h + rd.top + 0.13 });
}
export function interact(c, x, y, z, o) {
  const p = ctxPoint(c, x, y, z);
  INTERACT.push(Object.assign({ pos: p, dir: p.clone().normalize(), r: 2.2 }, o));
}
export function district(name, sub, lat, lon, r) { DISTRICTS.push({ name, sub, d: dirOf(lat, lon), r }); }
