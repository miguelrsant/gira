// ---------------- Duda (a protagonista): guarda-roupa ----------------
// o primeiro item de cada lista é o visual de sempre dela: black power com faixa vermelha,
// camiseta amarela, macacão azul, tênis branco de sola laranja e o relógio que conta os passos
export const OUTFIT_OPTS = {
  hair: [['afro', '#2b2522', 'Black power'], ['curly', '#3d3330', 'Cacheado'], ['puff', '#2b2522', 'Puff'], ['buns', '#2f3437', 'Dois coquinhos'], ['pony', '#3d3330', 'Rabo de cavalo'], ['braid', '#9b4a3a', 'Trança ruiva'], ['short', '#c99a5b', 'Curtinho loiro'], ['long', '#29323d', 'Comprido']],
  top: [['tee', '#f3c258', 'Camiseta amarela'], ['tee', '#f4f4ef', 'Camiseta branca'], ['polo', '#de794e', 'Uniforme GIRA'], ['hoodie', '#8cc48c', 'Moletom verde'], ['tank', '#66bde6', 'Regata azul'], ['cardigan', '#c25959', 'Casaquinho vermelho']],
  bottom: [['overall', '#3f8fb8', 'Macacão azul'], ['pants', '#4f6f8f', 'Calça jeans'], ['shorts', '#373f42', 'Bermuda'], ['skirt', '#c25959', 'Saia vermelha'], ['overall', '#8a6fa8', 'Macacão roxo']],
  shoes: [['sneaker', '#f4f4ef', '#de794e', 'Tênis branco'], ['sneaker', '#f3c258', '#f4f4ef', 'Tênis amarelo'], ['sandal', '#66bde6', '#f4f4ef', 'Chinelo'], ['boot', '#8a5a3a', '#4b3a2f', 'Bota']],
  skin: [['#a8693f', 'Pele 4'], ['#f6d7c3', 'Pele 1'], ['#eec1a1', 'Pele 2'], ['#d9a27c', 'Pele 3'], ['#8d5a3b', 'Pele 5'], ['#6b4430', 'Pele 6']],
};
export let outfit = { hair: 0, top: 0, bottom: 0, shoes: 0, skin: 0 };
try { const s = JSON.parse(localStorage.getItem('gira3-outfit')); if (s) outfit = Object.assign(outfit, s); } catch (e) {}
export function heroSpec() {
  const h = OUTFIT_OPTS.hair[outfit.hair % OUTFIT_OPTS.hair.length], t = OUTFIT_OPTS.top[outfit.top % OUTFIT_OPTS.top.length];
  const b = OUTFIT_OPTS.bottom[outfit.bottom % OUTFIT_OPTS.bottom.length], s = OUTFIT_OPTS.shoes[outfit.shoes % OUTFIT_OPTS.shoes.length];
  const skin = OUTFIT_OPTS.skin[outfit.skin % OUTFIT_OPTS.skin.length][0];
  return {
    body: 'f', skin, hair: { style: h[0], color: h[1], band: h[0] === 'afro' ? '#c25959' : '#f3c258' }, top: { kind: t[0], color: t[1] }, bottom: { kind: b[0], color: b[1] },
    shoes: { kind: s[0], color: s[1], sole: s[2] }, socks: b[0] === 'pants' || b[0] === 'overall' ? null : '#2f3437', acc: t[0] === 'polo' ? ['badge', 'watch'] : ['watch'],
    face: { bags: true, mouth: 'smile' }, sign: 'PAREI!'
  };
}
