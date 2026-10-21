// ================= câmera =================
const cam = { pos: V3(), look: V3(), up: new THREE.Vector3(0, 1, 0), pitch: 0.3, dist: 4.6, distT: 4.6, shot: null, far: true, lastDrag: 0, fov: 70, side: 1, tmode: 'side' };
const _c = { h: V3(), p: V3(), l: V3(), u: V3(), w: V3(), t: V3(), s: V3(), a: V3(), b: V3(), sd: V3(), f: V3() };
function fovFor() { const a = view.w / view.h; return clamp(2 * Math.atan(Math.tan(47 * D2R) / a) / D2R, 60, 84); }
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
  P.copy(head).addScaledVector(back, -D * cp).addScaledVector(up, D * sp + 0.15);
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
function pickSide(a) {
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
// a câmera gira em arco de trás da Lia até a frente dela (sem atravessar a cabeça)
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
function snapCamera() {
  followPose(cam.pos, cam.look, 0);
  cam.up.copy(player.d);
  camera.position.copy(cam.pos); camera.up.copy(cam.up); camera.lookAt(cam.look);
  sky.position.copy(camera.position);
  cam.far = false;
}
function updateCamera(dt) {
  if (state.mode === 'title') { cam.far = true; return; }
  const sh = cam.shot;
  const fT = sh && sh.kind !== 'orbit' ? fovFor() - 9 : fovFor();
  cam.fov = lerp(cam.fov, fT, 1 - Math.exp(-dt * 3));
  if (Math.abs(camera.fov - cam.fov) > 0.05) { camera.fov = cam.fov; camera.updateProjectionMatrix(); }
  // a câmera vai se ajeitando atrás da Lia quando ela anda
  if (!sh && state.mode === 'play' && !state.dialog && player.aspeed > 1 && performance.now() - cam.lastDrag > 1500) {
    const up = player.d, cf = player.camFwd, f = player.fwd;
    const ang = Math.atan2(_c.a.crossVectors(cf, f).dot(up), cf.dot(f));
    if (Math.abs(ang) < 1.3) cf.applyAxisAngle(up, ang * (1 - Math.exp(-dt * 0.9 * player.aspeed / WALK)));
  }
  const P = _c.p, L = _c.l, Up = _c.u.copy(player.d);
  let rp = 9, rl = 12, ru = 6;
  if (!sh) followPose(P, L, dt);
  else if (sh.kind === 'talk') { talkPose(sh.a, P, L); rp = 4.2; rl = 5; }
  else if (sh.kind === 'intro') { introPose(sh, P, L, dt); rp = 14; rl = 6; }
  else if (sh.kind === 'look') { lookPose(sh.p, P, L); rp = 4; rl = 5; }
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

// ================= céu, sol e hora do dia =================
const PAL = [
  { a: '#6cc7be', b: '#a6e6da', h: '#c8f0e4', fog: '#87d4ca', sun: '#fff0da', amb: 1.12, si: 2.0 },
  { a: '#5fbfb9', b: '#9be5d6', h: '#b9eee2', fog: '#79cfc6', sun: '#fffaf0', amb: 1.2, si: 2.15 },
  { a: '#df9b7c', b: '#f4cf9f', h: '#f6c59b', fog: '#e2ae8e', sun: '#ffc08a', amb: 1.02, si: 1.85 },
].map((o) => ({ a: col(o.a), b: col(o.b), h: col(o.h), fog: col(o.fog), sun: col(o.sun), amb: o.amb, si: o.si }));
function dayP() {
  if (state.sunday) return state.sunP ?? 0.6;
  if (state.autoSun && state.sunP !== null) return state.sunP;
  return clamp(state.walked / LAP, 0, 1);
}
let skyP = null;
function updateSky(dt) {
  if (state.mode === 'title') return;
  if (state.autoSun) state.sunP = Math.min(0.95, (state.sunP ?? clamp(state.walked / LAP, 0, 1)) + dt * 0.045);
  // a cor do céu persegue a hora do dia (sem pulos quando o dia vira)
  const pT = dayP();
  skyP = skyP === null || Math.abs(pT - skyP) < 0.002 ? pT : skyP + (pT - skyP) * (1 - Math.exp(-dt * 1.1));
  const p = skyP;
  const i0 = p < 0.5 ? 0 : 1, k = p < 0.5 ? smooth(p * 2) : sstep(0.55, 1.0, p);
  const A = PAL[i0], B = PAL[i0 + 1], u = skyMat.uniforms;
  u.cA.value.copy(A.a).lerp(B.a, k); u.cB.value.copy(A.b).lerp(B.b, k); u.cH.value.copy(A.h).lerp(B.h, k);
  scene.fog.color.copy(A.fog).lerp(B.fog, k);
  sun.color.copy(A.sun).lerp(B.sun, k); sun.intensity = lerp(A.si, B.si, k); ambient.intensity = lerp(A.amb, B.amb, k);
  // longe do chão o céu vira o fundo chapado da abertura, com halo em volta do planeta
  const far = sstep(R + 12, R + 40, camera.position.length());
  u.mode.value = far;
  u.pDir.value.copy(camera.position).negate().normalize();
  u.pRad.value = Math.asin(clamp((R + 1.6) / Math.max(camera.position.length(), R + 2), 0, 1));
  post.uniforms.warm.value = sstep(0.62, 1, p) * 0.75 * (1 - 0.6 * far);
  const gloom = state.day === 7 && !state.strike && !state.sunday;
  post.uniforms.sat.value = lerp(post.uniforms.sat.value, state.sunday ? 1.0 : gloom ? 0.74 : 0.92, 1 - Math.exp(-dt * 2));
  // o sol anda pelo céu conforme o dia anda (ou seja: conforme você anda)
  const a = lerp(-1.05, 1.2, p), up = player.d;
  const sd = _c.sd.copy(up).multiplyScalar(Math.cos(a)).addScaledVector(SKYF.x, Math.sin(a)).addScaledVector(SKYF.z, 0.35).normalize();
  const focus = cam.far ? _c.h.copy(cam.look).setLength(R + 1) : player.pos;
  if (cam.far && cam.look.lengthSq() < 1) focus.copy(player.d).multiplyScalar(R);
  sun.target.position.copy(focus); sun.position.copy(focus).addScaledVector(sd, 40);
  u.skyInv.value.set(SKYF.x.x, SKYF.x.y, SKYF.x.z, up.x, up.y, up.z, SKYF.z.x, SKYF.z.y, SKYF.z.z);
  SKYF.shift.x += dt * 0.006;
  u.shift.value.copy(SKYF.shift);
  if (cam.far) { scene.fog.near = 400; scene.fog.far = 900; post.uniforms.fade.value.set(300, 700); }
  else { scene.fog.near = 40; scene.fog.far = 130; post.uniforms.fade.value.set(45, 150); }
}

// ================= conversas, leituras e o roteiro =================
async function startTalk(a) {
  if (state.dialog || state.mode !== 'play' || a.talking) return;
  const n = a.n;
  a.talking = true; target = null;
  togglePanel(null);
  cam.side = pickSide(a); cam.shot = { kind: 'talk', a };
  if (a.pet === 'cat') { a.ch.st.sleep = false; a.ch.st.pose = 'sit'; sfx.meow(); }
  if (a.pet === 'dog') { sfx.bark(); a.ch.st.wag = 3; }
  const quest = n.id === 'nara' && state.day === 7 && !state.strike && !state.sunday;
  const choice = await openDialog(n.name, n.tag, npcLines(n), { voice: n.voice, speaker: a.ch, choices: quest ? ['Parar com todo mundo', 'Melhor continuar andando'] : null });
  state.talked.add(n.id);
  a.ch.st.happy = 0.9;
  if (a.pet === 'cat') { a.ch.st.sleep = true; a.ch.st.pose = 'sleep'; }
  if (a.pet === 'dog' && !state.strike) { state.follow = 80; hintOnce('dog', 'O Caramelo resolveu te acompanhar um pouco.', 4000); }
  refreshTasks();
  if (quest) {
    if (choice === 0) { a.talking = false; startStrike(a); return; }
    state.declined = true;
    await openDialog(n.name, n.tag, n.lines.declined, { voice: n.voice, speaker: a.ch });
  }
  a.talking = false; cam.shot = null;
  if (state.talked.size === 1) hintOnce('walk', 'Cada passo é trabalho: a barra do dia só enche quando você anda.', 5500);
}
async function startRead(it) {
  if (state.dialog || state.mode !== 'play') return;
  state.read.add(it); target = null;
  togglePanel(null);
  cam.shot = { kind: 'look', p: it.pos };
  let lines = it.lines;
  if (it.news) { const h = headline(); lines = [`JORNAL DE ${state.sunday ? 'DOMINGO' : DAYS[state.day - 1]}: ${h[0]}`, h[1]]; }
  await openDialog(it.name, '#7d8a88', lines, { voice: 170 });
  cam.shot = null;
}
async function endDay() {
  state.mode = 'cutscene'; target = null;
  togglePanel(null);
  const lastDay = state.day === 7;
  if (lastDay) showCard({ k: `SEMANA ${state.week} CONCLUÍDA`, t: 'MAIS UMA SEMANA', s: 'O planeta agradece a sua dedicação.' });
  else showCard({ k: 'FIM DO EXPEDIENTE', t: `${DAYS[state.day - 1]} ACABOU`, s: state.day === 6 ? 'Amanhã é domingo. Dizem.' : 'Amanhã tem mais.' });
  await wait(2300);
  if (lastDay) { state.week++; state.day = 1; } else state.day++;
  state.walked = 0; state.talked.clear(); state.declined = false;
  fadeCard.innerHTML = `<div class="k">DIA ${state.day} DE 7 · SEMANA ${state.week}</div><div class="t">${DAYS[state.day - 1]}</div><div class="s">${state.day === 7 ? '07:00. Hoje é folga, né?' : '07:00. Meta: 1 volta.'}</div>`;
  await wait(1700);
  hideCard();
  state.mode = 'play';
  refreshTasks();
  if (state.day === 7) {
    await wait(800);
    state.mode = 'cutscene';
    sfx.bell();
    const v = actor('valdir');
    await openDialog('SEU VALDIR · ALTO-FALANTE', v.n.tag, VALDIR_SPEECH, { voice: v.n.voice, speaker: v.ch });
    state.mode = 'play';
    setHint('A Nara quer falar com você na padaria Pão de Cada Dia.', 6500);
    ACTORS.forEach((a, i) => { if (!a.pet && a.id !== 'valdir' && a.dist < 30) { a.reactT = 0.3 + i * 0.12; a.reactTxt = i % 2 ? '…' : '#@!'; } });
  }
}
function marcosOut(a) {
  if (a.out) return;
  a.out = true;
  const c = SPOTS.wheel;
  a.d.copy(ctxDir(c, 2.4, 2.7)); a.h = groundAt(a.d); a.up = null;
  a.fwd.copy(c.fwd).addScaledVector(a.d, -c.fwd.dot(a.d)).normalize(); a.baseFwd = a.fwd.clone();
  a.ch.st.speed = 0;
  placeActor(a);
}
async function startStrike() {
  state.strike = true; state.mode = 'cutscene'; target = null;
  togglePanel(null);
  const st = player.ch.st; st.pose = 'ground'; st.act = 'protest'; st.sign = true; player.actT = 0;
  player.vel.set(0, 0, 0);
  sfx.thud();
  ACTORS.forEach((a, i) => {
    const s = a.ch.st;
    if (a.pet) { if (a.id === 'caramelo') s.wag = 6; return; }
    if (a.id === 'valdir' || a.id === 'otavio') return;
    if (a.n.wheel) marcosOut(a);
    setTimeout(() => {
      s.pose = a.n.seat !== undefined ? 'sit' : 'ground';
      s.act = 'protest'; s.sign = true; s.propOn = false; a.actT = 0;
      showEmote(a, ['!', '…', '♥', 'zz'][i % 4]);
    }, 250 + i * 150);
  });
  setTimeout(() => showEmote(actor('valdir'), '#@!'), 1200);
  setTimeout(() => showEmote(actor('otavio'), '?'), 1900);
  $('stopped').textContent = 'TODO MUNDO PAROU.';
  cam.distT = 6.8;
  await wait(4500);
  // a câmera sobe: o planeta continua girando, sozinho
  cam.shot = { kind: 'orbit', t: 0, th0: Math.atan2(player.d.z, player.d.x), ph0: clamp(Math.asin(player.d.y), -0.75, 0.95) };
  state.autoSun = true; state.sunP = clamp(state.walked / LAP, 0, 1);
  await wait(3400);
  await openDialog('…', '#7d8a88', STRIKE_LINES, { voice: 160 });
  await wait(900);
  // domingo de verdade: o céu volta devagar para uma tarde clara
  state.sunday = true; state.strike = false; state.autoSun = false; state.sunP = 0.6;
  state.talked.clear();
  sundayPoses();
  refreshTasks();
  showCard({ k: 'FIM', t: 'DOMINGO DE VERDADE', s: 'Ninguém precisou girar o planeta hoje. Ele girou sozinho.', see: true, buttons: [
    ['Continuar passeando', () => { hideCard(); cam.shot = null; cam.distT = 4.6; state.mode = 'play'; setHint('Domingo de verdade. Converse com todo mundo de novo.', 6000); refreshTasks(); }],
    ['Jogar de novo', () => location.reload(), true]] });
}
// domingo: cada um descansa do seu jeito
function sundayPoses() {
  const st = player.ch.st; st.pose = 'stand'; st.act = null; st.sign = false;
  for (const a of ACTORS) {
    const s = a.ch.st; s.sign = false; a.actT = 0;
    if (a.pet) { if (a.id === 'mingau') { s.pose = 'sleep'; s.sleep = true; } continue; }
    if (a.id === 'valdir') { s.act = 'shrug'; s.propOn = false; continue; }
    if (a.id === 'otavio') { s.act = null; continue; }
    if (a.n.seat !== undefined) { s.pose = 'sit'; s.act = null; continue; }
    if (a.id === 'tonho') { s.pose = 'stand'; s.act = 'fish'; continue; }
    if (a.id === 'neide') { s.pose = 'ground'; s.act = 'news'; s.propOn = true; continue; }
    if (a.id === 'bia') { s.pose = 'stand'; s.act = 'protest'; continue; }
    if (a.n.wheel) marcosOut(a);
    s.pose = 'ground'; s.act = null; s.propOn = false; s.tired = 0; s.happy = 2;
  }
}
let playT = 0, distTick = 0;
function updateGame(dt) {
  if (state.mode !== 'play') { target = null; return; }
  playT += dt;
  findTarget();
  if (target && target.kind === 'npc') hintOnce('talk', IS_TOUCH ? 'Toque no balão (ou no aviso embaixo) para conversar.' : 'Aperte E para conversar.', 4500);
  if (!state.sunday && !state.strike && state.walked >= LAP && !state.dialog) endDay();
  distTick -= dt; if (distTick < 0) { distTick = 0.3; updateDistrict(); }
  if (state.idleT > 20 && !state.sunday) hintOnce('idle', 'Parada, o dia não passa. Nem o sol.', 5000);
  if (playT > 45) hintOnce('explore', 'Dá pra ir pra qualquer lugar: praia, parque, morro, fábrica. E tem 7 folhas de domingo escondidas pelo planeta.', 7500);
}

// ================= retrato de quem fala =================
// desenhado no próprio quadro do jogo (ganha o mesmo traço de tinta), atrás da janela vazada da caixa de fala
const PORT = { ch: null, rect: null, cam: new THREE.PerspectiveCamera(10.5, 1, 0.15, 900), bg: new THREE.Color('#e3f3ef') };
PORT.cam.layers.set(1); ambient.layers.enable(1); sun.layers.enable(1);
const _pW = new THREE.Color('#ffffff'), _pc = new THREE.Color();
const _pv = { h: V3(), u: V3(), f: V3(), r: V3(), a: V3(), d: V3(), sp: V3(), st: V3() };
function setPortrait(ch, color) {
  if (PORT.ch && PORT.ch !== ch) PORT.ch.rig.traverse((o) => o.layers.disable(1));
  PORT.ch = ch || null; PORT.rect = null;
  if (ch) { ch.rig.traverse((o) => o.layers.enable(1)); PORT.bg.set(color || '#66bde6').lerp(_pW, 0.74); }
  dlg.el.classList.toggle('port', !!ch);
  document.body.classList.toggle('portrait', !!ch);
}
function renderPortrait() {
  const ch = PORT.ch, r = PORT.rect;
  const pr = renderer.getPixelRatio(), W = rtColor.width, H = rtColor.height;
  const x = Math.round(r.x * pr), w = Math.round(r.w * pr), h = Math.round(r.h * pr), y = H - Math.round(r.y * pr) - h;
  if (w < 8 || h < 8 || x < 0 || y < 0 || x + w > W || y + h > H) return;
  // câmera de retrato: de frente, um tico de lado e de cima, lente bem fechada
  const M = ch.rig.matrixWorld;
  const up = _pv.u.setFromMatrixColumn(M, 1).normalize(), f = _pv.f.setFromMatrixColumn(M, 2).normalize(), rt = _pv.r.setFromMatrixColumn(M, 0).normalize();
  const aim = ch.bones[ch.pet ? 1 : BI.head].getWorldPosition(_pv.a).addScaledVector(up, ch.pet ? 0.05 : 0.11);
  if (ch.pet) aim.addScaledVector(f, 0.06);
  const dir = _pv.d.copy(f).multiplyScalar(Math.cos(0.36)).addScaledVector(rt, Math.sin(0.36)).addScaledVector(up, 0.2).normalize();
  const C = PORT.cam;
  C.position.copy(aim).addScaledVector(dir, 3.6); C.up.copy(up); C.lookAt(aim);
  C.fov = ch.pet ? 8.4 : 9.2; C.aspect = w / h; C.near = camera.near; C.far = camera.far; C.updateProjectionMatrix();
  // luz de estúdio vinda de cima, sem a sombra do mundo
  _pv.sp.copy(sun.position); _pv.st.copy(sun.target.position);
  sun.position.copy(aim).addScaledVector(dir, 24).addScaledVector(up, 26).addScaledVector(rt, -12);
  sun.target.position.copy(aim);
  ch.rig.traverse((o) => { if (o.isMesh) { o.userData.rs = o.receiveShadow; o.receiveShadow = false; } });
  const auto = renderer.shadowMap.autoUpdate; renderer.shadowMap.autoUpdate = false;
  renderer.getClearColor(_pc); const ca = renderer.getClearAlpha();
  renderer.setClearColor(PORT.bg, 1);
  rtColor.viewport.set(x, y, w, h); rtColor.scissor.set(x, y, w, h); rtColor.scissorTest = true;
  renderer.setRenderTarget(rtColor);
  renderer.render(scene, C);
  rtColor.viewport.set(0, 0, W, H); rtColor.scissor.set(0, 0, W, H); rtColor.scissorTest = false;
  renderer.setClearColor(_pc, ca); renderer.shadowMap.autoUpdate = auto;
  sun.position.copy(_pv.sp); sun.target.position.copy(_pv.st);
  ch.rig.traverse((o) => { if (o.isMesh) o.receiveShadow = o.userData.rs; });
}

// ================= render e laço principal =================
function render() {
  renderer.setRenderTarget(rtColor); renderer.render(scene, camera);
  if (PORT.ch && PORT.rect && state.dialog) renderPortrait();
  renderer.setRenderTarget(null); renderer.render(postScene, postCam);
}
const clock = new THREE.Clock(false);
let hudT = 0;
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 1 / 20), t = clock.elapsedTime;
  if (state.freeze) return;
  state.frame++;
  U.time.value = t; post.uniforms.time.value = t; waterMat.uniforms.time.value = t; skyMat.uniforms.time.value = t;
  if (DYN.pools) for (const m of DYN.pools) m.material.uniforms.time.value = t;
  if (state.mode === 'title') updateTitle(dt);
  stepPlayer(dt);
  updateGame(dt);
  updateActors(dt, t);
  updatePages(dt, t);
  updateDynamics(dt, t);
  updateDialog(dt);
  updateCamera(dt);
  updateSky(dt);
  updateChunks(camera.position, cam.far);
  updateOverlays(dt);
  hudT += dt; if (hudT > 0.1) { hudT = 0; updateHud(); if ($('menu').classList.contains('on')) refreshTasks(); }
  // muda a resolução antes de desenhar, para o quadro nunca sair em branco
  adaptResolution(dt);
  render();
}
function teleport(d, heading = 0) {
  player.d.copy(d).normalize();
  player.fwd.copy(headingVec(player.d, heading)); player.camFwd.copy(player.fwd); player.vel.set(0, 0, 0);
  player.feet = groundAt(player.d);
  eastOf(player.d, SKYF.x); SKYF.z.crossVectors(SKYF.x, player.d).normalize();
  placePlayer(); snapCamera();
}
function quickStart() {
  TITLE.grp.visible = false; $('title').style.display = 'none';
  $('loader').classList.add('hidden');
  skyMat.uniforms.mode.value = 0;
  camera.fov = cam.fov; camera.updateProjectionMatrix();
  state.mode = 'play'; document.body.classList.add('playing'); $('hud').classList.add('on');
  if (QS.get('at')) { const [la, lo, hd] = QS.get('at').split(',').map(Number); teleport(dirOf(la, lo), hd || 0); }
  if (QS.get('pitch')) cam.pitch = +QS.get('pitch');
  if (QS.get('dist')) cam.distT = cam.dist = +QS.get('dist');
  if (QS.get('day')) { state.day = +QS.get('day'); refreshTasks(); }
  snapCamera();
}
async function boot() {
  if (IS_TOUCH) document.body.classList.add('touch');
  try { await Promise.race([Promise.all(['40px Bungee', '20px "Patrick Hand SC"', '20px Silkscreen', 'bold 20px Silkscreen'].map((f) => document.fonts.load(f))), wait(3000)]); } catch (e) {}
  await nextFrame();
  makeMaterials();
  defineWorld(); addLandmarks(); storyProps(); fillLots();
  await nextFrame();
  buildTerrain();
  await nextFrame();
  buildRoads();
  for (let i = 0; i < BUILDS.length; i++) BUILDS[i]();
  await nextFrame();
  streetFurniture(); scatter(); buildWires();
  await nextFrame();
  buildChunks(); buildGrass();
  hashColliders();
  spawnActors(); initPlayer(); initPages(); initDynamics(); buildTitle();
  ATL.tex.needsUpdate = true; FACE.tex.needsUpdate = true;
  setMusic(state.musicOn);
  refreshTasks(); updateHud();
  if (QS.has('skip')) quickStart();
  else { state.mode = 'title'; updateTitle(0); }
  renderer.compile(scene, camera); renderer.compile(postScene, postCam);
  await nextFrame();
  clock.start();
  requestAnimationFrame(frame);
  if (!QS.has('skip')) startTitle();
  window.__ready = true;
}
window.__gira = {
  state, player, ACTORS, cam, SPOTS, DISTRICTS, PAGES, PAGEOBJ, COLLIDERS, ATL, FACE, renderer, TITLE, insideTall, pushOut, groundAt, latOf, lonOf,
  go(la, lo, hd) { teleport(dirOf(la, lo), hd || 0); },
  near(id, back = 2.4) { const a = actor(id); const d = offsetDir(a.d, a.fwd, back); teleport(d, 0); player.fwd.copy(a.d).sub(player.d).normalize(); player.camFwd.copy(player.fwd); snapCamera(); },
  day(n) { state.day = n; refreshTasks(); },
  walk(x) { state.walked = x; },
  strike() { startStrike(); },
  talk(id) { startTalk(actor(id)); },
};
boot();
