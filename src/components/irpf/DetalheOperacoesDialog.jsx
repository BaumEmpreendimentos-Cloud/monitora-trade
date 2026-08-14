import React from 'react';
import ResponsiveDialog from '@/components/ResponsiveDialog';
import { mesLabel } from '@/lib/imposto';

const fmt = (v) => (v === null || v === undefined || v === '' ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const color = (v) => (v === null || v === undefined || v === 0 ? '' : v > 0 ? 'text-emerald-600' : 'text-red-600');

const CAT_LABELS = { ACAO: 'Ação', CALL: 'Call', PUT: 'Put', FII: 'FII', DOLLAR: 'Futuro' };

export default function DetalheOperacoesDialog({ apuracao, open, onClose }) {
  if (!apuracao) return null;
  const ops = apuracao.operacoes || [];

  const totalResultado = ops.reduce((s, o) => s + (Number(o.resultado_valor) || 0), 0);
  const totalIRRF = ops.reduce((s, o) => s + (Number(o.irrf) || 0), 0);

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={`Operações — ${mesLabel(apuracao.mes)} (${apuracao.tipo})`}
      className="max-w-5xl"
    >
      <div className="overflow-auto max-h-[70vh]">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground uppercase">
              <th className="text-left p-2 whitespace-nowrap">Ativo</th>
              <th className="text-left p-2 whitespace-nowrap">Categoria</th>
              <th className="text-left p-2 whitespace-nowrap">Operação</th>
              <th className="text-right p-2 whitespace-nowrap">Qtd</th>
              <th className="text-left p-2 whitespace-nowrap">Fechamento</th>
              <th className="text-right p-2 whitespace-nowrap">Preço Entrada</th>
              <th className="text-right p-2 whitespace-nowrap">Preço Fechamento</th>
              <th className="text-right p-2 whitespace-nowrap">Resultado</th>
              <th className="text-right p-2 whitespace-nowrap">IRRF</th>
            </tr>
          </thead>
          <tbody>
            {ops.map((op, i) => (
              <tr key={op.id || i} className="border-t hover:bg-accent/30">
                <td className="p-2 font-medium whitespace-nowrap">{op.ativo}</td>
                <td className="p-2 whitespace-nowrap">{CAT_LABELS[op.categoria] || op.categoria}</td>
                <td className="p-2 whitespace-nowrap">{op.operacao}</td>
                <td className="p-2 text-right">{op.quantidade}</td>
                <td className="p-2 whitespace-nowrap">{op.data_fechamento ? new Date(op.data_fechamento).toLocaleDateString('pt-BR') : '—'}</td>
                <td className="p-2 text-right">{fmt(op.preco_entrada)}</td>
                <td className="p-2 text-right">{fmt(op.preco_fechamento)}</td>
                <td className={`p-2 text-right font-medium ${color(op.resultado_valor)}`}>{fmt(op.resultado_valor)}</td>
                <td className="p-2 text-right">{fmt(op.irrf)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 font-medium">
              <td colSpan={6} className="p-2 text-right">Totais</td>
              <td className={`p-2 text-right ${color(totalResultado)}`}>{fmt(totalResultado)}</td>
              <td className="p-2 text-right">{fmt(totalIRRF)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </ResponsiveDialog>
  );
}