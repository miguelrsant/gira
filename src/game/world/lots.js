// ---------------- loteamento automático ao longo das ruas ----------------
import { SEA } from '../core/config.js';
import { lonOf, pickR, rand, rr } from '../core/math.js';
import { bHouse, bShop, bWarehouse } from './buildings.js';
import { ctxDir, subCtx } from './kit.js';
import { CONJ, LADEIRA, MAIN, VILA } from './layout.js';
import { addBoxCollider, besideRoad, BUILDS, FOOT, footFree, footOf, isReserved } from './places.js';
import { ROADS } from './roads.js';
import { addZone, baseH, roadNear, trailDist } from './terrain.js';

function fillRoad(rd, o) {
  const S = rd.S;
  for (const side of o.sides || [-1, 1]) {
    let s = o.offset || 0;
    while (s < rd.len - 1) {
      const i = Math.floor(s / rd.step) % S.length;
      const lonI = ((lonOf(S[i].d) % 360) + 360) % 360;
      if (o.lon && !lonIn(lonI, o.lon[0], o.lon[1])) { s += 2; continue; }
      const type = typeof o.type === 'function' ? o.type(S[i].d, side) : o.type;
      if (!type) { s += 2; continue; }
      const dims = type === 'house' ? [rr(4.2, 5.4), rr(3.8, 4.6), 1.6] : type === 'conj' ? [4.2, 4.0, 1.4] : type === 'ware' ? [rr(6, 8), rr(5, 6.5), 0] : [rr(3.6, 5.2), rr(3.8, 4.8), 0];
      const [w, d, yard] = dims;
      const c = besideRoad(rd, i, side, d + yard, o.setback ?? 0.4);
      const F = footOf(c, w + 0.2, d + yard + 0.2);
      let ok = footFree(F, 0.25) && !isReserved(c.d, Math.max(w, d) * 0.5);
      if (ok) {
        for (const [px, pz] of [[-w / 2, -(d + yard) / 2], [w / 2, -(d + yard) / 2], [-w / 2, (d + yard) / 2], [w / 2, (d + yard) / 2], [0, -(d + yard) / 2], [0, 0]]) {
          const q = ctxDir(c, px, pz);
          const rn = roadNear(q);
          if (rn && rn.dist < rn.road.hw + rn.road.sw + 0.25) { ok = false; break; }
          if (trailDist(q) < 0.6) { ok = false; break; }
          if (baseH(q) < SEA + 0.5 || Math.abs(baseH(q) - c.h) > 2.2) { ok = false; break; }
        }
      }
      if (ok) {
        FOOT.push(F);
        addZone(c.d, c.fwd, (w + 0.2) / 2 + 0.3, (d + yard + 0.2) / 2 + 0.3, { h: c.h, kind: type === 'house' ? 'grass' : 'paved', m: 1.8 });
        const bc = subCtx(c, 0, 0, -yard / 2);
        addBoxCollider(bc, w, d, 0, 0, true);
        if (yard) addBoxCollider(subCtx(c, 0, 0, (d + yard) / 2 - 0.05), w + 0.8, 0.3);
        const seed = Math.floor(rand() * 1e9);
        BUILDS.push(() => {
          if (type === 'house') bHouse(bc, { w, d, fl: rand() < 0.4 ? 2 : 1, yard, lotW: w + 0.8 });
          else if (type === 'conj') bHouse(bc, { w, d, fl: 1, yard, lotW: w + 0.8, wall: '#e9d9b8', roof: '#b5654a', win: 'grille', doorX: -1.1, murC: '#d8d3c4', doorC: '#8a6a4f' });
          else if (type === 'ware') bWarehouse(c, { w, d, h: rr(4, 5.5), wall: pickR(['#9fb3a9', '#b9b4a4', '#a9b7c0']) });
          else bShop(c, { w, d, fl: Math.floor(rr(1, 3.6)), front: rand() < 0.45 ? 'glass' : 'shutter', goods: pickR(['market', 'cheap', 'food', 'pharma']), shutter: pickR([0, 0, 1, 3, 4]), awning: rand() < 0.4 ? pickR([['#c25959', '#f4f4ef'], ['#66bde6', '#f4f4ef'], ['#8cc48c', '#f4f4ef'], ['#f3c258', '#de794e']]) : null, balcony: rand() < 0.4, sign: rand() < 0.55 ? pickR(SHOPNAMES) : null, signBg: pickR(['#f3c258', '#66bde6', '#c25959', '#8cc48c', '#de794e', '#373f42']), posters: rand() < 0.35 ? [pickR(['domingo', 'gira', 'foco', 'greve', 'gato'])] : null });
        });
        s += w + (o.gap ?? 0.8);
      } else s += 1.5;
    }
  }
}
const SHOPNAMES = ['BAZAR DA ROTINA', 'XEROX & CIA', 'AÇOUGUE BOI', 'PASTEL 24H', 'BAR DO ZÉ', 'ÓTICA VISTA CANSADA', 'LAN HOUSE', 'SAPATARIA', 'CONSERTOS', 'BOTECO', 'PET SHOP', 'PAPELARIA', 'AÇAÍ', 'SALÃO', 'CAFÉ DO PONTO', 'LAVANDERIA'];
function lonIn(l, a, b) { l = ((l % 360) + 360) % 360; a = ((a % 360) + 360) % 360; b = ((b % 360) + 360) % 360; return a <= b ? l >= a && l <= b : l >= a || l <= b; }
export function fillLots() {
  fillRoad(MAIN, { lon: [-24, 72], type: (d) => (lonOf(d) < 10 && lonOf(d) > -30 ? 'house' : 'shop') });
  fillRoad(MAIN, { lon: [72, 132], type: (d, side) => (side > 0 ? 'house' : 'shop') });
  fillRoad(MAIN, { lon: [132, 190], type: 'ware', gap: 1.5 });
  fillRoad(MAIN, { lon: [190, 262], sides: [1], type: 'shop', gap: 1.2 });
  fillRoad(MAIN, { lon: [262, 340], sides: [-1], type: 'house', gap: 2.5 });
  fillRoad(MAIN, { lon: [340, 360], type: 'house' });
  fillRoad(VILA, { type: 'house', gap: 0.6 });
  fillRoad(ROADS.find((r) => r.name === 'Rua das Flores'), { type: 'house', gap: 0.6 });
  fillRoad(CONJ, { type: 'conj', gap: 0.5 });
  fillRoad(LADEIRA, { type: 'house', gap: 3.5, sides: [1] });
}
