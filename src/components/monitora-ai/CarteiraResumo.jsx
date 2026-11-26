import React from 'react';
import { Wallet, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const brl = (v) => (Number.isFinite(Number(v)) ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—');

const RISK_STYLE = {
  BAIXO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  MODERADO: 'bg-amber-50 text-amber-700 border-amber-200',
  CRITICO: 'bg-red-50 text-red-700 border-red-200',
};

export default function CarteiraResumo({ groups = [], loading, avisos = [] }) {
  const totalPnL = groups.reduce((acc, g) => acc + (g.unrealizedPnL || 0), 0);
  const totalMargin = groups.reduce((acc, g) => acc + (g.estimatedMarginBrl || 0), 0);

  return (
    <section className="rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-heading text-sm font-semibold">Carteira aberta</h2>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">dados observados + cálculos</span>
        </div>
        <div className="text-right">
          <div className={`font-heading text-sm font-semibold tabular-nums ${totalPnL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{brl(totalPnL)}</div>
          <div className="text-[10px] text-muted-foreground">não realizado</div>
        </div>
      </div>

      {loading ? (
        <div className="p-4 space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-11 rounded-md" />)}</div>
      ) : !groups.length ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">Nenhum grupo aberto encontrado. As posições abertas em Operações aparecem aqui.</p>
      ) : (
        <ul className="divide-y">
          {groups.map((g) => (
            <li key={g.groupId} className="px-4 py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{g.grupoNome}</div>
                <div className="text-[11px] text-muted-foreground">
                  {g.ativoBase} · spot {g.spotPrice ? brl(g.spotPrice) : 'indisponível'} · {g.legsCount} perna(s)
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className={`text-sm font-medium tabular-nums ${g.unrealizedPnL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{brl(g.unrealizedPnL)}</div>
                <div className="text-[10px] text-muted-foreground tabular-nums">margem est. {brl(g.estimatedMarginBrl)}</div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="px-4 py-2.5 border-t space-y-1">
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          Margem estimada por metodologia simplificada — não é a margem oficial da B3/corretora. Total: {brl(totalMargin)}
        </p>
        {groups.some((g) => g.hasUncoveredCall) && (
          <p className="text-[11px] text-red-600 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" /> Há call vendida descoberta em carteira.
          </p>
        )}
        {avisos.map((a) => (
          <p key={a} className="text-[11px] text-muted-foreground">• {a}</p>
        ))}
      </div>
    </section>
  );
}