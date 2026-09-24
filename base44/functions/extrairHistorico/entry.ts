import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

const SCHEMA = {
  type: 'object',
  properties: {
    rows: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          identificador: { type: 'string' },
          ativo: { type: 'string' },
          ativo_base: { type: 'string' },
          categoria: { type: 'string' },
          operacao: { type: 'string' },
          quantidade: { type: 'string' },
          preco_entrada: { type: 'string' },
          data_abertura: { type: 'string' },
          strike: { type: 'string' },
          vencimento: { type: 'string' },
          preco_fechamento: { type: 'string' },
          resultado_valor: { type: 'string' },
          resultado_pct: { type: 'string' },
          data_fechamento: { type: 'string' },
        },
      },
    },
  },
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { file_url } = body || {};
    if (!file_url) return Response.json({ error: 'file_url é obrigatório.' }, { status: 400 });

    const res = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: SCHEMA,
    });

    const rows = (res.output && res.output.rows) || (Array.isArray(res.output) ? res.output : []);
    return Response.json({ rows });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}