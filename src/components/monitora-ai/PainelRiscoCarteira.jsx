import React from 'react';
import { ShieldCheck, AlertTriangle, Layers, Wallet } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { computePortfolioRisk } from '@/lib/monitora-ai/riskIndicators';

const brl = (v) => (Number.isFinite(Number(v)) ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—');

const RISK_STYLE = {
  BAIXO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  MODERADO: 'bg-amber-50 text-amber-700 border-amber-200',
  CRITICO: 'bg-red-50 text-red-700 border-red-200',
};

function Indicador({ rotulo, valor, detalhe, destaque }) {
  return (
    <div className="rounded-lg border bg-muted/40 px-3 py-2">
      <div className="text-xs text-foreground/70">{rotulo}</div>
      <div className={`font-heading text-sm font-semibold tabular-nums mt-0.5 ${destaque || 'text-foreground'}`}>{valor}</div>
      {detalhe && <div className="text-xs text-foreground/70 mt-0.5">{detalhe}</div>}
    </div>
  );
}

export default function PainelRiscoCarteira({ groups = [], loading }) {
  const risco = computePortfolioRisk(groups);

  return (
    <section className="rounded-xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b">
        <div className="flex flex-wrap items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-heading text-sm font-semibold">Risco da carteira</h2>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">cálculo determinístico</span>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${RISK_STYLE[risco.nivelConsolidado] || RISK_STYLE.BAIXO}`}>
          {risco.nivelConsolidado}
        </span>
      </div>

      {loading ? (
        <div className="p-4 grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : !groups.length ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          Sem grupos abertos para avaliar. Os indicadores aparecem quando houver posições em Operações.
        </p>
      ) : (
        <div className="px-4 py-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Indicador rotulo="Margem estimada" valor={brl(risco.totalMargin)} detalhe="metodologia simplificada" />
            <Indicador
              rotulo="P&L não realizado"
              valor={brl(risco.totalPnL)}
              detalhe="com a cotação atual"
              destaque={risco.totalPnL >= 0 ? 'text-emerald-600' : 'text-red-600'}
            />
            <Indicador rotulo="Grupos abertos" valor={risco.gruposAbertos} detalhe={`${risco.ativosDistintos} ativo(s) distinto(s)`} />
            <Indicador
              rotulo="Calls descobertas"
              valor={risco.uncoveredCalls}
              detalhe={risco.uncoveredCalls ? 'risco teórico ilimitado' : 'nenhuma'}
              destaque={risco.uncoveredCalls ? 'text-red-600' : 'text-emerald-600'}
            />
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-xs text-foreground/70 mb-1.5">
              <Layers className="w-3.5 h-3.5" /> Concentração por ativo (margem estimada)
            </div>
            <ul className="space-y-1.5">
              {risco.concentracao.map((a) => (
                <li key={a.ativo} className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-medium w-16 sm:w-20 shrink-0 truncate">{a.ativo}</span>
                  <div className="flex-1 min-w-0 h-1.5 rounded bg-muted overflow-hidden">
                    <div className="h-full bg-primary/70" style={{ width: `${Math.min(a.sharePct ?? 0, 100)}%` }} />
                  </div>
                  <span className="text-xs tabular-nums text-foreground/70 w-24 sm:w-28 text-right shrink-0">
                    {a.sharePct === null ? '—' : `${a.sharePct}%`} · {a.grupos} gr.
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {risco.alertas.length > 0 && (
            <ul className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 space-y-1">
              {risco.alertas.map((a) => (
                <li key={a} className="text-xs text-amber-800 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {a}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="px-4 py-2 border-t text-xs text-foreground/70 flex items-start gap-1.5">
        <Wallet className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        Limites avaliados: {risco.limites.maxGroupsPerUnderlying} grupos por ativo. A plataforma não guarda saldo de conta, então limites por capital não são calculados.
      </p>
    </section>
  );
}