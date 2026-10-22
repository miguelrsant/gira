// ---------------- bichos: gato e cachorro ----------------
import * as THREE from 'three';
import { C, clamp, lerp, rand, rr } from '../core/math.js';
import { cylG, Geo, GEO, sphG, TM, torG } from '../world/geo.js';
import { charMat, setFace } from './bodies.js';
import { faceSheet, hexMix, slotUV } from './faces.js';
import { HEADK, headGeos, taperG } from './parts.js';

export function makePet(kind) {
  const cat = kind === 'cat';
  const g = new Geo(true);
  const fur = cat ? '#e9e2d4' : '#d7a15a', fur2 = cat ? '#c9a67a' : '#f0d2a0';
  const add = (geo, M, color, id, bone, o) => g.add(geo, M, null, Object.assign({ c: C(color), id, bone }, o || {}));
  const s = cat ? 0.82 : 1.0;
  const bodyY = 0.3 * s, legH = 0.24 * s, len = cat ? 0.26 : 0.3;
  const bones = [];
  const mk = (parent, x, y, z) => { const b = new THREE.Bone(); b.position.set(x, y, z); if (parent) parent.add(b); bones.push(b); return b; };
  const root = mk(null, 0, bodyY, 0);
  const headB = mk(root, 0, 0.1 * s, len * 0.95);
  const tailB = mk(root, 0, 0.04 * s, -len * 0.95);
  const legs = [];
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) legs.push(mk(root, x * 0.07 * s, -0.04 * s, z * len * 0.62));
  // corpo
  add(sphG(14, 10), TM(0, bodyY, 0, 0.13 * s, 0.12 * s, len * 1.05), fur, 3, 0);
  add(sphG(12, 8), TM(0, bodyY - 0.02 * s, len * 0.35, 0.11 * s, 0.1 * s, 0.14 * s), fur2, 4, 0);
  if (cat) for (let i = 0; i < 3; i++) add(sphG(10, 6), TM(0, bodyY + 0.105 * s, -len * 0.4 + i * len * 0.3, 0.06 * s, 0.03 * s, 0.07 * s), '#d29a62', 4, 0);
  // cabeça
  const hr = cat ? 0.13 : 0.14, hy = bodyY + 0.1 * s + 0.06, hz = len * 0.95 + 0.06;
  const HG = headGeos(cat ? 'cat' : 'dog');
  add(HG.head, TM(0, hy, hz, hr, hr, hr), fur, 1, 1);
  const f = cat ? { fur, iris: '#9ccf6a', cat: true } : { fur, mask2: null };
  const slot = faceSheet(f, true);
  add(HG.cap, TM(0, hy, hz, hr, hr, hr), '#ffffff', 1, 1, { uv: slotUV(slot), face: true });
  if (cat) {
    for (const sx of [1, -1]) { add(cylG(4, 0), TM(sx * hr * 0.6, hy + hr * 0.72, hz - hr * 0.1, hr * 0.32, hr * 0.55, hr * 0.22, sx * 0.2, 0, -sx * 0.35), fur, 2, 1); add(cylG(4, 0), TM(sx * hr * 0.6, hy + hr * 0.7, hz - hr * 0.04, hr * 0.18, hr * 0.38, hr * 0.06, sx * 0.2, 0, -sx * 0.35), '#e8a0a8', 6, 1); }
  } else {
    add(sphG(12, 8), TM(0, hy - hr * 0.3, hz + hr * 0.75, hr * 0.5, hr * 0.42, hr * 0.62), fur2, 2, 1);
    add(sphG(8, 6), TM(0, hy - hr * 0.12, hz + hr * 1.32, hr * 0.17, hr * 0.13, hr * 0.12), '#2a2524', 6, 1);
    for (const sx of [1, -1]) add(sphG(10, 6), TM(sx * hr * 0.85, hy + hr * 0.35, hz - hr * 0.1, hr * 0.22, hr * 0.5, hr * 0.32, 0, 0.2, sx * 0.5), hexMix(fur, '#5a3a20', 0.25), 2, 1);
    add(torG(1, 0.18, 5, 14), TM(0, hy - hr * 0.72, hz - hr * 0.35, hr * 0.62, hr * 0.62, hr * 0.62, 0, Math.PI / 2 - 0.3), '#c25959', 6, 1);
  }
  // rabo
  const tl = cat ? 0.36 : 0.22;
  { const tg = taperG(0.03 * s, 0.02 * s, tl); add(tg, TM(0, bodyY + 0.04 * s, -len * 0.95, 1, 1, 1, 0, -0.5), cat ? '#d29a62' : fur, 2, 2); tg.dispose(); }
  // patas
  legs.forEach((lb, i) => {
    const x = (i % 2 ? -1 : 1) * 0.07 * s, z = (i < 2 ? 1 : -1) * len * 0.62;
    const lgG = taperG(0.035 * s, 0.03 * s, legH - 0.02); add(lgG, TM(x, 0.03, z), i < 2 ? fur : fur, 4, 3 + i); lgG.dispose();
    add(sphG(8, 6), TM(x, 0.025, z + 0.015, 0.036 * s, 0.026, 0.045 * s), cat ? '#f4f4ef' : fur2, 5, 3 + i);
  });
  const geo = g.build();
  const mat = charMat();
  const mesh = new THREE.SkinnedMesh(geo, mat);
  mesh.add(root); mesh.bind(new THREE.Skeleton(bones));
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.3, 0), 0.9);
  const rig = new THREE.Group(); rig.add(mesh);
  // hr/ht/hd: raio e forma do alto da cabeça (onde a mão da Duda faz carinho)
  const HK = HEADK[cat ? 'cat' : 'dog'];
  return { pet: true, cat, rig, mesh, bones, mat, slot, height: hy + hr * 1.6, P: { bodyY, s, len, hy, hr, ht: HK.tall, hd: HK.deep }, st: { t: rand() * 10, speed: 0, phase: 0, w: 0, pose: cat ? 'sleep' : 'stand', look: { yaw: 0, pitch: 0 }, lookT: { yaw: 0, pitch: 0 }, blink: 2, blinkOn: 0, happy: 0, sleep: cat, frame: -1, wag: 0, talk: false, mouth: 0, petted: 0, petW: 0 }, d: new THREE.Vector3(0, 1, 0), fwd: new THREE.Vector3(0, 0, 1), h: 0 };
}
export function posePet(ch, dt) {
  const st = ch.st, B = ch.bones, P = ch.P;
  st.t += dt; const t = st.t;
  for (const b of B) b.rotation.set(0, 0, 0);
  B[0].position.set(0, P.bodyY, 0);
  const k = 1 - Math.exp(-dt * 8);
  st.w = lerp(st.w, clamp(st.speed / 3, 0, 1), k);
  st.phase += st.speed * dt * Math.PI / 0.28;
  const s1 = Math.sin(st.phase), w = st.w;
  if (st.pose === 'sleep') {
    B[0].position.y = P.bodyY * 0.55 + Math.sin(t * 1.4) * 0.006;
    for (let i = 0; i < 4; i++) B[3 + i].rotation.x = i < 2 ? -1.45 : 1.45;
    B[1].rotation.x = 0.35; B[1].rotation.y = 0.5; B[1].position.y = 0.04;
    B[2].rotation.y = 1.4; B[2].rotation.x = -1.2;
  } else if (st.pose === 'sit') {
    B[0].rotation.x = -0.55; B[0].position.y = P.bodyY * 0.85;
    B[3].rotation.x = B[4].rotation.x = 0.55; B[5].rotation.x = B[6].rotation.x = -0.9;
    B[1].rotation.x = 0.45;
    B[2].rotation.x = -0.2; B[2].rotation.y = Math.sin(t * (st.wag > 0 ? 18 : 2)) * (st.wag > 0 ? 0.7 : 0.15);
  } else {
    B[3].rotation.x = -s1 * 0.6 * w; B[6].rotation.x = -s1 * 0.6 * w;
    B[4].rotation.x = s1 * 0.6 * w; B[5].rotation.x = s1 * 0.6 * w;
    B[0].position.y += Math.abs(Math.cos(st.phase)) * 0.02 * w;
    B[1].rotation.x = Math.sin(st.phase * 2) * 0.05 * w;
    B[2].rotation.x = -0.35 + Math.sin(t * 2.2) * 0.08;
    B[2].rotation.y = Math.sin(t * (st.wag > 0 ? 18 : 3)) * (st.wag > 0 ? 0.6 : 0.2);
  }
  st.wag = Math.max(0, st.wag - dt);
  const L = st.look, LT = st.lookT, kl = 1 - Math.exp(-dt * 5);
  L.yaw = lerp(L.yaw, LT.yaw, kl); B[1].rotation.y += L.yaw;
  // ganhando carinho: empina a cabeça na mão e encosta um pouco de lado
  st.petW = lerp(st.petW, st.petted || 0, 1 - Math.exp(-dt * 4));
  if (st.petW > 0.01) { B[1].rotation.x -= 0.22 * st.petW; B[1].rotation.z += (0.12 + Math.sin(t * 1.7) * 0.06) * st.petW; }
  let fr = 0;
  st.blink -= dt; if (st.blink < 0) { st.blinkOn = 0.14; st.blink = rr(2, 5); }
  if (st.blinkOn > 0) { st.blinkOn -= dt; fr = 1; }
  if (st.talk) fr = (Math.floor(t * 6) % 2) ? 2 : 0;
  if (st.happy > 0) { st.happy -= dt; fr = 3; }
  if (st.sleep) fr = 1;
  setFace(ch, fr);
}

// ---------------- pombos da praça (instanciados) ----------------
export function pigeonGeo() {
  const g = new Geo(), W = null;
  const a = (geo, M, c, id = 7) => g.add(geo, M, W, { c: C(c), id });
  a(sphG(10, 8), TM(0, 0.11, 0, 0.085, 0.075, 0.13), '#98a2ad');
  a(sphG(10, 8), TM(0, 0.105, 0.06, 0.07, 0.065, 0.08), '#b4a5b6');
  a(sphG(8, 6), TM(0, 0.17, 0.08, 0.05, 0.05, 0.05), '#6fa38f');
  a(sphG(10, 8), TM(0, 0.215, 0.1, 0.045, 0.045, 0.05), '#8b95a1');
  a(cylG(6, 0), TM(0, 0.205, 0.155, 0.014, 0.04, 0.014, 0, Math.PI / 2), '#e9b44c', 6);
  a(GEO.box, TM(0, 0.1, -0.15, 0.07, 0.016, 0.11, 0, 0.25), '#6f7883', 5);
  for (const s of [1, -1]) {
    a(sphG(8, 6), TM(s * 0.07, 0.12, -0.02, 0.03, 0.06, 0.11), '#7c8691', 5);
    a(cylG(4), TM(s * 0.025, 0.0, 0.02, 0.008, 0.06, 0.008), '#d77a6a', 6);
  }
  return g.build();
}
