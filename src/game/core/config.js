// ================= configuração =================
export const IS_TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
export const LOW = IS_TOUCH || (navigator.hardwareConcurrency || 8) <= 4;
export const R = 26;                 // raio do planeta
export const SEA = -0.42;            // nível da água, relativo a R
export const LAP = 150;              // distância andada que vale "um dia"
// andar com passo de gente (uns 2,6 passos por segundo) e correr num trote leve
export const WALK = 2.0, RUN = 4.2;
export const DAYS = ['SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO', 'DOMINGO'];
// atalhos de teste na URL: ?skip, &at=lat,lon,rumo, &day=n, &dist, &pitch
export const QS = new URLSearchParams(location.search);
