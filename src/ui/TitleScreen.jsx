// tela inicial: o planeta e as letras são 3D (game/play/title.js); aqui ficam o botão e a frase
import { useUI } from '../store.js';
import { startGame } from '../game/play/title.js';
import { cx } from './cx.js';

export function TitleScreen() {
  const { visible, btn, tagline } = useUI((s) => s.title);
  return (
    <div id="title" className="layer" style={visible ? undefined : { display: 'none' }}>
      <button id="start" className={cx(btn)} aria-label="Começar" onClick={() => startGame()}>COMEÇAR</button>
      <div id="tagline" className={cx(tagline && 'in')}>É um planeta pequeno, mas alguém tem que fazer ele girar.</div>
    </div>
  );
}
