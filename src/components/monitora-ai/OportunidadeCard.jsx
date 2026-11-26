import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Ban, Check, PlayCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

const brl = (v) => (Number.isFinite(Number(v)) ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—');
const num = (v, suffix = '') => (Number.isFinite(Number(v)) ? `${Number(v).toFixed(2)}${suffix}` : '—');

const RISCO_STYLE = {
  BAIXO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  MODERADO: 'bg-amber-50 text-amber-700 border-amber-200',
  ALTO: 'bg-orange-50 text-orange-700 border-orange-200',
  BLOQUEADO: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_LABEL = {
  ATIVA: 'Ativa',
  APROVADA: 'Aprovada',
  VETADA_RISCO: 'Vetada por risco',
  EXPIRADA: 'Expirada',
  EXECUTADA: 'Executada',
};

export default function OportunidadeCard({ op, onStatus }) {
  const [open, setOpen] = useState(false);
  const pernas = (() => {
    try { return JSON.parse(op.pernas_json || '[]'); } catch { return []; }
  })();
  const greeks = op.greeks || {};
  const bloqueada = op.status === 'VETADA_RISCO';

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-heading text-sm font-semibold">{op.ativo_base}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded border bg-muted text-muted-foreground">{op.direcao}</span>
              <span className="text-[10px] text-muted-foreground">{op.horizonte || '—'}</span>
            </div>
            <p className="text-sm mt-0.5 truncate">{op.estrategia_nome}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="font-heading text-lg font-bold tabular-nums leading-none">{Math.round(op.score_quant || 0)}</div>
            <div className="text-[10px] text-muted-foreground">score</div>
          </div>
        </div>

        <div className="mt-2.5 grid grid-cols-3 gap-2 text-[11px]">
          <div>
            <div className="text-muted-foreground">PoP modelo</div>
            <div className="font-medium tabular-nums">{num(op.probabilidade_lucro_pct, '%')}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Retorno/Risco</div>
            <div className="font-medium tabular-nums">{num(op.risco_retorno)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Nível de risco</div>
            <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded border text-[10px] ${RISCO_STYLE[op.nivel_risco] || RISCO_STYLE.MODERADO}`}>
              {op.nivel_risco || '—'}
            </span>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${bloqueada ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
            {STATUS_LABEL[op.status] || op.status}
          </span>
          <button onClick={() => setOpen((v) => !v)} className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            Premissas e cálculos {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t bg-muted/30 px-4 py-3 space-y-2.5 text-[11px]">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <span className="text-muted-foreground">Spot de referência</span><span className="tabular-nums text-right">{brl(op.preco_referencia)}</span>
            <span className="text-muted-foreground">Stop</span><span className="tabular-nums text-right">{brl(op.stop_referencia)}</span>
            <span className="text-muted-foreground">Alvo</span><span className="tabular-nums text-right">{brl(op.alvo_referencia)}</span>
            <span className="text-muted-foreground">IV usada</span><span className="tabular-nums text-right">{num(op.iv_referencia, '%')}</span>
            <span className="text-muted-foreground">Selic usada</span><span className="tabular-nums text-right">{num(op.selic_referencia, '%')}</span>
            <span className="text-muted-foreground">Fonte</span><span className="text-right">{op.origem_dados || '—'}</span>
          </div>

          {!!pernas.length && (
            <div>
              <div className="text-muted-foreground mb-1">Pernas resolvidas</div>
              <ul className="space-y-0.5">
                {pernas.map((p, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span className="truncate">{p.side === 'BUY' ? 'Compra' : 'Venda'} {p.quantity} {p.type} {p.ticker || ''}</span>
                    <span className="tabular-nums shrink-0">{p.strike ? brl(p.strike) : '—'}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-4 gap-2">
            {['delta', 'gamma', 'theta', 'vega'].map((k) => (
              <div key={k} className="rounded border bg-card px-1.5 py-1">
                <div className="text-[9px] uppercase text-muted-foreground">{k}</div>
                <div className="tabular-nums">{num(greeks[k])}</div>
              </div>
            ))}
          </div>

          {op.veto_motivos?.length > 0 && (
            <ul className="space-y-0.5 text-red-700">
              {op.veto_motivos.map((m) => <li key={m} className="flex gap-1"><Ban className="w-3 h-3 mt-0.5 shrink-0" />{m}</li>)}
            </ul>
          )}

          {op.justificativa_ia && (
            <div className="rounded border bg-card p-2">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Interpretação da IA</div>
              <p className="leading-relaxed">{op.justificativa_ia}</p>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground flex gap-1">
            <Info className="w-3 h-3 mt-0.5 shrink-0" />
            PoP é estimativa do modelo (lognormal) — não calibrada com histórico. Nenhuma ordem é enviada à corretora.
          </p>
        </div>
      )}

      {onStatus && (
        <div className="border-t px-4 py-2 flex items-center justify-end gap-1.5">
          {op.status === 'ATIVA' && (
            <>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onStatus(op, 'VETADA_RISCO')}><Ban className="w-3 h-3" /> Vetar</Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onStatus(op, 'APROVADA')}><Check className="w-3 h-3" /> Aprovar</Button>
            </>
          )}
          {op.status === 'APROVADA' && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onStatus(op, 'EXECUTADA')}><PlayCircle className="w-3 h-3" /> Marcar executada</Button>
          )}
          {op.status === 'VETADA_RISCO' && (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onStatus(op, 'ATIVA')}>Reabrir</Button>
          )}
        </div>
      )}
    </div>
  );
}