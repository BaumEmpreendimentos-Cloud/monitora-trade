// Cálculo de rolagem multi-pernas (mesmo strike, próximo exercício)
// Adaptado de APP-Opções — RollManager.tsx

const CALL_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
const PUT_LETTERS = ['M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X'];

// Retorna a letra do próximo exercício mensal B3 para o tipo (CALL/PUT)
export function getNextB3Letter(currentLetter, categoria) {
  const letters = categoria === 'PUT' ? PUT_LETTERS : CALL_LETTERS;
  const idx = letters.indexOf((currentLetter || '').toUpperCase());
  if (idx === -1) return letters[0];
  return letters[(idx + 1) % letters.length];
}

/**
 * Monta a linha de rolagem para uma opção, mantendo o mesmo strike.
 * @param op Registro de Operacao (ativo, ativo_base, categoria, operacao, quantidade, strike)
 */
export function buildRollRow(op) {
  const ativoBase = (op.ativo_base || '').toUpperCase();
  const ticker = (op.ativo || '').toUpperCase();
  const suffix = ticker.startsWith(ativoBase) ? ticker.slice(ativoBase.length) : ticker.slice(-4);
  const currentLetter = suffix.charAt(0) || (op.categoria === 'PUT' ? 'V' : 'J');
  const strikeSuffix = suffix.slice(1);
  const nextLetter = getNextB3Letter(currentLetter, op.categoria);
  const newTicker = ativoBase && strikeSuffix ? `${ativoBase}${nextLetter}${strikeSuffix}` : '';

  return {
    id: op.id,
    ticker,
    newTicker,
    categoria: op.categoria,
    operacao: op.operacao, // COMPRA | VENDA
    quantidade: op.quantidade,
    strike: op.strike,
    currentLetter,
    nextLetter,
  };
}

/**
 * Calcula o fluxo financeiro de fechamento e abertura de uma perna
 * @param row Linha de rolagem (buildRollRow)
 * @param closePrice Preço para fechar a posição atual
 * @param newPremium Prêmio da nova série
 */
export function calcRollFlow(row, closePrice, newPremium) {
  const qty = Number(row.quantidade) || 0;
  const cp = Number(closePrice) || 0;
  const np = Number(newPremium) || 0;

  // Fechamento: posição COMPRADA fecha vendendo (+); posição VENDIDA fecha recomprando (-)
  const closeFlow = row.operacao === 'COMPRA' ? cp * qty : -cp * qty;
  // Abertura na nova série mantendo o mesmo lado: COMPRA paga (-); VENDA recebe (+)
  const openFlow = row.operacao === 'COMPRA' ? -np * qty : np * qty;

  return { closeFlow, openFlow, netFlow: closeFlow + openFlow };
}

// Classifica o resultado consolidado da rolagem
export function classifyRollResult(netFlow, totalQty) {
  const perUnit = totalQty > 0 ? netFlow / totalQty : 0;
  if (netFlow >= 0) {
    return { label: 'EXCELENTE (CRÉDITO LÍQUIDO)', tone: 'good', desc: 'A rolagem gera crédito líquido consolidado no caixa, postergando o risco e remunerando o capital.' };
  }
  if (Math.abs(perUnit) < 0.4) {
    return { label: 'MODERADA (PEQUENO DÉBITO)', tone: 'warn', desc: 'Rolagem a pequeno débito, aceitável se o ajuste de série melhorar a posição.' };
  }
  return { label: 'DESACONSELHADA (DÉBITO ELEVADO)', tone: 'bad', desc: 'Pagar débito líquido expressivo consome capital sem garantia estatística.' };
}