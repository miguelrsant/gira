// ================= ruas, calçadas, deques e trilhas =================
import * as THREE from 'three';
import { R } from '../core/config.js';
import { col, dirOf, lerp, sstep, tmpV, tmpV2, tmpV3 } from '../core/math.js';
import { chunkGeo, chunkOf } from './chunks.js';
import { baseH, RHASH, roadNear, THASH } from './terrain.js';

export const ROADS = [];
const FILLET = 1.3;   // raio extra das esquinas
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
  // curvas fechadas demais dobram a calçada do lado de dentro: alisa até o raio caber
  if (rd.kind !== 'trail') sp = relaxPath(sp, !!o.closed, rd.hw + rd.sw + 0.6, step);
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
// raio de curva local (em unidades) no ponto i de uma polilinha na esfera
function bendRadius(p, i, closed) {
  const N = p.length, a = p[closed ? (i - 1 + N) % N : i - 1], b = p[i], c = p[closed ? (i + 1) % N : i + 1];
  const u = tmpV.subVectors(b, a), v = tmpV2.subVectors(c, b), lu = u.length(), lv = v.length();
  const ang = Math.acos(Math.min(1, u.dot(v) / (lu * lv || 1)));
  return ang < 1e-6 ? 1e9 : (lu + lv) * 0.5 * R / ang;
}
function relaxPath(sp, closed, minR, step) {
  const N = sp.length;
  let p = sp.map((d) => d.clone());
  for (let pass = 0; pass < 400; pass++) {
    let bad = false;
    const q = p.map((d) => d.clone());
    for (let i = closed ? 0 : 1; i < (closed ? N : N - 1); i++) {
      if (bendRadius(p, i, closed) >= minR) continue;
      bad = true;
      // espalha o alisamento pelos vizinhos para não criar um bico novo ao lado
      for (let k = -2; k <= 2; k++) {
        let j = i + k; if (closed) j = (j + N) % N; else if (j < 1 || j > N - 2) continue;
        const a = p[closed ? (j - 1 + N) % N : j - 1], c = p[closed ? (j + 1) % N : j + 1];
        const w = k === 0 ? 0.5 : Math.abs(k) === 1 ? 0.3 : 0.12;
        q[j].lerp(tmpV3.addVectors(a, c).multiplyScalar(0.5), w);
      }
    }
    p = q.map((d) => d.normalize());
    if (!bad) break;
  }
  // reamostra com passo uniforme (o alisamento encurta a rua)
  const curve = new THREE.CatmullRomCurve3(p, closed, 'centripetal');
  const n = Math.max(3, Math.round(curve.getLength() * R / step));
  curve.arcLengthDivisions = n * 4;
  const out = curve.getSpacedPoints(n).map((d) => d.normalize());
  if (closed) out.pop();
  return out;
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
      // endH: a rua termina chegando nessa altura (a Ladeira sobe até o platô da mansão, sem degrau no fim)
      if (rd.endH !== undefined) { const L = Math.max(4, Math.round(9 / rd.step)); for (let i = 0; i < N; i++) S[i].h = lerp(S[i].h, rd.endH, sstep(N - 1 - L, N - 1, i)); }
    }
    const hash = rd.kind === 'trail' ? THASH : RHASH;
    for (const s of S) hash.insert(s.x, s.y, s.z, rd.kind === 'trail' ? 3 : 6.5, s);
  }
  // cruzamentos: a rua secundária chega na altura da principal, e só perto do encontro
  // (antes puxava pela distância lateral e afundava ruas inteiras que corriam ao lado de outra)
  const order = ROADS.filter((r) => r.kind !== 'trail' && r.fixedH === undefined).sort((a, b) => a.level - b.level);
  for (const rd of order) {
    const S = rd.S, N = S.length, meets = [];
    for (let i = 0; i < N; i++) {
      const rn = roadNear(S[i].d, (r) => r !== rd && r.kind !== 'trail' && r.fixedH === undefined && r.level < rd.level);
      if (rn && rn.dist < rn.road.hw) meets.push([i, rn.h]);
    }
    if (!meets.length) continue;
    const L = Math.max(3, Math.round(5 / rd.step)), h0 = S.map((s) => s.h);
    for (let i = 0; i < N; i++) {
      let bw = 0, bt = 0;
      for (const [j, th] of meets) {
        let k = Math.abs(i - j); if (rd.closed) k = Math.min(k, N - k);
        const w = 1 - sstep(0, L, k); if (w > bw) { bw = w; bt = th; }
      }
      if (bw > 0) S[i].h = lerp(h0[i], bt, bw);
    }
  }
  // cortes de calçada e faixa onde uma rua cruza outra
  for (const rd of ROADS) {
    if (rd.kind === 'trail') continue;
    for (const s of rd.S) {
      for (const side of [-1, 1]) {
        if (!rd.sw) continue;
        // corta a calçada se qualquer parte dela (borda de dentro, meio, borda de fora) cai no asfalto de outra rua
        for (const lat of [rd.hw + 0.05, rd.hw + rd.sw * 0.5, rd.hw + rd.sw - 0.05]) {
          const q = tmpV.copy(s.d).addScaledVector(s.s, side * lat / R).normalize();
          const rn = roadNear(q, (r) => r !== rd && r.kind !== 'trail');
          if (!rn) continue;
          const o = rn.road, beyond = !o.closed && ((rn.a === 0 && rn.t === 0) || (rn.b === o.S.length - 1 && rn.t === 1));
          // perto de outra rua com calçada, abre espaço para a esquina arredondada
          const lim = o.sw > 0 && !beyond ? o.hw + o.sw + FILLET : o.hw + 0.12;
          if (rn.dist < lim) { if (side > 0) s.cutR = true; else s.cutL = true; break; }
        }
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
  // superfícies largas viram várias faixas: uma faixa só seria uma corda reta abaixo da curva do planeta
  const n = want === 'up' ? Math.ceil(Math.abs(a1 - a0) / 0.45) : 1;
  if (n > 1) {
    for (let k = 0; k < n; k++) {
      const t0 = k / n, t1 = (k + 1) / n, q = o && o.q;
      const oq = q ? Object.assign({}, o, { q: [lq(q[0], q[1], t0), lq(q[0], q[1], t1), lq(q[3], q[2], t1), lq(q[3], q[2], t0)] }) : o;
      roadStrip1(g, s0, s1, lerp(a0, a1, t0), lerp(y0, y1, t0), lerp(a0, a1, t1), lerp(y0, y1, t1), c, want, oq);
    }
    return;
  }
  roadStrip1(g, s0, s1, a0, y0, a1, y1, c, want, o);
}
const lq = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
function roadStrip1(g, s0, s1, a0, y0, a1, y1, c, want, o) {
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
        // saia do deque vai até bem abaixo do chão: na areia inclinada não sobra vão embaixo
        const yb = rd.kind === 'wood' ? -0.9 : yt - 0.22;
        roadStrip(g, s0, s1, hw, yt, hw, yb, RC.woodD, 1, { id: 3 });
        roadStrip(g, s0, s1, -hw, yb, -hw, yt, RC.woodD, -1, { id: 3 });
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
          // ponta solta da calçada: fecha com uma tampa
          if (!rd.closed) for (const [e, sgn] of [[i === 0 ? s0 : null, -1], [i === segs - 1 ? s1 : null, 1]]) {
            if (!e || roadNear(e.d, (r) => r !== rd && r.kind !== 'trail')?.dist < 4) continue;
            const p0 = roadPt(e, A, e.h + top), p1 = roadPt(e, C2, e.h - 0.3), p2 = roadPt(e, C2, e.h + ys), p3 = roadPt(e, A, e.h + ys);
            const n = tmpV.subVectors(p1, p0).cross(tmpV2.subVectors(p3, p0));
            if (n.dot(tmpV3.copy(e.t).multiplyScalar(sgn)) >= 0) g.quad(p0, p1, p2, p3, RC.sideFace, { id: 2 }); else g.quad(p0, p3, p2, p1, RC.sideFace, { id: 2 });
          }
        }
      } else if (rd.kind === 'lane') {
        for (const side of [-1, 1]) roadStrip(g, s0, s1, side * hw, top, side * hw, -0.25, RC.sideFace, side, { id: 1 });
      }
    }
  }
}
// esquinas: onde uma rua termina em outra, o meio-fio faz uma curva de uma calçada até a outra
// ponto mais próximo entre as retas a + t·u e b + s·v (no plano tangente)
function meet(a, u, b, v, lim = 0) {
  const w = tmpV.subVectors(a, b), uu = u.dot(u), uv = u.dot(v), vv = v.dot(v), uw = u.dot(w), vw = v.dot(w), den = uu * vv - uv * uv;
  if (Math.abs(den) < 1e-6) return a.clone().add(b).multiplyScalar(0.5);
  const t = (uv * vw - vv * uw) / den, q = (uu * vw - uv * uw) / den;
  // encontro atrás de uma das bordas ou longe demais: a esquina vira reta
  if (lim && (t < 0 || q < 0 || t * Math.sqrt(uu) > lim || q * Math.sqrt(vv) > lim)) return null;
  return a.clone().addScaledVector(u, t).add(b.clone().addScaledVector(v, q)).multiplyScalar(0.5);
}
const bez = (a, q, b, u, out) => out.copy(a).multiplyScalar((1 - u) * (1 - u)).addScaledVector(q, 2 * u * (1 - u)).addScaledVector(b, u * u);
function quadUp(g, p0, p1, p2, p3, c, up, o) {
  const n = tmpV.subVectors(p1, p0).cross(tmpV2.subVectors(p3, p0));
  if (n.dot(up) >= 0) g.quad(p0, p1, p2, p3, c, o); else g.quad(p0, p3, p2, p1, c, o);
}
export function buildCorners() {
  const NS = 8;
  for (const M of ROADS) {
    if (M.closed || !M.sw || M.kind === 'trail') continue;
    const S = M.S, N = S.length;
    for (const [i0, dir] of [[0, 1], [N - 1, -1]]) {
      // a rua onde esta termina: a mais importante (menor nível) que passa embaixo da ponta
      let J = null;
      for (const r of ROADS) {
        if (r === M || r.kind === 'trail' || !r.sw || r.level >= M.level) continue;
        const rn = roadNear(S[i0].d, (q) => q === r);
        if (rn && rn.dist <= r.hw && (!J || r.level < J.level)) J = r;
      }
      if (!J) continue;
      const JS = J.S, JN = JS.length;
      for (const sg of [-1, 1]) {
        const cutOf = (s) => (sg > 0 ? s.cutR : s.cutL);
        let k = i0; while (k >= 0 && k < N && cutOf(S[k])) k += dir;
        if (k === i0 || k < 0 || k >= N) continue;
        const sk = S[k], up = sk.d;
        const A = roadPt(sk, sg * M.hw, 0).normalize(), B = roadPt(sk, sg * (M.hw + M.sw), 0).normalize();
        const rnJ = roadNear(B, (r) => r === J); if (!rnJ) continue;
        const tau = rnJ.lat > 0 ? 1 : -1, j0 = rnJ.i;
        let best = -1, bd = 1e9;
        for (let q = -18; q <= 18; q++) {
          const j = J.closed ? (j0 + q + JN) % JN : j0 + q; if (j < 0 || j >= JN) continue;
          const sj = JS[j]; if (tau > 0 ? sj.cutR : sj.cutL) continue;
          const mid = roadPt(sj, tau * (J.hw + J.sw * 0.5), 0).normalize();
          if (tmpV3.copy(mid).sub(sk.d).dot(sk.s) * sg <= 0) continue;
          const dd = mid.distanceTo(B); if (dd < bd) { bd = dd; best = j; }
        }
        if (best < 0 || bd * R > 7) continue;
        const sj = JS[best];
        const D = roadPt(sj, tau * J.hw, 0).normalize(), C2 = roadPt(sj, tau * (J.hw + J.sw), 0).normalize();
        // direções das bordas, apontando para a esquina
        const uM = sk.t.clone().multiplyScalar(-dir);
        const vJ = sj.t.clone(); if (vJ.dot(tmpV3.subVectors(A, D)) < 0) vJ.negate();
        const LIM = 5 / R;
        let Qi = meet(A, uM, D, vJ, LIM), Qo = meet(B, uM, C2, vJ, LIM);
        if (!Qi || !Qo) { Qi = A.clone().add(D).multiplyScalar(0.5); Qo = B.clone().add(C2).multiplyScalar(0.5); }
        Qi.normalize(); Qo.normalize();
        // alturas de cada lado: a esquina sobe/desce de uma rua para a outra em vez de flutuar sobre a mais baixa
        const yTM = sk.h + M.top + 0.13 + M.level * 0.004, yTJ = sj.h + J.top + 0.13 + J.level * 0.004;
        const yRM = sk.h + M.top + 0.004, yRJ = sj.h + J.top + 0.004;
        const yT = (u) => lerp(yTM, yTJ, sstep(0, 1, u)) - 0.002, yR = (u) => lerp(yRM, yRJ, sstep(0, 1, u));
        const yB = Math.min(sk.h, sj.h) - 0.3;
        const g = chunkGeo(chunkOf(sk.d), 'road');
        const inner = [], outer = [];
        for (let u = 0; u <= NS; u++) { inner.push(bez(A, Qi, D, u / NS, new THREE.Vector3()).normalize()); outer.push(bez(B, Qo, C2, u / NS, new THREE.Vector3()).normalize()); }
        const at = (d, y) => d.clone().multiplyScalar(R + y);
        const qR = at(Qi, Math.min(yRM, yRJ));
        for (let u = 0; u < NS; u++) {
          const u0 = u / NS, u1 = (u + 1) / NS;
          const i0p = inner[u], i1p = inner[u + 1], o0 = outer[u], o1 = outer[u + 1];
          // calçada
          quadUp(g, at(i0p, yT(u0)), at(o0, yT(u0)), at(o1, yT(u1)), at(i1p, yT(u1)), RC.side, up, { pat: 6, id: 2 });
          // asfalto no canto de dentro da curva
          quadUp(g, qR, at(i0p, yR(u0)), at(i1p, yR(u1)), qR, RC.asphalt, up, { id: 1 });
          // meio-fio (para o lado do asfalto) e borda de fora
          const toQ = tmpV3.subVectors(Qi, i0p);
          const a0 = at(i0p, yR(u0) - 0.4), a1 = at(i1p, yR(u1) - 0.4), a2 = at(i1p, yT(u1)), a3 = at(i0p, yT(u0));
          const nC = new THREE.Vector3().subVectors(a1, a0).cross(new THREE.Vector3().subVectors(a3, a0));
          if (nC.dot(toQ) >= 0) g.quad(a0, a1, a2, a3, RC.curb, { id: 2 }); else g.quad(a0, a3, a2, a1, RC.curb, { id: 2 });
          const awayO = tmpV3.subVectors(o0, Qi);
          const b0 = at(o0, yB), b1 = at(o1, yB), b2 = at(o1, yT(u1)), b3 = at(o0, yT(u0));
          const nO = new THREE.Vector3().subVectors(b1, b0).cross(new THREE.Vector3().subVectors(b3, b0));
          if (nO.dot(awayO) >= 0) g.quad(b0, b1, b2, b3, RC.sideFace, { id: 2 }); else g.quad(b0, b3, b2, b1, RC.sideFace, { id: 2 });
        }
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
