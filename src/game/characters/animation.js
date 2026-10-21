// ---------------- animação procedural ----------------
import { RUN, WALK } from '../core/config.js';
import { clamp, lerp, rr } from '../core/math.js';
import { setFace } from './bodies.js';

export function poseChar(ch, dt) {
  const st = ch.st, B = ch.bones, P = ch.P;
  st.t += dt;
  const t = st.t;
  for (let i = 0; i < 16; i++) B[i].rotation.set(0, 0, 0);
  B[0].position.set(0, P.hip, 0);
  const kSm = 1 - Math.exp(-dt * 9);
  const wT = clamp(st.speed / WALK, 0, 1), rT = clamp((st.speed - WALK) / (RUN - WALK), 0, 1);
  st.w = lerp(st.w, wT, kSm); st.run = lerp(st.run, rT, kSm);
  const stride = lerp(0.62, 0.92, st.run) * (P.hip / 0.8);
  st.phase += st.speed * dt * Math.PI / stride;
  const w = st.w * (1 - st.air), run = st.run, ph = st.phase, s1 = Math.sin(ph), c1 = Math.cos(ph);
  const tired = st.tired;
  // ---- pose de base ----
  const pose = st.pose;
  if (pose === 'sit' || pose === 'lounge') {
    B[0].position.y = (st.seat ?? 0.46) + 0.06;
    B[0].position.z = -0.02;
    B[7].rotation.x = B[10].rotation.x = -1.5;
    B[8].rotation.x = B[11].rotation.x = pose === 'lounge' ? 0.1 : 1.45;
    B[9].rotation.x = B[12].rotation.x = pose === 'lounge' ? -0.2 : 0.05;
    B[7].rotation.z = 0.06; B[10].rotation.z = -0.06;
    if (pose === 'lounge') { B[1].rotation.x = -0.95; B[2].rotation.x = 0.55; B[0].position.y = (st.seat ?? 0.32) + 0.05; }
    else { B[1].rotation.x = -0.06 + Math.sin(t * 1.6) * 0.012; }
    // mãos no colo
    B[3].rotation.x = B[5].rotation.x = pose === 'lounge' ? -0.5 : -0.38;
    B[4].rotation.x = B[6].rotation.x = pose === 'lounge' ? -0.6 : -0.95;
    B[3].rotation.z = 0.12; B[5].rotation.z = -0.12;
  } else if (pose === 'ground') {
    // sentado no chão, pernas esticadas, mãos apoiadas atrás
    B[0].position.y = 0.115 + (st.seat || 0);
    B[0].position.z = -0.04;
    B[7].rotation.x = -1.45; B[10].rotation.x = -1.56;
    B[8].rotation.x = 0.14; B[11].rotation.x = 0.3;
    B[9].rotation.x = -0.15; B[12].rotation.x = -0.3;
    B[7].rotation.z = 0.16; B[10].rotation.z = -0.12;
    B[1].rotation.x = -0.2 + Math.sin(t * 1.5) * 0.015;
    B[3].rotation.x = B[5].rotation.x = 0.62;
    B[4].rotation.x = B[6].rotation.x = -0.12;
    B[3].rotation.z = 0.22; B[5].rotation.z = -0.22;
  } else {
    // em pé: passinhos curtos, o joelho sobe na passada e o peso troca de um pé para o outro
    const legA = lerp(0.34, 0.6, run) * w, kneeA = lerp(0.95, 1.3, run) * w;
    const swL = Math.max(0, c1), swR = Math.max(0, -c1);
    B[7].rotation.x = -s1 * legA - swL * 0.1 * w; B[10].rotation.x = s1 * legA - swR * 0.1 * w;
    B[8].rotation.x = 0.08 * w + swL * kneeA; B[11].rotation.x = 0.08 * w + swR * kneeA;
    B[9].rotation.x = -(B[7].rotation.x + B[8].rotation.x) * 0.6; B[12].rotation.x = -(B[10].rotation.x + B[11].rotation.x) * 0.6;
    B[0].position.y += (Math.abs(c1) - 0.6) * lerp(0.05, 0.07, run) * w - 0.012 * w - 0.03 * run;
    B[0].position.x = -c1 * 0.012 * w * (1 - run * 0.5);
    B[1].rotation.y = -s1 * 0.12 * w;
    B[1].rotation.z = c1 * 0.035 * w * (1 - run * 0.5);
    B[1].rotation.x = 0.03 * w + run * 0.2 + tired * 0.16 + (P.stoop || 0) + Math.sin(t * 1.7) * 0.012 * (1 - w);
    B[0].rotation.y = s1 * 0.07 * w;
    B[2].rotation.y = s1 * 0.09 * w;
    // braços
    const armA = lerp(0.5, 0.95, run) * w * (1 - tired * 0.5);
    B[3].rotation.x = s1 * armA; B[5].rotation.x = -s1 * armA;
    B[4].rotation.x = -(0.2 + 0.25 * w + run * 0.95) * Math.max(w, 0.35) - 0.08 - Math.max(0, -s1) * 0.25 * w;
    B[6].rotation.x = -(0.2 + 0.25 * w + run * 0.95) * Math.max(w, 0.35) - 0.08 - Math.max(0, s1) * 0.25 * w;
    const sway = Math.sin(t * 1.7) * 0.02 * (1 - w);
    B[3].rotation.z = 0.09 + sway + run * 0.12; B[5].rotation.z = -0.09 - sway - run * 0.12;
    // pulo / queda
    if (st.air > 0.01) {
      const a = st.air, up = st.vy > 0 ? 1 : 0;
      B[7].rotation.x = lerp(B[7].rotation.x, -0.75, a); B[8].rotation.x = lerp(B[8].rotation.x, 1.1, a);
      B[10].rotation.x = lerp(B[10].rotation.x, -0.25 + 0.2 * up, a); B[11].rotation.x = lerp(B[11].rotation.x, 0.55, a);
      B[3].rotation.z = lerp(B[3].rotation.z, 1.0 + up * 0.6, a); B[5].rotation.z = lerp(B[5].rotation.z, -1.0 - up * 0.6, a);
      B[3].rotation.x = lerp(B[3].rotation.x, -0.3, a); B[5].rotation.x = lerp(B[5].rotation.x, -0.3, a);
    }
  }
  // ---- ação da parte de cima ----
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
  // ---- cabeça: olhar ----
  const L = st.look, LT = st.lookT, kl = 1 - Math.exp(-dt * 5);
  L.yaw = lerp(L.yaw, LT.yaw, kl); L.pitch = lerp(L.pitch, LT.pitch, kl);
  B[2].rotation.y += L.yaw * 0.75; B[1].rotation.y += L.yaw * 0.25;
  B[2].rotation.x += L.pitch + tired * 0.22 + (st.sleep ? 0.35 : 0);
  if (pose !== 'sit' && pose !== 'lounge' && pose !== 'ground') B[2].rotation.x -= (P.stoop || 0) * 0.8;
  // rabo de cavalo
  B[13].rotation.x = 0.1 + Math.sin(ph * 2) * 0.12 * w + run * 0.35 - B[1].rotation.x * 0.6 - B[2].rotation.x * 0.5 + st.air * 0.4;
  B[13].rotation.z = Math.sin(ph) * 0.1 * w + Math.sin(t * 1.3) * 0.03;
  // objetos e cartaz
  const wantSign = st.sign ? 1 : 0;
  st.signW = lerp(st.signW, wantSign, 1 - Math.exp(-dt * 6));
  const ss = st.signW < 0.02 ? 1e-4 : st.signW;
  B[15].scale.setScalar(ss);
  B[14].scale.setScalar(st.propOn && st.signW < 0.5 ? 1 : 1e-4);
  // ---- rosto ----
  let fr = 0;
  st.blink -= dt;
  if (st.blink < 0) { st.blinkOn = 0.12; st.blink = rr(1.8, 4.8); }
  if (st.blinkOn > 0) { st.blinkOn -= dt; fr = 1; }
  if (st.talk) {
    st.mouth -= dt;
    if (st.mouth < 0) { st.mouthOpen = !st.mouthOpen; st.mouth = st.mouthOpen ? rr(0.07, 0.13) : rr(0.05, 0.1); }
    if (st.mouthOpen) fr = 2;
  }
  if (st.happy > 0) { st.happy -= dt; fr = 3; }
  if (st.sleep) fr = 1;
  setFace(ch, fr);
}
