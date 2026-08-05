import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';

const fmt = (v) => (v === null || v === undefined || v === '' ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const fmtPct = (v) => (v === null || v === undefined || v === '' ? '—' : `${Number(v) >= 0 ? '+' : ''}${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`);
const color = (v) => (v === null || v === undefined ? '' : v >= 0 ? 'text-emerald-600' : 'text-red-600');

export default function Historico() {
  const [ops, setOps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const o = await base44.entities.Operacao.filter({ status: 'FECHADA' }, '-data_fechamento', 500);
        setOps(o || []);
      } catch (e) { setError(e.response?.data?.error || e.message); }
      finally { setLoading(false); }
    })();
  }, []);

  const grupos = {};
  ops.forEach((o) => { (grupos[o.grupo_nome] ||= []).push(o); });
  const nomes = Object.keys(grupos);

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-2xl md:text-3xl font-heading font-bold">Histórico de Operações</h1>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : nomes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">Nenhuma operação encerrada.</p>
        ) : (
          nomes.map((nome) => {
            const lista = grupos[nome];
            const total = lista.reduce((s, o) => s + (o.resultado_valor || 0), 0);
            return (
              <Card key={nome}>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
                      <tr>
                        <th className="text-left p-2">Ativo</th>
                        <th className="text-left p-2">Abertura</th>
                        <th className="text-left p-2">Cat.</th>
                        <th className="text-left p-2">Op.</th>
                        <th className="text-right p-2">Qtd</th>
                        <th className="text-right p-2">Preço Entr.</th>
                        <th className="text-right p-2">Preço Encerr.</th>
                        <th className="text-right p-2">Result. %</th>
                        <th className="text-right p-2">Result. Valor</th>
                        <th className="text-right p-2">Encerrado em</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-primary/5">
                        <td colSpan={10} className="p-2.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold">{nome}</span>
                            <span>Resultado Total: <b className={color(total)}>{fmt(total)}</b></span>
                          </div>
                        </td>
                      </tr>
                      {lista.map((o) => (
                        <tr key={o.id} className="border-t">
                          <td className="p-2 font-medium">{o.ativo}</td>
                          <td className="p-2 text-muted-foreground">{o.data_abertura ? new Date(o.data_abertura).toLocaleDateString('pt-BR') : '—'}</td>
                          <td className="p-2">{o.categoria}</td>
                          <td className="p-2">{o.operacao}</td>
                          <td className="p-2 text-right">{o.quantidade}</td>
                          <td className="p-2 text-right">{fmt(o.preco_entrada)}</td>
                          <td className="p-2 text-right">{fmt(o.preco_fechamento)}</td>
                          <td className={`p-2 text-right ${color(o.resultado_pct)}`}>{fmtPct(o.resultado_pct)}</td>
                          <td className={`p-2 text-right ${color(o.resultado_valor)}`}>{fmt(o.resultado_valor)}</td>
                          <td className="p-2 text-right text-muted-foreground">{o.data_fechamento ? new Date(o.data_fechamento).toLocaleDateString('pt-BR') : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}