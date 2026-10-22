// ---------------- animação procedural ----------------
// pernas com IK de duas juntas: o pé pisa e fica no chão enquanto o corpo passa por cima dele.
// a passada tem ritmo de gente (uns 2,5 passos por segundo andando), o quadril sobe, desce e gira,
// o tronco gira ao contrário e os braços balançam junto. parado: respira, troca o peso de perna
// e olha em volta. molas cuidam do pulo, da aterrissagem, do arranque, da freada e das curvas.
import * as THREE from 'three';
import { clamp, lerp, rand, rr, sstep } from '../core/math.js';
import { setFace } from './bodies.js';

const TAU = Math.PI * 2;
const frac = (x) => x - Math.floor(x);
const env = (p, a, b) => sstep(0, a, p) * (1 - sstep(b, 1, p));

// jeito de andar e de ficar parado de cada humor (a Duda). os NPCs usam 'tranquila' e o cansaço deles
export const STYLES = {
  tranquila: { lift: 1, bounce: 1, arm: 1, lean: 0, head: 0, slump: 0, cad: 1, stomp: 0, skip: 0, fist: 0, fidget: 1 },
  irritada: { lift: 0.8, bounce: 1.25, arm: 0.7, lean: 0.08, head: 0.05, slump: 0.1, cad: 1.08, stomp: 1, skip: 0, fist: 1, fidget: 1.3 },
  entediada: { lift: 0.5, bounce: 0.55, arm: 0.42, lean: 0.02, head: 0.08, slump: 0.35, cad: 0.9, stomp: 0, skip: 0, fist: 0, fidget: 1.6 },
  cansada: { lift: 0.55, bounce: 0.65, arm: 0.5, lean: 0.08, head: 0.1, slump: 0.55, cad: 0.92, stomp: 0, skip: 0, fist: 0, fidget: 1 },
  exausta: { lift: 0.34, bounce: 0.5, arm: 0.28, lean: 0.15, head: 0.12, slump: 0.95, cad: 0.86, stomp: 0.25, skip: 0, fist: 0, fidget: 1.2 },
  feliz: { lift: 1.25, bounce: 1.35, arm: 1.2, lean: -0.02, head: -0.07, slump: 0, cad: 1.04, stomp: 0, skip: 1, fist: 0, fidget: 1 },
};
const STYLE_KEYS = Object.keys(STYLES.tranquila);

// ---------------- gestos de uma vez só (heroGesture, e os da Duda quando fica parada) ----------------
// cada gesto soma rotações por cima da pose; p vai de 0 a 1 ao longo da duração
export const GESTS = {
  suspiro: { dur: 1.9, eyes: [0.45, 0.8], fn(p, B) {
    const up = env(p, 0.25, 0.4) * (1 - sstep(0.35, 0.5, p)), down = env(p, 0.55, 0.8) * sstep(0.35, 0.55, p);
    B[1].rotation.x += -0.07 * up + 0.16 * down; B[2].rotation.x += -0.12 * up + 0.24 * down;
    B[3].rotation.z += 0.1 * up - 0.04 * down; B[5].rotation.z -= 0.1 * up - 0.04 * down;
    B[0].position.y += 0.012 * up - 0.02 * down;
  } },
  bocejo: { dur: 2.3, eyes: [0.2, 0.75], mouth: [0.2, 0.7], fn(p, B) {
    const e = env(p, 0.22, 0.72);
    B[2].rotation.x += -0.32 * e; B[1].rotation.x += -0.08 * e;
    B[5].rotation.x += -1.55 * e; B[5].rotation.z += 0.25 * e; B[6].rotation.x += -1.95 * e;
    B[3].rotation.z += 0.18 * e;
  } },
  'dor-de-cabeca': { dur: 2.6, eyes: [0.25, 0.85], fn(p, B, t) {
    const e = env(p, 0.18, 0.8);
    B[5].rotation.x += -1.7 * e; B[5].rotation.z += 0.35 * e; B[6].rotation.x += -2.05 * e; B[6].rotation.y += 0.4 * e;
    B[2].rotation.x += 0.28 * e; B[2].rotation.z += 0.16 * e + Math.sin(t * 5) * 0.03 * e;
    B[1].rotation.x += 0.1 * e;
  } },
  bufar: { dur: 1.3, fn(p, B, t) {
    const e = env(p, 0.15, 0.75);
    B[1].rotation.x += -0.05 * e; B[2].rotation.y += Math.sin(p * 18) * 0.16 * e;
    B[3].rotation.x += 0.3 * e; B[5].rotation.x += 0.3 * e; B[3].rotation.z += 0.18 * e; B[5].rotation.z -= 0.18 * e;
    B[4].rotation.x += 0.15 * e; B[6].rotation.x += 0.15 * e;
    B[0].position.y += Math.max(0, Math.sin(p * Math.PI * 2)) * 0.015 * e;
  } },
  espreguicar: { dur: 2.6, eyes: [0.25, 0.7], mouth: [0.3, 0.6], fn(p, B) {
    const e = env(p, 0.3, 0.7);
    B[3].rotation.z += 2.55 * e; B[5].rotation.z -= 2.55 * e; B[3].rotation.x += -0.35 * e; B[5].rotation.x += -0.35 * e;
    B[4].rotation.x += -0.25 * e; B[6].rotation.x += -0.25 * e;
    B[1].rotation.x += -0.16 * e; B[2].rotation.x += -0.22 * e;
    B[0].position.y += 0.035 * e;
  } },
  'olhar-relogio': { dur: 2.1, fn(p, B, t) {
    const e = env(p, 0.2, 0.78);
    B[3].rotation.x += -1.15 * e; B[3].rotation.z += -0.22 * e; B[4].rotation.x += -1.55 * e; B[4].rotation.y += -0.9 * e;
    B[2].rotation.x += 0.42 * e; B[2].rotation.y += 0.32 * e;
    B[2].rotation.y += Math.sin(t * 6) * 0.07 * sstep(0.62, 0.72, p) * e;
  } },
  // da Duda quando fica um tempo parada (não precisam de nome na API)
  coçar: { dur: 1.6, fn(p, B, t) {
    const e = env(p, 0.2, 0.75);
    B[5].rotation.x += -1.9 * e; B[5].rotation.z += 0.7 * e; B[6].rotation.x += -1.9 * e + Math.sin(t * 16) * 0.12 * e;
    B[2].rotation.z += 0.14 * e; B[2].rotation.x += 0.06 * e;
  } },
  'pé-chão': { dur: 1.8, fn(p, B, t, G) {
    const e = env(p, 0.15, 0.85);
    G.toeTap = e * Math.max(0, Math.sin(t * 14));
    B[2].rotation.x += 0.1 * e;
  } },
  balançar: { dur: 2.4, fn(p, B, t) {
    const e = env(p, 0.2, 0.8), s = Math.sin(p * Math.PI * 4);
    B[0].position.y += Math.max(0, s) * 0.02 * e; B[1].rotation.x += -0.04 * s * e;
    B[3].rotation.x += 0.35 * e; B[5].rotation.x += 0.35 * e; B[4].rotation.x += -0.5 * e; B[6].rotation.x += -0.5 * e;
    B[2].rotation.z += Math.sin(p * Math.PI * 2) * 0.12 * e;
  } },
};
// gestos de mão enquanto fala
const TALK = {
  explica: (e, B, t) => { B[5].rotation.x += -0.75 * e; B[5].rotation.z += -0.12 * e; B[6].rotation.x += -0.85 * e + Math.sin(t * 5) * 0.12 * e; B[6].rotation.y += 0.5 * e; },
  ombros: (e, B) => { B[3].rotation.z += 0.38 * e; B[5].rotation.z -= 0.38 * e; B[4].rotation.x += -1.05 * e; B[6].rotation.x += -1.05 * e; B[4].rotation.y += -0.6 * e; B[6].rotation.y += 0.6 * e; B[2].rotation.z += 0.1 * e; },
  aponta: (e, B) => { B[3].rotation.x += -1.25 * e; B[3].rotation.z += 0.28 * e; B[4].rotation.x += -0.2 * e; B[2].rotation.y += 0.25 * e; },
  maos: (e, B, t) => { for (const [a, f, s] of [[3, 4, 1], [5, 6, -1]]) { B[a].rotation.x += -0.55 * e; B[a].rotation.z += s * 0.1 * e; B[f].rotation.x += -1.0 * e + Math.sin(t * 6 + s) * 0.1 * e; } },
  peito: (e, B) => { B[3].rotation.x += -0.65 * e; B[3].rotation.z += -0.32 * e; B[4].rotation.x += -1.6 * e; B[2].rotation.x += -0.06 * e; },
};
const TALK_KEYS = Object.keys(TALK);

// ---------------- molas e IK ----------------
function spring(s, target, k, c, dt) {
  const n = Math.max(1, Math.ceil(dt / 0.012)), h = dt / n;
  for (let i = 0; i < n; i++) { s.v += ((target - s.x) * k - s.v * c) * h; s.x += s.v * h; }
  return s.x;
}
const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _a = new THREE.Vector3(), _b = new THREE.Vector3();
// tornozelo no ponto (x, y, z) da moldura do boneco (chão em y = 0); o joelho dobra para a frente
function legIK(G, B, side, x, y, z, pitch, hipX) {
  const root = B[0], th = B[side > 0 ? 7 : 10], sh = B[side > 0 ? 8 : 11], ft = B[side > 0 ? 9 : 12];
  _e.copy(root.rotation); _q.setFromEuler(_e);
  _a.set(side * hipX, 0, 0).applyQuaternion(_q).add(root.position);   // junta do quadril
  _b.set(x, y, z).sub(_a).applyQuaternion(_q.invert());             // alvo no sistema do quadril
  const Lt = G.Lt, Ls = G.Ls;
  const roll = Math.atan2(_b.x, -_b.y);
  const yy = -Math.hypot(_b.x, _b.y), zz = _b.z;
  let d = Math.hypot(yy, zz);
  const dMax = (Lt + Ls) * 0.9995, dMin = Math.abs(Lt - Ls) + 0.02;
  const k = d > dMax ? dMax / d : d < dMin ? dMin / Math.max(d, 1e-5) : 1;
  d *= k;
  const knee = Math.PI - Math.acos(clamp((Lt * Lt + Ls * Ls - d * d) / (2 * Lt * Ls), -1, 1));
  const alpha = Math.acos(clamp((Lt * Lt + d * d - Ls * Ls) / (2 * Lt * d), -1, 1));
  const a1 = Math.atan2(-zz * k, -yy * k) - alpha;
  th.rotation.set(a1, 0, roll);
  sh.rotation.set(knee, 0, 0);
  ft.rotation.set(pitch - a1 - knee, 0, -roll * 0.8);
}

function initGait(st, ch) {
  const P = ch.P;
  st.g = {
    Lt: P.hip - P.knee, Ls: P.knee - P.ank, leg: P.hip - P.ank,
    rest: ch.bones.map((b) => b.position.clone()),
    style: { ...STYLES[st.mood] || STYLES.tranquila },
    jog: 0, land: { x: 0, v: 0 }, lean: { x: 0, v: 0 }, settle: { x: 0, v: 0 }, bank: 0, acc: 0, lastV: 0,
    prevF: null, support: rand() < 0.5 ? 1 : -1, sw: 0, shiftT: rr(2, 7),
    breath: rand() * TAU, effort: 0, glance: { yaw: 0, pitch: 0 }, glanceT: { yaw: 0, pitch: 0 }, glanceTimer: rr(1, 4),
    gest: null, gestT: 0, idleT: 0, fidgetT: rr(6, 12), tg: null, tgT: 0, tgW: 0, toeTap: 0,
    crouch: 0, pet: 0, reach: 0, air: 0, pre: 0, wasAir: false, cd: 0.5, rl: 0,
  };
}

// ---- braço até um ponto, com a mão deitada no que toca (dois ossos + pulso) ----
const _k = {
  c: new THREE.Vector3(), n: new THREE.Vector3(), f: new THREE.Vector3(), w: new THREE.Vector3(), o: new THREE.Vector3(), D: new THREE.Vector3(),
  pole: new THREE.Vector3(), u: new THREE.Vector3(), fa: new THREE.Vector3(), x: new THREE.Vector3(), y: new THREE.Vector3(), z: new THREE.Vector3(), r: new THREE.Vector3(),
  a: new THREE.Vector3(), b: new THREE.Vector3(),
  m: new THREE.Matrix4(), qt: new THREE.Quaternion(), qa: new THREE.Quaternion(), qf: new THREE.Quaternion(), qh: new THREE.Quaternion(), qw: new THREE.Quaternion(), qi: new THREE.Quaternion(), e: new THREE.Euler(),
};
// tudo no sistema do tronco: C = onde a palma encosta, N = normal do que ela toca (para fora), F = para onde os dedos apontam,
// pole = para onde o cotovelo aponta. k mistura com a pose de antes. Devolve a distância até o pulso / alcance do braço.
function reachArm(B, P, side, C, N, F, pole, k) {
  const ag = P.ag || 1, arm = B[side > 0 ? 3 : 5], fore = B[side > 0 ? 4 : 6], hand = B[side > 0 ? 16 : 17];
  const L1 = P.arm, L2 = P.fore, reach = L1 + L2, S = arm.position;
  // mão: palma para o que toca, dedos para F (o polegar fica para dentro)
  _k.y.copy(F).addScaledVector(N, -F.dot(N));
  if (_k.y.lengthSq() < 1e-8) _k.y.set(0, 0, 1);
  _k.y.normalize().negate(); _k.x.crossVectors(_k.y, N);
  _k.m.makeBasis(_k.x, _k.y, N); _k.qh.setFromRotationMatrix(_k.m);
  // o pulso fica onde a mão (centro a meia palma acima) pede
  const W = _k.w.copy(C).addScaledVector(N, 0.022 * ag).sub(_k.o.set(0, -0.036 * ag, 0.004).applyQuaternion(_k.qh));
  const D = _k.D.subVectors(W, S), d0 = D.length();
  D.divideScalar(Math.max(d0, 1e-6));
  const d = clamp(d0, Math.abs(L1 - L2) + 0.03, reach * 0.999);
  const ca = clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1), sa = Math.sqrt(1 - ca * ca);
  const flex = Math.PI - Math.acos(clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1));
  const pl = _k.pole.copy(pole).addScaledVector(D, -pole.dot(D));
  if (pl.lengthSq() < 1e-6) pl.set(side, 0, 0);
  pl.normalize();
  const u = _k.u.copy(D).multiplyScalar(ca).addScaledVector(pl, sa);              // ombro → cotovelo
  const fa = _k.fa.copy(D).multiplyScalar(d).addScaledVector(u, -L1).normalize();  // cotovelo → pulso
  // osso do braço: -y ao longo dele, +z para o lado em que o antebraço dobra
  _k.y.copy(u).negate();
  _k.z.copy(fa).addScaledVector(u, -fa.dot(u));
  if (_k.z.lengthSq() < 1e-6) _k.z.copy(pl).negate();
  _k.z.normalize();
  _k.x.crossVectors(_k.y, _k.z);
  _k.m.makeBasis(_k.x, _k.y, _k.z); _k.qa.setFromRotationMatrix(_k.m);
  _k.qf.setFromEuler(_k.e.set(-flex, 0, 0));
  // pulso: o resto da rotação até a mão deitar, com limite de junta
  const qw = _k.qw.copy(_k.qa).multiply(_k.qf).invert().multiply(_k.qh);
  const ang = 2 * Math.acos(clamp(Math.abs(qw.w), 0, 1));
  if (ang > 1.1) qw.copy(_k.qi.identity().slerp(qw, 1.1 / ang));
  arm.quaternion.slerp(_k.qa, k); fore.quaternion.slerp(_k.qf, k); hand.quaternion.slerp(qw, k);
  return d0 / reach;
}
// carinho: a mão direita no alto da cabeça do bicho (st.petAt / st.petN, no mundo, vêm de actors.js);
// agachada, a esquerda apoia na coxa perto do joelho
const POLE_R = new THREE.Vector3(-1, -0.55, -0.3), POLE_L = new THREE.Vector3(1, -0.2, -0.8);
function petArm(ch, G, k, dt, cr) {
  const B = ch.bones, P = ch.P, st = ch.st, torso = B[1];
  torso.updateWorldMatrix(true, false);
  // agachada bem baixinho; se a cabeça do bicho é mais alta que o ombro assim, agacha menos
  const tl = ch.rig.worldToLocal(_k.r.copy(st.petAt));
  const cdT = clamp((P.hip - (tl.y - 0.01 - (P.shY - P.hip) * 0.93)) / P.hip, 0.15, 0.5);
  if (cr > 0.05) G.cd = lerp(G.cd, cdT, 1 - Math.exp(-dt * 4));
  const qt = torso.getWorldQuaternion(_k.qt).invert();
  const C = torso.worldToLocal(_k.c.copy(st.petAt));
  const N = _k.n.copy(st.petN).applyQuaternion(qt).normalize();
  // dedos para longe do ombro
  const F = _k.f.subVectors(C, B[5].position);
  const ratio = reachArm(B, P, -1, C, N, F, POLE_R, k);
  // não alcança: inclina o tronco mais um pouco (vale no próximo quadro); sobrou braço, desinclina
  G.rl = clamp(G.rl + clamp((ratio - 0.94) * (P.arm + P.fore) / 0.36, -1, 1) * dt * 2.5, 0, 0.35);
  if (cr > 0.3) {
    // mão esquerda na coxa, pertinho do joelho, dedos para o joelho
    const hip = torso.worldToLocal(B[7].getWorldPosition(_k.a)), knee = torso.worldToLocal(B[8].getWorldPosition(_k.b));
    const th = _k.f.subVectors(knee, hip).normalize();
    const upT = _k.n.set(0, 1, 0).applyQuaternion(torso.getWorldQuaternion(_k.qt).invert().multiply(ch.rig.getWorldQuaternion(_k.qi)));
    upT.addScaledVector(th, -upT.dot(th)).normalize();
    const C2 = _k.c.copy(hip).lerp(knee, 0.82).addScaledVector(upT, 0.062);
    reachArm(B, P, 1, C2, upT, th, POLE_L, k * sstep(0.3, 0.8, cr));
  }
}

export function poseChar(ch, dt) {
  const st = ch.st, B = ch.bones, P = ch.P;
  if (!st.g) initGait(st, ch);
  const G = st.g;
  st.t += dt;
  const t = st.t;
  for (let i = 0; i < B.length; i++) { B[i].rotation.set(0, 0, 0); B[i].position.copy(G.rest[i]); }
  B[0].scale.set(1, 1, 1);
  // humor: o jeito muda devagar, sem pulo
  const want = STYLES[st.mood] || STYLES.tranquila, kst = 1 - Math.exp(-dt * 1.4), S = G.style;
  for (const k of STYLE_KEYS) S[k] = lerp(S[k], want[k], kst);
  const slump = clamp(Math.max(S.slump, st.tired || 0), 0, 1);
  // ---- velocidade, arranque e curvas ----
  const v = st.speed, vn = v / G.leg, kSm = 1 - Math.exp(-dt * 7);
  st.w = lerp(st.w, sstep(0.03, 0.55, vn), kSm);
  G.jog = lerp(G.jog, sstep(3.3, 4.7, vn), kSm);
  st.run = lerp(st.run, sstep(5.0, 6.4, vn), kSm);
  const w = st.w, jog = G.jog, run = st.run;
  const accRaw = clamp((v - G.lastV) / Math.max(dt, 1e-3), -30, 30); G.lastV = v;
  G.acc = lerp(G.acc, accRaw, 1 - Math.exp(-dt * 10));
  if (ch.fwd) {
    if (!G.prevF) G.prevF = ch.fwd.clone();
    const up = ch.d, cr = _a.crossVectors(G.prevF, ch.fwd).dot(up), rate = Math.atan2(cr, G.prevF.dot(ch.fwd)) / Math.max(dt, 1e-3);
    G.prevF.copy(ch.fwd);
    G.bank = lerp(G.bank, clamp(-rate * v * 0.035, -0.28, 0.28), 1 - Math.exp(-dt * 6));
  }
  const leanT = clamp(G.acc * 0.03, -0.22, 0.2);
  spring(G.lean, leanT, 90, 11, dt);
  // freou: o corpo vai um pouco para a frente e volta (mola)
  if (G.acc < -4 && v < 0.6 && w > 0.2) G.settle.v += -G.acc * 0.0035 * dt * 60 * 0.05;
  spring(G.settle, 0, 140, 9, dt);
  // ---- respiração ----
  G.effort = lerp(G.effort, clamp(vn / 5, 0, 1) + (st.air > 0.5 ? 0.3 : 0), 1 - Math.exp(-dt * (vn > 0.5 ? 0.8 : 0.25)));
  G.breath += dt * TAU * (0.24 + 0.3 * G.effort + 0.08 * slump);
  const br = Math.sin(G.breath), brA = 1 + G.effort * 1.5 + slump * 0.6;
  // ---- passada ----
  const fr = Math.sqrt(0.715 / G.leg);
  let steps = fr * (1.7 + 0.3 * vn) * S.cad;
  const duty = lerp(lerp(0.62, 0.52, sstep(1, 3, vn)), lerp(0.4, 0.32, run), jog);
  const Emax = G.leg * lerp(0.5, 0.62, jog);
  if (v * duty / steps > Emax) steps = v * duty / Emax;
  if (w > 0.005) st.phase += TAU * steps * 0.5 * dt;
  const E = v * duty / Math.max(steps, 0.1);
  const uc = frac(st.phase / TAU), uL = uc, uR = frac(uc + 0.5);
  const lift = G.leg * lerp(0.11, lerp(0.17, 0.22, run), jog) * S.lift * (1 - slump * 0.35) * (1 + S.skip * 0.25);
  const kick = G.leg * lerp(0.03, lerp(0.2, 0.3, run), jog) * (0.6 + 0.4 * S.lift);
  const hipX = Math.abs(G.rest[7].x);
  // posição do pé de cada perna ao longo do ciclo (0 = pisa com o calcanhar)
  const foot = (u) => {
    if (u < duty) {
      const s = u / duty;
      const heel = sstep(0.62, 1, s), toeUp = 1 - sstep(0, 0.22, s);
      return { z: E * (1 - 2 * s), y: heel * 0.045 * G.leg * w * (1 - jog * 0.4), pitch: (heel * 0.55 - toeUp * 0.22 * (1 - jog)) * w * S.lift };
    }
    const s = (u - duty) / (1 - duty), sn = Math.sin(Math.PI * s);
    const z = -E + 2 * E * (s * s * (3 - 2 * s)) - kick * sn * (1 - s) * 0.9;
    const y = lift * Math.pow(sn, 0.85) + kick * sn * (1 - s) * 0.85;
    return { z, y, pitch: lerp(0.5, -0.25, sstep(0.2, 0.95, s)) * (0.4 + 0.6 * S.lift) };
  };
  const fL = foot(uL), fR = foot(uR);
  // ---- quadril ----
  const contact = lerp(0.06, duty * 0.5, jog);
  const bounceA = G.leg * lerp(0.03, lerp(0.065, 0.075, run), jog) * S.bounce * (1 + S.stomp * 0.3);
  // pisada brava: desce rápido e firme logo depois de encostar o pé
  const bc = Math.cos(2 * TAU * (uc - contact));
  const bounce = -(0.5 + 0.5 * (S.stomp > 0.5 ? Math.sign(bc) * Math.pow(Math.abs(bc), 0.6) : bc)) * bounceA;
  const hipLow = G.leg * lerp(0.012, lerp(0.05, 0.075, run), jog) + slump * 0.02;
  // parado: o peso numa perna, troca de tempos em tempos
  G.shiftT -= dt * (1 + S.fidget * 0.3);
  if (G.shiftT < 0) { G.support = -G.support; G.shiftT = rr(3.5, 8.5); }
  G.sw = lerp(G.sw, G.support, 1 - Math.exp(-dt * 2.4));
  const idle = 1 - w, swI = G.sw * idle;
  const pose = st.pose;
  const standing = pose !== 'sit' && pose !== 'lounge' && pose !== 'ground';
  // agachar (carinho no bicho) e o mergulho de antes do pulo
  G.crouch = lerp(G.crouch, st.crouch ? 1 : 0, 1 - Math.exp(-dt * (st.crouch ? 6 : 5)));
  G.pre = lerp(G.pre, st.jumpPre ? 1 : 0, 1 - Math.exp(-dt * 30));
  const cr = G.crouch;
  // aterrissagem: a mola afunda o quadril e devolve
  const inAir = (st.air || 0) > 0.5;
  if (G.wasAir && !inAir) G.land.v += clamp(st.landV ?? -4, -12, 0) * 0.16;
  G.wasAir = inAir;
  spring(G.land, 0, 210, 15, dt);
  G.air = lerp(G.air, st.air || 0, 1 - Math.exp(-dt * 14));
  const air = G.air;
  if (standing) {
    B[0].position.y = P.hip - hipLow * w + bounce * w * (1 - air) + clamp(G.land.x, -0.22, 0.05) - G.pre * 0.07 * G.leg / 0.715
      - 0.006 * idle - lerp(0, P.hip * G.cd, cr) + (0.004 * br * idle) * (1 - cr);
    B[0].position.x = (Math.cos(TAU * (uc - duty * 0.5)) * 0.016 * w * (1 - jog * 0.5) + swI * 0.026) * (1 - cr);
    B[0].position.z = -0.03 * cr;
    const yaw = -0.11 * lerp(1, 1.4, jog) * (fL.z - fR.z) / Math.max(2 * E, 0.05) * w;
    B[0].rotation.y = yaw;
    B[0].rotation.z = (Math.cos(TAU * (uc - duty * 0.5)) * 0.035 * w * (1 - jog * 0.6) + swI * 0.055) * (1 - cr) + G.bank * 0.6;
    B[0].rotation.x = 0.18 * cr;
    // pernas
    const lowH = P.ank;
    if (air > 0.02) {
      // no ar: sobe com uma perna dobrada e os pés apontando para baixo, cai esticando para pousar
      const upk = sstep(-1.5, 2.5, st.vy || 0);
      const set = (i, x) => { B[i].rotation.x = lerp(B[i].rotation.x, x, air); };
      legIK(G, B, 1, hipX + 0.01, lowH + fL.y * w, fL.z * w, fL.pitch, hipX);
      legIK(G, B, -1, -hipX - 0.01, lowH + fR.y * w, fR.z * w, fR.pitch, hipX);
      set(7, lerp(-0.35, -1.0, upk)); set(8, lerp(0.55, 1.45, upk)); set(9, lerp(0.15, 0.45, upk));
      set(10, lerp(-0.1, 0.28, upk)); set(11, lerp(0.35, 0.6, upk)); set(12, lerp(0.1, 0.55, upk));
      B[7].rotation.z *= 1 - air; B[10].rotation.z *= 1 - air;
    } else {
      // pés parados: o de apoio embaixo do quadril, o outro um pouco à frente e para fora
      const freeL = sstep(0, 1, -G.sw), freeR = sstep(0, 1, G.sw);
      const stand = (free, s) => ({ x: s * (hipX + 0.008 + 0.022 * free + cr * 0.035), z: (0.06 * free - 0.012) * (1 - cr) + cr * (s > 0 ? 0.11 : -0.14), pitch: free * 0.08 * (1 - cr) });
      const iL = stand(freeL, 1), iR = stand(freeR, -1);
      const tap = G.toeTap || 0;
      const mix = (a, b, k) => a + (b - a) * k;
      legIK(G, B, 1, mix(iL.x, hipX + 0.004, w), lowH + fL.y * w + (cr > 0.5 ? 0 : 0), mix(iL.z, fL.z, w), mix(iL.pitch, fL.pitch, w), hipX);
      legIK(G, B, -1, mix(iR.x, -hipX - 0.004, w), lowH + fR.y * w + tap * 0.03, mix(iR.z, fR.z, w), mix(iR.pitch - tap * 0.5, fR.pitch, w), hipX);
      G.toeTap = 0;
      // agachada: calcanhar de trás levanta (fica na ponta do pé)
      if (cr > 0.01) B[12].rotation.x += 0.75 * cr;
    }
    // ---- tronco ----
    const lean = 0.03 * w + lerp(0, lerp(0.12, 0.22, run), jog) + S.lean + slump * 0.2 + G.lean.x + G.settle.x * 2.2;
    B[1].rotation.x = lean * (1 - cr) + 0.2 * cr + G.rl * G.pet + 0.014 * br * brA - 0.3 * G.pre + (air > 0.02 ? lerp(0.12, -0.08, sstep(-1.5, 2.5, st.vy || 0)) * air : 0) + (P.stoop || 0);
    B[1].rotation.y = -yaw * 1.55;
    B[1].rotation.z = -B[0].rotation.z * 0.75 + G.bank * 0.25 - swI * 0.02;
    B[0].scale.y = 1 + (air > 0.02 ? 0.035 * sstep(0, 4, st.vy || 0) * air : 0) + clamp(G.land.x, -0.2, 0) * 0.35;
    B[0].scale.x = B[0].scale.z = 1 / Math.sqrt(B[0].scale.y);
    // ---- braços ----
    const swing = (side) => {
      const fz = side > 0 ? foot(frac(uL - 0.04)).z : foot(frac(uR - 0.04)).z;
      return clamp(fz / Math.max(E, 0.04), -1.3, 1.3);
    };
    const armA = lerp(0.34, lerp(0.55, 0.78, run), jog) * S.arm * (1 - slump * 0.45) * w;
    const elb = lerp(0.3, lerp(1.2, 1.45, run), jog) * (1 - S.fist * 0.5) + S.fist * 0.15;
    for (const [ia, ifo, side] of [[3, 4, 1], [5, 6, -1]]) {
      const sw = swing(side);
      const out = 0.12 + 0.03 * idle + 0.08 * jog + slump * 0.02 + S.fist * 0.04 + 0.012 * br * idle;
      B[ia].rotation.x = sw * armA - 0.05 * idle + slump * 0.12 * idle + G.pre * 0.6 - G.land.x * 1.2;
      B[ia].rotation.z = side * (out + (side * B[1].rotation.z) * 0.3 - G.land.x * 1.4);
      B[ifo].rotation.x = -(elb * w + (0.34 - slump * 0.16) * idle) - Math.max(0, -sw) * 0.3 * w * (1 - jog * 0.5);
      // parada, a mão fica meio de lado (relaxada), não espetada para trás
      B[ifo].rotation.y = side * 0.35 * idle;
      B[ia].position.y += 0.004 * br * brA * idle;
      if (air > 0.02) {
        const upk = sstep(-1.5, 2.5, st.vy || 0);
        B[ia].rotation.x = lerp(B[ia].rotation.x, lerp(-0.35, -0.9, upk), air);
        B[ia].rotation.z = lerp(B[ia].rotation.z, side * lerp(1.05, 0.55, upk), air);
        B[ifo].rotation.x = lerp(B[ifo].rotation.x, lerp(-0.35, -0.6, upk), air);
      }
    }
  } else {
    // ---- sentado ----
    B[0].position.y = (st.seat ?? 0.46) + 0.06;
    B[0].position.z = -0.02;
    if (pose === 'ground') {
      // sentado no chão, pernas esticadas, mãos apoiadas atrás
      B[0].position.y = 0.115 + (st.seat || 0); B[0].position.z = -0.04;
      B[7].rotation.x = -1.45; B[10].rotation.x = -1.56; B[8].rotation.x = 0.14; B[11].rotation.x = 0.3;
      B[9].rotation.x = -0.15; B[12].rotation.x = -0.3; B[7].rotation.z = 0.16; B[10].rotation.z = -0.12;
      B[1].rotation.x = -0.2 + br * 0.015;
      B[3].rotation.x = B[5].rotation.x = 0.62; B[4].rotation.x = B[6].rotation.x = -0.12;
      B[3].rotation.z = 0.22; B[5].rotation.z = -0.22;
    } else {
      B[7].rotation.x = B[10].rotation.x = -1.5;
      B[8].rotation.x = B[11].rotation.x = pose === 'lounge' ? 0.1 : 1.45;
      B[9].rotation.x = B[12].rotation.x = pose === 'lounge' ? -0.2 : 0.05;
      B[7].rotation.z = 0.06; B[10].rotation.z = -0.06;
      if (pose === 'lounge') { B[1].rotation.x = -0.95; B[2].rotation.x = 0.55; B[0].position.y = (st.seat ?? 0.32) + 0.05; }
      else B[1].rotation.x = -0.06 + br * 0.014 + slump * 0.1;
      // mãos no colo, o pé balança de vez em quando
      B[3].rotation.x = B[5].rotation.x = pose === 'lounge' ? -0.5 : -0.38;
      B[4].rotation.x = B[6].rotation.x = pose === 'lounge' ? -0.6 : -0.95;
      B[3].rotation.z = 0.12; B[5].rotation.z = -0.12;
      if (pose === 'sit') B[11].rotation.x += Math.max(0, Math.sin(t * 2.1)) * 0.18 * sstep(0.6, 0.9, Math.sin(t * 0.27));
    }
  }
  // ---- ação da parte de cima (props, poses das pessoas e emoções) ----
  const act = st.act;
  st.actW = lerp(st.actW, act ? 1 : 0, 1 - Math.exp(-dt * 7));
  const aw = st.actW;
  const setA = (i, x, y, z) => { B[i].rotation.x = lerp(B[i].rotation.x, x, aw); B[i].rotation.y = lerp(B[i].rotation.y, y, aw); B[i].rotation.z = lerp(B[i].rotation.z, z, aw); };
  if (act === 'mega') { setA(5, -1.35, 0, 0.42); setA(6, -1.15, 0, 0); setA(3, -0.2, 0, 0.45); setA(4, -0.3, 0, -1.25); B[2].rotation.x += -0.08 * aw; }
  else if (act === 'phone') { setA(5, -1.5, 0, -0.32); setA(6, -0.35, 0, 0); B[2].rotation.x += -0.22 * aw; B[2].rotation.y += -0.15 * aw; setA(3, 0.1, 0, 0.5 + Math.sin(t * 3) * 0.05); setA(4, -0.2, 0, 0); }
  else if (act === 'news') { setA(3, -0.6, 0, -0.32); setA(5, -0.6, 0, 0.32); setA(4, -1.4, 0, 0); setA(6, -1.4, 0, 0); B[2].rotation.x += 0.12 * aw; }
  else if (act === 'fish') { setA(5, -0.75, 0, 0.12); setA(6, -0.55, 0, 0); setA(3, -0.7, 0, -0.2); setA(4, -0.7, 0, 0); B[2].rotation.x += 0.1 * aw; }
  else if (act === 'hips') { setA(3, 0.1, 0, 0.55); setA(4, -0.35, 0, -1.45); setA(5, 0.1, 0, -0.55); setA(6, -0.35, 0, 1.45); }
  else if (act === 'cross') { setA(3, -0.42, 0, -0.18); setA(4, -1.5, 0.2, -0.95); setA(5, -0.42, 0, 0.18); setA(6, -1.5, -0.2, 0.95); }
  else if (act === 'clasp') { setA(3, -0.18, 0, -0.18); setA(4, -0.75, 0, -0.55); setA(5, -0.18, 0, 0.18); setA(6, -0.75, 0, 0.55); }
  else if (act === 'wave') { setA(5, -0.3, 0, -2.5); setA(6, -0.2, 0, -0.5 + Math.sin(t * 11) * 0.45); }
  else if (act === 'cheer') { setA(3, -0.2, 0, 2.6 + Math.sin(t * 9) * 0.15); setA(5, -0.2, 0, -2.6 - Math.sin(t * 9) * 0.15); setA(4, -0.3, 0, 0); setA(6, -0.3, 0, 0); B[0].position.y += Math.abs(Math.sin(t * 6)) * 0.12 * aw; }
  else if (act === 'protest') { setA(5, -2.75 + Math.sin(t * 3.2) * 0.08, 0, 0.1); setA(6, -0.2, 0, 0); setA(3, -0.3, 0, 0.25); setA(4, -0.6, 0, 0); }
  else if (act === 'shrug') { setA(3, -0.3, 0, 0.5); setA(5, -0.3, 0, -0.5); setA(4, -1.2, -0.5, 0.4); setA(6, -1.2, 0.5, -0.4); B[2].rotation.z += 0.12 * aw; }
  else if (act === 'think') { setA(5, -0.5, 0, 0.3); setA(6, -2.2, 0, 0.3); setA(3, -0.35, 0, -0.15); setA(4, -1.2, 0, -0.8); B[2].rotation.z += -0.1 * aw; B[2].rotation.x += -0.1 * aw; }
  else if (act === 'love') { setA(3, -0.6, 0, -0.1); setA(5, -0.6, 0, 0.1); setA(4, -1.9, 0, -0.3); setA(6, -1.9, 0, 0.3); B[2].rotation.z += Math.sin(t * 2) * 0.12 * aw; }
  else if (act === 'angry') { setA(3, 0.15, 0, 0.35); setA(5, 0.15, 0, -0.35); setA(4, -0.4, 0, 0); setA(6, -0.4, 0, 0); B[1].rotation.x += 0.12 * aw; B[0].position.y += Math.max(0, Math.sin(t * 14)) * 0.03 * aw; }
  else if (act === 'sleepy') { B[2].rotation.x += 0.45 * aw; B[2].rotation.z += 0.2 * aw; B[1].rotation.x += 0.15 * aw; }
  else if (act === 'carry') { setA(5, -0.05, 0, -0.22); setA(6, -0.15, 0, 0); }
  else if (act === 'sweat') { setA(3, -0.2, 0, 0.2); setA(4, -2.3, 0, -0.6); B[2].rotation.x += 0.1 * aw; }
  // ---- carinho no bicho: as mãos vão para o lugar no fim (petArm), depois do tronco pronto ----
  G.pet = lerp(G.pet, st.pet ? 1 : 0, 1 - Math.exp(-dt * 5));
  const pw = G.pet;
  if (pw > 0.01) {
    B[2].rotation.z += Math.sin(t * 1.3) * 0.08 * pw;
  } else G.rl = 0;
  // ---- gestos (humor, tédio de ficar parada, heroGesture) ----
  let eyesShut = false, mouthOpen = false;
  if (st.gesture) { G.gest = st.gesture; G.gestT = 0; st.gesture = null; }
  if (!standing || air > 0.3 || cr > 0.3 || pw > 0.3) G.gest = null;
  // ficou parada: de vez em quando faz alguma coisa (só quem tem humor, ou seja, a Duda)
  if (st.mood && standing && w < 0.05 && !act && !G.gest && !st.talk && pw < 0.05) {
    G.idleT += dt;
    if (G.idleT > G.fidgetT) {
      G.idleT = 0; G.fidgetT = rr(7, 13) / S.fidget;
      const m = st.mood;
      const pool = m === 'irritada' ? ['bufar', 'pé-chão', 'pé-chão'] : m === 'entediada' ? ['olhar-relogio', 'suspiro', 'bocejo'] : m === 'cansada' ? ['bocejo', 'suspiro', 'espreguicar']
        : m === 'exausta' ? ['dor-de-cabeca', 'suspiro', 'bocejo'] : m === 'feliz' ? ['balançar', 'espreguicar'] : ['coçar', 'olhar-relogio', 'espreguicar', 'balançar'];
      G.gest = pool[Math.floor(rand() * pool.length)]; G.gestT = 0;
    }
  } else G.idleT = 0;
  if (G.gest && GESTS[G.gest]) {
    const gd = GESTS[G.gest];
    G.gestT += dt;
    const p = G.gestT / gd.dur;
    if (p >= 1) G.gest = null;
    else {
      gd.fn(p, B, t, G);
      if (gd.eyes && p > gd.eyes[0] && p < gd.eyes[1]) eyesShut = true;
      if (gd.mouth && p > gd.mouth[0] && p < gd.mouth[1]) mouthOpen = true;
    }
  }
  // falando: mãos acompanham a fala (quem está em pé e com as mãos livres)
  const canTalkHands = standing && !act && pw < 0.05 && !ch.noTalkHands;
  if (st.talk && canTalkHands) {
    G.tgT -= dt;
    if (G.tgT < 0) { G.tg = rand() < 0.3 ? null : TALK_KEYS[Math.floor(rand() * TALK_KEYS.length)]; G.tgT = rr(1.1, 2.2); }
  } else if (G.tgT > 0.4) G.tgT = 0.4;
  G.tgW = lerp(G.tgW, st.talk && G.tg && canTalkHands ? 1 : 0, 1 - Math.exp(-dt * 4));
  if (G.tgW > 0.01 && G.tg) TALK[G.tg](G.tgW, B, t);
  if (!st.talk && G.tgW < 0.02) G.tg = null;
  // ---- cabeça: olhar, olhadas em volta, aceno enquanto fala ----
  const L = st.look, LT = st.lookT, kl = 1 - Math.exp(-dt * 5);
  L.yaw = lerp(L.yaw, LT.yaw, kl); L.pitch = lerp(L.pitch, LT.pitch, kl);
  const free = Math.abs(LT.yaw) < 0.01 && Math.abs(LT.pitch) < 0.01 && !st.talk;
  G.glanceTimer -= dt;
  if (G.glanceTimer < 0) {
    G.glanceTimer = rr(1.6, 4.5);
    if (free && rand() < 0.65) { G.glanceT.yaw = rr(-0.75, 0.75) * (1 - w * 0.6); G.glanceT.pitch = rr(-0.18, 0.16); }
    else { G.glanceT.yaw = 0; G.glanceT.pitch = 0; }
  }
  const kg = 1 - Math.exp(-dt * 7);
  G.glance.yaw = lerp(G.glance.yaw, free ? G.glanceT.yaw : 0, kg); G.glance.pitch = lerp(G.glance.pitch, free ? G.glanceT.pitch : 0, kg);
  const yawH = L.yaw + G.glance.yaw;
  B[2].rotation.y += yawH * 0.75 - B[1].rotation.y * 0.7; B[1].rotation.y += yawH * 0.25;
  B[2].rotation.x += L.pitch + G.glance.pitch + (st.tired || 0) * 0.1 + S.head + slump * 0.06 + (st.sleep ? 0.35 : 0);
  if (standing) {
    // a cabeça compensa a inclinação do tronco (o olhar fica no horizonte) e balança de leve com o passo
    B[2].rotation.x -= (B[1].rotation.x - (P.stoop || 0) * 0.2) * 0.62 + (P.stoop || 0) * 0.8;
    B[2].rotation.x += Math.cos(2 * TAU * (uc - contact)) * 0.025 * w * (1 - jog * 0.5) - 0.006 * br * idle;
    B[2].rotation.z += -B[1].rotation.z * 0.5 - B[0].rotation.z * 0.3 + swI * 0.04;
    if (cr > 0.01) B[2].rotation.x -= 0.4 * cr;
  }
  if (st.talk) B[2].rotation.x += Math.sin(t * 6.5) * 0.035 + Math.sin(t * 2.3) * 0.02;
  // carinho: com o tronco já no lugar, o braço direito alcança a cabeça do bicho (andou, solta)
  if (pw > 0.01 && st.petAt && B[17]) petArm(ch, G, pw * (1 - sstep(0.1, 0.5, w)), dt, cr);
  // rabo de cavalo
  B[13].rotation.x = 0.1 + Math.sin(st.phase * 2) * 0.12 * w + run * 0.35 - B[1].rotation.x * 0.6 - B[2].rotation.x * 0.5 + air * 0.4 - G.land.x * 2;
  B[13].rotation.z = Math.sin(st.phase) * 0.1 * w + Math.sin(t * 1.3) * 0.03;
  // objetos e cartaz
  const wantSign = st.sign ? 1 : 0;
  st.signW = lerp(st.signW, wantSign, 1 - Math.exp(-dt * 6));
  const ss = st.signW < 0.02 ? 1e-4 : st.signW;
  B[15].scale.setScalar(ss);
  B[14].scale.setScalar(st.propOn && st.signW < 0.5 ? 1 : 1e-4);
  // ---- rosto ----
  let fr2 = 0;
  st.blink -= dt;
  if (st.blink < 0) { st.blinkOn = 0.12; st.blink = rr(1.8, 4.8) * (1 - slump * 0.35); }
  if (st.blinkOn > 0) { st.blinkOn -= dt; fr2 = 1; }
  if (st.talk) {
    st.mouth -= dt;
    if (st.mouth < 0) { st.mouthOpen = !st.mouthOpen; st.mouth = st.mouthOpen ? rr(0.07, 0.13) : rr(0.05, 0.1); }
    if (st.mouthOpen) fr2 = 2;
  }
  if (eyesShut) fr2 = 1;
  if (mouthOpen) fr2 = 2;
  if (pw > 0.5) fr2 = 3;
  if (st.happy > 0) { st.happy -= dt; fr2 = 3; }
  if (st.sleep) fr2 = 1;
  setFace(ch, fr2);
}
