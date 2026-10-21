// HUD: cartão do dia, avisos e os botões das laterais
import { useUI } from '../store.js';
import { IS_TOUCH } from '../game/core/config.js';
import { refreshTasks, togglePanel } from '../game/play/hud.js';
import { toggleMusic } from '../game/play/audio.js';
import { interactNow } from '../game/play/director.js';
import { IconEmote, IconMenu, IconOutfit, IconSound } from './icons.jsx';
import { cx } from './cx.js';

function DayCard() {
  const d = useUI((s) => s.day);
  return (
    <div id="daycard" className="paper">
      <div className="drow"><span className="dname" id="dname-hud">{d.name}</span><span className="clock" id="clock">{d.clock}</span></div>
      <div className="week" id="week">{d.week}</div>
      <div className="bar"><i id="barfill" style={{ width: d.fill }} /></div>
      <div className="barlabel"><span>volta do dia</span><span id="pct">{d.pct}</span></div>
      <div className={cx('bar animo', d.low && 'low')}><i style={{ width: d.animo }} /></div>
      <div className="barlabel"><span>ânimo</span><span>{d.mood}</span></div>
    </div>
  );
}

// "você parou, o dia parou"
function Stopped() {
  const on = useUI((s) => s.stopped), text = useUI((s) => s.stoppedText);
  return <div id="stopped" className={cx(on && 'on')}>{text}</div>;
}

// o que fazer agora: a história do dia, os pedidos aceitos e a meta do Valdir (com relógio)
function Quests() {
  const qs = useUI((s) => s.quests);
  return (
    <div id="quests" className={cx(qs.length && 'on')}>
      {qs.map((q, i) => (
        <div key={q.kind + q.title} className={cx('quest paper', q.main && 'main', q.low && 'low')} style={{ '--i': i }}>
          <div className="qk"><span>{q.kind}</span>{q.timer !== null && <b className="qt">{q.timer}s</b>}</div>
          <div className="qtitle">{q.title}</div>
          <div className="qtext">{q.text}</div>
        </div>
      ))}
    </div>
  );
}

// respiro: uma pausa que devolve ânimo (olhar o mar, pular amarelinha...)
function Respiro() {
  const r = useUI((s) => s.respiro);
  return (
    <div id="respiro" className={cx('paper', r && 'on')}>
      {r && <><b>RESPIRO</b> {r.text} <small>· {r.how}</small><div className="bar"><i style={{ width: (r.k * 100).toFixed(0) + '%' }} /></div></>}
    </div>
  );
}

// nome do bairro quando você chega
function Toast() {
  const { on, t, s } = useUI((st) => st.toast);
  return (
    <div id="toast" className={cx('paper', on && 'on')}>
      <div className="t" id="toast-t">{t}</div><div className="s" id="toast-s">{s}</div>
    </div>
  );
}

function SideButtons() {
  const musicOn = useUI((s) => s.musicOn);
  return (
    <>
      <div className="side top">
        <button className="sbtn paper" id="btn-menu" aria-label="Expediente" onClick={() => { refreshTasks(); togglePanel('menu'); }}><IconMenu /></button>
      </div>
      <div className="side bottom">
        <button className="sbtn paper" id="btn-music" aria-label="Som" onClick={toggleMusic}><IconSound on={musicOn} /></button>
        <button className="sbtn paper" id="btn-outfit" aria-label="Roupa" onClick={() => togglePanel('wardrobe')}><IconOutfit /></button>
        <button className="sbtn paper" id="btn-emote" aria-label="Emoções" onClick={() => togglePanel('emotes')}><IconEmote /></button>
      </div>
    </>
  );
}

// "E CONVERSAR COM NARA": aparece quando tem alguém ou alguma coisa perto
function Prompt() {
  const text = useUI((s) => s.prompt);
  return (
    <div id="prompt" className={cx('paper', text && 'on')} onClick={() => interactNow()}>
      <b>{IS_TOUCH ? 'TOQUE' : 'E'}</b>{text}
    </div>
  );
}

function Hint() {
  const { on, text } = useUI((s) => s.hint);
  return <div id="hint" className={cx('paper', on && 'on')}>{text}</div>;
}

export function Hud() {
  const on = useUI((s) => s.hudOn);
  return (
    <div id="hud" className={cx('layer', on && 'on')}>
      <DayCard />
      <Stopped />
      <Quests />
      <Respiro />
      <Toast />
      <SideButtons />
      <Prompt />
      <Hint />
    </div>
  );
}
