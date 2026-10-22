// ---------------- postes, fios e coisas de calçada ----------------
import * as THREE from 'three';
import { lineMat } from '../core/materials.js';
import { arcDist, pickR, rand } from '../core/math.js';
import { scene } from '../core/renderer.js';
import { bollard, cone, hydrant, lampPost, signPost, trashBin, utilPole, vending } from './furniture.js';
import { MAIN } from './layout.js';
import { addCircle, COLLIDERS, interact, onSidewalk, WIRES } from './places.js';
import { ROADS } from './roads.js';
import { cornerAt } from './terrain.js';
import { texSign } from './textures.js';

export function streetFurniture() {
  for (const rd of ROADS) {
    if (rd.kind !== 'asphalt' || !rd.sw) continue;
    const S = rd.S, N = S.length, every = Math.max(10, Math.round(9 / rd.step));
    let prev = null;
    for (let i = 3; i < N - (rd.closed ? 0 : 3); i += every) {
      const s = S[i]; if (s.inter || s.cutR) { prev = null; continue; }
      const c = onSidewalk(rd, i, 1, 0.3);
      if (isNearAny(c.d, 0.9) || cornerAt(c.d, 0.6)) { prev = null; continue; }
      const pts = utilPole(c, 0, 0);
      addCircle(c.d, 0.25);
      if (prev) for (let k = 0; k < 4; k++) WIRES.push([prev[k], pts[k]]);
      prev = pts;
      // do outro lado: luminária
      const c2 = onSidewalk(rd, i + Math.floor(every / 2), -1, 0.3);
      if (!S[(i + Math.floor(every / 2)) % N].cutL && !isNearAny(c2.d, 0.9) && !cornerAt(c2.d, 0.6)) { lampPost(c2, 0, 0); addCircle(c2.d, 0.2); }
    }
    if (rd.closed && prev) { /* fecha o anel só se o primeiro poste existir */ }
    // lixeiras, hidrantes, cones, placas "proibido parar"
    for (let i = 7; i < N - 3; i += Math.round(every * 1.7)) {
      const side = (i % 2) ? 1 : -1, s = S[i];
      if (s.inter || (side > 0 ? s.cutR : s.cutL)) continue;
      // nada de máquina ou lixeira no pedaço de calçada que encosta numa esquina (lá o chão faz curva e ela entortava)
      let edge = false;
      for (let k = -4; k <= 4; k++) { const q = S[((i + k) % N + N) % N]; if (side > 0 ? q.cutR : q.cutL) edge = true; }
      if (edge) continue;
      const c = onSidewalk(rd, i, side, 0.32);
      if (isNearAny(c.d, 0.8) || cornerAt(c.d, 1.2)) continue;
      const k = Math.floor(rand() * 6);
      if (k === 0) trashBin(c, 0, 0); else if (k === 1) hydrant(c, 0, 0); else if (k === 2) bollard(c, 0, 0);
      else if (k === 3 && rd === MAIN) { signPost(c, 0, 0, texSign('PROIBIDO\nPARAR', '#c25959', '#f4f4ef', { w: 256, h: 192, font: 'lbl' }), 0.7, 0.55); interact(c, 0, 1.8, 0, { name: 'PLACA', lines: ['PROIBIDO PARAR.', '(Inclusive você.)'] }); }
      else if (k === 4) cone(c, 0, 0);
      else vending(c, 0, -0.1, pickR(['foco', 'cafe', 'agua']));
      addCircle(c.d, 0.3);
    }
  }
}
export function isNearAny(d, r) { for (const co of COLLIDERS) { if (co.box) { if (arcDist(d, co.c) < co.rad + r) return true; } else if (arcDist(d, co.d) < co.r + r) return true; } return false; }
export function buildWires() {
  const pos = [];
  for (const [a, b] of WIRES) {
    const n = 10;
    for (let k = 0; k < n; k++) {
      const t0 = k / n, t1 = (k + 1) / n;
      const p0 = a.clone().lerp(b, t0), p1 = a.clone().lerp(b, t1);
      const sag = (t) => Math.sin(Math.PI * t) * 0.45;
      p0.setLength(p0.length() - sag(t0)); p1.setLength(p1.length() - sag(t1));
      pos.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const l = new THREE.LineSegments(g, lineMat('#3b4447')); l.frustumCulled = false;
  scene.add(l);
}
