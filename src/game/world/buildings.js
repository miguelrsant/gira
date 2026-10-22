// ================= construções =================
// comércio com apartamentos em cima (frente em +z)
import { pickR, rand, rr } from '../core/math.js';
import { DOME } from './geo.js';
import {
  addAC, addAntenna, addDish, addPipe, addPoster, addRailing, addSolar, addTank, addWindow, HOUSEW,
  K, ROOFS, WALLS,
} from './kit.js';
import { bush, flowers } from './plants.js';
import {
  texAwning, texBanner, texClock, texDoor, texGraffiti, texLogo, texNews, texOffice, texPoster,
  texShopWin, texShutter, texSign, texStripes, texWin, WIN_KINDS,
} from './textures.js';

export function bShop(c, s) {
  const w = s.w, d = s.d, fl = s.fl ?? 1, g0 = 3.0, gf = 2.35, Ht = g0 + fl * gf;
  const wall = s.wall || pickR(WALLS), trim = s.trim || '#eeebe1', zf = d / 2;
  K.box(c, 0, -1.1, 0, w + 0.12, 1.26, d + 0.12, '#a3a8a0', { pat: 2, id: 5 });
  K.box(c, 0, 0.16, 0, w, Ht - 0.16, d, wall, { pat: s.pat ?? 8, id: 4 });
  K.box(c, 0, 0.16, zf - 0.01, w + 0.04, 0.5, 0.06, s.base || '#8f9b96', { pat: 6, id: 5 });
  K.box(c, 0, g0 - 0.08, 0, w + 0.14, 0.17, d + 0.14, trim, { id: 5 });
  for (let f = 1; f < fl; f++) K.box(c, 0, g0 + f * gf - 0.05, 0, w + 0.06, 0.1, d + 0.06, trim, { id: 5 });
  K.box(c, 0, Ht, 0, w + 0.22, 0.2, d + 0.22, trim, { id: 5 });
  K.box(c, 0, Ht + 0.2, 0, w - 0.1, 0.06, d - 0.1, '#9aa29d', { id: 5, pat: 6 });
  for (const [x, z, ww, dd] of [[0, zf - 0.07, w + 0.22, 0.14], [0, -zf + 0.07, w + 0.22, 0.14], [w / 2 - 0.07, 0, 0.14, d], [-w / 2 + 0.07, 0, 0.14, d]]) K.box(c, x, Ht + 0.2, z, ww, 0.5, dd, wall, { id: 4, pat: 8 });
  // térreo
  const sfW = Math.min(w - 1.3, 3.6), sfX = -(w - sfW) / 2 + 0.35;
  if (s.front === 'glass') K.pl(c, sfX, 1.3, zf + 0.012, sfW, 2.0, texShopWin(s.goods || 'market'), { id: 6 });
  else K.pl(c, sfX, 1.35, zf + 0.012, sfW, 2.2, texShutter(s.shutter ?? 0, s.shutterC || '#a7b2ad'), { id: 6 });
  const dx = sfX + sfW / 2 + 0.6;
  if (dx + 0.45 < w / 2) K.pl(c, dx, 1.27, zf + 0.012, 0.86, 2.15, texDoor(s.front === 'glass' ? 'glass' : 'metal', s.doorC || '#7f8f8a'), { id: 6 });
  if (s.sign) K.board(c, 0, 2.62, zf + 0.12, Math.min(w - 0.3, 4.4), 0.62, texSign(s.sign, s.signBg || '#f3c258', s.signFg || '#f4f4ef', { font: s.signFont }), { frame: s.signFrame });
  if (s.awning) {
    const dep = 1.05, a = 0.38;
    K.boxc(c, 0, 2.28 - Math.sin(a) * dep / 2, zf + Math.cos(a) * dep / 2, w * 0.92, 0.05, dep, '#ffffff', { rx: a, uv: texAwning(s.awning[0], s.awning[1]), id: 6 });
    K.boxc(c, 0, 2.28 - Math.sin(a) * dep - 0.11, zf + Math.cos(a) * dep + 0.01, w * 0.92, 0.22, 0.03, '#ffffff', { uv: texStripes(s.awning[0], s.awning[1], 12), id: 6 });
  }
  if (s.posters) for (let i = 0; i < s.posters.length; i++) addPoster(c, w / 2 - 0.45 - i * 0.62, 1.55, zf, s.posters[i]);
  // andares de cima
  const wk = s.win || pickR(WIN_KINDS), n = Math.max(1, Math.floor((w - 0.5) / 1.45));
  for (let f = 0; f < fl; f++) {
    const y0 = g0 + f * gf + 0.55;
    const balc = s.balcony && f === 0;
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * (w / n);
      addWindow(c, x, y0, zf, (i + f) % 3 === 2 ? pickR(WIN_KINDS) : wk, { lintel: true });
      if (!balc && rand() < 0.3) addAC(c, x + 0.62, y0 - 0.1, zf);
    }
    if (balc) {
      K.box(c, 0, y0 - 0.62, zf + 0.42, w * 0.7, 0.13, 0.84, trim, { id: 5 });
      addRailing(c, -w * 0.35 + 0.05, w * 0.35 - 0.05, y0 - 0.49, zf + 0.8);
      if (rand() < 0.6) for (let k = 0; k < 3; k++) K.box(c, -w * 0.2 + k * 0.42, y0 - 0.1, zf + 0.84, 0.32, 0.42, 0.015, pickR(['#f4f4ef', '#66bde6', '#e7a58c', '#f3c258']), { id: 7, layer: 'small' });
    }
    if (d > 3.2) for (const sx of [-1, 1]) addWindow(c, sx * (w / 2), y0, 0, wk, { ry: sx * Math.PI / 2 });
  }
  addPipe(c, w / 2 - 0.12, 0, zf + 0.06, Ht);
  // telhado
  if (s.tank !== false && rand() < 0.75) addTank(c, rr(-w / 4, w / 4), Ht + 0.26, -d / 4, rr(0.85, 1.1));
  if (rand() < 0.5) addAntenna(c, -w / 2 + 0.6, Ht + 0.26, -d / 2 + 0.6);
  if (rand() < 0.4) addDish(c, w / 2 - 0.6, Ht + 0.26, d / 2 - 0.7, rand() * 6);
  if (rand() < 0.35) addSolar(c, 0, Ht + 0.6, d / 2 - 0.9);
  if (rand() < 0.35) K.box(c, -w / 4, Ht + 0.26, d / 4, 1.1, 1.05, 1.1, wall, { id: 4, pat: 8 });
  return Ht;
}
// casa com telhado de duas águas, muro e jardim
export function bHouse(c, s) {
  const w = s.w, d = s.d, fl = s.fl ?? 1, fh = 2.55, Ht = 0.3 + fl * fh, zf = d / 2;
  const wall = s.wall || pickR(HOUSEW), roof = s.roof || pickR(ROOFS), trim = '#f1eee4';
  K.box(c, 0, -1.0, 0, w + 0.1, 1.3, d + 0.1, '#aeb1a6', { pat: 2, id: 5 });
  K.box(c, 0, 0.3, 0, w, Ht - 0.3, d, wall, { pat: s.pat ?? pickR([8, 8, 1, 7]), id: 4 });
  K.box(c, 0, Ht - 0.12, 0, w + 0.16, 0.14, d + 0.16, trim, { id: 5 });
  const ov = 0.32, rh = Math.min(1.7, Math.max(w, d) * 0.3);
  if (s.ridgeZ) K.prism(c, 0, Ht, 0, d + ov * 2, rh, w + ov * 2, roof, { pat: 5, id: 3, ry: Math.PI / 2 });
  else K.prism(c, 0, Ht, 0, w + ov * 2, rh, d + ov * 2, roof, { pat: 5, id: 3 });
  // porta, alpendre e janelas
  const doorX = s.doorX ?? (w > 4.2 ? -w / 2 + 1.1 : 0);
  K.pl(c, doorX, 0.3 + 1.0, zf + 0.012, 0.9, 2.0, texDoor('wood', s.doorC || pickR(['#8a6a4f', '#5a8f73', '#4f86b8', '#c25959'])), { id: 6 });
  K.box(c, doorX, 0, zf + 0.4, 1.5, 0.3, 0.8, '#c9cdc2', { id: 5, pat: 6 });
  K.box(c, doorX, -0.1, zf + 0.95, 1.2, 0.15, 0.35, '#c9cdc2', { id: 5 });
  K.box(c, doorX, 2.5, zf + 0.35, 1.45, 0.1, 0.75, trim, { id: 5 });
  const shut = rand() < 0.5 ? pickR(['#5a8f73', '#4f86b8', '#c25959', '#8a6a4f', '#f3c258']) : null;
  const wk = s.win || pickR(['glass', 'curtain', 'grille', 'curtain2', 'blind']);
  for (let f = 0; f < fl; f++) {
    const y0 = 0.3 + f * fh + 0.9;
    const xs = f === 0 ? (w > 4.2 ? [0.4, w / 2 - 0.9] : [w / 2 - 0.85]) : [-w / 4, w / 4];
    for (const x of xs) if (Math.abs(x - doorX) > 0.9 || f > 0) addWindow(c, x, y0, zf, wk, { shut, w: 0.8, h: 1.0 });
    for (const sx of [-1, 1]) if (d > 3) addWindow(c, sx * w / 2, y0, 0, wk, { ry: sx * Math.PI / 2, w: 0.8, h: 1.0 });
  }
  // muro baixo com portão
  if (s.yard) {
    const yz = zf + s.yard, mw = s.lotW || w + 0.8, mc = s.murC || pickR(['#e9e6dc', wall, '#d8d3c4']);
    const gx = doorX, gw = 1.1;
    const segs = [[-mw / 2, gx - gw / 2], [gx + gw / 2, mw / 2]];
    for (const [a, b] of segs) if (b - a > 0.1) {
      K.box(c, (a + b) / 2, -0.3, yz, b - a, 1.25, 0.18, mc, { id: 4, pat: 8 });
      K.box(c, (a + b) / 2, 0.95, yz, b - a + 0.04, 0.07, 0.24, '#c9cdc2', { id: 5 });
    }
    for (const x of [gx - gw / 2 - 0.12, gx + gw / 2 + 0.12]) K.box(c, x, -0.3, yz, 0.26, 1.45, 0.26, mc, { id: 4 });
    K.pl(c, gx, 0.45, yz + 0.01, gw, 0.95, texDoor('gate', '#4b5658'), { id: 6 });
    for (const sx of [-1, 1]) K.box(c, sx * mw / 2, -0.3, (zf + yz) / 2, 0.18, 1.25, s.yard, mc, { id: 4, pat: 8 });
    if (rand() < 0.8) bush(c, mw / 2 - 0.6, yz - 0.6, rr(0.5, 0.8));
    if (rand() < 0.5) flowers(c, -mw / 2 + 0.7, yz - 0.5);
    if (rand() < 0.3) K.box(c, mw / 2 - 0.35, 0.95, yz + 0.05, 0.3, 0.35, 0.22, '#c25959', { id: 7, layer: 'small' });
  }
  // caixa d'água e antena
  if (rand() < 0.7) addTank(c, w / 2 - 0.5, Ht + rh * 0.4, -d / 2 + 0.6, 0.8);
  else if (rand() < 0.5) addDish(c, -w / 2 + 0.5, Ht, d / 2 - 0.2, 0.6);
  return Ht + rh;
}
// sede da GIRA S.A.
export function bTower(c, s) {
  const w = s.w || 7, d = s.d || 7, nf = s.floors || 6, g0 = 3.6, fh = 2.6, Ht = g0 + nf * fh, zf = d / 2;
  K.box(c, 0, -1.1, 0, w + 0.2, 1.3, d + 0.2, '#9aa19a', { pat: 2, id: 5 });
  K.box(c, 0, 0.2, 0, w, Ht - 0.2, d, '#c7cfcb', { id: 4, pat: 8 });
  K.box(c, 0, 0.2, zf - 0.2, w + 0.3, 0.2, 2.2, '#9fa8a3', { id: 5 });
  K.pl(c, 0, 1.5, zf + 0.012, w - 1.6, 2.6, texOffice(), { id: 6 });
  K.pl(c, 0, 1.25, zf + 0.02, 1.6, 2.1, texDoor('glass', '#5d6a6b'), { id: 6 });
  for (const x of [-w / 2 + 0.4, w / 2 - 0.4]) K.cyl(c, x, 0.2, zf + 0.9, 0.22, g0 - 0.2, '#e9e6dc', { n: 12, id: 5 });
  K.box(c, 0, g0 - 0.25, zf + 0.5, w + 0.2, 0.25, 1.5, '#e9e6dc', { id: 5 });
  K.board(c, 0, g0 + 0.55, zf + 0.25, 4.8, 0.95, texSign('GIRA S.A.', '#de794e', '#f4f4ef'), {});
  for (let f = 0; f < nf; f++) {
    const y = g0 + f * fh + 0.35;
    for (const [ry, xx, zz, ww] of [[0, 0, zf, w], [Math.PI, 0, -zf, w], [Math.PI / 2, w / 2, 0, d], [-Math.PI / 2, -w / 2, 0, d]]) {
      const s1 = Math.sin(ry), c1 = Math.cos(ry);
      K.pl(c, xx + s1 * 0.012, y + 1.0, zz + c1 * 0.012, ww - 0.6, 1.9, texOffice(), { ry, id: 6 });
    }
    K.box(c, 0, y - 0.3, 0, w + 0.1, 0.12, d + 0.1, '#e9e6dc', { id: 5 });
  }
  K.box(c, 0, Ht - 0.6, 0, w + 0.14, 0.6, d + 0.14, '#de794e', { id: 5 });
  K.box(c, 0, Ht, 0, w + 0.2, 0.25, d + 0.2, '#e9e6dc', { id: 5 });
  // faixas na fachada
  K.pl(c, -w / 2 + 0.55, g0 + 4.4, zf + 0.06, 0.7, 2.8, texBanner('SOMOS UMA FAMÍLIA', '#f3c258', '#f4f4ef'), { id: 6 });
  K.pl(c, w / 2 - 0.55, g0 + 4.4, zf + 0.06, 0.7, 2.8, texBanner('META: 1 VOLTA/DIA', '#66bde6', '#f4f4ef'), { id: 6 });
  K.cyl(c, w / 4, Ht + 0.25, -d / 4, 0.06, 4.5, '#8d9792', { n: 5 });
  K.sph(c, w / 4, Ht + 4.8, -d / 4, 0.14, 0.14, 0.14, '#c25959', { id: 5 });
  for (let i = 0; i < 3; i++) addAC(c, -w / 2 + 1 + i * 1.2, Ht + 0.35, -d / 2 + 0.6);
  return Ht;
}
// galpão da fábrica
export function bWarehouse(c, s) {
  const w = s.w || 12, d = s.d || 9, h = s.h || 6, zf = d / 2;
  K.box(c, 0, -1.0, 0, w + 0.2, 1.2, d + 0.2, '#9aa19a', { pat: 2, id: 5 });
  K.box(c, 0, 0.2, 0, w, h, d, s.wall || '#9fb3a9', { pat: 4, id: 4 });
  K.box(c, 0, 0.2, zf - 0.02, w + 0.04, 1.2, 0.08, '#6f8a8e', { id: 5, pat: 4 });
  const n = 3;
  for (let i = 0; i < n; i++) K.prism(c, 0, h + 0.2, -d / 2 + (i + 0.5) * d / n, w + 0.3, 1.3, d / n, '#7d8f8a', { pat: 4, id: 3 });
  K.pl(c, -w / 4, 1.95, zf + 0.012, 3.4, 3.5, texShutter(3, '#c9b183'), { id: 6 });
  K.pl(c, w / 4, 1.95, zf + 0.012, 3.4, 3.5, texShutter(2, '#c9b183'), { id: 6 });
  for (let i = 0; i < 5; i++) K.pl(c, -w / 2 + 1.2 + i * (w - 2.4) / 4, h - 0.7, zf + 0.012, 1.4, 0.8, texWin('glass'), { id: 6 });
  if (s.sign) K.board(c, 0, h + 1.1, zf + 0.15, Math.min(w - 1, 7.5), 0.95, texSign(s.sign, '#373f42', '#f3c258'), { frame: '#2f3a40' });
  if (s.graffiti) K.pl(c, 0, 4.15, zf + 0.014, 4.2, 1.4, texGraffiti(s.graffiti, '#c25959'), { id: 6 });
  for (let i = 0; i < 4; i++) K.cyl(c, w / 2 + 0.25, 1.2 + i * 1.1, -d / 2 + 1, 0.12, d - 2, i % 2 ? '#b07c5c' : '#8d9792', { rx: Math.PI / 2, center: true, n: 8 });
  return h;
}
export function chimney(c, x, z, h = 10, r = 0.55) {
  const segs = 6;
  for (let i = 0; i < segs; i++) K.cyl(c, x, i * h / segs, z, r * (1 - i * 0.05), h / segs + 0.01, i % 2 ? '#f4f4ef' : '#c25959', { n: 12, top: (1 - (i + 1) * 0.05) / (1 - i * 0.05), id: 5 });
  K.cyl(c, x, h, z, r * 0.78, 0.25, '#4b5658', { n: 12, id: 5 });
}
export function bSchool(c, s) {
  const w = 13, d = 5.5, fh = 2.8, Ht = 0.3 + 2 * fh, zf = d / 2;
  K.box(c, 0, -1.0, 0, w + 0.1, 1.3, d + 0.1, '#aeb1a6', { pat: 2, id: 5 });
  K.box(c, 0, 0.3, 0, w, Ht - 0.3, d, '#efe0b9', { pat: 8, id: 4 });
  K.box(c, 0, 0.3, zf - 0.01, w + 0.04, 1.0, 0.06, '#66bde6', { id: 5 });
  K.box(c, 0, Ht, 0, w + 0.3, 0.3, d + 0.3, '#e9e6dc', { id: 5 });
  K.prism(c, 0, Ht + 0.3, 0, w + 0.5, 1.1, d + 0.6, '#b5654a', { pat: 5, id: 3 });
  for (let f = 0; f < 2; f++) for (let i = 0; i < 7; i++) {
    const x = -w / 2 + 1 + i * (w - 2) / 6;
    if (f === 0 && i === 3) continue;
    addWindow(c, x, 0.3 + f * fh + 0.85, zf, f ? 'blind' : 'glass', { w: 1.0, h: 1.2 });
  }
  K.pl(c, 0, 1.4, zf + 0.012, 1.5, 2.2, texDoor('glass', '#4f86b8'), { id: 6 });
  K.box(c, 0, 2.6, zf + 0.6, 2.4, 0.12, 1.2, '#e9e6dc', { id: 5 });
  for (const x of [-1.1, 1.1]) K.cyl(c, x, 0.3, zf + 1.1, 0.08, 2.3, '#e9e6dc', { n: 8 });
  K.board(c, 0, Ht - 0.55, zf + 0.15, 7.2, 0.62, texSign('ESCOLA ESTADUAL GALILEU GALILEI', '#4f86b8', '#f4f4ef', { font: 'lbl' }), {});
  return Ht;
}
export function bMansion(c) {
  const w = 10, d = 7, fh = 3.1, Ht = 0.6 + 2 * fh, zf = d / 2;
  K.box(c, 0, -0.9, 0, w + 0.6, 1.5, d + 0.6, '#dfe2d9', { pat: 6, id: 5 });
  K.box(c, 0, 0.6, 0, w, Ht - 0.6, d, '#f7f5ee', { id: 4, pat: 8 });
  K.box(c, 0, 0.6 + fh - 0.1, 0, w + 0.2, 0.2, d + 0.2, '#e5c27a', { id: 5 });
  K.box(c, 0, Ht, 0, w + 0.4, 0.25, d + 0.4, '#e5c27a', { id: 5 });
  K.prism(c, 0, Ht + 0.25, 0, w + 1.0, 2.0, d + 1.0, '#c25959', { pat: 5, id: 3 });
  for (let i = 0; i < 4; i++) K.cyl(c, -w / 2 + 1.4 + i * (w - 2.8) / 3, 0.6, zf + 1.3, 0.24, fh * 2 - 0.3, '#f7f5ee', { n: 14, id: 5 });
  K.box(c, 0, 0.6 + fh * 2 - 0.3, zf + 0.8, w - 1.6, 0.3, 1.8, '#e5c27a', { id: 5 });
  K.box(c, 0, 0.6 + fh, zf + 0.9, w - 1.6, 0.16, 1.8, '#f7f5ee', { id: 5 });
  addRailing(c, -w / 2 + 0.9, w / 2 - 0.9, 0.6 + fh + 0.16, zf + 1.75, 0.85, '#e5c27a');
  for (let f = 0; f < 2; f++) for (let i = 0; i < 4; i++) addWindow(c, -w / 2 + 1.4 + i * (w - 2.8) / 3, 0.6 + f * fh + 0.8, zf, 'curtain2', { w: 1.1, h: 1.6, frame: '#f2e6c4', sill: '#e5c27a' });
  K.pl(c, 0, 0.6 + 1.25, zf + 0.02, 1.7, 2.4, texDoor('wood', '#8a5a3f'), { id: 6 });
  for (let i = 0; i < 4; i++) K.box(c, 0, 0.6 - i * 0.2 - 0.2, zf + 0.5 + i * 0.32, 3.4 + i * 0.4, 0.2, 0.34, '#dfe2d9', { id: 5, pat: 6 });
  for (const sx of [-1, 1]) for (let f = 0; f < 2; f++) addWindow(c, sx * w / 2, 0.6 + f * fh + 0.8, 0, 'curtain2', { ry: sx * Math.PI / 2, w: 1.1, h: 1.6, frame: '#f2e6c4' });
  return Ht;
}
export function bKiosk(c, s) {
  // banca de jornal
  const w = 2.6, d = 1.8;
  K.box(c, 0, -0.6, 0, w, 2.9, d, '#5a8f73', { id: 4, pat: 4 });
  K.box(c, 0, 2.3, 0, w + 0.6, 0.16, d + 0.8, '#4b7a62', { id: 5 });
  K.box(c, 0, 0.8, d / 2 + 0.3, w - 0.2, 0.12, 0.6, '#e9e6dc', { id: 5 });
  for (let i = 0; i < 4; i++) K.pl(c, -w / 2 + 0.4 + i * 0.6, 1.5, d / 2 + 0.012, 0.5, 0.38, texNews(), { id: 6 });
  for (let i = 0; i < 3; i++) K.pl(c, -0.6 + i * 0.6, 0.98, d / 2 + 0.55, 0.5, 0.36, texNews(), { rx: -1.2, id: 6 });
  K.board(c, 0, 2.62, d / 2 + 0.45, 2.2, 0.42, texSign('BANCA DA NEIDE', '#f3c258', '#373f42', { font: 'lbl' }), {});
}
export function bBusStop(c) {
  K.box(c, 0, 0, -0.5, 3.0, 0.08, 1.2, '#c9cdc2', { id: 2 });
  for (const x of [-1.4, 1.4]) K.box(c, x, 0, -0.95, 0.08, 2.4, 0.08, '#4b5658', { id: 5 });
  K.box(c, 0, 2.4, -0.5, 3.2, 0.1, 1.4, '#66bde6', { id: 5 });
  K.box(c, 0, 0.45, -0.85, 2.4, 0.08, 0.38, '#b48d63', { id: 3 });
  K.pl(c, 0, 1.5, -1.0, 2.6, 1.6, texPoster('gira'), { id: 6 });
  K.cyl(c, 1.75, 0, 0.1, 0.04, 2.6, '#4b5658', { n: 5 });
  K.board(c, 1.75, 2.35, 0.13, 0.75, 0.5, texSign('ÔNIBUS', '#4f86b8', '#f4f4ef', { font: 'lbl' }), {});
}
export function bOrelhao(c) {
  K.cyl(c, 0, 0, 0, 0.05, 1.7, '#4b5658', { n: 5 });
  K.sph(c, 0, 1.95, 0.12, 0.5, 0.62, 0.5, '#f3c258', { geo: DOME, rx: Math.PI * 0.42, id: 5 });
  K.box(c, 0, 1.25, 0.12, 0.26, 0.42, 0.14, '#9aa39e', { id: 6 });
}
export function bLifeguard(c) {
  for (const [x, z] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) K.box(c, x, -0.4, z, 0.14, 2.6, 0.14, '#f4f4ef', { id: 5 });
  K.box(c, 0, 2.2, 0, 2.0, 0.12, 2.0, '#b48d63', { id: 3 });
  K.box(c, 0, 2.32, 0, 1.6, 1.3, 1.6, '#c25959', { id: 4, pat: 3 });
  K.pl(c, 0, 3.0, 0.81, 1.0, 0.5, texWin('dark'), { id: 6 });
  K.prism(c, 0, 3.62, 0, 2.0, 0.6, 2.0, '#f4f4ef', { id: 3 });
  for (let i = 0; i < 6; i++) K.box(c, 0, 0.1 + i * 0.35, 1.2 + i * 0.12, 0.8, 0.06, 0.2, '#b48d63', { id: 3, layer: 'small' });
  K.cyl(c, 0.9, 3.6, 0.9, 0.03, 1.6, '#4b5658', { n: 4 });
  K.box(c, 1.2, 4.7, 0.9, 0.6, 0.4, 0.02, '#c25959', { id: 7 });
}
export function bBeachKiosk(c, s) {
  K.box(c, 0, 0, 0, 2.6, 1.1, 1.6, '#b48d63', { id: 4, pat: 3 });
  K.box(c, 0, 1.1, 0.3, 2.8, 0.1, 1.3, '#e9e6dc', { id: 5 });
  for (const [x, z] of [[-1.3, -0.8], [1.3, -0.8], [-1.3, 0.85], [1.3, 0.85]]) K.cyl(c, x, 0, z, 0.06, 2.4, '#8e6c4b', { n: 6 });
  K.sph(c, 0, 2.35, 0.05, 2.0, 0.9, 1.5, '#d9c27a', { geo: DOME, id: 3 });
  K.board(c, 0, 1.95, 0.95, 2.2, 0.4, texSign(s.sign || 'QUIOSQUE', '#66bde6', '#f4f4ef', { font: 'lbl' }), {});
}
export function bGuardBooth(c) {
  K.box(c, 0, -0.8, 0, 1.4, 3.1, 1.4, '#e9e6dc', { id: 4, pat: 8 });
  K.box(c, 0, 2.3, 0, 1.7, 0.15, 1.7, '#4b5658', { id: 5 });
  K.pl(c, 0, 1.5, 0.71, 0.9, 0.7, texWin('glass'), { id: 6 });
  K.pl(c, 0.71, 1.5, 0, 0.9, 0.7, texWin('glass'), { id: 6, ry: Math.PI / 2 });
}
export function bClockTower(c) {
  const w = 2.4, h = 8.5;
  K.box(c, 0, -0.6, 0, w + 0.8, 1.2, w + 0.8, '#b9b4a4', { pat: 2, id: 5 });
  K.box(c, 0, 0.6, 0, w, h - 0.6, w, '#e0d2b4', { pat: 1, id: 4 });
  K.box(c, 0, h - 2.4, 0, w + 0.3, 0.2, w + 0.3, '#f1eee4', { id: 5 });
  K.box(c, 0, h, 0, w + 0.3, 0.25, w + 0.3, '#f1eee4', { id: 5 });
  K.prism(c, 0, h + 0.25, 0, w + 0.4, 1.6, w + 0.4, '#5a8f73', { id: 3 });
  K.prism(c, 0, h + 0.25, 0, w + 0.4, 1.6, w + 0.4, '#5a8f73', { id: 3, ry: Math.PI / 2 });
  const uv = texClock();
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2, s = Math.sin(a), co = Math.cos(a);
    K.pl(c, s * (w / 2 + 0.015), h - 1.2, co * (w / 2 + 0.015), 1.7, 1.7, uv, { ry: a, id: 6 });
  }
  K.pl(c, 0, 1.4, w / 2 + 0.012, 0.9, 1.6, texDoor('wood', '#5a6a5f'), { id: 6 });
  K.board(c, 0, 3.4, w / 2 + 0.1, 1.5, 0.42, texSign('RELÓGIO DA PRAÇA', '#e0d2b4', '#373f42', { font: 'lbl', outline: false }), { frame: '#8a7b5f' });
}
export function bStatue(c) {
  K.box(c, 0, 0, 0, 1.8, 0.4, 1.8, '#b9b4a4', { id: 5, pat: 2 });
  K.box(c, 0, 0.4, 0, 1.2, 1.4, 1.2, '#c9c3b1', { id: 4, pat: 2 });
  K.pl(c, 0, 1.05, 0.612, 0.9, 0.42, texSign('AVÔ OTÁVIO\n1952', '#a07c48', '#f3e1b0', { font: 'lbl', w: 256, h: 128 }), { id: 6 });
  const B = '#6f8f7a', y = 1.8;
  K.box(c, -0.12, y, 0.05, 0.16, 0.8, 0.18, B, { id: 7, rx: 0.25 });
  K.box(c, 0.12, y, -0.05, 0.16, 0.8, 0.18, B, { id: 7, rx: -0.25 });
  K.sph(c, 0, y + 1.15, 0, 0.3, 0.42, 0.22, B, { id: 7 });
  K.sph(c, 0, y + 1.72, 0, 0.19, 0.21, 0.19, B, { id: 7 });
  K.cyl(c, 0.3, y + 1.25, 0.15, 0.06, 0.62, B, { id: 7, rz: 2.4, rx: -0.4, center: true, n: 6 });
  K.cyl(c, -0.3, y + 1.0, 0, 0.06, 0.55, B, { id: 7, rz: -0.2, center: true, n: 6 });
  K.cyl(c, 0, y + 1.88, 0, 0.24, 0.05, B, { id: 7, n: 10 });
  K.cyl(c, 0, y + 1.92, 0, 0.14, 0.18, B, { id: 7, n: 10 });
}
export function bFountain(c) {
  K.cyl(c, 0, 0, 0, 2.1, 0.55, '#c9c3b1', { n: 22, id: 5 });
  K.cyl(c, 0, 0.1, 0, 1.85, 0.4, '#6fc4c6', { n: 22, id: 7 });
  K.cyl(c, 0, 0.5, 0, 0.35, 0.9, '#c9c3b1', { n: 12, id: 5 });
  K.cyl(c, 0, 1.4, 0, 0.8, 0.2, '#c9c3b1', { n: 16, id: 5, top: 1.15 });
  K.cyl(c, 0, 1.6, 0, 0.12, 0.5, '#c9c3b1', { n: 8, id: 5 });
}
export function bPodium(c) {
  K.box(c, 0, -0.6, 0, 1.5, 0.95, 1.3, '#c25959', { id: 5 });
  K.box(c, 0, 0.35, 0.35, 0.8, 0.85, 0.45, '#a94e4e', { id: 5 });
  K.pl(c, 0, 0.85, 0.58, 0.62, 0.62, texLogo(), { id: 6 });
}
