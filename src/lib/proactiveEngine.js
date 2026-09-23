// Motor de Rolagem Proativa — sugestões automáticas baseadas em metas/stops/vencimento
// Adaptado de APP-Opções (https://github.com/BaumEmpreendimentos-Cloud/APP-Op-es)

import { calculatePortfolioGreeks, calculateBlackScholes } from './blackScholes';

/**
 * Analisa uma posição e gera sugestões proativas
 * @param legs Array de OptionLeg
 * @param spotPrice Preço atual do ativo base
 * @param unrealizedPnL P&L não realizado
 * @param targetProfit Meta de lucro (R$)
 * @param stopLoss Stop loss (R$, negativo)
 * @param iv Volatilidade implícita
 * @param selic Taxa Selic
 */
export function analyzePositionProactively(legs, spotPrice, unrealizedPnL = 0, targetProfit = 0, stopLoss = 0, iv = 0.28, selic = 0.1325) {
  if (!legs.length || !spotPrice) {
    return null;
  }

  const greeks = calculatePortfolioGreeks(legs, spotPrice, iv, selic);
  const nearestExpiry = Math.min(...legs.map((l) => (l.type === 'STOCK' ? 999 : l.daysToExpiry || 22)));

  const profitTargetPct = targetProfit > 0 ? (unrealizedPnL / targetProfit) * 100 : undefined;
  const stopProximityPct = stopLoss < 0 ? (Math.abs(Math.min(0, unrealizedPnL)) / Math.abs(stopLoss)) * 100 : undefined;

  const shortLegs = legs.filter((l) => l.side === 'SELL');
  const suggestions = [];

  // 1. Meta de lucro atingida (>= 75%)
  if (profitTargetPct !== undefined && profitTargetPct >= 75) {
    const full = profitTargetPct >= 100;
    suggestions.push({
      id: 'profit-target',
      type: 'CLOSE',
      priority: full ? 'CRITICAL' : 'HIGH',
      title: full ? 'Meta de Lucro 100% Atingida — Encerrar' : '75%+ da Meta de Lucro Atingida',
      triggerReason: `Posição atingiu ${profitTargetPct.toFixed(1)}% do objetivo (R$ ${unrealizedPnL.toFixed(2)} de R$ ${targetProfit.toFixed(2)}).`,
      explanation: 'Manter a operação após capturar a maioria do prêmio oferece assimetria desfavorável (ganho residual baixo vs risco gama elevado).',
      action: 'Encerrar Operação',
    });
  }

  // 2. Stop loss próximo (>= 80%)
  if (stopProximityPct !== undefined && stopProximityPct >= 80) {
    const triggered = stopProximityPct >= 100;
    suggestions.push({
      id: 'stop-loss',
      type: 'CLOSE',
      priority: 'CRITICAL',
      title: triggered ? 'Stop Loss Atingido — Estancar Risco' : 'Aproximação do Stop Loss (80%+)',
      triggerReason: `Prejuízo de R$ ${Math.abs(unrealizedPnL).toFixed(2)} atingiu ${stopProximityPct.toFixed(1)}% do limite (R$ ${Math.abs(stopLoss).toFixed(2)}).`,
      explanation: 'Disciplina operacional exige respeito aos limites de perda para preservar o patrimônio.',
      action: 'Estancar Prejuízo',
    });
  }

  // 3. Vencimento próximo (<= 6 dias úteis) com pernas vendidas
  if (nearestExpiry <= 6 && nearestExpiry > 0 && shortLegs.length > 0) {
    suggestions.push({
      id: 'expiry-roll',
      type: 'ROLL_CALENDAR',
      priority: nearestExpiry <= 3 ? 'CRITICAL' : 'HIGH',
      title: `Vencimento em ${nearestExpiry}d Úteis — Rolagem Tática`,
      triggerReason: `Faltam ${nearestExpiry} dias úteis para o exercício. Opções ITM têm risco de exercício antecipado.`,
      explanation: 'Rolar para a próxima série recompra a opção decaída e vende a nova, estendendo o prazo e capturando novo prêmio.',
      action: 'Realizar Rolagem',
    });
  }

  // 4. Theta negativo elevado (alerta informativo)
  if (greeks.theta < -5 && nearestExpiry > 6) {
    suggestions.push({
      id: 'theta-warning',
      type: 'INFO',
      priority: 'MEDIUM',
      title: 'Theta Negativo Elevado',
      triggerReason: `Decaimento temporal de R$ ${Math.abs(greeks.theta).toFixed(2)}/dia úteis.`,
      explanation: 'Posição com theta negativo elevado perde valor rapidamente com o tempo. Considere ajustes se a tese direcional enfraquecer.',
      action: 'Avaliar Ajuste',
    });
  }

  // Risco geral
  let overallRisk = 'BAIXO';
  if (Math.abs(greeks.delta) > 50) overallRisk = 'ALTO';
  else if (Math.abs(greeks.delta) > 20) overallRisk = 'MODERADO';
  if (suggestions.some((s) => s.priority === 'CRITICAL')) overallRisk = 'CRITICO';

  return {
    overallRisk,
    portfolioDelta: greeks.delta,
    portfolioGamma: greeks.gamma,
    dailyTheta: greeks.theta,
    portfolioVega: greeks.vega,
    daysToNearestExpiry: nearestExpiry,
    profitTargetReachedPercent: profitTargetPct,
    stopLossProximityPercent: stopProximityPct,
    suggestions,
  };
}

// Calcula P&L não realizado teórico via Black-Scholes
export function calcUnrealizedPnL(legs, spotPrice, iv = 0.28, r = 0.1325) {
  if (!legs.length || !spotPrice) return 0;
  let pnl = 0;
  legs.forEach((leg) => {
    if (leg.type === 'STOCK') {
      pnl += (leg.side === 'BUY' ? 1 : -1) * (spotPrice - leg.premium) * leg.quantity;
    } else {
      const bs = calculateBlackScholes(spotPrice, leg.strike, leg.daysToExpiry, iv, r, leg.type);
      pnl += (leg.side === 'BUY' ? 1 : -1) * (bs.price - leg.premium) * leg.quantity;
    }
  });
  return pnl;
}