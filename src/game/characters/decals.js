// ---------------- decalques ----------------
import { decal } from './faces.js';

export function decSign(text, bg = '#f1e6c8', fg = '#c25959') {
  return decal('sign' + text, 2, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(55,63,66,0.25)'; g.lineWidth = 4; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    const lines = text.split('\n'), fsz = lines.length > 1 ? 44 : 64;
    g.font = `${fsz}px "Patrick Hand SC", "Comic Sans MS", cursive`;
    lines.forEach((l, i) => { g.save(); g.translate(w / 2, h / 2 + (i - (lines.length - 1) / 2) * fsz * 0.95); g.rotate(-0.03 + i * 0.03); g.fillText(l, 0, 2); g.restore(); });
  });
}
export function decLogo() {
  return decal('logo', 1, (g, w, h) => {
    g.fillStyle = '#de794e'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#f4f4ef'; g.lineWidth = 9; g.beginPath(); g.arc(w / 2, h / 2, 34, 0.4, Math.PI * 1.75); g.stroke();
    g.fillStyle = '#f4f4ef'; g.beginPath(); g.moveTo(w / 2 + 30, h / 2 - 34); g.lineTo(w / 2 + 46, h / 2 - 10); g.lineTo(w / 2 + 16, h / 2 - 12); g.closePath(); g.fill();
    g.font = 'bold 26px "Silkscreen", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('GIRA', w / 2, h / 2 + 2);
  });
}
export function decPhone() {
  return decal('phone', 1, (g, w, h) => {
    g.fillStyle = '#2f3a40'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#9fe0d6'; g.fillRect(30, 10, 68, 108);
    g.fillStyle = '#de794e'; g.beginPath(); g.arc(64, 54, 16, 0, 7); g.fill();
    g.fillStyle = '#c25959'; g.beginPath(); g.arc(44, 24, 5, 0, 7); g.fill();
    g.fillStyle = '#f4f4ef'; g.font = 'bold 12px "Silkscreen", monospace'; g.textAlign = 'center'; g.fillText('AO VIVO', 64, 98);
  });
}
export function decNews() {
  return decal('news', 2, (g, w, h) => {
    g.fillStyle = '#efeee6'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#373f42'; g.font = 'bold 22px "Silkscreen", monospace'; g.textAlign = 'center'; g.fillText('O GIRANTE', w / 2, 26);
    g.fillRect(10, 34, w - 20, 3);
    g.font = '22px "Patrick Hand SC", cursive'; g.fillText('META: +1 VOLTA', w / 2, 60);
    for (let i = 0; i < 4; i++) { g.fillRect(14, 74 + i * 11, w / 2 - 24, 4); g.fillRect(w / 2 + 10, 74 + i * 11, w / 2 - 24, 4); }
  });
}
export function decBox() {
  return decal('jah', 1, (g, w, h) => {
    g.fillStyle = '#c25959'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f4f4ef'; g.font = '58px "Bungee", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('JÁ!', w / 2, h / 2 - 6);
    g.font = 'bold 13px "Silkscreen", monospace'; g.fillText('ENTREGA EM 7 MIN', w / 2, h - 18);
  });
}
export const STRIKE = ['PAREI!', '6x1\nNÃO', 'DOMINGO\nÉ NOSSO', 'ELE GIRA\nSOZINHO', 'QUEREMOS\nTEMPO', 'VIDA ALÉM\nDA VOLTA', 'HOJE\nNÃO'];
