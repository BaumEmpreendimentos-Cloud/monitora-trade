// Estimativa de margem B3 (metodologia CORE simplificada) e classificação de risco/retorno
// Adaptado de APP-Opções (RiskMarginPanel)

import { generatePayoffCurve } from './blackScholes';

/**
 * Calcula margem estimada B3 CORE para um conjunto de legs { type, side, quantity, strike, premium }
 */
export function calculateMarginAnalysis(legs, spotPrice, spotDropStress = 10) {
  let callShortQuantity = 0, putShortQuantity = 0, callLongQuantity = 0, putLongQuantity = 0, stockQuantity = 0;

  (legs || []).forEach((leg) => {
    const qty = leg.quantity || 0;
    if (leg.type === 'STOCK') {
      stockQuantity += leg.side === 'BUY' ? qty : -qty;
    } else if (leg.type === 'CALL') {
      if (leg.side === 'SELL') callShortQuantity += qty; else callLongQuantity += qty;
    } else if (leg.type === 'PUT') {
      if (leg.side === 'SELL') putShortQuantity += qty; else putLongQuantity += qty;
    }
  });

  const coveredCallQty = stockQuantity > 0 && callShortQuantity > 0 ? Math.min(stockQuantity, callShortQuantity) : 0;
  const uncoveredCallQty = Math.max(0, callShortQuantity - coveredCallQty);

  const marginPerUnit = (spotPrice || 0) * 0.18;
  const totalCallMargin = uncoveredCallQty * marginPerUnit;
  const totalPutMargin = putShortQuantity * marginPerUnit;

  let spreadRelief = 0;
  if (callLongQuantity > 0 && uncoveredCallQty > 0) {
    spreadRelief += Math.min(callLongQuantity, uncoveredCallQty) * (marginPerUnit * 0.65);
  }
  if (putLongQuantity > 0 && putShortQuantity > 0) {
    spreadRelief += Math.min(putLongQuantity, putShortQuantity) * (marginPerUnit * 0.65);
  }

  const netEstimatedMargin = Math.max(0, totalCallMargin + totalPutMargin - spreadRelief);
  const marginUnderStress = netEstimatedMargin * (1 + spotDropStress / 100);

  return {
    coveredCallQty,
    uncoveredCallQty,
    putShortQuantity,
    totalCallMargin,
    totalPutMargin,
    spreadRelief,
    netEstimatedMargin,
    marginUnderStress,
    spotDropPrice: (spotPrice || 0) * (1 - spotDropStress / 100),
    spotSurgePrice: (spotPrice || 0) * (1 + spotDropStress / 100),
    hasShortRisk: uncoveredCallQty > 0 || putShortQuantity > 0,
    riskLevel: uncoveredCallQty > 0 ? 'CRITICO' : (putShortQuantity > 0 ? 'MODERADO' : 'BAIXO'),
  };
}

/**
 * Classifica risco/retorno máximo teórico no vencimento (lucro/perda máxima, limitada ou ilimitada)
 */
export function classifyRiskReward(legs, spotPrice) {
  if (!legs || !legs.length || !spotPrice) return null;

  let stockQty = 0, shortCall = 0, longCall = 0;
  legs.forEach((leg) => {
    const qty = leg.quantity || 0;
    if (leg.type === 'STOCK') stockQty += leg.side === 'BUY' ? qty : -qty;
    else if (leg.type === 'CALL') { if (leg.side === 'SELL') shortCall += qty; else longCall += qty; }
  });

  const unlimitedLoss = Math.max(0, shortCall - Math.max(0, stockQty) - longCall) > 0;
  const unlimitedProfit = (longCall - shortCall) > 0 || stockQty > 0;

  const curve = generatePayoffCurve(legs, spotPrice, 0.28, 0.1325, 0.6, 60);
  const values = curve.map((p) => p.expiryPnL);
  const maxProfit = values.length ? Math.max(...values) : 0;
  const maxLoss = values.length ? Math.min(...values) : 0;

  return { maxProfit, maxLoss, unlimitedLoss, unlimitedProfit };
}