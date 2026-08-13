import React from 'react';
import { Button } from '@/components/ui/button';
import { Coins, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

const fmt = (v) => (v === null || v === undefined || v === '' ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const fmtPct = (v) => (v === null || v === undefined || v === '' ? '—' : `${Number(v) >= 0 ? '+' : ''}${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`);
const color = (v) => (v === null || v === undefined ? '' : v >= 0 ? 'text-emerald-600' : 'text-red-600');

export default function HistoricoGrupoMobile({ nome, lista, divs, total, onEdit, onDelete, collapsed, onToggle }) {
  return (
    <div className="md:hidden p-3 space-y-3">
      <div className="flex items-center justify-between cursor-pointer" onClick={onToggle}>
        <div className="flex items-center gap-1.5">
          {collapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          <span className="font-bold">{nome}</span>
        </div>
        <span className="text-sm">Total: <b className={color(total)}>{fmt(total)}</b></span>
      </div>
      {!collapsed && lista.map((o) => (
        <div key={o.id} className="border rounded-lg p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-medium">{o.ativo}</span>
            <div className="flex gap-1 text-xs">
              <span className="px-2 py-0.5 rounded bg-muted">{o.categoria}</span>
              <span className="px-2 py-0.5 rounded bg-muted">{o.operacao}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-muted-foreground">Qtd:</span> {o.quantidade}</div>
            <div><span className="text-muted-foreground">Entrada:</span> {fmt(o.preco_entrada)}</div>
            <div><span className="text-muted-foreground">Encerr.:</span> {fmt(o.preco_fechamento)}</div>
            <div><span className="text-muted-foreground">Result.:</span> <span className={color(o.resultado_valor)}>{fmt(o.resultado_valor)} ({fmtPct(o.resultado_pct)})</span></div>
            <div><span className="text-muted-foreground">Abertura:</span> {o.data_abertura ? new Date(o.data_abertura).toLocaleDateString('pt-BR') : '—'}</div>
            <div><span className="text-muted-foreground">Fechamento:</span> {o.data_fechamento ? new Date(o.data_fechamento).toLocaleDateString('pt-BR') : '—'}</div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="min-h-[44px] flex-1" onClick={() => onEdit(o)}><Pencil className="w-3.5 h-3.5 mr-1" />Editar</Button>
            <Button size="sm" variant="ghost" className="min-h-[44px] text-destructive" onClick={() => onDelete(o)}><Trash2 className="w-3.5 h-3.5 mr-1" />Excluir</Button>
          </div>
        </div>
      ))}
      {!collapsed && divs.map((d) => (
        <div key={`div-${d.id}`} className="border rounded-lg p-3 space-y-1 bg-amber-50/50">
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
        </div>
      ))}
    </div>
  );
}