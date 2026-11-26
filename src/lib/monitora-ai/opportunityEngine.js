import { strategyTemplates } from '@/lib/strategyTemplates';
import { resolveStrategyLegs } from '@/lib/strategyResolver';
import { evaluateOptionStructure } from './quantEngine';
import { getOptionChain } from './marketEngine';

const DEFAULT_TEMPLATE_IDS = [
  'venda-coberta',
  'trava-alta-call',
  'iron-condor',
  'collar-tradicional',
  'trava-alta-put',
];

export function scoreOpportunity(quant) {
  const popWeight = (quant.popPct || 50) * 0.5;
  const rrBonus = Math.min(30, (quant.rewardToRisk || 0) * 12);
  const thetaBonus = (quant.greeks?.theta || 0) > 0 ? 10 : 0;
  const riskPenalty = quant.riskReward?.unlimitedLoss ? 45 : 0;
  return Math.max(0, Math.min(100, Math.round(popWeight + rrBonus + thetaBonus - riskPenalty)));
}

function ivFromLegs(legs, chain) {
  const values = (legs || [])
    .filter((l) => l.type !== 'STOCK' && l.ticker)
    .map((l) => {
      const match = (chain || []).find((o) => o.symbol === l.ticker);
      const raw = Number(match?.volatility ?? match?.iv ?? 0);
      if (!raw) return null;
      return raw > 2 ? raw / 100 : raw;
    })
    .filter((v) => v && v > 0.02);
  if (!values.length) return { ivDecimal: null, ivSource: 'Premissa padrão 28% (IV indisponível na cadeia)' };
  return {
    ivDecimal: values.reduce((a, b) => a + b, 0) / values.length,
    ivSource: 'OpLab cadeia real',
  };
}

/**
 * Varre os templates do catálogo para um ativo, resolvendo pernas na cadeia OpLab.
 * A cadeia é buscada UMA vez por ativo para limitar chamadas.
 */
export async function scanTemplatesForAsset({
  ativoBase,
  spotPrice,
  selicDecimal,
  selicMeta,
  templateIds = DEFAULT_TEMPLATE_IDS,
}) {
  if (!ativoBase || !spotPrice) return { candidates: [], chainAvailable: false };

  const chain = await getOptionChain(ativoBase);
  if (!chain.length) return { candidates: [], chainAvailable: false };

  const selected = strategyTemplates.filter((t) => templateIds.includes(t.id));
  const candidates = [];

  for (const tpl of selected) {
    const resolved = await resolveStrategyLegs(ativoBase, spotPrice, tpl.legs, chain);
    if (!resolved?.resolved || !resolved.legs?.length) continue;

    const { ivDecimal, ivSource } = ivFromLegs(resolved.legs, chain);
    const quant = evaluateOptionStructure({
      legs: resolved.legs,
      spotPrice,
      ivDecimal: ivDecimal || 0.28,
      ivSource,
      selicDecimal,
      selicMeta,
    });

    const scoreQuant = scoreOpportunity(quant);
    const direcao = tpl.sentiment === 'BEARISH' ? 'VENDA' : (tpl.sentiment === 'NEUTRAL' ? 'NEUTRA' : 'COMPRA');

    candidates.push({
      ativoBase,
      templateId: tpl.id,
      estrategiaNome: tpl.name,
      category: tpl.category,
      direcao,
      dueDate: resolved.dueDate,
      legs: resolved.legs,
      quant,
      scoreQuant,
      ivSource,
    });
  }

  return {
    candidates: candidates.sort((a, b) => b.scoreQuant - a.scoreQuant),
    chainAvailable: true,
  };
}

/** Monta o registro persistível de AiOportunidade a partir da candidata + veto de risco. */
export function buildOpportunityRecord(candidate, validation, { nivelRisco, validadeHoras = 24 }) {
  const { quant } = candidate;
  return {
    ativo_base: candidate.ativoBase,
    motor: 'OPCOES',
    template_id: candidate.templateId,
    estrategia_nome: candidate.estrategiaNome,
    direcao: candidate.direcao,
    horizonte: `${quant.inputs.nearestDte} d.u.`,
    preco_referencia: Number(quant.inputs.spotPrice.toFixed(2)),
    alvo_referencia: quant.breakEvens?.[0] ?? undefined,
    probabilidade_lucro_pct: quant.popPct ?? undefined,
    risco_retorno: quant.rewardToRisk ?? undefined,
    score_quant: candidate.scoreQuant,
    nivel_risco: nivelRisco,
    selic_referencia: quant.inputs.selicPct,
    iv_referencia: quant.inputs.ivPct,
    origem_dados: `OpLab v3 · ${quant.inputs.ivSource} · BCB (${quant.inputs.selicSource})`,
    pernas_json: JSON.stringify(candidate.legs.map((l) => ({
      type: l.type,
      side: l.side,
      quantity: l.quantity,
      strike: l.strike,
      premium: l.premium,
      ticker: l.ticker,
      dueDate: l.dueDate,
    }))),
    greeks: {
      delta: Number(quant.greeks.delta.toFixed(4)),
      gamma: Number(quant.greeks.gamma.toFixed(6)),
      theta: Number(quant.greeks.theta.toFixed(4)),
      vega: Number(quant.greeks.vega.toFixed(4)),
    },
    break_evens: quant.breakEvens || [],
    margem_estimada_brl: Number((quant.marginEstimate?.netEstimatedMargin || 0).toFixed(2)),
    veto_motivos: validation?.blocked ? validation.reasons : [],
    valida_ate: new Date(Date.now() + validadeHoras * 3600 * 1000).toISOString(),
    status: validation?.blocked ? 'VETADA_RISCO' : 'ATIVA',
  };
}