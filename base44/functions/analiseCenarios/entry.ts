import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { ticker, spotPrice, iv, ivShock, interestRate, legsDesc, scenarioText } = body || {};
    if (!ticker || spotPrice == null || !legsDesc) {
      return Response.json({ error: 'Parâmetros insuficientes.' }, { status: 400 });
    }

    const effectiveIv = ((Number(iv) + Number(ivShock) / 100) * 100).toFixed(1);

    const prompt = `Você é um analista quantitativo de opções da B3 (bolsa brasileira). Analise o seguinte cenário de stress-test para uma posição em ${ticker}:

ATIVO: ${ticker}
PREÇO ATUAL: R$ ${Number(spotPrice).toFixed(2)}
IV EFETIVA: ${effectiveIv}%
TAXA SELIC: ${(Number(interestRate) * 100).toFixed(2)}%

POSIÇÃO (pernas):
${legsDesc}

CENÁRIO SIMULADO: ${scenarioText || 'Análise geral de risco da posição sob o choque de IV atual'}

Forneça uma análise técnica e concisa em JSON com:
- executiveSummary: resumo executivo do perfil de risco da posição (1-2 frases)
- estimatedPnLImpact: estimativa de impacto no P&L sob o cenário simulado
- b3MarginRisk: avaliação de risco de margem na B3
- recommendedActions: array de 3 a 5 ações recomendadas para o operador`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          executiveSummary: { type: 'string' },
          estimatedPnLImpact: { type: 'string' },
          b3MarginRisk: { type: 'string' },
          recommendedActions: { type: 'array', items: { type: 'string' } },
        },
      },
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}