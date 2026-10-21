// ================= ruas, calçadas, deques e trilhas =================
import * as THREE from 'three';
import { R } from '../core/config.js';
import { col, dirOf, tmpV, tmpV2, tmpV3 } from '../core/math.js';
import { chunkGeo, chunkOf } from './chunks.js';
import { baseH, RHASH, roadNear, THASH } from './terrain.js';

export const ROADS = [];
const RC = {
  asphalt: col('#6d7b7f'), asphaltL: col('#78868a'), line: col('#e9ece3'), yellow: col('#efc25a'), curb: col('#dcdfd6'), side: col('#c9cdc2'),
  sideFace: col('#aeb4aa'), wood: col('#b48d63'), woodD: col('#8e6c4b'), stone: col('#c6c1b0')
};
// o: { name, pts: [[lat,lon]], closed, w, sw, kind: asphalt|lane|wood|pier|trail|stone, level, marks, fixedH, step }
export function defRoad(o) {
  const pts = o.pts.map(([a, b]) => dirOf(a, b));
  const curve = new THREE.CatmullRomCurve3(pts, !!o.closed, 'centripetal');
  const len = curve.getLength() * R;
  const step = o.step || 0.5;
  const n = Math.max(3, Math.round(len / step));
  curve.arcLengthDivisions = n * 4;
  let sp = curve.getSpacedPoints(n).map((p) => p.normalize());
  if (o.closed) sp.pop();
  const rd = Object.assign({ w: 3, sw: 1.4, kind: 'asphalt', level: 0, marks: 'dash' }, o);
  rd.hw = rd.w / 2; if (rd.kind === 'trail' || rd.kind === 'wood' || rd.kind === 'pier') rd.sw = 0;
  rd.S = sp.map((d) => ({ d, x: d.x * R, y: d.y * R, z: d.z * R, h: 0, t: new THREE.Vector3(), s: new THREE.Vector3(), cutL: false, cutR: false, inter: false, road: rd }));
  const N = rd.S.length;
  for (let i = 0; i < N; i++) {
    const s = rd.S[i];
    const a = rd.S[o.closed ? (i - 1 + N) % N : Math.max(0, i - 1)].d, b = rd.S[o.closed ? (i + 1) % N : Math.min(N - 1, i + 1)].d;
    s.t.subVectors(b, a); s.t.addScaledVector(s.d, -s.t.dot(s.d)).normalize();
    s.s.crossVectors(s.d, s.t).normalize();
    s.i = i;
  }
  rd.step = len / Math.max(1, N - (o.closed ? 0 : 1));
  rd.len = len;
  rd.top = rd.kind === 'wood' ? 0.34 : rd.kind === 'pier' ? 0 : 0.03 + rd.level * 0.006;
  ROADS.push(rd);
  return rd;
}
// alturas: segue o relevo suavizado (ou altura fixa), depois registra no hash
export function settleRoads() {
  for (const rd of ROADS) {
    const S = rd.S, N = S.length;
    for (const s of S) s.h = rd.fixedH !== undefined ? rd.fixedH : baseH(s.d);
    if (rd.fixedH === undefined) {
      for (let pass = 0; pass < 6; pass++) {
        const hh = S.map((s) => s.h);
        for (let i = 0; i < N; i++) {
          let sum = 0, cnt = 0;
          for (let k = -3; k <= 3; k++) {
            let j = i + k; if (rd.closed) j = (j + N) % N; else if (j < 0 || j >= N) continue;
            sum += hh[j]; cnt++;
          }
          S[i].h = sum / cnt;
        }
      }
      if (rd.minH !== undefined) for (const s of S) s.h = Math.max(s.h, rd.minH);
    }
    const hash = rd.kind === 'trail' ? THASH : RHASH;
    for (const s of S) hash.insert(s.x, s.y, s.z, rd.kind === 'trail' ? 3 : 6.5, s);
  }
  // cortes de calçada e faixa onde uma rua cruza outra
  for (const rd of ROADS) {
    if (rd.kind === 'trail') continue;
    for (const s of rd.S) {
      for (const side of [-1, 1]) {
        if (!rd.sw) continue;
        const q = tmpV.copy(s.d).addScaledVector(s.s, side * (rd.hw + rd.sw * 0.5) / R).normalize();
        const rn = roadNear(q, (r) => r !== rd && r.kind !== 'trail');
        if (rn && rn.dist < rn.road.hw + 0.15) { if (side > 0) s.cutR = true; else s.cutL = true; }
      }
      const rn = roadNear(s.d, (r) => r !== rd && r.kind !== 'trail');
      if (rn && rn.dist < rn.road.hw + rn.road.sw + 0.6) s.inter = true;
    }
  }
}
const _rp = new THREE.Vector3();
function roadPt(s, lat, h, out = new THREE.Vector3()) {
  return out.copy(s.d).addScaledVector(s.s, lat / R).normalize().multiplyScalar(R + h);
}
// uma faixa entre duas amostras: deslocamentos laterais a0→a1, alturas y0→y1 (relativas a s.h)
function roadStrip(g, s0, s1, a0, y0, a1, y1, c, want, o) {
  const p0 = roadPt(s0, a0, s0.h + y0, new THREE.Vector3()), p1 = roadPt(s0, a1, s0.h + y1, new THREE.Vector3());
  const p2 = roadPt(s1, a1, s1.h + y1, new THREE.Vector3()), p3 = roadPt(s1, a0, s1.h + y0, new THREE.Vector3());
  const nx = tmpV.subVectors(p1, p0).cross(tmpV2.subVectors(p3, p0));
  let wdir;
  if (want === 'up') wdir = s0.d; else wdir = tmpV3.copy(s0.s).multiplyScalar(want);
  if (nx.dot(wdir) >= 0) g.quad(p0, p1, p2, p3, c, o); else g.quad(p0, p3, p2, p1, c, o && o.q ? Object.assign({}, o, { q: [o.q[0], o.q[3], o.q[2], o.q[1]] }) : o);
}
export function buildRoads() {
  for (const rd of ROADS) {
    if (rd.kind === 'trail') continue;
    const S = rd.S, N = S.length, segs = rd.closed ? N : N - 1;
    const hw = rd.hw, sw = rd.sw, top = rd.top, lv = rd.level * 0.006;
    let arc = 0;
    for (let i = 0; i < segs; i++) {
      const s0 = S[i], s1 = S[(i + 1) % N];
      const g = chunkGeo(chunkOf(s0.d), 'road');
      const a0 = arc, a1 = arc + rd.step; arc = a1;
      if (rd.kind === 'wood' || rd.kind === 'pier') {
        const yt = rd.kind === 'wood' ? top : 0;
        roadStrip(g, s0, s1, -hw, yt, hw, yt, RC.wood, 'up', { pat: 3, id: 3, q: [[a0, -hw], [a0, hw], [a1, hw], [a1, -hw]] });
        roadStrip(g, s0, s1, hw, yt, hw, yt - 0.22, RC.woodD, 1, { id: 3 });
        roadStrip(g, s0, s1, -hw, yt - 0.22, -hw, yt, RC.woodD, -1, { id: 3 });
        continue;
      }
      const c = rd.kind === 'stone' ? RC.stone : RC.asphalt;
      roadStrip(g, s0, s1, -hw, top, hw, top, c, 'up', { pat: rd.kind === 'stone' ? 2 : 0, id: 1, q: [[-hw, a0], [hw, a0], [hw, a1], [-hw, a1]] });
      // marcações
      if (rd.marks === 'dash' && !s0.inter && !s1.inter && (i % 4) < 2) roadStrip(g, s0, s1, -0.07, top + 0.004, 0.07, top + 0.004, RC.line, 'up', { id: 1 });
      if (rd.marks === 'double' && !s0.inter && !s1.inter) { roadStrip(g, s0, s1, -0.16, top + 0.004, -0.06, top + 0.004, RC.yellow, 'up', { id: 1 }); roadStrip(g, s0, s1, 0.06, top + 0.004, 0.16, top + 0.004, RC.yellow, 'up', { id: 1 }); }
      if (sw > 0) {
        const ys = top + 0.13 + rd.level * 0.004;
        for (const side of [-1, 1]) {
          const cut = side > 0 ? (s0.cutR || s1.cutR) : (s0.cutL || s1.cutL);
          if (cut) continue;
          const A = side * hw, B = side * (hw + 0.14), C2 = side * (hw + sw);
          roadStrip(g, s0, s1, A, top, A, ys, RC.curb, -side, { id: 2 });
          roadStrip(g, s0, s1, Math.min(A, B), ys, Math.max(A, B), ys, RC.curb, 'up', { id: 2 });
          roadStrip(g, s0, s1, Math.min(B, C2), ys, Math.max(B, C2), ys, RC.side, 'up', { pat: 6, id: 2, q: side > 0 ? [[B, a0], [C2, a0], [C2, a1], [B, a1]] : [[C2, a0], [B, a0], [B, a1], [C2, a1]] });
          roadStrip(g, s0, s1, C2, ys, C2, -0.3, RC.sideFace, side, { id: 2 });
        }
      } else if (rd.kind === 'lane') {
        for (const side of [-1, 1]) roadStrip(g, s0, s1, side * hw, top, side * hw, -0.25, RC.sideFace, side, { id: 1 });
      }
    }
  }
}
// ponto ao longo de uma rua: (direção, frente, lado) para colocar coisas
function roadFrame(rd, i, lat) {
  const S = rd.S, s = S[((i % S.length) + S.length) % S.length];
  const d = s.d.clone().addScaledVector(s.s, lat / R).normalize();
  return { d, t: s.t.clone(), s: s.s.clone(), h: s.h, samp: s };
}
