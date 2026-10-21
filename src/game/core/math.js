// ================= utilidades =================
import * as THREE from 'three';
import { R } from './config.js';

export const $ = (id) => document.getElementById(id);
export const Y = new THREE.Vector3(0, 1, 0);
export const D2R = Math.PI / 180;
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const sat = (x) => clamp(x, 0, 1);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => t * t * (3 - 2 * t);
export const sstep = (a, b, x) => smooth(sat((x - a) / (b - a)));
// diferença entre dois ângulos, sempre entre -π e π
export const angDiff = (a, b) => { let d = (a - b) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return d; };
export const easeOutBack = (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOut = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const rand = mulberry(7);
export const rr = (a, b) => a + (b - a) * rand();
export const pickR = (arr) => arr[Math.floor(rand() * arr.length)];
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
export const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), tmpV3 = new THREE.Vector3(), tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion();
export const col = (hex) => new THREE.Color(hex);
export const V3 = () => new THREE.Vector3();
// cores em cache
const _colc = new Map();
export function C(hex) { let c = _colc.get(hex); if (!c) _colc.set(hex, c = new THREE.Color(hex)); return c; }

// ================= geometria esférica =================
export function dirOf(lat, lon, out = new THREE.Vector3()) {
  const a = lat * D2R, b = lon * D2R;
  return out.set(Math.cos(a) * Math.cos(b), Math.sin(a), Math.cos(a) * Math.sin(b));
}
export const latOf = (d) => Math.asin(clamp(d.y, -1, 1)) / D2R;
export const lonOf = (d) => Math.atan2(d.z, d.x) / D2R;
export function eastOf(up, out = new THREE.Vector3()) {
  out.crossVectors(up, Y); if (out.lengthSq() < 1e-8) out.set(0, 0, 1); return out.normalize();
}
export function northOf(up, out = new THREE.Vector3()) { const e = eastOf(up, tmpV3); return out.crossVectors(e, up).normalize(); }
// direção tangente para um rumo em graus (0 = norte, 90 = leste)
export function headingVec(up, deg, out = new THREE.Vector3()) {
  const n = northOf(up, new THREE.Vector3()), e = eastOf(up, new THREE.Vector3());
  const a = deg * D2R; return out.copy(n).multiplyScalar(Math.cos(a)).addScaledVector(e, Math.sin(a)).normalize();
}
// matriz local: x = direita, y = cima (normal do planeta), z = frente
export function frameMatrix(pos, up, fwd, out = new THREE.Matrix4()) {
  const f = tmpV.copy(fwd).addScaledVector(up, -fwd.dot(up)).normalize();
  const r = tmpV2.crossVectors(up, f).normalize();
  out.makeBasis(r, up, f); out.setPosition(pos); return out;
}
export function orient(obj, up, fwd) {
  const f = tmpV.copy(fwd).addScaledVector(up, -fwd.dot(up));
  if (f.lengthSq() < 1e-10) return; f.normalize();
  const r = tmpV2.crossVectors(up, f).normalize();
  tmpM.makeBasis(r, up, f); obj.quaternion.setFromRotationMatrix(tmpM);
}
export const arcDist = (a, b) => Math.acos(clamp(a.dot(b), -1, 1)) * R;
// direção a partir de um ponto, andando 'dist' unidades num rumo
export function offsetDir(d, fwd, dist, out = new THREE.Vector3()) {
  const axis = tmpV.crossVectors(d, fwd).normalize();
  return out.copy(d).applyAxisAngle(axis, dist / R).normalize();
}
