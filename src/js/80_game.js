// ================= estado do jogo =================
const QS = new URLSearchParams(location.search);
const state = {
  mode: 'loading',          // loading | title | intro | play | cutscene
  day: 1, week: 1, walked: 0, strike: false, sunday: false, declined: false,
  talked: new Set(), read: new Set(), pages: new Set(), visited: new Set(),
  dialog: null, musicOn: true, idleT: 0, district: null, autoSun: false, sunP: null, freeze: false,
  follow: 0, hints: new Set(), frame: 0,
};
const V3 = () => new THREE.Vector3();

// ================= colisão no planeta =================
const CHASH = new SHash(3);
function hashColliders() {
  for (const co of COLLIDERS) {
    const c = co.box ? co.c : co.d, r = (co.box ? co.rad : co.r) + 0.7;
    CHASH.insert(c.x * R, c.y * R, c.z * R, r, co);
  }
}
// empurra a direção d para fora dos colisores (pr = raio de quem anda)
function pushOut(d, pr = 0.3) {
  CHASH.near(d.x * R, d.y * R, d.z * R, (co) => {
    if (co.box) {
      const vx = (d.x - co.c.x) * R, vy = (d.y - co.c.y) * R, vz = (d.z - co.c.z) * R;
      const lx = vx * co.r.x + vy * co.r.y + vz * co.r.z, lz = vx * co.f.x + vy * co.f.y + vz * co.f.z;
      const qx = clamp(lx, -co.hw, co.hw), qz = clamp(lz, -co.hd, co.hd);
      const dx = lx - qx, dz = lz - qz, dl = Math.hypot(dx, dz);
      if (dl >= pr) return;
      let nx, nz;
      if (dl > 1e-5) { nx = qx + dx / dl * pr; nz = qz + dz / dl * pr; }
      else if (co.hw - Math.abs(lx) < co.hd - Math.abs(lz)) { nx = (lx < 0 ? -1 : 1) * (co.hw + pr); nz = lz; }
      else { nx = lx; nz = (lz < 0 ? -1 : 1) * (co.hd + pr); }
      d.set(co.c.x * R + co.r.x * nx + co.f.x * nz, co.c.y * R + co.r.y * nx + co.f.y * nz, co.c.z * R + co.r.z * nx + co.f.z * nz).normalize();
    } else {
      const c = d.dot(co.d), min = co.r + pr;
      if (c < Math.cos(min / R)) return;
      const tx = d.x - co.d.x * c, ty = d.y - co.d.y * c, tz = d.z - co.d.z * c, tl = Math.hypot(tx, ty, tz);
      if (tl < 1e-7) return;
      const th = min / R, cs = Math.cos(th), sn = Math.sin(th) / tl;
      d.set(co.d.x * cs + tx * sn, co.d.y * cs + ty * sn, co.d.z * cs + tz * sn).normalize();
    }
  });
}
// ponto (direção) dentro de um prédio alto: usado pela câmera
function insideTall(p, pad = 0.3) {
  let hit = false;
  CHASH.near(p.x * R, p.y * R, p.z * R, (co) => {
    if (hit || !co.box || !co.tall) return;
    const vx = (p.x - co.c.x) * R, vy = (p.y - co.c.y) * R, vz = (p.z - co.c.z) * R;
    const lx = vx * co.r.x + vy * co.r.y + vz * co.r.z, lz = vx * co.f.x + vy * co.f.y + vz * co.f.z;
    if (Math.abs(lx) < co.hw + pad && Math.abs(lz) < co.hd + pad) hit = true;
  });
  return hit;
}
const walkable = (d) => groundAt(d) > SEA - 0.12;

// ================= Duda (a protagonista) =================
const player = {
  ch: null, d: V3(), fwd: V3(), vel: V3(), speed: 0, aspeed: 0, feet: 0, vy: 0, air: false,
  camFwd: V3(), lock: false, pos: V3(), head: V3(), actT: 0, lastStep: 0,
  // referência dos controles: presa ao mundo enquanto a mesma direção continua apertada
  ctrlFwd: V3(), ctrlOn: false, ctrlA: 0,
};
// quadro do céu, transportado junto com a Duda (nuvens passam por cima quando ela anda)
const SKYF = { x: V3(), z: V3(), shift: new THREE.Vector3() };
function initPlayer() {
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
function placePlayer() {
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
function stepPlayer(dt) {
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
function jump() {
  if (state.mode === 'play' && !state.dialog && !player.air && player.vy <= 0 && !player.lock) { player.vy = 5.6; sfx.jump(); }
}

// ================= gente e bichos =================
const ACTORS = [];
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
function spawnActors() {
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
const actor = (id) => ACTORS.find((a) => a.id === id);
function placeActor(a) {
  a.ch.rig.position.copy(a.d).multiplyScalar(R + a.h);
  orient(a.ch.rig, a.up || a.d, a.fwd);
}
// gente andando na Avenida da Esteira
const _w = { a: V3(), b: V3(), s: V3() };
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
  const following = state.follow > 0 && (state.mode === 'play' || state.mode === 'cutscene');
  if (following) {
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
      _m.q.setFromUnitVectors(a.d, nd); a.fwd.applyQuaternion(_m.q); a.d.copy(nd);
    } else { a.wander = null; a.stuck += dt; }
  }
  if (a.stuck > 2.5 && !following) { a.wander = null; a.stuck = 0; }
  a.speed = lerp(a.speed, sp, 1 - Math.exp(-dt * 8));
  st.speed = a.speed; st.pose = a.speed > 0.15 ? 'stand' : 'sit';
  if (sp > 0 || a.speed > 0.05) a.h = groundAt(a.d);
  if (a.dist < 3 && state.mode === 'play') st.wag = 0.4;
  // muito longe de casa e fora de vista: volta
  if (!following && arcDist(a.d, a.home) > 25 && !a.vis) { a.d.copy(a.home); a.h = a.homeH; a.fwd.copy(a.baseFwd); }
}

// comportamento de cada um
const _b = { rel: V3(), r: V3(), p: V3() };
function updateActors(dt, t) {
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
      if (state.strike) { st.act = (Math.floor(t / 1.4) % 2) ? 'angry' : 'mega'; st.propOn = st.act === 'mega'; }
      else if (state.sunday) { st.act = 'shrug'; st.propOn = false; }
      else if (!a.talking && a.dist < 11 && state.mode === 'play') {
        a.timer -= dt;
        if (a.timer < 0) { a.mega = !a.mega; a.timer = a.mega ? 2.4 : rr(4, 7); }
        st.act = a.mega ? 'mega' : 'hips'; st.propOn = a.mega;
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

// ================= o que está perto para conversar / olhar =================
let target = null;
function findTarget() {
  target = null;
  if (state.mode !== 'play' || state.dialog) return null;
  let best = null, bs = 1e9;
  const f = player.fwd;
  for (const a of ACTORS) {
    if (a.dist > 2.7 || !a.vis) continue;
    const dir = _b.rel.copy(a.d).sub(player.d).normalize();
    const s = a.dist - 0.7 * dir.dot(f);
    if (s < bs) { bs = s; best = { kind: 'npc', a, name: a.n.name }; }
  }
  for (const it of INTERACT) {
    const d = arcDist(player.d, it.dir);
    if (d > 2.1) continue;
    const hh = it.pos.length() - R - player.feet;
    if (hh < -1.2 || hh > 3.2) continue;
    const dir = _b.rel.copy(it.dir).sub(player.d).normalize();
    const s = d + 0.35 - 0.7 * dir.dot(f);
    if (s < bs) { bs = s; best = { kind: 'it', it, name: it.name }; }
  }
  target = best;
  return best;
}
function interactNow() {
  const t = target || findTarget();
  if (!t) return;
  if (t.kind === 'npc') startTalk(t.a); else startRead(t.it);
}

// ================= folhas de domingo =================
const PAGEOBJ = [];
function initPages() {
  const uv = texCalendar();
  const g = new Geo();
  g.add(GEO.box, TM(0, 0, 0, 0.38, 0.5, 0.008), null, { c: C('#f4f4ef'), id: 6 });
  g.add(GEO.plane, TM(0, 0, 0.0055, 0.36, 0.48, 1), null, { c: C('#ffffff'), uv, id: 6 });
  g.add(GEO.plane, TM(0, 0, -0.0055, 0.36, 0.48, 1, Math.PI), null, { c: C('#ffffff'), uv, id: 6 });
  const geo = g.build();
  PAGES.forEach((p, i) => {
    const d = ctxDir(p.c, p.x, p.z);
    const base = Math.max(groundAt(d), p.h ?? -99);
    const m = new THREE.Mesh(geo, MAT.world); m.castShadow = true; m.receiveShadow = false;
    scene.add(m);
    PAGEOBJ.push({ p, i, d, h: base + p.y, m, got: false, fwd: headingVec(d, i * 50) });
  });
}
const _pg = V3();
function updatePages(dt, t) {
  const camD = camera.position.length();
  for (const o of PAGEOBJ) {
    if (o.got) { o.m.visible = false; continue; }
    o.m.visible = overHorizon(o.d, 0, 2, camera.position, camD);
    if (!o.m.visible) continue;
    o.m.position.copy(o.d).multiplyScalar(R + o.h + Math.sin(t * 2.2 + o.i) * 0.1);
    orient(o.m, o.d, _pg.copy(o.fwd).applyAxisAngle(o.d, t * 1.4 + o.i));
    o.m.rotateX(Math.sin(t * 1.7 + o.i) * 0.15);
    if (state.mode === 'play' && !state.dialog && arcDist(player.d, o.d) < 1.25 && Math.abs(player.feet + 0.7 - o.h) < 1.8) collectPage(o);
  }
}
async function collectPage(o) {
  o.got = true; state.pages.add(o.i);
  sfx.chime();
  const n = state.pages.size;
  showEmote(null, '♥'); player.ch.st.happy = 1.6;
  await openDialog(`FOLHA DE DOMINGO ${n}/7`, '#c25959', [o.p.note,
    n >= 7 ? 'Sete domingos guardados. Esses ninguém remaneja.' : `Alguém arrancou essa folha do calendário. Ainda faltam ${7 - n} pelo planeta.`], { voice: 300 });
  refreshTasks();
}

// ================= bairros =================
const _dc = {};
function updateDistrict() {
  let best = null, bd = 1e9;
  for (const z of DISTRICTS) { const d = arcDist(player.d, z.d); if (d < z.r && d < bd) { bd = d; best = z; } }
  if (best === state.district) return;
  state.district = best;
  if (!best) return;
  const now = performance.now();
  if (!state.visited.has(best.name)) { state.visited.add(best.name); toast(best.name, best.sub); refreshTasks(); }
  else if (!_dc[best.name] || now - _dc[best.name] > 60000) toast(best.name, best.sub);
  _dc[best.name] = now;
}
