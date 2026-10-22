// ================= hash espacial =================
import * as THREE from 'three';
import { LOW, R, SEA } from '../core/config.js';
import { GLSL_NOISE } from '../core/materials.js';
import { clamp, col, D2R, dirOf, latOf, lerp, lonOf, sat, sstep } from '../core/math.js';
import { PACK, scene } from '../core/renderer.js';
import { MAT } from './chunks.js';
import { fbm3, icoData, vnoise3 } from './noise.js';

export class SHash {
  constructor(cell) { this.cell = cell; this.m = new Map(); }
  k(ix, iy, iz) { return ((ix + 512) * 1024 + (iy + 512)) * 1024 + (iz + 512); }
  insert(x, y, z, r, item) {
    const c = this.cell;
    const x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c), y0 = Math.floor((y - r) / c), y1 = Math.floor((y + r) / c), z0 = Math.floor((z - r) / c), z1 = Math.floor((z + r) / c);
    for (let i = x0; i <= x1; i++) for (let j = y0; j <= y1; j++) for (let l = z0; l <= z1; l++) {
      const key = this.k(i, j, l); let a = this.m.get(key); if (!a) this.m.set(key, a = []); a.push(item);
    }
  }
  // itens registrados na célula do ponto (cada item entra em todas as células que seu raio toca)
  near(x, y, z, cb) {
    const c = this.cell, arr = this.m.get(this.k(Math.floor(x / c), Math.floor(y / c), Math.floor(z / c)));
    if (arr) for (let q = 0; q < arr.length; q++) cb(arr[q]);
  }
}

// ================= relevo =================
const HILLS = [];   // { d, r, h, type: 'g' morro, 'p' platô, 'b' bacia }
const TOWNS = [];   // áreas sem ondulação selvagem
export const RHASH = new SHash(6);   // amostras de ruas
export const THASH = new SHash(6);   // amostras de trilhas
const ZHASH = new SHash(8);   // lotes e praças
const ZONES = [];
export const PLATFORMS = [];         // rampas, escadas, decks
export function hill(lat, lon, r, h, type = 'g') { HILLS.push({ d: dirOf(lat, lon), r, h, type, cosR: Math.cos(r / R) }); }
export function town(lat, lon, r) { TOWNS.push({ d: dirOf(lat, lon), r, cosR: Math.cos((r + 9) / R) }); }
function coastLat(lon) { return -38.6 + 2.2 * Math.sin(lon * D2R * 3 + 1.3) + 1.4 * Math.sin(lon * D2R * 7 + 0.4); }
function wildMask(d) {
  let m = 1;
  for (const t of TOWNS) {
    const c = d.dot(t.d); if (c < t.cosR) continue;
    m = Math.min(m, sstep(t.r, t.r + 9, Math.acos(clamp(c, -1, 1)) * R));
  }
  return m;
}
export function baseH(d) {
  const lat = latOf(d);
  let h = 6.4 * sstep(36, 82, lat);
  const coast = coastLat(lonOf(d));
  h -= 3.6 * sstep(coast + 1.5, coast - 12, lat);
  for (const b of HILLS) {
    const c = d.dot(b.d); if (c < b.cosR) continue;
    const x = Math.acos(clamp(c, -1, 1)) * R / b.r;
    if (b.type === 'p') h += b.h * (1 - sstep(0.62, 1, x));
    else { const k = 1 - x * x; h += b.h * k * k; }
  }
  const w = wildMask(d);
  if (w > 0.001) h += w * (fbm3(d.x * 2.4 + 5, d.y * 2.4, d.z * 2.4 - 3, 3) - 0.47) * 3.2;
  return h;
}
// rua mais próxima (distância em unidades, altura interpolada, lado)
const _rn = { road: null, i: 0, t: 0, dist: 0, h: 0, lat: 0, s: null };
export function roadNear(d, filter) {
  const x = d.x * R, y = d.y * R, z = d.z * R;
  let best = null, bd = 1e9;
  RHASH.near(x, y, z, (s) => {
    if (filter && !filter(s.road)) return;
    const dx = s.x - x, dy = s.y - y, dz = s.z - z, dd = dx * dx + dy * dy + dz * dz;
    if (dd < bd) { bd = dd; best = s; }
  });
  if (!best) return null;
  const rd = best.road, S = rd.S, n = S.length;
  // refina contra os dois segmentos vizinhos
  let out = null, od = 1e9;
  for (const j of [best.i - 1, best.i]) {
    let a = j, b = j + 1;
    if (rd.closed) { a = (a + n) % n; b = (b + n) % n; } else if (a < 0 || b >= n) continue;
    const A = S[a], B = S[b];
    const ex = B.x - A.x, ey = B.y - A.y, ez = B.z - A.z, el = ex * ex + ey * ey + ez * ez || 1e-9;
    const t = clamp(((x - A.x) * ex + (y - A.y) * ey + (z - A.z) * ez) / el, 0, 1);
    const qx = A.x + ex * t - x, qy = A.y + ey * t - y, qz = A.z + ez * t - z, dist = Math.sqrt(qx * qx + qy * qy + qz * qz);
    if (dist < od) { od = dist; out = { a, b, t }; }
  }
  if (!out) return null;
  const A = S[out.a], B = S[out.b];
  _rn.road = rd; _rn.a = out.a; _rn.b = out.b; _rn.i = out.t < 0.5 ? out.a : out.b; _rn.t = out.t; _rn.dist = od; _rn.h = lerp(A.h, B.h, out.t);
  _rn.lat = ((x - A.x) * A.s.x + (y - A.y) * A.s.y + (z - A.z) * A.s.z);
  return _rn;
}
function zoneWeight(zn, x, y, z) {
  const vx = x - zn.x, vy = y - zn.y, vz = z - zn.z;
  let dist;
  if (zn.round) dist = Math.max(0, Math.hypot(vx, vy, vz) - zn.hw);
  else {
    const lx = Math.abs(vx * zn.r.x + vy * zn.r.y + vz * zn.r.z) - zn.hw, lz = Math.abs(vx * zn.f.x + vy * zn.f.y + vz * zn.f.z) - zn.hd;
    dist = Math.hypot(Math.max(lx, 0), Math.max(lz, 0));
  }
  return 1 - sstep(0, zn.m, dist);
}
// altura final do chão (com ruas e lotes aplainados). info opcional recebe pesos
export function H(d, info) {
  let h = baseH(d);
  let rw = 0, lw = 0, lk = null;
  const rn = roadNear(d, (r) => r.kind !== 'trail' && !r.noFlat);
  if (rn) {
    const rd = rn.road, inner = rd.hw + rd.sw + 0.25;
    rw = 1 - sstep(inner, inner + 2.6, rn.dist);
    if (rw > 0) h = lerp(h, rn.h, rw);
  }
  const x = d.x * R, y = d.y * R, z = d.z * R;
  let bz = null, bw = 0, bs = 0;
  // prio: zona dentro de outra (o terraço da piscina no topo do morro) ganha no empate e a rua não puxa ela
  ZHASH.near(x, y, z, (zn) => { const w = zoneWeight(zn, x, y, z), sc = w * zn.prio; if (sc > bs) { bs = sc; bw = w; bz = zn; } });
  // o lote é plano de verdade (plano tangente no centro), não uma casca curva: assim as peças retas assentam no chão
  if (bz) {
    const n = bz.pn, zh = n ? (R + bz.h) / Math.max(0.5, d.x * n.x + d.y * n.y + d.z * n.z) - R : bz.h;
    h = lerp(h, zh, bw); lw = bw; lk = bz.kind;
    // a calçada manda: lote nenhum sobe por cima dela
    if (rn && bz.prio === 1) { const rd = rn.road, w2 = 1 - sstep(rd.hw + rd.sw, rd.hw + rd.sw + 0.8, rn.dist); if (w2 > 0) h = lerp(h, rn.h, w2); }
  }
  if (info) { info.road = rw; info.lot = lw; info.kind = lk; }
  return h;
}
// zona aplainada retangular (no plano tangente) ou redonda
export function addZone(d, fwd, hw, hd, o = {}) {
  const up = d.clone().normalize();
  const f = fwd.clone().addScaledVector(up, -fwd.dot(up)).normalize();
  const r = new THREE.Vector3().crossVectors(up, f).normalize();
  const h = o.h !== undefined ? o.h : H(up);
  // pn: normal do plano do lote (o "cima" de quem constrói nele); plane: false = casca curva
  const pn = o.plane === false ? null : (o.pn || up).clone().normalize();
  const zn = { x: up.x * R, y: up.y * R, z: up.z * R, d: up, r, f, hw, hd, h, pn, m: o.m ?? 1.6, kind: o.kind || 'paved', round: !!o.round, prio: o.prio || 1 };
  ZONES.push(zn);
  ZHASH.insert(zn.x, zn.y, zn.z, Math.hypot(hw, hd) + zn.m, zn);
  return zn;
}
// trilha mais próxima (para pintar o chão)
export function trailDist(d) {
  const x = d.x * R, y = d.y * R, z = d.z * R;
  let bd = 1e9, w = 1;
  THASH.near(x, y, z, (s) => { const dd = Math.hypot(s.x - x, s.y - y, s.z - z); if (dd < bd) { bd = dd; w = s.road.w; } });
  return bd - w * 0.5;
}
// altura da malha do chão: debaixo da rua afunda; no anel em volta da calçada fica abaixo do topo dela
// todas as ruas cuja faixa (asfalto + calçada + anel) cobre o ponto, cada uma com sua distância e altura
const _ra = [];
export function roadsAt(d, pad = 0.6) {
  _ra.length = 0;
  const x = d.x * R, y = d.y * R, z = d.z * R, seen = new Set();
  RHASH.near(x, y, z, (s) => { if (s.road.kind !== 'trail') seen.add(s.road); });
  for (const rd of seen) {
    const rn = roadNear(d, (r) => r === rd);
    if (rn && rn.dist < rd.hw + rd.sw + pad) _ra.push({ road: rd, dist: rn.dist, h: rn.h, lat: rn.lat, i: rn.i });
  }
  return _ra;
}
// no cruzamento vale a rua mais baixa: o chão fica embaixo de todas
export function meshClamp(d, h) {
  for (const r of roadsAt(d)) {
    if (r.road.noFlat) continue;
    const edge = r.road.hw + r.road.sw;
    if (r.dist < edge + 0.1) h = Math.min(h, r.h - 0.1);
    else h = Math.min(h, r.h + r.road.top + (r.road.sw ? 0.08 : -0.04));
  }
  return h;
}
// altura onde os pés pisam: chão (como desenhado), calçada, deck ou rampa
export function groundAt(d) {
  let h = meshClamp(d, H(d));
  // pisa no mais alto do que estiver embaixo: asfalto de qualquer rua ou calçada não cortada
  for (const r of roadsAt(d, 0)) {
    const rd = r.road, s = rd.S[r.i];
    if (r.dist < rd.hw) h = Math.max(h, r.h + rd.top);
    else if (rd.sw > 0 && r.dist < rd.hw + rd.sw && !(r.lat > 0 ? s.cutR : s.cutL)) h = Math.max(h, r.h + rd.top + 0.13);
  }
  for (const p of PLATFORMS) {
    const v = p.test(d); if (v !== null) h = Math.max(h, v);
  }
  return h;
}

// ================= malha do terreno =================
export const TERRAIN = { mesh: null };
const GC = {
  grass: col('#7db46b'), grassL: col('#97c475'), grassD: col('#68a35c'), grassY: col('#a7c06f'),
  sand: col('#e9daa9'), sandW: col('#d8c896'), dirt: col('#cdb48a'), paved: col('#c3c7bc'), under: col('#a9afa6'), field: col('#c9b183'), rock: col('#9aa39a')
};
function groundColor(d, h, info, out) {
  const lat = latOf(d), lon = ((lonOf(d) % 360) + 360) % 360;
  const coast = coastLat(lon);
  let g = 0;
  if (h < SEA + 0.35 || lat < coast + 0.6) out.copy(h < SEA - 0.2 ? GC.sandW : GC.sand);
  else if (lon > 192 && lon < 288 && lat < -27.5 && info.road < 0.5) out.copy(GC.sand);
  else if (info.road > 0.985) out.copy(GC.under);
  else if (info.lot > 0.5 && info.kind !== 'grass') out.copy(info.kind === 'field' ? GC.field : info.kind === 'sand' ? GC.sand : GC.paved);
  else {
    const td = trailDist(d);
    const nz = vnoise3(d.x * 30, d.y * 30, d.z * 30);
    if (td < (nz - 0.5) * 0.5) out.copy(GC.dirt);
    else {
      g = 1;
      const n = fbm3(d.x * 9 + 2, d.y * 9, d.z * 9, 2);
      out.copy(GC.grass);
      if (n > 0.6) out.lerp(GC.grassL, 0.7); else if (n < 0.38) out.lerp(GC.grassD, 0.7);
      if (h > 2.5) out.lerp(GC.grassY, sat((h - 2.5) / 4) * 0.6);
      if (td < 0.6) { out.lerp(GC.dirt, 0.45); g = 0.5; }
    }
  }
  return g;
}
export function buildTerrain() {
  const ico = icoData(LOW ? 5 : 6);
  const n = ico.count;
  const pos = new Float32Array(n * 3), cl = new Uint8Array(n * 3), ga = new Float32Array(n), ha = new Float32Array(n);
  const d = new THREE.Vector3(), c = new THREE.Color(), info = {};
  for (let i = 0; i < n; i++) {
    d.set(ico.pos[i * 3], ico.pos[i * 3 + 1], ico.pos[i * 3 + 2]);
    const h = H(d, info); ha[i] = h;
    // debaixo da rua e da calçada o chão afunda um pouco, para nunca furar o asfalto
    const hm = meshClamp(d, h);
    pos[i * 3] = d.x * (R + hm); pos[i * 3 + 1] = d.y * (R + hm); pos[i * 3 + 2] = d.z * (R + hm);
    ga[i] = groundColor(d, h, info, c);
    cl[i * 3] = c.r * 255; cl[i * 3 + 1] = c.g * 255; cl[i * 3 + 2] = c.b * 255;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(cl, 3, true));
  geo.setAttribute('aG', new THREE.BufferAttribute(ga, 1));
  geo.setIndex(new THREE.BufferAttribute(ico.idx, 1));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, MAT.ground);
  m.receiveShadow = true; m.matrixAutoUpdate = false; m.renderOrder = -2;
  scene.add(m); TERRAIN.mesh = m; TERRAIN.h = ha; TERRAIN.ico = ico;
  buildWater(ico, ha);
}

// ================= água (mar e lago) =================
export const waterMat = new THREE.ShaderMaterial({
  fog: true,
  uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    cDeep: { value: col('#3e9fb2') }, cShallow: { value: col('#74cfc8') }, cFoam: { value: col('#f2f7f0') }, cRing: { value: col('#a7e6dc') }, time: { value: 0 }
  }]),
  vertexShader: `
    attribute float aDepth; varying float vD; varying vec3 vW;
    #include <fog_pars_vertex>
    void main(){ vD = aDepth; vW = (modelMatrix * vec4(position, 1.0)).xyz; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
    }`,
  fragmentShader: `
    uniform vec3 cDeep, cShallow, cFoam, cRing; uniform float time; varying float vD; varying vec3 vW;
    #include <fog_pars_fragment>
    ${GLSL_NOISE}
    void main(){
      float d = vD;
      float wob = n3(vW * 0.9 + vec3(0.0, time * 0.15, 0.0)) * 0.3;
      vec3 c = mix(cShallow, cDeep, smoothstep(0.1, 2.6, d + wob * 0.5));
      float ring = step(0.8, fract((d + wob) * 1.5 - time * 0.2)) * (1.0 - smoothstep(0.25, 1.3, d));
      c = mix(c, cRing, ring * 0.85);
      c = mix(c, cFoam, 1.0 - smoothstep(0.03, 0.14 + wob * 0.25, d));
      float sp = step(0.88, n3(vW * 2.6 + vec3(time * 0.35, 0.0, -time * 0.3))) * step(0.55, n3(vW * 0.6 - time * 0.04));
      c = mix(c, cFoam, sp * 0.55 * smoothstep(0.4, 1.5, d));
      gl_FragColor = vec4(c, ${PACK ? '-1.0' : '1.0'});
      #include <fog_fragment>
    }`
});
function buildWater(ico, ha) {
  const n = ico.count, idx = ico.idx;
  const keep = [];
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    if (Math.min(ha[a], ha[b], ha[c]) < SEA + 0.25) keep.push(a, b, c);
  }
  const pos = new Float32Array(n * 3), dep = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const r = R + SEA;
    pos[i * 3] = ico.pos[i * 3] * r; pos[i * 3 + 1] = ico.pos[i * 3 + 1] * r; pos[i * 3 + 2] = ico.pos[i * 3 + 2] * r;
    dep[i] = SEA - ha[i];
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aDepth', new THREE.BufferAttribute(dep, 1));
  geo.setIndex(keep);
  geo.computeBoundingSphere();
  const m = new THREE.Mesh(geo, waterMat);
  m.matrixAutoUpdate = false; m.renderOrder = -1;
  scene.add(m);
  TERRAIN.water = m;
}
