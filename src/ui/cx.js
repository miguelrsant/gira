// junta classes, pulando as vazias: cx('panel', aberto && 'on')
export const cx = (...names) => names.filter(Boolean).join(' ') || undefined;
