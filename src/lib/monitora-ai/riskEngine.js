export const DEFAULT_RISK_RULES = {
  maxRiskPerTradePct: 1.5,
  maxMarginPctCapital: 35,
  maxGroupsPerUnderlying: 2,
};

/**
 * Veto de risco determinístico para uma candidata antes de ser apresentada.
 * Quando o capital de referência não é conhecido, os limites por capital não são avaliados.
 */
export function validateOpportunityAgainstRisk({
  opportunity,
  portfolioGroups = [],
  capitalTotalBrl = 0,
  rules = DEFAULT_RISK_RULES,
}) {
  const reasons = [];
  let blocked = false;

  const maxLossBrl = Math.abs(opportunity?.quant?.riskReward?.maxLoss || 0);
  const capitalKnown = Number(capitalTotalBrl) > 0;
  const riskPct = capitalKnown ? (maxLossBrl / capitalTotalBrl) * 100 : null;

  if (opportunity?.quant?.riskReward?.unlimitedLoss) {
    blocked = true;
    reasons.push('Estrutura possui risco teórico ilimitado (call vendida descoberta).');
  }

  if (riskPct !== null && riskPct > rules.maxRiskPerTradePct) {
    blocked = true;
    reasons.push(`Risco máximo (${riskPct.toFixed(2)}%) excede o limite de ${rules.maxRiskPerTradePct}% por operação.`);
  }

  const sameUnderlying = (portfolioGroups || []).filter((g) => g.ativoBase === opportunity?.ativoBase).length;
  if (sameUnderlying >= rules.maxGroupsPerUnderlying) {
    blocked = true;
    reasons.push(`Concentração excedida em ${opportunity?.ativoBase} (${sameUnderlying}/${rules.maxGroupsPerUnderlying} grupos ativos).`);
  }

  const currentMargin = (portfolioGroups || []).reduce((acc, g) => acc + (g.estimatedMarginBrl || 0), 0);
  const nextMargin = currentMargin + (opportunity?.quant?.marginEstimate?.netEstimatedMargin || 0);
  const marginPct = capitalKnown ? (nextMargin / capitalTotalBrl) * 100 : null;

  if (marginPct !== null && marginPct > rules.maxMarginPctCapital) {
    blocked = true;
    reasons.push(`Margem estimada acumulada (${marginPct.toFixed(1)}%) ultrapassa o teto de ${rules.maxMarginPctCapital}%.`);
  }

  return {
    status: blocked ? 'BLOQUEADA' : 'APROVADA',
    blocked,
    riskPct: riskPct === null ? null : Number(riskPct.toFixed(2)),
    marginPct: marginPct === null ? null : Number(marginPct.toFixed(1)),
    capitalKnown,
    reasons: blocked ? reasons : ['Enquadrada nos limites de risco e concentração.'],
  };
}

export function classifyRiskLevel(validation, score, marginRiskLevel) {
  if (validation?.blocked) return 'BLOQUEADO';
  if (marginRiskLevel === 'CRITICO') return 'ALTO';
  if (marginRiskLevel === 'MODERADO') return 'MODERADO';
  return 'BAIXO';
}