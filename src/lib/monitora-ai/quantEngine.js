import {
  pdfNormal,
  calculatePortfolioGreeks,
  generatePayoffCurve,
  findBreakEvens,
} from '@/lib/blackScholes';
import { calculateMarginAnalysis, classifyRiskReward } from '@/lib/margemB3';

/**
 * PoP estimada sob distribuição lognormal, usando a taxa Selic real (BCB) e a IV da estrutura.
 * É uma ESTIMATIVA DO MODELO — não é probabilidade calibrada com histórico.
 */
export function calcModelPoP(payoffCurve, spotPrice, daysToExpiry, ivDecimal, selicDecimal) {
  if (!payoffCurve?.length || !spotPrice || spotPrice <= 0) return null;
  const T = Math.max(1, daysToExpiry || 22) / 252;
  const sigma = Math.max(0.05, ivDecimal || 0.28);
  const mu = Math.log(spotPrice) + (selicDecimal - 0.5 * sigma * sigma) * T;
  const stdLog = sigma * Math.sqrt(T);

  let probProfit = 0;
  let totalDensity = 0;
  for (const pt of payoffCurve) {
    if (pt.price <= 0) continue;
    const z = (Math.log(pt.price) - mu) / stdLog;
    const density = pdfNormal(z) / (pt.price * stdLog);
    totalDensity += density;
    if (pt.expiryPnL > 0) probProfit += density;
  }
  if (totalDensity <= 0) return null;
  return Math.min(96, Math.max(4, Math.round((probProfit / totalDensity) * 100)));
}

/**
 * Consolida as métricas quantitativas de uma estrutura (tudo determinístico).
 */
export function evaluateOptionStructure({
  legs,
  spotPrice,
  ivDecimal,
  ivSource = 'OpLab cadeia real',
  selicDecimal,
  selicMeta,
}) {
  const safeIv = ivDecimal && ivDecimal > 0.02 ? ivDecimal : 0.28;
  const optionLegs = (legs || []).filter((l) => l.type !== 'STOCK');
  const nearestDte = optionLegs.length
    ? Math.min(...optionLegs.map((l) => l.daysToExpiry || 22))
    : 22;

  const greeks = calculatePortfolioGreeks(legs, spotPrice, safeIv, selicDecimal);
  const payoffCurve = generatePayoffCurve(legs, spotPrice, safeIv, selicDecimal, 0.28, 80);
  const breakEvens = findBreakEvens(legs, spotPrice, 0.35);
  const riskReward = classifyRiskReward(legs, spotPrice);
  const marginEstimate = calculateMarginAnalysis(legs, spotPrice, 10);
  const popPct = calcModelPoP(payoffCurve, spotPrice, nearestDte, safeIv, selicDecimal);

  const absLoss = Math.abs(riskReward?.maxLoss || 0);
  const rewardToRisk = absLoss > 0 && riskReward?.maxProfit > 0
    ? Number((riskReward.maxProfit / absLoss).toFixed(2))
    : null;

  return {
    inputs: {
      spotPrice,
      nearestDte,
      ivPct: Number((safeIv * 100).toFixed(2)),
      ivSource,
      selicPct: Number((selicDecimal * 100).toFixed(2)),
      selicDate: selicMeta?.date || null,
      selicSource: selicMeta?.source || 'Premissa padrão',
    },
    greeks,
    breakEvens,
    payoffCurve,
    riskReward,
    rewardToRisk,
    popPct,
    marginEstimate: {
      ...marginEstimate,
      avisoMetodologia:
        'Estimativa simplificada (metodologia própria); não substitui a margem oficial da B3 ou da corretora.',
    },
  };
}