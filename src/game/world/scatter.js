// ---------------- vegetação espalhada ----------------
import * as THREE from 'three';
import { LOW, R, SEA } from '../core/config.js';
import { toon } from '../core/materials.js';
import {
  arcDist, C, D2R, dirOf, eastOf, frameMatrix, headingVec, latOf, lonOf, northOf, offsetDir, rand,
  rr, tmpV, tmpV2, tmpV3,
} from '../core/math.js';
import { scene } from '../core/renderer.js';
import { chunkOf } from './chunks.js';
import { rock } from './furniture.js';
import { placeDir } from './kit.js';
import { addCircle, FOOT, isReserved } from './places.js';
import { bush, flowers, palm, pine, tree } from './plants.js';
import { isNearAny } from './street.js';
import { H, TERRAIN, trailDist } from './terrain.js';

export function scatter() {
  const tryAt = (lat, lon, fn, r = 0.6) => {
    const d = dirOf(lat, lon);
    const h = H(d, scatter.info);
    if (h < SEA + 0.4 || scatter.info.road > 0.05 || scatter.info.lot > 0.2) return false;
    if (trailDist(d) < 0.7) return false;
    if (isNearAny(d, r + 0.4)) return false;
    for (const F of FOOT) if (arcDist(d, tmpV3.copy(F.c).normalize()) < Math.hypot(F.hw, F.hd) + r) return false;
    const c = placeDir(d, headingVec(d, rand() * 360), { h, lift: -0.05 });
    fn(c); addCircle(d, r * 0.6);
    return true;
  };
  scatter.info = {};
  const N = LOW ? 420 : 640;
  let placed = 0;
  for (let k = 0; k < N * 3 && placed < N; k++) {
    const y = rr(-0.62, 0.98), lon = rand() * 360, lat = Math.asin(y) / D2R;
    const inPark = arcDist(dirOf(lat, lon), dirOf(14, 300)) < 14;
    const beachy = lon > 195 && lon < 285 && lat < -26;
    if (beachy && rand() < 0.75) continue;
    const town = isReserved(dirOf(lat, lon)) && !inPark;
    if (town && rand() < 0.85) continue;
    const r = rand();
    const ok = tryAt(lat, lon, (c) => {
      if (beachy) palm(c, 0, 0, rr(0.85, 1.15));
      else if (lat > 46 && r < 0.55) pine(c, 0, 0, rr(0.8, 1.3));
      else if (r < 0.62) tree(c, 0, 0, rr(0.8, 1.35));
      else if (r < 0.8) bush(c, 0, 0, rr(0.6, 1.0));
      else if (r < 0.9) rock(c, 0, 0, rr(0.6, 1.4));
      else flowers(c, 0, 0);
    }, r < 0.62 ? 0.7 : 0.45);
    if (ok) placed++;
  }
  // árvores no parque em volta do lago (mais densas)
  for (let k = 0; k < (LOW ? 40 : 70); k++) {
    const a = rand() * Math.PI * 2, rad = rr(7.8, 13);
    const d = offsetDir(dirOf(14, 300), headingVec(dirOf(14, 300), a / D2R), rad);
    tryAt(latOf(d), lonOf(d), (c) => (rand() < 0.75 ? tree(c, 0, 0, rr(0.9, 1.4)) : bush(c, 0, 0, rr(0.7, 1))), 0.7);
  }
}
// tufos de grama instanciados por pedaço
export function buildGrass() {
  const ico = TERRAIN.ico, ha = TERRAIN.h, ga = TERRAIN.mesh.geometry.attributes.aG.array;
  const blade = (() => {
    const g = new THREE.BufferGeometry(), P = [], Cc = [], I = [];
    const base = C('#5f9c55'), tip = C('#a7cf7a');
    for (let b = 0; b < 4; b++) {
      const a = b / 4 * Math.PI * 2 + 0.4, ox = Math.cos(a) * 0.06, oz = Math.sin(a) * 0.06, w = 0.05, h = 0.26 + (b % 2) * 0.12;
      const tx = ox * 2.2, tz = oz * 2.2, px = -Math.sin(a) * w, pz = Math.cos(a) * w, k = P.length / 3;
      P.push(ox - px, 0, oz - pz, ox + px, 0, oz + pz, tx, h, tz);
      Cc.push(base.r, base.g, base.b, base.r, base.g, base.b, tip.r, tip.g, tip.b);
      I.push(k, k + 1, k + 2);
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3));
    g.setIndex(I); g.computeVertexNormals();
    return g;
  })();
  const mat = toon({ vc: true, grass: true, side: THREE.DoubleSide });
  const per = new Map();
  const d = new THREE.Vector3(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const prob = LOW ? 0.45 : 0.75;
  for (let i = 0; i < ico.count; i++) {
    if (ga[i] < 0.99 || rand() > prob) continue;
    d.set(ico.pos[i * 3], ico.pos[i * 3 + 1], ico.pos[i * 3 + 2]);
    if (ha[i] < SEA + 0.4) continue;
    const ch = chunkOf(d);
    let arr = per.get(ch); if (!arr) per.set(ch, arr = []);
    const reps = LOW ? 1 : 2;
    for (let r = 0; r < reps; r++) {
      const dd = d.clone().addScaledVector(eastOf(d, tmpV), rr(-0.2, 0.2) / R).addScaledVector(northOf(d, tmpV2), rr(-0.2, 0.2) / R).normalize();
      p.copy(dd).multiplyScalar(R + ha[i] - 0.03);
      const f = headingVec(dd, rand() * 360);
      frameMatrix(p, dd, f, m4);
      const sc = rr(0.7, 1.35); m4.scale(s.set(sc, sc * rr(0.8, 1.3), sc));
      arr.push(m4.clone());
    }
  }
  for (const [ch, arr] of per) {
    const im = new THREE.InstancedMesh(blade, mat, arr.length);
    arr.forEach((m, k) => im.setMatrixAt(k, m));
    im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere();
    im.receiveShadow = true;
    scene.add(im); ch.inst.push(im);
  }
}
