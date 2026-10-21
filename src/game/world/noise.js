// ================= ruído e esfera geodésica =================
import * as THREE from 'three';

function hash3i(x, y, z) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export function vnoise3(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  let fx = x - ix, fy = y - iy, fz = z - iz;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
  const a = hash3i(ix, iy, iz), b = hash3i(ix + 1, iy, iz), c = hash3i(ix, iy + 1, iz), d = hash3i(ix + 1, iy + 1, iz);
  const e = hash3i(ix, iy, iz + 1), f = hash3i(ix + 1, iy, iz + 1), g = hash3i(ix, iy + 1, iz + 1), h = hash3i(ix + 1, iy + 1, iz + 1);
  const x1 = a + (b - a) * fx, x2 = c + (d - c) * fx, x3 = e + (f - e) * fx, x4 = g + (h - g) * fx;
  const y1 = x1 + (x2 - x1) * fy, y2 = x3 + (x4 - x3) * fy;
  return y1 + (y2 - y1) * fz;
}
export function fbm3(x, y, z, oct = 4) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += a * vnoise3(x * f, y * f, z * f); n += a; a *= 0.5; f *= 2.03; }
  return s / n;
}

// esfera geodésica indexada (vértices compartilhados, normais suaves)
const _icoCache = new Map();
export function icoData(detail) {
  if (_icoCache.has(detail)) return _icoCache.get(detail);
  const t = (1 + Math.sqrt(5)) / 2;
  let v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]]
    .map(([x, y, z]) => { const l = Math.hypot(x, y, z); return [x / l, y / l, z / l]; });
  let f = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  for (let k = 0; k < detail; k++) {
    const cache = new Map(), nf = [];
    const mid = (a, b) => {
      const key = a < b ? a * 1e7 + b : b * 1e7 + a;
      let i = cache.get(key);
      if (i === undefined) {
        const p = v[a], q = v[b]; const x = p[0] + q[0], y = p[1] + q[1], z = p[2] + q[2]; const l = Math.hypot(x, y, z);
        i = v.length; v.push([x / l, y / l, z / l]); cache.set(key, i);
      }
      return i;
    };
    for (const [a, b, c] of f) { const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); nf.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); }
    f = nf;
  }
  const pos = new Float32Array(v.length * 3); v.forEach((p, i) => { pos[i * 3] = p[0]; pos[i * 3 + 1] = p[1]; pos[i * 3 + 2] = p[2]; });
  const idx = new Uint32Array(f.length * 3); f.forEach((tri, i) => { idx[i * 3] = tri[0]; idx[i * 3 + 1] = tri[1]; idx[i * 3 + 2] = tri[2]; });
  const out = { pos, idx, count: v.length };
  _icoCache.set(detail, out);
  return out;
}
export function icoGeometry(detail, displace) {
  const d = icoData(detail);
  const g = new THREE.BufferGeometry();
  const p = d.pos.slice();
  if (displace) for (let i = 0; i < d.count; i++) { const k = displace(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]); p[i * 3] *= k; p[i * 3 + 1] *= k; p[i * 3 + 2] *= k; }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  g.setIndex(new THREE.BufferAttribute(d.idx.slice(), 1));
  g.computeVertexNormals();
  return g;
}
