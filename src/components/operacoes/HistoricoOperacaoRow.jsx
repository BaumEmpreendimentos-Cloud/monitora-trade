import React from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, RotateCcw } from 'lucide-react';

const fmt = (v) => v == null || v === '' ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const color = (v) => v == null ? '' : v >= 0 ? 'text-emerald-600' : 'text-red-600';

export default function HistoricoOperacaoRow({ operacao: o, onEdit, onDelete, onReabrir }) {
  return (
    <tr className="border-t">
      <td className="p-2 font-medium">{o.ativo}</td>
      <td className="p-2 text-muted-foreground">{o.data_abertura ? new Date(o.data_abertura).toLocaleDateString('pt-BR') : '—'}</td>
      <td className="p-2">{o.categoria}</td>
      <td className="p-2">{o.operacao}</td>
      <td className="p-2 text-right">{o.quantidade}</td>
      <td className="p-2 text-right">{fmt(o.preco_entrada)}</td>
      <td className="p-2 text-right">{fmt(o.preco_fechamento)}</td>
      <td className={`p-2 text-right ${color(o.resultado_pct)}`}>{o.resultado_pct == null ? '—' : `${o.resultado_pct >= 0 ? '+' : ''}${fmt(o.resultado_pct)}%`}</td>
      <td className={`p-2 text-right ${color(o.resultado_valor)}`}>{fmt(o.resultado_valor)}</td>
      <td className="p-2 text-right text-muted-foreground">{o.data_fechamento ? new Date(o.data_fechamento).toLocaleDateString('pt-BR') : '—'}</td>
      <td className="p-2"><div className="flex gap-1">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(o)} title="Editar operação"><Pencil className="w-3.5 h-3.5" /></Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-amber-600" onClick={() => onReabrir(o)} title="Reabrir operação (encerrada por engano)"><RotateCcw className="w-3.5 h-3.5" /></Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDelete(o)} title="Excluir operação"><Trash2 className="w-3.5 h-3.5" /></Button>
      </div></td>
    </tr>
  );
}