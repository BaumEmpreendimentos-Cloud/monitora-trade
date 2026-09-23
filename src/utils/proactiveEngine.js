// Proactive rollover suggestion engine
// Ported from APP-Opções proactiveEngine.ts to JavaScript

import { calculateBlackScholes, estimateB3Margin, calculatePortfolioGreeks, calculateExpiryPayoffAtPrice } from './blackScholes';
import { getNextB3SeriesLetter } from '../data/b3Assets';

/**
 * Evaluates an active position and generates proactive suggestions based on:
 * - Target Profit reached / close to target
 * - Stop Loss proximity
 * - Expiration risk (days to expiry <= 6)
 * - Theta exhaustion
 * - Naked exposure / margin call threat
 *
 * @param {object} pos - Position record with legs, unrealizedPnL, targetProfit, stopLoss, spotPriceAtEntry
 * @param {number} currentSpot - Current spot price
 * @param {number} iv - Implied volatility (decimal)
 * @param {number} selic - Risk-free rate (decimal)
 * @returns {object} PositionRiskDiagnosis
 */
export function analyzePositionProactively(pos, currentSpot, iv = 0.28, selic = 0.1325) {
  const legs = pos.legs || [];
  const marginEst = estimateB3Margin(legs, currentSpot);
  const greeks = calculatePortfolioGreeks(legs, currentSpot, iv, selic);

  const nearestExpiry = Math.min(
    ...legs.map((l) => (l.type === 'STOCK' ? 999 : l.daysToExpiry || 22))
  );

  const unrealizedPnL = pos.unrealizedPnL ?? 0;
  const targetProfit = pos.targetProfit ?? 0;
  const stopLoss = pos.stopLoss ?? 0;

  const profitTargetReachedPercent = targetProfit > 0 ? (unrealizedPnL / targetProfit) * 100 : undefined;
  const stopLossProximityPercent = stopLoss < 0 ? (Math.abs(Math.min(0, unrealizedPnL)) / Math.abs(stopLoss)) * 100 : undefined;

  const shortLegs = legs.filter((l) => l.side === 'SELL');
  const longLegs = legs.filter((l) => l.side === 'BUY');
  const stockLeg = legs.find((l) => l.type === 'STOCK');
  const stockQty = stockLeg ? (stockLeg.side === 'BUY' ? stockLeg.quantity : -stockLeg.quantity) : 0;

  const totalSoldCallQty = shortLegs.filter((l) => l.type === 'CALL').reduce((a, l) => a + l.quantity, 0);
  const totalBoughtCallQty = longLegs.filter((l) => l.type === 'CALL').reduce((a, l) => a + l.quantity, 0);
  const totalSoldPutQty = shortLegs.filter((l) => l.type === 'PUT').reduce((a, l) => a + l.quantity, 0);
  const totalBoughtPutQty = longLegs.filter((l) => l.type === 'PUT').reduce((a, l) => a + l.quantity, 0);

  const uncoveredCalls = Math.max(0, totalSoldCallQty - Math.max(0, stockQty) - totalBoughtCallQty);
  const uncoveredPuts = Math.max(0, totalSoldPutQty - totalBoughtPutQty);
  const hasNakedRisk = uncoveredCalls > 0 || uncoveredPuts > 0;

  // Max Profit / Max Loss
  let maxLoss = 0;
  if (uncoveredCalls > 0) maxLoss = Infinity;

  const testPrices = [0.1, currentSpot * 0.5, currentSpot * 0.8, currentSpot, currentSpot * 1.2, currentSpot * 1.5, currentSpot * 2.0];
  const pnlOutcomes = testPrices.map((tp) => {
    let pnlAtT = 0;
    legs.forEach((l) => {
      const sign = l.side === 'BUY' ? 1 : -1;
      if (l.type === 'STOCK') {
        pnlAtT += sign * (tp - pos.spotPriceAtEntry) * l.quantity;
      } else {
        const payoff = l.type === 'CALL' ? Math.max(0, tp - l.strike) : Math.max(0, l.strike - tp);
        pnlAtT += (l.side === 'BUY' ? payoff - l.premium : l.premium - payoff) * l.quantity;
      }
    });
    return pnlAtT;
  });

  if (maxLoss !== Infinity) maxLoss = Math.min(...pnlOutcomes);
  const calculatedMaxProfit = Math.max(...pnlOutcomes);
  const maxProfit = longLegs.some((l) => l.type === 'CALL' && l.quantity > totalSoldCallQty)
    ? Infinity : Math.max(0, calculatedMaxProfit);

  const suggestions = [];

  // 1. Take Profit target reached or > 75%
  if (profitTargetReachedPercent !== undefined && profitTargetReachedPercent >= 75) {
    const isFullTarget = profitTargetReachedPercent >= 100;
    suggestions.push({
      id: 'sug-profit-target',
      type: 'CLOSE',
      priority: isFullTarget ? 'CRITICAL' : 'HIGH',
      title: isFullTarget ? 'Meta de Lucro 100% Atingida: Encerramento Recomendado' : '75%+ da Meta de Lucro Atingida: Considere Realização Parcial',
      triggerReason: `Posição atingiu ${profitTargetReachedPercent.toFixed(1)}% do objetivo de ganho (R$ ${unrealizedPnL.toFixed(2)} de R$ ${targetProfit.toFixed(2)}).`,
      explanation: 'Manter a operação aberta nas últimas semanas após capturar a grande maioria do prêmio oferece assimetria desfavorável (ganho residual baixo vs risco gama elevado).',
      financialImpact: {
        netCashflow: unrealizedPnL,
        marginImpact: `Liberação de 100% da margem exigida (R$ ${marginEst.estimatedInitialMargin.toFixed(2)}) na B3.`,
        greeksImprovement: 'Zera a exposição direcional (Delta) e elimina o risco de cauda.',
      },
      costs: ['Custo de corretagem e emolumentos B3 para recompra/venda das pernas.', 'Abertura de mão do ganho residual remanescente.'],
      benefits: [
        `Garante no bolso o lucro líquido de R$ ${unrealizedPnL.toFixed(2)}.`,
        `Desaloca imediatamente R$ ${marginEst.estimatedInitialMargin.toFixed(2)} de margem retida na corretora.`,
        'Elimina risco de reversão brusca ou gap de mercado.',
      ],
      suggestedAction: { label: 'Encerrar Operação Agora' },
    });
  }

  // 2. Stop Loss reached or > 80%
  if (stopLossProximityPercent !== undefined && stopLossProximityPercent >= 80) {
    const isStopTriggered = stopLossProximityPercent >= 100;
    suggestions.push({
      id: 'sug-stop-loss',
      type: 'CLOSE',
      priority: 'CRITICAL',
      title: isStopTriggered ? 'Limite de Stop Loss Atingido: Estancar Risco' : 'Alerta de Proximidade do Stop Loss (80%+)',
      triggerReason: `Prejuízo atual de R$ ${Math.abs(unrealizedPnL).toFixed(2)} atingiu ${stopLossProximityPercent.toFixed(1)}% do limite de perda configurado (R$ ${Math.abs(stopLoss).toFixed(2)}).`,
      explanation: 'Disciplina operacional na B3 exige respeito aos limites de perda máxima para preservar o patrimônio contra perdas irrecuperáveis.',
      financialImpact: {
        netCashflow: unrealizedPnL,
        marginImpact: `Libera R$ ${marginEst.estimatedInitialMargin.toFixed(2)} de garantias antes de chamadas compulsórias.`,
        greeksImprovement: 'Neutraliza o risco direcional negativo.',
      },
      costs: [`Realização do prejuízo acumulado de R$ ${Math.abs(unrealizedPnL).toFixed(2)}.`],
      benefits: [
        'Evita perdas descontroladas caso a tendência adversa continue.',
        'Libera margem e capital para novas operações com melhor relação risco x retorno.',
        'Preserva a saúde financeira da carteira.',
      ],
      suggestedAction: { label: 'Estancar Prejuízo (Fechar Posição)' },
    });
  }

  // 3. Expiration near (DTE <= 6 business days)
  if (nearestExpiry <= 6 && nearestExpiry > 0 && shortLegs.length > 0) {
    const mainShort = shortLegs[0];
    const nextLetter = getNextB3SeriesLetter(
      mainShort.ticker ? mainShort.ticker.charAt(4) : 'J',
      mainShort.type !== 'STOCK' ? mainShort.type : 'CALL'
    );
    const estNewPremium = Math.round((mainShort.currentPrice || mainShort.premium) * 1.4 * 100) / 100;

    suggestions.push({
      id: 'sug-expiry-roll',
      type: 'ROLL_CALENDAR',
      priority: nearestExpiry <= 3 ? 'CRITICAL' : 'HIGH',
      title: `Vencimento em ${nearestExpiry}d Úteis: Rolagem Tática B3`,
      triggerReason: `Faltam apenas ${nearestExpiry} dias úteis para o exercício mensal da B3. Opções no dinheiro (ATM/ITM) possuem risco de exercício antecipado.`,
      explanation: 'A rolagem para a próxima série mensal recompra a opção atual que já decaiu e vende a nova série, estendendo o prazo e capturando novo prêmio financeiro.',
      financialImpact: {
        netCashflow: (estNewPremium - (mainShort.currentPrice || mainShort.premium)) * mainShort.quantity,
        marginImpact: 'Manutenção de margem na nova série com possibilidade de crédito em conta.',
        annualizedRate: Math.round(((estNewPremium / (mainShort.strike || 1)) / 22) * 252 * 100),
        greeksImprovement: 'Restaura Theta positivo diário e reduz Gamma arriscado.',
      },
      costs: [
        `Desembolso para recompra da opção ${mainShort.ticker || ''} a ~R$ ${(mainShort.currentPrice || mainShort.premium).toFixed(2)}.`,
        'Custos de corretagem e emolumentos da nova série.',
      ],
      benefits: [
        `Novo prêmio estimado de R$ ${estNewPremium.toFixed(2)} por contrato na série ${nextLetter}.`,
        'Posterga o risco de exercício e o ganho de Theta passa a atuar a favor novamente.',
        `Taxa anualizada estimada de ~${Math.round(((estNewPremium / (mainShort.strike || 1)) / 22) * 252 * 100)}%.`,
      ],
      suggestedAction: {
        label: `Rolgar para série ${nextLetter}`,
        legToClose: mainShort,
        targetLetter: nextLetter,
        targetPremium: estNewPremium,
        targetDays: 22,
      },
    });
  }

  // 4. Naked risk warning
  if (hasNakedRisk) {
    suggestions.push({
      id: 'sug-naked-risk',
      type: 'HEDGE_SPREAD',
      priority: 'HIGH',
      title: uncoveredCalls > 0 ? 'Risco de Call Descoberta Detectado' : 'Risco de Put Descoberta Detectado',
      triggerReason: `Há ${uncoveredCalls > 0 ? uncoveredCalls : uncoveredPuts} contratos descobertos sem proteção ou cobertura.`,
      explanation: 'Posições descobertas têm risco ilimitado de perda e exigem margem elevada na B3. Considere comprar uma opção de proteção para formar trava.',
      financialImpact: {
        netCashflow: -(uncoveredCalls + uncoveredPuts) * 0.5 * 100,
        marginImpact: 'Reduz margem exigida de ~20% para diferença entre strikes.',
        greeksImprovement: 'Limita o risco máximo de perda da estrutura.',
      },
      costs: ['Custo do prêmio da opção de proteção comprada.'],
      benefits: ['Risco máximo limitado e conhecido.', 'Redução significativa de margem B3.', 'Maior tranquilidade operacional.'],
      suggestedAction: { label: 'Adicionar Proteção (Trava)' },
    });
  }

  // 5. Theta exhaustion info
  if (nearestExpiry > 6 && nearestExpiry <= 15 && shortLegs.length > 0) {
    suggestions.push({
      id: 'sug-theta-info',
      type: 'INFO',
      priority: 'INFO',
      title: `Theta Acelerando: ${nearestExpiry}d Úteis para o Vencimento`,
      triggerReason: `A decaída da opção (theta) acelera nas últimas 2-3 semanas antes do vencimento.`,
      explanation: 'Se a meta de lucro ainda não foi atingida, considere aguardar o decaimento natural ou planejar a rolagem antecipada antes do período de maior risco gamma.',
      financialImpact: {
        netCashflow: greeks.theta * nearestExpiry,
        marginImpact: 'Sem alteração de margem.',
        greeksImprovement: `Theta diário atual: R$ ${greeks.theta.toFixed(2)}`,
      },
      costs: [],
      benefits: ['Aproveita o decaimento natural do prêmio vendido.'],
      suggestedAction: { label: 'Acompanhar' },
    });
  }

  // Overall risk level
  let overallRiskLevel = 'BAIXO';
  if (hasNakedRisk) overallRiskLevel = 'ALTO';
  else if (suggestions.some((s) => s.priority === 'CRITICAL')) overallRiskLevel = 'CRITICO';
  else if (suggestions.some((s) => s.priority === 'HIGH')) overallRiskLevel = 'MODERADO';

  return {
    overallRiskLevel,
    marginRequired: marginEst.estimatedInitialMargin,
    marginType: marginEst.marginType,
    maxProfit,
    maxLoss,
    portfolioDelta: greeks.delta,
    portfolioGamma: greeks.gamma,
    dailyTheta: greeks.theta,
    portfolioVega: greeks.vega,
    daysToNearestExpiry: nearestExpiry,
    profitTargetReachedPercent,
    stopLossProximityPercent,
    hasNakedRisk,
    suggestions,
  };
}

/**
 * Convert Monitora Trade Operacao entities into position-like objects
 * for the proactive engine
 */
export function operacoesToPosition(ops, spotPriceMap) {
  if (!ops || ops.length === 0) return null;

  const legs = ops.map((op, i) => {
    const spot = spotPriceMap[op.ativo] || op.preco_entrada;
    const daysToExpiry = op.vencimento
      ? Math.max(0, Math.ceil((new Date(op.vencimento + 'T00:00:00') - new Date()) / (1000 * 60 * 60 * 24)))
      : 22;

    return {
      id: op.id || `leg-${i}`,
      type: op.categoria === 'CALL' ? 'CALL' : op.categoria === 'PUT' ? 'PUT' : 'STOCK',
      side: op.operacao === 'COMPRA' ? 'BUY' : 'SELL',
      strike: op.strike || spot,
      premium: op.preco_entrada || 0,
      quantity: op.quantidade || 0,
      daysToExpiry,
      ticker: op.ativo,
      currentPrice: spotPriceMap[op.ativo] || op.preco_entrada,
    };
  });

  const initialSpot = ops[0]?.preco_entrada || 0;
  const initialNetCashflow = ops.reduce((s, op) => {
    const sign = op.operacao === 'COMPRA' ? -1 : 1;
    return s + sign * (op.preco_entrada || 0) * (op.quantidade || 0);
  }, 0);

  const currentNetValue = ops.reduce((s, op) => {
    const sign = op.operacao === 'COMPRA' ? 1 : -1;
    const current = spotPriceMap[op.ativo] || op.preco_entrada;
    return s + sign * current * (op.quantidade || 0);
  }, 0);

  const unrealizedPnL = initialNetCashflow + currentNetValue;

  return {
    id: ops[0]?.grupo_id || 'position',
    name: ops[0]?.grupo_nome || 'Posição',
    ticker: ops[0]?.ativo_base || ops[0]?.ativo || '',
    legs,
    spotPriceAtEntry: initialSpot,
    initialNetCashflow,
    unrealizedPnL,
    targetProfit: ops[0]?.target_profit || 0,
    stopLoss: ops[0]?.stop_loss || 0,
  };
}
