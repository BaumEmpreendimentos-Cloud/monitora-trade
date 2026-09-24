import React from 'react';
import { Sparkles, AlertTriangle, ListChecks } from 'lucide-react';

export default function PainelPerspectivasIA({ perspectiva }) {
  const biasColor = perspectiva.bias === 'BULLISH' ? 'text-emerald-600' : perspectiva.bias === 'BEARISH' ? 'text-red-600' : 'text-amber-600';

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wide">Perspectivas Diárias da IA & Guia Operacional B3</h3>
        </div>
        {perspectiva.bias && (
          <span className={`text-xs font-mono font-bold ${biasColor}`}>
            {perspectiva.bias} {perspectiva.bias_confidence ? `(${perspectiva.bias_confidence}% confiança)` : ''}
          </span>
        )}
      </div>

      {perspectiva.mood_label && (
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold font-mono">{perspectiva.estado_animico ?? '—'}<span className="text-xs text-muted-foreground font-normal">/100</span></div>
          <span className="text-xs font-semibold text-muted-foreground">{perspectiva.mood_label}</span>
        </div>
      )}

      <p className="text-sm text-muted-foreground leading-relaxed">{perspectiva.resumo_ia}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {perspectiva.catalisadores?.length > 0 && (
          <div className="bg-muted/50 rounded-xl p-3">
            <span className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5 mb-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Catalisadores</span>
            <ul className="space-y-1 text-xs text-foreground list-disc list-inside">
              {perspectiva.catalisadores.map((c, i) => <li key={i} className="leading-snug">{c}</li>)}
            </ul>
          </div>
        )}
        {perspectiva.recomendacoes?.length > 0 && (
          <div className="bg-muted/50 rounded-xl p-3">
            <span className="text-xs font-bold uppercase text-primary flex items-center gap-1.5 mb-1.5"><ListChecks className="w-3.5 h-3.5" /> Diretrizes Operacionais</span>
            <ul className="space-y-1 text-xs text-foreground list-disc list-inside">
              {perspectiva.recomendacoes.map((r, i) => <li key={i} className="leading-snug">{r}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}