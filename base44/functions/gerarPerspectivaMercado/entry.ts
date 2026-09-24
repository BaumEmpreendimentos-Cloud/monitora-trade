import { createClientFromRequest } from 'npm:@base44/sdk@0.8.51';
import { secrets } from 'base44:runtime';

const OPLAB_API_BASE = 'https://api.oplab.com.br/v3';
const CAROUSEL_TICKERS = ['PETR4', 'VALE3', 'ITUB4', 'BBAS3', 'WEGE3', 'B3SA3', 'ABEV3', 'BOVA11'];

async function fetchCotacoes() {
  const token = secrets.get('OPLAB_ACCESS_TOKEN');
  if (!token) return [];
  try {
    const params = new URLSearchParams({ tickers: CAROUSEL_TICKERS.join(',') });
    const res = await fetch(`${OPLAB_API_BASE}/market/quote?${params}`, {
      headers: { 'Access-Token': token, 'Accept': 'application/json' }
    });
    if (!res.ok) return [];
    const data = await res.json();
    const arr = Array.isArray(data) ? data : [data];
    return CAROUSEL_TICKERS.map((t) => {
      const q = arr.find((x) => (x.symbol || x.ticker) === t);
      if (!q) return null;
      return { symbol: t, price: q.close, change: q.variation ?? 0 };
    }).filter(Boolean);
  } catch (e) {
    console.error('fetchCotacoes error:', e.message);
    return [];
  }
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Segurança: apenas admins ou chamadas internas do workflow (sem contexto de usuário)
    let authorized = false;
    let hasUser = false;
    try {
      const user = await base44.auth.me();
      hasUser = true;
      if (user?.role === 'admin') authorized = true;
    } catch (e) { /* sem contexto de usuário — provável chamada interna do workflow */ }
    if (!hasUser) {
      try {
        if (await base44.auth.isAuthenticated()) authorized = true;
      } catch (e) { /* não autenticado — chamada interna */ }
    }
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 403 });

    const hoje = new Date().toISOString().split('T')[0];

    const schema = {
      type: 'object',
      properties: {
        estado_animico: { type: 'number' },
        mood_label: { type: 'string' },
        bias: { type: 'string', enum: ['BULLISH', 'BEARISH', 'NEUTRO'] },
        bias_confidence: { type: 'number' },
        resumo_ia: { type: 'string' },
        catalisadores: { type: 'array', items: { type: 'string' } },
        recomendacoes: { type: 'array', items: { type: 'string' } },
        risco_eleitoral_nivel: { type: 'string' },
        risco_eleitoral_resumo: { type: 'string' },
        premio_di_hedge: { type: 'string' },
        radar_macro: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              indicador: { type: 'string' },
              variacao: { type: 'string' },
              impacta: { type: 'string' },
              correlacao: { type: 'string' },
              descricao: { type: 'string' },
              status: { type: 'string', enum: ['BULLISH_FOR_B3', 'BEARISH_FOR_B3', 'NEUTRAL'] },
              valor: { type: 'string' }
            }
          }
        },
        noticias: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              titulo: { type: 'string' },
              resumo: { type: 'string' },
              fonte: { type: 'string' },
              categoria: { type: 'string' },
              sentimento: { type: 'string', enum: ['bullish', 'bearish', 'neutro'] },
              score: { type: 'number' },
              tempo: { type: 'string' },
              conexao_b3: { type: 'string' }
            }
          }
        }
      },
      required: ['estado_animico', 'mood_label', 'bias', 'resumo_ia', 'catalisadores', 'recomendacoes', 'radar_macro', 'noticias']
    };

    const prompt = `Você é um analista quantitativo brasileiro especializado no mercado B3 (bolsa brasileira). Com base em notícias reais e atuais do mercado financeiro (Brasil e exterior), gere uma análise completa para hoje (${hoje}), em português do Brasil, no seguinte formato:

1. estado_animico: um índice de 0 (medo extremo) a 100 (ganância extrema) representando o humor do mercado brasileiro hoje.
2. mood_label: rótulo curto do estado (ex: "Ganância Moderada", "Medo Moderado").
3. bias: viés predominante do mercado (BULLISH, BEARISH ou NEUTRO).
4. bias_confidence: confiança do viés em % (0-100).
5. resumo_ia: um parágrafo (3-5 frases) com a perspectiva diária do mercado B3, citando fatores reais como EWZ, commodities (minério de ferro, petróleo Brent), curva de juros (DI), fluxo cambial e contexto político/fiscal.
6. catalisadores: lista de 3-5 catalisadores reais do dia (B3 e externos).
7. recomendacoes: lista de 3-5 diretrizes operacionais táticas para operações de curto prazo na B3 (ex: Mini-Índice, Mini-Dólar, ações).
8. risco_eleitoral_nivel: nível de risco eleitoral/fiscal atual (ex: "Baixo", "Moderado", "Alto").
9. risco_eleitoral_resumo: parágrafo curto sobre o cenário político-fiscal brasileiro e seu impacto nos mercados.
10. premio_di_hedge: frase curta com prêmio estimado de risco na curva de juros ou sugestão de hedge.
11. radar_macro: lista de 5-6 itens reais mostrando como fluxos globais impactam a B3. Cada item deve ter: indicador (ex: "EWZ (MSCI Brazil em NY)", "S&P 500 Futuros", "DXY", "Minério de Ferro", "Petróleo Brent", "Treasuries 10 Anos vs Selic"), variacao (ex: "+0.82%"), impacta (ativo B3 afetado, ex: "Mini-Índice (WIN$)"), correlacao (ex: "+0.78"), descricao (1-2 frases explicando a transmissão), status (BULLISH_FOR_B3, BEARISH_FOR_B3 ou NEUTRAL), valor (cotação atual, ex: "US$ 37.95").
12. noticias: lista de 6-8 notícias reais e recentes (Brasil e exterior) relevantes para a B3, cada uma com: titulo, resumo (2-3 frases), fonte (nome real do veículo), categoria (B3, Macro Brasil, Eleições & Política, Commodities, Global/Wall St), sentimento (bullish/bearish/neutro), score (-100 a 100), tempo (ex: "12 min atrás", "2 horas atrás"), conexao_b3 (1 frase explicando a transmissão para a B3).

Use dados e notícias reais e atuais obtidos na internet. Seja específico com números e ativos (PETR4, VALE3, WIN$, WDO$, IBOV, EWZ, DI Futuro).`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: schema,
      model: 'gemini_3_flash'
    });

    const cotacoes = await fetchCotacoes();

    const existing = await base44.asServiceRole.entities.PerspectivaMercado.filter({ data_referencia: hoje }, '-created_date', 1);

    const payload = {
      data_referencia: hoje,
      estado_animico: result.estado_animico,
      mood_label: result.mood_label,
      bias: result.bias,
      bias_confidence: result.bias_confidence,
      resumo_ia: result.resumo_ia,
      catalisadores: result.catalisadores || [],
      recomendacoes: result.recomendacoes || [],
      risco_eleitoral_nivel: result.risco_eleitoral_nivel || '',
      risco_eleitoral_resumo: result.risco_eleitoral_resumo || '',
      premio_di_hedge: result.premio_di_hedge || '',
      radar_macro: result.radar_macro || [],
      noticias: result.noticias || [],
      cotacoes,
      gerado_em: new Date().toISOString()
    };

    let record;
    if (existing && existing.length) {
      record = await base44.asServiceRole.entities.PerspectivaMercado.update(existing[0].id, payload);
    } else {
      record = await base44.asServiceRole.entities.PerspectivaMercado.create(payload);
    }

    return Response.json({ success: true, id: record.id });
  } catch (error) {
    console.error('gerarPerspectivaMercado error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}