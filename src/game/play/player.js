// ================= Duda (a protagonista) =================
import * as THREE from 'three';
import { setUI } from '../../store.js';
import { LAP, R, RUN, SEA, WALK } from '../core/config.js';
import { angDiff, arcDist, clamp, eastOf, lerp, V3 } from '../core/math.js';
import { scene } from '../core/renderer.js';
import { SPOTS } from '../world/places.js';
import { groundAt } from '../world/terrain.js';
import { poseChar } from '../characters/animation.js';
import { disposeChar, makeChar, placeChar } from '../characters/bodies.js';
import { heroSpec, outfit, OUTFIT_OPTS } from '../story/outfit.js';
import { audio, sfx } from './audio.js';
import { showEmote } from './bubbles.js';
import { pushOut } from './collide.js';
import { joy, keys, state } from './state.js';

export const player = {
  ch: null, d: V3(), fwd: V3(), vel: V3(), speed: 0, aspeed: 0, feet: 0, vy: 0, air: false,
  camFwd: V3(), lock: false, pos: V3(), head: V3(), actT: 0, lastStep: 0,
  // referência dos controles: presa ao mundo enquanto a mesma direção continua apertada
  ctrlFwd: V3(), ctrlOn: false, ctrlA: 0,
};
// quadro do céu, transportado junto com a Duda (nuvens passam por cima quando ela anda)
export const SKYF = { x: V3(), z: V3(), shift: new THREE.Vector3() };
export function initPlayer() {
  player.ch = makeChar(heroSpec());
  scene.add(player.ch.rig);
  const sp = SPOTS.spawn;
  player.d.copy(sp.d);
  player.fwd.copy(sp.fwd).addScaledVector(sp.d, -sp.fwd.dot(sp.d)).normalize();
  player.camFwd.copy(player.fwd); player.ctrlFwd.copy(player.fwd);
  player.feet = groundAt(player.d);
  eastOf(player.d, SKYF.x); SKYF.z.crossVectors(SKYF.x, player.d).normalize();
  placePlayer();
}
export function placePlayer() {
  placeChar(player.ch, player.d, player.fwd, player.feet);
  player.pos.copy(player.ch.rig.position);
  player.head.copy(player.d).multiplyScalar(R + player.feet + player.ch.headY);
}
function rebuildPlayer() {
  const old = player.ch, st = old.st;
  const spec = heroSpec(); spec.reuseSlot = old.slot;
  const ch = makeChar(spec);
  for (const k of ['pose', 'act', 'sign', 'tired', 'seat']) ch.st[k] = st[k];
  disposeChar(old); scene.add(ch.rig); player.ch = ch; placePlayer();
}
const _m = { a: V3(), b: V3(), md: V3(), nd: V3(), ax: V3(), q: new THREE.Quaternion() };
function tryMove(from, dir, dist, out) {
  const ax = _m.ax.crossVectors(from, dir); const l = ax.length(); if (l < 1e-8) return null; ax.divideScalar(l);
  out.copy(from).applyAxisAngle(ax, dist / R);
  pushOut(out, 0.3);
  const g = groundAt(out);
  if (g < SEA - 0.12 || g - player.feet > 0.8) return null;
  return out;
}
export function stepPlayer(dt) {
  const up = player.d, st = player.ch.st;
  let ix = 0, iy = 0;
  const can = state.mode === 'play' && !state.dialog && !player.lock;
  if (can) {
    if (keys.KeyW || keys.ArrowUp) iy += 1; if (keys.KeyS || keys.ArrowDown) iy -= 1;
    if (keys.KeyD || keys.ArrowRight) ix += 1; if (keys.KeyA || keys.ArrowLeft) ix -= 1;
    if (joy.id !== null) { ix += clamp(joy.x, -1.4, 1.4); iy -= clamp(joy.y, -1.4, 1.4); }
  }
  let mag = Math.hypot(ix, iy);
  const run = can && (keys.ShiftLeft || keys.ShiftRight || mag > 1.08);
  if (mag > 1) { ix /= mag; iy /= mag; mag = 1; }
  const cf = player.camFwd.addScaledVector(up, -player.camFwd.dot(up)).normalize();
  const moving = mag > 0.08;
  // "para a direita" é a direita da câmera na hora em que se aperta; enquanto a direção não muda,
  // a Duda segue reto e a câmera vira atrás dela (sem a câmera puxar a curva junto)
  const ia = Math.atan2(ix, iy);
  if (!moving) player.ctrlOn = false;
  else if (!player.ctrlOn || Math.abs(angDiff(ia, player.ctrlA)) > 0.6) { player.ctrlOn = true; player.ctrlA = ia; player.ctrlFwd.copy(cf); }
  const base = moving ? player.ctrlFwd.addScaledVector(up, -player.ctrlFwd.dot(up)).normalize() : cf;
  const right = _m.a.crossVectors(base, up).normalize();
  const md = _m.md.set(0, 0, 0).addScaledVector(base, iy).addScaledVector(right, ix);
  if (moving) {
    md.normalize();
    const f = player.fwd, ang = Math.atan2(_m.b.crossVectors(f, md).dot(up), f.dot(md));
    f.applyAxisAngle(up, ang * (1 - Math.exp(-dt * 13))).addScaledVector(up, -f.dot(up)).normalize();
  }
  const target = moving ? (run ? RUN : WALK) * Math.min(1, mag * 1.25) : 0;
  player.vel.lerp(_m.b.copy(md).multiplyScalar(target), 1 - Math.exp(-dt * (target > player.speed ? 7 : 11)));
  player.vel.addScaledVector(up, -player.vel.dot(up));
  const sp = player.vel.length();
  let moved = 0;
  if (sp > 0.002) {
    const dir = _m.a.copy(player.vel).divideScalar(sp), dist = sp * dt;
    let nd = tryMove(up, dir, dist, _m.nd);
    if (!nd) {
      for (const a of [0.55, -0.55, 1.1, -1.1]) {
        const d2 = _m.b.copy(dir).applyAxisAngle(up, a);
        nd = tryMove(up, d2, dist * Math.cos(a), _m.nd); if (nd) break;
      }
      if (!nd) player.vel.multiplyScalar(0.3);
    }
    if (nd) {
      moved = arcDist(up, nd);
      const dx = (nd.x - up.x) * R, dy = (nd.y - up.y) * R, dz = (nd.z - up.z) * R;
      SKYF.shift.x += (dx * SKYF.x.x + dy * SKYF.x.y + dz * SKYF.x.z) * 0.02;
      SKYF.shift.z += (dx * SKYF.z.x + dy * SKYF.z.y + dz * SKYF.z.z) * 0.02;
      _m.q.setFromUnitVectors(up, nd);
      player.fwd.applyQuaternion(_m.q); player.vel.applyQuaternion(_m.q); player.camFwd.applyQuaternion(_m.q); player.ctrlFwd.applyQuaternion(_m.q);
      SKYF.x.applyQuaternion(_m.q);
      up.copy(nd);
      if (state.mode === 'play' && !state.sunday && !state.strike && !state.dialog) state.walked += moved;
    }
  }
  player.speed = sp;
  player.aspeed = lerp(player.aspeed, moved / Math.max(dt, 1e-4), 1 - Math.exp(-dt * 14));
  SKYF.x.addScaledVector(up, -SKYF.x.dot(up)).normalize(); SKYF.z.crossVectors(SKYF.x, up).normalize();
  // chão, degraus e pulo
  const g = groundAt(up);
  const snap = 0.07 + player.aspeed * dt * 0.9;
  if (player.vy > 0 || player.feet > g + snap) {
    player.vy -= 15 * dt; player.feet += player.vy * dt;
    if (player.feet <= g) { if (player.vy < -5.5) sfx.land(); player.feet = g; player.vy = 0; }
  } else { player.feet = g; player.vy = 0; }
  player.air = player.feet > g + 0.06;
  placePlayer();
  // animação
  st.speed = player.aspeed;
  st.air = lerp(st.air, player.air ? 1 : 0, 1 - Math.exp(-dt * 12)); st.vy = player.vy;
  if (!state.sunday && !state.strike) st.tired = 0.12 + 0.42 * clamp(state.walked / LAP, 0, 1) + (state.day === 7 ? 0.15 : 0);
  else st.tired = lerp(st.tired, 0, dt);
  if (player.actT > 0) { player.actT -= dt; if (player.actT <= 0 && !state.strike) st.act = null; }
  poseChar(player.ch, dt);
  // passos
  const ph = Math.floor(st.phase / Math.PI);
  if (ph !== player.lastStep && player.aspeed > 0.6 && !player.air) sfx.step(player.aspeed > WALK + 0.5);
  player.lastStep = ph;
  if (audio.tick) audio.tick.gain.setTargetAtTime(player.aspeed > 0.5 && !state.sunday && !state.strike && state.mode === 'play' ? 1 : 0, audio.ctx.currentTime, 0.15);
  // parada: "o dia parou"
  state.idleT = player.aspeed > 0.5 ? 0 : state.idleT + dt;
}
export function jump() {
  if (state.mode === 'play' && !state.dialog && !player.air && player.vy <= 0 && !player.lock) { player.vy = 5.6; sfx.jump(); }
}

// ---------------- guarda-roupa (o painel é o <Wardrobe>, em src/ui) ----------------
export function changeOutfit(k, d) {
  const n = OUTFIT_OPTS[k].length; outfit[k] = (outfit[k] + d + n) % n;
  try { localStorage.setItem('gira3-outfit', JSON.stringify(outfit)); } catch (e) {}
  setUI({ outfit: { ...outfit } });
  rebuildPlayer(); sfx.pop(); showEmote(null, '♥');
}
