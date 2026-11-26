import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Layers, ArrowUpRight } from 'lucide-react';
import CollapsibleCard from './CollapsibleCard';
import { analyzeOpenGroups } from '@/lib/monitora-ai/portfolioEngine';

const brl = (v) => (Number.isFinite(Number(v)) ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—');
const cor = (v) => (Number(v) >= 0 ? 'text-emerald-600' : 'text-red-600');

export default function OperacoesMonitora({ operacoes = [], quotesMap = {}, selicDecimal }) {
  const { abertos, fechados } = useMemo(() => {
    const lista = operacoes || [];
    const abertas = lista.filter((o) => o.status === 'ABERTA');
    const grupos = analyzeOpenGroups(abertas, quotesMap, { selicDecimal });

    const porGrupo = {};
    lista.filter((o) => o.status === 'FECHADA').forEach((o) => {
      const key = o.grupo_id || o.id;
      if (!porGrupo[key]) {
        porGrupo[key] = { grupoId: key, grupoNome: o.grupo_nome || o.ativo_base || o.ativo, ativoBase: o.ativo_base || o.ativo, realizado: 0, legsCount: 0 };
      }
      porGrupo[key].realizado += Number(o.resultado_valor) || 0;
      porGrupo[key].legsCount += 1;
    });

    return {
      abertos: grupos.sort((a, b) => b.unrealizedPnL - a.unrealizedPnL),
      fechados: Object.values(porGrupo),
    };
  }, [operacoes, quotesMap, selicDecimal]);

  const totalAberto = abertos.reduce((acc, g) => acc + g.unrealizedPnL, 0);
  const totalFechado = fechados.reduce((acc, g) => acc + g.realizado, 0);
  const vazio = !abertos.length && !fechados.length;

  return (
    <CollapsibleCard
      id="operacoes-monitora"
      icon={Layers}
      title="Operações via Monitora AI"
      subtitle="lucratividade"
      footer={
        <p className="px-4 py-2 border-t text-xs text-muted-foreground">
          P&L aberto usa a cotação atual do ativo base. Para encerrar, abra a operação em Operações — o resultado realizado aparece aqui.
        </p>
      }
    >
      {vazio ? (
        <p className="px-4 py-3 text-sm text-muted-foreground">
          Nenhuma operação aberta pelo Monitora AI. Ao clicar em Executar numa oportunidade aprovada, a estrutura é gravada em Operações e acompanhada aqui.
        </p>
      ) : (
        <div className="divide-y">
          {abertos.map((g) => (
            <div key={g.groupId} className="px-4 py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{g.grupoNome}</div>
                <div className="text-xs text-muted-foreground">
                  {g.ativoBase} · {g.legsCount} perna(s) · {g.spotSource === 'cotacao' ? 'cotação atual' : 'preço de entrada'}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className={`text-sm font-semibold tabular-nums ${cor(g.unrealizedPnL)}`}>{brl(g.unrealizedPnL)}</div>
                <Link to="/operacoes" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5">
                  Encerrar <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}

          {fechados.map((g) => (
            <div key={g.grupoId} className="px-4 py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{g.grupoNome}</div>
                <div className="text-xs text-muted-foreground">
                  {g.ativoBase} · encerrada · {g.legsCount} perna(s)
                </div>
              </div>
              <div className={`text-sm font-semibold tabular-nums shrink-0 ${cor(g.realizado)}`}>{brl(g.realizado)}</div>
            </div>
          ))}
        </div>
      )}

      {!vazio && (
        <div className="px-4 py-2 border-t flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Aberto {brl(totalAberto)} · Encerrado {brl(totalFechado)}</span>
          <span className={`font-semibold tabular-nums ${cor(totalAberto + totalFechado)}`}>{brl(totalAberto + totalFechado)}</span>
        </div>
      )}
    </CollapsibleCard>
  );
}