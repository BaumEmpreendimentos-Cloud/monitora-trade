import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { ticker, spotPrice, scenarioDescription, legs, interestRate, iv } = body;

    if (!legs || !Array.isArray(legs) || legs.length === 0) {
      return Response.json({ error: 'Nenhuma perna fornecida para análise.' }, { status: 400 });
    }

    const geminiApiKey = secrets.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return Response.json({
        error: 'Chave da API do Gemini não configurada. Configure GEMINI_API_KEY nas secrets do app.'
      }, { status: 500 });
    }

    // Build strategy summary for the AI prompt
    const legsSummary = legs.map((l, i) => {
      const side = l.side === 'BUY' ? 'Compra' : 'Venda';
      const type = l.type === 'STOCK' ? 'Ação' : l.type;
      return `Perna ${i + 1}: ${side} ${l.quantity}x ${type} Strike ${l.strike} @ R$ ${l.premium} (${l.daysToExpiry}d úteis)`;
    }).join('\n');

    const prompt = `Você é um analista especialista em opções da B3 (Bolsa Brasileira).
Analise o seguinte cenário de estresse para uma posição de opções:

Ativo: ${ticker}
Preço Spot Atual: R$ ${spotPrice}
Volatilidade Implícita: ${(iv * 100).toFixed(1)}%
Taxa Selic: ${(interestRate * 100).toFixed(2)}%

Estrutura da Posição:
${legsSummary}

Cenário de Estresse: ${scenarioDescription}

Forneça uma análise estruturada em JSON com os seguintes campos:
{
  "executiveSummary": "Resumo executivo de 2-3 frases sobre o impacto do cenário",
  "estimatedPnLImpact": "Estimativa de impacto no P&L (direção e magnitude aproximada)",
  "b3MarginRisk": "Avaliação do risco de margem B3 (baixo/moderado/alto)",
  "recommendedActions": ["ação 1", "ação 2", "ação 3"]
}

Responda APENAS com o JSON válido, sem texto adicional.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error('Gemini API error:', res.status, errText);
      return Response.json({ error: `Erro na API do Gemini: ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse JSON from the response (handle markdown code blocks)
    let analysis;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      analysis = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch (e) {
      analysis = {
        executiveSummary: text.slice(0, 500),
        estimatedPnLImpact: 'Não foi possível estruturar a resposta.',
        b3MarginRisk: 'Não avaliado.',
        recommendedActions: [],
      };
    }

    return Response.json({ analysis });
  } catch (error) {
    console.error('analiseCenarios error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
