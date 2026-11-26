import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

const OPLAB_BASE = 'https://api.oplab.com.br/v3';
const BCB_BASE = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs';

const MAX_TICKERS = 8;
const MAX_QUANT_PAYLOAD = 12000;

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

async function fetchQuotes(tickers, token) {
  if (!token || !tickers.length) return [];
  try {
    const params = new URLSearchParams({ tickers: tickers.join(',') });
    const res = await fetch(`${OPLAB_BASE}/market/quote?${params}`, {
      headers: { 'Access-Token': token, Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [data];
  } catch (error) {
    return [];
  }
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
    const quotes = await fetchQuotes(tickers, token);

    const snapshot = await base44.entities.AiSnapshotMercado.create({
      capturado_em: macro.capturedAt,
      selic_meta: selic?.value ?? null,
      selic_data_ref: selic?.date ?? '',
      cdi_anual: cdi?.value ?? null,
      ptax_venda: ptax?.value ?? null,
      ipca_12m: ipca12m?.value ?? null,
      cotacoes_json: JSON.stringify(quotes).slice(0, 40000),
      fonte_primaria: 'OpLab v3 + BCB SGS',
    });

    const quantPayload = JSON.stringify(body.quantPayload || {}).slice(0, MAX_QUANT_PAYLOAD);

    const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Você é o Comitê Monitora AI de uma plataforma brasileira de controle de operações na B3.
Sua função é EXCLUSIVAMENTE interpretar os números já calculados pelo sistema. Não recalcule gregas, payoffs, resultados, margem ou probabilidades, e não invente valores ausentes.

DADOS OFICIAIS BCB (fonte: BCB SGS):
${JSON.stringify({ selic, cdi, ptax, ipca12m })}

COTAÇÕES OPLAB (fonte: OpLab v3):
${JSON.stringify(quotes)}

CARTEIRA E MÉTRICAS DETERMINÍSTICAS CALCULADAS NO APP:
${quantPayload}

Regras:
- Escreva em português do Brasil, de forma objetiva e operacional.
- Se um dado estiver ausente, vazio ou marcado como premissa padrão, diga explicitamente que ele não está disponível em vez de estimar.
- Nunca afirme margem oficial da B3 nem probabilidade calibrada/validada: os números são estimativas do modelo.
- Não emita ordem, recomendação garantida ou promessa de retorno.
- Produza o parecer dos 6 agentes, exatamente nesta ordem: Macro, Técnico, Opções, Day Trade, Fundamentalista, Risco. Cada agente traz viés (BULLISH, BEARISH ou NEUTRO) e uma leitura de 1 a 2 frases ancorada nos dados acima.
- Resumo executivo de até 5 frases.`,
      add_context_from_internet: true,
      model: 'gemini_3_8_flash',
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

    const llm = typeof llmResult === 'string' ? {} : (llmResult || {});
    const agentes = Array.isArray(llm.agentes) ? llm.agentes : [];

    const analise = await base44.entities.AiAnalise.create({
      snapshot_id: snapshot.id,
      rotina_etapa: body.rotina_etapa || 'SOB_DEMANDA',
      regime_mercado: llm.regime_mercado || 'Não informado',
      correlacao_chave: llm.correlacao_chave || '',
      resumo_executivo: llm.resumo_executivo || 'A IA não retornou um resumo nesta execução.',
      agentes_json: JSON.stringify(agentes).slice(0, 20000),
      modelo_ia: 'gemini_3_8_flash (contexto de internet)',
      gerado_em: new Date().toISOString(),
    });

    return Response.json({ snapshot, analise, agentes, macro });
  } catch (error) {
    console.log('monitoraAI error', error?.message);
    return Response.json({ error: error?.message || 'Erro interno' }, { status: 500 });
  }
}