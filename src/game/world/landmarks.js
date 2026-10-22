// ---------------- marcos (lugares com nome) ----------------
import { R, SEA } from '../core/config.js';
import { D2R, dirOf, headingVec, latOf, lonOf, pickR, rand, rr } from '../core/math.js';
import {
  bBeachKiosk, bBusStop, bClockTower, bFountain, bGuardBooth, bHouse, bKiosk, bLifeguard, bMansion,
  bOrelhao, bPodium, bSchool, bShop, bStatue, bTower, bWarehouse, chimney,
} from './buildings.js';
import {
  barrel, bench, boat, buoy, crate, fence, goal, lampPost, mailbox, picnic, planter, pot, rock,
  signPost, slide, swing, towel, umbrella, vending,
} from './furniture.js';
import { ctxDir, drop, K, placeAt, placeDir, subCtx } from './kit.js';
import { MAIN } from './layout.js';
import { ROADS } from './roads.js';
import {
  addBoxCollider, addCircle, addCircleLocal, besideRoad, BUILDS, COLLIDERS, district, DYN, FOOT,
  footOf, interact, lot, nearestSample, onSidewalk, PAGES, reserve, solid, SPOTS,
} from './places.js';
import { leafCF, LEAVES, palm, tree } from './plants.js';
import {
  fieldLine, hammock, lighthouse, loungeChair, plazaDisc, poolAt, rowboat, scarecrow, wheelFrame,
} from './special.js';
import { addZone, baseH, H } from './terrain.js';
import { texClock, texDoor, texMenu, texSign, texWishes } from './textures.js';

export function addLandmarks() {
  // Praça do Relógio
  district('PRAÇA DO RELÓGIO', 'o centro do mundo (dizem)', 18, 2, 9);
  {
    const c = placeAt(18, 2, 180);
    addZone(c.d, c.fwd, 5.6, 5.6, { h: c.h, round: true, kind: 'paved', m: 2 });
    reserve(18, 2, 7);
    FOOT.push(footOf(c, 11, 11));
    BUILDS.push(() => {
      plazaDisc(c, 5.4);
      bClockTower(subCtx(c, 0, 0, 0)); addBoxCollider(c, 3.2, 3.2, 0, 0, true);
      const st = drop(subCtx(c, -3.2, 0, 1.2, 0.5), 0, 0); bStatue(st); addBoxCollider(st, 1.8, 1.8);
      const fo = drop(subCtx(c, 3.1, 0, -1.6), 0, 0); bFountain(fo); addCircleLocal(c, 3.1, -1.6, 2.1);
      for (const [x, z, ry] of [[-1.8, 3.6, Math.PI], [1.9, 3.6, Math.PI], [-4.2, -1.5, Math.PI / 2], [0.6, -4.3, 0]]) bench(c, x, z, ry);
      for (const [x, z] of [[-4.0, -3.4], [4.2, 2.6], [-0.9, -4.6]]) { tree(c, x, z, 0.95); addCircleLocal(c, x, z, 0.45); }
      for (const [x, z] of [[-4.6, 2.2], [4.6, -2.8], [2.8, 4.4], [-2.6, -4.4]]) lampPost(c, x, z);
      planter(c, 0, 4.6, 2.2);
      bOrelhao(drop(subCtx(c, 4.9, 0, 0.4, -Math.PI / 2), 0, 0));
      K.box(c, -2.0, 0, -2.6, 0.7, 0.75, 0.55, '#5a8f73', { id: 5, layer: 'small' });
      K.pl(c, -2.0, 0.5, -2.32, 0.55, 0.35, texSign('ACHADOS E\nPERDIDOS', '#5a8f73', '#f4f4ef', { font: 'lbl', w: 256, h: 160 }), { id: 6 });
    });
    interact(c, 0, 1.2, 1.4, { name: 'PLACA', lines: ['RELÓGIO DA PRAÇA — anda só quando você anda.', 'Doado pela Família Otávio, que não anda.'] });
    interact(c, -3.2, 1.0, 2.0, { name: 'ESTÁTUA', lines: ['AVÔ OTÁVIO (1952). Deu uma volta no planeta, uma vez.', 'A família descansa desde então.', 'Alguém deixou um tênis gasto no pedestal.'] });
    interact(c, -2.0, 0.6, -2.1, { name: 'ACHADOS E PERDIDOS', lines: ['Dentro da caixa: 1 fim de semana, pouco usado.', '3 férias vencidas. Um guarda-chuva. A vontade de alguém.'] });
    interact(c, 4.9, 1.2, 0.4, { name: 'ORELHÃO', lines: ['Você tira o fone do gancho.', 'Gravação: "Sua ligação é muito importante para nós. Continue andando."'] });
    SPOTS.plaza = c;
  }
  // casa da Duda
  {
    const i = nearestSample(MAIN, 4, -18), c = besideRoad(MAIN, i, 1, 4.6 + 2.0, 0.5);
    const hc = subCtx(c, 0, 0, -1.0);
    lot(c, 5.4, 6.6, { cz: 0 });
    BUILDS.push(() => { bHouse(hc, { w: 4.8, d: 4.4, fl: 2, wall: '#a9d1c4', roof: '#c4734f', yard: 1.6, lotW: 5.4, doorX: 0.9 }); mailbox(c, -1.6, 2.9); });
    interact(c, -1.6, 1.0, 2.9, { name: 'CAIXA DE CORREIO', lines: ['Contas. Contas. Um panfleto:', '"Trabalhe de casa! (E da rua, e do ônibus, e da cama.)"'] });
    SPOTS.liaHouse = c;
    SPOTS.spawn = { d: ctxDir(c, 0.9, 4.3), fwd: c.fwd.clone() };
  }
  // GIRA S.A.
  {
    const i = nearestSample(MAIN, 4.5, 22), c = besideRoad(MAIN, i, 1, 7 + 3.4, 0.4);
    // o nome aparece em volta do prédio (antes ficava do outro lado da avenida, em cima do campinho)
    district('GIRA S.A.', 'sede da empresa que gira o planeta', latOf(c.d), lonOf(c.d), 7);
    lot(c, 7.4, 10.6, { colW: 7, colD: 7, ccz: -1.7 });
    const tc = subCtx(c, 0, 0, -1.7);
    BUILDS.push(() => {
      bTower(tc, {});
      const pc = drop(subCtx(c, -1.6, 0, 3.2), 0, 0); bPodium(pc); addBoxCollider(pc, 1.6, 1.4);
      // relógio de ponto
      { const k = drop(c, 1.2, 3.7); K.box(k, 1.2, -0.5, 3.7, 0.5, 1.7, 0.4, '#4b5658', { id: 5, layer: 'small' }); K.pl(k, 1.2, 1.0, 3.91, 0.36, 0.36, texClock(), { id: 6 }); solid(k, 1.2, 3.7, 0, 0.5, 0.4); }
      for (const x of [-3.0, 3.0]) planter(c, x, 4.7, 1.2);
      vending(c, 2.15, 3.9, 'foco');
    });
    interact(c, 1.2, 1.0, 3.9, { name: 'RELÓGIO DE PONTO', lines: ['CLAC.', 'Você já bateu o ponto hoje. E ontem. E amanhã, provavelmente.'] });
    interact(c, 2.15, 1.0, 4.3, { name: 'MÁQUINA', lines: ['ENERGÉTICO FOCO — agora com 300% mais segunda-feira.', 'Você aperta o botão. Sai uma lata escrita "só mais uma volta".'] });
    interact(c, -3.2, 3.0, 1.9, { name: 'FAIXA', lines: ['"SOMOS UMA FAMÍLIA."', 'Embaixo, bem pequeno: "família não recebe hora extra".'] });
    SPOTS.valdir = { c, x: -1.6, z: 3.2, y: 0.35 };
  }
  // Rua do Comércio
  district('RUA DO COMÉRCIO', 'aberto de segunda a segunda', 6, 44, 12);
  const shops = [
    [34, 1, { sign: 'PÃO DE CADA DIA', signBg: '#de794e', front: 'glass', goods: 'bread', awning: ['#f3c258', '#f4f4ef'], wall: '#f0dcae', w: 5.2, d: 4.4, fl: 1 }, 'nara'],
    [41, 1, { sign: 'LOTÉRICA SORTE GRANDE', signBg: '#4f86b8', front: 'glass', goods: 'cheap', wall: '#e6e1d3', w: 4.2, d: 4, fl: 2, posters: ['sorte'] }, 'loterica'],
    [48, 1, { sign: 'DROGARIA DESCANSO', signBg: '#66bde6', front: 'glass', goods: 'pharma', wall: '#f4f4ef', w: 4.6, d: 4.2, fl: 2, balcony: true }, 'farmacia'],
    [56, 1, { sign: 'CORTE & VOLTA', signBg: '#c25959', front: 'glass', goods: 'cheap', wall: '#c4cdc5', w: 3.8, d: 4, fl: 1, posters: ['show'] }, 'barbeiro'],
    [29, -1, { sign: 'MERCADO DA ESQUINA', signBg: '#c25959', front: 'glass', goods: 'market', awning: ['#c25959', '#f4f4ef'], wall: '#e3d7c0', w: 5.4, d: 4.6, fl: 1 }, 'mercado'],
    [37, -1, { sign: 'MARMITA EXPRESS', signBg: '#8cc48c', signFg: '#373f42', front: 'shutter', shutter: 3, wall: '#efd0a0', w: 4.2, d: 4, fl: 2 }, 'marmita'],
    [44, -1, { sign: 'TUDO POR 1,99', signBg: '#f3c258', signFg: '#c25959', front: 'glass', goods: 'cheap', awning: ['#66bde6', '#f4f4ef'], wall: '#cfd8d6', w: 4.6, d: 4.2, fl: 1 }, 'loja199'],
    [52, -1, { sign: 'ACADEMIA FOCO TOTAL', signBg: '#373f42', signFg: '#f3c258', front: 'glass', goods: 'gym', wall: '#bcc7c0', w: 5.0, d: 4.4, fl: 2, posters: ['coach', 'foco'] }, 'academia'],
  ];
  for (const [lon, side, spec, key] of shops) {
    const i = nearestSample(MAIN, 5, lon), c = besideRoad(MAIN, i, side, spec.d, 0.35);
    lot(c, spec.w, spec.d);
    BUILDS.push(() => bShop(c, spec));
    SPOTS[key] = c;
  }
  interact(SPOTS.loterica, 0, 1.4, 2.3, { name: 'LOTÉRICA', lines: ['PRÊMIO ACUMULADO: 1 DOMINGO.', 'Você raspa a raspadinha: "TENTE OUTRA VOLTA".'] });
  interact(SPOTS.farmacia, 0, 1.4, 2.4, { name: 'VITRINE', lines: ['PROMOÇÃO: analgésico + energético = COMBO SEGUNDA-FEIRA.', 'Leve 6, pague 6. Não tem 7.'] });
  interact(SPOTS.academia, 1.6, 1.5, 2.5, { name: 'CARTAZ', lines: ['CURSO MINDSET 7x0 com Rafa Foco.', 'Aprenda a descansar andando. Ou a andar descansando. Tanto faz, só 12x de 97.'] });
  interact(SPOTS.marmita, -1.0, 1.4, 2.3, { name: 'CARDÁPIO', lines: ['HOJE: marmita. Almoço em 4 minutos.', 'O quinto minuto é cobrado à parte.'] });
  interact(SPOTS.barbeiro, 1.2, 1.5, 2.3, { name: 'CARTAZ', lines: ['HOJE: SAMBA NA PRAÇA.', 'Por cima, um adesivo: CANCELADO (DEMANDA ALTA).'] });
  BUILDS.push(() => { K.board(SPOTS.marmita, -1.0, 1.35, 2.15, 0.6, 0.75, texMenu(), {}); });
  // banca da Neide
  {
    // no terreno vazio depois das lojas (na calçada ela entrava na padaria)
    const i = nearestSample(MAIN, 5, 62.5), c = besideRoad(MAIN, i, 1, 1.9, 0.35);
    lot(c, 3.2, 2.8, { collide: false });
    BUILDS.push(() => bKiosk(c, {})); addBoxCollider(c, 2.6, 2.4, 0, 0.3, true); FOOT.push(footOf(c, 2.8, 2.8));
    SPOTS.neide = { c, x: 0.4, z: -0.2, y: 0 };
    interact(c, -0.8, 1.2, 1.4, { name: 'JORNAL', news: true, lines: [] });
  }
  // ponto de ônibus
  {
    const i = nearestSample(MAIN, 6, 61), c = onSidewalk(MAIN, i, -1, 0.75);
    BUILDS.push(() => bBusStop(c)); addBoxCollider(subCtx(c, 0, 0, -0.5), 3.0, 1.0);
    interact(c, 1.75, 1.6, 0.2, { name: 'PONTO DE ÔNIBUS', lines: ['PRÓXIMO ÔNIBUS: SEGUNDA-FEIRA.', 'Embaixo, a lápis: "sempre segunda-feira".'] });
  }
  // campinho
  {
    // atrás das lojas da Rua do Comércio, no gramado aberto (antes ficava embaixo delas)
    const i = nearestSample(MAIN, 4.5, 28), c0 = besideRoad(MAIN, i, -1, 6.5, 5.8), c = placeDir(c0.d, c0.fwd, { h: baseH(c0.d) });
    lot(c, 10, 6.5, { kind: 'field', collide: false, m: 2.4 });
    reserve(latOf(c.d), lonOf(c.d), 6);
    district('CAMPINHO', 'proibido jogar bola em dia útil', latOf(c.d), lonOf(c.d), 6);
    BUILDS.push(() => {
      goal(c, -4.8, 0, Math.PI / 2); goal(c, 4.8, 0, -Math.PI / 2);
      for (const [x0, z0, x1, z1] of [[-5, -3.2, 5, -3.2], [-5, 3.2, 5, 3.2], [0, -3.2, 0, 3.2]]) fieldLine(c, x0, z0, x1, z1);
      K.sph(c, 1.2, 0.18, 0.8, 0.18, 0.18, 0.18, '#f4f4ef', { id: 7, layer: 'small' });
      signPost(c, -5.6, 3.6, texSign('PROIBIDO JOGAR\nBOLA EM DIA ÚTIL', '#f4f4ef', '#c25959', { font: 'lbl', w: 256, h: 160 }), 1.1, 0.7);
    });
    interact(c, -5.6, 1.6, 3.6, { name: 'PLACA', lines: ['PROIBIDO JOGAR BOLA EM DIA ÚTIL.', 'Pela escala, todo dia é útil.'] });
    PAGES.push({ c, x: 4.6, y: 0.8, z: 0.6, note: 'Domingo: futebol no campinho. Perdemos de 7 a 1 e ninguém ligou.' });
  }
  // Vila do Sossego
  district('VILA DO SOSSEGO', 'o nome é antigo', 25, 92, 11);
  {
    // o banco do Seu Lino fica no canteiro entre a Rua das Flores e a do Sossego
    // (a praça redonda de antes caía em cima da calçada da Rua do Sossego e o chão dela afundava)
    const flores = ROADS.find((r) => r.name === 'Rua das Flores');
    const d0 = dirOf(28.5, 99.5), fs = flores.S[nearestSample(flores, 28.5, 99.5)];
    const c = placeDir(d0, fs.s.clone().multiplyScalar(-1)), cb = drop(c, 0, 0);
    reserve(28.5, 99.5, 2.6);
    BUILDS.push(() => {
      bench(cb, 0, 0, Math.PI); tree(c, -2.5, 0, 0.9); addCircleLocal(c, -2.5, 0, 0.4); lampPost(c, 2.3, 0);
      pot(c, 1.35, 0, 0.8); pot(c, -1.35, 0, 0.8);
      K.pl(cb, 0.9, 0.62, 0.305, 0.32, 0.12, texSign('EM MEMÓRIA', '#a07c48', '#f3e1b0', { font: 'lbl', w: 256, h: 96 }), { id: 6 });
    });
    interact(cb, 0.9, 0.6, 0.4, { name: 'PLAQUINHA', lines: ['"Banco em memória de quem sentou aqui."', 'Ninguém nunca sentou. Só o Seu Lino.'] });
    SPOTS.lino = { c: cb, x: 0, z: 0.25, y: 0, ry: Math.PI };
  }
  // escola
  district('ESCOLA GALILEU GALILEI', 'e no entanto, ela se move', 47, 100, 8);
  {
    const c = placeAt(47.5, 100, 180);
    lot(c, 13.4, 6.0, { padD: 1.0, cz: 0.4 });
    reserve(47.5, 100, 7);
    BUILDS.push(() => {
      bSchool(c, {});
      K.cyl(c, 5.6, 0, 4.4, 0.06, 6.0, '#d9dcd3', { n: 6 });
      K.box(c, 6.15, 5.0, 4.4, 1.1, 0.7, 0.02, '#8cc48c', { id: 7 });
      const wc = subCtx(c, -3.5, 0, 4.0);
      K.box(wc, 0, -0.3, 0, 4.2, 1.9, 0.25, '#efe0b9', { id: 4, pat: 1 });
      K.pl(wc, 0, 0.85, 0.13, 3.9, 1.45, texWishes(), { id: 6 });
      K.pl(c, 2.2, 1.6, 2.765, 0.9, 0.5, texSign('E PUR\nSI MUOVE', '#a07c48', '#f3e1b0', { font: 'lbl', w: 256, h: 140 }), { id: 6 });
    });
    addBoxCollider(subCtx(c, -3.5, 0, 4.0), 4.2, 0.4);
    interact(c, -3.5, 1.0, 4.4, { name: 'MURAL DOS DESEJOS', lines: ['"Um domingo inteiro." "Ver meu pai acordado." "Dormir até tarde."', '"Que a mãe ria." "Ser astronauta (sem dar volta)." "Parar um pouco."'] });
    interact(c, 2.2, 1.5, 3.1, { name: 'PLACA', lines: ['"E PUR SI MUOVE" — e no entanto, ela se move.', 'Galileu disse isso do planeta. A professora explica: sozinho. Ele gira sozinho.'] });
    SPOTS.bia = { c, x: 1.2, z: 4.6, y: 0, ry: 0 };
    PAGES.push({ c, x: -5.5, y: 0.8, z: -3.8, note: 'Domingo: soltei pipa com a Bia. A linha arrebentou e a pipa foi embora feliz.' });
  }
  // Morro dos Ricos (mansão no polo norte)
  district('MORRO DOS RICOS', 'vista privativa', 84, 70, 10);
  {
    const c = placeDir(dirOf(84.6, 70), headingVec(dirOf(84.6, 70), 180), { h: 6.2 });
    reserve(86, 70, 10.5);
    FOOT.push(footOf(c, 16, 16));
    // piscina no jardim do lado da casa, num terraço plano (o morro é redondo); a frente fica livre do portão até a escada
    const PX = 6.45, PZ = -1.2;
    { const pd = ctxDir(c, PX, PZ); addZone(pd, c.fwd, 1.4, 2.7, { h: 6.2, pn: pd, kind: 'grass', m: 1.2, prio: 1.05 }); }
    addBoxCollider(subCtx(c, 0, 0, -2.2), 10, 7, 0, 0, true);
    addBoxCollider(subCtx(c, PX, 0, PZ), 2.4, 5.0);
    BUILDS.push(() => {
      bMansion(subCtx(c, 0, 0, -2.2));
      poolAt(subCtx(drop(subCtx(c, PX, 0, PZ), 0, 0, { radial: true, max: 3 }), 0, 0.12, 0), 1.8, 4.4);
      for (const sx of [-1, 1]) { palm(c, sx * 5.6, 3.2, 1.0); addCircleLocal(c, sx * 5.6, 3.2, 0.4); }
      umbrella(c, 4.6, 3.0, '#f4f4ef', '#de794e');
      // espreguiçadeiras no gramado da frente, viradas para a vista, fora do caminho do portão
      for (const sx of [-1, 1]) loungeChair(drop(subCtx(c, sx * 3.6, 0, 4.0, Math.PI), 0, 0, { max: 3 }));
      planter(c, -5.7, -0.2, 1.4);
    });
    SPOTS.otavio = { c: drop(subCtx(c, -3.6, 0, 4.0, Math.PI), 0, 0, { max: 3 }), x: 0, z: 0, y: 0.32 };
    PAGES.push({ c, x: 5.3, y: 0.8, z: 1.6, note: 'Domingo: fiquei na beira da piscina. Era de um vizinho. Ninguém viu.' });
    // muro circular com portão voltado para a Ladeira
    BUILDS.push(() => {
      const ctr = dirOf(90, 0), rad = 9.4, n = 44;
      for (let k = 0; k < n; k++) {
        const lon = k / n * 360;
        if (Math.abs(((lon - 70 + 540) % 360) - 180) < 7) continue;
        const lat = 90 - rad / R / D2R;
        const d = dirOf(lat, lon), fwd = d.clone().sub(ctr).normalize();
        const wc = placeDir(d, fwd, { h: H(d) });
        K.box(wc, 0, -1.6, 0, 0.3, 3.0, 1.45, '#f1eee4', { id: 4, pat: 1 });
        K.box(wc, 0, 1.4, 0, 0.42, 0.1, 1.5, '#e5c27a', { id: 5 });
        COLLIDERS.push({ d: d.clone(), r: 0.75 });
      }
      const gd = dirOf(90 - rad / R / D2R - 0.6, 70), gc = placeDir(gd, headingVec(gd, 0), {});
      for (const x of [-1.7, 1.7]) { const pc = drop(gc, x, 0); K.box(pc, x, -1.4, 0, 0.5, 3.4, 0.5, '#f1eee4', { id: 4 }); K.sph(pc, x, 2.15, 0, 0.3, 0.3, 0.3, '#e5c27a', { id: 5 }); addCircleLocal(gc, x, 0, 0.35); }
      K.pl(gc, -1.35, 1.0, 0.6, 1.3, 1.9, texDoor('gate', '#e5c27a'), { id: 6, ry: 0.9 });
      K.pl(gc, 1.35, 1.0, 0.6, 1.3, 1.9, texDoor('gate', '#e5c27a'), { id: 6, ry: -0.9 });
      const bc = drop(subCtx(gc, 3.4, 0, -1.6, 0), 0, 0); bGuardBooth(bc); addBoxCollider(bc, 1.6, 2.2, 0, 0.5); // colisor vai até o muro: sem cantinho para ficar preso
      K.box(gc, -2.3, 1.0, -0.3, 0.25, 0.35, 0.1, '#4b5658', { id: 5 });
      interact(gc, -2.3, 1.2, -0.1, { name: 'INTERFONE', lines: ['Você aperta. Chiado. Uma voz:', '"O Sr. Otávio está descansando. Ele está sempre descansando."'] });
      SPOTS.josue = { c: gc, x: 2.4, z: -0.5, y: 0, ry: 0 };
      // virada para quem chega pela Ladeira
      K.board(subCtx(gc, 0, 0, 0, Math.PI), 0, 2.7, 0.15, 2.6, 0.5, texSign('VILA OTÁVIO', '#f4f4ef', '#c25959', { font: 'lbl' }), { frame: '#e5c27a' });
    });
  }
  // Fábrica de Voltas
  {
    // a fábrica fica do lado norte da avenida: a rua de acesso que ia para o sul acabava no nada e foi tirada
    const i = nearestSample(MAIN, -16, 146), c = besideRoad(MAIN, i, -1, 7.5, 2.6);
    district('FÁBRICA DE VOLTAS', 'movida a gente', latOf(c.d), lonOf(c.d), 10);
    lot(c, 11, 7.5);
    reserve(latOf(c.d), lonOf(c.d), 7);
    BUILDS.push(() => {
      bWarehouse(c, { w: 11, d: 7.5, h: 5.6, sign: 'FÁBRICA DE VOLTAS', graffiti: '6x1 NÃO' });
      chimney(c, -3.2, -2.2, 11); chimney(c, -0.8, -2.6, 9.5, 0.45);
      // encostados na parede, e um colisor só para a fileira toda (entre um barril e um caixote sobrava um vão onde dava para ficar preso)
      for (let k = 0; k < 3; k++) barrel(c, 5.84, 1.2 - k * 0.7, k % 2 ? '#c25959' : '#4f86b8');
      crate(c, 5.92, -1.6, 0.8); crate(c, 5.82, -2.5, 0.6, 0.4);
      addBoxCollider(subCtx(c, 5.95, 0, -0.65), 0.95, 4.3);
    });
    interact(c, 0, 4.2, 4.1, { name: 'PICHAÇÃO', lines: ['"6x1 NÃO". A tinta ainda está fresca.', 'Embaixo, outra letra: "e o domingo, cadê?"'] });
    PAGES.push({ c, x: 3.8, y: 0.8, z: -5.2, note: 'Domingo: a fábrica parou e deu pra ouvir os passarinhos.' });
    // roda de hamster gigante
    const j = nearestSample(MAIN, -20, 166), wc = besideRoad(MAIN, j, -1, 4.5, 1.6);
    lot(wc, 5.4, 4.6, { collide: false });
    COLLIDERS.push({ d: ctxDir(wc, 0, -1.6), r: 2.2 }, { d: ctxDir(wc, -2.4, 0.6), r: 0.6 }, { d: ctxDir(wc, 2.4, 0.6), r: 0.6 });
    BUILDS.push(() => wheelFrame(wc));
    SPOTS.wheel = wc;
    interact(wc, 2.9, 1.2, 1.9, { name: 'PLACA', lines: ['RODA Nº 1 — gira o planeta desde 1952.', 'Combustível: gente. Rendimento: excelente. Para a empresa.'] });
  }
  // Conjunto Esteira Feliz: casas todas iguais
  district('CONJUNTO ESTEIRA FELIZ', 'todas as casas iguais, todos os dias iguais', -22, 108, 9);
  // Praia do Intervalo
  district('PRAIA DO INTERVALO', 'três minutos de mar', -31, 230, 13);
  {
    reserve(-33, 230, 15);
    const beach = (lat, lon, hd) => placeAt(lat, lon, hd ?? 180);
    BUILDS.push(() => {
      const lg = beach(-33.5, 214, 180); bLifeguard(lg); addBoxCollider(lg, 2, 2);
      const kc = beach(-31.4, 246, 0); bBeachKiosk(kc, { sign: 'QUIOSQUE 3 MINUTOS' }); addBoxCollider(kc, 2.8, 1.8);
      const um = [[-33, 222, '#f4f4ef', '#66bde6'], [-35.5, 226, '#f3c258', '#c25959'], [-34, 238, '#f4f4ef', '#de794e'], [-36.5, 242, '#8cc48c', '#f4f4ef'], [-33.4, 252, '#f4f4ef', '#c25959']];
      for (const [la, lo, c1, c2] of um) { const uc = beach(la, lo, rand() * 360); umbrella(uc, 0, 0, c1, c2); towel(uc, 0.6, 0.4, rand() * 3, pickR(['#66bde6', '#c25959', '#f3c258', '#8cc48c'])); addCircle(uc.d, 0.3); }
      for (const [la, lo, hd] of [[-36.5, 207, 60], [-37.5, 211, 100]]) { const bc = beach(la, lo, hd); boat(bc, 0, 0, 0, { color: '#3f8fc2', y: -0.25 }); addBoxCollider(bc, 4.2, 1.6); }
      for (const [la, lo] of [[-30.4, 210], [-30.6, 224], [-30.4, 238], [-30.8, 252], [-31, 205], [-31.4, 257]]) { const pc = beach(la, lo, rand() * 360); palm(pc, 0, 0, rr(0.9, 1.15)); addCircle(pc.d, 0.4); }
      const sc = beach(-27.2, 230.6, 0); // de frente para a avenida, de onde a gente chega
      signPost(sc, 0, 0, texSign('PRAIA', '#66bde6', '#f4f4ef', { w: 256, h: 128 }), 1.0, 0.5);
      interact(sc, 0, 1.6, 0.2, { name: 'PLACA', lines: ['PRAIA DO INTERVALO — aberta aos domingos.', '(Domingos suspensos até segunda ordem.)'] });
      interact(lg, 0, 1.5, 1.4, { name: 'POSTO', lines: ['"Salva-vidas em horário de almoço desde 2019."', 'O almoço dele já dura mais que a semana de todo mundo.'] });
      for (const [la, lo] of [[-44, 222], [-46, 244], [-42, 256]]) { const bc = beach(la, lo, 0); buoy(bc, 0, 0, SEA - bc.h); }
    });
    SPOTS.tonho = null;
  }
  // ilha do sinal fraco
  district('ILHA DO SINAL FRACO', 'ninguém te liga aqui', -74, 236, 6);
  {
    const c = placeAt(-75.5, 240, 0);
    reserve(-74, 236, 6);
    BUILDS.push(() => {
      lighthouse(c); addCircle(c.d, 1.3);
      const p1 = placeAt(-72, 228, 0), p2 = placeAt(-70.5, 236, 0);
      palm(p1, 0, 0, 1.0); palm(p2, 0, 0, 0.9); addCircle(p1.d, 0.4); addCircle(p2.d, 0.4);
      hammock(p1, p2);
      const sc = placeAt(-67.5, 236, 0); signPost(sc, 0, 0, texSign('SEM SINAL', '#f4f4ef', '#373f42', { font: 'lbl', w: 256, h: 128 }), 0.9, 0.45, Math.PI);
      interact(sc, 0, 1.6, 0, { name: 'PLACA', lines: ['ILHA DO SINAL FRACO.', 'Aqui o chefe não consegue te ligar. O lugar mais procurado do planeta.'] });
      for (const [la, lo, s] of [[-78, 226, 1.2], [-70, 246, 0.9], [-80, 250, 1.4]]) { const rc = placeAt(la, lo, rand() * 360); rock(rc, 0, 0, s); }
    });
    interact(c, 0, 1.0, 1.3, { name: 'FAROL', lines: ['O farol pisca sozinho, sem ninguém mandar.', 'É a única coisa no planeta que trabalha sem bater ponto.'] });
    PAGES.push({ c, x: -1.6, y: 0.8, z: 1.4, note: 'Domingo: fiquei sem sinal o dia inteiro. Melhor dia do ano.' });
  }
  // Parque Domingueiro
  district('PARQUE DOMINGUEIRO', 'aberto somente aos domingos', 12, 302, 12);
  {
    reserve(14, 300, 13);
    BUILDS.push(() => {
      const ent = placeAt(-1.8, 309.5, 200);
      signPost(ent, 0, 0, texSign('PARQUE\nDOMINGUEIRO', '#5a8f73', '#f4f4ef', { w: 256, h: 160 }), 1.3, 0.8);
      interact(ent, 0, 1.6, 0, { name: 'PLACA', lines: ['PARQUE DOMINGUEIRO — aberto somente aos domingos.', 'Por isso ele está sempre tão vazio.'] });
      const pg = placeAt(3, 288, 30); swing(pg, 0, 0); slide(pg, 3.2, 1.0); addCircleLocal(pg, 0, 0, 1.3); addCircleLocal(pg, 3.0, 1.0, 1.0);
      for (const [la, lo, hd] of [[8, 285, 20], [22, 314, 80], [19, 286, 160]]) { const pc = placeAt(la, lo, hd); picnic(pc, 0, 0); addCircle(pc.d, 0.9); }
      for (const [la, lo, hd] of [[7.4, 292, 210], [23.4, 302, 20], [14, 290.5, 100], [12, 311, 280]]) { const bc = placeAt(la, lo, hd); bench(bc, 0, 0); }
      const bc = placeAt(23.4, 302, 20);
      K.pl(bc, 0.5, 0.62, 0.075, 0.32, 0.12, texSign('EM MEMÓRIA', '#a07c48', '#f3e1b0', { font: 'lbl', w: 256, h: 96 }), { id: 6 });
      const rb = placeDir(dirOf(13.5, 299), headingVec(dirOf(13.5, 299), 40), { h: SEA - 0.02 });
      DYN.rowboat = rowboat(rb);
      const mw = placeAt(2.2, 321, 200);
      K.box(mw, 0, -0.3, 0, 3.4, 1.15, 0.7, '#c9c3b1', { id: 4, pat: 2 }); addBoxCollider(mw, 3.4, 0.7);
      SPOTS.mingau = { c: mw, x: 0.4, z: 0, y: 0.85 };
      for (const [la, lo] of [[5, 300], [21, 292], [9, 316]]) { const lc = placeAt(la, lo, 0); lampPost(lc, 0, 0); }
    });
    PAGES.push({ c: placeAt(10.5, 297.6, 0), x: 0, y: 1.6, z: 0, note: 'Domingo: dei pão pros patos. Os patos não trabalham e estão ótimos.', h: SEA + 0.7 });
  }
  // horta comunitária
  district('HORTA COMUNITÁRIA', 'rega quando der', -15, 79, 6);
  {
    // num gramado aberto, longe dos cruzamentos (perto da esquina a horta brigava com as calçadas)
    const c = placeAt(-15, 79, 10);
    lot(c, 7.6, 6.4, { kind: 'field', collide: false, m: 2.4 });
    reserve(-15, 79, 6);
    BUILDS.push(() => {
      for (let r = 0; r < 3; r++) {
        K.box(c, 0, -0.8, -1.6 + r * 1.6, 5.6, 1.1, 0.9, '#8e6c4b', { id: 3, pat: 3 });
        addBoxCollider(subCtx(c, 0, 0, -1.6 + r * 1.6), 5.6, 0.9);
        for (let k = 0; k < 6; k++) K.blob(c, -2.3 + k * 0.92, 0.45, -1.6 + r * 1.6, 0.32, 0.26, 0.32, leafCF(LEAVES[(r + k) % 5]), { sway: 0.3, swayH: 1, det: 1 });
        for (let k = 0; k < 4; k++) K.sph(c, -2 + k * 1.3, 0.5, -1.45 + r * 1.6, 0.09, 0.09, 0.09, ['#c25959', '#de794e', '#f3c258'][r], { layer: 'fol', w: 6, h: 4 });
      }
      scarecrow(c, 3.4, 1.8);
      signPost(c, -3.4, 2.4, texSign('HORTA\nCOMUNITÁRIA', '#8cc48c', '#373f42', { font: 'lbl', w: 256, h: 160 }), 1.0, 0.62);
      fence(c, -3.5, 3.5, -2.8, 0.9);
    });
    interact(c, -3.4, 1.6, 2.4, { name: 'PLACA', lines: ['HORTA COMUNITÁRIA — rega: quando der.', 'Colheita: aos domingos. Os tomates estão esperando desde 1987.'] });
  }
  // mirante
  district('MIRANTE', 'dá pra ver o planeta inteiro daqui', 50, 352, 6);
  {
    const c = placeAt(50.5, 352, 200);
    reserve(50.5, 352, 3);
    BUILDS.push(() => {
      bench(c, 0, 0.6, Math.PI);
      K.cyl(c, 1.6, 0, 0, 0.05, 1.1, '#4b5658', { n: 6 });
      K.cyl(c, 1.6, 1.25, 0.1, 0.09, 0.7, '#4f86b8', { rx: -1.2, center: true, n: 10, id: 5 });
      addCircleLocal(c, 1.6, 0, 0.35);
    });
    interact(c, 1.6, 1.2, 0.2, { name: 'LUNETA', lines: ['Pela luneta você vê... o outro lado do planeta.', 'Tem uma pessoa lá, olhando por outra luneta. Ela acena. Ela também está cansada.'] });
    PAGES.push({ c, x: -1.4, y: 0.8, z: -0.6, note: 'Domingo: subi o morro só pra ver o sol se pôr. Ele se pôs sozinho.' });
  }
}
