import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { completarResultado, hojeBrasil, somarResultadosAusentes } from './valores.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((error) => error.status === 401 ? null : Promise.reject(error));
    if (!user) return Response.json({ error: 'Não autenticado.' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const action = body.action ?? 'grupos';
    const owner = { created_by_id: user.id };
    const closed = { ...owner, status: 'FECHADA' };
    const paid = { ...owner, data_pagamento: { $lte: hojeBrasil() } };

    if (action === 'detalhes') {
      if (typeof body.grupoId !== 'string' || !body.grupoId.trim() || body.grupoId.length > 100) return Response.json({ error: 'Identificador inválido.' }, { status: 400 });
      for (const cursor of [body.opsCursor, body.divCursor]) {
        if (cursor != null && cursor !== false && (typeof cursor !== 'string' || cursor.length > 4000)) return Response.json({ error: 'Página inválida.' }, { status: 400 });
      }
      const empty = { items: [], has_more: false, next_cursor: null };
      const [ops, dividendos] = await Promise.all([
        body.opsCursor === false ? empty : base44.entities.Operacao.filter({ ...closed, grupo_id: body.grupoId }, { sort: '-data_fechamento', limit: 50, ...(body.opsCursor ? { cursor: body.opsCursor } : {}) }),
        body.divCursor === false ? empty : base44.entities.Dividendo.filter({ ...paid, grupo_id: body.grupoId }, { sort: '-data_pagamento', limit: 50, ...(body.divCursor ? { cursor: body.divCursor } : {}) }),
      ]);
      return Response.json({ operacoes: { ...ops, items: ops.items.map(completarResultado) }, dividendos });
    }
    if (action !== 'grupos') return Response.json({ error: 'Ação inválida.' }, { status: 400 });
    const page = body.page ?? 0;
    if (!Number.isInteger(page) || page < 0 || page > 100000) return Response.json({ error: 'Página inválida.' }, { status: 400 });
    const [ops, divs] = await Promise.all([
      base44.entities.Operacao.aggregate({ query: closed, groupBy: 'grupo_id', sum: ['resultado_valor'], max: ['data_fechamento', 'grupo_nome'] }),
      base44.entities.Dividendo.aggregate({ query: paid, groupBy: 'grupo_id', sum: ['valor_total'], max: ['data_pagamento', 'grupo_nome'] }),
    ]);
    if (ops.truncated || divs.truncated) return Response.json({ error: 'Não foi possível carregar todos os identificadores.' }, { status: 422 });
    const all = new Map();
    for (const row of ops.rows) all.set(row.grupo_id, {
      id: row.grupo_id, nome: row.max_grupo_nome || row.grupo_id,
      total: Number(row.sum_resultado_valor ?? 0), operacoes_count: row.count, dividendos_count: 0,
      lastDate: new Date(row.max_data_fechamento || 0).getTime() || 0,
    });
    for (const row of divs.rows) {
      const grupo = all.get(row.grupo_id) ?? { id: row.grupo_id, nome: row.max_grupo_nome || row.grupo_id, total: 0, operacoes_count: 0, dividendos_count: 0, lastDate: 0 };
      grupo.total += Number(row.sum_valor_total ?? 0);
      grupo.dividendos_count = row.count;
      grupo.lastDate = Math.max(grupo.lastDate, new Date(row.max_data_pagamento || 0).getTime() || 0);
      all.set(row.grupo_id, grupo);
    }
    const sorted = [...all.values()].sort((a, b) => b.lastDate - a.lastDate || String(a.id).localeCompare(String(b.id)));
    const items = sorted.slice(page * 20, (page + 1) * 20);
    if (items.length) {
      const ids = items.map((grupo) => grupo.id);
      const selected = new Map(items.map((grupo) => [grupo.id, grupo]));
      const [grupos] = await Promise.all([
        base44.entities.GrupoOperacao.filter({ ...owner, id: { $in: ids } }, { limit: 20 }),
        somarResultadosAusentes(base44.entities.Operacao, { ...closed, grupo_id: { $in: ids } }, selected),
      ]);
      // O nome atual vem do vínculo por ID, nunca do nome antigo copiado no dividendo.
      for (const grupo of grupos.items) selected.get(grupo.id).nome = grupo.nome;
    }
    const hasMore = (page + 1) * 20 < sorted.length;
    return Response.json({ items, next_page: hasMore ? page + 1 : null, has_more: hasMore });
  } catch (error) {
    console.error('Falha ao carregar histórico:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}