import React from 'react';
import { Coins } from 'lucide-react';

const fmt = (v) => v == null || v === '' ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function HistoricoDividendoRow({ dividendo: d }) {
  return (
    <tr className="border-t bg-amber-50/50">
      <td className="p-2 font-medium"><span className="inline-flex items-center gap-1"><Coins className="w-3.5 h-3.5 text-amber-500" />{d.ativo}</span></td>
      <td className="p-2 text-muted-foreground">—</td>
      <td className="p-2 text-xs text-amber-600 font-medium">DIV</td>
      <td className="p-2">—</td>
      <td className="p-2 text-right">{d.quantidade}</td>
      <td className="p-2 text-right">{fmt(d.valor_por_acao)}</td>
      <td className="p-2 text-right">—</td>
      <td className="p-2 text-right">—</td>
      <td className="p-2 text-right text-emerald-600 font-medium">{fmt(d.valor_total)}</td>
      <td className="p-2 text-right text-muted-foreground">{d.data_pagamento ? new Date(d.data_pagamento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
      <td className="p-2" />
    </tr>
  );
}