// ================= gente e bichos =================
import * as THREE from 'three';
import { R, RUN, WALK } from '../core/config.js';
import { arcDist, clamp, headingVec, lerp, offsetDir, orient, rand, rr, sstep, V3 } from '../core/math.js';
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
      // (as velocidades do npcs.js são do tempo do passo apressado; todo mundo anda mais devagar agora, como a Duda)
      a.s = n.walker.s0 * MAIN.len; a.lane = n.walker.lane; a.speed0 = n.walker.speed * 0.6; a.speed = a.speed0;
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
  let tgt = a.wander || a.home, keep = 0.35, maxSp = 1.5;
  const fleeing = !a.talking && state.chase === a.id && state.mode === 'play';
  const following = !fleeing && !a.talking && state.follow > 0 && (state.mode === 'play' || state.mode === 'cutscene');
  if (a.talking) {
    // carinho: vem até a frente da Duda e senta virado para ela
    if (!a.petSpot) {
      const to = _w.a.copy(a.d).sub(player.d); to.addScaledVector(player.d, -to.dot(player.d));
      if (to.lengthSq() < 1e-10) to.copy(player.fwd);
      a.petSpot = offsetDir(player.d, to.normalize(), PET_D);
    }
    // não deu para chegar (meio-fio, banca): fica onde está e a Duda vai até ele
    if (a.stuck > 0.5) a.petBlocked = true;
    const close = a.dist < PET_D + 0.06;
    tgt = a.petSpot; keep = 0.02; maxSp = a.petBlocked || close ? 0 : 1.3;
    if (arcDist(a.d, a.petSpot) < 0.3 || a.petBlocked || close) {
      const dir = _w.a.copy(player.d).addScaledVector(a.d, -player.d.dot(a.d)).normalize();
      const ang = Math.atan2(_w.b.crossVectors(a.fwd, dir).dot(a.d), a.fwd.dot(dir));
      a.fwd.applyAxisAngle(a.d, ang * (1 - Math.exp(-dt * 6))).addScaledVector(a.d, -a.fwd.dot(a.d)).normalize();
    }
  } else if (fleeing) {
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

// carinho no bicho: a Duda vira para ele, chega perto até a mão alcançar, agacha (ou fica em pé, se ele está no alto)
// e passa a mão na cabeça dele
const PET_D = 0.75;   // o Caramelo senta a essa distância da Duda (a mão dela alcança a cabeça dele)
const PET_YAW = 0.35; // e um pouco à direita dela (a mão direita alcança e as cabeças não se batem)
const STROKE = 1.3;   // segundos de cada passada da mão
const _pd = V3();
const _pt = { n: V3(), rel: V3(), c: V3() };
// onde a palma encosta: no alto da cabeça do bicho, indo da testa até a nuca, depois levanta um pouco e volta
function strokePoint(a, hs) {
  const ch = a.ch, P = ch.P, hb = ch.bones[1];
  hb.updateWorldMatrix(true, false);
  const u = (a.petT / STROKE) % 1, on = u < 0.62;
  const s = on ? sstep(0, 1, u / 0.62) : 1 - sstep(0, 1, (u - 0.62) / 0.38);
  const phi = lerp(0.45, -0.8, s), lift = on ? 0 : Math.sin(Math.PI * (u - 0.62) / 0.38) * 0.04;
  // o alto da cabeça é uma elipse (centro a (0; 0,06; 0,06) do osso da cabeça)
  const n = _pt.n.set(0, Math.cos(phi) / P.ht, Math.sin(phi) / P.hd).normalize();
  if (!hs.petAt) { hs.petAt = V3(); hs.petN = V3(); }
  hs.petAt.set(0, 0.06 + P.hr * P.ht * Math.cos(phi), 0.06 + P.hr * P.hd * Math.sin(phi)).addScaledVector(n, lift);
  hb.localToWorld(hs.petAt);
  hs.petN.copy(n).transformDirection(hb.matrixWorld);
  ch.st.petted = on ? 1 : 0.5;
}
function petByHero(a, dt) {
  const hs = player.ch.st;
  if (!a.talking) { if (a.petting) { a.petting = false; a.petSpot = null; a.petBlocked = false; a.ch.st.petted = 0; hs.crouch = false; hs.pet = false; player.auto = null; } return; }
  if (!a.petting) { a.petting = true; a.petT = 0; a.heroGap = 9; a.heroStill = 0; }
  a.petT += dt;
  const up = player.d, dir = _b.p.copy(a.d).addScaledVector(up, -a.d.dot(up));
  if (dir.lengthSq() > 1e-10) {
    dir.normalize();
    // fica de frente para um pouco à esquerda do bicho: ele fica na frente da mão direita
    const face = _b.rel.copy(dir).applyAxisAngle(up, PET_YAW);
    const f = player.fwd, ang = Math.atan2(_b.r.crossVectors(f, face).dot(up), f.dot(face));
    f.applyAxisAngle(up, ang * (1 - Math.exp(-dt * 5))).addScaledVector(up, -f.dot(up)).normalize();
  }
  strokePoint(a, hs);
  // a cabeça do bicho em relação aos pés da Duda: no chão ela agacha; no alto (o Mingau no muro) o carinho é em pé
  const hc = a.ch.bones[1].localToWorld(_pt.c.set(0, 0.06, 0.06));
  const rel = _pt.rel.copy(hc).sub(player.pos), hgt = rel.dot(up);
  const flat = Math.sqrt(Math.max(0, rel.lengthSq() - hgt * hgt));
  const low = hgt < 0.85;
  // longe para a mão (meio-fio, muro): a Duda dá uns passos até ele, até alcançar ou não ter mais como chegar
  const gap = flat - (low ? 0.5 : 0.36);
  if (gap < a.heroGap - 0.01) { a.heroGap = gap; a.heroStill = 0; } else if (player.auto) a.heroStill += dt;
  // o cachorro chega primeiro e senta; só então ela anda o que faltar (nunca para cima dele)
  const settled = a.pet === 'cat' || (a.petT > 0.6 && a.speed < 0.15) || a.petT > 2.5;
  player.auto = settled && gap > 0.04 && a.dist > 0.62 && a.petT < 5 && a.heroStill < 0.5 ? { dir: _pd.copy(dir), speed: clamp(gap * 2.2, 0.45, 1.3) } : null;
  const near = settled && (gap < 0.07 || a.dist <= 0.62 || a.heroStill > 0.5 || a.petT > 5);
  hs.crouch = near && low;
  hs.pet = near && a.dist < 1.4;
  if (hs.pet) { a.ch.st.happy = Math.max(a.ch.st.happy, 0.25); a.ch.st.wag = Math.max(a.ch.st.wag, 0.3); }
  else a.ch.st.petted = 0;
}
// a Duda olha para quem fala com ela, ou para quem está perto e na frente
const _h = { rel: V3(), r: V3(), p: V3() };
function heroLook() {
  const hs = player.ch.st, up = player.d, f = player.fwd;
  let best = null, bs = 1e9;
  if (state.mode !== 'title') for (const a of ACTORS) {
    if (!a.vis) continue;
    if (a.talking) { best = a; break; }
    if (a.dist > 3.4 || state.dialog) continue;
    const dir = _h.rel.copy(a.d).sub(up);
    if (dir.dot(f) < -0.15 * a.dist / R) continue;
    if (a.dist < bs) { bs = a.dist; best = a; }
  }
  if (!best) { hs.lookT.yaw = 0; hs.lookT.pitch = 0; return; }
  const aup = best.up || best.d;
  // fazendo carinho: olha para a mão
  if (best.pet && hs.pet && hs.petAt) _h.p.copy(hs.petAt);
  else _h.p.copy(best.ch.rig.position).addScaledVector(aup, best.ch.pet ? (best.ch.P.hy || 0.4) : best.ch.headY);
  _h.rel.subVectors(_h.p, player.head);
  _h.r.crossVectors(up, f);
  const lx = _h.rel.dot(_h.r), lz = _h.rel.dot(f), ly = _h.rel.dot(up);
  const yaw = Math.atan2(lx, lz);
  hs.lookT.yaw = Math.abs(yaw) < 1.9 ? clamp(yaw, -1.0, 1.0) : 0;
  hs.lookT.pitch = clamp(-Math.atan2(ly, Math.hypot(lx, lz)), -0.35, 0.55);
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
    if (a.pet) petByHero(a, dt);
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
  heroLook();
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
