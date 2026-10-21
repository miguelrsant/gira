// ================= diálogo =================
// aqui fica o ritmo da conversa (letra por letra, pausas, escolhas); quem desenha o cartão é o
// <DialogCard> (src/ui), a partir do que este módulo publica em getUI().dialog
import * as THREE from 'three';
import { setUI, getUI } from '../../store.js';
import { $ } from '../core/math.js';
import { sfx } from './audio.js';
import { PORT, setPortrait } from './render.js';
import { state } from './state.js';

const _tagC = new THREE.Color(), _inkC = new THREE.Color('#373f42');
let dialogN = 0;
export function openDialog(name, color, lines, opts = {}) {
  return new Promise((resolve) => {
    if (state.dialog) closeDialog(null);
    const d = state.dialog = {
      id: ++dialogN, name, color, tagd: '#' + _tagC.set(color).lerp(_inkC, 0.38).getHexString(),
      lines, i: 0, shown: 0, full: false, hold: 0, voice: opts.voice || 200, choices: opts.choices || null, choicesOn: false, sel: 0, choiceT: 0,
      resolve, speaker: opts.speaker || null, t: 0, toks: [],
    };
    setPortrait(d.speaker, color);
    buildLine(d);
    sfx.paper();
  });
}
// o que o cartão precisa para se desenhar
function publish(d) {
  setUI({ dialog: { id: d.id, name: d.name, color: d.color, tagd: d.tagd, port: !!PORT.ch, line: d.i, toks: d.toks, shown: d.shown, full: d.full, choices: d.choicesOn ? d.choices : null, sel: d.sel } });
}
// "*assim*" vira destaque: na cor de quem fala, ondulando (k = lugar da letra na onda)
function buildLine(d) {
  const toks = [];
  let em = false, k = 0;
  for (const ch of d.lines[d.i]) { if (ch === '*') { em = !em; continue; } toks.push({ ch, em, k: em && ch !== ' ' ? k++ : 0 }); }
  d.toks = toks; d.shown = 0; d.acc = 0; d.full = false; d.hold = 0.05;
  publish(d);
}
function revealTo(d, n) { d.shown = n; publish(d); }
function lineDone(d) {
  d.full = true;
  if (d.choices && d.i === d.lines.length - 1 && !d.choicesOn) { d.sel = 0; d.choiceT = 0; d.choicesOn = true; }
  publish(d);
}
export function selChoice(k) {
  const d = state.dialog; if (!d || !d.choicesOn) return;
  const n = d.choices.length; d.sel = ((k % n) + n) % n;
  publish(d);
}
// fromKey: teclado pode confirmar uma escolha; um toque solto na caixa nunca escolhe sozinho
export function advanceDialog(fromKey = false) {
  const d = state.dialog; if (!d || d.t < 0.15) return;
  if (!d.full) { revealTo(d, d.toks.length); lineDone(d); return; }
  if (d.choicesOn) { if (fromKey && d.choiceT > 0.35) { sfx.click(); closeDialog(d.sel); } return; }
  sfx.click();
  d.i++;
  if (d.i >= d.lines.length) { closeDialog(null); return; }
  buildLine(d);
}
// clique ou toque numa das respostas
export function pickChoice(k) {
  const d = state.dialog; if (!d || !d.choicesOn) return;
  sfx.click(); closeDialog(k);
}
export function closeDialog(choice) {
  const d = state.dialog; state.dialog = null;
  setPortrait(null);
  setUI({ dialog: null });
  if (d) { if (d.speaker) d.speaker.st.talk = false; d.resolve(choice); }
}
export function updateDialog(dt) {
  const d = state.dialog;
  if (getUI().talking !== !!d) setUI({ talking: !!d });
  if (!d) return;
  d.t += dt;
  if (d.choicesOn) d.choiceT += dt;
  if (!d.full) {
    const N = d.toks.length;
    if (d.hold > 0) d.hold -= dt;
    else {
      d.acc = Math.max(d.acc, d.shown) + dt * 44;
      const from = d.shown;
      let to = Math.min(N, Math.floor(d.acc));
      // respiro depois de ponto e de vírgula, como numa fala de verdade
      for (let i = from; i < to; i++) {
        const ch = d.toks[i].ch, nx = d.toks[i + 1];
        if (nx && nx.ch === ' ' && /[.!?…]/.test(ch)) { to = i + 1; d.acc = to; d.hold = 0.22; break; }
        if (nx && ch === ',') { to = i + 1; d.acc = to; d.hold = 0.09; break; }
      }
      if (to > from) {
        revealTo(d, to);
        if (/[a-zà-ú0-9]/i.test(d.toks[to - 1].ch) && (to % 2 === 0 || to - from > 1)) sfx.blip(d.voice);
      }
      if (d.shown >= N) lineDone(d);
    }
  }
  if (d.speaker) d.speaker.st.talk = !d.full;
  // onde a janela do retrato está na tela (o rosto é desenhado ali, no canvas)
  if (PORT.ch) {
    const el = $('dport'), b = el && el.getBoundingClientRect(), bw = el ? el.clientLeft : 0;
    PORT.rect = b && b.width > 2 * bw + 8 ? { x: b.left + bw, y: b.top + bw, w: b.width - 2 * bw, h: b.height - 2 * bw } : null;
  }
}
