// ================= gente e bichos =================
import * as THREE from 'three';
import { R, RUN, WALK } from '../core/config.js';
import { arcDist, clamp, headingVec, lerp, offsetDir, orient, rand, rr, V3 } from '../core/math.js';
import { camera, scene } from '../core/renderer.js';
import { overHorizon } from '../world/chunks.js';
import { ctxPoint } from '../world/kit.js';
import { MAIN, PIER } from '../world/layout.js';
import { SPOTS } from '../world/places.js';
import { groundAt } from '../world/terrain.js';
import { poseChar } from '../characters/animation.js';
import { makeChar } from '../characters/bodies.js';
import { makePet, posePet } from '../characters/pets.js';
import { CAST } from '../story/cast.js';
import { NPCS } from '../story/npcs.js';
import { sfx } from './audio.js';
import { makeOverlay, showEmote } from './bubbles.js';
import { cam } from './camera.js';
import { insideTall, pushOut, walkable } from './collide.js';
import { setHint } from './hud.js';
import { player } from './player.js';
import { state } from './state.js';

export const ACTORS = [];
function resolveAt(at) {
  if (at.pier) {
    const S = PIER.S, s = S[S.length - 2];
    const d = s.d.clone().addScaledVector(s.s, -0.2 / R).normalize();
    return { d, fwd: s.t.clone(), h: s.h + PIER.top, up: null, y: 1 };
  }
  const sp = SPOTS[at.spot];
  let c, x, y, z, ry;
  if (sp.W) { c = sp; x = at.x || 0; y = at.y || 0; z = at.z || 0; ry = at.ry || 0; }
  else { c = sp.c; x = at.x ?? sp.x ?? 0; y = at.y ?? sp.y ?? 0; z = at.z ?? sp.z ?? 0; ry = at.ry ?? sp.ry ?? 0; }
  const p = ctxPoint(c, x, y, z);
  const up = new THREE.Vector3().setFromMatrixColumn(c.W, 1).normalize();
  const fwd = new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry)).transformDirection(c.W);
  return { d: p.clone().normalize(), fwd, h: p.length() - R, up, y, c, x, z };
}
export function spawnActors() {
  NPCS.forEach((n, idx) => {
    const ch = n.pet ? makePet(n.pet) : makeChar(CAST[n.cast]);
    const a = {
      n, id: n.id, idx, ch, pet: n.pet || null, d: V3(), fwd: V3(), tan: V3(), h: 0, up: null, baseFwd: null, home: null,
      dist: 1e9, talking: false, emoteT: 0, reactT: 0, reactTxt: '', s: 0, lane: 0, laneOff: 0, speed: 0, speed0: 0,
      timer: rand() * 4, actT: 0, baseAct: ch.st.act, vis: true, waved: '', acc: 0, wander: null, stuck: 0, mega: false,
    };
    if (n.walker) {
      a.s = n.walker.s0 * MAIN.len; a.lane = n.walker.lane; a.speed0 = n.walker.speed; a.speed = a.speed0;
      walkerPlace(a); a.fwd.copy(a.tan);
    } else {
      const r = resolveAt(n.at);
      a.d.copy(r.d); a.fwd.copy(r.fwd).addScaledVector(r.d, -r.fwd.dot(r.d)).normalize();
      const raised = (r.y || 0) > 0.05 || n.seat !== undefined || n.wheel || n.pet === 'cat';
      // ninguém nasce dentro de parede (a banca da Neide, por exemplo)
      if (!raised && insideTall(a.d, 0.02)) { for (let k = 0; k < 3; k++) pushOut(a.d, 0.42); }
      a.h = raised ? r.h : groundAt(a.d);
      if (n.seat !== undefined || n.wheel || n.pet === 'cat') a.up = r.up;
      a.baseFwd = a.fwd.clone(); a.home = a.d.clone(); a.homeH = a.h; a.spot = r;
    }
    if (n.seat !== undefined) ch.st.seat = n.seat;
    if (n.wheel) ch.st.speed = 2.4;
    scene.add(ch.rig);
    placeActor(a);
    makeOverlay(a);
    ACTORS.push(a);
  });
}
export const actor = (id) => ACTORS.find((a) => a.id === id);
export function placeActor(a) {
  a.ch.rig.position.copy(a.d).multiplyScalar(R + a.h);
  orient(a.ch.rig, a.up || a.d, a.fwd);
}
// gente andando na Avenida da Esteira
const _w = { a: V3(), b: V3(), s: V3(), q: new THREE.Quaternion() };
function walkerPlace(a) {
  const rd = MAIN, S = rd.S, N = S.length;
  const s = ((a.s % rd.len) + rd.len) % rd.len, f = s / rd.step;
  const i = Math.floor(f) % N, t = f - Math.floor(f), j = (i + 1) % N;
  const A = S[i], B = S[j];
  a.d.lerpVectors(A.d, B.d, t);
  _w.s.lerpVectors(A.s, B.s, t).normalize();
  a.d.addScaledVector(_w.s, (a.lane + a.laneOff) / R).normalize();
  a.h = lerp(A.h, B.h, t) + rd.top;
  a.tan.lerpVectors(A.t, B.t, t).addScaledVector(a.d, -a.tan.dot(a.d)).normalize();
}
function updateWalker(a, dt) {
  let target = a.speed0;
  if (a.talking || state.strike || state.sunday || state.mode === 'cutscene' || state.mode === 'intro') target = 0;
  // espera a Duda sair da frente
  const rel = _w.a.copy(player.d).sub(a.d).multiplyScalar(R);
  const along = rel.dot(a.tan), side = rel.dot(_w.b.crossVectors(a.d, a.tan));
  if (along > 0.15 && along < 1.4 && Math.abs(side) < 0.6) target = 0;
  // ultrapassa quem anda devagar pela faixa do meio
  let offT = 0;
  for (const b of ACTORS) {
    if (b === a || !b.n.walker || Math.abs(b.lane - a.lane) > 0.5) continue;
    const ds = (((b.s - a.s) % MAIN.len) + MAIN.len) % MAIN.len;
    if (ds < 2.4 && a.speed0 > b.speed0 + 0.3) offT = -Math.sign(a.lane) * 0.85;
  }
  a.laneOff = lerp(a.laneOff, offT, 1 - Math.exp(-dt * 3));
  a.speed = lerp(a.speed, target, 1 - Math.exp(-dt * (target < a.speed ? 6 : 2.5)));
  a.s += a.speed * dt;
  if (!a.talking) {
    walkerPlace(a);
    const ang = Math.atan2(_w.b.crossVectors(a.fwd, a.tan).dot(a.d), a.fwd.dot(a.tan));
    a.fwd.applyAxisAngle(a.d, ang * (1 - Math.exp(-dt * 6))).addScaledVector(a.d, -a.fwd.dot(a.d)).normalize();
  }
  a.ch.st.speed = a.speed;
}
// Caramelo: fica na frente da loja, passeia, e segue a Duda depois de uma conversa
function updateDog(a, dt) {
  const st = a.ch.st;
  let tgt = a.wander || a.home, keep = 0.35, maxSp = 2.6;
  const fleeing = state.chase === a.id && state.mode === 'play';
  const following = !fleeing && state.follow > 0 && (state.mode === 'play' || state.mode === 'cutscene');
  if (fleeing) {
    // brincadeira de pega-pega: foge da Duda, espera quando ela fica para trás
    const dp = arcDist(a.d, player.d);
    a.timer -= dt;
    if (!a.wander || a.timer < 0 || arcDist(a.d, a.wander) < 0.9) {
      a.timer = rr(0.7, 1.5);
      const away = _w.a.copy(a.d).sub(player.d); away.addScaledVector(a.d, -away.dot(a.d));
      if (away.lengthSq() < 1e-8) away.copy(a.fwd);
      away.normalize().applyAxisAngle(a.d, rr(-1, 1) + (a.stuck > 0.4 ? rr(1.2, 2) * (rand() < 0.5 ? -1 : 1) : 0));
      a.wander = offsetDir(a.d, away, rr(3.5, 6));
      if (rand() < 0.3 && dp < 9) sfx.bark();
    }
    tgt = a.wander; keep = 0.2;
    maxSp = dp < 3.2 ? RUN * 0.8 : dp < 7 ? WALK * 1.15 : 0.01;
    if (dp >= 7) st.wag = 2;
  } else if (following) {
    tgt = player.d; keep = 1.6; maxSp = RUN * 0.98;
    if (state.mode === 'play') { state.follow -= dt; if (state.follow <= 0) setHint('O Caramelo voltou pra frente da loja dele.', 3500); }
  } else {
    a.timer -= dt;
    if (a.timer < 0) { a.timer = rr(4, 9); a.wander = rand() < 0.45 ? null : offsetDir(a.home, headingVec(a.home, rand() * 360), rr(1, 3.2)); }
  }
  const dist = arcDist(a.d, tgt);
  let sp = 0;
  if (dist > keep + 0.25) {
    sp = Math.min(maxSp, (dist - keep) * 2.4);
    const dir = _w.a.copy(tgt).addScaledVector(a.d, -tgt.dot(a.d)).normalize();
    const ang = Math.atan2(_w.b.crossVectors(a.fwd, dir).dot(a.d), a.fwd.dot(dir));
    a.fwd.applyAxisAngle(a.d, ang * (1 - Math.exp(-dt * 8))).addScaledVector(a.d, -a.fwd.dot(a.d)).normalize();
    const ax = _w.b.crossVectors(a.d, a.fwd).normalize();
    const nd = _w.s.copy(a.d).applyAxisAngle(ax, sp * dt / R);
    pushOut(nd, 0.25);
    if (walkable(nd)) {
      const mv = arcDist(a.d, nd);
      a.stuck = mv < sp * dt * 0.3 ? a.stuck + dt : 0;
      _w.q.setFromUnitVectors(a.d, nd); a.fwd.applyQuaternion(_w.q); a.d.copy(nd);
    } else { a.wander = null; a.stuck += dt; }
  }
  if (a.stuck > (fleeing ? 0.6 : 2.5) && !following) { a.wander = null; a.stuck = 0; }
  a.speed = lerp(a.speed, sp, 1 - Math.exp(-dt * 8));
  st.speed = a.speed; st.pose = a.speed > 0.15 ? 'stand' : 'sit';
  if (sp > 0 || a.speed > 0.05) a.h = groundAt(a.d);
  if (a.dist < 3 && state.mode === 'play') st.wag = 0.4;
  // muito longe de casa e fora de vista: volta
  if (!following && !fleeing && arcDist(a.d, a.home) > 25 && !a.vis) { a.d.copy(a.home); a.h = a.homeH; a.fwd.copy(a.baseFwd); }
}

// comportamento de cada um
const _b = { rel: V3(), r: V3(), p: V3() };
export function updateActors(dt, t) {
  const camD = camera.position.length();
  const dayKey = state.week + ':' + state.day + (state.sunday ? 's' : '');
  for (const a of ACTORS) {
    const n = a.n, ch = a.ch, st = ch.st;
    if (n.walker) updateWalker(a, dt);
    else if (n.roam) updateDog(a, dt);
    a.dist = arcDist(player.d, a.d);
    a.vis = overHorizon(a.d, 0, 2.5, camera.position, camD) && (a.dist < 75 || cam.far);
    ch.rig.visible = a.vis;
    // ações próprias
    if (n.id === 'valdir') {
      if (state.strike) { st.act = (Math.floor(t / 1.4) % 2) || state.flags.megaGone ? 'angry' : 'mega'; st.propOn = st.act === 'mega'; }
      else if (state.sunday) { st.act = 'shrug'; st.propOn = false; }
      else if (!a.talking && a.dist < 11 && state.mode === 'play') {
        a.timer -= dt;
        if (a.timer < 0) { a.mega = !a.mega; a.timer = a.mega ? 2.4 : rr(4, 7); }
        const has = !state.flags.megaGone;
        st.act = a.mega && has ? 'mega' : 'hips'; st.propOn = a.mega && has;
      } else { st.act = 'hips'; st.propOn = false; a.mega = false; }
    }
    if (n.id === 'bia' && a.dist < 6 && a.waved !== dayKey && state.mode === 'play' && !a.talking) { a.waved = dayKey; st.act = 'wave'; a.actT = 2.4; }
    if (a.actT > 0) { a.actT -= dt; if (a.actT <= 0) st.act = state.strike ? 'protest' : state.sunday ? null : a.baseAct; }
    // olhar para a Duda
    const up = a.up || a.d;
    if (a.dist < 5 && a.vis && state.mode !== 'title') {
      _b.p.copy(ch.rig.position).addScaledVector(up, ch.pet ? 0.45 : ch.headY);
      _b.rel.subVectors(player.head, _b.p);
      _b.r.crossVectors(up, a.fwd);
      const lx = _b.rel.dot(_b.r), lz = _b.rel.dot(a.fwd), ly = _b.rel.dot(up);
      const yaw = Math.atan2(lx, lz);
      st.lookT.yaw = Math.abs(yaw) < 2.0 ? clamp(yaw, -1.1, 1.1) : 0;
      st.lookT.pitch = clamp(-Math.atan2(ly, Math.hypot(lx, lz)), -0.35, 0.45);
    } else { st.lookT.yaw = 0; st.lookT.pitch = 0; }
    // vira de frente para conversar
    const canTurn = !ch.pet && n.seat === undefined && !n.wheel && !n.at?.pier && st.pose !== 'ground';
    if (a.talking && canTurn) {
      const dir = _b.rel.copy(player.d).addScaledVector(a.d, -player.d.dot(a.d)).normalize();
      const ang = Math.atan2(_b.r.crossVectors(a.fwd, dir).dot(a.d), a.fwd.dot(dir));
      a.fwd.applyAxisAngle(a.d, ang * (1 - Math.exp(-dt * 7))).addScaledVector(a.d, -a.fwd.dot(a.d)).normalize();
    } else if (a.baseFwd && !n.roam && canTurn) {
      const ang = Math.atan2(_b.r.crossVectors(a.fwd, a.baseFwd).dot(a.d), a.fwd.dot(a.baseFwd));
      if (Math.abs(ang) > 0.01) a.fwd.applyAxisAngle(a.d, ang * (1 - Math.exp(-dt * 2.5))).addScaledVector(a.d, -a.fwd.dot(a.d)).normalize();
    }
    if (a.vis || n.walker || n.roam) placeActor(a);
    // reações a emoções
    if (a.reactT > 0) { a.reactT -= dt; if (a.reactT <= 0) showEmote(a, a.reactTxt); }
    if (a.emoteT > 0) a.emoteT -= dt;
    // animação (longe: menos vezes por segundo)
    a.acc += dt;
    if (a.vis && (a.dist < 40 || (state.frame + a.idx) % 3 === 0)) { (ch.pet ? posePet : poseChar)(ch, a.acc); a.acc = 0; }
  }
}

// ---------------- emoções da Duda (teclas 1 a 6 ou o painel) e quem responde ----------------
export const EMOTES = ['!', '?', '♥', '…', 'zz', '#@!'];
const EMOTE_ACT = { '!': 'cheer', '?': 'think', '♥': 'love', '…': 'shrug', 'zz': 'sleepy', '#@!': 'angry' };
const EMOTE_REPLY = { '!': '!', '?': '?', '♥': '♥', '…': '…', 'zz': 'zz', '#@!': '!' };
export function playerEmote(e) {
  if (state.mode !== 'play' || state.dialog) return;
  showEmote(null, e);
  state.lastEmote = { e, t: performance.now() };
  const st = player.ch.st;
  if (!state.strike) { st.act = EMOTE_ACT[e]; player.actT = 1.8; }
  if (e === '♥') st.happy = 1.6;
  // quem está perto responde
  for (const a of ACTORS) {
    if (a.dist > 5 || !a.vis) continue;
    a.reactT = rr(0.45, 1.0);
    a.reactTxt = a.id === 'valdir' && e === '#@!' ? '#@!' : a.id === 'valdir' && e === 'zz' ? '!' : EMOTE_REPLY[e];
    if (e === '♥') a.ch.st.happy = 1.4;
    if (a.id === 'caramelo' && (e === '♥' || e === '!')) { state.follow = Math.max(state.follow, 40); sfx.bark(); }
  }
}
