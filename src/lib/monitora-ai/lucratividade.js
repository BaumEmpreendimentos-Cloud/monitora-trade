import { classifyRiskReward } from '@/lib/margemB3';

/** Pernas persistidas na oportunidade (JSON). */
export function parseLegs(op) {
  try {
    const list = JSON.parse(op?.pernas_json || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/**
 * Lucratividade aproximada da estrutura no vencimento (R$).
 * Usa o payoff das pernas resolvidas — é estimativa do modelo, não resultado garantido.
 */
export function estimarLucratividade(op) {
  const legs = parseLegs(op);
  const spot = Number(op?.preco_referencia);
  if (!legs.length || !Number.isFinite(spot) || spot <= 0) {
    return { maxProfit: null, maxLoss: null, unlimitedLoss: false };
  }
  const rr = classifyRiskReward(legs, spot);
  return {
    maxProfit: Number.isFinite(rr?.maxProfit) ? rr.maxProfit : null,
    maxLoss: Number.isFinite(rr?.maxLoss) ? rr.maxLoss : null,
    unlimitedLoss: !!rr?.unlimitedLoss,
  };
}