// ================= colisão no planeta =================
import { R, SEA } from '../core/config.js';
import { Vector3 } from 'three';
import { clamp } from '../core/math.js';
import { COLLIDERS } from '../world/places.js';
import { groundAt, SHash } from '../world/terrain.js';

const CHASH = new SHash(3);
// vão estreito demais para passar (menos que a largura da Duda) entre dois colisores vira armadilha:
// ela entra empurrada de um lado, o outro empurra de volta e não sai mais. Esses vãos são fechados.
const GAP = 0.62;
function closest(co, p, out) {
  if (co.box) {
    const vx = p.x - co.c.x * R, vy = p.y - co.c.y * R, vz = p.z - co.c.z * R;
    const lx = vx * co.r.x + vy * co.r.y + vz * co.r.z, lz = vx * co.f.x + vy * co.f.y + vz * co.f.z;
    const qx = clamp(lx, -co.hw, co.hw), qz = clamp(lz, -co.hd, co.hd);
    out.copy(co.c).multiplyScalar(R).addScaledVector(co.r, qx).addScaledVector(co.f, qz);
    return Math.hypot(lx - qx, lz - qz);
  }
  const c = out.copy(co.d).multiplyScalar(R), v = _v.subVectors(p, c), l = v.length();
  if (l < 1e-6) return -co.r;
  out.addScaledVector(v, co.r / l);
  return l - co.r;
}
function outline(co) {
  const pts = [];
  if (co.box) {
    const at = (x, z) => co.c.clone().multiplyScalar(R).addScaledVector(co.r, x).addScaledVector(co.f, z);
    const nx = Math.max(1, Math.ceil(co.hw * 2 / 0.2)), nz = Math.max(1, Math.ceil(co.hd * 2 / 0.2));
    for (let i = 0; i <= nx; i++) { const x = -co.hw + i * co.hw * 2 / nx; pts.push(at(x, -co.hd), at(x, co.hd)); }
    for (let i = 1; i < nz; i++) { const z = -co.hd + i * co.hd * 2 / nz; pts.push(at(-co.hw, z), at(co.hw, z)); }
  } else {
    const t1 = new Vector3(0, 1, 0).cross(co.d); if (t1.lengthSq() < 1e-6) t1.set(1, 0, 0).cross(co.d); t1.normalize();
    const t2 = new Vector3().crossVectors(co.d, t1), n = Math.max(8, Math.ceil(co.r * 2 * Math.PI / 0.2));
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; pts.push(co.d.clone().multiplyScalar(R).addScaledVector(t1, Math.cos(a) * co.r).addScaledVector(t2, Math.sin(a) * co.r)); }
  }
  return pts;
}
const _v = new Vector3(), _q = new Vector3();
export const GAP_FILL = [];
function fillGaps() {
  const H = new SHash(3);
  for (const co of COLLIDERS) { const c = co.box ? co.c : co.d; H.insert(c.x * R, c.y * R, c.z * R, (co.box ? co.rad : co.r) + GAP, co); }
  const F = new SHash(1);
  for (const A of COLLIDERS) {
    for (const p of outline(A)) {
      H.near(p.x, p.y, p.z, (B) => {
        if (B === A) return;
        const g = closest(B, p, _q);
        if (g <= 0.02 || g >= GAP) return;
        const m = p.clone().add(_q).multiplyScalar(0.5);
        let dup = false; F.near(m.x, m.y, m.z, (o) => { if (!dup && o.m.distanceTo(m) < 0.15) dup = true; });
        if (dup) return;
        // bem gordo: encosta de verdade nos dois lados, sem formar outro cantinho fino com eles
        const it = { m, d: m.clone().normalize(), r: g / 2 + 0.25 };
        F.insert(m.x, m.y, m.z, 0.2, it); GAP_FILL.push(it);
      });
    }
  }
  for (const it of GAP_FILL) COLLIDERS.push({ d: it.d, r: it.r, fill: true });
}
export function hashColliders() {
  fillGaps();
  for (const co of COLLIDERS) {
    const c = co.box ? co.c : co.d, r = (co.box ? co.rad : co.r) + 0.7;
    CHASH.insert(c.x * R, c.y * R, c.z * R, r, co);
  }
}
// empurra a direção d para fora dos colisores (pr = raio de quem anda); repete umas vezes porque sair de um pode enfiar em outro
// (cantinho entre barril, caixote e parede): sem isso dava para ficar preso
export function pushOut(d, pr = 0.3) {
  for (let k = 0; k < 4; k++) { _moved = false; pushOnce(d, pr); if (!_moved) break; }
}
let _moved = false;
function pushOnce(d, pr) {
  CHASH.near(d.x * R, d.y * R, d.z * R, (co) => {
    if (co.box) {
      const vx = (d.x - co.c.x) * R, vy = (d.y - co.c.y) * R, vz = (d.z - co.c.z) * R;
      const lx = vx * co.r.x + vy * co.r.y + vz * co.r.z, lz = vx * co.f.x + vy * co.f.y + vz * co.f.z;
      const qx = clamp(lx, -co.hw, co.hw), qz = clamp(lz, -co.hd, co.hd);
      const dx = lx - qx, dz = lz - qz, dl = Math.hypot(dx, dz);
      if (dl >= pr) return;
      let nx, nz;
      if (dl > 1e-5) { nx = qx + dx / dl * pr; nz = qz + dz / dl * pr; }
      else if (co.hw - Math.abs(lx) < co.hd - Math.abs(lz)) { nx = (lx < 0 ? -1 : 1) * (co.hw + pr); nz = lz; }
      else { nx = lx; nz = (lz < 0 ? -1 : 1) * (co.hd + pr); }
      // ponto da esfera cuja projeção no plano da caixa é (nx, nz); sem isso, em caixa grande (lote de 13 m)
      // a volta para a esfera encolhia o empurrão e a Duda ficava presa encostada na parede
      const k = R * Math.sqrt(Math.max(0, 1 - (nx * nx + nz * nz) / (R * R)));
      d.set(co.c.x * k + co.r.x * nx + co.f.x * nz, co.c.y * k + co.r.y * nx + co.f.y * nz, co.c.z * k + co.r.z * nx + co.f.z * nz).normalize();
      _moved = true;
    } else {
      const c = d.dot(co.d), min = co.r + pr;
      if (c < Math.cos(min / R)) return;
      const tx = d.x - co.d.x * c, ty = d.y - co.d.y * c, tz = d.z - co.d.z * c, tl = Math.hypot(tx, ty, tz);
      if (tl < 1e-7) return;
      const th = min / R, cs = Math.cos(th), sn = Math.sin(th) / tl;
      d.set(co.d.x * cs + tx * sn, co.d.y * cs + ty * sn, co.d.z * cs + tz * sn).normalize();
      _moved = true;
    }
  });
}
// ponto (direção) dentro de um prédio alto: usado pela câmera
export function insideTall(p, pad = 0.3) {
  let hit = false;
  CHASH.near(p.x * R, p.y * R, p.z * R, (co) => {
    if (hit || !co.box || !co.tall) return;
    const vx = (p.x - co.c.x) * R, vy = (p.y - co.c.y) * R, vz = (p.z - co.c.z) * R;
    const lx = vx * co.r.x + vy * co.r.y + vz * co.r.z, lz = vx * co.f.x + vy * co.f.y + vz * co.f.z;
    if (Math.abs(lx) < co.hw + pad && Math.abs(lz) < co.hd + pad) hit = true;
  });
  return hit;
}
export const walkable = (d) => groundAt(d) > SEA - 0.12;
