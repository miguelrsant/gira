// painéis que abrem pelos botões da lateral: expediente (tarefas, mapa, folhas), guarda-roupa, emoções e modo postal
import { useEffect, useState } from 'react';
import { useUI } from '../store.js';
import { IS_TOUCH } from '../game/core/config.js';
import { projectPlanetRadar } from '../game/rules.js';
import { DISTRICTS } from '../game/world/places.js';
import { OUTFIT_OPTS } from '../game/story/outfit.js';
import { changeOutfit, player } from '../game/play/player.js';
import { ACTORS, EMOTES, playerEmote } from '../game/play/actors.js';
import { goals, questOf } from '../game/play/missions.js';
import { refreshTasks, skipDay, togglePanel, togglePhotoMode } from '../game/play/hud.js';
import { render } from '../game/play/render.js';
import { sfx } from '../game/play/audio.js';
import { state } from '../game/play/state.js';
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
    return 'Arraste do lado esquerdo para andar (mais longe = correr). Arraste à direita para olhar em volta e use dois dedos para aproximar. Toque no balão ou nos bancos para interagir.';
  }
  return (
    <>
      <kbd>WASD</kbd>/setas: andar · <kbd>SHIFT</kbd>: correr · <kbd>ESPAÇO</kbd>: pular · <kbd>E</kbd>: conversar/sentar · <kbd>P</kbd>: postal · <kbd>1</kbd>–<kbd>6</kbd>: emoções · <kbd>M</kbd>: som
    </>
  );
}

const SHORT_NAMES = {
  'PRAÇA DO RELÓGIO': 'Relógio',
  'GIRA S.A.': 'GIRA S.A.',
  'PADARIA PÃO DE CADA DIA': 'Padaria',
  'VILA DO SOSSEGO': 'Vila',
  'CAMPINHO': 'Campinho',
  'PARQUE DOMINGUEIRO': 'Parque',
  'ESCOLA': 'Escola',
  'HORTA COMUNITÁRIA': 'Horta',
  'MORRO DOS RICOS': 'Morro',
  'FÁBRICA DE VOLTAS': 'Fábrica',
  'PRAIA DO INTERVALO': 'Praia',
  'ILHA DO SINAL FRACO': 'Ilha',
  'MIRANTE': 'Mirante',
  'ACADEMIA FOCO TOTAL': 'Academia',
};

function shortName(name) {
  return SHORT_NAMES[name] || name.split(' ')[0];
}

function computeRadarSnapshot() {
  const pDir = player?.d || { x: 0, y: 0, z: 1 };
  let fx = player?.fwd?.x ?? 0, fy = player?.fwd?.y ?? 1, fz = player?.fwd?.z ?? 0;
  const dot = fx * pDir.x + fy * pDir.y + fz * pDir.z;
  fx -= pDir.x * dot; fy -= pDir.y * dot; fz -= pDir.z * dot;
  const fl = Math.hypot(fx, fy, fz) || 1;
  const pFwd = { x: fx / fl, y: fy / fl, z: fz / fl };

  const districts = DISTRICTS.map((z) => {
    const pt = projectPlanetRadar(pDir, pFwd, z.d);
    const visited = state.visited.has(z.name);
    return {
      name: z.name,
      label: visited ? shortName(z.name) : '?',
      visited,
      x: pt.u * 88,
      y: pt.v * 88,
      antipodal: pt.antipodal,
    };
  });

  const pins = [];
  for (const g of goals()) {
    const len = Math.hypot(g.pos.x, g.pos.y, g.pos.z) || 1;
    const pt = projectPlanetRadar(pDir, pFwd, { x: g.pos.x / len, y: g.pos.y / len, z: g.pos.z / len });
    pins.push({ key: 'g' + pins.length, x: pt.u * 88, y: pt.v * 88, main: !!g.main });
  }
  for (const a of ACTORS) {
    const q = questOf(a.id);
    if (q !== 'main' && q !== 'side') continue;
    const pt = projectPlanetRadar(pDir, pFwd, a.d);
    pins.push({ key: a.id, x: pt.u * 88, y: pt.v * 88, main: q === 'main' });
  }
  return { districts, pins, here: state.district?.name || 'AVENIDA DA ESTEIRA' };
}

function PlanetRadar({ active }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => setTick((n) => n + 1), 160);
    return () => clearInterval(id);
  }, [active]);

  if (!active) return null;
  const snap = computeRadarSnapshot();

  return (
    <div className="radar-wrap">
      <div className="radar-here">{snap.here}</div>
      <svg className="radar-svg" viewBox="-112 -112 224 224" role="img" aria-label="Mapa esférico do planeta">
        <circle cx="0" cy="0" r="98" fill="#e9f2ee" stroke="#373f42" strokeWidth="2.4" />
        <circle cx="0" cy="0" r="66" fill="none" stroke="#9bb0ac" strokeWidth="1.2" strokeDasharray="4 4" />
        <circle cx="0" cy="0" r="34" fill="none" stroke="#9bb0ac" strokeWidth="1.2" strokeDasharray="3 4" />
        <line x1="-98" y1="0" x2="98" y2="0" stroke="#c3d2ce" strokeWidth="1" />
        <line x1="0" y1="-98" x2="0" y2="98" stroke="#c3d2ce" strokeWidth="1" />
        <text x="0" y="-102" textAnchor="middle" className="radar-north">FRENTE ▲</text>

        {snap.districts.map((d) => (
          <g key={d.name} transform={`translate(${d.x.toFixed(1)}, ${d.y.toFixed(1)})`} opacity={d.antipodal ? 0.58 : 1}>
            <circle r={d.visited ? 4.3 : 3.2} fill={d.visited ? '#8cc48c' : '#d5ddd9'} stroke="#373f42" strokeWidth="1.5" />
            {d.visited && (
              <text y={d.y > 4 ? 12 : -7} textAnchor="middle" className="radar-lbl">{d.label}</text>
            )}
          </g>
        ))}

        {snap.pins.map((p) => (
          <g key={p.key} transform={`translate(${p.x.toFixed(1)}, ${p.y.toFixed(1)}) rotate(45)`}>
            <rect x="-5" y="-5" width="10" height="10" fill={p.main ? '#f3c258' : '#66bde6'} stroke="#373f42" strokeWidth="1.8" />
          </g>
        ))}

        <path d="M0 -8 L6 6 L0 3 L-6 6 Z" fill="#de794e" stroke="#373f42" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
      <div className="radar-legend">
        <span><i className="dot vis" /> visitado</span>
        <span><i className="dot unk" /> oculto</span>
        <span><i className="dot qmain" /> missão</span>
        <span><i className="dot qside" /> pedido</span>
      </div>
    </div>
  );
}

function FolhasReader({ pages }) {
  const gotCount = pages.filter((p) => p.got).length;
  return (
    <div id="folhas-list">
      <div className="pstats"><span>DOMINGOS GUARDADOS</span><b>{gotCount}/7</b></div>
      {pages.map((p) => (
        <div key={p.idx} className={cx('folha-card', !p.got && 'missing')}>
          <div className="folha-head">DOMINGO #{p.idx}</div>
          <div className="folha-body">
            {p.got ? p.note : 'Folha arrancada — escondida em algum canto calmo do planeta.'}
          </div>
        </div>
      ))}
    </div>
  );
}

function Menu({ open }) {
  const [tab, setTab] = useState('tarefas');
  const tasks = useUI((s) => s.tasks);
  const explore = useUI((s) => s.explore);
  const supportCount = useUI((s) => s.supportCount);
  const visitedCount = useUI((s) => s.visitedCount);
  const totalDistricts = useUI((s) => s.totalDistricts);
  const pagesList = useUI((s) => s.pagesList);

  useEffect(() => {
    if (open) refreshTasks();
  }, [open]);

  const switchTab = (id) => { sfx.click(); setTab(id); };

  return (
    <div id="menu" className={cx('panel paper', open && 'on')} role="dialog" aria-label="Expediente">
      <h2>EXPEDIENTE</h2>
      <div className="ptabs" role="tablist" aria-label="Seções do expediente">
        <button type="button" role="tab" aria-selected={tab === 'tarefas'} className={cx('ptab', tab === 'tarefas' && 'on')} onClick={() => switchTab('tarefas')}>TAREFAS</button>
        <button type="button" role="tab" aria-selected={tab === 'mapa'} className={cx('ptab', tab === 'mapa' && 'on')} onClick={() => switchTab('mapa')}>MAPA</button>
        <button type="button" role="tab" aria-selected={tab === 'folhas'} className={cx('ptab', tab === 'folhas' && 'on')} onClick={() => switchTab('folhas')}>FOLHAS</button>
      </div>

      {tab === 'tarefas' && (
        <>
          <div className="pstats">
            <span>APOIADORES: <b>{supportCount}</b></span>
            <span>BAIRROS: <b>{visitedCount}/{totalDistricts}</b></span>
          </div>
          <div id="tasks">{tasks.map((t, i) => <Task key={i} {...t} />)}</div>
          <h3>BAIRROS DESCOBERTOS</h3>
          <div id="explore">{explore.map((t, i) => <Task key={i} {...t} />)}</div>
          <div className="keys" id="keys"><KeysHelp /></div>
          <button type="button" className="small" id="skipday" onClick={skipDay}>ATALHO DE TESTE: PULAR O DIA</button>
        </>
      )}

      {tab === 'mapa' && <PlanetRadar active={open && tab === 'mapa'} />}

      {tab === 'folhas' && <FolhasReader pages={pagesList} />}
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
              <button type="button" aria-label={'anterior ' + label.toLowerCase()} onClick={() => changeOutfit(k, -1)}>‹</button>
              <div className="lbl"><small>{label}</small>{o[o.length - 1]}</div>
              <button type="button" aria-label={'próximo ' + label.toLowerCase()} onClick={() => changeOutfit(k, 1)}>›</button>
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
          <button type="button" key={e} aria-label={'emoção ' + (i + 1)} onClick={() => { playerEmote(e); togglePanel(null); }}>{e}</button>
        ))}
      </div>
    </div>
  );
}

export function PhotoFrame() {
  const on = useUI((s) => s.photoMode);
  const day = useUI((s) => s.day);
  const [flash, setFlash] = useState(false);

  if (!on) return null;

  const savePostcard = () => {
    const src = document.getElementById('game');
    if (!src) return;
    render();
    sfx.shutter();
    setFlash(true);
    setTimeout(() => setFlash(false), 220);

    const pad = Math.round(Math.max(20, src.width * 0.024));
    const foot = Math.round(Math.max(62, src.height * 0.085));
    const cv = document.createElement('canvas');
    cv.width = src.width + pad * 2;
    cv.height = src.height + pad + foot;
    const c = cv.getContext('2d');
    c.fillStyle = '#f4f4ef';
    c.fillRect(0, 0, cv.width, cv.height);
    c.strokeStyle = '#373f42';
    c.lineWidth = Math.max(3, Math.round(pad * 0.14));
    c.strokeRect(c.lineWidth, c.lineWidth, cv.width - c.lineWidth * 2, cv.height - c.lineWidth * 2);

    c.drawImage(src, pad, pad, src.width, src.height);
    c.strokeRect(pad, pad, src.width, src.height);

    const ty = pad + src.height + Math.round(foot * 0.62);
    c.fillStyle = '#373f42';
    c.font = `700 ${Math.max(16, Math.round(foot * 0.32))}px "Bungee", sans-serif`;
    c.fillText('LEMBRANÇA DE GIRA', pad, ty);

    c.fillStyle = '#56625f';
    c.font = `700 ${Math.max(12, Math.round(foot * 0.2))}px "Silkscreen", monospace`;
    const meta = `${day.districtName} · ${day.name} ${day.clock}`;
    const mw = c.measureText(meta).width;
    c.fillText(meta, Math.max(pad, cv.width - pad - mw), ty);

    const a = document.createElement('a');
    a.download = `lembranca-gira-${day.name.toLowerCase()}.png`;
    a.href = cv.toDataURL('image/png');
    a.click();
  };

  return (
    <div id="photoframe" className="layer" role="region" aria-label="Modo Postal">
      <div className={cx('photo-flash', flash && 'on')} />
      <div className="photo-border" />
      <div className="photo-stamp paper">
        <span>CORREIO DE GIRA</span>
        <b>1 DOMINGO</b>
      </div>
      <div className="photo-caption paper">
        <div className="pc-title">LEMBRANÇA DE {day.districtName}</div>
        <div className="pc-sub">{day.name} · {day.clock} · ARRASTE PARA ENQUADRAR</div>
      </div>
      <div className="photo-actions">
        <button type="button" id="btn-save-photo" className="pbtn main paper" onClick={savePostcard}>SALVAR POSTAL</button>
        <button type="button" id="btn-exit-photo" className="pbtn paper" onClick={() => togglePhotoMode(false)}>VOLTAR [P]</button>
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
