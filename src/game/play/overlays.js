// ================= balões e avisos, a cada quadro =================
import { setUI, getUI } from '../../store.js';
import { arcDist, clamp, V3 } from '../core/math.js';
import { camera } from '../core/renderer.js';
import { INTERACT } from '../world/places.js';
import { npcBubble } from '../story/npcs.js';
import { ACTORS } from './actors.js';
import { edgeOf, headPos, IMARK, meEmote, screenOf } from './bubbles.js';
import { target } from './director.js';
import { player } from './player.js';
import { state } from './state.js';

const _ov = { p: V3(), cd: V3() }, _sc = [0, 0];
export function updateOverlays(dt) {
  const playing = state.mode === 'play' || state.mode === 'cutscene';
  camera.getWorldDirection(_ov.cd);
  const now = performance.now();
  for (const a of ACTORS) {
    const n = a.n;
    let s = null;
    if (playing && a.vis && a.dist < 34) s = screenOf(headPos(a, _ov.p), _sc);
    const talkingNow = state.dialog && a.talking;
    const showB = !!s && a.dist < 8 && !talkingNow && !state.dialog && state.mode === 'play';
    a.bubbleEl.classList.toggle('on', showB);
    a.bubbleEl.classList.toggle('click', showB && a.dist < 3.2);
    if (showB) {
      const txt = npcBubble(n); if (a.bubbleEl.textContent !== txt) a.bubbleEl.textContent = txt;
      const sc = clamp(1.25 - a.dist / 12, 0.62, 1.1);
      a.bubbleEl.style.transform = `translate(${s[0].toFixed(1)}px, ${s[1].toFixed(1)}px) translate(-50%, -100%) translateY(-12px) scale(${sc.toFixed(3)})`;
    }
    // marcador: "…" para quem ainda não falou hoje, "!" para a Nara no 7º dia (sempre visível, preso na borda)
    const quest = n.id === 'nara' && state.day === 7 && !state.strike && !state.sunday && !state.talked.has('nara') && state.mode === 'play';
    let ms = s;
    if (quest && !ms) ms = edgeOf(headPos(a, _ov.p), _sc);
    const showM = !!ms && !showB && !talkingNow && ((quest) || (a.dist < 26 && !state.talked.has(n.id) && !a.pet && playing));
    a.markerEl.classList.toggle('on', showM);
    a.markerEl.classList.toggle('quest', quest);
    if (showM) {
      a.markerEl.firstChild.textContent = quest ? '!' : '…';
      const bob = Math.sin(now / 300 + a.idx) * 4;
      a.markerEl.style.transform = `translate(${ms[0].toFixed(1)}px, ${(ms[1] - 10 + bob).toFixed(1)}px) translate(-50%, -100%) rotate(45deg)`;
    }
    const showE = !!s && a.emoteT > 0;
    a.emoteEl.classList.toggle('on', showE);
    if (showE) { const k = Math.min(1, (2.2 - a.emoteT) * 6); a.emoteEl.style.transform = `translate(${s[0].toFixed(1)}px, ${(s[1] - 22).toFixed(1)}px) translate(-50%, -100%) scale(${k.toFixed(3)})`; }
  }
  // emoção da Duda
  if (meEmote.t > 0) meEmote.t -= dt;
  const pe = meEmote.t > 0 && playing ? screenOf(_ov.p.copy(player.pos).addScaledVector(player.d, player.ch.st.pose === 'ground' ? 1.15 : 1.85), _sc) : null;
  meEmote.el.classList.toggle('on', !!pe);
  if (pe) { const k = Math.min(1, (2.2 - meEmote.t) * 6); meEmote.el.style.transform = `translate(${pe[0].toFixed(1)}px, ${pe[1].toFixed(1)}px) translate(-50%, -100%) scale(${k.toFixed(3)})`; }
  // placas e objetos ainda não lidos por perto
  let k = 0;
  if (state.mode === 'play' && !state.dialog) {
    for (const it of INTERACT) {
      if (k >= IMARK.length) break;
      if (state.read.has(it)) continue;
      const d = arcDist(player.d, it.dir); if (d > 6.5) continue;
      const s2 = screenOf(_ov.p.copy(it.pos).addScaledVector(it.dir, 0.55), _sc); if (!s2) continue;
      const el = IMARK[k++]; el.classList.add('on');
      el.style.transform = `translate(${s2[0].toFixed(1)}px, ${(s2[1] + Math.sin(now / 350 + k) * 3).toFixed(1)}px) translate(-50%, -100%) scale(${clamp(1.2 - d / 8, 0.6, 1).toFixed(2)})`;
    }
  }
  for (; k < IMARK.length; k++) IMARK[k].classList.remove('on');
  // aviso de interação (o <Prompt> do React)
  const t = state.mode === 'play' && !state.dialog ? target : null;
  const text = t ? (t.kind === 'npc' ? (t.a.pet ? 'FAZER CARINHO EM ' : 'CONVERSAR COM ') : 'VER: ') + t.name : null;
  if (getUI().prompt !== text) setUI({ prompt: text });
}
