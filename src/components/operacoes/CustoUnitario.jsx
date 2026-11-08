import React from 'react';
import { calcCustoUnitario } from '@/lib/operacoes';

const fmt = (v) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CustoUnitario({ operacoes, label = 'Custo/un.', className = '', valueClassName = '' }) {
  const info = calcCustoUnitario(operacoes);
  if (!info) return null;

  // Ações: custo positivo = capital pago (vermelho) / negativo = crédito líquido (verde)
  // Opções: recebeu para entrar = positivo (verde) / pagou para entrar = negativo (vermelho)
  const bom = info.tipo === 'acoes' ? info.valor <= 0 : info.valor >= 0;
  const cor = bom ? 'text-emerald-600' : 'text-red-600';
  const sinal = info.tipo === 'opcoes' && info.valor > 0 ? '+' : '';
  const detalhe = info.tipo === 'acoes'
    ? `Preço médio do ativo ${fmt(info.precoMedio)} • prêmios líquidos de opções ${info.premios >= 0 ? '+' : '-'}${fmt(Math.abs(info.premios))}`
    : `${info.premios >= 0 ? 'Crédito' : 'Débito'} líquido de ${fmt(Math.abs(info.premios))} em ${fmt(info.quantidade)} un.`;

  return (
    <span className={className} title={detalhe}>
      {label ? <span className="text-muted-foreground">{label}: </span> : null}
      <b className={`${cor} ${valueClassName}`}>{sinal}R$ {fmt(info.valor)}</b>
    </span>
  );
}