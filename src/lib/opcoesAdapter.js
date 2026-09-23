// Adaptador: converte registros de Operacao (Monitora Trade) para OptionLeg (Black-Scholes)
// Adaptado de APP-Opções (https://github.com/BaumEmpreendimentos-Cloud/APP-Op-es)

import { businessDaysUntil } from './operacoes';

/**
 * Converte operações de um grupo para o formato OptionLeg
 * @param operacoes Array de registros da entidade Operacao
 * @returns Array de OptionLeg { id, type, side, strike, premium, quantity, daysToExpiry, ticker }
 */
export function operacoesToLegs(operacoes) {
  if (!operacoes || !operacoes.length) return [];

  return operacoes.map((op, i) => {
    const isStock = op.categoria === 'ACAO' || op.categoria === 'FII' || op.categoria === 'DOLLAR';
    return {
      id: op.id || `leg-${i}`,
      type: isStock ? 'STOCK' : (op.categoria === 'PUT' ? 'PUT' : 'CALL'),
      side: op.operacao === 'COMPRA' ? 'BUY' : 'SELL',
      strike: op.strike || 0,
      premium: op.preco_entrada || 0,
      quantity: op.quantidade || 0,
      daysToExpiry: isStock ? 999 : (businessDaysUntil(op.vencimento) ?? 22),
      ticker: op.ativo || '',
    };
  });
}