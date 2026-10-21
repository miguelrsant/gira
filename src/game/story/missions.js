// ================= missões: o que acontece em cada dia =================
// cada dia tem uma missão de história (main) e pedidos dos vizinhos. Uma missão é uma lista de passos:
//   talk   { who, lines, choices? }        conversar com alguém (who pode ser uma lista: fala com todos, em qualquer ordem, cada um em each[id])
//   get    { item, at: [lat, lon], hops? } achar uma coisa no mundo (hops: quantas vezes o vento leva de novo)
//   chase  { who }                         alcançar quem está fugindo (o Caramelo)
//   reach  { place, r? }                   chegar num bairro (nome) ou ao lado de alguém (id)
//   stay   { who, time }                   ficar parada perto de alguém
//   emote  { who, emote }                  mandar uma emoção perto de alguém
// todo passo tem text (o cartão de objetivo) e lines (o que se diz quando ele termina; nos talk, a conversa).
// say: quem fala as lines de um passo que não é talk (id de NPC; sem say, é o narrador).
// time num passo liga o relógio da missão; quando acaba, pula para o passo fail (e flags.failed fica true).
// choices: [{ label, lines?, set?, support? }]. support: id de quem passa a apoiar a parada.
// Qualquer campo pode ser função (f = state.flags, n = quantos apoiam).

export const ITEMS = {
  foto: { name: 'FOTO DE 1987', color: '#e9d7a0', ink: '#8a6a3a' },
  jornal: { name: 'FOLHA DE JORNAL', color: '#efeee6', ink: '#7d8a88' },
  desenho: { name: 'DESENHO DA BIA', color: '#ffffff', ink: '#66bde6' },
  escala: { name: 'ESCALA DE DOMINGO', color: '#f4f4ef', ink: '#c25959' },
};

export const MISSIONS = {
  1: [
    { id: 'foto', main: true, title: 'O domingo de 87', steps: [
      { do: 'talk', who: 'nara', text: 'Falar com a Nara na padaria Pão de Cada Dia', bubble: 'Psst! Vem cá.',
        lines: ['Psst. Duda. Chega mais.', 'Já reparou que, se todo mundo parar, ele para?', 'O Seu Lino jura que já pararam uma vez. Em 87.', 'Pergunta pra ele. Ele mora num banco da *Vila do Sossego*.'] },
      { do: 'talk', who: 'lino', text: 'Perguntar ao Seu Lino sobre o domingo de 87', bubble: 'Oitenta e sete...',
        lines: ['Oitenta e sete? Quem te contou?', 'Teve um domingo que ninguém andou. Nem um passo.', 'Eu tirei uma foto. Mas o vento levou pro *Campinho*, e eu não corro mais.', 'Se achar, mostra pra Nara. Ela vai saber o que fazer.'], support: 'lino' },
      { do: 'get', item: 'foto', at: [-12, 28], text: 'Achar a foto antiga no Campinho',
        lines: ['Uma foto velha, amarelada.', 'Um monte de gente sentada na grama, rindo. Atrás deles, o planeta girando.', 'No verso, a lápis: *"DOMINGO. TODO MUNDO."*'] },
      { do: 'talk', who: 'nara', text: 'Mostrar a foto pra Nara', bubble: 'Achou?',
        lines: ['...', 'Gente parada. E o planeta girando atrás.', 'Então é verdade. Ele gira *sozinho*.', 'Guarda essa foto. A gente vai precisar dela.'] },
    ] },
    { id: 'coracao', title: 'Um coração pra Bia', steps: [
      { do: 'talk', who: 'bia', text: 'Falar com a Bia', bubble: 'Moça! Moça!',
        lines: ['Moça, minha mãe anda triste.', 'Ela disse que coração não cabe no expediente.', 'Me mostra como faz um? Daqueles de mandar no ar.'] },
      { do: 'emote', who: 'bia', emote: '♥', text: 'Mandar um ♥ perto da Bia (botão de emoções ou tecla 3)', say: 'bia',
        lines: ['Assim! Vou mandar um pra minha mãe quando ela passar.', 'Ela passa correndo. Mas vai ver.'], support: 'bia' },
    ] },
  ],
  2: [
    { id: 'mega', main: true, title: 'O alto-falante', set: { megaGone: true },
      intro: { say: 'valdir', name: 'SEU VALDIR · ALTO-FALANTE', lines: ['Atenção, família GIRA! A meta de hoje é...', 'CARAMELO! Solta isso! Isso é patrimônio da empresa!'] },
      steps: [
        { do: 'chase', who: 'caramelo', text: 'Alcançar o Caramelo: ele fugiu com o alto-falante do Seu Valdir!', bubble: 'Au! Au!',
          lines: ['O Caramelo solta o alto-falante no chão e abana o rabo.', 'Pra ele era só brincadeira. Pra quem manda, é a voz.', 'E agora, com quem fica a voz?'],
          choices: [{ label: 'Devolver pro Seu Valdir', set: { mega: 'valdir' } }, { label: 'Guardar pra Nara', set: { mega: 'nara' } }] },
        { do: 'talk', who: (f) => (f.mega === 'nara' ? 'nara' : 'valdir'),
          text: (f) => (f.mega === 'nara' ? 'Levar o alto-falante escondido pra Nara' : 'Devolver o alto-falante pro Seu Valdir, na GIRA S.A.'),
          bubble: (f) => (f.mega === 'nara' ? 'Que é isso aí?' : 'CADÊ MEU ALTO-FALANTE?'),
          lines: (f) => (f.mega === 'nara'
            ? ['Você pegou o alto-falante do Valdir?!', '...', 'Guarda bem. Quando chegar a hora, a gente vai precisar de voz.']
            : ['Meu alto-falante! Muito bem, colaboradora.', 'Como prêmio, você ganhou... a honra de ter ajudado.', 'Agora volta a girar. Sem atraso.']),
          after: { megaGone: (f) => f.mega === 'nara' }, support: (f) => (f.mega === 'nara' ? 'nara' : null) },
      ] },
    { id: 'banco', title: 'Um minuto no banco', steps: [
      { do: 'talk', who: 'lino', text: 'Falar com o Seu Lino', bubble: 'Senta aqui um pouco.',
        lines: ['Senta um pouquinho comigo.', 'Eu sei, eu sei. Se você parar, o dia para.', 'Mas é só um pouquinho.'] },
      { do: 'stay', who: 'lino', time: 8, text: 'Ficar parada do lado do Seu Lino', say: 'lino',
        lines: ['Viu? O dia esperou.', 'Ninguém morreu. Ninguém foi demitido.', 'É assim que começa.'] },
    ] },
  ],
  3: [
    { id: 'corredor', main: true, title: 'Conversa de corredor', steps: [
      { do: 'talk', who: 'nara', text: 'Falar com a Nara', bubble: 'Tive uma ideia.',
        lines: ['Mostrei a foto pra Cida. Ela não acreditou.', 'Conversa com o pessoal: a *Dona Cida* e o *Kauã* na avenida, e o *Marcos* lá na roda da fábrica.', 'Ninguém para sozinho. Mas junto...'] },
      { do: 'talk', who: ['cida', 'kaua', 'marcos'], text: 'Conversar com a Dona Cida, o Kauã e o Marcos', bubble: 'Hm?',
        each: {
          cida: { lines: ['Trinta anos dando volta, minha filha.', 'Parar? Na minha idade? E se me mandarem embora?'],
            choices: [{ label: 'Não dá pra mandar todo mundo embora.', lines: ['...', 'É. Não tem tanta gente assim pra pôr no lugar.', 'Se a Nara parar, eu paro.'], support: 'cida' },
              { label: 'É, melhor não arriscar.', lines: ['Pois é. Melhor não.', '(Ela volta a andar. Um pouco mais devagar.)'] }] },
          kaua: { lines: ['Ô, rapidinho que o app tá contando!', 'Parar? Eu sou meu próprio chefe. Não tem de quem parar.'],
            choices: [{ label: 'Então quem te pune quando atrasa?', lines: ['...o app.', 'O app que é de alguém. Que nunca anda.', 'Tá. Se todo mundo parar, eu desligo ele. Só pra ver.'], support: 'kaua' },
              { label: 'Verdade. Foi mal.', lines: ['De boa! Fui!'] }] },
          marcos: { lines: ['A roda não para, Duda.', 'Se eu descer, quem gira o planeta?'],
            choices: [{ label: 'E se ele girar sozinho?', lines: ['...', 'Quinze anos aqui dentro. Nunca testei.', 'Se o pessoal parar, eu desço. Prometo.'], support: 'marcos' },
              { label: 'Melhor ficar aí mesmo.', lines: ['É. Melhor. Acho.'] }] },
        } },
      { do: 'talk', who: 'nara', text: 'Contar pra Nara como foi', bubble: 'E aí?',
        lines: (f, n) => [n >= 3 ? `${n} pessoas já disseram que param junto.` : n > 0 ? `${n} ${n === 1 ? 'pessoa disse' : 'pessoas disseram'} que para junto.` : 'Ninguém topou ainda, né?',
          n >= 3 ? 'Sabe o que isso quer dizer? Que não é loucura minha.' : 'Tudo bem. Medo é cansaço de outro jeito.', 'Amanhã a gente continua. Uma conversa de cada vez.'] },
    ] },
    { id: 'cochilo', title: 'O cochilo do Tonho', steps: [
      { do: 'talk', who: 'tonho', text: 'Falar com o Seu Tonho', bubble: 'Psiu. Peixe dormindo.',
        lines: ['Psiu. Fala baixo que o peixe tá dormindo.', 'Aqui no píer eu tiro um cochilo de três minutos.', 'Quer tentar? Faz cara de sono.'] },
      { do: 'emote', who: 'tonho', emote: 'zz', text: 'Fazer um zz perto do Seu Tonho (botão de emoções ou tecla 5)', say: 'tonho',
        lines: ['Isso. Três minutos de mar.', 'O mar vai e volta o dia inteiro e ninguém chama ele de preguiçoso.'], support: 'tonho' },
    ] },
  ],
  4: [
    { id: 'live', main: true, title: 'A live do Rafa', steps: [
      { do: 'talk', who: 'rafa', text: 'Falar com o Rafa Foco, na academia', bubble: 'Ei! Quer aparecer na live?',
        lines: ['E aí, guerreira! Tô AO VIVO!', 'Desafio do foco: vai até o *Mirante* e volta aqui antes do tempo acabar.', 'Sem parar! Parar é pra quem desistiu!'] },
      { do: 'reach', place: 'MIRANTE', time: 'auto', fail: 3, text: 'Desafio do foco: chegar no Mirante', lines: [] },
      { do: 'reach', place: 'rafa', r: 2.4, text: 'Desafio do foco: voltar até o Rafa', stopTimer: true, lines: [] },
      { do: 'talk', who: 'rafa', text: 'Falar com o Rafa', bubble: (f) => (f.failed ? 'Acabou o tempo!' : 'CONSEGUIU!'),
        lines: (f) => (f.failed
          ? ['Acabou o tempo! Chat, ela desistiu!', '...', 'Mentira. Quem desistiu fui eu. De descansar. Faz tempo.', 'Desliga a câmera um pouco, vai.']
          : ['CONSEGUIU! Chat, olha isso!', '...', 'O chat tá perguntando por que eu tô chorando.', 'Sabe o que eu queria de verdade? Sentar. Desliga a câmera, por favor.']), support: 'rafa' },
    ] },
    { id: 'jornal', title: 'Ventania na banca', steps: [
      { do: 'talk', who: 'neide', text: 'Falar com a Dona Neide', bubble: 'Ventania!',
        lines: ['Ventania, Duda! Minhas folhas voaram tudo.', 'Uma foi parar lá na *Praça do Relógio*. Me traz?'] },
      { do: 'get', item: 'jornal', at: [18, 6], hops: 1, text: 'Pegar a folha de jornal na Praça do Relógio',
        lines: ['Uma página do jornal de amanhã. Manchete: "PRODUTIVIDADE BATE RECORDE".', 'Embaixo, pequenininho: "Trabalhadores não foram ouvidos porque estavam andando."'] },
      { do: 'talk', who: 'neide', text: 'Devolver a folha pra Dona Neide', bubble: 'Achou?',
        lines: ['Obrigada, filha.', 'Trinta anos vendendo notícia. Nunca vendi uma que dissesse "hoje ninguém precisa andar".', 'Se um dia sair, eu dou de graça.'], support: 'neide' },
    ] },
  ],
  5: [
    { id: 'desenho', main: true, title: 'O desenho da Bia', steps: [
      { do: 'talk', who: 'bia', text: 'Falar com a Bia, na escola', bubble: 'Meu desenho voou!',
        lines: ['Moça! Meu desenho voou!', 'Era pra minha mãe. O vento levou pro lado da *Praia do Intervalo*, eu vi!'] },
      { do: 'get', item: 'desenho', at: [-24, 228], hops: 2, text: 'Pegar o desenho da Bia (o vento não ajuda)',
        lines: ['Giz de cera: um monte de gente sentada na grama. Ninguém de costas. Ninguém andando.', 'No canto, uma menina e a mãe. A mãe está rindo.'] },
      { do: 'talk', who: 'bia', text: 'Devolver o desenho pra Bia', bubble: 'Achou?',
        lines: ['Achou! Viu como ficou?', 'A professora disse que é "fantasia".', 'Eu disse que é *domingo*.'] },
    ] },
    { id: 'torcida', title: 'Força pro Marcos', steps: [
      { do: 'talk', who: 'marcos', text: 'Falar com o Marcos, na roda da fábrica', bubble: 'Hoje tá pesada...',
        lines: ['Hoje a roda tá pesada.', 'Me dá uma força daí de baixo? Um grito, sei lá.'] },
      { do: 'emote', who: 'marcos', emote: '!', r: 7, text: 'Fazer um ! pra torcer pelo Marcos (tecla 1)', say: 'marcos',
        lines: ['Ha! Ninguém nunca torceu por mim aqui dentro.', 'A roda até girou mais leve. Ou fui eu.'], support: 'marcos' },
    ] },
  ],
  6: [
    { id: 'escala', main: true, title: 'A escala de domingo', steps: [
      { do: 'talk', who: 'nara', text: 'Falar com a Nara', bubble: 'Preciso de você.',
        lines: ['Dizem que a escala de amanhã já tá pronta.', 'Fica na casa do Sr. Otávio, no *Morro dos Ricos*.', 'Fala com o Josué, no portão. Ele é dos nossos. Só não sabe ainda.'] },
      { do: 'talk', who: 'josue', text: 'Convencer o Josué a abrir o portão', bubble: 'Área restrita.',
        lines: ['Área restrita, moça. Você sabe.', 'O que você quer lá em cima?'],
        choices: [{ label: 'Ver a escala de domingo.', lines: ['...', 'O meu nome também tá nela, né?', 'Sobe. Eu não vi nada.'], support: 'josue' },
          { label: 'Conhecer a piscina.', lines: ['Eu também queria.', 'Doze anos aqui e nunca vi ela molhada. Sobe. Eu não vi nada.'], support: 'josue' }] },
      { do: 'get', item: 'escala', near: 'otavio', text: 'Achar a escala perto do Sr. Otávio',
        lines: ['ESCALA DE DOMINGO.', 'Todos os nomes. O seu também. Do lado de cada um: "REMANEJAR".', 'Grampeado atrás, um bilhete: *"Ele gira sozinho. Não espalhem."*'] },
      { do: 'talk', who: 'nara', text: 'Mostrar a escala pra Nara', bubble: 'E aí?',
        lines: (f, n) => ['Então é isso. Eles sempre souberam.', 'Amanhã vão cancelar a folga. E amanhã a gente para.', n > 0 ? `Somos eu, você e mais ${n}. Já dá pra começar.` : 'Nem que seja só eu e você.'] },
    ] },
  ],
};

// evento do Seu Valdir, uma vez por dia (segunda a sábado): "meta relâmpago" até algum bairro
export const META = {
  id: 'meta', meta: true, title: 'Meta relâmpago',
  intro: { say: 'valdir', name: (f) => (f.megaGone ? 'SEU VALDIR · GRITANDO' : 'SEU VALDIR · ALTO-FALANTE'), lines: (f, n, place) => ['ATENÇÃO! META RELÂMPAGO!', `Quem chegar no bairro *${place}* antes do tempo acabar ganha um prêmio surpresa!`] },
  steps: [
    { do: 'reach', place: '$', time: 'auto', fail: 1, stopTimer: true, end: true, text: (f, n, place) => `Meta relâmpago: chegar em ${place}`, say: 'valdir',
      lines: ['Parabéns, colaboradora! Meta batida!', 'Seu prêmio surpresa é... uma meta nova amanhã. Maior!'] },
    { do: 'none', say: 'valdir', lines: ['Meta não batida.', 'Tudo bem. Vai pro seu histórico. Pra sempre.'] },
  ],
};
