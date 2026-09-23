import React, { useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  ReferenceLine, Tooltip, CartesianGrid,
} from 'recharts';
import { generatePayoffCurve, findBreakEvens } from '@/lib/blackScholes';

export default function PayoffChart({ legs, spotPrice, iv = 0.28, interestRate = 0.1325, ticker = '' }) {
  const data = useMemo(
    () => generatePayoffCurve(legs, spotPrice, iv, interestRate, 0.28, 80),
    [legs, spotPrice, iv, interestRate]
  );
  const breakEvens = useMemo(() => findBreakEvens(legs, spotPrice, 0.35), [legs, spotPrice]);

  if (!legs.length || !spotPrice) {
    return (
      <p className="text-sm text-muted-foreground text-center py-10">
        Selecione um grupo com operações para visualizar o payoff.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-0.5 bg-emerald-500 rounded-full" />
          <span className="text-muted-foreground">No Vencimento</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-0 border-b-2 border-dashed border-amber-500" />
          <span className="text-muted-foreground">Hoje (D-0 Teórico)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span className="text-muted-foreground">Break-Even</span>
        </div>
        <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">
          {ticker || '—'} @ R$ {spotPrice.toFixed(2)}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={340}>
        <LineChart data={data} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
          <XAxis
            dataKey="price"
            tickFormatter={(v) => v.toFixed(2)}
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            label={{ value: 'Preço do Ativo', position: 'insideBottom', offset: -10, fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis
            tickFormatter={(v) => `${v >= 0 ? '+' : ''}${Math.round(v)}`}
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
          />
          <Tooltip
            formatter={(value, name) => {
              const label = name === 'expiryPnL' ? 'Vencimento' : 'Hoje (D-0)';
              return [`${value >= 0 ? '+' : ''}R$ ${Number(value).toFixed(2)}`, label];
            }}
            labelFormatter={(v) => `Preço: R$ ${Number(v).toFixed(2)}`}
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} />
          <ReferenceLine
            x={spotPrice}
            stroke="hsl(var(--primary))"
            strokeDasharray="5 5"
            label={{ value: 'Spot', position: 'top', fontSize: 10, fill: 'hsl(var(--primary))' }}
          />
          {breakEvens.map((be, i) => (
            <ReferenceLine
              key={i}
              x={be}
              stroke="#3b82f6"
              strokeDasharray="3 3"
              label={{ value: 'B/E', position: 'top', fontSize: 10, fill: '#3b82f6' }}
            />
          ))}
          <Line type="monotone" dataKey="expiryPnL" stroke="#10b981" strokeWidth={2} dot={false} name="Vencimento" />
          <Line type="monotone" dataKey="currentPnL" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Hoje" />
        </LineChart>
      </ResponsiveContainer>

      {breakEvens.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          {breakEvens.map((be, i) => (
            <span key={i} className="px-2 py-1 rounded bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 font-mono">
              Break-Even: R$ {be.toFixed(2)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}