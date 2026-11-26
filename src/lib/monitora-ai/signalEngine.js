import { base44 } from '@/api/base44Client';

export async function persistOpportunities(records = []) {
  if (!records.length) return [];
  const salvos = [];
  for (const record of records) {
    salvos.push(await base44.entities.AiOportunidade.create(record));
  }
  return salvos;
}

export async function updateOpportunityStatus(id, status) {
  return base44.entities.AiOportunidade.update(id, { status });
}

const AVALIAVEIS = ['APROVADA', 'EXECUTADA'];
const DIRECIONAIS = ['COMPRA', 'VENDA'];

function desfechoDe(op, quote, retornoPct) {
  const alvo = Number(op.alvo_referencia);
  const stop = Number(op.stop_referencia);

  if (op.direcao === 'COMPRA') {
    if (Number.isFinite(alvo) && alvo > 0 && quote >= alvo) return 'ALVO_ATINGIDO';
    if (Number.isFinite(stop) && stop > 0 && quote <= stop) return 'STOP_ATINGIDO';
  } else if (op.direcao === 'VENDA') {
    if (Number.isFinite(alvo) && alvo > 0 && quote <= alvo) return 'ALVO_ATINGIDO';
    if (Number.isFinite(stop) && stop > 0 && quote >= stop) return 'STOP_ATINGIDO';
  }

  // Estruturas sem alvo/stop fixo (ex.: opções) encerram pela validade do sinal
  if (op.valida_ate) {
    const expiraEm = Date.parse(op.valida_ate);
    if (Number.isFinite(expiraEm) && Date.now() > expiraEm) {
      return retornoPct >= 0 ? 'EXPIRADO_LUCRO' : 'EXPIRADO_PREJUIZO';
    }
  }

  return 'EM_ACOMPANHAMENTO';
}

/**
 * Explica por que a lista de sinais está vazia: quantas oportunidades estão
 * aprovadas/executadas, quantas são direcionais e quantas têm cotação disponível.
 */
export function diagnosticarSinais(oportunidades = [], quotesMap = {}) {
  const aprovadas = (oportunidades || []).filter((o) => AVALIAVEIS.includes(o.status));
  const direcionais = aprovadas.filter((o) => DIRECIONAIS.includes(o.direcao));
  const neutras = aprovadas.length - direcionais.length;
  const semCotacao = direcionais.filter((o) => {
    const quote = Number(quotesMap[o.ativo_base]);
    return !Number.isFinite(quote) || quote <= 0;
  }).length;
  const semReferencia = direcionais.filter((o) => {
    const ref = Number(o.preco_referencia);
    return !Number.isFinite(ref) || ref <= 0;
  }).length;

  return {
    aprovadas: aprovadas.length,
    direcionais: direcionais.length,
    neutras,
    semCotacao,
    semReferencia,
    prontas: Math.max(0, direcionais.length - semCotacao - semReferencia),
  };
}

/**
 * Avalia as oportunidades aprovadas/executadas contra a cotação atual e grava/atualiza
 * o resultado do sinal sem duplicar registros. Não altera operações nem envia ordens.
 */
export async function evaluateSignals(oportunidades = [], quotesMap = {}) {
  const alvo = (oportunidades || []).filter(
    (o) => AVALIAVEIS.includes(o.status) && DIRECIONAIS.includes(o.direcao)
  );
  const diagnostico = diagnosticarSinais(oportunidades, quotesMap);
  if (!alvo.length) return { avaliados: 0, ignorados: (oportunidades || []).length, ...diagnostico };

  const existentes = await base44.entities.AiResultadoSinal.filter({}, { sort: '-created_date', limit: 200 });
  const porOportunidade = Object.fromEntries((existentes.items || []).map((s) => [s.oportunidade_id, s]));

  let avaliados = 0;
  for (const op of alvo) {
    const quote = Number(quotesMap[op.ativo_base]);
    const ref = Number(op.preco_referencia);
    if (!Number.isFinite(quote) || quote <= 0 || !Number.isFinite(ref) || ref <= 0) continue;

    const retornoPct = op.direcao === 'COMPRA'
      ? ((quote - ref) / ref) * 100
      : ((ref - quote) / ref) * 100;

    const payload = {
      oportunidade_id: op.id,
      ativo_base: op.ativo_base,
      motor: op.motor,
      preco_entrada_ref: ref,
      preco_avaliacao: quote,
      retorno_pct: Number(retornoPct.toFixed(2)),
      desfecho: desfechoDe(op, quote, retornoPct),
      avaliado_em: new Date().toISOString(),
    };

    const existente = porOportunidade[op.id];
    if (existente) await base44.entities.AiResultadoSinal.update(existente.id, payload);
    else await base44.entities.AiResultadoSinal.create(payload);
    avaliados += 1;
  }

  return { avaliados, ignorados: (oportunidades || []).length - avaliados, ...diagnostico };
}