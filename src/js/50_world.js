// ================= o mundo: bairros, ruas, marcos =================
const FOOT = [];          // pegadas ocupadas (para o loteamento automático não sobrepor)
const RESERVED = [];      // áreas sem loteamento automático
const BUILDS = [];        // construções a montar depois do terreno
const COLLIDERS = [];     // { d, r } círculos e { box } caixas
const INTERACT = [];      // easter eggs: placas, cartazes, objetos
const PAGES = [];         // páginas de calendário escondidas
const SPOTS = {};         // posições nomeadas (NPCs, câmera, etc.)
const DISTRICTS = [];
const WIRES = [];         // pares de pontos para os fios
const DYN = {};           // objetos animados

function reserve(lat, lon, r) { RESERVED.push({ d: dirOf(lat, lon), r }); }
function isReserved(d, pad = 0) { for (const z of RESERVED) if (arcDist(d, z.d) < z.r + pad) return true; return false; }
function footOf(c, w, d, cx = 0, cz = 0) {
  const p = ctxPoint(c, cx, 0, cz).normalize();
  const r = new THREE.Vector3().setFromMatrixColumn(c.W, 0).normalize(), f = new THREE.Vector3().setFromMatrixColumn(c.W, 2).normalize();
  return { c: p.multiplyScalar(R), r, f, hw: w / 2, hd: d / 2 };
}
function obbOverlap(A, B, pad = 0.3) {
  const T = tmpV.subVectors(B.c, A.c);
  for (const ax of [A.r, A.f, B.r, B.f]) {
    const ra = A.hw * Math.abs(A.r.dot(ax)) + A.hd * Math.abs(A.f.dot(ax));
    const rb = B.hw * Math.abs(B.r.dot(ax)) + B.hd * Math.abs(B.f.dot(ax));
    if (Math.abs(T.dot(ax)) > ra + rb + pad) return false;
  }
  return true;
}
function footFree(F, pad = 0.3) { for (const o of FOOT) if (obbOverlap(F, o, pad)) return false; return true; }
// tall: prédio (a câmera não atravessa)
function addBoxCollider(c, w, d, cx = 0, cz = 0, tall = false) {
  const F = footOf(c, w, d, cx, cz);
  COLLIDERS.push({ box: true, tall, c: F.c.clone().normalize(), r: F.r, f: F.f, hw: F.hw, hd: F.hd, rad: Math.hypot(F.hw, F.hd) });
  return F;
}
function addCircle(d, r) { COLLIDERS.push({ d: d.clone().normalize(), r }); }
function addCircleLocal(c, x, z, r) { addCircle(ctxDir(c, x, z), r); }
// lote: registra zona aplainada + pegada + colisor, e agenda a construção
function lot(c, w, d, o = {}) {
  const F = footOf(c, w + (o.padW || 0), d + (o.padD || 0), o.cx || 0, o.cz || 0);
  FOOT.push(F);
  if (o.zone !== false) addZone(ctxDir(c, o.cx || 0, o.cz || 0), c.fwd, (w + (o.padW || 0)) / 2 + 0.4, (d + (o.padD || 0)) / 2 + 0.4, { h: c.h, kind: o.kind || 'paved', m: o.m ?? 1.8 });
  if (o.collide !== false) addBoxCollider(c, o.colW || w, o.colD || d, o.ccx || 0, o.ccz || 0, true);
}
// contexto ao longo de uma rua, de frente para ela
function nearestSample(rd, lat, lon) {
  const d = dirOf(lat, lon); let bi = 0, bd = -2;
  rd.S.forEach((s, i) => { const v = s.d.dot(d); if (v > bd) { bd = v; bi = i; } });
  return bi;
}
function besideRoad(rd, i, side, depth, setback = 0.4, o = {}) {
  const s = rd.S[i];
  const lat = side * (rd.hw + rd.sw + setback + depth / 2);
  const d = s.d.clone().addScaledVector(s.s, lat / R).normalize();
  const fwd = s.s.clone().multiplyScalar(-side);
  const h = o.h !== undefined ? o.h : H(d);
  return placeDir(d, fwd, { h });
}
// ponto na calçada (para postes, lixeiras, placas)
function onSidewalk(rd, i, side, inset = 0.35) {
  const s = rd.S[((i % rd.S.length) + rd.S.length) % rd.S.length];
  const lat = side * (rd.hw + rd.sw - inset);
  const d = s.d.clone().addScaledVector(s.s, lat / R).normalize();
  return placeDir(d, s.s.clone().multiplyScalar(-side), { h: s.h + rd.top + 0.13 });
}
function interact(c, x, y, z, o) {
  const p = ctxPoint(c, x, y, z);
  INTERACT.push(Object.assign({ pos: p, dir: p.clone().normalize(), r: 2.2 }, o));
}
function district(name, sub, lat, lon, r) { DISTRICTS.push({ name, sub, d: dirOf(lat, lon), r }); }

// ---------------- relevo e ruas ----------------
let MAIN, VILA, LADEIRA, CONJ, BOARD, PIER, LAKEPIER;
function defineWorld() {
  // relevo
  hill(25, 90, 10, 1.3, 'p');          // platô da vila
  hill(16, 300, 6.2, -2.6);            // lago do parque
  hill(-74, 236, 6.5, 4.7, 'p');       // ilha
  hill(50, 350, 8, 2.4);               // mirante
  hill(-38, 152, 13, 2.6, 'p');        // terreno da fábrica (empurra o mar)
  hill(-40, 100, 12, 2.2, 'p');        // conjunto habitacional
  hill(38, 300, 9, 1.6);
  hill(42, 20, 10, 1.8);
  hill(-30, 300, 9, 1.2);
  town(14, 20, 24); town(25, 90, 15); town(-28, 152, 13); town(-27, 232, 16); town(-25, 100, 14);
  town(86, 70, 10); town(-12, 28, 8); town(-74, 236, 5); town(14, 300, 8); town(-16, 78, 6);
  // zona plana do topo do morro
  addZone(dirOf(90, 0), new THREE.Vector3(1, 0, 0), 9.5, 9.5, { h: 6.2, round: true, m: 3.5, kind: 'grass' });

  MAIN = defRoad({ name: 'Avenida da Esteira', closed: true, w: 3.2, sw: 1.5, marks: 'dash', level: 0, pts: [
    [4, -12], [4, 6], [4.5, 24], [5, 42], [7, 58], [9, 74], [8, 90], [4, 106], [-3, 120], [-10, 134], [-16, 149], [-20, 165],
    [-21, 182], [-20.5, 200], [-20, 218], [-20, 236], [-20.5, 254], [-19.5, 270], [-15, 286], [-9, 301], [-4, 316], [0, 331], [3, 346]] });
  VILA = defRoad({ name: 'Rua do Sossego', w: 2.5, sw: 1.1, marks: 'none', level: 1, kind: 'asphalt', pts: [
    [8.5, 74], [16, 75], [25, 79], [33, 88], [35, 100], [30, 111], [20, 111], [11, 105], [5.5, 101]] });
  defRoad({ name: 'Rua das Flores', w: 2.3, sw: 1.0, marks: 'none', level: 2, pts: [[25, 79], [23, 93], [20, 111]] });
  LADEIRA = defRoad({ name: 'Ladeira', w: 2.6, sw: 0.9, marks: 'double', level: 3, pts: [
    [25, 79], [31, 72], [38, 64], [46, 70], [53, 62], [60, 70], [66, 63], [71, 70]] });
  CONJ = defRoad({ name: 'Conjunto Esteira Feliz', w: 2.5, sw: 1.0, marks: 'none', level: 4, pts: [
    [4, 106], [-6, 101], [-16, 96], [-25, 99], [-31, 108], [-27, 121], [-17, 128], [-10, 134]] });
  defRoad({ name: 'Acesso da Fábrica', w: 2.6, sw: 0.8, marks: 'none', level: 5, pts: [[-16, 149], [-23, 148], [-28, 151]] });
  BOARD = defRoad({ name: 'Calçadão', kind: 'wood', w: 2.2, level: 6, pts: [[-27.6, 203], [-28.3, 216], [-28.6, 230], [-28.3, 244], [-27.6, 256]] });
  PIER = defRoad({ name: 'Píer', kind: 'pier', w: 1.9, fixedH: SEA + 0.95, noFlat: true, pts: [[-29.5, 232], [-40, 232.5], [-50, 233], [-59, 234], [-66, 235]] });
  LAKEPIER = defRoad({ name: 'Deque do Lago', kind: 'pier', w: 1.5, fixedH: SEA + 0.7, noFlat: true, pts: [[7.8, 296], [10.6, 297.5]] });
  // trilhas de terra
  const trail = (pts, w = 1.6) => defRoad({ kind: 'trail', w, pts });
  trail([[-4.5, 312], [3, 305], [9, 296], [16, 289], [23, 296], [24, 306], [18, 313], [9, 310], [3, 305]]);
  trail([[23, 296], [33, 312], [43, 332], [50, 350], [48, 10], [42, 30], [36, 50], [31, 72]], 1.4);
  trail([[-20, 270], [-28, 282], [-34, 296], [-30, 312], [-18, 318], [-4, 316]], 1.3);
  trail([[-3, 120], [-12, 112], [-17, 96]], 1.2);
  trail([[38, 64], [48, 50], [52, 40], [48, 10]], 1.2);
  trail([[-16, 149], [-32, 160], [-40, 170], [-33, 184], [-21, 182]], 1.2);
  trail([[9, 74], [14, 60], [20, 50], [28, 44], [36, 50]], 1.2);
  settleRoads();
}

// ---------------- marcos (lugares com nome) ----------------
function addLandmarks() {
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
      const st = subCtx(c, -3.2, 0, 1.2, 0.5); bStatue(st); addBoxCollider(st, 1.8, 1.8);
      const fo = subCtx(c, 3.1, 0, -1.6); bFountain(fo); addCircleLocal(c, 3.1, -1.6, 2.1);
      for (const [x, z, ry] of [[-1.8, 3.6, Math.PI], [1.9, 3.6, Math.PI], [-4.2, -1.5, Math.PI / 2], [0.6, -4.3, 0]]) bench(c, x, z, ry);
      for (const [x, z] of [[-4.0, -3.4], [4.2, 2.6], [-0.9, -4.6]]) { tree(c, x, z, 0.95); addCircleLocal(c, x, z, 0.45); }
      for (const [x, z] of [[-4.6, 2.2], [4.6, -2.8], [2.8, 4.4], [-2.6, -4.4]]) lampPost(c, x, z);
      planter(c, 0, 4.6, 2.2);
      bOrelhao(subCtx(c, 4.9, 0, 0.4, -Math.PI / 2));
      K.box(c, -2.0, 0, -2.6, 0.7, 0.75, 0.55, '#5a8f73', { id: 5, layer: 'small' });
      K.pl(c, -2.0, 0.5, -2.32, 0.55, 0.35, texSign('ACHADOS E\nPERDIDOS', '#5a8f73', '#f4f4ef', { font: 'lbl', w: 256, h: 160 }), { id: 6 });
    });
    interact(c, 0, 1.2, 1.4, { name: 'PLACA', lines: ['RELÓGIO DA PRAÇA — anda só quando você anda.', 'Doado pela Família Otávio, que não anda.'] });
    interact(c, -3.2, 1.0, 2.0, { name: 'ESTÁTUA', lines: ['AVÔ OTÁVIO (1952). Deu uma volta no planeta, uma vez.', 'A família descansa desde então.', 'Alguém deixou um tênis gasto no pedestal.'] });
    interact(c, -2.0, 0.6, -2.1, { name: 'ACHADOS E PERDIDOS', lines: ['Dentro da caixa: 1 fim de semana, pouco usado.', '3 férias vencidas. Um guarda-chuva. A vontade de alguém.'] });
    interact(c, 4.9, 1.2, 0.4, { name: 'ORELHÃO', lines: ['Você tira o fone do gancho.', 'Gravação: "Sua ligação é muito importante para nós. Continue andando."'] });
    SPOTS.plaza = c;
  }
  // casa da Lia
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
  district('GIRA S.A.', 'sede da empresa que gira o planeta', 22, 22, 7);
  {
    const i = nearestSample(MAIN, 4.5, 22), c = besideRoad(MAIN, i, 1, 7 + 3.4, 0.4);
    lot(c, 7.4, 10.6, { colW: 7, colD: 7, ccz: -1.7 });
    const tc = subCtx(c, 0, 0, -1.7);
    BUILDS.push(() => {
      bTower(tc, {});
      const pc = subCtx(c, -1.6, 0, 3.2); bPodium(pc); addBoxCollider(pc, 1.5, 1.3);
      // relógio de ponto
      K.box(c, 2.3, 0, 3.6, 0.5, 1.2, 0.4, '#4b5658', { id: 5, layer: 'small' });
      K.pl(c, 2.3, 1.0, 3.81, 0.36, 0.36, texClock(), { id: 6 });
      for (const x of [-3.2, 3.2]) planter(c, x, 4.6, 1.2);
      vending(c, 3.4, 2.6, 'foco', -Math.PI / 2);
    });
    interact(c, 2.3, 1.0, 3.8, { name: 'RELÓGIO DE PONTO', lines: ['CLAC.', 'Você já bateu o ponto hoje. E ontem. E amanhã, provavelmente.'] });
    interact(c, 3.4, 1.0, 2.6, { name: 'MÁQUINA', lines: ['ENERGÉTICO FOCO — agora com 300% mais segunda-feira.', 'Você aperta o botão. Sai uma lata escrita "só mais uma volta".'] });
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
    const i = nearestSample(MAIN, 5, 38), c = besideRoad(MAIN, i, 1, 1.9, -1.3);
    BUILDS.push(() => bKiosk(c, {})); addBoxCollider(c, 2.6, 1.8, 0, 0, true); FOOT.push(footOf(c, 2.8, 2.8));
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
  district('CAMPINHO', 'proibido jogar bola em dia útil', -12, 28, 6);
  {
    const i = nearestSample(MAIN, 4.5, 28), c = besideRoad(MAIN, i, -1, 6.5, 1.0);
    lot(c, 10, 6.5, { kind: 'field', collide: false, m: 2.4 });
    reserve(-12, 28, 6);
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
    const c = placeAt(24.5, 95, 0);
    addZone(c.d, c.fwd, 2.8, 2.8, { h: c.h, round: true, kind: 'paved', m: 1.5 });
    reserve(24.5, 95, 3.4); FOOT.push(footOf(c, 6, 6));
    BUILDS.push(() => {
      plazaDisc(c, 2.7);
      bench(c, 0, 0.9, Math.PI); tree(c, -1.6, -1.2, 1.05); addCircleLocal(c, -1.6, -1.2, 0.45); lampPost(c, 1.9, -1.4);
      pot(c, 1.6, 1.4); pot(c, -1.9, 1.3, 0.8);
      K.pl(c, 0.9, 0.62, 1.205, 0.32, 0.12, texSign('EM MEMÓRIA', '#a07c48', '#f3e1b0', { font: 'lbl', w: 256, h: 96 }), { id: 6 });
    });
    interact(c, 0.9, 0.6, 1.3, { name: 'PLAQUINHA', lines: ['"Banco em memória de quem sentou aqui."', 'Ninguém nunca sentou. Só o Seu Lino.'] });
    SPOTS.lino = { c, x: 0, z: 1.15, y: 0, ry: Math.PI };
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
    addBoxCollider(subCtx(c, 0, 0, -2.2), 10, 7, 0, 0, true);
    BUILDS.push(() => {
      bMansion(subCtx(c, 0, 0, -2.2));
      poolAt(subCtx(c, 0, 0, 4.4), 6.2, 3.0);
      for (const sx of [-1, 1]) { palm(c, sx * 5.6, 3.6, 1.0); addCircleLocal(c, sx * 5.6, 3.6, 0.4); }
      umbrella(c, 3.9, 6.6, '#f4f4ef', '#de794e');
      loungeChair(subCtx(c, -2.0, 0, 6.8, Math.PI));
      loungeChair(subCtx(c, 2.4, 0, 6.8, Math.PI));
      for (const x of [-6, 6]) planter(c, x, -0.2, 1.4);
    });
    addCircleLocal(c, 0, 4.4, 2.3); addCircleLocal(c, -1.6, 4.4, 1.6); addCircleLocal(c, 1.6, 4.4, 1.6);
    SPOTS.otavio = { c: subCtx(c, -2.0, 0, 6.8, Math.PI), x: 0, z: 0, y: 0.32 };
    PAGES.push({ c, x: 3.6, y: 0.8, z: 2.4, note: 'Domingo: fiquei na beira da piscina. Era de um vizinho. Ninguém viu.' });
    // muro circular com portão voltado para a Ladeira
    BUILDS.push(() => {
      const ctr = dirOf(90, 0), rad = 9.4, n = 44;
      for (let k = 0; k < n; k++) {
        const lon = k / n * 360;
        if (Math.abs(((lon - 70 + 540) % 360) - 180) < 7) continue;
        const lat = 90 - rad / R / D2R;
        const d = dirOf(lat, lon), fwd = d.clone().sub(ctr).normalize();
        const wc = placeDir(d, fwd, { h: H(d) });
        K.box(wc, 0, -0.6, 0, 0.3, 2.0, 1.45, '#f1eee4', { id: 4, pat: 1 });
        K.box(wc, 0, 1.4, 0, 0.42, 0.1, 1.5, '#e5c27a', { id: 5 });
        COLLIDERS.push({ d: d.clone(), r: 0.75 });
      }
      const gd = dirOf(90 - rad / R / D2R - 0.6, 70), gc = placeDir(gd, headingVec(gd, 0), {});
      for (const x of [-1.7, 1.7]) { K.box(gc, x, -0.4, 0, 0.5, 2.4, 0.5, '#f1eee4', { id: 4 }); K.sph(gc, x, 2.15, 0, 0.3, 0.3, 0.3, '#e5c27a', { id: 5 }); addCircleLocal(gc, x, 0, 0.35); }
      K.pl(gc, -1.35, 1.0, 0.6, 1.3, 1.9, texDoor('gate', '#e5c27a'), { id: 6, ry: 0.9 });
      K.pl(gc, 1.35, 1.0, 0.6, 1.3, 1.9, texDoor('gate', '#e5c27a'), { id: 6, ry: -0.9 });
      const bc = subCtx(gc, 3.4, 0, -1.6, 0); bGuardBooth(bc); addBoxCollider(bc, 1.4, 1.4);
      K.box(gc, -2.3, 1.0, -0.3, 0.25, 0.35, 0.1, '#4b5658', { id: 5 });
      interact(gc, -2.3, 1.2, -0.1, { name: 'INTERFONE', lines: ['Você aperta. Chiado. Uma voz:', '"O Sr. Otávio está descansando. Ele está sempre descansando."'] });
      SPOTS.josue = { c: gc, x: 2.4, z: -0.5, y: 0, ry: 0 };
      K.board(gc, 0, 2.7, 0.15, 2.6, 0.5, texSign('VILA OTÁVIO', '#f4f4ef', '#c25959', { font: 'lbl' }), { frame: '#e5c27a' });
    });
  }
  // Fábrica de Voltas
  district('FÁBRICA DE VOLTAS', 'movida a gente', -27, 152, 10);
  {
    const i = nearestSample(MAIN, -16, 146), c = besideRoad(MAIN, i, -1, 7.5, 2.6);
    lot(c, 11, 7.5);
    reserve(-27, 152, 9);
    BUILDS.push(() => {
      bWarehouse(c, { w: 11, d: 7.5, h: 5.6, sign: 'FÁBRICA DE VOLTAS', graffiti: '6x1 NÃO' });
      chimney(c, -3.2, -2.2, 11); chimney(c, -0.8, -2.6, 9.5, 0.45);
      for (let k = 0; k < 3; k++) barrel(c, 6.2, 1.2 - k * 0.7, k % 2 ? '#c25959' : '#4f86b8');
      crate(c, 6.4, -1.6, 0.8); crate(c, 6.3, -2.5, 0.6, 0.4);
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
      for (const [la, lo] of [[-26.6, 210], [-26.8, 224], [-26.6, 240], [-27, 252], [-30.5, 205], [-31, 257]]) { const pc = beach(la, lo, rand() * 360); palm(pc, 0, 0, rr(0.9, 1.15)); addCircle(pc.d, 0.4); }
      const sc = beach(-27.2, 230.6, 180);
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
  district('HORTA COMUNITÁRIA', 'rega quando der', -16, 78, 5);
  {
    const i = nearestSample(MAIN, 8.5, 78), c = besideRoad(MAIN, i, -1, 5.5, 1.2);
    lot(c, 7, 5.5, { kind: 'field', collide: false });
    reserve(-16, 78, 4);
    BUILDS.push(() => {
      for (let r = 0; r < 3; r++) {
        K.box(c, 0, -0.2, -1.6 + r * 1.6, 5.6, 0.5, 0.9, '#8e6c4b', { id: 3, pat: 3 });
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

// ---------------- peças especiais ----------------
function plazaDisc(c, r) {
  const g = G(c, { layer: 'road' }), n = 40, y = 0.06;
  const P = (a, rr2, yy) => ctxPoint(c, Math.cos(a) * rr2, yy, Math.sin(a) * rr2, new THREE.Vector3());
  const cen = ctxPoint(c, 0, y, 0, new THREE.Vector3());
  const col1 = C('#d2d0c2'), col2 = C('#b9b4a4');
  for (let k = 0; k < n; k++) {
    const a0 = k / n * Math.PI * 2, a1 = (k + 1) / n * Math.PI * 2;
    const p0 = P(a0, r, y), p1 = P(a1, r, y);
    g.quad(cen, p1, p0, cen, col1, { pat: 6, id: 2, q: [[0, 0], [Math.cos(a1) * r, Math.sin(a1) * r], [Math.cos(a0) * r, Math.sin(a0) * r], [0, 0]] });
    g.quad(P(a0, r, y), P(a1, r, y), P(a1, r, -0.3), P(a0, r, -0.3), col2, { id: 2 });
  }
}
function fieldLine(c, x0, z0, x1, z1) {
  const g = G(c, { layer: 'road' }), w = 0.07, y = 0.03;
  const dx = x1 - x0, dz = z1 - z0, l = Math.hypot(dx, dz), nx = -dz / l * w, nz = dx / l * w;
  const A = ctxPoint(c, x0 - nx, y, z0 - nz, new THREE.Vector3()), B = ctxPoint(c, x0 + nx, y, z0 + nz, new THREE.Vector3());
  const Cc = ctxPoint(c, x1 + nx, y, z1 + nz, new THREE.Vector3()), D = ctxPoint(c, x1 - nx, y, z1 - nz, new THREE.Vector3());
  const up = c.d, n = tmpV.subVectors(B, A).cross(tmpV2.subVectors(D, A));
  if (n.dot(up) >= 0) g.quad(A, B, Cc, D, C('#f4f4ef'), { id: 0 }); else g.quad(A, D, Cc, B, C('#f4f4ef'), { id: 0 });
}
function poolAt(c, w, d) {
  K.box(c, 0, -0.35, 0, w + 0.6, 0.45, d + 0.6, '#e9ebe4', { id: 5, pat: 6 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), waterMat.clone());
  const dep = new Float32Array(4).fill(1.3); m.geometry.setAttribute('aDepth', new THREE.BufferAttribute(dep, 1));
  m.material.uniforms = THREE.UniformsUtils.clone(waterMat.uniforms);
  m.material.uniforms.cShallow.value.set('#7fd6e0'); m.material.uniforms.cDeep.value.set('#4fb3cf');
  const L = new THREE.Matrix4().compose(new THREE.Vector3(0, 0.12, 0), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2), new THREE.Vector3(1, 1, 1));
  m.matrixAutoUpdate = false; m.matrix.copy(c.W).multiply(L); m.matrixWorldNeedsUpdate = true;
  scene.add(m); DYN.pools = DYN.pools || []; DYN.pools.push(m);
  PLATFORMS.push({ test: () => null });
}
function loungeChair(c) {
  K.box(c, 0, 0.22, 0.3, 0.7, 0.08, 1.2, '#f4f4ef', { id: 3 });
  K.box(c, 0, 0.3, -0.55, 0.7, 0.08, 0.8, '#f4f4ef', { id: 3, rx: -0.9 });
  for (const [x, z] of [[-0.3, 0.8], [0.3, 0.8], [-0.3, -0.2], [0.3, -0.2]]) K.box(c, x, 0, z, 0.05, 0.24, 0.05, '#c9cdc2', SM);
  K.box(c, 0, 0.3, 0.3, 0.62, 0.05, 1.1, '#66bde6', { id: 7 });
}
function lighthouse(c) {
  const segs = 6;
  for (let i = 0; i < segs; i++) K.cyl(c, 0, -0.4 + i * 1.2, 0, 1.15 - i * 0.07, 1.22, i % 2 ? '#f4f4ef' : '#c25959', { n: 14, top: (1.15 - (i + 1) * 0.07) / (1.15 - i * 0.07), id: 4 });
  K.cyl(c, 0, 6.8, 0, 0.95, 0.15, '#4b5658', { n: 14 });
  K.cyl(c, 0, 6.95, 0, 0.6, 0.9, '#f6e7b5', { n: 10, id: 6 });
  K.cyl(c, 0, 7.85, 0, 0.75, 0.7, '#c25959', { n: 12, top: 0.1 });
  K.pl(c, 0, 0.9, 1.13, 0.75, 1.4, texDoor('wood', '#4f86b8'), { id: 6 });
  addRailing(c, -0.9, 0.9, 6.95, 0.9, 0.5);
}
function hammock(c1, c2) {
  const a = ctxPoint(c1, 0, 1.2, 0), b = ctxPoint(c2, 0, 1.2, 0);
  const mid = a.clone().lerp(b, 0.5), up = mid.clone().normalize();
  const fwd = b.clone().sub(a).normalize();
  const hc = placeDir(up, fwd, { h: mid.length() - R - 0.55 });
  const len = a.distanceTo(b) - 0.3;
  K.box(hc, 0, 0, 0, 0.9, 0.06, len * 0.6, '#de794e', { id: 7 });
  K.boxc(hc, 0, 0.35, len * 0.4, 0.05, 0.05, len * 0.25, '#e9e6dc', { rx: -0.9 });
  K.boxc(hc, 0, 0.35, -len * 0.4, 0.05, 0.05, len * 0.25, '#e9e6dc', { rx: 0.9 });
}
function scarecrow(c, x, z) {
  K.cyl(c, x, 0, z, 0.05, 1.8, '#8e6c4b', { n: 5 });
  K.boxc(c, x, 1.35, z, 1.2, 0.06, 0.06, '#8e6c4b');
  K.box(c, x, 0.9, z, 0.5, 0.6, 0.25, '#4f86b8', { id: 7 });
  K.sph(c, x, 1.75, z, 0.2, 0.22, 0.2, '#e9d7a0', { id: 7 });
  K.cyl(c, x, 1.9, z, 0.34, 0.06, '#c9a24f', { n: 10 }); K.cyl(c, x, 1.95, z, 0.17, 0.18, '#c9a24f', { n: 10 });
  K.pl(c, x, 0.95, z + 0.13, 0.4, 0.2, texSign('GIRA', '#de794e', '#f4f4ef', { w: 128, h: 64, font: 'lbl' }), { id: 6 });
}
function wheelFrame(c) {
  // estrutura fixa; a roda gira à parte
  for (const sx of [-1, 1]) {
    K.boxc(c, sx * 1.55, 1.9, -0.9, 0.18, 4.2, 0.18, '#c25959', { rx: 0.42 });
    K.boxc(c, sx * 1.55, 1.9, 0.9, 0.18, 4.2, 0.18, '#c25959', { rx: -0.42 });
    K.box(c, sx * 1.55, -0.2, 0, 0.3, 0.3, 3.6, '#a94e4e');
  }
  K.cyl(c, 0, 3.8, 0, 0.16, 3.5, '#4b5658', { rz: Math.PI / 2, center: true, n: 10 });
  K.board(c, 2.9, 1.25, 1.9, 1.3, 0.55, texSign('RODA Nº 1', '#f4f4ef', '#c25959', { font: 'lbl', w: 256, h: 112 }), {});
  K.cyl(c, 2.9, 0, 1.85, 0.04, 1.0, '#4b5658', { n: 5 });
  K.board(c, -2.6, 3.0, 1.6, 1.6, 0.6, texSign('VOLTAS HOJE\n12.384', '#2f3a40', '#f3c258', { font: 'lbl', w: 256, h: 112 }), {});
  K.cyl(c, -2.6, 0, 1.55, 0.05, 2.7, '#4b5658', { n: 5 });
}
function rowboat(c) {
  const g = new Geo();
  const W = new THREE.Matrix4();
  g.add(HULL, TM(0, 0.32, 0, 1.2, 0.4, 0.55), W, { c: C('#c25959'), id: 4 });
  g.add(GEO.box, TM(0, 0.3, 0, 1.9, 0.05, 0.8), W, { c: C('#b48d63'), id: 3, pat: 3 });
  g.add(GEO.box, TM(0, 0.38, 0, 0.2, 0.06, 0.9), W, { c: C('#8e6c4b'), id: 3 });
  const m = new THREE.Mesh(g.build(), MAT.world);
  m.castShadow = true; m.receiveShadow = true;
  scene.add(m);
  return { mesh: m, base: c.W.clone() };
}

// ---------------- loteamento automático ao longo das ruas ----------------
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
function fillLots() {
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

// ---------------- postes, fios e coisas de calçada ----------------
function streetFurniture() {
  for (const rd of ROADS) {
    if (rd.kind !== 'asphalt' || !rd.sw) continue;
    const S = rd.S, N = S.length, every = Math.max(10, Math.round(9 / rd.step));
    let prev = null;
    for (let i = 3; i < N - (rd.closed ? 0 : 3); i += every) {
      const s = S[i]; if (s.inter || s.cutR) { prev = null; continue; }
      const c = onSidewalk(rd, i, 1, 0.3);
      if (isNearAny(c.d, 0.9)) { prev = null; continue; }
      const pts = utilPole(c, 0, 0);
      addCircle(c.d, 0.25);
      if (prev) for (let k = 0; k < 4; k++) WIRES.push([prev[k], pts[k]]);
      prev = pts;
      // do outro lado: luminária
      const c2 = onSidewalk(rd, i + Math.floor(every / 2), -1, 0.3);
      if (!S[(i + Math.floor(every / 2)) % N].cutL && !isNearAny(c2.d, 0.9)) { lampPost(c2, 0, 0); addCircle(c2.d, 0.2); }
    }
    if (rd.closed && prev) { /* fecha o anel só se o primeiro poste existir */ }
    // lixeiras, hidrantes, cones, placas "proibido parar"
    for (let i = 7; i < N - 3; i += Math.round(every * 1.7)) {
      const side = (i % 2) ? 1 : -1, s = S[i];
      if (s.inter || (side > 0 ? s.cutR : s.cutL)) continue;
      const c = onSidewalk(rd, i, side, 0.32);
      if (isNearAny(c.d, 0.8)) continue;
      const k = Math.floor(rand() * 6);
      if (k === 0) trashBin(c, 0, 0); else if (k === 1) hydrant(c, 0, 0); else if (k === 2) bollard(c, 0, 0);
      else if (k === 3 && rd === MAIN) { signPost(c, 0, 0, texSign('PROIBIDO\nPARAR', '#c25959', '#f4f4ef', { w: 256, h: 192, font: 'lbl' }), 0.7, 0.55); interact(c, 0, 1.8, 0, { name: 'PLACA', lines: ['PROIBIDO PARAR.', '(Inclusive você.)'] }); }
      else if (k === 4) cone(c, 0, 0);
      else vending(c, 0, -0.1, pickR(['foco', 'cafe', 'agua']));
      addCircle(c.d, 0.3);
    }
  }
}
function isNearAny(d, r) { for (const co of COLLIDERS) { if (co.box) { if (arcDist(d, co.c) < co.rad + r) return true; } else if (arcDist(d, co.d) < co.r + r) return true; } return false; }
function buildWires() {
  const pos = [];
  for (const [a, b] of WIRES) {
    const n = 10;
    for (let k = 0; k < n; k++) {
      const t0 = k / n, t1 = (k + 1) / n;
      const p0 = a.clone().lerp(b, t0), p1 = a.clone().lerp(b, t1);
      const sag = (t) => Math.sin(Math.PI * t) * 0.45;
      p0.setLength(p0.length() - sag(t0)); p1.setLength(p1.length() - sag(t1));
      pos.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const l = new THREE.LineSegments(g, lineMat('#3b4447')); l.frustumCulled = false;
  scene.add(l);
}

// ---------------- vegetação espalhada ----------------
function scatter() {
  const tryAt = (lat, lon, fn, r = 0.6) => {
    const d = dirOf(lat, lon);
    const h = H(d, scatter.info);
    if (h < SEA + 0.4 || scatter.info.road > 0.05 || scatter.info.lot > 0.2) return false;
    if (trailDist(d) < 0.7) return false;
    if (isNearAny(d, r + 0.4)) return false;
    for (const F of FOOT) if (arcDist(d, tmpV3.copy(F.c).normalize()) < Math.hypot(F.hw, F.hd) + r) return false;
    const c = placeDir(d, headingVec(d, rand() * 360), { h, lift: -0.05 });
    fn(c); addCircle(d, r * 0.6);
    return true;
  };
  scatter.info = {};
  const N = LOW ? 420 : 640;
  let placed = 0;
  for (let k = 0; k < N * 3 && placed < N; k++) {
    const y = rr(-0.62, 0.98), lon = rand() * 360, lat = Math.asin(y) / D2R;
    const inPark = arcDist(dirOf(lat, lon), dirOf(14, 300)) < 14;
    const beachy = lon > 195 && lon < 285 && lat < -26;
    if (beachy && rand() < 0.75) continue;
    const town = isReserved(dirOf(lat, lon)) && !inPark;
    if (town && rand() < 0.85) continue;
    const r = rand();
    const ok = tryAt(lat, lon, (c) => {
      if (beachy) palm(c, 0, 0, rr(0.85, 1.15));
      else if (lat > 46 && r < 0.55) pine(c, 0, 0, rr(0.8, 1.3));
      else if (r < 0.62) tree(c, 0, 0, rr(0.8, 1.35));
      else if (r < 0.8) bush(c, 0, 0, rr(0.6, 1.0));
      else if (r < 0.9) rock(c, 0, 0, rr(0.6, 1.4));
      else flowers(c, 0, 0);
    }, r < 0.62 ? 0.7 : 0.45);
    if (ok) placed++;
  }
  // árvores no parque em volta do lago (mais densas)
  for (let k = 0; k < (LOW ? 40 : 70); k++) {
    const a = rand() * Math.PI * 2, rad = rr(7.8, 13);
    const d = offsetDir(dirOf(14, 300), headingVec(dirOf(14, 300), a / D2R), rad);
    tryAt(latOf(d), lonOf(d), (c) => (rand() < 0.75 ? tree(c, 0, 0, rr(0.9, 1.4)) : bush(c, 0, 0, rr(0.7, 1))), 0.7);
  }
}
// tufos de grama instanciados por pedaço
function buildGrass() {
  const ico = TERRAIN.ico, ha = TERRAIN.h, ga = TERRAIN.mesh.geometry.attributes.aG.array;
  const blade = (() => {
    const g = new THREE.BufferGeometry(), P = [], Cc = [], I = [];
    const base = C('#5f9c55'), tip = C('#a7cf7a');
    for (let b = 0; b < 4; b++) {
      const a = b / 4 * Math.PI * 2 + 0.4, ox = Math.cos(a) * 0.06, oz = Math.sin(a) * 0.06, w = 0.05, h = 0.26 + (b % 2) * 0.12;
      const tx = ox * 2.2, tz = oz * 2.2, px = -Math.sin(a) * w, pz = Math.cos(a) * w, k = P.length / 3;
      P.push(ox - px, 0, oz - pz, ox + px, 0, oz + pz, tx, h, tz);
      Cc.push(base.r, base.g, base.b, base.r, base.g, base.b, tip.r, tip.g, tip.b);
      I.push(k, k + 1, k + 2);
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3));
    g.setIndex(I); g.computeVertexNormals();
    return g;
  })();
  const mat = toon({ vc: true, grass: true, side: THREE.DoubleSide });
  const per = new Map();
  const d = new THREE.Vector3(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const prob = LOW ? 0.45 : 0.75;
  for (let i = 0; i < ico.count; i++) {
    if (ga[i] < 0.99 || rand() > prob) continue;
    d.set(ico.pos[i * 3], ico.pos[i * 3 + 1], ico.pos[i * 3 + 2]);
    if (ha[i] < SEA + 0.4) continue;
    const ch = chunkOf(d);
    let arr = per.get(ch); if (!arr) per.set(ch, arr = []);
    const reps = LOW ? 1 : 2;
    for (let r = 0; r < reps; r++) {
      const dd = d.clone().addScaledVector(eastOf(d, tmpV), rr(-0.2, 0.2) / R).addScaledVector(northOf(d, tmpV2), rr(-0.2, 0.2) / R).normalize();
      p.copy(dd).multiplyScalar(R + ha[i] - 0.03);
      const f = headingVec(dd, rand() * 360);
      frameMatrix(p, dd, f, m4);
      const sc = rr(0.7, 1.35); m4.scale(s.set(sc, sc * rr(0.8, 1.3), sc));
      arr.push(m4.clone());
    }
  }
  for (const [ch, arr] of per) {
    const im = new THREE.InstancedMesh(blade, mat, arr.length);
    arr.forEach((m, k) => im.setMatrixAt(k, m));
    im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere();
    im.receiveShadow = true;
    scene.add(im); ch.inst.push(im);
  }
}
