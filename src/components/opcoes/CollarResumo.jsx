import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import PayoffChart from '@/components/opcoes/PayoffChart';
import { businessDaysUntil } from '@/lib/operacoes';
import { analisarCollar, metaAtingida, legsDoCollar } from '@/lib/collar';

const brl = (v) => (Number.isFinite(Number(v))
  ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  : '—');

const pct = (v) => (Number.isFinite(Number(v)) ? `${Number(v).toFixed(2)}%` : '—');

const dataBr = (iso) => (iso ? iso.split('-').reverse().join('/') : '—');

export default function CollarResumo({ ativoBase, spot, estrutura, quantidade, meta }) {
  if (!estrutura?.call || !estrutura?.put || !spot) return null;

  const legs = legsDoCollar({ ativoBase, spot, call: estrutura.call, put: estrutura.put, quantidade });
  const analise = analisarCollar({
    spot,
    callStrike: estrutura.call.strike,
    callPremium: estrutura.call.premium,
    putStrike: estrutura.put.strike,
    putPremium: estrutura.put.premium,
    quantidade,
  });
  const ok = metaAtingida(analise, meta);
  const chartLegs = legs.map((l) => ({
    ...l,
    daysToExpiry: l.type === 'STOCK' ? 999 : (businessDaysUntil(l.dueDate) ?? 30),
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <div className="rounded-lg border bg-card px-3 py-2">
          <div className="text-xs text-muted-foreground">Desembolso inicial</div>
          <div className="text-sm font-semibold tabular-nums">{brl(analise.desembolso)}</div>
        </div>
        <div className="rounded-lg border bg-card px-3 py-2">
          <div className="text-xs text-muted-foreground">Queda até {brl(estrutura.put.strike)}</div>
          <div className={`text-sm font-semibold tabular-nums ${analise.resultadoQueda >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {analise.resultadoQueda >= 0 ? '+' : ''}{brl(analise.resultadoQueda)}
          </div>
        </div>
        <div className="rounded-lg border bg-card px-3 py-2">
          <div className="text-xs text-muted-foreground">Alta a partir de {brl(estrutura.call.strike)}</div>
          <div className={`text-sm font-semibold tabular-nums ${analise.resultadoAlta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {analise.resultadoAlta >= 0 ? '+' : ''}{brl(analise.resultadoAlta)}
          </div>
        </div>
        <div className="rounded-lg border bg-card px-3 py-2">
          <div className="text-xs text-muted-foreground">Lucro mín. na queda</div>
          <div className="text-sm font-semibold tabular-nums">{pct(analise.lucroMinimoPct)}</div>
        </div>
      </div>

      <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${ok ? 'border-emerald-200 bg-emerald-50/60 text-emerald-800' : 'border-amber-200 bg-amber-50/60 text-amber-800'}`}>
        {ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <XCircle className="w-4 h-4 mt-0.5 shrink-0" />}
        <span>
          {ok
            ? `Meta atingida: mesmo com o ativo caindo até ${brl(estrutura.put.strike)}, o resultado estimado é ${brl(analise.resultadoQueda)}.`
            : `Meta não atingida: no pior cenário (ativo em ${brl(estrutura.put.strike)}) o resultado estimado é ${brl(analise.resultadoQueda)}.`}
          {' '}Estimativa no vencimento, sem custos operacionais.
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/50 text-muted-foreground uppercase border-b">
            <tr>
              <th className="px-3 py-2">Perna</th>
              <th className="px-3 py-2">Código</th>
              <th className="px-3 py-2 text-right">Strike</th>
              <th className="px-3 py-2 text-right">Prêmio</th>
              <th className="px-3 py-2 text-right">Qtd</th>
              <th className="px-3 py-2 text-right">Vencimento</th>
            </tr>
          </thead>
          <tbody className="divide-y font-mono">
            {legs.map((l) => (
              <tr key={l.id}>
                <td className="px-3 py-2">
                  {l.type === 'STOCK' ? 'Ação' : `${l.type} ${l.side === 'BUY' ? 'compra' : 'venda'}`}
                </td>
                <td className="px-3 py-2 font-bold">{l.ticker || '—'}</td>
                <td className="px-3 py-2 text-right">{l.type === 'STOCK' ? '—' : brl(l.strike)}</td>
                <td className="px-3 py-2 text-right">{brl(l.premium)}</td>
                <td className="px-3 py-2 text-right">{l.quantity}</td>
                <td className="px-3 py-2 text-right">{l.dueDate === 'À Vista' ? 'À vista' : dataBr(l.dueDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border bg-card p-3">
        <PayoffChart legs={chartLegs} spotPrice={spot} ticker={ativoBase} />
      </div>
    </div>
  );
}