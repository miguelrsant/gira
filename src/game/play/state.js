// ================= estado do jogo =================
import { LAP } from '../core/config.js';
import { clamp } from '../core/math.js';

export const state = {
  mode: 'loading',          // loading | title | intro | play | cutscene
  day: 1, week: 1, walked: 0, strike: false, sunday: false, declined: false,
  talked: new Set(), read: new Set(), pages: new Set(), visited: new Set(),
  dialog: null, musicOn: true, idleT: 0, district: null, autoSun: false, sunP: null, freeze: false,
  follow: 0, hints: new Set(), frame: 0,
};
// hora do dia, de 0 (07:00) a 1 (19:00): anda quando você anda
export function dayP() {
  if (state.sunday) return state.sunP ?? 0.6;
  if (state.autoSun && state.sunP !== null) return state.sunP;
  return clamp(state.walked / LAP, 0, 1);
}

// ================= controles =================
// teclas apertadas (por KeyboardEvent.code) e o joystick de toque; quem preenche é o input.js
export const keys = {};
export const joy = { id: null, cx: 0, cy: 0, x: 0, y: 0 };
