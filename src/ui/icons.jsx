// ícones desenhados à mão, na cor da tinta do jogo
const C = '#4e6470';
const NOTE = 'M12 6l14-3v18.5a4.5 4 0 1 1-3-3.8V8.3l-8 1.7v14.5a4.5 4 0 1 1-3-3.8z';

export const IconMenu = () => (
  <svg viewBox="0 0 32 32" fill="none" stroke={C} strokeWidth="3.2" strokeLinecap="round">
    <circle cx="6" cy="8" r="1.6" fill={C} /><circle cx="6" cy="16" r="1.6" fill={C} /><circle cx="6" cy="24" r="1.6" fill={C} />
    <path d="M12 8h15M12 16h15M12 24h15" />
  </svg>
);

export const IconSound = ({ on }) => (
  <svg id="ico-sound" viewBox="0 0 32 32" fill={C}>
    {on ? <path d={NOTE} /> : (
      <>
        <path d={NOTE} opacity=".35" />
        <path d="M4 4l24 24" stroke="#c25959" strokeWidth="3.5" strokeLinecap="round" />
      </>
    )}
  </svg>
);

export const IconOutfit = () => (
  <svg viewBox="0 0 32 32" fill={C}>
    <path d="M11 4l-8 4 3 7 3-1.4V28h14V13.6l3 1.4 3-7-8-4c-.6 2.4-2.6 4-5 4s-4.4-1.6-5-4z" />
  </svg>
);

export const IconEmote = () => (
  <svg viewBox="0 0 32 32" fill={C}>
    <path d="M7 4.5h18a4 4 0 0 1 4 4v11a4 4 0 0 1-4 4H15.5l-6.5 5.2v-5.2H7a4 4 0 0 1-4-4v-11a4 4 0 0 1 4-4z" />
    <rect x="14.4" y="8" width="3.2" height="8.6" rx="1.4" fill="#f4f4ef" />
    <circle cx="16" cy="19.6" r="1.8" fill="#f4f4ef" />
  </svg>
);

export const IconNext = () => (
  <svg viewBox="0 0 26 26">
    <path d="M7 3l14 10L7 23z" fill="#66bde6" stroke="#373f42" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);
