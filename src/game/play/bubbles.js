// ================= balões, marcadores e emoções no mundo =================
// ficam numa camada própria (#bubbles), fora do React: mudam de lugar a cada quadro
import { R } from '../core/config.js';
import { $, clamp, V3 } from '../core/math.js';
import { camera } from '../core/renderer.js';
import { view } from '../core/screen.js';
import { sfx } from './audio.js';

const bubblesLayer = $('bubbles');
export function makeOverlay(a) {
  const mk = (cls) => { const el = document.createElement('div'); el.className = cls; bubblesLayer.appendChild(el); return el; };
  a.bubbleEl = mk('bubble'); a.markerEl = mk('marker'); a.markerEl.appendChild(document.createElement('span')); a.emoteEl = mk('emote');
}
// a emoção da própria Duda
export const meEmote = { el: document.createElement('div'), t: 0 };
meEmote.el.className = 'emote'; bubblesLayer.appendChild(meEmote.el);
export const IMARK = []; for (let i = 0; i < 4; i++) { const el = document.createElement('div'); el.className = 'marker read'; el.appendChild(document.createElement('span')); el.firstChild.textContent = '?'; bubblesLayer.appendChild(el); IMARK.push(el); }
export function showEmote(a, txt) {
  if (a) { a.emoteEl.textContent = txt; a.emoteT = 2.2; }
  else { meEmote.el.textContent = txt; meEmote.t = 2.2; }
  sfx.pop(a ? 1.2 : 1);
}
const _ov = { q: V3() };
// posição na tela (px) ou null se atrás da câmera / escondido pelo planeta
export function screenOf(pos, out) {
  const cp = camera.position;
  // planeta no meio do caminho?
  const dx = pos.x - cp.x, dy = pos.y - cp.y, dz = pos.z - cp.z, L2 = dx * dx + dy * dy + dz * dz;
  const t = clamp(-(cp.x * dx + cp.y * dy + cp.z * dz) / L2, 0, 1);
  const cx = cp.x + dx * t, cy = cp.y + dy * t, cz = cp.z + dz * t;
  if (t > 0.02 && t < 0.98 && cx * cx + cy * cy + cz * cz < (R - 0.8) * (R - 0.8)) return null;
  _ov.q.copy(pos).project(camera);
  if (_ov.q.z > 1 || _ov.q.z < -1) return null;
  out[0] = (_ov.q.x * 0.5 + 0.5) * view.w; out[1] = (-_ov.q.y * 0.5 + 0.5) * view.h;
  return out;
}
export function headPos(a, out) {
  const ch = a.ch, up = a.up || a.d, st = ch.st;
  let h = ch.height + 0.22;
  if (st.pose === 'sit') h *= 0.8; else if (st.pose === 'lounge') h *= 0.62; else if (st.pose === 'ground') h *= 0.6;
  else if (ch.pet && st.pose === 'sleep') h *= 0.7;
  return out.copy(ch.rig.position).addScaledVector(up, h);
}
// ponto fora da tela: prende na borda (seta do objetivo)
export function edgeOf(pos, out) {
  _ov.q.copy(pos).project(camera);
  let x = _ov.q.x, y = _ov.q.y;
  if (_ov.q.z > 1) { x = -x; y = -y; }
  const m = Math.max(Math.abs(x) / 0.86, Math.abs(y) / 0.8, 1e-3);
  if (m > 1 || _ov.q.z > 1) { x /= m; y /= m; }
  out[0] = (x * 0.5 + 0.5) * view.w; out[1] = (-y * 0.5 + 0.5) * view.h;
  return out;
}
