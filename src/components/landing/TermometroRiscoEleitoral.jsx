import React from 'react';
import { Landmark, Scale } from 'lucide-react';

export default function TermometroRiscoEleitoral({ perspectiva }) {
  const nivel = perspectiva.risco_eleitoral_nivel || 'Moderado';
  const nivelColor = /alto/i.test(nivel) ? 'text-red-600 bg-red-500/10 border-red-500/30' : /baixo/i.test(nivel) ? 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30' : 'text-amber-600 bg-amber-500/10 border-amber-500/30';

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b">
        <div className="flex items-center gap-2">
          <Landmark className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wide">Termômetro de Risco Eleitoral & Fiscal Brasil</h3>
        </div>
        <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border ${nivelColor}`}>
          RISCO: {nivel.toUpperCase()}
        </span>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">{perspectiva.risco_eleitoral_resumo}</p>

      {perspectiva.premio_di_hedge && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-xs">
          <Scale className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
          <span className="text-amber-900 dark:text-amber-300 leading-relaxed"><strong>Prêmio DI / Hedge:</strong> {perspectiva.premio_di_hedge}</span>
        </div>
      )}
    </div>
  );
}