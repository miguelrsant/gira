// objetos de cena que dependem do roteiro
import { R } from '../core/config.js';
import { arcDist } from '../core/math.js';
import { K, placeDir, subCtx } from '../world/kit.js';
import { PIER } from '../world/layout.js';
import { addBoxCollider, BUILDS, COLLIDERS, SPOTS } from '../world/places.js';

export function storyProps() {
  // caixote do coach
  BUILDS.push(() => { const c = SPOTS.academia; K.box(c, -1.3, 0, 3.15, 0.9, 0.5, 0.8, '#b48d63', { id: 3, pat: 3 }); addBoxCollider(subCtx(c, -1.3, 0, 3.15), 0.9, 0.8); });
  // balde e caixa de isopor do Tonho, na ponta do píer
  BUILDS.push(() => {
    const S = PIER.S, s = S[S.length - 3];
    const c = placeDir(s.d.clone().addScaledVector(s.s, 0.55 / R).normalize(), s.t.clone(), { h: s.h });
    K.cyl(c, 0, 0, 0, 0.18, 0.34, '#4f86b8', { n: 10, top: 1.15 });
    K.box(c, 0.1, 0, -0.65, 0.5, 0.36, 0.34, '#f4f4ef', { id: 5 });
    K.box(c, 0.1, 0.36, -0.65, 0.54, 0.06, 0.38, '#66bde6', { id: 5 });
  });
  // a roda de hamster ocupa o centro do lote (substitui o colisor redondo provisório)
  for (let i = COLLIDERS.length - 1; i >= 0; i--) { const co = COLLIDERS[i]; if (!co.box && SPOTS.wheel && arcDist(co.d, SPOTS.wheel.d) < 3.2) COLLIDERS.splice(i, 1); }
  addBoxCollider(SPOTS.wheel, 3.5, 4.0, 0, 0, true);
}
