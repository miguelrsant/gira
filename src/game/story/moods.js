// ================= humor da Duda ao longo da semana, e os respiros =================
// cada dia tem um humor de base, um ânimo de partida e o quanto andar cansa (drain)
export const DAY_MOOD = {
  1: { mood: 'irritada', start: 0.6, drain: 1.0, wake: 'acordou irritada' },
  2: { mood: 'entediada', start: 0.75, drain: 0.8, wake: 'o relógio anda de má vontade', slow: 0.2 },
  3: { mood: 'tranquila', start: 0.9, drain: 0.7, wake: 'até que acordou bem' },
  4: { mood: 'cansada', start: 0.65, drain: 1.05, wake: 'o corpo começa a cobrar' },
  5: { mood: 'exausta', start: 0.45, drain: 1.25, wake: 'acordou com dor de cabeça' },
  6: { mood: 'exausta', start: 0.35, drain: 1.35, wake: 'a cabeça lateja' },
  7: { mood: 'irritada', start: 0.4, drain: 1.3, wake: 'hoje é folga, né?' },
};
export const MOOD_NAME = { irritada: 'irritada', entediada: 'entediada', tranquila: 'tranquila', cansada: 'cansada', exausta: 'exausta', feliz: 'feliz' };

// respiros: pequenas pausas espalhadas pelo planeta, uma vez por dia cada. Devolvem ânimo.
//   still: ficar parada no lugar por time segundos · jump: pular count vezes · talk: conversar (ou fazer carinho)
//   closed: o lugar existe, mas não deixa descansar
export const RESPIROS = [
  { id: 'mar', district: 'PRAIA DO INTERVALO', kind: 'still', time: 4, gain: 0.22, text: 'olhar o mar', done: 'Três minutos de mar. O peito abriu um pouquinho.' },
  { id: 'vista', district: 'MIRANTE', kind: 'still', time: 4, gain: 0.22, text: 'ver o planeta lá de cima', done: 'Lá de cima, ninguém parece atrasado.' },
  { id: 'horta', district: 'HORTA COMUNITÁRIA', kind: 'still', time: 5, gain: 0.16, text: 'cuidar da horta', done: 'A alface não tem meta. Cresce quando dá.' },
  { id: 'ilha', district: 'ILHA DO SINAL FRACO', kind: 'still', time: 3, gain: 0.3, text: 'ficar sem sinal', done: 'Sem sinal. Ninguém te liga. Que delícia.' },
  { id: 'amarelinha', district: 'CAMPINHO', kind: 'jump', count: 4, gain: 0.16, text: 'pular amarelinha', done: 'Proibido em dia útil. Foi bom igual.' },
  { id: 'banco', npc: 'lino', kind: 'still', r: 3.4, time: 5, gain: 0.2, text: 'sentar com o Seu Lino', done: 'O Seu Lino não disse nada. Nem precisava.' },
  { id: 'carinho', npc: 'caramelo', kind: 'talk', gain: 0.15, done: 'Ninguém cobra produtividade de cachorro.' },
  { id: 'gato', npc: 'mingau', kind: 'talk', gain: 0.1, done: 'O Mingau ronronou. É o som mais calmo do planeta.' },
  { id: 'pao', npc: 'nara', kind: 'talk', gain: 0.12, done: 'A Nara deixou um pão quentinho na sua mão.' },
  { id: 'parque', district: 'PARQUE DOMINGUEIRO', kind: 'closed', text: 'Parque fechado. Abre só aos domingos. Descanso, só com hora marcada.' },
];
