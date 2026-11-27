import { createClientFromRequest } from 'npm:@base44/sdk@0.8.63';
import { secrets } from 'base44:runtime';

const OPLAB_BASE = 'https://api.oplab.com.br/v3';
const BCB_BASE = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs';

const MAX_TICKERS = 16;
const LOTE_OPLAB = 8;
const MAX_QUANT_PAYLOAD = 12000;

const ETAPA_DESCRICAO = {
  PRE_ABERTURA: 'Pré-abertura (leitura de risco global, juros, câmbio e preparação do pregão)',
  PREGAO: 'Durante o pregão (acompanhamento de cotações, liquidez e proteção de posições abertas)',
  CRUZAMENTO: 'Cruzamento cross-asset (juros, câmbio, fundamentos CVM e carteira)',
  POS_FECHAMENTO: 'Pós-fechamento (balanço do dia, P&L consolidado e preparo para o próximo pregão)',
  SOB_DEMANDA: 'Análise sob demanda (síntese geral do cenário atual)',
};

const toList = (res) => (Array.isArray(res) ? res : (Array.isArray(res?.items) ? res.items : []));
const round2 = (n) => (n !== null && Number.isFinite(n) ? Number(n.toFixed(2)) : null);

async function fetchBcb(seriesId) {
  try {
    const r = await fetch(`${BCB_BASE}.${seriesId}/dados/ultimos/1?formato=json`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const rows = await r.json();
    const first = Array.isArray(rows) ? rows[0] : null;
    if (!first) return null;
    const value = Number(String(first.valor).replace(',', '.'));
    return Number.isFinite(value) ? { value, date: first.data, source: `BCB SGS ${seriesId}` } : null;
  } catch (error) {
    return null;
  }
}

function sanitizeTickers(input) {
  const list = Array.isArray(input) ? input : [];
  return [...new Set(list
    .map((t) => String(t || '').toUpperCase().trim())
    .filter((t) => /^[A-Z0-9]{4,10}$/.test(t)))].slice(0, MAX_TICKERS);
}

// A OpLab aceita até 8 tickers por chamada: o excedente vai em lotes paralelos
async function fetchQuotes(tickers, token) {
  if (!token || !tickers.length) return [];
  const lotes = [];
  for (let i = 0; i < tickers.length; i += LOTE_OPLAB) {
    lotes.push(tickers.slice(i, i + LOTE_OPLAB));
  }
  const respostas = await Promise.all(lotes.map(async (lote) => {
    try {
      const params = new URLSearchParams({ tickers: lote.join(',') });
      const res = await fetch(`${OPLAB_BASE}/market/quote?${params}`, {
        headers: { 'Access-Token': token, Accept: 'application/json' },
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [data];
    } catch (error) {
      return [];
    }
  }));
  return respostas.flat();
}

function enrichFundamentals(fundamentos, quotes, selicPct) {
  const priceMap = {};
  for (const q of quotes || []) {
    const sym = String(q.symbol || q.ticker || '').toUpperCase();
    const p = Number(q.close ?? q.last ?? q.price ?? 0);
    if (sym && p > 0) priceMap[sym] = p;
  }
  return (fundamentos || []).map((f) => {
    const preco = priceMap[f.ativo_base] || null;
    const pl = preco && f.lpa_ltm > 0 ? round2(preco / f.lpa_ltm) : null;
    const pvp = preco && f.vpa > 0 ? round2(preco / f.vpa) : null;
    const earningsYieldPct = preco && Number.isFinite(f.lpa_ltm) ? round2((f.lpa_ltm / preco) * 100) : null;
    const spreadSelicPp = earningsYieldPct !== null && Number.isFinite(selicPct)
      ? round2(earningsYieldPct - selicPct)
      : null;

    return {
      ativo: f.ativo_base,
      setor: f.setor,
      periodo_cvm: f.periodo_ref,
      instituicao_financeira: Boolean(f.instituicao_financeira),
      preco_atual: preco,
      receita_ltm_mi: f.receita_ltm_m,
      lucro_liquido_ltm_mi: f.lucro_liquido_ltm_m,
      patrimonio_liquido_mi: f.patrimonio_liquido_m,
      roe_pct: f.roe_pct,
      margem_liquida_pct: f.margem_liquida_pct,
      divida_liquida_pl: f.divida_liquida_pl,
      lpa_ltm: f.lpa_ltm,
      vpa: f.vpa,
      pl,
      pvp,
      earnings_yield_pct: earningsYieldPct,
      spread_vs_selic_pp: spreadSelicPp,
      fonte: f.fonte,
    };
  });
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action === 'committee' ? 'committee' : 'macro';

    const [selic, cdi, ptax, ipca12m] = await Promise.all([
      fetchBcb(432),
      fetchBcb(4389),
      fetchBcb(1),
      fetchBcb(13522),
    ]);

    const macro = {
      selicPct: selic?.value ?? null,
      selicMeta: selic || { value: null, date: 'fallback', source: 'Premissa padrão' },
      cdi,
      ptax,
      ipca12m,
      capturedAt: new Date().toISOString(),
    };

    if (action === 'macro') {
      return Response.json(macro);
    }

    const tickers = sanitizeTickers(body.tickers);
    const token = secrets.get('OPLAB_ACCESS_TOKEN');
    const [quotes, rawFundamentos] = await Promise.all([
      fetchQuotes(tickers, token),
      tickers.length
        ? base44.asServiceRole.entities.FundamentoAtivo.filter({ ativo_base: { $in: tickers } }, { limit: 30 }).then(toList).catch(() => [])
        : Promise.resolve([]),
    ]);

    const fundamentosCvm = enrichFundamentals(rawFundamentos, quotes, selic?.value ?? null);

    const etapaCodigo = Object.prototype.hasOwnProperty.call(ETAPA_DESCRICAO, body.rotina_etapa)
      ? body.rotina_etapa
      : 'SOB_DEMANDA';

    // Snapshot verificável (auditoria) do mercado usado nesta análise.
    // A persistência é feita pelo app com o token do próprio usuário (RLS owner).
    const snapshotPayload = {
      capturado_em: macro.capturedAt,
      selic_meta: selic?.value ?? null,
      selic_data_ref: selic?.date ?? '',
      cdi_anual: cdi?.value ?? null,
      ptax_venda: ptax?.value ?? null,
      ipca_12m: ipca12m?.value ?? null,
      cotacoes_json: JSON.stringify(quotes).slice(0, 40000),
      fonte_primaria: fundamentosCvm.length ? 'OpLab v3 + BCB SGS + CVM (DFP/ITR)' : 'OpLab v3 + BCB SGS',
    };

    const quantPayload = JSON.stringify(body.quantPayload || {}).slice(0, MAX_QUANT_PAYLOAD);

    const invokeComite = (model) => base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Você é o Comitê Monitora AI de uma plataforma brasileira de controle de operações na B3.
Sua função é EXCLUSIVAMENTE interpretar os números já calculados pelo sistema. Não recalcule gregas, payoffs, resultados, margem, múltiplos ou probabilidades, e não invente valores ausentes.

ETAPA DA ROTINA:
${etapaCodigo} — ${ETAPA_DESCRICAO[etapaCodigo]}

DADOS OFICIAIS BCB (fonte: BCB SGS):
${JSON.stringify({ selic, cdi, ptax, ipca12m })}

COTAÇÕES OPLAB (fonte: OpLab v3):
${JSON.stringify(quotes)}

DADOS FUNDAMENTALISTAS OFICIAIS (fonte: CVM Dados Abertos · DFP + ITR · LTM):
${fundamentosCvm.length ? JSON.stringify(fundamentosCvm) : 'Nenhum fundamento CVM sincronizado ainda (oriente o usuário a clicar em Sincronizar CVM).'}

CARTEIRA E MÉTRICAS DETERMINÍSTICAS CALCULADAS NO APP:
${quantPayload}

Regras:
- Escreva em português do Brasil, de forma objetiva e operacional, coerente com a ETAPA DA ROTINA informada.
- Para o agente Fundamentalista, utilize explicitamente os múltiplos oficiais da CVM (P/L, P/VP, ROE, Margem Líquida, Dívida Líquida/PL, Earnings Yield e spread vs. Selic) quando presentes acima. Só diga que o dado está ausente para ativos que não constem na lista CVM acima.
- Se um dado estiver ausente, vazio ou marcado como premissa padrão, diga explicitamente que ele não está disponível em vez de estimar.
- Nunca afirme margem oficial da B3 nem probabilidade calibrada/validada: os números são estimativas do modelo.
- Não emita ordem, recomendação garantida ou promessa de retorno.
- Produza o parecer dos 6 agentes, exatamente nesta ordem: Macro, Técnico, Opções, Day Trade, Fundamentalista, Risco. Cada agente traz viés (BULLISH, BEARISH ou NEUTRO) e uma leitura de 1 a 2 frases ancorada nos dados acima.
- Resumo executivo de até 5 frases.`,
      add_context_from_internet: true,
      ...(model ? { model } : {}),
      response_json_schema: {
        type: 'object',
        properties: {
          regime_mercado: { type: 'string' },
          correlacao_chave: { type: 'string' },
          resumo_executivo: { type: 'string' },
          agentes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                nome: { type: 'string' },
                vies: { type: 'string' },
                leitura: { type: 'string' },
              },
              required: ['nome', 'leitura'],
            },
          },
        },
        required: ['regime_mercado', 'correlacao_chave', 'resumo_executivo', 'agentes'],
      },
    });

    // Modelo explícito com fallback: se o provedor recusar o modelo, repete na seleção automática
    let llmResult;
    let modeloUsado = 'gemini_3_8_flash (contexto de internet)';
    try {
      llmResult = await invokeComite('gemini_3_8_flash');
    } catch (error) {
      console.log('monitoraAI fallback LLM', error?.message);
      llmResult = await invokeComite(null);
      modeloUsado = 'automático (fallback sem modelo explícito)';
    }

    const llm = typeof llmResult === 'string' ? {} : (llmResult || {});
    const agentes = Array.isArray(llm.agentes) ? llm.agentes : [];

    const analisePayload = {
      rotina_etapa: etapaCodigo,
      regime_mercado: llm.regime_mercado || 'Não informado',
      correlacao_chave: llm.correlacao_chave || '',
      resumo_executivo: llm.resumo_executivo || 'A IA não retornou um resumo nesta execução.',
      agentes_json: JSON.stringify(agentes).slice(0, 20000),
      modelo_ia: modeloUsado,
      gerado_em: new Date().toISOString(),
    };

    return Response.json({ snapshot: snapshotPayload, analise: analisePayload, agentes, macro, quotes, fundamentosCvm });
  } catch (error) {
    console.log('monitoraAI error', error?.message);
    return Response.json({ error: error?.message || 'Erro interno' }, { status: 500 });
  }
}