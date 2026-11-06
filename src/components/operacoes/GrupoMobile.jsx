import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Coins, Pencil, Trash2, Bell, BellRing } from 'lucide-react';
import { calcResultadoValor, calcResultadoPct, calcExtrinseco, businessDaysUntil, moneynessRowClass } from '@/lib/operacoes';

const fmt = (v) => (v === null || v === undefined || v === '' ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const fmtPct = (v) => (v === null || v === undefined || v === '' ? '—' : `${Number(v) >= 0 ? '+' : ''}${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`);
const color = (v) => (v === null || v === undefined ? '' : v >= 0 ? 'text-emerald-600' : 'text-red-600');
const isOption = (c) => c === 'CALL' || c === 'PUT';

export default function GrupoMobile({ grupo, openOps, pendingDivs, quotes, expanded, onToggleExpand, selectedOp, onSelectOp, onSelectGroup, onEditGrupo, onEditOp, onEncerrar, onAddDividendo, onDeleteDividendo, onAlertaGrupo, onAlertaOp, alertas = [], summary }) {
  const { hist, dia, divPago, aberto, divPendente } = summary;
  const ativosBase = [...new Set(openOps.map((o) => o.ativo_base || o.ativo))];
  const hasAlertaGrupo = alertas.some(a => a.grupo_id === grupo.id);
  const hasAlertaOp = (oid) => alertas.some(a => a.operacao_id === oid);

  return (
    <div className="md:hidden p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <button onClick={onToggleExpand} className="flex items-center gap-2 min-h-[44px] flex-1">
          {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          <span className="font-bold text-sm">{grupo.nome}</span>
        </button>
        <div className="flex gap-1">
          <Button size="sm" variant="secondary" className="min-h-[44px] bg-gradient-to-r from-red-500 via-yellow-400 to-emerald-500 text-white border-0 hover:opacity-90" onClick={() => onSelectGroup(grupo.id)}>Mapa</Button>
          <Button size="sm" variant="outline" className="min-h-[44px]" onClick={() => onAddDividendo(grupo)} disabled={!ativosBase.length}><Coins className="w-3.5 h-3.5" /></Button>
          <Button size="sm" variant="outline" className={`min-h-[44px] ${hasAlertaGrupo ? 'text-amber-600 border-amber-400' : ''}`} onClick={() => onAlertaGrupo(grupo)}>{hasAlertaGrupo ? <BellRing className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}</Button>
          <Button size="icon" variant="ghost" className="h-11 w-11" onClick={() => onEditGrupo(grupo)}><Pencil className="w-3.5 h-3.5" /></Button>
        </div>
      </div>
      <div className="space-y-1 text-sm">
        <div>Op. Encerradas: <b className={color(hist + divPago)}>{fmt(hist + divPago)}</b></div>
        <div>Total: <b className={color(hist + divPago + aberto + divPendente)}>{fmt(hist + divPago + aberto + divPendente)}</b></div>
        <div>Dia: <b className={color(dia)}>{fmt(dia)}</b></div>
      </div>
      {expanded && (
        <div className="space-y-2">
          {openOps.map((o) => {
            const atual = quotes[o.ativo];
            const rv = calcResultadoValor(o.operacao, o.quantidade, o.preco_entrada, atual);
            const rp = calcResultadoPct(o.operacao, o.preco_entrada, atual);
            const diasVenc = businessDaysUntil(o.vencimento);
            const isSel = selectedOp?.id === o.id;
            const mnyClass = moneynessRowClass(o.categoria, o.strike, quotes[o.ativo_base]);
            return (
              <div key={o.id} className={`border rounded-lg p-3 space-y-2 cursor-pointer ${isSel ? 'border-primary bg-primary/5' : ''} ${mnyClass}`} onClick={() => onSelectOp(isSel ? null : o)}>
                <div className="flex justify-between items-center">
                  <span className="font-medium">{o.ativo}</span>
                  <div className="flex gap-1 text-xs">
                    <span className="px-2 py-0.5 rounded bg-muted">{o.categoria}</span>
                    <span className="px-2 py-0.5 rounded bg-muted">{o.operacao}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Qtd:</span> {o.quantidade}</div>
                  <div><span className="text-muted-foreground">Preço:</span> {fmt(o.preco_entrada)}</div>
                  <div><span className="text-muted-foreground">Cotação:</span> {fmt(atual)}</div>
                  <div><span className="text-muted-foreground">Result.:</span> <span className={color(rv)}>{fmt(rv)} ({fmtPct(rp)})</span></div>
                  {isOption(o.categoria) && (
                    <>
                      <div><span className="text-muted-foreground">Strike:</span> {fmt(o.strike)}</div>
                      <div><span className="text-muted-foreground">Venc.:</span> {diasVenc != null ? `${diasVenc} d.u.` : '—'}</div>
                    </>
                  )}
                </div>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" variant="outline" className={`min-h-[44px] flex-1 ${hasAlertaOp(o.id) ? 'text-amber-600 border-amber-400' : ''}`} onClick={() => onAlertaOp(o)}>{hasAlertaOp(o.id) ? <BellRing className="w-3.5 h-3.5 mr-1" /> : <Bell className="w-3.5 h-3.5 mr-1" />}Alerta</Button>
                  <Button size="sm" variant="outline" className="min-h-[44px] flex-1" onClick={() => onEditOp(o)}><Pencil className="w-3.5 h-3.5 mr-1" />Editar</Button>
                  <Button size="sm" variant="outline" className="min-h-[44px] flex-1" onClick={() => onEncerrar(o)}>Encerrar</Button>
                </div>
              </div>
            );
          })}
          {pendingDivs.map((d) => (
            <div key={`div-${d.id}`} className="border rounded-lg p-3 space-y-2 bg-amber-50/50">
              <div className="flex justify-between items-center">
                <span className="font-medium inline-flex items-center gap-1"><Coins className="w-3.5 h-3.5 text-amber-500" />{d.ativo}</span>
                <span className="text-xs text-amber-600 font-medium">DIV</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Qtd:</span> {d.quantidade}</div>
                <div><span className="text-muted-foreground">Valor/Ação:</span> {fmt(d.valor_por_acao)}</div>
                <div><span className="text-muted-foreground">Total:</span> <span className="text-emerald-600 font-medium">{fmt(d.valor_total)}</span></div>
                <div><span className="text-muted-foreground">Pagto:</span> {d.data_pagamento ? new Date(d.data_pagamento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</div>
              </div>
              <Button size="sm" variant="ghost" className="min-h-[44px] text-destructive" onClick={() => onDeleteDividendo(d.id)}><Trash2 className="w-3.5 h-3.5 mr-1" />Excluir</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}