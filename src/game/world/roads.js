// ================= ruas, calçadas, deques e trilhas =================
import * as THREE from 'three';
import { R, SEA } from '../core/config.js';
import { col, dirOf, lerp, sstep, tmpV, tmpV2, tmpV3 } from '../core/math.js';
import { chunkGeo, chunkOf } from './chunks.js';
import { addCornerArea, baseH, cornerAt, RHASH, roadNear, THASH } from './terrain.js';

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
  planCorners(); restoreCuts();
}
const _rp = new THREE.Vector3();
// estaca quadrada (0,18) do topo y0 até y1 (alturas absolutas)
function pierPost(g, e, lat, y0, y1) {
  const w = 0.09, P = (a, b, y) => e.d.clone().addScaledVector(e.s, (lat + a) / R).addScaledVector(e.t, b / R).normalize().multiplyScalar(R + y);
  const cs = [[-w, -w], [w, -w], [w, w], [-w, w]];
  for (let q = 0; q < 4; q++) {
    const [a0, b0] = cs[q], [a1, b1] = cs[(q + 1) % 4];
    const p0 = P(a0, b0, y1), p1 = P(a1, b1, y1), p2 = P(a1, b1, y0), p3 = P(a0, b0, y0);
    const out = e.s.clone().multiplyScalar(a0 + a1).addScaledVector(e.t, b0 + b1);
    const n = tmpV.subVectors(p1, p0).cross(tmpV2.subVectors(p3, p0));
    if (n.dot(out) >= 0) g.quad(p0, p1, p2, p3, RC.woodD, { id: 3 }); else g.quad(p0, p3, p2, p1, RC.woodD, { id: 3 });
  }
}
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
        // pontas do deque: tampa de madeira até embaixo (sem ela, de lado dava para ver por baixo e o tampo parecia solto)
        if (!rd.closed) for (const [e, sgn] of [[i === 0 ? s0 : null, -1], [i === segs - 1 ? s1 : null, 1]]) {
          if (!e) continue;
          const p0 = roadPt(e, -hw, e.h + yb), p1 = roadPt(e, hw, e.h + yb), p2 = roadPt(e, hw, e.h + yt), p3 = roadPt(e, -hw, e.h + yt);
          const n = tmpV.subVectors(p1, p0).cross(tmpV2.subVectors(p3, p0));
          if (n.dot(tmpV3.copy(e.t).multiplyScalar(sgn)) >= 0) g.quad(p0, p1, p2, p3, RC.woodD, { id: 3 }); else g.quad(p0, p3, p2, p1, RC.woodD, { id: 3 });
        }
        // estacas do píer até dentro d'água (antes o píer era uma tábua solta boiando: de baixo não tinha nada)
        if (rd.kind === 'pier') for (const e of [s0, ...(i === segs - 1 ? [s1] : [])]) {
          const k = e === s0 ? i : i + 1;
          if (k % 3 && k !== 0 && k !== N - 1) continue;
          for (const side of [-1, 1]) pierPost(g, e, side * (hw - 0.12), e.h + yt - 0.05, Math.min(SEA - 1.2, baseH(e.d) - 0.4));
        }
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
          // ponta solta da calçada (fim da rua, ou onde a calçada para num corte sem esquina): fecha com uma tampa
          const cutAt = (j) => { if (rd.closed) j = (j + N) % N; else if (j < 0 || j >= N) return false; return side > 0 ? S[j].cutR : S[j].cutL; };
          const endA = !rd.closed && i === 0, endB = !rd.closed && i === segs - 1;
          const capA = endA || (!endA && cutAt(i - 1)), capB = endB || (!endB && cutAt(i + 2));
          for (const [e, sgn, isEnd] of [[capA ? s0 : null, -1, endA], [capB ? s1 : null, 1, endB]]) {
            if (!e) continue;
            if (isEnd && roadNear(e.d, (r) => r !== rd && r.kind !== 'trail')?.dist < 4) continue;
            if (!isEnd && cornerAt(tmpV.copy(e.d).addScaledVector(e.t, sgn * 0.3 / R).addScaledVector(e.s, side * (hw + sw * 0.5) / R).normalize(), 0.1)) continue;
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
// as esquinas são planejadas antes do terreno (o chão afunda embaixo delas e os pés pisam nelas)
// e desenhadas depois, junto com as ruas
export const CORNERS = [];
const NS = 8;
const CORNER_R = 2.2;   // raio da curva do meio-fio nas esquinas
function planCorners() {
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
        // vértice: o primeiro ponto do meio-fio desta rua (lado sg) que sai do asfalto da outra
        let kv = i0, rv = null;
        for (; kv >= 0 && kv < N && Math.abs(kv - i0) * M.step < 9; kv += dir) {
          const r = roadNear(roadPt(S[kv], sg * M.hw, 0).normalize(), (q) => q === J);
          if (r && r.dist >= J.hw) { rv = { lat: r.lat, i: r.i, h: r.h }; break; }
        }
        if (!rv) continue;
        const tau = rv.lat > 0 ? 1 : -1, j0 = rv.i;
        // ângulo de verdade entre as duas bordas: o tamanho da curva sai dele
        // (antes saía do comprimento do corte, igual dos dois lados: no lado aberto a curva ficava enorme
        // e caía num "bico" torto que entrava no asfalto)
        const uOut = S[kv].t.clone().multiplyScalar(dir);
        const vOut = JS[j0].t.clone(); if (vOut.dot(S[kv].s) * sg < 0) vOut.negate();
        const th = Math.acos(Math.max(-1, Math.min(1, uOut.dot(vOut))));
        if (th < 0.5) { planNose(M, i0, dir, sg, J); continue; }
        let tl = Math.max(0.6, Math.min(3.2, CORNER_R / Math.tan(th / 2)));
        // a outra rua faz curva logo ali: a esquina acaba antes da curva (senão o meio-fio cortava o quarteirão)
        const jd = JS[j0].t.dot(vOut) > 0 ? 1 : -1;
        for (let q = 1; q * J.step < tl; q++) {
          const j = J.closed ? (j0 + jd * q + JN) % JN : j0 + jd * q;
          if (j < 0 || j >= JN || JS[j].t.dot(JS[j0].t) < 0.94) { tl = Math.max(0.6, (q - 1) * J.step); break; }
        }
        const k = kv + dir * Math.round(tl / M.step);
        if (k < 0 || k >= N) continue;
        const sk = S[k];
        let best = j0 + jd * Math.round(tl / J.step);
        if (J.closed) best = (best + JN) % JN; else if (best < 0 || best >= JN) continue;
        const A = roadPt(sk, sg * M.hw, 0).normalize(), B = roadPt(sk, sg * (M.hw + M.sw), 0).normalize();
        const sj = JS[best];
        const D = roadPt(sj, tau * J.hw, 0).normalize(), C2 = roadPt(sj, tau * (J.hw + J.sw), 0).normalize();
        // direções das bordas, apontando para a esquina
        const uM = sk.t.clone().multiplyScalar(-dir);
        const vJ = sj.t.clone(); if (vJ.dot(tmpV3.subVectors(A, D)) < 0) vJ.negate();
        // controle das curvas: o vértice de verdade (onde os meios-fios e as bordas de fora se cruzam no mapa);
        // com as retas tangentes, a outra rua fazendo curva jogava o encontro longe e a esquina virava uma língua
        const Qi = roadPt(S[kv], sg * M.hw, 0).normalize();
        let Qo = null;
        for (let q = i0; q !== k; q += dir) {
          const Bq = roadPt(S[q], sg * (M.hw + M.sw), 0).normalize(), r = roadNear(Bq, (x) => x === J);
          if (r && r.dist >= J.hw + J.sw) { Qo = Bq; break; }
        }
        if (!Qo) Qo = meet(B, uM, C2, vJ, 5 / R) || B.clone().add(C2).multiplyScalar(0.5);
        Qo.normalize();
        // alturas de cada lado: a esquina sobe/desce de uma rua para a outra em vez de flutuar sobre a mais baixa
        const yTM = sk.h + M.top + 0.13 + M.level * 0.004, yTJ = sj.h + J.top + 0.13 + J.level * 0.004;
        const yRM = sk.h + M.top + 0.004, yRJ = sj.h + J.top + 0.004;
        const inner = [], outer = [], tops = [];
        for (let u = 0; u <= NS; u++) {
          inner.push(bez(A, Qi, D, u / NS, new THREE.Vector3()).normalize()); outer.push(bez(B, Qo, C2, u / NS, new THREE.Vector3()).normalize());
          tops.push(lerp(yTM, yTJ, sstep(0, 1, u / NS)) - 0.002);
        }
        // os cortes entre a ponta da rua e a esquina são da esquina: não voltam a ser calçada
        for (let q = i0; q !== k; q += dir) S[q][sg > 0 ? 'ownR' : 'ownL'] = true;
        // na outra rua: do vértice até o fim da curva, e de volta até o asfalto desta (sem pegar o lado da outra esquina)
        const own = (j) => { JS[j][tau > 0 ? 'ownR' : 'ownL'] = true; }, wrap = (j) => (J.closed ? (j + JN) % JN : j);
        for (let q = 0, j = j0; q < 40 && j >= 0 && j < JN && j !== best; q++, j = wrap(j + jd)) own(j);
        for (let q = 1, j = wrap(j0 - jd); q < 20 && j >= 0 && j < JN; q++, j = wrap(j - jd)) {
          const r = roadNear(roadPt(JS[j], tau * (J.hw + J.sw * 0.5), 0).normalize(), (x) => x === M);
          if (!r || r.dist < M.hw || r.dist > M.hw + M.sw + 0.3) break;
          own(j);
        }
        const yV = Math.min(S[kv].h + M.top, rv.h + J.top) + 0.004;
        const cn = { M: M.name, J: J.name, up: sk.d.clone(), Qi, inner, outer, tops, yRM, yRJ, yV, yB: Math.min(sk.h, sj.h) - 0.3 };
        CORNERS.push(cn); addCornerArea(inner, outer, tops);
      }
    }
  }
}
// bico: no lado do ângulo fechado, onde a rua chega quase paralela à outra, as duas calçadas viram
// uma ilha só entre os dois meios-fios (antes sobravam pedaços de calçada tortos e buracos de terra)
function planNose(M, i0, dir, sg, J) {
  const S = M.S, N = S.length, lane = [];
  const yTop = (rd, h) => h + rd.top + 0.13 + rd.level * 0.004;
  for (let k = i0; k >= 0 && k < N && lane.length < 80; k += dir) {
    const sk = S[k], A = roadPt(sk, sg * M.hw, 0).normalize();
    const rn = roadNear(A, (r) => r === J); if (!rn) break;
    if (!lane.length && rn.dist < J.hw + 0.05) continue;
    // ponto do meio-fio da outra rua mais perto deste
    const JS = J.S, sa = JS[rn.a], sb = JS[rn.b], t = rn.t, tau = rn.lat > 0 ? 1 : -1, hJ = rn.h;
    const base = sa.d.clone().lerp(sb.d, t).normalize(), sv = sa.s.clone().lerp(sb.s, t).normalize();
    const D = base.addScaledVector(sv, tau * J.hw / R).normalize();
    lane.push({ k, A, D, yM: yTop(M, sk.h), yJ: yTop(J, hJ), hM: sk.h + M.top, hJ: hJ + J.top, ja: rn.a, jb: rn.b, tau });
    const B = roadPt(sk, sg * (M.hw + M.sw), 0).normalize(), rb = roadNear(B, (r) => r === J);
    if (!rb || rb.dist > J.hw + J.sw + 0.5) break;
  }
  if (lane.length < 2) return;
  for (const L of lane) {
    S[L.k][sg > 0 ? 'ownR' : 'ownL'] = true;
    J.S[L.ja][L.tau > 0 ? 'ownR' : 'ownL'] = true; J.S[L.jb][L.tau > 0 ? 'ownR' : 'ownL'] = true;
  }
  for (let k = i0; k !== lane[0].k; k += dir) S[k][sg > 0 ? 'ownR' : 'ownL'] = true;
  const inner = lane.map((L) => L.A), outer = lane.map((L) => L.D);
  CORNERS.push({ nose: true, M: M.name, J: J.name, up: lane[0].A.clone(), lane, yB: Math.min(...lane.map((L) => Math.min(L.hM, L.hJ))) - 0.3 });
  addCornerArea(inner, outer, lane.map((L) => L.yM), lane.map((L) => L.yJ));
}
// calçada cortada sem nada no lugar (nem asfalto, nem calçada de outra rua, nem esquina) volta a existir:
// o corte é largo para abrir espaço para a esquina, e onde a esquina não chegava ficava um buraco de terra
function restoreCuts() {
  const others = (rd) => ROADS.filter((o) => o !== rd && o.kind !== 'trail');
  for (const rd of ROADS) {
    if (rd.kind === 'trail' || !rd.sw) continue;
    const os = others(rd);
    for (const s of rd.S) for (const side of [-1, 1]) {
      if (!(side > 0 ? s.cutR : s.cutL) || (side > 0 ? s.ownR : s.ownL)) continue;
      // fica cortada se o meio dela já tem chão de rua (asfalto, calçada de outra rua ou esquina)
      // ou se a beirada encosta no asfalto de outra rua
      let keep = false;
      for (const [lat, mid] of [[rd.hw + 0.05, false], [rd.hw + rd.sw * 0.5, true]]) {
        const q = tmpV.copy(s.d).addScaledVector(s.s, side * lat / R).normalize();
        if (mid && cornerAt(q, 0.05)) { keep = true; break; }
        for (const o of os) {
          const rn = roadNear(q, (r) => r === o); if (!rn) continue;
          if (rn.dist < o.hw + (mid ? 0.05 : -0.05)) { keep = true; break; }
          if (mid && o.sw && rn.dist < o.hw + o.sw && !(rn.lat > 0 ? o.S[rn.i].cutR : o.S[rn.i].cutL)) { keep = true; break; }
        }
        if (keep) break;
      }
      if (!keep) { if (side > 0) s.cutR = false; else s.cutL = false; }
    }
  }
}
function buildNose(cn) {
  const { lane, yB } = cn, at = (d, y) => d.clone().multiplyScalar(R + y);
  for (let i = 0; i < lane.length - 1; i++) {
    const L0 = lane[i], L1 = lane[i + 1], up = L0.A, g = chunkGeo(chunkOf(up), 'road');
    quadUp(g, at(L0.A, L0.yM), at(L0.D, L0.yJ), at(L1.D, L1.yJ), at(L1.A, L1.yM), RC.side, up, { pat: 6, id: 2 });
    // meio-fio dos dois lados, virado para o asfalto de cada rua
    for (const [P0, P1, y0, y1, h0, h1, Q0] of [[L0.A, L1.A, L0.yM, L1.yM, L0.hM, L1.hM, L0.D], [L0.D, L1.D, L0.yJ, L1.yJ, L0.hJ, L1.hJ, L0.A]]) {
      const a0 = at(P0, h0 - 0.4), a1 = at(P1, h1 - 0.4), a2 = at(P1, y1), a3 = at(P0, y0);
      const away = tmpV3.subVectors(P0, Q0);
      const n = new THREE.Vector3().subVectors(a1, a0).cross(new THREE.Vector3().subVectors(a3, a0));
      if (n.dot(away) >= 0) g.quad(a0, a1, a2, a3, RC.curb, { id: 2 }); else g.quad(a0, a3, a2, a1, RC.curb, { id: 2 });
    }
  }
  // fim da ilha, onde as duas calçadas se separam
  const E = lane[lane.length - 1], P = lane[lane.length - 2], g = chunkGeo(chunkOf(E.A), 'road');
  const b0 = at(E.A, yB), b1 = at(E.D, yB), b2 = at(E.D, E.yJ), b3 = at(E.A, E.yM);
  const n = new THREE.Vector3().subVectors(b1, b0).cross(new THREE.Vector3().subVectors(b3, b0)), away = tmpV3.subVectors(E.A, P.A);
  if (n.dot(away) >= 0) g.quad(b0, b1, b2, b3, RC.sideFace, { id: 2 }); else g.quad(b0, b3, b2, b1, RC.sideFace, { id: 2 });
}
export function buildCorners() {
  for (const cn of CORNERS) {
    if (cn.nose) { buildNose(cn); continue; }
    const { up, Qi, inner, outer, tops, yRM, yRJ, yV, yB } = cn;
    const yR = (u) => lerp(yRM, yRJ, sstep(0, 1, u));
    const g = chunkGeo(chunkOf(up), 'road');
    const at = (d, y) => d.clone().multiplyScalar(R + y);
    // o leque fica um pouco abaixo das duas ruas: só aparece onde nenhuma delas cobre (antes furava o asfalto em lascas)
    // no vértice, a altura do asfalto ali (o mínimo das pontas ficava acima da rua em descida e sobrava uma cunha)
    // e passa um pouco do vértice para dentro das duas ruas (fica embaixo delas): com a rua fazendo curva,
    // a reta até o vértice deixava uma fresta clara de chão entre o leque e o asfalto
    const mid = inner[0].clone().add(inner[NS]).normalize(), Qx = Qi.clone().addScaledVector(Qi.clone().sub(mid).normalize(), 0.9 / R).normalize();
    const qR = at(Qx, Math.min(yV, yRM, yRJ) - 0.05);
    for (let u = 0; u < NS; u++) {
      const u0 = u / NS, u1 = (u + 1) / NS;
      const i0p = inner[u], i1p = inner[u + 1], o0 = outer[u], o1 = outer[u + 1];
      // calçada
      quadUp(g, at(i0p, tops[u]), at(o0, tops[u]), at(o1, tops[u + 1]), at(i1p, tops[u + 1]), RC.side, up, { pat: 6, id: 2 });
      // asfalto no canto de dentro da curva
      // (o leque tinha o vértice repetido no lugar errado: normal zero, triângulo escuro com contorno no cruzamento)
      const f0 = at(i0p, yR(u0) - 0.035), f1 = at(i1p, yR(u1) - 0.035);
      quadUp(g, f0, f1, qR, qR, RC.asphalt, up, { id: 1, n: [i0p, i1p, Qx, Qx] });
      // meio-fio (para o lado do asfalto) e borda de fora
      const toQ = tmpV3.subVectors(Qi, i0p);
      const a0 = at(i0p, yR(u0) - 0.4), a1 = at(i1p, yR(u1) - 0.4), a2 = at(i1p, tops[u + 1]), a3 = at(i0p, tops[u]);
      const nC = new THREE.Vector3().subVectors(a1, a0).cross(new THREE.Vector3().subVectors(a3, a0));
      if (nC.dot(toQ) >= 0) g.quad(a0, a1, a2, a3, RC.curb, { id: 2 }); else g.quad(a0, a3, a2, a1, RC.curb, { id: 2 });
      const awayO = tmpV3.subVectors(o0, Qi);
      const b0 = at(o0, yB), b1 = at(o1, yB), b2 = at(o1, tops[u + 1]), b3 = at(o0, tops[u]);
      const nO = new THREE.Vector3().subVectors(b1, b0).cross(new THREE.Vector3().subVectors(b3, b0));
      if (nO.dot(awayO) >= 0) g.quad(b0, b1, b2, b3, RC.sideFace, { id: 2 }); else g.quad(b0, b3, b2, b1, RC.sideFace, { id: 2 });
    }
  }
}
// ponto ao longo de uma rua: (direção, frente, lado) para colocar coisas
function roadFrame(rd, i, lat) {
  const S = rd.S, s = S[((i % S.length) + S.length) % S.length];
  const d = s.d.clone().addScaledVector(s.s, lat / R).normalize();
  return { d, t: s.t.clone(), s: s.s.clone(), h: s.h, samp: s };
}
