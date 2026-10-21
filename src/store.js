// ponte entre o jogo (src/game) e a interface React (src/ui)
// o jogo escreve com setUI({ ... }) e lê com getUI(); os componentes leem com o hook useUI(seletor)
import { create } from 'zustand';

export const useUI = create(() => ({
  // classes do <body> (o CSS usa para esconder e mostrar coisas)
  touch: false,       // celular / tela de toque
  playing: false,     // passou da abertura
  talking: false,     // há uma conversa aberta
  portrait: false,    // a conversa tem retrato de quem fala

  // tela inicial: btn = '' | 'in' | 'press' | 'out'
  title: { visible: true, btn: '', tagline: false },

  // HUD
  hudOn: false,
  day: { name: 'SEGUNDA', clock: '07:00', week: 'DIA 1 DE 7 · SEMANA 1', fill: '0%', pct: '0%', animo: '60%', mood: '', low: false },
  stopped: false,
  stoppedText: 'VOCÊ PAROU. O DIA PAROU.',
  toast: { on: false, t: '', s: '' },
  hint: { on: false, text: '' },
  respiro: null,      // respiro onde a Duda está: { text, how, k } ou null
  quests: [],         // cartão de objetivo: [{ kind, title, text, timer, low, main }]
  prompt: null,       // texto do aviso de interação ("CONVERSAR COM NARA") ou null
  musicOn: true,

  // painéis: null | 'menu' | 'wardrobe' | 'emotes'
  panel: null,
  tasks: [],          // [{ text, done }]
  explore: [],        // [{ text, done }] um por bairro
  outfit: { hair: 0, top: 0, bottom: 0, shoes: 0, skin: 0 },

  // cartão de fala: { id, name, color, tagd, port, line, toks: [{ ch, em, k }], shown, full, choices, sel } ou null
  dialog: null,

  // cartão de tela cheia (fim do dia): buttons = [{ label, alt, fn }] ou null
  card: { on: false, see: false, k: '', t: '', s: '', buttons: null },

  // joystick de toque: { x, y, kx, ky } (centro e deslocamento da bolinha) ou null
  joy: null,
}));

export const setUI = useUI.setState;
export const getUI = useUI.getState;
