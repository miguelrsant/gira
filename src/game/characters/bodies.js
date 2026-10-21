// ================= personagens: corpo arredondado, rosto desenhado, cabelo =================
import * as THREE from 'three';
import { LOW, R } from '../core/config.js';
import { makeGrad, patchMat } from '../core/materials.js';
import { C, orient, pickR, rand, sstep } from '../core/math.js';
import { blobG, cylG, DOME, Geo, GEO, sphG, TM, torG } from '../world/geo.js';
import { decBox, decLogo, decNews, decPhone, decSign, STRIKE } from './decals.js';
import { FACE, faceSheet, FAW, FS, hexMix, slotUV } from './faces.js';
import { HAIR, headGeos, HEADK, latheG, shellGeo, taperG } from './parts.js';

const gradC = makeGrad([150, 255]);

// ---------------- corpos ----------------
const BODY = {
  f: { hr: 0.15, hip: 0.8, knee: 0.44, ank: 0.085, waist: 0.86, shY: 1.205, shX: 0.155, neck: 1.295, arm: 0.245, fore: 0.21, hipX: 0.08, tw: 0.95, td: 0.7, belly: 0, chest: 0.014, lg: 0.95, ag: 0.92, head: 'adult' },
  m: { hr: 0.15, hip: 0.81, knee: 0.45, ank: 0.085, waist: 0.87, shY: 1.23, shX: 0.172, neck: 1.315, arm: 0.255, fore: 0.215, hipX: 0.082, tw: 1.03, td: 0.7, belly: 0, chest: 0, lg: 1.0, ag: 1.0, head: 'adult' },
  big: { hr: 0.155, hip: 0.8, knee: 0.44, ank: 0.085, waist: 0.86, shY: 1.22, shX: 0.19, neck: 1.305, arm: 0.25, fore: 0.21, hipX: 0.095, tw: 1.22, td: 0.92, belly: 0.05, chest: 0, lg: 1.2, ag: 1.15, head: 'wide' },
  strong: { hr: 0.148, hip: 0.82, knee: 0.455, ank: 0.085, waist: 0.88, shY: 1.25, shX: 0.205, neck: 1.335, arm: 0.26, fore: 0.22, hipX: 0.085, tw: 1.24, td: 0.78, belly: 0, chest: 0.02, lg: 1.12, ag: 1.35, head: 'adult', shoulders: 0.035 },
  elder: { hr: 0.15, hip: 0.76, knee: 0.42, ank: 0.08, waist: 0.82, shY: 1.15, shX: 0.16, neck: 1.235, arm: 0.24, fore: 0.205, hipX: 0.08, tw: 1.04, td: 0.76, belly: 0.025, chest: 0, lg: 0.95, ag: 0.95, head: 'elder', stoop: 0.22 },
  kid: { hr: 0.142, hip: 0.5, knee: 0.28, ank: 0.07, waist: 0.545, shY: 0.8, shX: 0.118, neck: 0.865, arm: 0.17, fore: 0.15, hipX: 0.058, tw: 0.74, td: 0.74, belly: 0.008, chest: 0, lg: 0.75, ag: 0.72, head: 'kid' },
};
const SKINS = ['#f6d7c3', '#eec1a1', '#d9a27c', '#b97c57', '#8d5a3b', '#6b4430'];
const HAIRCOL = ['#2f3437', '#3d3330', '#5a4032', '#8a5a3a', '#c99a5b', '#d9d4cc', '#9b4a3a', '#29323d'];
// pele em relação ao tom (para nariz/sombra do rosto)
export const BI = { root: 0, torso: 1, head: 2, armL: 3, foreL: 4, armR: 5, foreR: 6, legL: 7, shinL: 8, footL: 9, legR: 10, shinR: 11, footR: 12, tail: 13, prop: 14, sign: 15 };

export function charMat() {
  const m = new THREE.MeshToonMaterial({ vertexColors: true, map: FACE.tex, gradientMap: gradC });
  patchMat(m, { pat: true });
  const ob = m.onBeforeCompile, face = { value: new THREE.Vector2() };
  m.onBeforeCompile = (sh) => {
    ob(sh);
    sh.uniforms.uFace = face;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform vec2 uFace;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv += aPat.y * uFace;\n#endif');
  };
  const key = m.customProgramCacheKey(); m.customProgramCacheKey = () => key + '|chr';
  m.userData.face = face;
  return m;
}

// monta uma pessoa. spec: { body, skin, hair:{style,color}, hat:{kind,color}, top:{kind,color,c2}, bottom:{kind,color}, shoes:{kind,color,sole}, socks, acc:[], prop, face:{...}, sign }
export function makeChar(spec) {
  const P = Object.assign({}, BODY[spec.body || 'f'], spec.dims || {});
  const g = new Geo(true);
  const skin = spec.skin || SKINS[1];
  const add = (geo, M, color, id, bone, o) => g.add(geo, M, null, Object.assign({ c: C(color), id, bone }, o || {}));
  const hr = P.hr, hc = P.neck + hr * 0.8;           // centro da cabeça
  const top = spec.top || { kind: 'tee', color: '#f4f4ef' }, bot = spec.bottom || { kind: 'pants', color: '#4f6f8f' };
  const shoes = spec.shoes || { kind: 'sneaker', color: '#f3c258', sole: '#f4f4ef' };
  const acc = new Set(spec.acc || []);
  const tc = top.color, bc = bot.color;
  const dress = top.kind === 'dress';
  // ---- ossos ----
  const bones = [];
  const mk = (parent, x, y, z) => { const b = new THREE.Bone(); b.position.set(x, y, z); if (parent) parent.add(b); bones.push(b); return b; };
  const root = mk(null, 0, P.hip, 0);
  const torso = mk(root, 0, P.waist - P.hip, 0);
  const head = mk(torso, 0, P.neck - P.waist, 0);
  const armL = mk(torso, P.shX, P.shY - P.waist, 0), foreL = mk(armL, 0, -P.arm, 0);
  const armR = mk(torso, -P.shX, P.shY - P.waist, 0), foreR = mk(armR, 0, -P.arm, 0);
  const legL = mk(root, P.hipX, 0, 0), shinL = mk(legL, 0, P.knee - P.hip, 0), footL = mk(shinL, 0, P.ank - P.knee, 0);
  const legR = mk(root, -P.hipX, 0, 0), shinR = mk(legR, 0, P.knee - P.hip, 0), footR = mk(shinR, 0, P.ank - P.knee, 0);
  mk(head, 0, hr * 0.55, -hr * 0.95);                  // 13 rabo de cavalo
  mk(foreR, 0, -P.fore - 0.03 * P.ag, 0.0);              // 14 objeto na mão
  mk(foreR, 0, -P.fore - 0.03 * P.ag, 0.0);              // 15 cartaz da greve
  // ---- tronco ----
  const ky = (P.shY - P.waist) / 0.35, w = P.tw, b = P.belly, cst = P.chest, shd = P.shoulders || 0;
  const prof = [[0.0, -0.12], [0.137, -0.12], [0.14, -0.05], [0.134 + b * 0.8, 0.04], ...(bot.kind === 'overall' ? [[0.136 + b * 0.88, 0.064], [0.137 + b * 0.9, 0.076]] : []), [0.14 + b, 0.1], [0.148 + cst + b * 0.4, 0.18], [0.156 + cst * 0.6, 0.24], [0.16 + shd, 0.3], [0.15 + shd, 0.34], [0.112 + shd * 0.5, 0.375], [0.06, 0.395], [0.0, 0.4]];
  const torsoC = dress ? tc : (top.kind === 'apron' ? tc : tc);
  // macacão: a barriga e as costas até a cintura são do tecido do macacão (nada de camiseta aparecendo por baixo)
  const ovr = bot.kind === 'overall' ? { cf: (x, y) => (y < P.waist + 0.07 * ky ? C(bc) : C(torsoC)) } : null;
  { const tg = latheG(prof.map(([r, y]) => [r * w, y * ky])); add(tg, TM(0, P.waist, 0, 1, 1, P.td), torsoC, 3, BI.torso, ovr); tg.dispose(); }
  // pescoço
  { const ng = taperG(0.042 * hr / 0.15, 0.045 * hr / 0.15, P.neck - P.shY + 0.06); add(ng, TM(0, P.shY - 0.02, 0.0), skin, 1, BI.torso); ng.dispose(); }
  if (top.kind === 'polo' || top.kind === 'shirt' || top.kind === 'blazer') add(torG(1, 0.32, 6, 14), TM(0, P.shY + 0.02, 0.005, 0.058, 0.058, 0.05, 0, Math.PI / 2 + 0.25), top.collar || (top.kind === 'polo' ? tc : '#f4f4ef'), 6, BI.torso);
  if (top.kind === 'hoodie') add(torG(1, 0.45, 6, 14), TM(0, P.shY + 0.0, -0.035, 0.08, 0.08, 0.06, 0, Math.PI / 2 - 0.35), tc, 6, BI.torso);
  // ---- braços ----
  const armC = ['long', 'shirt', 'blazer', 'cardigan', 'hoodie', 'jacket'].includes(top.kind) ? (top.sleeve || tc) : skin;
  const sleeveShort = ['tee', 'polo', 'apron', 'dress'].includes(top.kind);
  const shoulderC = top.kind === 'tank' ? skin : (top.sleeve || tc);
  for (const s of [1, -1]) {
    const x = s * P.shX, bA = s > 0 ? BI.armL : BI.armR, bF = s > 0 ? BI.foreL : BI.foreR, ag = P.ag;
    add(sphG(12, 8), TM(x - s * 0.012, P.shY - 0.014, 0, 0.042 * ag, 0.046 * ag, 0.042 * ag), shoulderC, 3, bA);
    const ua = taperG(0.045 * ag, 0.038 * ag, P.arm); add(ua, TM(x, P.shY - P.arm, 0), armC, armC === skin ? 1 : 3, bA); ua.dispose();
    if (sleeveShort) { const sl = taperG(0.056 * ag, 0.05 * ag, P.arm * 0.42); add(sl, TM(x, P.shY - P.arm * 0.5, 0), top.sleeve || tc, 3, bA); sl.dispose(); }
    const fa = taperG(0.037 * ag, 0.029 * ag, P.fore); add(fa, TM(x, P.shY - P.arm - P.fore, 0), armC, armC === skin ? 1 : 3, bF); fa.dispose();
    if (armC !== skin) { const cf = taperG(0.036 * ag, 0.036 * ag, 0.025); add(cf, TM(x, P.shY - P.arm - P.fore - 0.004, 0), hexMix(armC, '#000000', 0.12), 6, bF); cf.dispose(); }
    const hy = P.shY - P.arm - P.fore - 0.036 * ag;
    add(sphG(10, 8), TM(x, hy, 0.004, 0.034 * ag, 0.047 * ag, 0.026 * ag), skin, 1, bF);
    add(sphG(8, 6), TM(x - s * 0.018 * ag, hy + 0.012, 0.022 * ag, 0.014 * ag, 0.022 * ag, 0.014 * ag, 0, -0.3), skin, 1, bF);
    if (acc.has('watch') && s > 0) add(torG(1, 0.25, 5, 12), TM(x, P.shY - P.arm - P.fore + 0.02, 0, 0.036 * ag, 0.036 * ag, 0.036 * ag, 0, Math.PI / 2), '#e5c27a', 6, bF);
  }
  // ---- quadril, pernas, pés ----
  const legC = bot.kind === 'pants' || bot.kind === 'overall' ? bc : skin;
  const lg = P.lg;
  if (!dress) add(sphG(14, 10), TM(0, P.hip + 0.005, 0, 0.128 * w, 0.105 * ky, 0.09 * P.td / 0.7), bc, 4, BI.root);
  for (const s of [1, -1]) {
    const x = s * P.hipX, bL = s > 0 ? BI.legL : BI.legR, bS = s > 0 ? BI.shinL : BI.shinR, bFt = s > 0 ? BI.footL : BI.footR;
    const th = taperG(0.066 * lg, 0.05 * lg, P.hip - P.knee); add(th, TM(x, P.knee, 0), legC, legC === skin ? 1 : 4, bL); th.dispose();
    if (bot.kind === 'shorts') { const sh = taperG(0.075 * lg, 0.066 * lg, (P.hip - P.knee) * 0.55); add(sh, TM(x, P.hip - (P.hip - P.knee) * 0.55, 0), bc, 4, bL); sh.dispose(); }
    const sn = taperG(0.049 * lg, 0.035 * lg, P.knee - P.ank); add(sn, TM(x, P.ank, 0), legC, legC === skin ? 1 : 4, bS); sn.dispose();
    if (spec.socks && legC === skin) { const sk = taperG(0.04 * lg, 0.038 * lg, 0.075); add(sk, TM(x, P.ank - 0.01, 0), spec.socks, 7, bS); sk.dispose(); }
    // calçado (o pé fica no tornozelo; a sola encosta em y = 0)
    const fl = Math.min(1, lg * 1.05), ay = P.ank;
    if (shoes.kind === 'sandal') {
      add(sphG(10, 6), TM(x, 0.035, 0.035, 0.04 * fl, 0.03, 0.09 * fl), skin, 1, bFt);
      add(GEO.box, TM(x, 0.011, 0.03, 0.1 * fl, 0.022, 0.22 * fl), shoes.color, 5, bFt);
      add(GEO.box, TM(x, 0.04, 0.075, 0.085 * fl, 0.014, 0.022), shoes.sole || '#f4f4ef', 6, bFt);
    } else if (shoes.kind === 'boot') {
      const bt = taperG(0.055 * fl, 0.052 * fl, Math.max(0.05, ay + 0.06)); add(bt, TM(x, 0.04, 0, 1, 1, 1.05), shoes.color, 5, bFt); bt.dispose();
      add(sphG(10, 6), TM(x, 0.045, 0.06, 0.055 * fl, 0.045, 0.08 * fl), shoes.color, 5, bFt);
      add(GEO.box, TM(x, 0.012, 0.03, 0.12 * fl, 0.024, 0.22 * fl), shoes.sole || '#4b3a2f', 6, bFt);
    } else if (shoes.kind === 'shoe') {
      add(sphG(10, 6), TM(x, 0.045, 0.035, 0.05 * fl, 0.04, 0.1 * fl), shoes.color, 5, bFt);
      add(GEO.box, TM(x, 0.009, 0.035, 0.1 * fl, 0.018, 0.2 * fl), shoes.sole || '#2f2a28', 6, bFt);
    } else {
      add(sphG(12, 8), TM(x, 0.05, 0.03, 0.058 * fl, 0.05, 0.105 * fl), shoes.color, 5, bFt);
      add(GEO.box, TM(x, 0.016, 0.03, 0.122 * fl, 0.032, 0.232 * fl), shoes.sole || '#f4f4ef', 6, bFt);
      add(sphG(10, 6), TM(x, 0.036, 0.125 * fl, 0.05 * fl, 0.032, 0.05 * fl), shoes.sole || '#f4f4ef', 6, bFt);
      const cl = taperG(0.045 * fl, 0.045 * fl, 0.04); add(cl, TM(x, ay - 0.02, -0.005), shoes.color, 5, bFt); cl.dispose();
    }
  }
  // saia / vestido
  if (bot.kind === 'skirt' || dress) {
    const hem = P.knee + (dress ? -0.02 : 0.06), H0 = P.waist + 0.04 - hem;
    const sk = latheG([[0.0, H0 + 0.01], [0.132 * w, H0], [0.145 * w, H0 * 0.7], [0.175 * w, H0 * 0.3], [0.205 * w, 0.02], [0.2 * w, 0.0], [0.0, 0.0]].reverse().map(([r, y]) => [r, y]));
    // a barra acompanha as pernas (perto do quadril fica presa ao corpo): a coxa nunca fura a saia
    const span = P.hip + 0.03 - hem;
    const skinF = (x, y) => {
      const k = sstep(0, 1, (P.hip + 0.03 - y) / span) * 0.82, sL = sstep(-0.075, 0.075, x);
      return [BI.root, 1 - k, BI.legL, k * sL, BI.legR, k * (1 - sL)];
    };
    add(sk, TM(0, hem, 0, 1, 1, 0.82), dress ? tc : bc, 4, BI.root, { skinF }); sk.dispose();
  }
  if (bot.kind === 'overall') {
    add(GEO.box, TM(0, P.waist + 0.12 * ky, 0.095 * P.td / 0.7, 0.2 * w, 0.2 * ky, 0.03), bc, 4, BI.torso);
    for (const s of [1, -1]) add(GEO.box, TM(s * 0.075 * w, P.waist + 0.27 * ky, 0.0, 0.03, 0.2 * ky, 0.23 * P.td / 0.7, 0, 0, 0), bc, 4, BI.torso);
  }
  // ---- extras do tronco ----
  const chestZ = 0.152 * P.td / 0.7 + b * 0.5;
  if (top.kind === 'apron') {
    add(GEO.box, TM(0, P.waist + 0.17 * ky, chestZ - 0.03, 0.14 * w, 0.15 * ky, 0.018), top.c2 || '#f4f4ef', 6, BI.torso);
    add(GEO.box, TM(0, P.hip - 0.06, 0.094 * P.td / 0.7, 0.21 * w, 0.28, 0.018, 0, -0.1), top.c2 || '#f4f4ef', 6, BI.root);
    add(torG(1, 0.05, 4, 16), TM(0, P.waist + 0.01, 0, 0.142 * w, 0.142 * w, 0.142 * w * P.td, 0, Math.PI / 2), top.c2 || '#f4f4ef', 6, BI.torso);
  }
  if (top.kind === 'blazer' || top.kind === 'shirt' || acc.has('tie')) {
    if (top.kind === 'blazer') add(GEO.box, TM(0, P.waist + 0.22 * ky, chestZ - 0.018, 0.075 * w, 0.18 * ky, 0.02, 0, 0, 0), '#f4f4ef', 6, BI.torso);
    add(GEO.box, TM(0, P.waist + 0.16 * ky, chestZ - 0.004, 0.035, 0.2 * ky, 0.018), spec.tie || '#c25959', 7, BI.torso);
    add(sphG(8, 6), TM(0, P.waist + 0.345 * ky, chestZ - 0.03, 0.024, 0.02, 0.016), spec.tie || '#c25959', 7, BI.torso);
  }
  if (top.kind === 'cardigan') for (let i = 0; i < 4; i++) add(sphG(6, 4), TM(0, P.waist + (0.04 + i * 0.08) * ky, chestZ - 0.012 + (i === 1 ? b * 0.6 : 0), 0.011, 0.011, 0.008), '#e9e6dc', 6, BI.torso);
  if (top.kind === 'polo' && top.logo !== false) { const uv = decLogo(); add(GEO.plane, TM(-0.07 * w, P.waist + 0.24 * ky, chestZ + 0.001, 0.07, 0.07, 1), '#ffffff', 6, BI.torso, { uv }); }
  if (top.kind === 'hoodie') add(GEO.box, TM(0, P.waist + 0.02, chestZ - 0.01, 0.17 * w, 0.08, 0.02), hexMix(tc, '#000000', 0.12), 6, BI.torso);
  if (acc.has('strap')) {
    const sm = new THREE.Matrix4().makeTranslation(0, P.waist + 0.19 * ky, 0).multiply(new THREE.Matrix4().makeRotationZ(-0.6))
      .multiply(new THREE.Matrix4().makeScale(0.2 * w, 0.2 * w, 0.122 * P.td / 0.7)).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
    add(torG(1, 0.06, 4, 24), sm, spec.strapC || '#5a6062', 6, BI.torso);
    add(sphG(10, 6), TM(0.15 * w, P.hip + 0.05, 0.03, 0.07, 0.075, 0.04), spec.bagC || '#6b7a7d', 7, BI.root);
  }
  if (acc.has('badge')) {
    for (const s of [1, -1]) add(GEO.box, TM(s * 0.035, P.waist + 0.27 * ky, chestZ - 0.02, 0.01, 0.15 * ky, 0.008, 0, -0.25 * s, s * 0.32), '#4f86b8', 6, BI.torso);
    add(GEO.box, TM(0, P.waist + 0.15 * ky, chestZ + 0.003, 0.055, 0.075, 0.008), '#f4f4ef', 7, BI.torso);
    add(GEO.plane, TM(0, P.waist + 0.153 * ky, chestZ + 0.0085, 0.045, 0.045, 1), '#ffffff', 7, BI.torso, { uv: decLogo() });
  }
  if (acc.has('backpack')) {
    add(sphG(12, 8), TM(0, P.waist + 0.15 * ky, -0.15 * P.td / 0.7 - 0.05, 0.14 * w, 0.16 * ky, 0.08), spec.packC || '#66bde6', 6, BI.torso);
    for (const s of [1, -1]) add(torG(1, 0.12, 4, 12), TM(s * 0.085 * w, P.waist + 0.2 * ky, -0.02, 0.06, 0.14 * ky, 0.12 * P.td / 0.7, Math.PI / 2, 0, 0), '#3f8fb8', 6, BI.torso);
  }
  if (acc.has('delivery')) {
    const bz = -0.12 * P.td / 0.7 - 0.2;
    add(GEO.box, TM(0, P.waist + 0.16 * ky, bz, 0.42, 0.42, 0.36), '#c25959', 6, BI.torso);
    const uv = decBox();
    add(GEO.plane, TM(0, P.waist + 0.16 * ky, bz - 0.181, 0.36, 0.36, 1, Math.PI), '#ffffff', 7, BI.torso, { uv });
    for (const s of [1, -1]) add(GEO.plane, TM(s * 0.211, P.waist + 0.16 * ky, bz, 0.32, 0.32, 1, s * Math.PI / 2), '#ffffff', 7, BI.torso, { uv });
    for (const s of [1, -1]) add(GEO.box, TM(s * 0.09 * w, P.waist + 0.2 * ky, -0.03, 0.025, 0.3 * ky, 0.2 * P.td / 0.7), '#373f42', 6, BI.torso);
  }
  if (acc.has('chain')) add(torG(1, 0.08, 5, 18), TM(0, P.shY - 0.005, 0.025, 0.075, 0.075, 0.07, 0, Math.PI / 2 - 0.5), '#e5c27a', 6, BI.torso);
  if (acc.has('whistle')) { add(sphG(8, 6), TM(0, P.waist + 0.24 * ky, chestZ + 0.01, 0.018, 0.018, 0.024), '#c9cdc2', 7, BI.torso); for (const s of [1, -1]) add(GEO.box, TM(s * 0.03, P.waist + 0.3 * ky, chestZ - 0.01, 0.006, 0.12 * ky, 0.006, 0, 0, s * 0.35), '#c25959', 6, BI.torso); }
  // ---- cabeça ----
  const hk = HEADK[P.head], HG = headGeos(P.head);
  const HM = (x, y, z, sx, sy, sz, ry, rx, rz) => TM(x, hc + y, 0.008 + z, sx, sy, sz, ry, rx, rz);
  add(HG.head, HM(0, 0, 0, hr, hr, hr), skin, 1, BI.head);
  const f = Object.assign({ skin }, spec.face || {});
  if (!f.brow) f.brow = hexMix(spec.hair?.color || '#2f3437', '#1a1a1a', 0.25);
  const slot = faceSheet(f, false, spec.reuseSlot);
  add(HG.cap, HM(0, 0, 0, hr, hr, hr), '#ffffff', 1, BI.head, { uv: slotUV(slot), face: true });
  for (const s of [1, -1]) add(sphG(10, 8), HM(s * hr * 0.97 * hk.wide, -hr * 0.06, -hr * 0.04, hr * 0.13, hr * 0.22, hr * 0.15, s * 0.3), skin, 1, BI.head);
  if (acc.has('earrings')) for (const s of [1, -1]) add(sphG(6, 4), HM(s * hr * 1.0 * hk.wide, -hr * 0.3, -hr * 0.04, hr * 0.06, hr * 0.06, hr * 0.06), '#e5c27a', 6, BI.head);
  // cabelo
  const hs = spec.hair || { style: 'bob', color: HAIRCOL[0] }, H = HAIR[hs.style] || HAIR.bob, hcC = hs.color;
  if (H.shell) add(shellGeo(H.shell), HM(0, 0, 0, hr, hr, hr), hcC, 2, BI.head);
  if (H.spikes) for (let i = 0; i < H.spikes; i++) {
    const a = (i / H.spikes - 0.5) * 2.4, tilt = 0.55 + (i % 2) * 0.25;
    add(cylG(6, 0), HM(Math.sin(a) * hr * 0.55, hr * 0.92, -hr * 0.15 - Math.cos(a) * hr * 0.2, hr * 0.28, hr * 0.5, hr * 0.28, a, -tilt), hcC, 2, BI.head);
  }
  if (H.bun) { add(sphG(12, 8), HM(0, hr * 0.98, -hr * 0.55, hr * 0.42, hr * 0.38, hr * 0.42), hcC, 2, BI.head); add(torG(1, 0.2, 5, 12), HM(0, hr * 0.8, -hr * 0.42, hr * 0.28, hr * 0.28, hr * 0.28, 0, 0.6), spec.hair.band || '#c25959', 6, BI.head); }
  if (H.buns) for (const s of [1, -1]) add(sphG(12, 8), HM(s * hr * 0.66, hr * 0.8, -hr * 0.2, hr * 0.36, hr * 0.36, hr * 0.36), hcC, 2, BI.head);
  if (H.afro) add(blobG(4, LOW ? 1 : 2), HM(0, hr * 0.42, -hr * 0.28, hr * 1.42, hr * 1.25, hr * 1.36), hcC, 2, BI.head);
  // faixa na testa, por baixo do black power
  if (H.afro && spec.hair.band) add(torG(1, 0.13, 6, 22), HM(0, hr * 0.4, hr * 0.02, hr * 1.02, hr * 1.02, hr * 1.02, 0, Math.PI / 2 - 0.42), spec.hair.band, 6, BI.head);
  if (H.puff) { add(blobG(2, LOW ? 1 : 2), HM(0, hr * 1.1, -hr * 0.5, hr * 0.78, hr * 0.7, hr * 0.78), hcC, 2, BI.head); add(torG(1, 0.18, 5, 14), HM(0, hr * 0.8, -hr * 0.36, hr * 0.44, hr * 0.44, hr * 0.44, 0, 0.55), spec.hair.band || '#f3c258', 6, BI.head); }
  if (H.sides) for (const s of [1, -1]) add(blobG(6, 1), HM(s * hr * 0.92, hr * 0.12, -hr * 0.3, hr * 0.26, hr * 0.32, hr * 0.5), hcC, 2, BI.head);
  if (H.tail === 'pony') {
    const ty = hc + hr * 0.55, tz = 0.008 - hr * 0.95;
    add(torG(1, 0.35, 5, 12), TM(0, ty, tz - hr * 0.05, hr * 0.15, hr * 0.15, hr * 0.15, 0, 0.3), spec.hair.band || '#c25959', 6, BI.tail);
    add(sphG(10, 8), TM(0, ty - hr * 0.35, tz - hr * 0.22, hr * 0.26, hr * 0.42, hr * 0.24, 0, -0.35), hcC, 2, BI.tail);
    add(sphG(10, 8), TM(0, ty - hr * 0.85, tz - hr * 0.3, hr * 0.2, hr * 0.42, hr * 0.2, 0, -0.1), hcC, 2, BI.tail);
    add(cylG(6, 0), TM(0, ty - hr * 1.45, tz - hr * 0.28, hr * 0.16, -hr * 0.45, hr * 0.16), hcC, 2, BI.tail);
  }
  if (H.tail === 'braid') {
    const ty = hc + hr * 0.4, tz = 0.008 - hr * 0.98;
    for (let i = 0; i < 6; i++) add(sphG(8, 6), TM(0, ty - i * hr * 0.32, tz - hr * 0.08 - i * 0.004, hr * (0.2 - i * 0.012), hr * 0.22, hr * (0.18 - i * 0.01)), hcC, 2, BI.tail);
    add(torG(1, 0.35, 5, 10), TM(0, ty - 6 * hr * 0.32 + hr * 0.12, tz - hr * 0.1, hr * 0.12, hr * 0.12, hr * 0.12, 0, Math.PI / 2), spec.hair.band || '#f3c258', 6, BI.tail);
  }
  // chapéus
  const hat = spec.hat;
  if (hat) {
    const hcol = hat.color;
    if (hat.kind === 'cap') {
      add(DOME, HM(0, hr * 0.26, -hr * 0.02, hr * 1.13, hr * 0.8, hr * 1.15), hcol, 6, BI.head);
      add(cylG(16), HM(0, hr * 0.33, hr * 0.92, hr * 0.62, hr * 0.06, hr * 0.56, 0, 0.12), hat.brim || hcol, 7, BI.head);
      add(sphG(6, 4), HM(0, hr * 1.06, -hr * 0.02, hr * 0.1, hr * 0.06, hr * 0.1), hcol, 6, BI.head);
      if (hat.logo) add(GEO.plane, HM(0, hr * 0.62, hr * 1.03, hr * 0.5, hr * 0.5, 1, 0, -0.45), '#ffffff', 7, BI.head, { uv: decLogo() });
    } else if (hat.kind === 'flat') {
      add(DOME, HM(0, hr * 0.32, 0.0, hr * 1.12, hr * 0.56, hr * 1.2), hcol, 6, BI.head);
      add(cylG(14), HM(0, hr * 0.36, hr * 0.86, hr * 0.55, hr * 0.06, hr * 0.42, 0, 0.18), hcol, 7, BI.head);
    } else if (hat.kind === 'bucket') {
      add(cylG(14, 0.86), HM(0, hr * 0.32, 0, hr * 1.1, hr * 0.68, hr * 1.1), hcol, 6, BI.head);
      add(cylG(16, 0.72), HM(0, hr * 0.18, 0, hr * 1.62, hr * 0.2, hr * 1.62), hat.brim || hcol, 7, BI.head);
    } else if (hat.kind === 'hard') {
      add(DOME, HM(0, hr * 0.24, 0, hr * 1.16, hr * 0.98, hr * 1.18), hcol, 6, BI.head);
      add(cylG(16), HM(0, hr * 0.22, hr * 0.06, hr * 1.32, hr * 0.06, hr * 1.36), hcol, 7, BI.head);
      add(GEO.box, HM(0, hr * 1.05, 0, hr * 0.16, hr * 0.18, hr * 1.6), hexMix(hcol, '#ffffff', 0.2), 6, BI.head);
    } else if (hat.kind === 'bandana') {
      add(torG(1, 0.1, 6, 22), HM(0, hr * 0.5, -hr * 0.04, hr * 1.0, hr * 1.0, hr * 1.02, 0, Math.PI / 2 + 0.3), hcol, 6, BI.head);
      add(sphG(8, 6), HM(0, hr * 0.12, -hr * 1.08, hr * 0.16, hr * 0.14, hr * 0.12), hcol, 6, BI.head);
      for (const s of [1, -1]) add(sphG(8, 6), HM(s * hr * 0.12, -hr * 0.12, -hr * 1.1, hr * 0.08, hr * 0.22, hr * 0.06, 0, 0, s * 0.4), hcol, 6, BI.head);
    } else if (hat.kind === 'headset') {
      add(torG(1, 0.05, 4, 18, Math.PI), HM(0, hr * 0.05, 0, hr * 1.14, hr * 1.14, hr * 1.14, Math.PI / 2, 0, 0), '#373f42', 6, BI.head);
      for (const s of [1, -1]) add(cylG(10), HM(s * hr * 1.12, -hr * 0.05, 0, hr * 0.24, hr * 0.12, hr * 0.24, 0, 0, Math.PI / 2), '#373f42', 6, BI.head);
    }
  }
  // ---- objetos na mão (osso 14) e cartaz (osso 15) ----
  const ax = -P.shX, handY = P.shY - P.arm - P.fore - 0.036 * P.ag;
  // matriz no sistema do antebraço já posado (theta = rotação total do braço em x)
  const PM = (theta, ox, oy, oz, sx, sy, sz, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Matrix4().makeTranslation(ax, handY, 0);
    m.multiply(new THREE.Matrix4().makeRotationX(-theta));
    m.multiply(new THREE.Matrix4().compose(new THREE.Vector3(ox, oy, oz), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(sx, sy, sz)));
    return m;
  };
  const prop = spec.prop;
  if (prop === 'phone') { add(GEO.box, PM(-1.85, 0, 0.03, 0.0, 0.05, 0.1, 0.012, 0.3, Math.PI), '#2f3a40', 6, BI.prop); add(GEO.plane, PM(-1.85, 0, 0.03, -0.0065, 0.042, 0.088, 1, 0.3, Math.PI), '#ffffff', 7, BI.prop, { uv: decPhone() }); }
  if (prop === 'mega') {
    add(cylG(12, 0.32, false), PM(-2.5, 0, 0.0, 0.16, 0.13, 0.26, 0.13, -Math.PI / 2), '#f4f4ef', 6, BI.prop);
    add(cylG(12), PM(-2.5, 0, 0.0, 0.295, 0.135, 0.02, 0.135, -Math.PI / 2), '#c25959', 7, BI.prop);
    add(GEO.box, PM(-2.5, 0, -0.06, 0.07, 0.025, 0.09, 0.03), '#373f42', 6, BI.prop);
  }
  if (prop === 'rod') {
    add(cylG(5), PM(-1.3, 0, 0, 0.0, 0.012, 1.9, 0.012, 0.88), '#8e6c4b', 6, BI.prop);
    add(cylG(8), PM(-1.3, 0.03, 0.02, 0.08, 0.035, 0.03, 0.035, 0, 0, Math.PI / 2), '#4b5658', 7, BI.prop);
  }
  if (prop === 'news') {
    add(GEO.box, PM(-2.0, 0.01, 0.16, 0.06, 0.34, 0.24, 0.006), '#efeee6', 6, BI.prop);
    const uv = decNews();
    add(GEO.plane, PM(-2.0, 0.01, 0.16, 0.0635, 0.33, 0.23, 1), '#ffffff', 7, BI.prop, { uv });
    add(GEO.plane, PM(-2.0, 0.01, 0.16, 0.0565, 0.33, 0.23, 1, 0, Math.PI), '#ffffff', 7, BI.prop, { uv });
  }
  if (prop === 'coconut') {
    add(sphG(10, 8), PM(-2.2, 0.0, 0.02, 0.05, 0.075, 0.07, 0.075), '#7fae4f', 6, BI.prop);
    add(cylG(5), PM(-2.2, 0.0, 0.08, 0.06, 0.006, 0.12, 0.006, -0.3), '#f3c258', 7, BI.prop);
    add(cylG(8, 0), PM(-2.2, 0.03, 0.12, 0.05, 0.06, 0.04, 0.06, 0.2), '#de794e', 7, BI.prop);
  }
  if (prop === 'bag') {
    add(GEO.box, PM(0, 0, -0.14, 0.0, 0.17, 0.2, 0.09), '#f4f4ef', 6, BI.prop);
    add(torG(1, 0.12, 4, 10, Math.PI), PM(0, 0, -0.04, 0.0, 0.05, 0.06, 0.05), '#f4f4ef', 6, BI.prop);
    add(blobG(1, 1), PM(0, 0.02, -0.02, 0.0, 0.07, 0.06, 0.06), '#8cc48c', 7, BI.prop);
    add(cylG(6, 0.3), PM(0, -0.04, -0.01, 0.02, 0.025, 0.12, 0.025, 0.3), '#de794e', 7, BI.prop);
  }
  // cartaz da greve: segura acima da cabeça
  {
    const th = -2.95, txt = spec.sign || pickR(STRIKE);
    add(cylG(5), PM(th, 0, -0.05, 0, 0.014, 0.62, 0.014), '#b48d63', 6, BI.sign);
    add(GEO.box, PM(th, 0, 0.5, 0.0, 0.56, 0.32, 0.02), '#f1e6c8', 6, BI.sign);
    const uv = decSign(txt);
    add(GEO.plane, PM(th, 0, 0.5, 0.011, 0.54, 0.3, 1), '#ffffff', 7, BI.sign, { uv });
    add(GEO.plane, PM(th, 0, 0.5, -0.011, 0.54, 0.3, 1, 0, Math.PI), '#ffffff', 7, BI.sign, { uv });
  }
  // ---- malha ----
  const geo = g.build();
  const mat = charMat();
  const mesh = new THREE.SkinnedMesh(geo, mat);
  const skel = new THREE.Skeleton(bones);
  mesh.add(root);
  mesh.bind(skel);
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, P.hip, 0), 1.7);
  const rig = new THREE.Group();
  rig.add(mesh);
  bones[BI.sign].scale.setScalar(1e-4);
  if (!prop || prop === 'mega') bones[BI.prop].scale.setScalar(1e-4);
  const ch = {
    spec, P, rig, mesh, bones, mat, slot, height: hc + hr * 1.25, headY: hc,
    st: { t: rand() * 10, speed: 0, phase: rand() * 6, w: 0, run: 0, air: 0, pose: spec.pose || 'stand', act: spec.act || null, actW: 0, look: { yaw: 0, pitch: 0 }, lookT: { yaw: 0, pitch: 0 }, talk: false, mouth: 0, mouthOpen: false, blink: rand() * 3, blinkOn: 0, happy: 0, sleep: false, tired: spec.tired || 0, frame: -1, sign: false, propOn: !!prop && prop !== 'mega', signW: 0, wave: 0 },
    d: new THREE.Vector3(0, 1, 0), fwd: new THREE.Vector3(0, 0, 1), h: 0,
  };
  return ch;
}
export function disposeChar(ch) { ch.mesh.geometry.dispose(); ch.mat.dispose(); ch.rig.parent && ch.rig.parent.remove(ch.rig); }
// coloca no planeta
export function placeChar(ch, d, fwd, h) {
  ch.d.copy(d); ch.fwd.copy(fwd).addScaledVector(d, -fwd.dot(d)).normalize(); ch.h = h;
  ch.rig.position.copy(d).multiplyScalar(R + h);
  orient(ch.rig, d, ch.fwd);
}
export function setFace(ch, k) {
  if (ch.st.frame === k) return;
  ch.st.frame = k; ch.mat.userData.face.value.set(k * FS / FAW, 0);
}
