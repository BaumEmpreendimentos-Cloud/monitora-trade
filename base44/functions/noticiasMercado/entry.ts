import { createClientFromRequest } from 'npm:@base44/sdk@0.8.63';

// Temas fixos: a consulta na web é montada no servidor, nunca a partir de texto livre do usuário.
const TOPICOS = {
  geral: 'panorama da B3 e da macroeconomia brasileira hoje (Ibovespa, dólar, juros futuros, risco fiscal e Banco Central)',
  juros: 'juros e política monetária no Brasil hoje (Selic, Copom, curva de juros futuros e risco fiscal)',
  dolar: 'dólar e cenário externo hoje (câmbio real/dólar, Federal Reserve, Treasuries e DXY)',
  acoes: 'ações blue chip da B3 hoje (Petrobras, Vale, Itaú, Banco do Brasil e WEG)',
};

const MAX_FONTES = 5;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const topico = Object.prototype.hasOwnProperty.call(TOPICOS, body?.topico) ? body.topico : 'geral';

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Você é analista de mercado brasileiro. Consulte notícias publicadas nas últimas 24 horas sobre ${TOPICOS[topico]}.

Regras:
- Escreva em português do Brasil, em até 6 frases curtas, ligando cada fato ao impacto em B3, juros futuros e câmbio.
- Use apenas fatos encontrados na busca; se não houver notícia recente sobre um ponto, diga que não foi encontrada.
- Não emita recomendação de investimento, ordem, alvo de preço ou promessa de retorno.
- Liste até ${MAX_FONTES} fontes realmente consultadas, com título, veículo e URL completa.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          briefing: { type: 'string' },
          fontes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                titulo: { type: 'string' },
                veiculo: { type: 'string' },
                url: { type: 'string' },
              },
              required: ['titulo'],
            },
          },
        },
        required: ['briefing'],
      },
    });

    const data = typeof result === 'string' ? { briefing: result } : (result || {});
    const fontes = (Array.isArray(data.fontes) ? data.fontes : [])
      .filter((f) => f && typeof f.titulo === 'string' && f.titulo.trim())
      .slice(0, MAX_FONTES)
      .map((f) => ({
        titulo: String(f.titulo).slice(0, 200),
        veiculo: f.veiculo ? String(f.veiculo).slice(0, 80) : '',
        url: /^https?:\/\//i.test(String(f.url || '')) ? String(f.url).slice(0, 500) : '',
      }));

    const briefing = String(data.briefing || '').slice(0, 4000);
    if (!briefing) {
      return Response.json({ error: 'A busca não retornou um resumo de notícias.' }, { status: 502 });
    }

    return Response.json({
      topico,
      briefing,
      fontes,
      consultado_em: new Date().toISOString(),
    });
  } catch (error) {
    console.log('noticiasMercado error', error?.message);
    return Response.json({ error: error?.message || 'Erro interno' }, { status: 500 });
  }
}