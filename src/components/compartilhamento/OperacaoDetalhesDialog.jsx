import React from 'react';
import ResponsiveDialog from '@/components/ResponsiveDialog';
import { Button } from '@/components/ui/button';

const fmt = (v) => (v === null || v === undefined || v === '' ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const data = (v) => (v ? new Date(String(v).length === 10 ? `${v}T00:00:00` : v).toLocaleDateString('pt-BR') : '—');
const dataHora = (v) => (v ? new Date(v).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

export default function OperacaoDetalhesDialog({ operacao, onClose }) {
  if (!operacao) return null;
  const corResultado = operacao.resultado_valor == null ? '' : operacao.resultado_valor >= 0 ? 'text-emerald-600' : 'text-red-600';
  const linhas = [
    { label: 'Identificador', valor: operacao.grupo_nome || '—' },
    { label: 'Ativo', valor: operacao.ativo || '—' },
    { label: 'Ativo base', valor: operacao.ativo_base || '—' },
    { label: 'Categoria', valor: operacao.categoria || '—' },
    { label: 'Operação', valor: operacao.operacao || '—' },
    { label: 'Quantidade', valor: operacao.quantidade ?? '—' },
    { label: 'Preço de entrada', valor: `R$ ${fmt(operacao.preco_entrada)}` },
    { label: 'Valor inicial', valor: operacao.valor_inicial == null ? '—' : `R$ ${fmt(operacao.valor_inicial)}` },
    { label: 'Abertura', valor: data(operacao.data_abertura) },
    { label: 'Strike', valor: operacao.strike == null ? '—' : fmt(operacao.strike) },
    { label: 'Vencimento', valor: operacao.vencimento ? data(operacao.vencimento) : '—' },
    { label: 'Status', valor: operacao.status || '—' },
    { label: 'Preço de fechamento', valor: operacao.preco_fechamento == null ? '—' : `R$ ${fmt(operacao.preco_fechamento)}` },
    { label: 'Resultado', valor: operacao.resultado_valor == null ? '—' : `R$ ${fmt(operacao.resultado_valor)}`, cls: corResultado },
    { label: 'Resultado %', valor: operacao.resultado_pct == null ? '—' : `${fmt(operacao.resultado_pct)}%`, cls: corResultado },
    { label: 'Fechamento', valor: dataHora(operacao.data_fechamento) },
    { label: 'IRRF', valor: operacao.irrf == null ? '—' : `R$ ${fmt(operacao.irrf)}` },
    { label: 'Simulada', valor: operacao.simulada ? 'Sim' : 'Não' },
  ];

  return (
    <ResponsiveDialog
      open={!!operacao}
      onOpenChange={(v) => !v && onClose()}
      title={`Detalhes — ${operacao.ativo || 'operação'}`}
      footer={<Button variant="outline" onClick={onClose}>Fechar</Button>}
    >
      <div className="grid grid-cols-2 gap-3">
        {linhas.map((l) => (
          <div key={l.label}>
            <p className="text-xs text-muted-foreground">{l.label}</p>
            <p className={`text-sm font-medium break-words ${l.cls || ''}`}>{l.valor}</p>
          </div>
        ))}
      </div>
    </ResponsiveDialog>
  );
}