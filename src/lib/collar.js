// Collar Tradicional — ação comprada + CALL vendida + PUT comprada.
// A montagem busca uma faixa de strikes que gera resultado positivo
// mesmo quando o ativo cai até o strike da PUT.

const MIN_DIAS = 15;
export const LOTE_PADRAO = 100;

export const META_COLLAR_PADRAO = { valor: 0, unidade: '%' };

const ehSemanal = (symbol) => /W\d+$/i.test(symbol || '');

function diasAte(dateStr) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(`${dateStr}T00:00:00`);
  return Math.round((alvo - hoje) / 86400000);
}

/** Normaliza a meta de lucro mínimo na queda. */
export function normalizarMetaCollar(meta) {
  const valor = Number(meta?.valor);
  return {
    valor: Number.isFinite(valor) && valor >= 0 ? valor : META_COLLAR_PADRAO.valor,
    unidade: meta?.unidade === 'R$' ? 'R$' : '%',
  };
}

/** Vencimentos mensais futuros, priorizando os com pelo menos 15 dias. */
export function vencimentosMensais(chain = []) {
  const datas = new Set();
  (chain || []).forEach((o) => {
    if (o.due_date && !ehSemanal(o.symbol)) datas.add(o.due_date);
  });
  const hoje = new Date().toISOString().slice(0, 10);
  const futuros = [...datas].filter((d) => d >= hoje).sort((a, b) => a.localeCompare(b));
  const elegiveis = futuros.filter((d) => diasAte(d) >= MIN_DIAS);
  return elegiveis.length ? elegiveis : futuros;
}

/** Opções de um tipo no vencimento informado, ordenadas por strike. */
export function opcoesPorTipo(chain, tipo, dueDate) {
  return (chain || [])
    .filter((o) => o.type === tipo && o.due_date === dueDate && !ehSemanal(o.symbol) && Number(o.close) > 0)
    .map((o) => ({
      symbol: o.symbol,
      strike: Number(o.strike) || 0,
      premium: Number(o.close) || 0,
      dueDate: o.due_date,
    }))
    .sort((a, b) => a.strike - b.strike);
}

/** Resultado estimado no vencimento para a estrutura (R$ e % sobre o desembolso). */
export function analisarCollar({ spot, callStrike, callPremium, putStrike, putPremium, quantidade = LOTE_PADRAO }) {
  const qtd = Number(quantidade) > 0 ? Number(quantidade) : LOTE_PADRAO;
  const s = Number(spot);
  const premioLiquido = Number(callPremium || 0) - Number(putPremium || 0);
  const desembolso = (s - premioLiquido) * qtd;
  const resultadoQueda = (Number(putStrike) - s + premioLiquido) * qtd;
  const resultadoAlta = (Number(callStrike) - s + premioLiquido) * qtd;
  const lucroMinimoPct = desembolso > 0 ? (resultadoQueda / desembolso) * 100 : null;
  return {
    quantidade: qtd,
    premioLiquido,
    desembolso,
    resultadoQueda,
    resultadoAlta,
    lucroMinimoPct,
    ganhoNaQueda: resultadoQueda > 0,
  };
}

/** A estrutura atinge a meta de lucro mínimo configurada? */
export function metaAtingida(analise, meta) {
  if (!analise) return false;
  const m = normalizarMetaCollar(meta);
  return m.unidade === '%'
    ? Number(analise.lucroMinimoPct ?? -Infinity) >= m.valor
    : Number(analise.resultadoQueda) >= m.valor;
}

/**
 * Busca montagens de collar que cumpram a meta na faixa de queda.
 * Usa apenas strikes e prêmios existentes na cadeia; ordena pelo melhor piso.
 */
export function buscarMontagens({ chain, spot, dueDate, meta, quantidade = LOTE_PADRAO, limite = 8 }) {
  const s = Number(spot);
  if (!s || s <= 0) return [];
  const venc = dueDate || vencimentosMensais(chain)[0];
  if (!venc) return [];

  const calls = opcoesPorTipo(chain, 'CALL', venc)
    .filter((o) => o.strike > s)
    .slice(0, 8);
  const puts = opcoesPorTipo(chain, 'PUT', venc)
    .filter((o) => o.strike >= s * 0.95 && o.strike <= s * 1.10)
    .sort((a, b) => Math.abs(a.strike - s) - Math.abs(b.strike - s))
    .slice(0, 8);

  const combinacoes = [];
  calls.forEach((call) => {
    puts.forEach((put) => {
      if (put.strike >= call.strike) return;
      const analise = analisarCollar({
        spot: s,
        callStrike: call.strike,
        callPremium: call.premium,
        putStrike: put.strike,
        putPremium: put.premium,
        quantidade,
      });
      if (analise.desembolso <= 0) return;
      if (!metaAtingida(analise, meta)) return;
      combinacoes.push({ dueDate: venc, call, put, ...analise });
    });
  });

  return combinacoes
    .sort((a, b) => (b.resultadoQueda - a.resultadoQueda) || (b.resultadoAlta - a.resultadoAlta))
    .slice(0, limite);
}

/** Pernas do collar no formato usado pelo simulador e pelo Monitora AI. */
export function legsDoCollar({ ativoBase, spot, call, put, quantidade = LOTE_PADRAO }) {
  const qtd = Number(quantidade) > 0 ? Number(quantidade) : LOTE_PADRAO;
  return [
    {
      id: 'collar-stock',
      type: 'STOCK',
      side: 'BUY',
      quantity: qtd,
      strike: 0,
      premium: Number(spot) || 0,
      ticker: String(ativoBase || '').toUpperCase(),
      dueDate: 'À Vista',
    },
    {
      id: 'collar-put',
      type: 'PUT',
      side: 'BUY',
      quantity: qtd,
      strike: put.strike,
      premium: put.premium,
      ticker: put.symbol,
      dueDate: put.dueDate,
    },
    {
      id: 'collar-call',
      type: 'CALL',
      side: 'SELL',
      quantity: qtd,
      strike: call.strike,
      premium: call.premium,
      ticker: call.symbol,
      dueDate: call.dueDate,
    },
  ];
}