import React from 'react';
import { Activity, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const brl = (v) => (Number.isFinite(Number(v)) ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—');
const pct = (v) => (Number.isFinite(Number(v)) ? `${Number(v).toFixed(2)}%` : '—');

const DESFECHO_STYLE = {
  ALVO_ATINGIDO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  STOP_ATINGIDO: 'bg-red-50 text-red-700 border-red-200',
  EXPIRADO_LUCRO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  EXPIRADO_PREJUIZO: 'bg-red-50 text-red-700 border-red-200',
  EM_ACOMPANHAMENTO: 'bg-slate-50 text-slate-600 border-slate-200',
};

const DESFECHO_LABEL = {
  ALVO_ATINGIDO: 'Alvo atingido',
  STOP_ATINGIDO: 'Stop atingido',
  EXPIRADO_LUCRO: 'Expirado com lucro',
  EXPIRADO_PREJUIZO: 'Expirado com prejuízo',
  EM_ACOMPANHAMENTO: 'Em acompanhamento',
};

export default function SinaisPanel({ sinais = [], avaliando, onAvaliar }) {
  return (
    <section className="rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-heading text-sm font-semibold">Resultado dos sinais</h2>
        </div>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onAvaliar} disabled={avaliando}>
          {avaliando && <Loader2 className="w-3 h-3 animate-spin" />} Avaliar sinais
        </Button>
      </div>

      {!sinais.length ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          Nenhum sinal avaliado. Aprove ou execute uma oportunidade e reavalie com a cotação atual.
        </p>
      ) : (
        <ul className="divide-y">
          {sinais.map((s) => (
            <li key={s.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{s.ativo_base}</div>
                <div className="text-xs text-muted-foreground">
                  entrada {brl(s.preco_entrada_ref)} → {brl(s.preco_avaliacao)}
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className={`inline-block text-xs px-1.5 py-0.5 rounded border ${DESFECHO_STYLE[s.desfecho] || DESFECHO_STYLE.EM_ACOMPANHAMENTO}`}>
                  {DESFECHO_LABEL[s.desfecho] || s.desfecho}
                </span>
                <div className={`text-xs tabular-nums mt-0.5 ${Number(s.retorno_pct) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{pct(s.retorno_pct)}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}