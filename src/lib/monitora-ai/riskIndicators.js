import { DEFAULT_RISK_RULES } from '@/lib/monitora-ai/riskEngine';

const RISK_ORDER = { BAIXO: 0, MODERADO: 1, CRITICO: 2 };
const DESFECHOS_POSITIVOS = ['ALVO_ATINGIDO', 'EXPIRADO_LUCRO'];
const DESFECHOS_NEGATIVOS = ['STOP_ATINGIDO', 'EXPIRADO_PREJUIZO'];

/**
 * Indicadores determinísticos da carteira aberta.
 * Não estima saldo de conta: trabalha apenas com margem estimada, exposição e concentração observadas.
 */
export function computePortfolioRisk(groups = [], rules = DEFAULT_RISK_RULES) {
  const totalMargin = groups.reduce((acc, g) => acc + (g.estimatedMarginBrl || 0), 0);
  const totalPnL = groups.reduce((acc, g) => acc + (g.unrealizedPnL || 0), 0);
  const uncoveredCalls = groups.filter((g) => g.hasUncoveredCall).length;

  const porAtivo = {};
  groups.forEach((g) => {
    const key = g.ativoBase || '—';
    if (!porAtivo[key]) porAtivo[key] = { ativo: key, grupos: 0, margem: 0 };
    porAtivo[key].grupos += 1;
    porAtivo[key].margem += g.estimatedMarginBrl || 0;
  });

  const concentracao = Object.values(porAtivo)
    .map((a) => ({
      ...a,
      margem: Number(a.margem.toFixed(2)),
      sharePct: totalMargin > 0 ? Number(((a.margem / totalMargin) * 100).toFixed(1)) : null,
    }))
    .sort((a, b) => b.margem - a.margem);

  const nivelConsolidado = groups.reduce((acc, g) => {
    const nivel = RISK_ORDER[g.riskLevel] ?? 0;
    return nivel > acc.nivel ? { nivel, label: g.riskLevel } : acc;
  }, { nivel: 0, label: 'BAIXO' }).label;

  const alertas = [];
  if (uncoveredCalls > 0) {
    alertas.push(`${uncoveredCalls} grupo(s) com call vendida descoberta — risco teórico ilimitado.`);
  }
  concentracao
    .filter((a) => a.grupos > rules.maxGroupsPerUnderlying)
    .forEach((a) => {
      alertas.push(`${a.ativo} com ${a.grupos} grupos ativos (limite de ${rules.maxGroupsPerUnderlying} por ativo).`);
    });
  if (concentracao[0]?.sharePct !== null && concentracao[0]?.sharePct >= 60 && groups.length > 1) {
    alertas.push(`${concentracao[0].ativo} responde por ${concentracao[0].sharePct}% da margem estimada da carteira.`);
  }
  if (!groups.length) {
    alertas.length = 0;
  }

  return {
    totalMargin: Number(totalMargin.toFixed(2)),
    totalPnL: Number(totalPnL.toFixed(2)),
    gruposAbertos: groups.length,
    ativosDistintos: concentracao.length,
    uncoveredCalls,
    concentracao: concentracao.slice(0, 3),
    nivelConsolidado,
    alertas,
    limites: rules,
  };
}

/** Consolida o resultado dos sinais avaliados: desfechos, taxa de acerto e retorno médio. */
export function summarizeSignals(sinais = []) {
  const total = sinais.length;
  if (!total) {
    return { total: 0, positivos: 0, negativos: 0, acompanhamento: 0, taxaAcerto: null, retornoMedio: null, melhor: null, pior: null };
  }

  const positivos = sinais.filter((s) => DESFECHOS_POSITIVOS.includes(s.desfecho)).length;
  const negativos = sinais.filter((s) => DESFECHOS_NEGATIVOS.includes(s.desfecho)).length;
  const acompanhamento = total - positivos - negativos;
  const definidos = positivos + negativos;
  const retornos = sinais.map((s) => Number(s.retorno_pct)).filter((v) => Number.isFinite(v));

  return {
    total,
    positivos,
    negativos,
    acompanhamento,
    taxaAcerto: definidos > 0 ? Number(((positivos / definidos) * 100).toFixed(1)) : null,
    retornoMedio: retornos.length ? Number((retornos.reduce((a, b) => a + b, 0) / retornos.length).toFixed(2)) : null,
    melhor: retornos.length ? Number(Math.max(...retornos).toFixed(2)) : null,
    pior: retornos.length ? Number(Math.min(...retornos).toFixed(2)) : null,
  };
}