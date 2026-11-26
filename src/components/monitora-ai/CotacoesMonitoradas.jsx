import React from 'react';

const brl = (v) => (Number.isFinite(Number(v))
  ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  : '—');

const pct = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return `${n >= 0 ? '+' : ''}${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
};

/** Faixa compacta com as cotações dos ativos monitorados (OpLab v3). */
export default function CotacoesMonitoradas({ quotes = [] }) {
  if (!quotes.length) return null;

  return (
    <section aria-label="Cotações monitoradas">
      <div className="flex items-center justify-between mb-1.5">
        <h2 className="text-xs uppercase tracking-wide text-muted-foreground">Cotações monitoradas</h2>
        <span className="text-xs text-muted-foreground">OpLab v3</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {quotes.map((q) => {
          const variacao = Number(q.variationPct);
          const conhecida = Number.isFinite(variacao);
          return (
            <div key={q.symbol} className="rounded-lg border bg-card px-3 py-2">
              <div className="text-xs font-semibold truncate">{q.symbol}</div>
              <div className="font-heading text-sm font-semibold tabular-nums mt-0.5">{brl(q.price)}</div>
              <div className={`text-xs tabular-nums ${conhecida ? (variacao >= 0 ? 'text-emerald-600' : 'text-red-600') : 'text-muted-foreground'}`}>
                {pct(q.variationPct)}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}