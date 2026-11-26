import { calculateMarginAnalysis } from '@/lib/margemB3';
import { parseLegs } from './lucratividade';

/**
 * Margem estimada da oportunidade recalculada a partir das pernas resolvidas.
 * Evita depender apenas do valor gravado no momento da varredura.
 */
export function margemDaOportunidade(op) {
  const legs = parseLegs(op);
  const spot = Number(op?.preco_referencia);
  if (!legs.length || !Number.isFinite(spot) || spot <= 0) {
    return Number(op?.margem_estimada_brl) || 0;
  }
  return calculateMarginAnalysis(legs, spot, 10).netEstimatedMargin;
}