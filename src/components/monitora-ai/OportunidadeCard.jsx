import React, { useState } from 'react';
import { ChevronDown, Ban, Check, PlayCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseLegs, estimarLucratividade } from '@/lib/monitora-ai/lucratividade';

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

export default function OportunidadeCard({ op, onStatus, onExecutar, favorita }) {
  const [open, setOpen] = useState(false);
  const pernas = parseLegs(op);
  const greeks = op.greeks || {};
  const bloqueada = op.status === 'VETADA_RISCO';
  const { maxProfit, maxLoss, unlimitedLoss } = estimarLucratividade(op);

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full px-4 py-3 text-left flex items-start justify-between gap-3 hover:bg-accent/40 transition-colors"
      >
        <div className="flex items-start gap-2 min-w-0">
          <ChevronDown className={`w-4 h-4 mt-0.5 text-muted-foreground shrink-0 transition-transform ${open ? '' : '-rotate-90'}`} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-heading text-sm font-semibold">{op.ativo_base}</span>
              {favorita && (
                <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200">
                  ★ preferida
                </span>
              )}
              <span className={`text-xs px-1.5 py-0.5 rounded border ${bloqueada ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                {STATUS_LABEL[op.status] || op.status}
              </span>
            </div>
            <p className="text-sm mt-0.5 truncate">{op.estrategia_nome}</p>
          </div>
        </div>
        <div className="text-right shrink-0 space-y-1">
          <div>
            <div className="text-xs text-muted-foreground">Lucro máx. aprox.</div>
            <div className={`text-sm font-semibold tabular-nums ${Number(maxProfit) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {maxProfit === null ? '—' : brl(maxProfit)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Margem est.</div>
            <div className="text-xs font-medium tabular-nums">{brl(op.margem_estimada_brl)}</div>
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t px-4 py-3 space-y-2.5">
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="px-1.5 py-0.5 rounded border bg-muted text-muted-foreground">{op.direcao}</span>
            <span className="text-muted-foreground">{op.horizonte || '—'}</span>
            <span className="text-muted-foreground">· score {Math.round(op.score_quant || 0)}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
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
              <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded border text-xs ${RISCO_STYLE[op.nivel_risco] || RISCO_STYLE.MODERADO}`}>
                {op.nivel_risco || '—'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <span className="text-muted-foreground">Lucro máx. aprox.</span>
            <span className="tabular-nums text-right">{maxProfit === null ? '—' : brl(maxProfit)}</span>
            <span className="text-muted-foreground">Perda máx. aprox.</span>
            <span className="tabular-nums text-right">{unlimitedLoss ? 'ilimitada' : maxLoss === null ? '—' : brl(maxLoss)}</span>
            <span className="text-muted-foreground">Spot de referência</span>
            <span className="tabular-nums text-right">{brl(op.preco_referencia)}</span>
            <span className="text-muted-foreground">IV usada</span>
            <span className="tabular-nums text-right">{num(op.iv_referencia, '%')}</span>
            <span className="text-muted-foreground">Selic usada</span>
            <span className="tabular-nums text-right">{num(op.selic_referencia, '%')}</span>
            <span className="text-muted-foreground">Margem estimada</span>
            <span className="tabular-nums text-right">{brl(op.margem_estimada_brl)}</span>
          </div>

          {!!pernas.length && (
            <div className="text-xs">
              <div className="text-muted-foreground mb-1">Pernas resolvidas</div>
              <ul className="space-y-0.5">
                {pernas.map((p, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span className="truncate">
                      {p.side === 'BUY' ? 'Compra' : 'Venda'} {p.quantity} {p.type} {p.ticker || ''}
                    </span>
                    <span className="tabular-nums shrink-0">
                      {p.strike ? brl(p.strike) : brl(p.premium)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-4 gap-2 text-xs">
            {['delta', 'gamma', 'theta', 'vega'].map((k) => (
              <div key={k} className="rounded border bg-card px-1.5 py-1">
                <div className="text-xs uppercase text-muted-foreground">{k}</div>
                <div className="tabular-nums">{num(greeks[k])}</div>
              </div>
            ))}
          </div>

          {op.veto_motivos?.length > 0 && (
            <ul className="space-y-0.5 text-xs text-red-700">
              {op.veto_motivos.map((m) => <li key={m} className="flex gap-1"><Ban className="w-3 h-3 mt-0.5 shrink-0" />{m}</li>)}
            </ul>
          )}

          <p className="text-xs text-muted-foreground flex gap-1">
            <Info className="w-3 h-3 mt-0.5 shrink-0" />
            Lucro/perda máxima são estimativas no vencimento, sem custos. PoP é estimativa do modelo — não calibrada com histórico.
          </p>

          {op.status === 'EXECUTADA' && (
            <p className="text-xs text-slate-600">
              Executada — acompanhada em "Operações via Monitora AI" e em Operações.
            </p>
          )}

          {onStatus && (
            <div className="flex items-center justify-end gap-1.5 pt-1">
              {op.status === 'ATIVA' && (
                <>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onStatus(op, 'VETADA_RISCO')}><Ban className="w-3 h-3" /> Vetar</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onStatus(op, 'APROVADA')}><Check className="w-3 h-3" /> Aprovar</Button>
                </>
              )}
              {op.status === 'APROVADA' && onExecutar && (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onExecutar(op)}><PlayCircle className="w-3 h-3" /> Executar</Button>
              )}
              {op.status === 'VETADA_RISCO' && (
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onStatus(op, 'ATIVA')}>Reabrir</Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}