// ================= colisão no planeta =================
import { R, SEA } from '../core/config.js';
import { clamp } from '../core/math.js';
import { COLLIDERS } from '../world/places.js';
import { groundAt, SHash } from '../world/terrain.js';

const CHASH = new SHash(3);
export function hashColliders() {
  for (const co of COLLIDERS) {
    const c = co.box ? co.c : co.d, r = (co.box ? co.rad : co.r) + 0.7;
    CHASH.insert(c.x * R, c.y * R, c.z * R, r, co);
  }
}
// empurra a direção d para fora dos colisores (pr = raio de quem anda)
export function pushOut(d, pr = 0.3) {
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
      d.set(co.c.x * R + co.r.x * nx + co.f.x * nz, co.c.y * R + co.r.y * nx + co.f.y * nz, co.c.z * R + co.r.z * nx + co.f.z * nz).normalize();
    } else {
      const c = d.dot(co.d), min = co.r + pr;
      if (c < Math.cos(min / R)) return;
      const tx = d.x - co.d.x * c, ty = d.y - co.d.y * c, tz = d.z - co.d.z * c, tl = Math.hypot(tx, ty, tz);
      if (tl < 1e-7) return;
      const th = min / R, cs = Math.cos(th), sn = Math.sin(th) / tl;
      d.set(co.d.x * cs + tx * sn, co.d.y * cs + ty * sn, co.d.z * cs + tz * sn).normalize();
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
