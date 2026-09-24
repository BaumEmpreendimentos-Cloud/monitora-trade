import React from 'react';
import { Globe2 } from 'lucide-react';

export default function RadarTransmissaoMacro({ perspectiva }) {
  const items = perspectiva.radar_macro || [];
  if (!items.length) return null;

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2.5 pb-3 border-b">
        <div className="p-2 rounded-xl bg-primary/10 text-primary">
          <Globe2 className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide">Radar de Transmissão Macroeconômica: Exterior → B3</h3>
          <p className="text-xs text-muted-foreground">Como os fluxos globais impactam a abertura e volatilidade da B3</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item, i) => {
          const statusStyle = item.status === 'BULLISH_FOR_B3'
            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
            : item.status === 'BEARISH_FOR_B3'
              ? 'bg-red-500/10 text-red-600 border-red-500/30'
              : 'bg-muted text-muted-foreground border-border';
          const statusLabel = item.status === 'BULLISH_FOR_B3' ? 'Vento a Favor' : item.status === 'BEARISH_FOR_B3' ? 'Pressão Baixista' : 'Neutro';
          return (
            <div key={i} className="bg-muted/40 border rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-bold text-xs">{item.indicador}</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold shrink-0 ${statusStyle}`}>{statusLabel}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-muted-foreground">Impacta:</span>
                <span className="font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">{item.impacta}</span>
                {item.correlacao && <span className="text-[11px] text-muted-foreground">• Corr: {item.correlacao}</span>}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.descricao}</p>
              {item.valor && (
                <div className="pt-1.5 border-t flex items-center justify-between text-[11px] font-mono">
                  <span className={item.variacao?.startsWith('-') ? 'text-red-600' : 'text-emerald-600'}>{item.variacao}</span>
                  <span className="font-semibold">{item.valor}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}