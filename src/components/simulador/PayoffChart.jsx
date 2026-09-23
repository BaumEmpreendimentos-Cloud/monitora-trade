import React, { useMemo } from 'react';
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import { generatePayoffCurve, findBreakEvens } from '@/utils/blackScholes';

const fmtBRL = (v) => (v >= 0 ? `+R$ ${v.toFixed(0)}` : `-R$ ${Math.abs(v).toFixed(0)}`);

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-xs space-y-1">
      <div className="font-bold">R$ {Number(label).toFixed(2)}</div>
      {data.expiryPnL !== undefined && (
        <div className={data.expiryPnL >= 0 ? 'text-emerald-600' : 'text-red-600'}>
          No Vencimento: {fmtBRL(data.expiryPnL)}
        </div>
      )}
      {data.currentPnL !== undefined && (
        <div className={data.currentPnL >= 0 ? 'text-amber-600' : 'text-red-500'}>
          Hoje (D-0): {fmtBRL(data.currentPnL)}
        </div>
      )}
      {data.halfTermPnL !== undefined && (
        <div className={data.halfTermPnL >= 0 ? 'text-blue-600' : 'text-red-400'}>
          D+15: {fmtBRL(data.halfTermPnL)}
        </div>
      )}
    </div>
  );
}

export default function PayoffChart({ legs, spotPrice, iv = 0.28, interestRate = 0.1325, ticker = '' }) {
  const curveData = useMemo(
    () => generatePayoffCurve(legs, spotPrice, iv, interestRate, 0.28, 90),
    [legs, spotPrice, iv, interestRate]
  );

  const breakEvens = useMemo(() => findBreakEvens(legs, spotPrice, 0.35), [legs, spotPrice]);

  const strikes = useMemo(() => {
    const list = legs.filter((l) => l.type !== 'STOCK').map((l) => l.strike);
    return Array.from(new Set(list)).sort((a, b) => a - b);
  }, [legs]);

  if (curveData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground border rounded-lg">
        Adicione pernas à estratégia para visualizar o payoff.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-0.5 bg-emerald-500" />
          <span className="text-muted-foreground">No Vencimento</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-0.5 border-t-2 border-dashed border-amber-500" />
          <span className="text-muted-foreground">Hoje (D-0)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-0.5 border-t-2 border-dashed border-blue-400" />
          <span className="text-muted-foreground">D+15</span>
        </div>
        {breakEvens.map((be, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500/30 border border-blue-400" />
            <span className="text-muted-foreground">B/E: R$ {be.toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={curveData} margin={{ top: 10, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />

            {/* Profit area (positive) */}
            <defs>
              <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.02} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.25} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="price"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(v) => `R$ ${v.toFixed(0)}`}
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              tickFormatter={fmtBRL}
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Zero line */}
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} />

            {/* Spot price reference */}
            <ReferenceLine
              x={spotPrice}
              stroke="#3b82f6"
              strokeWidth={1.5}
              strokeDasharray="5 5"
              label={{ value: `Spot R$ ${spotPrice.toFixed(2)}`, position: 'top', fontSize: 10, fill: '#3b82f6' }}
            />

            {/* Strike references */}
            {strikes.map((s, i) => (
              <ReferenceLine
                key={i}
                x={s}
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={1}
                strokeDasharray="2 2"
                opacity={0.4}
              />
            ))}

            {/* Break-even references */}
            {breakEvens.map((be, i) => (
              <ReferenceLine
                key={`be-${i}`}
                x={be}
                stroke="#3b82f6"
                strokeWidth={1}
                strokeDasharray="3 3"
                opacity={0.5}
                label={{ value: `B/E ${be.toFixed(2)}`, position: 'bottom', fontSize: 9, fill: '#3b82f6' }}
              />
            ))}

            {/* Expiry payoff line */}
            <Line
              type="monotone"
              dataKey="expiryPnL"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={false}
              name="No Vencimento"
            />
            {/* Current (D-0) payoff line */}
            <Line
              type="monotone"
              dataKey="currentPnL"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              name="Hoje (D-0)"
            />
            {/* Half-term payoff line */}
            <Line
              type="monotone"
              dataKey="halfTermPnL"
              stroke="#3b82f6"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              name="D+15"
              opacity={0.6}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
