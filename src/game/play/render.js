// ================= retrato de quem fala =================
// desenhado no próprio quadro do jogo (ganha o mesmo traço de tinta), atrás da janela vazada da caixa de fala
import * as THREE from 'three';
import { setUI } from '../../store.js';
import { postCam, postScene, rtColor } from '../core/ink.js';
import { V3 } from '../core/math.js';
import { ambient, camera, renderer, scene, sun } from '../core/renderer.js';
import { BI } from '../characters/bodies.js';
import { state } from './state.js';

export const PORT = { ch: null, rect: null, cam: new THREE.PerspectiveCamera(10.5, 1, 0.15, 900), bg: new THREE.Color('#e3f3ef') };
PORT.cam.layers.set(1); ambient.layers.enable(1); sun.layers.enable(1);
const _pW = new THREE.Color('#ffffff'), _pc = new THREE.Color();
const _pv = { h: V3(), u: V3(), f: V3(), r: V3(), a: V3(), d: V3(), sp: V3(), st: V3(), hu: V3() };
export function setPortrait(ch, color) {
  if (PORT.ch && PORT.ch !== ch) PORT.ch.rig.traverse((o) => o.layers.disable(1));
  PORT.ch = ch || null; PORT.rect = null;
  if (ch) { ch.rig.traverse((o) => o.layers.enable(1)); PORT.bg.set(color || '#66bde6').lerp(_pW, 0.74); }
  setUI({ portrait: !!ch });
}
function renderPortrait() {
  const ch = PORT.ch, r = PORT.rect;
  const pr = renderer.getPixelRatio(), W = rtColor.width, H = rtColor.height;
  const x = Math.round(r.x * pr), w = Math.round(r.w * pr), h = Math.round(r.h * pr), y = H - Math.round(r.y * pr) - h;
  if (w < 8 || h < 8 || x < 0 || y < 0 || x + w > W || y + h > H) return;
  // câmera de retrato: de frente, um tico de lado e de cima, lente bem fechada
  const M = ch.rig.matrixWorld, hb = ch.bones[ch.pet ? 1 : BI.head];
  const up = _pv.u.setFromMatrixColumn(M, 1).normalize(), f = _pv.f.setFromMatrixColumn(M, 2).normalize(), rt = _pv.r.setFromMatrixColumn(M, 0).normalize();
  // gente: a câmera vai (quase toda) para o referencial da cabeça, de frente para o rosto: quem fala virando a cabeça por cima
  // do ombro, de cabeça baixa ou inclinado junto com o corpo (o Marcos na roda) continua de cara no retrato, sem o chapéu na
  // frente dos olhos; o resto que sobra ainda deixa ver o balanço da cabeça enquanto fala
  let fu = up;
  if (!ch.pet) {
    const HW = hb.matrixWorld, k = 0.8;
    f.lerp(_pv.h.setFromMatrixColumn(HW, 2).normalize(), k).normalize();
    rt.lerp(_pv.h.setFromMatrixColumn(HW, 0).normalize(), k).normalize();
    fu = _pv.hu.copy(up).lerp(_pv.h.setFromMatrixColumn(HW, 1).normalize(), k).normalize();
  }
  const aim = hb.getWorldPosition(_pv.a).addScaledVector(up, ch.pet ? 0.05 : 0.11);
  if (ch.pet) aim.addScaledVector(f, 0.06);
  const dir = _pv.d.copy(f).multiplyScalar(Math.cos(0.36)).addScaledVector(rt, Math.sin(0.36)).addScaledVector(fu, 0.2).normalize();
  const C = PORT.cam;
  C.position.copy(aim).addScaledVector(dir, 3.6); C.up.copy(fu); C.lookAt(aim);
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

// ================= o quadro: cena, retrato e contorno de tinta =================
export function render() {
  renderer.setRenderTarget(rtColor); renderer.render(scene, camera);
  if (PORT.ch && PORT.rect && state.dialog) renderPortrait();
  renderer.setRenderTarget(null); renderer.render(postScene, postCam);
}
