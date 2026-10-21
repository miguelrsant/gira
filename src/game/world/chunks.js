// ================= pedaços do planeta (culling por horizonte) =================
import * as THREE from 'three';
import { LOW, R } from '../core/config.js';
import { grad2, toon } from '../core/materials.js';
import { clamp } from '../core/math.js';
import { scene } from '../core/renderer.js';
import { ATL } from './atlas.js';
import { Geo } from './geo.js';

const NCH = 60;
export const CH = [];
for (let i = 0; i < NCH; i++) {
  const y = 1 - (i + 0.5) / NCH * 2, r = Math.sqrt(1 - y * y), a = i * Math.PI * (3 - Math.sqrt(5));
  CH.push({ dir: new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r), geo: {}, mesh: {}, ang: 0, top: 0, inst: [] });
}
export function chunkOf(d) {
  let best = 0, bd = -2;
  for (let i = 0; i < NCH; i++) { const v = CH[i].dir.dot(d); if (v > bd) { bd = v; best = i; } }
  return CH[best];
}
export function chunkGeo(ch, layer) { return ch.geo[layer] || (ch.geo[layer] = new Geo()); }
export const MAT = {};
export function makeMaterials() {
  MAT.world = toon({ vc: true, map: ATL.tex, pat: true, nearFade: true });
  MAT.fol = toon({ vc: true, pat: true, wind: true, nearFade: true });
  MAT.ground = toon({ vc: true, ground: true, grad: grad2 });
  MAT.road = toon({ vc: true, pat: true, grad: grad2 });
  MAT.dyn = MAT.world;
}
export function buildChunks() {
  for (const ch of CH) {
    for (const layer in ch.geo) {
      const g = ch.geo[layer]; if (!g.vc) continue;
      const geo = g.build();
      const m = new THREE.Mesh(geo, layer === 'fol' ? MAT.fol : layer === 'road' ? MAT.road : MAT.world);
      m.castShadow = layer !== 'road' && !(LOW && layer === 'small'); m.receiveShadow = true; m.matrixAutoUpdate = false;
      scene.add(m); ch.mesh[layer] = m;
      // alcance angular e altura máxima do pedaço
      const p = geo.attributes.position.array; let ang = 0, top = 0;
      for (let i = 0; i < p.length; i += 3) {
        const l = Math.hypot(p[i], p[i + 1], p[i + 2]);
        const c = (p[i] * ch.dir.x + p[i + 1] * ch.dir.y + p[i + 2] * ch.dir.z) / l;
        ang = Math.max(ang, Math.acos(clamp(c, -1, 1))); top = Math.max(top, l - R);
      }
      ch.ang = Math.max(ch.ang, ang); ch.top = Math.max(ch.top, top);
    }
    ch.geo = null;
  }
}
// visível se não estiver escondido atrás da curva do planeta
export function overHorizon(dir, ang, top, camPos, D) {
  const Rp = R - 1.2;
  if (D <= Rp + 0.01) return true;
  const c = (camPos.x * dir.x + camPos.y * dir.y + camPos.z * dir.z) / D;
  const a = Math.acos(clamp(c, -1, 1));
  return a - ang < Math.acos(Rp / D) + Math.acos(Rp / (R + Math.max(top, 0.6)));
}
export function updateChunks(camPos, far) {
  const D = camPos.length();
  for (const ch of CH) {
    const vis = overHorizon(ch.dir, ch.ang, ch.top, camPos, D);
    const cx = ch.dir.x * R - camPos.x, cy = ch.dir.y * R - camPos.y, cz = ch.dir.z * R - camPos.z;
    const near = Math.hypot(cx, cy, cz) - ch.ang * R;
    for (const layer in ch.mesh) {
      const m = ch.mesh[layer];
      m.visible = vis && (layer !== 'small' || (far ? !LOW : near < 34));
    }
    for (const im of ch.inst) im.visible = vis && !far && near < 30;
  }
}
