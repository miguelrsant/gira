// ================= céu, sol e hora do dia =================
import { LAP, R } from '../core/config.js';
import { post } from '../core/ink.js';
import { clamp, col, lerp, smooth, sstep } from '../core/math.js';
import { ambient, camera, hemi, scene, sun } from '../core/renderer.js';
import { skyMat } from '../core/skydome.js';
import { waterMat } from '../world/terrain.js';
import { _c, cam } from './camera.js';
import { player, SKYF } from './player.js';
import { dayP, state } from './state.js';

const PAL = [
  { a: '#6cc7be', b: '#a6e6da', h: '#c8f0e4', fog: '#87d4ca', sun: '#fff0da', amb: 0.82, hi: 0.62, si: 2.05 },
  { a: '#5fbfb9', b: '#9be5d6', h: '#b9eee2', fog: '#79cfc6', sun: '#fffaf0', amb: 0.88, hi: 0.66, si: 2.2 },
  { a: '#d98c6c', b: '#f4ca96', h: '#f7bc8e', fog: '#df9f80', sun: '#ffba7a', amb: 0.74, hi: 0.54, si: 1.9 },
].map((o) => ({ a: col(o.a), b: col(o.b), h: col(o.h), fog: col(o.fog), sun: col(o.sun), amb: o.amb, hi: o.hi, si: o.si }));
let skyP = null;
export function updateSky(dt) {
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
  sun.color.copy(A.sun).lerp(B.sun, k); sun.intensity = lerp(A.si, B.si, k);
  ambient.intensity = lerp(A.amb, B.amb, k);
  hemi.intensity = lerp(A.hi, B.hi, k);
  hemi.color.copy(u.cB.value);
  // longe do chão o céu vira o fundo chapado da abertura, com halo em volta do planeta
  const far = sstep(R + 12, R + 40, camera.position.length());
  u.mode.value = far;
  u.pDir.value.copy(camera.position).negate().normalize();
  u.pRad.value = Math.asin(clamp((R + 1.6) / Math.max(camera.position.length(), R + 2), 0, 1));
  u.sunCol.value.copy(sun.color);
  const overRatio = !state.sunday && state.walked > LAP ? clamp((state.walked - LAP) / 90, 0, 1) : 0;
  u.dusk.value = clamp(sstep(0.72, 1.0, p) * 0.65 + overRatio * 0.55, 0, 1);
  post.uniforms.warm.value = sstep(0.6, 1, p) * 0.78 * (1 - 0.6 * far);
  const gloom = state.day === 7 && !state.strike && !state.sunday;
  post.uniforms.sat.value = lerp(post.uniforms.sat.value, state.sunday ? 1.04 : gloom ? 0.74 : 0.94, 1 - Math.exp(-dt * 2));
  // o sol anda pelo céu conforme o dia anda (ou seja: conforme você anda)
  const a = lerp(-1.05, 1.2, p), up = player.d;
  const sd = _c.sd.copy(up).multiplyScalar(Math.cos(a)).addScaledVector(SKYF.x, Math.sin(a)).addScaledVector(SKYF.z, 0.35).normalize();
  u.sunDir.value.copy(sd);
  if (waterMat.uniforms.sunDir) waterMat.uniforms.sunDir.value.copy(sd);
  const focus = cam.far ? _c.h.copy(cam.look).setLength(R + 1) : player.pos;
  if (cam.far && cam.look.lengthSq() < 1) focus.copy(player.d).multiplyScalar(R);
  sun.target.position.copy(focus); sun.position.copy(focus).addScaledVector(sd, 40);
  u.skyInv.value.set(SKYF.x.x, SKYF.x.y, SKYF.x.z, up.x, up.y, up.z, SKYF.z.x, SKYF.z.y, SKYF.z.z);
  SKYF.shift.x += dt * 0.006;
  u.shift.value.copy(SKYF.shift);
  if (cam.far) { scene.fog.near = 400; scene.fog.far = 900; post.uniforms.fade.value.set(300, 700); }
  else { scene.fog.near = 40; scene.fog.far = 130; post.uniforms.fade.value.set(45, 150); }
}
