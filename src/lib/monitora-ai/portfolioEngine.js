import { operacoesToLegs } from '@/lib/opcoesAdapter';
import { analyzePositionProactively, calcUnrealizedPnL } from '@/lib/proactiveEngine';
import { calculateMarginAnalysis } from '@/lib/margemB3';

/**
 * Consolida a carteira aberta em grupos com P&L não realizado, exposição e margem estimada.
 * Cotações vêm do mapa OpLab; quando ausentes, usa o preço de entrada e sinaliza a origem.
 */
export function analyzeOpenGroups(operacoesAbertas, quotesMap = {}, { selicDecimal = 0.1325, ivDecimal = 0.28, ivMap = {} } = {}) {
  const byGroup = {};
  (operacoesAbertas || []).forEach((op) => {
    const key = op.grupo_id || op.ativo_base || op.ativo;
    if (!key) return;
    if (!byGroup[key]) byGroup[key] = [];
    byGroup[key].push(op);
  });

  return Object.entries(byGroup).map(([groupId, ops]) => {
    const ativoBase = ops[0]?.ativo_base || ops[0]?.ativo || '';
    const quote = quotesMap[ativoBase];
    const spotPrice = Number(quote) > 0 ? Number(quote) : Number(ops[0]?.preco_entrada || 0);
    const legs = operacoesToLegs(ops);
    // IV do ativo quando conhecida (oportunidade registrada); senão, a premissa padrão
    const ivDoAtivo = Number(ivMap[ativoBase]) > 0.02 ? Number(ivMap[ativoBase]) : ivDecimal;
    const unrealizedPnL = calcUnrealizedPnL(legs, spotPrice, ivDoAtivo, selicDecimal);

    const invested = ops.reduce(
      (acc, o) => acc + Math.abs(o.valor_inicial || (o.preco_entrada || 0) * (o.quantidade || 0)),
      0
    ) || 1000;

    const proactive = analyzePositionProactively(
      legs,
      spotPrice,
      unrealizedPnL,
      invested * 0.5,
      -invested * 0.35,
      ivDoAtivo,
      selicDecimal
    );
    const margin = calculateMarginAnalysis(legs, spotPrice, 10);

    return {
      groupId,
      grupoNome: ops[0]?.grupo_nome || ativoBase,
      ativoBase,
      spotPrice,
      spotSource: Number(quote) > 0 ? 'cotacao' : 'entrada',
      legsCount: legs.length,
      invested,
      ivDecimal: ivDoAtivo,
      ivSource: Number(ivMap[ativoBase]) > 0.02 ? 'oportunidade' : 'premissa 28%',
      unrealizedPnL: Number(unrealizedPnL.toFixed(2)),
      proactive,
      estimatedMarginBrl: Number((margin?.netEstimatedMargin || 0).toFixed(2)),
      hasUncoveredCall: (margin?.uncoveredCallQty || 0) > 0,
      riskLevel: margin?.riskLevel || 'BAIXO',
    };
  });
}

/** Capital de referência: total investido nas posições abertas (não é saldo de conta). */
export function calcCapitalReferencia(operacoesAbertas = []) {
  return (operacoesAbertas || []).reduce(
    (acc, o) => acc + Math.abs(o.valor_inicial || (o.preco_entrada || 0) * (o.quantidade || 0)),
    0
  );
}