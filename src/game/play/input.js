// ================= controles: teclado, mouse e toque =================
// os botões da interface (pular, menu, falas...) são React; aqui ficam as teclas e os gestos no canvas
import { setUI, getUI } from '../../store.js';
import { $ } from '../core/math.js';
import { canvas } from '../core/renderer.js';
import { view } from '../core/screen.js';
import { ACTORS, EMOTES, playerEmote } from './actors.js';
import { initAudio, setMusic, sfx } from './audio.js';
import { rotateCam, zoomCam } from './camera.js';
import { advanceDialog, closeDialog, selChoice } from './dialog.js';
import { interactNow, startTalk, target } from './director.js';
import { closePanels, togglePanel } from './hud.js';
import { jump } from './player.js';
import { joy, keys, state } from './state.js';
import { startGame } from './title.js';

const drag = { id: null, x: 0, y: 0, moved: 0, t0: 0 };
const pinch = new Map();
let pinchD = 0;
export function initInput() {
  addEventListener('keydown', (e) => {
    if (e.repeat && (e.code === 'Space' || e.code === 'KeyE' || e.code === 'Enter')) return;
    keys[e.code] = true;
    if (state.mode === 'title' && (e.code === 'Enter' || e.code === 'Space')) { startGame(); e.preventDefault(); return; }
    if (state.dialog && (e.code === 'Space' || e.code === 'KeyE' || e.code === 'Enter')) { advanceDialog(true); e.preventDefault(); return; }
    if (state.dialog && state.dialog.choicesOn) {
      const d = state.dialog;
      if (['ArrowLeft', 'ArrowUp', 'KeyA', 'KeyW'].includes(e.code)) { selChoice(d.sel - 1); sfx.blip(300); e.preventDefault(); return; }
      if (['ArrowRight', 'ArrowDown', 'KeyD', 'KeyS'].includes(e.code)) { selChoice(d.sel + 1); sfx.blip(300); e.preventDefault(); return; }
      const n = +e.key; if (n >= 1 && n <= d.choices.length && d.choiceT > 0.35) { sfx.click(); closeDialog(n - 1); e.preventDefault(); return; }
    }
    if (e.code === 'KeyM') { initAudio(); setMusic(!state.musicOn); }
    if (state.mode !== 'play') return;
    if (e.code === 'KeyE' || e.code === 'Enter') interactNow();
    if (e.code === 'Space') { jump(); e.preventDefault(); }
    const ei = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'].indexOf(e.code);
    if (ei >= 0) playerEmote(EMOTES[ei]);
    if (e.code === 'Escape') togglePanel(null);
    if (e.code.startsWith('Arrow')) e.preventDefault();
  });
  addEventListener('keyup', (e) => { keys[e.code] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => {
    if (state.mode === 'title') return;
    if (state.dialog) { advanceDialog(); return; }
    closePanels();
    if (e.pointerType === 'touch') {
      if (!getUI().touch) setUI({ touch: true });
      if (e.clientX < view.w * 0.45 && joy.id === null) {
        joy.id = e.pointerId; joy.cx = e.clientX; joy.cy = e.clientY; joy.x = 0; joy.y = 0;
        setUI({ joy: { x: e.clientX, y: e.clientY, kx: 0, ky: 0 } });
        return;
      }
      pinch.set(e.pointerId, [e.clientX, e.clientY]);
      if (pinch.size === 2) { const [a, b] = [...pinch.values()]; pinchD = Math.hypot(a[0] - b[0], a[1] - b[1]); drag.id = null; return; }
    }
    if (drag.id === null) { drag.id = e.pointerId; drag.x = e.clientX; drag.y = e.clientY; drag.moved = 0; drag.t0 = performance.now(); }
    canvas.setPointerCapture?.(e.pointerId);
  });
  addEventListener('pointermove', (e) => {
    if (e.pointerId === joy.id) {
      const dx = e.clientX - joy.cx, dy = e.clientY - joy.cy, l = Math.hypot(dx, dy), max = 60;
      joy.x = dx / max; joy.y = dy / max;
      const k = Math.min(1, max / Math.max(l, 1));
      setUI({ joy: { x: joy.cx, y: joy.cy, kx: dx * k, ky: dy * k } });
      return;
    }
    if (pinch.has(e.pointerId)) {
      pinch.set(e.pointerId, [e.clientX, e.clientY]);
      if (pinch.size === 2) { const [a, b] = [...pinch.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinchD > 0) zoomCam((pinchD - d) * 0.02); pinchD = d; return; }
    }
    if (e.pointerId === drag.id) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      rotateCam(dx / view.w * 5.2, dy / view.h * 2.6);
    }
  });
  const endPtr = (e) => {
    if (e.pointerId === joy.id) { joy.id = null; joy.x = joy.y = 0; setUI({ joy: null }); }
    pinch.delete(e.pointerId); if (pinch.size < 2) pinchD = 0;
    if (e.pointerId === drag.id) {
      // toque rápido sem arrastar: conversa com quem estiver perto
      if (e.pointerType === 'touch' && drag.moved < 10 && performance.now() - drag.t0 < 300 && target) interactNow();
      drag.id = null;
    }
  };
  addEventListener('pointerup', endPtr); addEventListener('pointercancel', endPtr);
  canvas.addEventListener('wheel', (e) => { if (state.mode === 'play' || state.mode === 'cutscene') zoomCam(e.deltaY * 0.004); e.preventDefault(); }, { passive: false });
  // toque no balão de quem está perto: conversa
  $('bubbles').addEventListener('pointerdown', (e) => {
    const a = ACTORS.find((x) => x.bubbleEl === e.target); if (!a) return;
    e.stopPropagation();
    if (state.mode === 'play' && !state.dialog && a.dist < 3.2) startTalk(a);
  });
}
