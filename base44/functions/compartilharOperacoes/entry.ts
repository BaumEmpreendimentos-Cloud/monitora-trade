import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CAMPOS = ['id', 'grupo_id', 'grupo_nome', 'ativo', 'ativo_base', 'categoria', 'operacao', 'quantidade', 'preco_entrada', 'valor_inicial', 'data_abertura', 'strike', 'vencimento', 'status', 'preco_fechamento', 'resultado_valor', 'resultado_pct', 'data_fechamento', 'irrf', 'simulada'];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Não autenticado.' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action ?? 'operacoes';

    // O titular autoriza um usuário cadastrado a acompanhar suas operações
    if (action === 'autorizar') {
      const email = String(body.email ?? '').trim().toLowerCase();
      if (!EMAIL.test(email) || email.length > 160) return Response.json({ error: 'E-mail inválido.' }, { status: 400 });
      if (email === String(user.email ?? '').toLowerCase()) return Response.json({ error: 'Você não pode compartilhar com a própria conta.' }, { status: 400 });

      const usuarios = await base44.asServiceRole.entities.User.list();
      const alvo = (usuarios || []).find((u) => String(u.email ?? '').toLowerCase() === email);
      if (!alvo) return Response.json({ error: 'Nenhuma conta cadastrada com este e-mail.' }, { status: 404 });

      const existentes = await base44.entities.CompartilhamentoOperacoes.filter({ titular_id: user.id, visualizador_id: alvo.id }, { limit: 1 });
      if (existentes.items?.length) return Response.json({ ok: true, mensagem: 'Este usuário já está autorizado.' });

      await base44.entities.CompartilhamentoOperacoes.create({
        titular_id: user.id,
        titular_nome: user.full_name || user.email,
        visualizador_id: alvo.id,
        visualizador_nome: alvo.full_name || alvo.email,
        visualizador_email: alvo.email,
        status: 'AUTORIZADO',
        data_autorizacao: new Date().toISOString(),
      });
      return Response.json({ ok: true, mensagem: `Acesso autorizado para ${alvo.full_name || alvo.email}.` });
    }

    if (action === 'revogar') {
      const id = String(body.id ?? '');
      if (!id) return Response.json({ error: 'Registro inválido.' }, { status: 400 });
      const registro = await base44.entities.CompartilhamentoOperacoes.get(id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
      if (!registro || registro.titular_id !== user.id) return Response.json({ error: 'Autorização não encontrada.' }, { status: 404 });
      await base44.entities.CompartilhamentoOperacoes.delete(id);
      return Response.json({ ok: true });
    }

    if (action !== 'operacoes') return Response.json({ error: 'Ação inválida.' }, { status: 400 });

    // Leitura das operações de outro usuário somente com autorização ativa dele
    const titularId = String(body.titularId ?? '').trim();
    if (!titularId || titularId.length > 100) return Response.json({ error: 'Perfil inválido.' }, { status: 400 });
    const status = body.status === 'FECHADA' ? 'FECHADA' : 'ABERTA';

    const autorizacoes = await base44.entities.CompartilhamentoOperacoes.filter({ titular_id: titularId, visualizador_id: user.id }, { limit: 1 });
    const autorizacao = autorizacoes.items?.[0];
    if (!autorizacao) return Response.json({ error: 'Você não tem autorização para ver estas operações.', semAutorizacao: true }, { status: 403 });

    const pagina = await base44.asServiceRole.entities.Operacao.filter(
      { created_by_id: titularId, status },
      { sort: status === 'ABERTA' ? 'data_abertura' : '-data_fechamento', limit: 500 }
    );
    const operacoes = pagina.items.map((o) => {
      const item = {};
      for (const campo of CAMPOS) item[campo] = o[campo] ?? null;
      return item;
    });

    return Response.json({
      operacoes,
      titular_nome: autorizacao.titular_nome || 'Usuário',
      has_more: pagina.has_more,
    });
  } catch (error) {
    console.error('compartilharOperacoes', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}