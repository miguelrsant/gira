// ================= tela de título: planeta subindo + letras em ladrilhos =================
import * as THREE from 'three';
import { setUI, getUI } from '../../store.js';
import { IS_TOUCH, R } from '../core/config.js';
import { post } from '../core/ink.js';
import {
  $, C, clamp, D2R, easeInOut, easeOutBack, easeOutCubic, lerp, nextFrame, rand, V3, wait, Y,
} from '../core/math.js';
import { ambient, camera, canvas, scene, sun } from '../core/renderer.js';
import { view } from '../core/screen.js';
import { sky, skyMat } from '../core/skydome.js';
import { atlasAdd } from '../world/atlas.js';
import { MAT } from '../world/chunks.js';
import { Geo, GEO, TM } from '../world/geo.js';
import { inkRect, INKS } from '../world/textures.js';
import { INTRO_LINES } from '../story/npcs.js';
import { audio, initAudio, setMusic, sfx } from './audio.js';
import { cam, fovFor, snapCamera } from './camera.js';
import { openDialog } from './dialog.js';
import { refreshTasks, setHint } from './hud.js';
import { player } from './player.js';
import { render } from './render.js';
import { state } from './state.js';

export const TITLE = { grp: null, tiles: [], t: 0, orbit: -0.62, s: 1, th: 0.2, D: 140, btn: false, look: V3(), upW: V3() };
// letras como traços grossos numa grade 4x4: contorno de tinta, miolo branco (letras "ocas" da referência)
const GLYPH = {
  G: [[[4, 0], [0, 0], [0, 4], [4, 4], [4, 2], [2, 2]]],
  I: [[[0, 0], [4, 0]], [[2, 0], [2, 4]], [[0, 4], [4, 4]]],
  R: [[[0, 4], [0, 0], [4, 0], [4, 2], [0, 2]], [[2.3, 2], [4, 4]]],
  A: [[[0, 4], [0, 0], [4, 0], [4, 4]], [[0, 2], [4, 2]]],
};
function texLetter(L) {
  return atlasAdd('letter:' + L, 192, 192, (g, w, h) => {
    const m = w * 0.2, s = (w - 2 * m) / 4, sw = s * 0.62, ol = 9;
    g.fillStyle = '#f2f1e9'; g.fillRect(0, 0, w, h);
    // sombra leve à direita/embaixo do traço
    // cada traço com sua ponta: quadrada, ou redonda na perna diagonal do R (para não vazar da barra)
    const pass = (color, lw, dx, dy) => {
      g.strokeStyle = color; g.lineWidth = lw; g.lineJoin = 'miter'; g.miterLimit = 4;
      for (const st of GLYPH[L]) {
        g.lineCap = st.length === 2 && st[0][0] % 1 ? 'round' : 'square';
        g.beginPath(); st.forEach(([x, y], i) => (i ? g.lineTo : g.moveTo).call(g, m + x * s + dx, m + y * s + dy)); g.stroke();
      }
    };
    pass('rgba(55,63,66,.18)', sw + ol * 2, 5, 6);
    pass(INKS, sw + ol * 2, 0, 0);
    pass('#fdfdf9', sw, 0, 0);
    inkRect(g, 5, 5, w - 10, h - 10, 6, 'rgba(55,63,66,.55)');
  });
}
export function buildTitle() {
  const grp = new THREE.Group(); grp.visible = false; camera.add(grp); TITLE.grp = grp;
  ['G', 'I', 'R', 'A'].forEach((L, i) => {
    const uv = texLetter(L), id = i === 0 || i === 3 ? 4 : 5;
    const g = new Geo();
    g.add(GEO.box, TM(0, 0, 0, 1, 1, 0.46), null, { c: C('#b9c4bd'), id });
    g.add(GEO.plane, TM(0, 0, 0.2315, 1, 1, 1), null, { c: C('#ffffff'), uv, id });
    const m = new THREE.Mesh(g.build(), MAT.world);
    m.frustumCulled = false; m.renderOrder = 2;
    const col = i % 2, row = Math.floor(i / 2);
    m.userData.home = new THREE.Vector3((col - 0.5) * 1.16, (0.5 - row) * 1.16, (rand() - 0.5) * 0.2);
    m.userData.rot = new THREE.Euler((rand() - 0.5) * 0.1, (rand() - 0.5) * 0.12, (rand() - 0.5) * 0.09);
    m.userData.spin = i % 2 ? 1 : -1;
    m.visible = false;
    grp.add(m); TITLE.tiles.push(m);
  });
}
export function startTitle() {
  state.mode = 'title';
  TITLE.t = 0; TITLE.grp.visible = true;
  $('loader').classList.add('wipe');
  setTimeout(() => $('loader').classList.add('hidden'), 1000);
}
// o botão COMEÇAR e a frase de baixo são o <TitleScreen> (src/ui)
const setTitle = (o) => setUI({ title: { ...getUI().title, ...o } });
const _tt = { cp: V3(), sd: V3(), l: V3() };
export function updateTitle(dt) {
  const T = TITLE; T.t += dt;
  const t = T.t;
  // enquadramento: o planeta ocupa ~60% da altura (ou a largura, em retrato)
  const vf = 40, tv = Math.tan(vf * D2R / 2), asp = view.w / view.h;
  const th = Math.min(Math.atan(tv * 0.6), Math.atan(tv * asp * 0.86));
  T.th = th; T.D = (R + 2.4) / Math.sin(th);
  if (camera.fov !== vf) { camera.fov = vf; camera.updateProjectionMatrix(); }
  // o planeta sobe pequeno, para no meio e então cresce, girando cada vez mais devagar
  const u1 = clamp(t / 1.15, 0, 1), u2 = clamp((t - 0.85) / 1.25, 0, 1);
  const f = lerp(-1.55, 0.05, easeOutCubic(u1));
  const dist = lerp(T.D * 3.2, T.D, easeInOut(u2));
  T.orbit += dt * (0.06 + 2.4 * Math.pow(1 - clamp(t / 2.4, 0, 1), 2));
  const phi = 0.34;
  _tt.cp.set(Math.cos(T.orbit) * Math.cos(phi), Math.sin(phi), Math.sin(T.orbit) * Math.cos(phi)).multiplyScalar(dist);
  camera.position.copy(_tt.cp); camera.up.set(0, 1, 0);
  const vd = _tt.sd.copy(_tt.cp).negate().normalize();
  T.upW.copy(Y).addScaledVector(vd, -Y.dot(vd)).normalize();
  T.look.copy(T.upW).multiplyScalar(-f * dist * tv);
  camera.lookAt(T.look);
  cam.pos.copy(camera.position); cam.look.copy(T.look);
  // céu chapado com halo em volta do planeta
  skyMat.uniforms.mode.value = 1;
  skyMat.uniforms.pDir.value.copy(vd);
  skyMat.uniforms.pRad.value = Math.asin(clamp((R + 1.6) / dist, 0, 1));
  sky.position.copy(camera.position);
  scene.fog.near = 2000; scene.fog.far = 3000;
  post.uniforms.fade.value.set(500, 900);
  post.uniforms.warm.value = 0; post.uniforms.sat.value = 0.95;
  // sol vindo de cima, à esquerda da câmera
  const right = _tt.l.crossVectors(vd, T.upW).normalize();
  const sd = _tt.sd.copy(vd).negate().multiplyScalar(0.75).addScaledVector(T.upW, 0.75).addScaledVector(right, -0.55).normalize();
  const tgt = _tt.cp.clone().normalize().multiplyScalar(R);
  sun.target.position.copy(tgt); sun.position.copy(tgt).addScaledVector(sd, 40);
  sun.color.set('#fff6e8'); sun.intensity = 2.1; ambient.intensity = 1.2;
  // letras
  const L = 10, s = 0.6 * L * Math.tan(th) / 1.05;
  T.grp.position.set(0, f * L * tv * 0.98, -L);
  T.grp.rotation.set(-0.12 + Math.sin(t * 0.6) * 0.02, 0.18 + Math.sin(t * 0.45) * 0.03, 0.02);
  T.tiles.forEach((m, i) => {
    const t0 = 2.05 + i * 0.14, u = clamp((t - t0) / 0.62, 0, 1);
    m.visible = u > 0;
    if (!m.visible) return;
    if (!m.userData.popped) { m.userData.popped = true; sfx.pop(1 + i * 0.15); }
    const k = Math.max(0.001, easeOutBack(u, 2.4)), h = m.userData.home, r = m.userData.rot, sp = m.userData.spin;
    m.scale.setScalar(k * s);
    m.position.set(h.x * s, h.y * s + (1 - easeOutCubic(u)) * 1.2 * s, h.z * s);
    m.rotation.set(r.x + (1 - u) * 0.9 + Math.sin(t * 1.1 + i * 1.7) * 0.035, r.y + Math.sin(t * 0.9 + i) * 0.045, r.z + (1 - u) * 1.5 * sp);
  });
  if (t > 2.85 && !T.btn) { T.btn = true; setTitle({ btn: 'in', tagline: true }); }
}
// clique em COMEÇAR: o quadro do título voa como uma folha, a tela branca volta e se abre no jogo
export async function startGame() {
  if (state.mode !== 'title' || !TITLE.btn || TITLE.going) return;
  TITLE.going = true;
  initAudio(); if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume();
  setMusic(state.musicOn);
  sfx.click();
  setTitle({ btn: 'press' });
  await wait(120);
  setTitle({ btn: 'out', tagline: false });
  await wait(230);
  // o último quadro do título vira uma folha de papel...
  render();
  const sc = $('sheetcv'), sh = $('sheet');
  sc.width = canvas.width; sc.height = canvas.height;
  sc.getContext('2d').drawImage(canvas, 0, 0);
  sh.style.display = 'block';
  const ld = $('loader'); ld.classList.remove('wipe', 'hidden', 'quiet');
  setTitle({ visible: false });
  // ...e por baixo da tela branca o jogo já começa
  state.mode = 'intro';
  TITLE.grp.visible = false; skyMat.uniforms.mode.value = 0;
  cam.fov = fovFor(); camera.fov = cam.fov; camera.updateProjectionMatrix();
  snapCamera();
  await nextFrame(); await nextFrame();
  sh.classList.add('go'); sfx.whoosh();
  await wait(1050);
  sh.style.display = 'none'; sh.classList.remove('go');
  await wait(350);
  ld.classList.add('quiet');
  await wait(250);
  ld.classList.add('wipe'); sfx.whoosh(true);
  await wait(1000); ld.classList.add('hidden');
  // a câmera dá a volta até a frente da Duda
  await wait(350);
  const shot = cam.shot = { kind: 'intro', t: 0 };
  const t0 = performance.now();
  while (shot.t < 1.75 && performance.now() - t0 < 6000) await wait(50);
  setUI({ hudOn: true });
  await openDialog('DUDA', '#c25959', INTRO_LINES, { voice: 260, speaker: player.ch });
  cam.shot = null;
  state.mode = 'play'; setUI({ playing: true });
  refreshTasks();
  setHint(IS_TOUCH ? 'Arraste à esquerda para andar · a câmera vai atrás de você' : 'WASD ou setas para andar · Shift corre · a câmera vai atrás de você', 7000);
}
