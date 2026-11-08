import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Coins } from 'lucide-react';
import CustoUnitario from '@/components/operacoes/CustoUnitario';
import { calcResultadoValor, calcResultadoPct, calcExtrinseco, businessDaysUntil, moneynessRowClass } from '@/lib/operacoes';

const fmt = (v) => (v === null || v === undefined || v === '' ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const fmtPct = (v) => (v === null || v === undefined || v === '' ? '—' : `${Number(v) >= 0 ? '+' : ''}${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`);
const cor = (v) => (v === null || v === undefined ? '' : v >= 0 ? 'text-emerald-600' : 'text-red-600');
const data = (v) => (v ? new Date(String(v).length === 10 ? `${v}T00:00:00` : v).toLocaleDateString('pt-BR') : '—');
const isOption = (c) => c === 'CALL' || c === 'PUT';

const variavelDia = (operacao, quotes, prevQuotes) => {
  const atual = quotes[operacao.ativo];
  const anterior = prevQuotes[operacao.ativo];
  if (atual == null || anterior == null) return 0;
  const direcao = operacao.operacao === 'VENDA' ? -1 : 1;
  return (atual - anterior) * operacao.quantidade * direcao;
};

export default function GrupoCompartilhado({ grupo, status, quotes, prevQuotes, onEditar, onEncerrar }) {
  const abertas = status === 'ABERTA';
  const resultadoAberto = abertas
    ? grupo.ops.reduce((s, o) => s + (calcResultadoValor(o.operacao, o.quantidade, o.preco_entrada, quotes[o.ativo]) || 0), 0)
    : 0;
  const resultadoDia = abertas ? grupo.ops.reduce((s, o) => s + variavelDia(o, quotes, prevQuotes), 0) : 0;
  const encerradas = grupo.encerradas_total + grupo.dividendos_pagos_total;
  const valorTotal = encerradas + (abertas ? resultadoAberto + grupo.dividendos_pendentes_total : 0);

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 px-3 py-2.5 bg-primary/5">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className="font-bold text-sm truncate" title={grupo.nome}>{grupo.nome}</span>
            {abertas && <CustoUnitario operacoes={grupo.ops} />}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span>Op. Encerradas: <b className={cor(encerradas)}>{fmt(encerradas)}</b></span>
            <span>Valor Total: <b className={cor(valorTotal)}>{fmt(valorTotal)}</b></span>
            {abertas && <span>Resultado do Dia: <b className={cor(resultadoDia)}>{fmt(resultadoDia)}</b></span>}
          </div>
        </div>

        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-xs text-muted-foreground uppercase">
                <th className="text-left p-2">Ativo</th>
                <th className="text-left p-2">Abertura</th>
                <th className="text-left p-2">Cat.</th>
                <th className="text-left p-2">Op.</th>
                <th className="text-right p-2">Qtd</th>
                <th className="text-right p-2">Preço Entr.</th>
                {abertas ? (
                  <>
                    <th className="text-right p-2">Strike</th>
                    <th className="text-right p-2">Venc. (d.u.)</th>
                    <th className="text-right p-2">Valor Inicial</th>
                    <th className="text-right p-2">Cotação</th>
                    <th className="text-right p-2">Extrínseco</th>
                  </>
                ) : (
                  <>
                    <th className="text-right p-2">Preço Encerr.</th>
                    <th className="text-right p-2">Encerrado em</th>
                  </>
                )}
                <th className="text-right p-2">Result. %</th>
                <th className="text-right p-2">Result. Valor</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {grupo.ops.map((o) => {
                const atual = quotes[o.ativo];
                const rv = abertas ? calcResultadoValor(o.operacao, o.quantidade, o.preco_entrada, atual) : o.resultado_valor;
                const rp = abertas ? calcResultadoPct(o.operacao, o.preco_entrada, atual) : o.resultado_pct;
                const extr = abertas && isOption(o.categoria) ? calcExtrinseco(o.categoria, o.strike, atual, quotes[o.ativo_base]) : null;
                const dias = abertas ? businessDaysUntil(o.vencimento) : null;
                return (
                  <tr key={o.id} className={`border-t ${abertas ? moneynessRowClass(o.categoria, o.strike, quotes[o.ativo_base]) : ''}`}>
                    <td className="p-2 font-medium">
                      {o.ativo}
                      {o.simulada && <span className="ml-1 px-1 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400">SIM</span>}
                    </td>
                    <td className="p-2 text-muted-foreground">{data(o.data_abertura)}</td>
                    <td className="p-2">{o.categoria}</td>
                    <td className="p-2">{o.operacao}</td>
                    <td className="p-2 text-right">{o.quantidade}</td>
                    <td className="p-2 text-right">{fmt(o.preco_entrada)}</td>
                    {abertas ? (
                      <>
                        <td className="p-2 text-right">{isOption(o.categoria) ? fmt(o.strike) : '—'}</td>
                        <td className="p-2 text-right">{isOption(o.categoria) ? (dias != null ? dias : '—') : '—'}</td>
                        <td className="p-2 text-right">{fmt(o.valor_inicial)}</td>
                        <td className="p-2 text-right">{fmt(atual)}</td>
                        <td className={`p-2 text-right ${cor(extr)}`}>{isOption(o.categoria) ? fmt(extr) : '—'}</td>
                      </>
                    ) : (
                      <>
                        <td className="p-2 text-right">{fmt(o.preco_fechamento)}</td>
                        <td className="p-2 text-right text-muted-foreground">{data(o.data_fechamento)}</td>
                      </>
                    )}
                    <td className={`p-2 text-right ${cor(rp)}`}>{fmtPct(rp)}</td>
                    <td className={`p-2 text-right ${cor(rv)}`}>{fmt(rv)}</td>
                    <td className="p-2">
                      {abertas && (
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEditar(o)} title="Editar operação"><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button size="sm" variant="outline" onClick={() => onEncerrar(o)}>Encerrar</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {grupo.dividendos.map((d) => (
                <tr key={`div-${d.id}`} className="border-t bg-amber-50/50">
                  <td className="p-2 font-medium"><span className="inline-flex items-center gap-1"><Coins className="w-3.5 h-3.5 text-amber-500" />{d.ativo}</span></td>
                  <td className="p-2 text-muted-foreground">{data(d.data_pagamento)}</td>
                  <td className="p-2 text-xs text-amber-600 font-medium">DIV</td>
                  <td className="p-2"></td>
                  <td className="p-2 text-right">{d.quantidade}</td>
                  <td className="p-2 text-right">{fmt(d.valor_por_acao)}</td>
                  {abertas ? (
                    <>
                      <td className="p-2"></td>
                      <td className="p-2"></td>
                      <td className="p-2"></td>
                      <td className="p-2"></td>
                      <td className="p-2"></td>
                    </>
                  ) : (
                    <>
                      <td className="p-2"></td>
                      <td className="p-2"></td>
                    </>
                  )}
                  <td className="p-2 text-right text-xs text-amber-600">{abertas ? 'Pendente' : 'Pago'}</td>
                  <td className="p-2 text-right text-emerald-600 font-medium">{fmt(d.valor_total)}</td>
                  <td className="p-2"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-border">
          {grupo.ops.map((o) => {
            const atual = quotes[o.ativo];
            const rv = abertas ? calcResultadoValor(o.operacao, o.quantidade, o.preco_entrada, atual) : o.resultado_valor;
            const rp = abertas ? calcResultadoPct(o.operacao, o.preco_entrada, atual) : o.resultado_pct;
            return (
              <div key={o.id} className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{o.ativo}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-muted">{o.categoria} · {o.operacao}</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-sm">
                  <div><span className="text-muted-foreground">Qtd:</span> {o.quantidade}</div>
                  <div><span className="text-muted-foreground">Entrada:</span> {fmt(o.preco_entrada)}</div>
                  {abertas ? (
                    <>
                      <div><span className="text-muted-foreground">Cotação:</span> {fmt(atual)}</div>
                      <div><span className="text-muted-foreground">Valor Inicial:</span> {fmt(o.valor_inicial)}</div>
                    </>
                  ) : (
                    <>
                      <div><span className="text-muted-foreground">Encerr.:</span> {fmt(o.preco_fechamento)}</div>
                      <div><span className="text-muted-foreground">Data:</span> {data(o.data_fechamento)}</div>
                    </>
                  )}
                  <div><span className="text-muted-foreground">Result.:</span> <span className={cor(rv)}>{fmt(rv)} ({fmtPct(rp)})</span></div>
                  <div><span className="text-muted-foreground">Abertura:</span> {data(o.data_abertura)}</div>
                </div>
                {abertas && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="min-h-[44px] flex-1" onClick={() => onEditar(o)}><Pencil className="w-3.5 h-3.5 mr-1" /> Editar</Button>
                    <Button size="sm" variant="destructive" className="min-h-[44px] flex-1" onClick={() => onEncerrar(o)}>Encerrar</Button>
                  </div>
                )}
              </div>
            );
          })}
          {grupo.dividendos.map((d) => (
            <div key={`div-${d.id}`} className="p-3 space-y-1 bg-amber-50/50">
              <div className="flex items-center justify-between">
                <span className="font-medium inline-flex items-center gap-1"><Coins className="w-3.5 h-3.5 text-amber-500" />{d.ativo}</span>
                <span className="text-xs text-amber-600 font-medium">{abertas ? 'PENDENTE' : 'PAGO'}</span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-sm">
                <div><span className="text-muted-foreground">Qtd:</span> {d.quantidade}</div>
                <div><span className="text-muted-foreground">Valor/Ação:</span> {fmt(d.valor_por_acao)}</div>
                <div><span className="text-muted-foreground">Total:</span> <span className="text-emerald-600 font-medium">{fmt(d.valor_total)}</span></div>
                <div><span className="text-muted-foreground">Pagto:</span> {data(d.data_pagamento)}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}