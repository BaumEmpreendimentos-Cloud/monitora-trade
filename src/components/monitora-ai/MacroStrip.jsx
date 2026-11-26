import React from 'react';
import { Landmark, Percent, DollarSign, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const pct = (v) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? '—' : `${Number(v).toFixed(2)}%`);
const brl = (v) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? '—' : `R$ ${Number(v).toFixed(4)}`);

function Indicator({ icon: Icon, label, value, source, date, fallback }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <div className="mt-1 font-heading text-base font-semibold tabular-nums">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1">
        {fallback ? (
          <>
            <AlertTriangle className="w-3 h-3 text-amber-600" /> premissa padrão
          </>
        ) : (
          <span>{source}{date ? ` · ${date}` : ''}</span>
        )}
      </div>
    </div>
  );
}

export default function MacroStrip({ macro, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[74px] rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <Indicator
        icon={Landmark}
        label="Selic meta"
        value={pct(macro?.selicPct)}
        source={macro?.selicMeta?.source}
        date={macro?.selicMeta?.date}
        fallback={macro?.selicMeta?.date === 'fallback'}
      />
      <Indicator icon={Percent} label="CDI anual" value={pct(macro?.cdi?.value)} source={macro?.cdi?.source} date={macro?.cdi?.date} />
      <Indicator icon={DollarSign} label="PTAX venda" value={brl(macro?.ptax?.value)} source={macro?.ptax?.source} date={macro?.ptax?.date} />
      <Indicator icon={Percent} label="IPCA 12m" value={pct(macro?.ipca12m?.value)} source={macro?.ipca12m?.source} date={macro?.ipca12m?.date} />
    </div>
  );
}