import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileDown, CheckCircle2, Undo2 } from 'lucide-react';
import { mesLabel } from '@/lib/imposto';
import DetalheOperacoesDialog from '@/components/irpf/DetalheOperacoesDialog';

const fmt = (v) => (v === null || v === undefined || v === '' ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const color = (v) => (v === null || v === undefined || v === 0 ? '' : v > 0 ? 'text-emerald-600' : 'text-red-600');

const CAT_LABELS = { ACOES: 'Ações', OPCOES: 'Opções', FII: 'FII', FUTUROS: 'Futuros' };

export default function PainelApuracao({ titulo, aliquota, itens, darfMap, onGerarDarf, onMarcarPago }) {
  const [detalheApuracao, setDetalheApuracao] = useState(null);
  const ordenado = [...itens].sort((a, b) => b.mes.localeCompare(a.mes));
  const totalResultado = itens.reduce((s, a) => s + (a.resultadoBruto || 0), 0);
  const totalAPagar = itens.reduce((s, a) => s + (a.impostoAPagar || 0), 0);

  // Determina quais categorias têm dados para exibir as colunas
  const catsAtivas = Object.keys(CAT_LABELS).filter((cat) =>
    itens.some((a) => a.breakdown?.[cat] !== undefined)
  );

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <h3 className="font-heading font-bold text-sm">{titulo}</h3>
          <div className="flex gap-4 text-xs">
            <span className="text-muted-foreground">Alíquota: <b>{(aliquota * 100).toFixed(0)}%</b></span>
            <span className="text-muted-foreground">Resultado: <b className={color(totalResultado)}>{fmt(totalResultado)}</b></span>
            <span className="text-muted-foreground">IR a Pagar: <b className="text-red-600">{fmt(totalAPagar)}</b></span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground uppercase">
                <th className="text-left p-2 whitespace-nowrap">Mês</th>
                <th className="text-right p-2 whitespace-nowrap">Prejuízo a Comp.</th>
                {catsAtivas.map((cat) => (
                  <th key={cat} className="text-right p-2 whitespace-nowrap">{CAT_LABELS[cat]}</th>
                ))}
                <th className="text-right p-2 whitespace-nowrap">Total</th>
                <th className="text-right p-2 whitespace-nowrap">Saldo Final</th>
                <th className="text-right p-2 whitespace-nowrap">IRPF</th>
                <th className="text-center p-2 whitespace-nowrap">DARF</th>
              </tr>
            </thead>
            <tbody>
              {ordenado.map((a, i) => {
                const darf = darfMap[`${a.mes}-${a.tipoKey}`];
                const podeGerar = a.impostoAPagar > 0 && !darf;
                return (
                  <tr key={i} className="border-t hover:bg-accent/30">
                    <td className="p-2 font-medium whitespace-nowrap cursor-pointer text-blue-600 hover:underline" onClick={() => setDetalheApuracao(a)}>{mesLabel(a.mes)}</td>
                    <td className="p-2 text-right text-red-600">{a.prejuizoAnterior > 0 ? fmt(-a.prejuizoAnterior) : '—'}</td>
                    {catsAtivas.map((cat) => (
                      <td key={cat} className={`p-2 text-right ${color(a.breakdown?.[cat])}`}>
                        {a.breakdown?.[cat] !== undefined ? fmt(a.breakdown[cat]) : '—'}
                      </td>
                    ))}
                    <td className={`p-2 text-right font-medium ${color(a.resultadoBruto)}`}>{fmt(a.resultadoBruto)}</td>
                    <td className={`p-2 text-right font-medium ${color(a.saldoFinal)}`}>{fmt(a.saldoFinal)}</td>
                    <td className={`p-2 text-right font-medium ${a.impostoAPagar > 0 ? 'text-red-600' : ''}`}>{fmt(a.impostoAPagar)}</td>
                    <td className="p-2 text-center">
                      {darf?.pago ? (
                        <div className="flex items-center justify-center gap-1">
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium"><CheckCircle2 className="w-3.5 h-3.5" /> Pago</span>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onMarcarPago(a)} title="Desfazer"><Undo2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      ) : darf ? (
                        <div className="flex items-center justify-center gap-1">
                          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => onGerarDarf(a)} title="Reimprimir DARF"><FileDown className="w-3 h-3" /></Button>
                          <Button size="sm" variant="secondary" className="h-6 text-xs" onClick={() => onMarcarPago(a)} title="Marcar como pago">Pago</Button>
                        </div>
                      ) : podeGerar ? (
                        <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => onGerarDarf(a)}>Gerar</Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
      <DetalheOperacoesDialog apuracao={detalheApuracao} open={!!detalheApuracao} onClose={() => setDetalheApuracao(null)} />
    </Card>
  );
}