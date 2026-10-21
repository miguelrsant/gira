// ---------------- manchetes do jornal da Neide ----------------
import { state } from '../play/state.js';

const HEADLINES = {
  1: ['PLANETA BATE RECORDE DE VOLTAS.', 'Trabalhadores batem recorde de sono em pé.'],
  2: ['ESPECIALISTA GARANTE: "DESCANSO DÁ PREGUIÇA".', 'O especialista falou deitado, de casa.'],
  3: ['GIRA S.A. LUCRA 300%.', 'Café da copa é cortado por "contenção de despesas".'],
  4: ['COACH ENSINA A DORMIR ANDANDO.', 'Vagas esgotadas. Alunos não lembram de ter se inscrito.'],
  5: ['HERDEIRO DOA UMA HORA DE SOMBRA.', 'É aplaudido de pé. Quem estava sentado era ele.'],
  6: ['FONTE DA GERÊNCIA: DOMINGO PODE SER "REMANEJADO".', 'Remanejado para onde, a fonte não soube dizer.'],
  7: ['DOMINGO SUSPENSO POR DEMANDA ALTA.', '"O planeta não pode parar", diz a gerência, sentada.'],
  sunday: ['EDIÇÃO EXTRA: PLANETA GIRA SOZINHO.', 'Cientistas confirmam: "Sempre girou. A gente só não podia falar."'],
};
export function headline() {
  if (state.sunday) return HEADLINES.sunday;
  if (state.week > 1 && state.day === 1) return ['SEMANA NOVA, MESMA VOLTA.', 'Leitores relatam forte sensação de já ter lido esta edição.'];
  return HEADLINES[state.day] || HEADLINES[1];
}
