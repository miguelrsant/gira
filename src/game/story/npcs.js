// ---------------- NPCs ----------------
import { headline } from './news.js';
import { state } from '../play/state.js';

const D = (lines) => lines;
const WALKER_BUBBLES = { 1: 'Mais uma.', 2: 'Bom dia.', 3: 'Cadê meu fone?', 4: '...', 5: 'Quase lá. Ou não.', 6: 'Mais uma.', 7: 'Sério?', strike: 'Ufa.', sunday: 'Que silêncio bom.' };
export const NPCS = [
  { id: 'valdir', name: 'SEU VALDIR', tag: '#c25959', voice: 120, cast: 'valdir', at: { spot: 'valdir' },
    bubble: { 1: 'O planeta não gira sozinho!', 2: 'Parou? Eu vi.', 3: 'Somos uma família!', 4: 'Eu também trabalho, tá?', 5: 'Sextou! Pra mim.', 6: 'Domingo... vamos ver.', 7: 'Folga é um estado de espírito.', strike: 'VOLTEM! O PLANETA VAI PARAR!', sunday: 'Ninguém me avisou...' },
    lines: {
      1: D(['Bom dia, colaboradora!', 'Lembre: o planeta não gira sozinho.', 'Uma volta por dia. Seis dias por semana. Simples.']),
      2: D(['Ontem você parou três vezes. Eu contei.', 'Parar é roubar tempo do planeta.']),
      3: D(['Aqui na GIRA somos uma família.', 'E família não pede folga.']),
      4: D(['Eu também ando muito, viu?', 'Do escritório até o carro. Todo santo dia.']),
      5: D(['Sextou! Pra mim, no caso.', 'Vocês ainda têm o sábado inteirinho pra girar.']),
      6: D(['Amanhã é domingo, né?', 'Hmm. Vamos ver como fica a demanda.']),
      7: D(['Demanda alta, família. Vocês entendem.', 'Folga é um estado de espírito.']),
      sunday: D(['...', 'Ninguém me avisou que ele girava sozinho.', 'Quer dizer... eu sabia. Mas ninguém precisava saber.'])
    } },
  { id: 'nara', name: 'NARA', tag: '#de794e', voice: 230, cast: 'nara', at: { spot: 'nara', x: 1.7, z: 3.05 },
    bubble: { 1: 'Psst.', 2: 'Quem precisa de quem?', 3: 'Seis pessoas. Um planeta.', 4: 'Leva um pão.', 5: 'Fica de olho no domingo.', 6: 'Você vem comigo?', 7: 'Cancelaram. Como eu disse.', strike: 'Respira.', sunday: 'Viu? Não caiu nada.' },
    lines: {
      1: D(['Psst.', 'Já reparou que, se todo mundo parar, ele para?', '...esquece. Falei nada.']),
      2: D(['O Valdir disse que o planeta precisa da gente.', 'Engraçado. Ele nunca diz que a gente precisa de descanso.']),
      3: D(['Contei. Somos um monte andando todo dia.', 'E um planeta só. A conta não fecha pra ele.']),
      4: D(['Fiz pão a mais. Leva um.', 'Ninguém gira de barriga vazia. Nem pra parar.']),
      5: D(['Domingo.', 'Fica de olho no domingo.']),
      6: D(['Se cancelarem a folga amanhã...', '...você vem comigo?']),
      7: D(['Cancelaram. Como eu disse.', 'Todo mundo tá no limite. A Cida, o Kauã, o Marcos na roda... até o coach chorou no caixote.', 'A gente pode só *parar*. Junto. Aqui, agora.']),
      declined: D(['Tudo bem. Ninguém para sozinho.', 'Semana que vem eu pergunto de novo.']),
      sunday: D(['Viu? Não caiu nada.', 'Ele gira sozinho. Sempre girou.', 'O que parou foi o medo.'])
    } },
  { id: 'rafa', name: 'RAFA FOCO', tag: '#f3c258', voice: 180, cast: 'rafa', at: { spot: 'academia', x: -1.3, z: 3.15, y: 0.5 },
    bubble: { 1: 'Cansada? Ótimo!', 2: 'Banho gelado e propósito!', 3: 'Mindset 7x0!', 4: 'Mesma volta, mais propósito.', 5: 'Dor é fraqueza saindo!', 6: 'Domingo é dia de planejar a segunda!', 7: 'Viu? Folga nunca existiu.', strike: '...posso sentar também?', sunday: 'Não tira foto, tá?' },
    lines: {
      1: D(['E aí, guerreira! Tô ao vivo, dá um oi!', 'Se você não está cansada, não está andando direito!', 'Dormir é pra quem já chegou lá.']),
      2: D(['Eu acordo às 4h, tomo banho gelado e ando de costas.', 'Não muda nada. Mas é sofrido. E sofrimento é crescimento.']),
      3: D(['Não existe escala 6x1.', 'Existe mindset 7x0!']),
      4: D(['Meu curso ensina a andar com mais propósito.', 'É a mesma volta. Mas com propósito. Só 12x de 97.']),
      5: D(['Cansaço é só fraqueza saindo do corpo.', 'Junto com o joelho.']),
      6: D(['Domingo? Domingo é dia de planejar a segunda!']),
      7: D(['Viu? A folga nunca existiu. Só existe o foco.', '...', 'Desculpa. Entrou um cisco. Corta a live.']),
      sunday: D(['Sentei. Desliguei a live. Ninguém viu.', '...é bom. Não conta pros meus seguidores.'])
    } },
  { id: 'lino', name: 'SEU LINO', tag: '#8cc48c', voice: 100, cast: 'lino', at: { spot: 'lino', z: 0.97 }, seat: 0.46,
    bubble: { 1: 'Ganhei um relógio.', 2: 'O domingo existia...', 3: 'É longe, quando a volta é do patrão.', 4: 'Senta um pouco.', 5: 'O sol só anda quando vocês andam.', 6: 'Aposentado é domingo sem ninguém.', 7: 'Eu devia ter parado junto.', strike: 'Finalmente.', sunday: 'Bonito, né?' },
    lines: {
      1: D(['Dei catorze mil e seiscentas voltas.', 'Me deram um relógio quando eu parei.', 'Ele não anda. Combina comigo.']),
      2: D(['Quando eu era moço, o domingo existia.', 'Ou eu sonhava muito. Não lembro mais.']),
      3: D(['Meus netos moram do outro lado do planeta.', 'É meia volta. Mas fica longe quando a volta é do patrão.']),
      4: D(['Senta um pouco aqui.', '...não pode? Tudo bem. Eu guardo o lugar.']),
      5: D(['Já reparou que o sol só anda quando vocês andam?', 'Engraçado. Antes eu achava que era o contrário.']),
      6: D(['Amanhã é domingo. Eu vou ficar aqui.', 'Aposentado é domingo todo dia. Só que sem ninguém.']),
      7: D(['Sabe do que eu mais me arrependo?', 'De nunca ter parado junto com os outros.']),
      sunday: D(['Finalmente alguém senta comigo.', 'O pôr do sol daqui é bonito, né? Nunca tinha visto com companhia.'])
    } },
  { id: 'bia', name: 'BIA', tag: '#66bde6', voice: 340, cast: 'bia', at: { spot: 'bia' },
    bubble: { 1: 'Quando é domingo?', 2: 'Ele gira sozinho!', 3: 'Quero ser astronauta.', 4: 'Desenhei minha família.', 5: 'Amanhã é sábado!', 6: 'Promete?', 7: 'Pode tirar um dia?', strike: 'Minha mãe sentou!', sunday: 'Ela riu!' },
    lines: {
      1: D(['Moça, quando é *domingo*?', 'Minha mãe disse que é "logo". Faz tempo que é logo.']),
      2: D(['Na escola aprendi que o planeta gira sozinho.', 'A professora falou baixinho, pra ninguém ouvir.']),
      3: D(['Quando eu crescer quero ser astronauta.', 'Meu pai disse que astronauta também tem que dar volta.']),
      4: D(['Desenhei minha família no mural.', 'Todo mundo de costas, andando. Ficou bem parecido.']),
      5: D(['Amanhã é sábado! Minha mãe vai dar volta e eu vou junto.', 'É o nosso passeio.']),
      6: D(['Amanhã é domingo de verdade?', 'Promete?']),
      7: D(['Minha mãe disse que hoje não tem domingo.', 'Pode isso? Tirar um dia da semana?']),
      sunday: D(['Minha mãe sentou na grama comigo!', 'Ela riu. Eu nem sabia que ela ria.'])
    } },
  { id: 'otavio', name: 'SR. OTÁVIO', tag: '#c25959', voice: 140, cast: 'otavio', at: { spot: 'otavio', z: -0.12, y: 0 }, seat: 0.3,
    bubble: { 1: 'Eu? Eu invisto.', 2: 'Formiguinhas produtivas.', 3: 'Meu avô deu uma volta.', 4: 'Não precisa agradecer.', 5: 'Vou cobrar pela sombra.', 6: 'Folga da folga.', 7: 'Domingo é o melhor dia.', strike: 'Quem vai girar meu dinheiro?', sunday: 'Pra que eu servia?' },
    lines: {
      1: D(['Eu? Eu não ando.', 'Eu invisto.']),
      2: D(['O planeta gira tão bonito daqui de cima.', 'Vocês parecem formiguinhas. Formiguinhas produtivas.']),
      3: D(['Meu avô deu uma volta, uma vez. Em 1952.', 'Desde então a família vive do esforço dele. Tem até estátua.']),
      4: D(['Sabia que cada volta de vocês valoriza o meu terreno?', 'Não precisa agradecer.']),
      5: D(['Tô pensando em cobrar pela sombra.', 'É uma sombra muito boa.']),
      6: D(['Folga? Que palavra antiga.', 'Às vezes eu tiro folga da minha folga. Cansa.']),
      7: D(['Domingo é o melhor dia pra ver vocês girando.', 'Tem menos gente reclamando. Parece.']),
      sunday: D(['Pararam todos.', 'E continua girando?', 'Então... pra que eu servia?'])
    } },
  { id: 'josue', name: 'JOSUÉ', tag: '#4b5658', voice: 110, cast: 'josue', at: { spot: 'josue', ry: Math.PI },
    bubble: { 1: 'Área restrita.', 2: 'O doutor tá descansando.', 3: 'Eu guardo o descanso dos outros.', 4: 'Doze por trinta e seis... por seis.', 5: 'Nunca vi a piscina molhada.', 6: 'Folga? Só se render.', 7: 'Ordens: ninguém sobe.', strike: 'Tô parado também.', sunday: 'Pode subir. Ele tá lá.' },
    lines: {
      1: D(['Boa tarde. Área restrita da Família Otávio.', 'Pode olhar. Olhar é de graça. Por enquanto.']),
      2: D(['Eu trabalho doze horas guardando o descanso de outra pessoa.', 'É um descanso muito bem guardado.']),
      3: D(['O doutor me deu uma folga uma vez.', 'Mas era pra eu ficar de olho na folga dele.']),
      4: D(['Minha escala é doze por trinta e seis.', '...por seis dias seguidos. Não fecha a conta, eu sei.']),
      5: D(['Dizem que a piscina lá em cima é linda.', 'Eu nunca vi. Fico aqui fora, de costas pra ela.']),
      6: D(['Amanhã? Amanhã é dia de vigiar o domingo dele.']),
      7: D(['Ordens novas: ninguém sobe, ninguém para.', 'Mas pode subir. Eu não vi nada.']),
      strike: D(['Se todo mundo parou, eu também paro.', 'Hoje o portão tá de folga.']),
      sunday: D(['Tô sentado pela primeira vez em serviço.', 'O doutor nem percebeu. Ele também não percebe quando eu tô em pé.'])
    } },
  { id: 'neide', name: 'DONA NEIDE', tag: '#5a8f73', voice: 210, cast: 'neide', at: { spot: 'neide', x: 1.75, z: 1.35 }, news: true,
    bubble: { 1: 'Olha o jornal!', 2: 'Manchete quentinha!', 3: 'Notícia boa? Tem não.', 4: 'Leva dois, paga dois.', 5: 'Extra! Extra! (mentira)', 6: 'Amanhã tem caderno de domingo!', 7: 'Caderno de domingo cancelado.', strike: 'Essa vai pra capa!', sunday: 'EDIÇÃO EXTRA!' },
    lines: {
      1: D(['Bom dia, Duda! Jornal fresquinho.', 'Eu leio tudo antes de vender. É o único jeito de ler.']),
      3: D(['Trinta anos de banca. Já vendi tudo quanto é notícia.', 'Nunca vendi uma que dissesse "hoje ninguém precisa andar".']),
      6: D(['Amanhã tem caderno de domingo!', 'Diz que vem com palavras cruzadas e um dia inteiro de folga. Se vier.']),
      sunday: D(['Olha que coisa linda: eu sentada lendo a minha própria banca.'])
    } },
  { id: 'marcos', name: 'MARCOS', tag: '#de794e', voice: 130, cast: 'marcos', at: { spot: 'wheel', y: 0.62, ry: 0 }, wheel: true,
    bubble: { 1: 'Roda nº 1, operador nº 1.', 2: 'Se eu paro, a roda para.', 3: 'A vista é sempre a mesma.', 4: 'Meu filho me desenhou de hamster.', 5: 'Hora extra é a mesma volta, mais escura.', 6: 'Amanhã? Depende da escala.', 7: 'Remanejaram, né?', strike: 'Desci da roda!', sunday: 'Ela gira sem mim!' },
    lines: {
      1: D(['Opa! Marcos, operador da Roda Nº 1.', 'Dizem que é ela que gira o planeta.', 'Eu ando aqui dentro desde 2009. Nunca saí do lugar, mas já andei muito.']),
      2: D(['O Seu Valdir disse que se eu parar, a roda para.', 'E se a roda parar, o planeta para.', 'Nunca testei. Tenho medo de descobrir que é verdade. Ou que não é.']),
      3: D(['Sabe a pior parte de andar numa roda?', 'A vista é sempre a mesma. Mas a placa diz que eu tô indo longe.']),
      4: D(['Meu filho me desenhou de hamster.', 'Ficou bem parecido. Ele até caprichou na rodinha.']),
      5: D(['Sexta tem hora extra.', 'É a mesma volta, só que mais escura.']),
      6: D(['Amanhã é domingo... se a escala deixar. A escala ainda não saiu.']),
      7: D(['Ouvi o alto-falante. Remanejada, né?', 'Se o pessoal parar, eu paro também. Já decidi. Acho.']),
      strike: D(['Desci da roda. Minhas pernas tão tremendo.', 'Não é cansaço. É novidade.']),
      sunday: D(['Olha ali. A roda tá girando sozinha.', 'Quinze anos achando que era eu.'])
    } },
  { id: 'tonho', name: 'SEU TONHO', tag: '#66bde6', voice: 105, cast: 'tonho', at: { pier: true },
    bubble: { 1: 'Peixe não morde em dia útil.', 2: 'Tô pescando um domingo.', 3: 'O mar não bate ponto.', 4: 'Giro só a carretilha.', 5: 'O mar não tem relógio.', 6: 'Amanhã o peixe vem.', 7: 'Nem domingo, nem peixe.', strike: 'Agora o peixe vem.', sunday: 'Mordeu! Mordeu!' },
    lines: {
      1: D(['Opa. Tonho, pescador. Ou quase.', 'Venho aqui todo intervalo de três minutos.', 'Em vinte anos pesquei uma bota. Era minha.']),
      2: D(['Tô tentando pescar um domingo.', 'Dizem que tinha muito por aqui antigamente. Agora só dá segunda.']),
      3: D(['O mar vai e volta o dia inteiro e ninguém chama ele de preguiçoso.', 'Pensa nisso.']),
      4: D(['Me dispensaram por "baixa rotação".', 'Agora eu giro só a carretilha. É mais honesto.']),
      5: D(['Já reparou? O mar não tem relógio de ponto.', 'Por isso ele é tão bonito.']),
      6: D(['Amanhã é domingo. Amanhã o peixe morde. Eu sinto.']),
      7: D(['Remanejaram o domingo... deve ter ido parar no fundo do mar.', 'Se eu fisgar, te aviso.']),
      strike: D(['Pararam tudo? Que silêncio.', 'Agora sim o peixe vem. Ele também tava esperando.']),
      sunday: D(['MORDEU! Olha o tamanho!', '...é uma bota. Mas é uma bota de domingo. Vale.'])
    } },
  { id: 'mingau', name: 'MINGAU', tag: '#7d8a88', voice: 420, pet: 'cat', at: { spot: 'mingau', x: 0.5, y: 0.85, ry: 1.2 },
    bubble: { 1: 'Zzz.', strike: 'Zzz.', sunday: 'Zzz.' },
    lines: { 1: D(['Zzz.', '(O Mingau nunca deu uma volta na vida e está ótimo.)']), sunday: D(['Zzz.', '(O Mingau já sabia.)']) } },
  { id: 'caramelo', name: 'CARAMELO', tag: '#d7a15a', voice: 380, pet: 'dog', at: { spot: 'loja199', x: 0, z: 3.3 }, roam: true,
    bubble: { 1: 'Au!', sunday: 'Au au!' },
    lines: { 1: D(['Au!', '(O Caramelo não bate ponto. Ele é de todo mundo e de ninguém.)']), sunday: D(['Au au!', '(Até o Caramelo acha que o domingo é melhor com todo mundo junto.)']) } },
  // ---- gente andando na avenida ----
  { id: 'cida', name: 'DONA CIDA', tag: '#8a6fa8', voice: 200, cast: 'cida', walker: { s0: 0.12, speed: 1.6, lane: -0.95 },
    bubble: { 1: 'Trinta anos de volta.', 2: 'Meu joelho estala no ritmo.', 3: 'Nunca vi o outro lado.', 4: 'Bom dia? Boa tarde?', 5: 'Sexta igual quinta.', 6: 'Amanhã durmo até 7h15!', 7: 'Remanejada...', strike: 'Ai, minhas pernas.', sunday: 'Sentar é bom.' },
    lines: {
      1: D(['Trinta anos dando volta.', 'Nem sei mais pra onde.']),
      2: D(['Meu joelho estala no ritmo do relógio de ponto.']),
      3: D(['Minha neta perguntou como é o outro lado do planeta.', 'Passo por ele todo dia e nunca vi.']),
      4: D(['Bom dia! Ou boa tarde? Aqui é sempre a mesma hora.']),
      5: D(['Sexta. Igual quinta, só que com outro nome.']),
      6: D(['Amanhã vou dormir até as sete e quinze!']),
      7: D(['Folga remanejada... é assim que chamam agora?']),
      sunday: D(['Sentar.', 'Eu tinha esquecido como é bom sentar.'])
    } },
  { id: 'kaua', name: 'KAUÃ', tag: '#c25959', voice: 170, cast: 'kaua', walker: { s0: 0.45, speed: 6.2, lane: 0.95 },
    bubble: { 1: 'Sou meu próprio chefe!', 2: 'Meu app conta minhas voltas.', 3: 'Em 40 anos compro um banco.', 4: 'Volta extra à noite.', 5: 'Gratidão!', 6: 'Hoje eu corro pra mim.', 7: 'Eu nem ia usar a folga.', strike: 'Desliguei o app.', sunday: 'Alguém perguntou se eu tô bem.' },
    lines: {
      1: D(['Sou meu próprio chefe!', '...e meu chefe é muito exigente. Entrega em sete minutos ou o app me pune.']),
      2: D(['Baixei um app que conta minhas voltas.', 'Agora eu sei exatamente o quanto estou cansado.']),
      3: D(['Se eu der 3 voltas por dia, em 40 anos compro um banco.', 'Pra sentar. Um banco de sentar.']),
      4: D(['Tô fazendo volta extra de noite. Renda extra.', 'A noite também é dia, se você não dormir.']),
      5: D(['Postei: gratidão por mais uma semana girando.', 'Três curtidas. Uma era do Seu Valdir.']),
      6: D(['Sábado é o dia que eu corro pra mim.', 'Igual aos outros. Mas pra mim.']),
      7: D(['Folga cancelada? Tranquilo. Eu nem ia usar.']),
      sunday: D(['Desliguei o app.', 'Ele perguntou se eu estava bem. Primeira vez que alguém pergunta.'])
    } },
  { id: 'beto', name: 'BETO', tag: '#de794e', voice: 150, cast: 'beto', walker: { s0: 0.27, speed: 2.6, lane: 0.95 }, bubble: WALKER_BUBBLES,
    lines: { 1: D(['Não posso parar. Se eu parar, sento. Se eu sentar, durmo.']), 3: D(['Tô na volta quatro mil e alguma coisa. Perdi a conta na três mil.']), 6: D(['Amanhã eu durmo. Se deixarem.']), 7: D(['De novo?']), sunday: D(['Que silêncio bom.']) } },
  { id: 'luana', name: 'LUANA', tag: '#de794e', voice: 260, cast: 'luana', walker: { s0: 0.6, speed: 2.9, lane: -0.95 }, bubble: WALKER_BUBBLES,
    lines: { 1: D(['Desculpa a máscara. É que eu respiro muito rápido quando ando.']), 4: D(['Eu tinha um hobby. Acho que era pintar. Ou era dormir.']), 7: D(['Eu já sabia. Mas dói igual.']), sunday: D(['Vou pintar alguma coisa. Ou dormir. Os dois!']) } },
  { id: 'daiane', name: 'DAIANE', tag: '#de794e', voice: 280, cast: 'daiane', walker: { s0: 0.75, speed: 3.3, lane: 0.95 }, bubble: WALKER_BUBBLES,
    lines: { 1: D(['Bom dia! Ou boa noite?', 'Desde que o sol só anda quando a gente anda, eu me perdi.']), 5: D(['Minha mãe me liga e eu tô sempre andando. Ela acha que eu sou atleta.']), sunday: D(['Liguei pra minha mãe sentada. Ela chorou.']) } },
  { id: 'ronaldo', name: 'RONALDO', tag: '#de794e', voice: 140, cast: 'ronaldo', walker: { s0: 0.88, speed: 2.3, lane: -0.95 }, bubble: WALKER_BUBBLES,
    lines: { 1: D(['Eu era músico. Agora eu sou ritmo: um, dois, um, dois.']), 4: D(['Compus uma música pro Seu Valdir. Chama "Mais uma volta".', 'É um acorde só. Repetido.']), sunday: D(['Tocar sentado. Que luxo.']) } },
  { id: 'tati', name: 'TATI', tag: '#de794e', voice: 250, cast: 'tati', walker: { s0: 0.36, speed: 2.0, lane: -0.95 }, bubble: WALKER_BUBBLES,
    lines: { 1: D(['Meu crachá diz "colaboradora". Meu joelho diz outra coisa.']), 3: D(['Hoje sonhei que eu parava. Acordei cansada do susto.']), sunday: D(['Sentei e o planeta não caiu. Quem diria.']) } },
];
export const INTRO_LINES = ['Acordei atrasada de novo...', 'Aqui o planeta só gira se a gente *andar*. Uma volta por dia, seis dias por semana.', 'No sétimo dia, dizem que tem *folga*. Bora.'];
export const VALDIR_SPEECH = ['Atenção, família GIRA!', 'A folga de domingo foi... *remanejada*.', 'Demanda alta. Vocês entendem. O planeta *não pode parar*!'];
export const STRIKE_LINES = ['Todo mundo parou.', 'O Seu Valdir ficou olhando pro céu, esperando o mundo acabar.', 'Mas o planeta *continuou girando*.', 'Devagar. Sozinho.', 'Como sempre girou.'];

function keyFor() { return state.sunday ? 'sunday' : state.strike ? 'strike' : state.day; }
function pickDay(obj, k) {
  if (!obj) return null;
  if (obj[k] !== undefined) return obj[k];
  if (typeof k === 'number') { for (let d = k; d >= 1; d--) if (obj[d] !== undefined) return obj[d]; }
  if (k === 'strike' && obj.sunday) return obj.sunday;
  return obj[1];
}
export function npcLines(n) {
  if (n.id === 'nara' && state.week > 1 && state.day === 1 && !state.sunday) return ['Mais uma segunda.', 'A pergunta continua de pé. A gente é que não.'];
  if (n.news) { const h = headline(); return [...(pickDay(n.lines, keyFor()) || []), 'Manchete de hoje: ' + h[0], h[1]]; }
  return pickDay(n.lines, keyFor());
}
export function npcBubble(n) { return pickDay(n.bubble, keyFor()); }
