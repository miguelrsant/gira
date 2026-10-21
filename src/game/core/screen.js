// ================= tela =================
// tamanho do canvas, densidade de pixels e ajuste automático de resolução
import { LOW } from './config.js';
import { post, rtColor } from './ink.js';
import { camera, renderer } from './renderer.js';

const PR_MAX = Math.min(devicePixelRatio || 1, LOW ? 1.3 : 1.75);
const PR_MIN = LOW ? 0.6 : 0.8;
let PR = PR_MAX;

export const view = { w: innerWidth, h: innerHeight, portrait: innerWidth < innerHeight };
function applySize() {
  const w = innerWidth, h = innerHeight;
  view.w = w; view.h = h; view.portrait = w < h;
  renderer.setPixelRatio(PR);
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  const W = Math.floor(w * PR), H = Math.floor(h * PR);
  rtColor.setSize(W, H);
  post.uniforms.res.value.set(W, H);
  post.uniforms.thick.value = Math.max(1, Math.min(2.2, H / 620));
}
addEventListener('resize', () => applySize());
applySize();

// ajuste automático de resolução pelo tempo de quadro
const perf = { acc: 0, n: 0, t: 0, cool: 0 };
export function adaptResolution(dt) {
  perf.acc += dt; perf.n++; perf.t += dt; perf.cool -= dt;
  if (perf.t < 1.5) return;
  const avg = perf.acc / perf.n; perf.acc = 0; perf.n = 0; perf.t = 0;
  if (perf.cool > 0 || document.hidden) return;
  if (avg > 1 / 42 && PR > PR_MIN + 0.01) { PR = Math.max(PR_MIN, PR - 0.15); applySize(); perf.cool = 2; }
  else if (avg < 1 / 58 && PR < PR_MAX - 0.01) { PR = Math.min(PR_MAX, PR + 0.1); applySize(); perf.cool = 4; }
}
