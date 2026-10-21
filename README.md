# GIRA

**É um planeta pequeno, mas alguém tem que fazer ele girar.**

GIRA é um joguinho de navegador sobre um planeta minúsculo que só gira quando você anda. Cada volta completa é um dia de trabalho, o chefe sempre quer mais uma volta, e a semana tem seis dias de expediente para um domingo que nunca chega. É uma crítica bem-humorada à escala 6x1, à rotina que anda em círculos e ao cansaço de quem mantém tudo funcionando.

▶ **Jogar agora:** https://miguelrsant.github.io/gira/

![Tela inicial do GIRA: o planeta com as letras GI RA e o botão Começar](docs/titulo.jpg)

## O jogo

- **O mundo só se move se você se mover.** Andando, o planeta gira, o relógio corre e a barra do dia enche. Parou, o sol para também.
- **14 bairros para explorar**, espalhados pelo planeta inteiro: Praça do Relógio, a sede da GIRA S.A., Rua do Comércio, Campinho, Vila do Sossego, Escola Galileu, o Morro dos Ricos com a mansão do Sr. Otávio, a Fábrica de Voltas e sua roda de hamster, o Conjunto Esteira Feliz, a Praia do Intervalo, a Ilha do Sinal Fraco, o Parque Domingueiro, a Horta e o Mirante.
- **Vizinhos com história**, com falas que mudam a cada dia: Seu Valdir, o chefe do alto-falante; Nara, da padaria; Rafa Foco; Seu Lino; Bia; Sr. Otávio; Josué, o segurança; Dona Neide, da banca; Marcos, da roda; Seu Tonho, o pescador; o gato Mingau e o cachorro Caramelo, que segue você por aí.
- **Muita coisa escondida:** placas, vitrines, cartazes e objetos para ler, 7 folhas de domingo perdidas pelo mundo, um guarda-roupa e emoções para a Lia, a sua personagem.
- **Uma semana, uma escolha.** O que acontece no sétimo dia depende de você.

![Lia conversando com Seu Lino, sentado num banco da praça](docs/conversa.jpg)

## Controles

| Ação | Teclado e mouse | Celular |
| --- | --- | --- |
| Andar | WASD ou setas | arraste no lado esquerdo da tela |
| Correr | Shift | puxe o joystick até passar da borda |
| Pular | Espaço | botão PULAR |
| Girar a câmera | arraste com o mouse | arraste no lado direito da tela |
| Zoom | roda do mouse | pinça com dois dedos |
| Conversar ou ler | E ou Enter | toque no aviso, ou um toque rápido na tela |
| Passar a fala | Espaço, E, Enter ou clique | toque no cartão |
| Escolher resposta | setas, ou 1 e 2 | toque na resposta |
| Emoções | 1 a 6 | botão de emoções |
| Som | M | botão de som |

O menu (☰) mostra as tarefas do dia e tem um atalho para pular o dia.

## Rodar no seu computador

O jogo inteiro é um único arquivo, `index.html`. Dá para abrir direto no navegador ou servir a pasta:

```sh
python3 -m http.server 8000
# e abra http://localhost:8000
```

É preciso internet para carregar o three.js (pelo jsDelivr) e as fontes (Google Fonts), e um navegador com WebGL 2.

## Mexer no código

O código fica em `src/`, dividido em arquivos numerados. O `build.py` junta todos, em ordem, num único `<script type="module">` dentro do `index.html`:

```sh
python3 src/build.py   # gera ./index.html
```

| Arquivo | O que tem |
| --- | --- |
| `src/head.html` | CSS e HTML da interface: HUD, cartões de fala, menus, tela inicial |
| `src/js/00_core.js` | renderizador, materiais toon e o passe de contorno de tinta |
| `src/js/10_noise.js` | ruído e esfera geodésica |
| `src/js/20_batch.js` | atlas de texturas e junção das malhas em pedaços do planeta |
| `src/js/30_terrain.js` | relevo, terreno, mar e lago |
| `src/js/35_roads.js` | ruas, calçadas, deques e trilhas |
| `src/js/40_kit.js` | peças de construção: fachadas, casas, lojas, mobiliário urbano, vegetação |
| `src/js/45_tex.js` | letreiros, janelas e cartazes desenhados em canvas |
| `src/js/50_world.js` | os bairros, os marcos e os objetos que dá para ler |
| `src/js/60_chars.js` | personagens com esqueleto, rostos, cabelos, bichos e pombos |
| `src/js/70_story.js` | elenco, falas de cada dia e manchetes do jornal |
| `src/js/80_game.js` | estado do jogo, a Lia, colisões, NPCs e folhas de domingo |
| `src/js/82_audio.js` | trilha e efeitos sintetizados com Web Audio |
| `src/js/84_ui.js` | cartões de fala, HUD, painéis, balões e controles |
| `src/js/86_dyn.js` | o que se mexe: relógio da praça, roda de hamster, barquinho, pipa, pombos |
| `src/js/88_title.js` | tela inicial e animação de entrada |
| `src/js/90_main.js` | câmera, céu e hora do dia, roteiro, retrato de quem fala e o laço principal |

Todos os arquivos dividem o mesmo escopo: não repita nomes no nível de cima, e o código que roda ao carregar só pode usar nomes de arquivos anteriores.

Não há imagens nem áudios externos: casas, rostos, letreiros e música são gerados por código.

### Atalhos de teste

- `?skip` pula a tela inicial.
- `?skip&day=7` começa no sétimo dia.
- `?skip&at=lat,lon,rumo` começa num ponto do planeta (em graus).
- `&dist=` e `&pitch=` ajustam a distância e a inclinação da câmera.
- No console, `window.__gira` tem `go(lat, lon, rumo)`, `near(id)`, `talk(id)`, `day(n)`, `walk(x)` e `strike()`.

## Créditos

- Estilo visual inspirado em [Messenger](https://messenger.abeto.co/), do estúdio Abeto. GIRA é um projeto independente, sem ligação com a Abeto.
- [three.js](https://threejs.org/), licença MIT.
- Fontes [Bungee](https://fonts.google.com/specimen/Bungee), [Patrick Hand SC](https://fonts.google.com/specimen/Patrick+Hand+SC) e [Silkscreen](https://fonts.google.com/specimen/Silkscreen), pelo Google Fonts, licença SIL Open Font License.

## Licença

[MIT](LICENSE) © 2026 Miguel Angelo
