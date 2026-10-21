// painéis que abrem pelos botões da lateral: expediente, guarda-roupa e emoções
import { useUI } from '../store.js';
import { IS_TOUCH } from '../game/core/config.js';
import { OUTFIT_OPTS } from '../game/story/outfit.js';
import { changeOutfit } from '../game/play/player.js';
import { EMOTES, playerEmote } from '../game/play/actors.js';
import { skipDay, togglePanel } from '../game/play/hud.js';
import { cx } from './cx.js';

function Task({ text, done }) {
  return (
    <div className={cx('task', done && 'done')}>
      <span className="box">{done ? '✓' : ''}</span><span>{text}</span>
    </div>
  );
}

function KeysHelp() {
  if (IS_TOUCH) {
    return 'Arraste do lado esquerdo para andar (mais longe = correr). A câmera acompanha sozinha; se quiser olhar em volta, arraste do lado direito, e use dois dedos para aproximar. Toque no balão para conversar.';
  }
  return (
    <>
      <kbd>WASD</kbd> ou setas: andar · <kbd>SHIFT</kbd>: correr · <kbd>ESPAÇO</kbd>: pular · a câmera acompanha sozinha (arrastar o mouse olha em volta) · roda: zoom · <kbd>E</kbd>: conversar · <kbd>1</kbd>–<kbd>6</kbd>: emoções · <kbd>M</kbd>: som
    </>
  );
}

function Menu({ open }) {
  const tasks = useUI((s) => s.tasks), explore = useUI((s) => s.explore);
  return (
    <div id="menu" className={cx('panel paper', open && 'on')} role="dialog" aria-label="Expediente">
      <h2>EXPEDIENTE</h2>
      <div id="tasks">{tasks.map((t, i) => <Task key={i} {...t} />)}</div>
      <h3>EXPLORAR</h3>
      <div id="explore">{explore.map((t, i) => <Task key={i} {...t} />)}</div>
      <div className="keys" id="keys"><KeysHelp /></div>
      <button className="small" id="skipday" onClick={skipDay}>ATALHO DE TESTE: PULAR O DIA</button>
    </div>
  );
}

const WCATS = [['hair', 'CABELO'], ['top', 'BLUSA'], ['bottom', 'PARTE DE BAIXO'], ['shoes', 'CALÇADO'], ['skin', 'PELE']];

function Wardrobe({ open }) {
  const outfit = useUI((s) => s.outfit);
  return (
    <div id="wardrobe" className={cx('panel paper', open && 'on')} role="dialog" aria-label="Roupa">
      <h2>TROCAR DE ROUPA</h2>
      <div id="wrows">
        {WCATS.map(([k, label]) => {
          const opts = OUTFIT_OPTS[k], o = opts[outfit[k] % opts.length];
          return (
            <div className="wrow" key={k}>
              <button aria-label="anterior" onClick={() => changeOutfit(k, -1)}>‹</button>
              <div className="lbl"><small>{label}</small>{o[o.length - 1]}</div>
              <button aria-label="próximo" onClick={() => changeOutfit(k, 1)}>›</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Emotes({ open }) {
  return (
    <div id="emotes" className={cx('panel paper', open && 'on')} role="dialog" aria-label="Emoções">
      <h2>DESABAFAR</h2>
      <div className="grid" id="egrid">
        {EMOTES.map((e, i) => (
          <button key={e} aria-label={'emoção ' + (i + 1)} onClick={() => { playerEmote(e); togglePanel(null); }}>{e}</button>
        ))}
      </div>
    </div>
  );
}

export function Panels() {
  const panel = useUI((s) => s.panel);
  return (
    <>
      <Menu open={panel === 'menu'} />
      <Wardrobe open={panel === 'wardrobe'} />
      <Emotes open={panel === 'emotes'} />
    </>
  );
}
