// Helpers para rolagem de opções B3 — usa dados reais da cadeia OpLab

const CALL_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
const PUT_LETTERS = ['M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X'];
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// Extrai letra da série e semana (se semanal) do símbolo B3
// Mensal: BOVAJ17 -> { letter: 'J', week: '' }
// Semanal: BOVAJ170W4 -> { letter: 'J', week: 'W4' }
export function extractOptionInfo(symbol) {
  const m = (symbol || '').toUpperCase().match(/^([A-Z]+)([A-X])(\d+)(W\d+)?$/);
  if (!m) return { letter: '', week: '' };
  return { letter: m[2], week: m[4] || '' };
}

export function letterToMonthName(letter, tipo) {
  const l = (letter || '').toUpperCase();
  const letters = tipo === 'PUT' ? PUT_LETTERS : CALL_LETTERS;
  const idx = letters.indexOf(l);
  return idx >= 0 ? MONTH_NAMES[idx] : '';
}

// Agrupa opções por exercício, com letra e nome do mês
export function groupExercises(options, tipo) {
  const filtered = (options || []).filter((o) => o.type === tipo && o.due_date);
  const map = {};
  filtered.forEach((o) => {
    if (!map[o.due_date]) {
      const info = extractOptionInfo(o.symbol);
      map[o.due_date] = { due_date: o.due_date, letter: info.letter, week: info.week, monthName: letterToMonthName(info.letter, tipo), options: [] };
    }
    map[o.due_date].options.push(o);
  });
  return Object.values(map).sort((a, b) => a.due_date.localeCompare(b.due_date));
}

// Encontra opção na série por strike
export function findOptionInExercise(exercises, strike, type, dueDate) {
  const ex = exercises.find((e) => e.due_date === dueDate);
  if (!ex) return null;
  return ex.options.find((o) => o.type === type && Math.abs((o.strike || 0) - (strike || 0)) < 0.001);
}

// Próximo exercício após o vencimento atual
export function findNextExercise(exercises, currentVencimento) {
  if (!exercises.length) return null;
  if (!currentVencimento) return exercises[0];
  const next = exercises.find((e) => e.due_date > currentVencimento);
  return next || exercises[0];
}

export function exerciseLabel(ex) {
  if (!ex) return '—';
  const year = new Date(ex.due_date + 'T00:00:00').getFullYear();
  const prefix = ex.week ? `${ex.letter}${ex.week}` : ex.letter;
  return `${prefix} ${ex.monthName} ${year}`;
}

// Fluxo financeiro de uma rolagem (fechamento + abertura)
// closeQty = quantidade da perna atual (fixa, vem da operação ativa)
// openQty = quantidade da nova série (pode ser ajustada pelo usuário)
export function calcRollFlow(operacao, closeQty, openQty, closePrice, newPremium) {
  const cq = Number(closeQty) || 0;
  const oq = Number(openQty) || 0;
  const cp = Number(closePrice) || 0;
  const np = Number(newPremium) || 0;
  const closeFlow = operacao === 'COMPRA' ? cp * cq : -cp * cq;
  const openFlow = operacao === 'COMPRA' ? -np * oq : np * oq;
  return { closeFlow, openFlow, netFlow: closeFlow + openFlow };
}

// Fluxo de abertura para nova perna
export function calcOpenFlow(operacao, qty, premium) {
  const q = Number(qty) || 0;
  const p = Number(premium) || 0;
  return operacao === 'COMPRA' ? -p * q : p * q;
}

export function classifyRollResult(netFlow, totalQty) {
  const perUnit = totalQty > 0 ? netFlow / totalQty : 0;
  if (netFlow >= 0) return { label: 'EXCELENTE (CRÉDITO LÍQUIDO)', tone: 'good', desc: 'A rolagem gera crédito líquido consolidado no caixa, postergando o risco e remunerando o capital.' };
  if (Math.abs(perUnit) < 0.4) return { label: 'MODERADA (PEQUENO DÉBITO)', tone: 'warn', desc: 'Rolagem a pequeno débito, aceitável se o ajuste de série melhorar a posição.' };
  return { label: 'DESACONSELHADA (DÉBITO ELEVADO)', tone: 'bad', desc: 'Pagar débito líquido expressivo consome capital sem garantia estatística.' };
}