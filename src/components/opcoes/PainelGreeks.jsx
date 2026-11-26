import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export default function PainelGreeks({ greeks }) {
  if (!greeks) return null;

  const fmt = (v) => (v >= 0 ? '+' : '') + Number(v).toFixed(2);
  const items = [
    { label: 'Delta', value: greeks.delta, desc: 'Exposição direcional', color: greeks.delta > 0 ? 'text-emerald-600' : greeks.delta < 0 ? 'text-red-600' : '' },
    { label: 'Gamma', value: greeks.gamma, desc: 'Velocidade do delta' },
    { label: 'Theta (R$/dia)', value: greeks.theta, desc: 'Decaimento temporal', color: greeks.theta > 0 ? 'text-emerald-600' : 'text-red-600' },
    { label: 'Vega (R$/%IV)', value: greeks.vega, desc: 'Sensibilidade à vol' },
    { label: 'Rho (R$/%j)', value: greeks.rho, desc: 'Sensibilidade à taxa' },
    { label: 'Crédito/Débito', value: greeks.netDebitCredit, desc: 'Fluxo de caixa inicial', color: greeks.netDebitCredit >= 0 ? 'text-emerald-600' : 'text-red-600' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">{item.label}</div>
            <div className={`text-lg font-bold font-mono ${item.color || ''}`}>
              {fmt(item.value)}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}