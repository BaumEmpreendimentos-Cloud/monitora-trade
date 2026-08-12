import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

const API_BASE = 'https://api.oplab.com.br/v3';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const token = secrets.get('OPLAB_ACCESS_TOKEN');
    if (!token) return Response.json({ error: 'Token OpLab não configurado.' }, { status: 500 });

    // 1. Listar todos os alertas ativos (service role, bypassa RLS)
    const alertas = await base44.asServiceRole.entities.Alerta.filter({ status: 'ATIVO' }, '-created_date', 500);
    if (!alertas || !alertas.length) return Response.json({ checked: 0, triggered: 0 });

    const precoAlertas = alertas.filter(a => a.tipo === 'PRECO');
    const resultadoAlertas = alertas.filter(a => a.tipo === 'RESULTADO');

    // 2. Coletar tickers únicos (otimização: 1 chamada API por ativo)
    const tickersSet = new Set();
    precoAlertas.forEach(a => { if (a.ativo) tickersSet.add(a.ativo); });

    // 3. Buscar operações abertas para alertas de RESULTADO, agrupadas por grupo
    const grupoIds = [...new Set(resultadoAlertas.map(a => a.grupo_id).filter(Boolean))];
    const opsByGrupo = {};
    for (const gid of grupoIds) {
      const ops = await base44.asServiceRole.entities.Operacao.filter({ grupo_id: gid, status: 'ABERTA' });
      opsByGrupo[gid] = ops || [];
      ops.forEach(o => { if (o.ativo) tickersSet.add(o.ativo); });
    }

    // 4. Uma única chamada à API OpLab para todos os tickers
    const tickers = [...tickersSet];
    const quotesMap = {};
    if (tickers.length) {
      try {
        const params = new URLSearchParams({ tickers: tickers.join(',') });
        const res = await fetch(`${API_BASE}/market/quote?${params}`, {
          headers: { 'Access-Token': token, 'Accept': 'application/json' }
        });
        if (res.ok) {
          const data = await res.json();
          const arr = Array.isArray(data) ? data : [data];
          arr.forEach(q => { const sym = q.symbol || q.ticker; if (sym) quotesMap[sym] = q.close; });
        } else {
          console.error('OpLab quote error:', res.status);
        }
      } catch (e) { console.error('OpLab fetch error:', e.message); }
    }

    // 5. Verificar alertas de PRECO
    const triggered = [];
    for (const alerta of precoAlertas) {
      const preco = quotesMap[alerta.ativo];
      if (preco == null) continue;
      const hit = alerta.condicao === 'MAIOR_IGUAL'
        ? preco >= alerta.valor_alvo
        : alerta.condicao === 'MENOR_IGUAL'
          ? preco <= alerta.valor_alvo
          : Math.abs(preco - alerta.valor_alvo) < 0.01;
      if (hit) triggered.push({ alerta, valorAtual: preco });
    }

    // 6. Verificar alertas de RESULTADO
    for (const alerta of resultadoAlertas) {
      const ops = opsByGrupo[alerta.grupo_id] || [];
      if (!ops.length) continue;
      const resultadoValor = ops.reduce((s, o) => {
        const atual = quotesMap[o.ativo];
        if (atual == null) return s;
        const rv = o.operacao === 'COMPRA'
          ? (atual - o.preco_entrada) * o.quantidade
          : (o.preco_entrada - atual) * o.quantidade;
        return s + (rv || 0);
      }, 0);
      let valorComparar;
      if (alerta.metrica === 'PERCENTUAL') {
        const valorInvestido = ops.reduce((s, o) => s + (o.preco_entrada * o.quantidade), 0);
        if (!valorInvestido) continue;
        valorComparar = (resultadoValor / valorInvestido) * 100;
      } else {
        valorComparar = resultadoValor;
      }
      const hit = alerta.condicao === 'MAIOR_IGUAL'
        ? valorComparar >= alerta.valor_alvo
        : alerta.condicao === 'MENOR_IGUAL'
          ? valorComparar <= alerta.valor_alvo
          : Math.abs(valorComparar - alerta.valor_alvo) < 0.01;
      if (hit) triggered.push({ alerta, valorAtual: valorComparar });
    }

    // 7. Notificar usuários e marcar alertas como disparados
    for (const { alerta, valorAtual } of triggered) {
      const userId = alerta.created_by_id;
      let texto;
      const condTxt = alerta.condicao === 'MAIOR_IGUAL' ? 'maior ou igual a' : alerta.condicao === 'MENOR_IGUAL' ? 'menor ou igual a' : 'exatamente';
      if (alerta.tipo === 'PRECO') {
        texto = `🔔 ${alerta.ativo}: preço ${condTxt} R$ ${alerta.valor_alvo} (atual: R$ ${valorAtual.toFixed(2)}).`;
      } else {
        const suffix = alerta.metrica === 'PERCENTUAL' ? '%' : ' R$';
        texto = `🔔 ${alerta.grupo_nome || 'Grupo'}: resultado ${condTxt} ${alerta.valor_alvo}${suffix} (atual: ${valorAtual.toFixed(2)}${suffix}).`;
      }
      // Mensagem in-app
      try {
        await base44.asServiceRole.entities.Mensagem.create({ para_id: userId, para_nome: 'Alertas', texto });
      } catch (e) { console.error('Mensagem create failed:', e.message); }
      // E-mail
      try {
        const user = await base44.asServiceRole.entities.User.get(userId);
        if (user?.email) {
          await base44.integrations.Core.SendEmail({ to: user.email, subject: 'Alerta — Monitora Trade', body: texto });
        }
      } catch (e) { console.error('Email send failed:', e.message); }
      // Atualizar status do alerta
      try {
        await base44.asServiceRole.entities.Alerta.update(alerta.id, { status: 'DISPARADO', mensagem_disparo: texto });
      } catch (e) { console.error('Alerta update failed:', e.message); }
    }

    return Response.json({ checked: alertas.length, triggered: triggered.length });
  } catch (error) {
    console.error('checarAlertas error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}