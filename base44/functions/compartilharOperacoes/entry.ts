import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CAMPOS = ['id', 'grupo_id', 'grupo_nome', 'ativo', 'ativo_base', 'categoria', 'operacao', 'quantidade', 'preco_entrada', 'valor_inicial', 'data_abertura', 'strike', 'vencimento', 'status', 'preco_fechamento', 'resultado_valor', 'resultado_pct', 'data_fechamento', 'irrf', 'simulada'];
const CAMPOS_DIV = ['id', 'grupo_id', 'grupo_nome', 'ativo', 'data_pagamento', 'quantidade', 'valor_por_acao', 'valor_total'];
const CATEGORIAS = ['ACAO', 'CALL', 'PUT', 'DOLLAR', 'FII'];

const numero = (valor) => (Number.isFinite(Number(valor)) ? Number(valor) : null);
const hojeBrasil = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const dataValida = (valor) => /^\d{4}-\d{2}-\d{2}$/.test(String(valor ?? '')) ? String(valor) : null;

function selecionar(registro, campos) {
  const item = {};
  for (const campo of campos) item[campo] = registro[campo] ?? null;
  return item;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Não autenticado.' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action ?? 'operacoes';

    // O titular autoriza um usuário cadastrado a acompanhar e movimentar suas operações
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

    if (!['operacoes', 'encerrar', 'editar'].includes(action)) return Response.json({ error: 'Ação inválida.' }, { status: 400 });

    // Qualquer acesso às operações de outro usuário exige autorização ativa dele
    const titularId = String(body.titularId ?? '').trim();
    if (!titularId || titularId.length > 100) return Response.json({ error: 'Perfil inválido.' }, { status: 400 });

    const autorizacoes = await base44.entities.CompartilhamentoOperacoes.filter({ titular_id: titularId, visualizador_id: user.id }, { limit: 1 });
    const autorizacao = autorizacoes.items?.[0];
    if (!autorizacao) return Response.json({ error: 'Você não tem autorização para acessar estas operações.', semAutorizacao: true }, { status: 403 });

    if (action === 'encerrar') {
      const operacaoId = String(body.operacaoId ?? '');
      const preco = numero(body.precoFechamento);
      if (!operacaoId || operacaoId.length > 100) return Response.json({ error: 'Operação inválida.' }, { status: 400 });
      if (preco === null || preco <= 0) return Response.json({ error: 'Preço de encerramento inválido.' }, { status: 400 });

      const operacao = await base44.asServiceRole.entities.Operacao.get(operacaoId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
      if (!operacao || operacao.created_by_id !== titularId) return Response.json({ error: 'Operação não encontrada.' }, { status: 404 });
      if (operacao.status === 'FECHADA') return Response.json({ error: 'Esta operação já está encerrada.' }, { status: 409 });

      const quantidade = numero(operacao.quantidade) ?? 0;
      const entrada = numero(operacao.preco_entrada) ?? 0;
      const compra = operacao.operacao === 'COMPRA';
      const diferenca = compra ? preco - entrada : entrada - preco;

      const atualizada = await base44.asServiceRole.entities.Operacao.update(operacaoId, {
        status: 'FECHADA',
        preco_fechamento: preco,
        irrf: numero(body.irrf) ?? 0,
        resultado_valor: diferenca * quantidade,
        resultado_pct: entrada > 0 ? (diferenca / entrada) * 100 : null,
        data_fechamento: new Date().toISOString(),
      });
      return Response.json({ ok: true, operacao: atualizada });
    }

    if (action === 'editar') {
      const operacaoId = String(body.operacaoId ?? '');
      if (!operacaoId || operacaoId.length > 100) return Response.json({ error: 'Operação inválida.' }, { status: 400 });

      const dados = body.dados ?? {};
      const ativo = String(dados.ativo ?? '').trim().toUpperCase();
      if (ativo.length < 4 || ativo.length > 8) return Response.json({ error: 'Ativo inválido.' }, { status: 400 });
      const quantidade = numero(dados.quantidade);
      if (!quantidade || quantidade <= 0) return Response.json({ error: 'Quantidade inválida.' }, { status: 400 });
      const precoEntrada = numero(dados.precoEntrada);
      if (!precoEntrada || precoEntrada <= 0) return Response.json({ error: 'Preço de entrada inválido.' }, { status: 400 });
      const dataAbertura = dataValida(dados.dataAbertura);
      if (!dataAbertura) return Response.json({ error: 'Data de abertura inválida.' }, { status: 400 });

      const categoria = CATEGORIAS.includes(dados.categoria) ? dados.categoria : 'ACAO';
      const isOption = categoria === 'CALL' || categoria === 'PUT';
      const operacao = dados.operacao === 'VENDA' ? 'VENDA' : 'COMPRA';
      const strike = isOption ? numero(dados.strike) : null;
      const vencimento = isOption ? dataValida(dados.vencimento) : null;
      if (isOption && (!strike || strike <= 0 || !vencimento)) return Response.json({ error: 'Dados da opção inválidos.' }, { status: 400 });

      const registro = await base44.asServiceRole.entities.Operacao.get(operacaoId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
      if (!registro || registro.created_by_id !== titularId) return Response.json({ error: 'Operação não encontrada.' }, { status: 404 });

      const ativoBase = isOption ? String(dados.ativo_base ?? '').trim().toUpperCase() || null : null;
      const atualizada = await base44.asServiceRole.entities.Operacao.update(operacaoId, {
        ativo,
        ativo_base: ativoBase,
        categoria,
        operacao,
        quantidade,
        preco_entrada: precoEntrada,
        valor_inicial: (operacao === 'VENDA' ? 1 : -1) * quantidade * precoEntrada,
        data_abertura: dataAbertura,
        strike,
        vencimento,
      });
      return Response.json({ ok: true, operacao: atualizada });
    }

    // Leitura completa das operações do titular, agrupadas por identificador
    const status = body.status === 'FECHADA' ? 'FECHADA' : 'ABERTA';
    const hoje = hojeBrasil();
    const [gruposResp, opsResp, divsResp, fechadas] = await Promise.all([
      base44.asServiceRole.entities.GrupoOperacao.filter({ created_by_id: titularId }, { sort: 'nome', limit: 500 }),
      base44.asServiceRole.entities.Operacao.filter(
        { created_by_id: titularId, status },
        { sort: status === 'ABERTA' ? 'data_abertura' : '-data_fechamento', limit: 500 }
      ),
      base44.asServiceRole.entities.Dividendo.filter({ created_by_id: titularId }, { sort: 'data_pagamento', limit: 1000 }),
      base44.asServiceRole.entities.Operacao.aggregate({ query: { created_by_id: titularId, status: 'FECHADA' }, groupBy: 'grupo_id', sum: ['resultado_valor'] }),
    ]);

    const mapa = new Map();
    const garantirGrupo = (id, nome) => {
      if (!id) return null;
      if (!mapa.has(id)) mapa.set(id, { id, nome: nome || 'Sem identificador', ops: [], dividendos: [], encerradas_total: 0, dividendos_pagos_total: 0, dividendos_pendentes_total: 0 });
      const grupo = mapa.get(id);
      if (nome) grupo.nome = nome;
      return grupo;
    };

    for (const grupo of gruposResp.items) garantirGrupo(grupo.id, grupo.nome);
    for (const linha of fechadas.rows || []) {
      const grupo = garantirGrupo(linha.grupo_id);
      if (grupo) grupo.encerradas_total = Number(linha.sum_resultado_valor ?? 0);
    }
    for (const dividendo of divsResp.items) {
      const grupo = garantirGrupo(dividendo.grupo_id, dividendo.grupo_nome);
      if (!grupo) continue;
      const pago = !!dividendo.data_pagamento && dividendo.data_pagamento <= hoje;
      if (pago) grupo.dividendos_pagos_total += Number(dividendo.valor_total ?? 0);
      else grupo.dividendos_pendentes_total += Number(dividendo.valor_total ?? 0);
      if (status === 'ABERTA' ? !pago : pago) grupo.dividendos.push(selecionar(dividendo, CAMPOS_DIV));
    }
    for (const operacao of opsResp.items) {
      const grupo = garantirGrupo(operacao.grupo_id, operacao.grupo_nome);
      if (grupo) grupo.ops.push(selecionar(operacao, CAMPOS));
    }

    const grupos = [...mapa.values()]
      .filter((grupo) => grupo.ops.length > 0 || grupo.dividendos.length > 0)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    return Response.json({
      grupos,
      titular_nome: autorizacao.titular_nome || 'Usuário',
      titular_id: titularId,
      status,
      hoje,
      has_more: opsResp.has_more || divsResp.has_more || gruposResp.has_more,
    });
  } catch (error) {
    console.error('compartilharOperacoes', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}