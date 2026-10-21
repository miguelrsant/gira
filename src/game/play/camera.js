// ================= câmera =================
import * as THREE from 'three';
import { R, WALK } from '../core/config.js';
import { clamp, D2R, easeInOut, lerp, smooth, V3 } from '../core/math.js';
import { camera } from '../core/renderer.js';
import { view } from '../core/screen.js';
import { sky } from '../core/skydome.js';
import { CH } from '../world/chunks.js';
import { SPOTS } from '../world/places.js';
import { groundAt } from '../world/terrain.js';
import { headPos } from './bubbles.js';
import { insideTall } from './collide.js';
import { player } from './player.js';
import { state } from './state.js';

export const cam = { pos: V3(), look: V3(), up: new THREE.Vector3(0, 1, 0), pitch: 0.3, dist: 4.6, distT: 4.6, shot: null, far: true, lastDrag: 0, fov: 70, side: 1, tmode: 'side' };
export const _c = { h: V3(), p: V3(), l: V3(), u: V3(), w: V3(), t: V3(), s: V3(), a: V3(), b: V3(), sd: V3(), f: V3() };
export function fovFor() { const a = view.w / view.h; return clamp(2 * Math.atan(Math.tan(47 * D2R) / a) / D2R, 60, 84); }
cam.fov = fovFor();
function followPose(P, L, dt) {
  const up = player.d, back = player.camFwd;
  const head = _c.h.copy(player.d).multiplyScalar(R + player.feet + 1.22);
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  // prédio no caminho: a câmera chega mais perto
  // em pé (celular) a câmera fica um pouco mais longe para caber mais mundo
  const want = cam.distT * clamp(0.66 / (view.w / view.h), 1, 1.3);
  let lim = want;
  for (let k = 1; k <= 8; k++) {
    const dd = want * k / 8;
    _c.t.copy(head).addScaledVector(back, -dd * cp).addScaledVector(up, dd * sp);
    if (_c.t.length() - R - player.feet > 8.5) break;
    if (insideTall(_c.t.normalize(), 0.35)) { lim = Math.max(1.3, dd - want / 8 - 0.15); break; }
  }
  cam.dist = dt ? lerp(cam.dist, lim, 1 - Math.exp(-dt * (lim < cam.dist ? 16 : 2.2))) : lim;
  const D = cam.dist;
  // quando um prédio puxa a câmera para perto, ela sobe um pouco para olhar por cima do cabelo
  P.copy(head).addScaledVector(back, -D * cp).addScaledVector(up, D * sp + 0.15 + clamp(2.8 - D, 0, 1.6) * 0.38);
  L.copy(head).addScaledVector(back, 1.5).addScaledVector(up, 0.12 - cam.pitch * 0.4);
}
function talkPose(a, P, L) {
  const up = player.d;
  const A = _c.a.copy(player.head), B = headPos(a, _c.b).addScaledVector(a.up || a.d, -0.28);
  const mid = _c.t.addVectors(A, B).multiplyScalar(0.5);
  const ab = _c.s.subVectors(B, A); ab.addScaledVector(up, -ab.dot(up));
  const dl = Math.max(0.6, ab.length()); ab.divideScalar(dl);
  const side = _c.w.crossVectors(up, ab).multiplyScalar(cam.side);
  if (cam.tmode === 'wheel') {
    // o Marcos fica dentro da roda: a câmera olha pela lateral aberta, na linha do eixo
    const ax = _c.f.setFromMatrixColumn(SPOTS.wheel.W, 0).normalize();
    P.copy(B).addScaledVector(ax, cam.side * 5.6).addScaledVector(up, 0.05);
    L.copy(B).lerp(A, 0.18).addScaledVector(up, -0.15);
    return;
  }
  if (cam.tmode === 'over') {
    P.copy(A).addScaledVector(ab, -1.9).addScaledVector(side, 0.6).addScaledVector(up, 0.5);
    L.copy(B).lerp(A, 0.2);
    return;
  }
  P.copy(mid).addScaledVector(side, 1.6 + dl * 0.55).addScaledVector(ab, -0.65).addScaledVector(up, 0.28);
  L.copy(mid).addScaledVector(ab, 0.22).addScaledVector(up, -0.04);
}
// algo do cenário entre a câmera e os dois? (só na hora de escolher o enquadramento)
const _ray = new THREE.Raycaster(), _rd = V3();
let _rayMeshes = null;
function camBlocked(from, to) {
  if (!_rayMeshes) { _rayMeshes = []; for (const ch of CH) for (const k of ['main', 'small', 'fol']) if (ch.mesh[k]) _rayMeshes.push(ch.mesh[k]); }
  _rd.subVectors(to, from); const len = _rd.length(); if (len < 0.05) return false;
  _ray.set(from, _rd.divideScalar(len)); _ray.near = 0.15; _ray.far = len;
  return _ray.intersectObjects(_rayMeshes, false).length > 0 || insideTall(_rd.copy(to).normalize(), 0.2);
}
export function pickSide(a) {
  const up = player.d;
  const ab = _c.s.subVectors(a.ch.rig.position, player.pos); ab.addScaledVector(up, -ab.dot(up)).normalize();
  const side = _c.w.crossVectors(up, ab);
  const mid = _c.t.addVectors(a.ch.rig.position, player.pos).multiplyScalar(0.5);
  const s0 = side.dot(_c.a.subVectors(camera.position, mid)) >= 0 ? 1 : -1;
  if (a.n.wheel) {
    const ax = _c.f.setFromMatrixColumn(SPOTS.wheel.W, 0).normalize();
    cam.tmode = 'wheel';
    return _c.a.subVectors(player.pos, a.ch.rig.position).dot(ax) >= 0 ? 1 : -1;
  }
  const P = V3(), L = V3(), hA = V3(), hB = V3();
  for (const [sg, mode] of [[s0, 'side'], [-s0, 'side'], [s0, 'over'], [-s0, 'over']]) {
    cam.side = sg; cam.tmode = mode;
    talkPose(a, P, L);
    hA.copy(player.head); headPos(a, hB);
    if (!camBlocked(P, hA) && !camBlocked(P, hB)) return sg;
  }
  cam.tmode = 'side';
  return s0;
}
// a câmera gira em arco de trás da Duda até a frente dela (sem atravessar a cabeça)
function introPose(sh, P, L, dt) {
  const up = player.d, f = player.fwd, r = _c.w.crossVectors(up, f).normalize(), hd = player.head;
  const rel = _c.s.subVectors(cam.pos, hd);
  if (!sh.init) {
    sh.init = true;
    sh.a0 = Math.atan2(rel.dot(r), rel.dot(f)); sh.d0 = Math.hypot(rel.dot(r), rel.dot(f)); sh.h0 = rel.dot(up);
    sh.a1 = Math.atan2(-0.6, 2.45);
    let da = sh.a1 - sh.a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    sh.a1 = sh.a0 + da;
  }
  sh.t += dt;
  const u = easeInOut(clamp(sh.t / 1.8, 0, 1));
  const a = lerp(sh.a0, sh.a1, u), d = lerp(sh.d0, 2.52, u), h = lerp(sh.h0, -0.08, u) + Math.sin(u * Math.PI) * 0.35;
  P.copy(hd).addScaledVector(f, Math.cos(a) * d).addScaledVector(r, Math.sin(a) * d).addScaledVector(up, h);
  L.copy(hd).addScaledVector(up, -0.12).addScaledVector(r, 0.12 * u);
}
function lookPose(p, P, L) {
  const up = player.d;
  const toIt = _c.s.subVectors(p, player.head); toIt.addScaledVector(up, -toIt.dot(up)).normalize();
  const side = _c.w.crossVectors(up, toIt);
  P.copy(player.head).addScaledVector(toIt, -2.3).addScaledVector(side, 0.9).addScaledVector(up, 0.5);
  L.copy(p).lerp(player.head, 0.25);
}
// câmera de teste (window.__gira.lab): presa à Duda, num ângulo fixo em volta dela
function labPose(sh, P, L) {
  const up = player.d, f = player.fwd, r = _c.w.crossVectors(up, f).normalize();
  const c = _c.s.copy(player.d).multiplyScalar(R + groundAt(player.d) + (sh.y ?? 0.75));
  P.copy(c).addScaledVector(f, Math.cos(sh.a) * sh.d).addScaledVector(r, Math.sin(sh.a) * sh.d).addScaledVector(up, sh.h ?? 0);
  L.copy(c);
}
export function snapCamera() {
  followPose(cam.pos, cam.look, 0);
  cam.up.copy(player.d);
  camera.position.copy(cam.pos); camera.up.copy(cam.up); camera.lookAt(cam.look);
  sky.position.copy(camera.position);
  cam.far = false;
}
export function updateCamera(dt) {
  if (state.mode === 'title') { cam.far = true; return; }
  const sh = cam.shot;
  const fT = sh && sh.fov ? sh.fov : sh && sh.kind !== 'orbit' ? fovFor() - 9 : fovFor();
  cam.fov = lerp(cam.fov, fT, 1 - Math.exp(-dt * 3));
  if (Math.abs(camera.fov - cam.fov) > 0.05) { camera.fov = cam.fov; camera.updateProjectionMatrix(); }
  // a câmera vai atrás da Duda sozinha: virou para a direita, a câmera vira junto
  // (só não dá meia-volta quando ela vem andando na direção da câmera)
  if (!sh && state.mode === 'play' && !state.dialog && player.aspeed > 0.6 && performance.now() - cam.lastDrag > 1200) {
    const up = player.d, cf = player.camFwd, f = player.fwd;
    const ang = Math.atan2(_c.a.crossVectors(cf, f).dot(up), cf.dot(f));
    const k = Math.abs(ang) > 2.1 ? 0 : 2.4 * clamp(player.aspeed / WALK, 0.3, 1.4);
    cf.applyAxisAngle(up, ang * (1 - Math.exp(-dt * k)));
  }
  const P = _c.p, L = _c.l, Up = _c.u.copy(player.d);
  let rp = 9, rl = 12, ru = 6;
  if (!sh) followPose(P, L, dt);
  else if (sh.kind === 'talk') { talkPose(sh.a, P, L); rp = 4.2; rl = 5; }
  else if (sh.kind === 'intro') { introPose(sh, P, L, dt); rp = 14; rl = 6; }
  else if (sh.kind === 'look') { lookPose(sh.p, P, L); rp = 4; rl = 5; }
  else if (sh.kind === 'lab') { labPose(sh, P, L); rp = rl = 400; }
  else if (sh.kind === 'orbit') {
    // de volta ao espaço, como na abertura: o planeta em pé, girando sem ninguém empurrar
    sh.t += dt;
    const th = sh.th0 + sh.t * 0.07, ph = lerp(sh.ph0, 0.3, smooth(clamp(sh.t / 12, 0, 1)));
    const tv = Math.tan(cam.fov * D2R / 2), asp = view.w / view.h;
    const D = (R + 2.4) / Math.sin(Math.min(Math.atan(tv * 0.6), Math.atan(tv * asp * 0.8)));
    P.set(Math.cos(th) * Math.cos(ph), Math.sin(ph), Math.sin(th) * Math.cos(ph)).multiplyScalar(D);
    L.set(0, 0, 0);
    Up.set(-Math.cos(th) * Math.sin(ph), Math.cos(ph), -Math.sin(th) * Math.sin(ph));
    rp = 0.8; rl = 1.4; ru = 0.9;
  }
  if (!sh || sh.kind !== 'orbit') {
    const pd = _c.f.copy(P).normalize(), minR = R + groundAt(pd) + 0.45;
    if (P.length() < minR) P.setLength(minR);
  }
  cam.pos.lerp(P, 1 - Math.exp(-dt * rp));
  cam.look.lerp(L, 1 - Math.exp(-dt * rl));
  cam.up.lerp(Up, 1 - Math.exp(-dt * ru)).normalize();
  // nunca abaixo do chão, nem durante a transição
  const cd = _c.f.copy(cam.pos).normalize(), minC = R + groundAt(cd) + 0.35;
  if (cam.pos.length() < minC) cam.pos.setLength(minC);
  camera.position.copy(cam.pos); camera.up.copy(cam.up); camera.lookAt(cam.look);
  sky.position.copy(camera.position);
  cam.far = cam.pos.length() > R + 22;
}

export function rotateCam(dx, dy) {
  if (state.mode !== 'play' && state.mode !== 'cutscene') return;
  player.camFwd.applyAxisAngle(player.d, -dx);
  cam.pitch = clamp(cam.pitch + dy * 1.6, 0.04, 1.15);
  cam.lastDrag = performance.now();
}
export function zoomCam(d) { cam.distT = clamp(cam.distT + d, 2.6, 9); }
