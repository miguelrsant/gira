// cartão de tela cheia: fim do expediente, próximo dia, fim da história
import { useUI } from '../store.js';
import { cx } from './cx.js';

export function FadeCard() {
  const c = useUI((s) => s.card);
  return (
    <div id="fade" className={cx(c.on && 'on', c.see && 'see')}>
      <div className="card paper" id="fadecard">
        <div className="k">{c.k}</div>
        <div className="t">{c.t}</div>
        <div className="s">{c.s}</div>
        {c.buttons && (
          <div className="btns">
            {c.buttons.map((b, i) => <button key={i} className={cx(b.alt && 'alt')} onClick={b.fn}>{b.label}</button>)}
          </div>
        )}
      </div>
    </div>
  );
}
