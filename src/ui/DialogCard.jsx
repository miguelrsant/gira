// cartão de fala: nome na etiqueta, letras entrando uma a uma, respostas e o retrato de quem fala
// (o rosto é desenhado no canvas do jogo, atrás da janela #dport; ver game/play/render.js)
import { memo, useMemo } from 'react';
import { useUI } from '../store.js';
import { advanceDialog, pickChoice, selChoice } from '../game/play/dialog.js';
import { IconNext } from './icons.jsx';
import { cx } from './cx.js';

// uma palavra nunca quebra no meio; cada letra pula para dentro quando chega a vez dela
const Word = memo(function Word({ chars, vis }) {
  return (
    <span className="w">
      {chars.map((c, j) => (
        <span key={j} className={cx('c', j < vis ? 'in' : 'h', c.em && 'em')}>
          {c.em ? <i style={{ '--k': c.k }}>{c.ch}</i> : c.ch}
        </span>
      ))}
    </span>
  );
});

function DialogText({ toks, shown }) {
  const words = useMemo(() => {
    const out = [];
    let w = null;
    toks.forEach((t, i) => {
      if (t.ch === ' ') { out.push(' '); w = null; return; }
      if (!w) { w = { start: i, chars: [] }; out.push(w); }
      w.chars.push(t);
    });
    return out;
  }, [toks]);
  return (
    <span id="dtext">
      {words.map((w, i) => (typeof w === 'string' ? w : <Word key={i} chars={w.chars} vis={Math.max(0, Math.min(w.chars.length, shown - w.start))} />))}
    </span>
  );
}

export function DialogCard() {
  const d = useUI((s) => s.dialog);
  if (!d) return null;
  const choosing = !!d.choices;
  return (
    <div id="dialog" key={d.id} className={cx('on', d.port && 'port', choosing && 'choosing')} style={{ '--tag': d.color, '--tagd': d.tagd }}>
      <div id="dport" aria-hidden="true" />
      <div id="dname">{d.name}</div>
      <div id="dbox" onClick={() => advanceDialog(false)}>
        <DialogText key={d.line} toks={d.toks} shown={d.shown} />
        <div id="choices" className={cx(choosing && 'on')}>
          {choosing && d.choices.map((c, k) => (
            <button key={k} className={cx(k === 0 && 'main', k === d.sel && 'sel')}
              onClick={(e) => { e.stopPropagation(); pickChoice(k); }} onPointerEnter={() => selChoice(k)}>{c}</button>
          ))}
        </div>
        <button id="dnext" className={cx((!d.full || choosing) && 'wait')} aria-label="Avançar"><IconNext /></button>
      </div>
    </div>
  );
}
