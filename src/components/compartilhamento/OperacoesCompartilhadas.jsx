import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import CustoUnitario from '@/components/operacoes/CustoUnitario';
import OperacaoDetalhesDialog from '@/components/compartilhamento/OperacaoDetalhesDialog';

const fmt = (v) => (v === null || v === undefined || v === '' ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const data = (v) => (v ? new Date(String(v).length === 10 ? `${v}T00:00:00` : v).toLocaleDateString('pt-BR') : '—');
const corResultado = (v) => (v === null || v === undefined ? '' : v >= 0 ? 'text-emerald-600' : 'text-red-600');

export default function OperacoesCompartilhadas({ operacoes, mostrarCusto }) {
  const [selecionada, setSelecionada] = useState(null);

  const grupos = useMemo(() => {
    const mapa = new Map();
    operacoes.forEach((o) => {
      const chave = o.grupo_id || o.grupo_nome || 'sem-identificador';
      if (!mapa.has(chave)) mapa.set(chave, { id: chave, nome: o.grupo_nome || 'Sem identificador', ops: [] });
      mapa.get(chave).ops.push(o);
    });
    return [...mapa.values()];
  }, [operacoes]);

  return (
    <div className="space-y-4">
      {grupos.map((g) => (
        <Card key={g.id}>
          <CardContent className="p-0">
            <div className="flex items-center justify-between gap-3 px-3 py-2 bg-primary/5">
              <span className="font-bold text-sm truncate">{g.nome}</span>
              {mostrarCusto && <CustoUnitario operacoes={g.ops} />}
            </div>

            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <th className="text-left p-2">Ativo</th>
                    <th className="text-left p-2">Cat. / Op.</th>
                    <th className="text-right p-2">Qtd</th>
                    <th className="text-right p-2">Preço</th>
                    <th className="text-left p-2">Abertura</th>
                    <th className="text-right p-2">Resultado</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {g.ops.map((o) => (
                    <tr key={o.id} className="border-t">
                      <td className="p-2 font-medium">{o.ativo}</td>
                      <td className="p-2 text-muted-foreground">{o.categoria} · {o.operacao}</td>
                      <td className="p-2 text-right">{o.quantidade}</td>
                      <td className="p-2 text-right">{fmt(o.preco_entrada)}</td>
                      <td className="p-2 text-muted-foreground">{data(o.data_abertura)}</td>
                      <td className={`p-2 text-right ${corResultado(o.resultado_valor)}`}>{o.resultado_valor == null ? '—' : fmt(o.resultado_valor)}</td>
                      <td className="p-2 text-right">
                        <Button size="sm" variant="ghost" onClick={() => setSelecionada(o)}>
                          <Eye className="w-4 h-4 mr-1" /> Detalhes
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-border">
              {g.ops.map((o) => (
                <div key={o.id} className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{o.ativo}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-muted">{o.categoria} · {o.operacao}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    <div><span className="text-muted-foreground">Qtd:</span> {o.quantidade}</div>
                    <div><span className="text-muted-foreground">Preço:</span> {fmt(o.preco_entrada)}</div>
                    <div><span className="text-muted-foreground">Abertura:</span> {data(o.data_abertura)}</div>
                    <div><span className="text-muted-foreground">Result.:</span> <span className={corResultado(o.resultado_valor)}>{fmt(o.resultado_valor)}</span></div>
                  </div>
                  <Button size="sm" variant="outline" className="w-full min-h-[44px]" onClick={() => setSelecionada(o)}>
                    <Eye className="w-4 h-4 mr-1" /> Ver detalhes
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <OperacaoDetalhesDialog operacao={selecionada} onClose={() => setSelecionada(null)} />
    </div>
  );
}