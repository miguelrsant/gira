// ================= coisas que se mexem no mundo =================
const DYNS = { hands: [], wheel: null, wheelA: 0, kite: null, pigeons: null, clockMin: -1 };
const _dy = { m: new THREE.Matrix4(), m2: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), p: V3(), s: V3(), v: V3() };
function meshOf(g, cast = true) {
  const m = new THREE.Mesh(g.build(), MAT.world);
  m.castShadow = cast; m.receiveShadow = true; m.matrixAutoUpdate = false;
  scene.add(m); return m;
}
function initDynamics() {
  // ponteiros do relógio da praça (4 faces)
  {
    const c = SPOTS.plaza, w = 2.4, h = 8.5;
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2;
      const base = c.W.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(Math.sin(a) * (w / 2 + 0.05), h - 1.2, Math.cos(a) * (w / 2 + 0.05)), new THREE.Quaternion().setFromAxisAngle(Y, a), new THREE.Vector3(1, 1, 1)));
      for (const [len, wid, z] of [[0.42, 0.075, 0.0], [0.62, 0.05, 0.02]]) {
        const g = new Geo();
        g.add(GEO.box, TM(0, len / 2 - 0.06, 0, wid, len + 0.12, 0.025), null, { c: C('#373f42'), id: 6 });
        if (len > 0.5) g.add(cylG(10), TM(0, 0, 0.0, 0.06, 0.04, 0.06, 0, Math.PI / 2), null, { c: C('#c25959'), id: 6 });
        const m = meshOf(g, false);
        DYNS.hands.push({ m, base, z, hour: len < 0.5 });
      }
    }
  }
  // roda de hamster (gira com os passos do Marcos)
  {
    const g = new Geo(), Rw = 3.3;
    for (const x of [-1.25, 1.25]) {
      g.add(torG(1, 0.04, 6, 44), TM(x, 0, 0, Rw, Rw, Rw, Math.PI / 2), null, { c: C('#f3c258'), id: 5 });
      for (let i = 0; i < 6; i++) { const th = i / 6 * Math.PI * 2; g.add(GEO.box, TM(x, Math.cos(th) * Rw / 2, Math.sin(th) * Rw / 2, 0.09, Rw, 0.09, 0, th), null, { c: C('#e9e6dc'), id: 6 }); }
    }
    const N = 28;
    for (let i = 0; i < N; i++) { const th = i / N * Math.PI * 2; g.add(GEO.box, TM(0, Math.cos(th) * (Rw - 0.08), Math.sin(th) * (Rw - 0.08), 2.62, 0.08, 0.2, 0, th), null, { c: C(i % 2 ? '#b48d63' : '#a07c58'), id: 3 }); }
    g.add(cylG(10), TM(0, 0, 0, 0.32, 2.7, 0.32, 0, 0, Math.PI / 2), null, { c: C('#c25959'), id: 5 });
    const m = meshOf(g, true);
    DYNS.wheel = { m, base: SPOTS.wheel.W.clone().multiply(new THREE.Matrix4().makeTranslation(0, 3.8, 0)) };
  }
  // barquinho no lago
  if (DYN.rowboat) DYN.rowboat.mesh.matrixAutoUpdate = false;
  // pipa da Bia (só aparece no domingo)
  {
    const g = new Geo(), W = null;
    const v = (x, y, z) => new THREE.Vector3(x, y, z);
    const k1 = C('#c25959'), k2 = C('#f3c258');
    g.quad(v(0, 0.75, 0), v(-0.5, 0.1, 0), v(0, -0.65, 0), v(0.5, 0.1, 0), k1, { id: 6 });
    g.quad(v(0, 0.75, 0), v(0.5, 0.1, 0), v(0, -0.65, 0), v(-0.5, 0.1, 0), k2, { id: 6 });
    g.add(GEO.box, TM(0, 0.05, 0.02, 0.03, 1.4, 0.03), W, { c: C('#8e6c4b'), id: 5 });
    g.add(GEO.box, TM(0, 0.1, 0.02, 1.0, 0.03, 0.03), W, { c: C('#8e6c4b'), id: 5 });
    for (let i = 0; i < 5; i++) g.add(GEO.box, TM(Math.sin(i * 1.3) * 0.12, -0.8 - i * 0.32, 0, 0.16, 0.1, 0.03, 0, 0, 0.5 * (i % 2 ? 1 : -1)), W, { c: i % 2 ? k1 : C('#66bde6'), id: 7 });
    const m = new THREE.Mesh(g.build(), MAT.world); m.visible = false; m.castShadow = true; scene.add(m);
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const line = new THREE.Line(lg, lineMat('#3b4447')); line.frustumCulled = false; line.visible = false; scene.add(line);
    DYNS.kite = { m, line, p: V3() };
  }
  // pombos da praça
  {
    const c = SPOTS.plaza, n = LOW ? 7 : 11;
    const im = new THREE.InstancedMesh(pigeonGeo(), MAT.world, n);
    im.castShadow = true; im.frustumCulled = false; scene.add(im);
    const inv = c.W.clone().invert();
    const P = [];
    for (let i = 0; i < n; i++) { const b = { x: 0, z: 0, ry: rand() * 6.28, h: 0, mode: 'ground', t: rand() * 3, fx: 0, fz: 0, tx: 0, tz: 0, peck: 0 }; pigeonSpot(b); b.x = b.tx; b.z = b.tz; P.push(b); }
    DYNS.pigeons = { im, c, inv, P, flapT: 0 };
  }
}
// lugar livre na praça para um pombo pousar
function pigeonSpot(b, awayX = 0, awayZ = 0) {
  const avoid = [[-3.2, 1.2, 1.4], [3.1, -1.6, 2.5], [-1.8, 3.6, 0.9], [1.9, 3.6, 0.9], [-4.2, -1.5, 0.9], [0.6, -4.3, 0.9], [-4.0, -3.4, 0.7], [4.2, 2.6, 0.7], [-0.9, -4.6, 0.7], [0, 4.6, 1.2], [-2.0, -2.6, 0.7], [4.9, 0.4, 0.6]];
  for (let k = 0; k < 30; k++) {
    const a = rand() * Math.PI * 2, r = rr(2.2, 4.9), x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (avoid.some(([ax, az, ar]) => Math.hypot(x - ax, z - az) < ar)) continue;
    if (awayX || awayZ) { if (Math.hypot(x - awayX, z - awayZ) < 3.5) continue; }
    b.tx = x; b.tz = z; return;
  }
  b.tx = 3.5; b.tz = 3.5;
}
function updateDynamics(dt, t) {
  // relógio: a hora do dia (anda quando você anda)
  {
    const p = dayP(), mins = 7 * 60 + p * 12 * 60;
    const key = Math.floor(mins);
    if (key !== DYNS.clockMin) {
      DYNS.clockMin = key;
      for (const hd of DYNS.hands) {
        const ang = hd.hour ? ((mins / 60) % 12) / 12 * Math.PI * 2 : (mins % 60) / 60 * Math.PI * 2;
        _dy.m.makeRotationZ(-ang); _dy.m.setPosition(0, 0, 0.03 + hd.z);
        hd.m.matrix.multiplyMatrices(hd.base, _dy.m); hd.m.matrixWorldNeedsUpdate = true;
      }
    }
  }
  // roda de hamster
  {
    const marcos = actor('marcos');
    const inside = marcos && !marcos.out;
    const w = inside ? marcos.ch.st.speed / 3.18 : (state.sunday || state.strike ? 0.32 : 0);
    DYNS.wheelA += w * dt;
    _dy.m.makeRotationX(DYNS.wheelA);
    DYNS.wheel.m.matrix.multiplyMatrices(DYNS.wheel.base, _dy.m); DYNS.wheel.m.matrixWorldNeedsUpdate = true;
  }
  // barquinho balançando
  if (DYN.rowboat) {
    const rb = DYN.rowboat;
    _dy.e.set(Math.sin(t * 1.1) * 0.035, 0, Math.sin(t * 0.9) * 0.05); _dy.q.setFromEuler(_dy.e);
    _dy.m.compose(_dy.p.set(0, Math.sin(t * 1.3) * 0.04, 0), _dy.q, _dy.s.set(1, 1, 1));
    rb.mesh.matrix.multiplyMatrices(rb.base, _dy.m); rb.mesh.matrixWorldNeedsUpdate = true;
  }
  // pipa (domingo)
  {
    const K2 = DYNS.kite, bia = actor('bia');
    const on = (state.sunday || state.strike) && bia && bia.vis;
    K2.m.visible = K2.line.visible = !!on;
    if (on) {
      const up = bia.d, f = bia.fwd, r = _dy.v.crossVectors(up, f).normalize();
      const hand = _dy.p.copy(bia.ch.rig.position).addScaledVector(up, 1.05).addScaledVector(r, -0.12).addScaledVector(f, 0.1);
      const kp = K2.p.copy(bia.ch.rig.position).addScaledVector(up, 7.5 + Math.sin(t * 0.7) * 0.6).addScaledVector(f, 3.2 + Math.sin(t * 0.5) * 0.8).addScaledVector(r, Math.sin(t * 0.37) * 1.6);
      K2.m.position.copy(kp);
      orient(K2.m, up, _dy.s.copy(f).negate());
      K2.m.rotateX(-0.45); K2.m.rotateZ(Math.sin(t * 1.3) * 0.25);
      const a = K2.line.geometry.attributes.position.array;
      a[0] = hand.x; a[1] = hand.y; a[2] = hand.z; a[3] = kp.x; a[4] = kp.y; a[5] = kp.z;
      K2.line.geometry.attributes.position.needsUpdate = true;
    }
  }
  updatePigeons(dt, t);
}
function updatePigeons(dt, t) {
  const PG = DYNS.pigeons; if (!PG) return;
  const lp = _dy.v.copy(player.pos).applyMatrix4(PG.inv);
  const near = arcDist(player.d, PG.c.d) < 14;
  const running = player.aspeed > WALK + 0.5;
  let scared = false;
  PG.P.forEach((b, i) => {
    b.t += dt;
    if (b.mode === 'ground') {
      const dp = Math.hypot(lp.x - b.x, lp.z - b.z);
      if (near && lp.y < 3 && (dp < 1.6 || (running && dp < 3.4))) {
        b.mode = 'fly'; b.t = 0; b.fx = b.x; b.fz = b.z; pigeonSpot(b, lp.x, lp.z); scared = true;
      } else {
        // bica o chão, dá pulinhos
        b.peck = Math.max(0, Math.sin(b.t * 5 + i) * 1.4 - 0.6);
        if (b.t > 2.2 + (i % 3)) { b.t = 0; const a = b.ry; b.x += Math.sin(a) * 0.22; b.z += Math.cos(a) * 0.22; b.ry += rr(-1.2, 1.2); if (Math.hypot(b.x, b.z) > 5 || Math.hypot(b.x, b.z) < 2) b.ry += Math.PI; }
        b.h = Math.max(0, b.h - dt * 2);
      }
    } else {
      // voa num arco até outro canto da praça
      const u = clamp(b.t / 2.6, 0, 1);
      b.x = lerp(b.fx, b.tx, smooth(u)); b.z = lerp(b.fz, b.tz, smooth(u));
      b.h = Math.sin(Math.PI * u) * 3.2;
      b.ry = Math.atan2(b.tx - b.fx, b.tz - b.fz);
      b.peck = -0.35 + Math.sin(b.t * 30) * 0.5;
      if (u >= 1) { b.mode = 'ground'; b.t = 0; b.h = 0; }
    }
    _dy.e.set(b.peck * 0.6, b.ry, 0, 'YXZ'); _dy.q.setFromEuler(_dy.e);
    _dy.m.compose(_dy.p.set(b.x, 0.06 + b.h, b.z), _dy.q, _dy.s.set(1, 1, 1));
    _dy.m2.multiplyMatrices(PG.c.W, _dy.m);
    PG.im.setMatrixAt(i, _dy.m2);
  });
  PG.im.instanceMatrix.needsUpdate = true;
  if (scared && t - PG.flapT > 1) { PG.flapT = t; sfx.flap(); }
}
