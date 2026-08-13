import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, Coins, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import ResponsiveDialog from '@/components/ResponsiveDialog';
import EditarHistoricoDialog from '@/components/operacoes/EditarHistoricoDialog';
import HistoricoGrupoMobile from '@/components/operacoes/HistoricoGrupoMobile';

const fmt = (v) => (v === null || v === undefined || v === '' ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const fmtPct = (v) => (v === null || v === undefined || v === '' ? '—' : `${Number(v) >= 0 ? '+' : ''}${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`);
const color = (v) => (v === null || v === undefined ? '' : v >= 0 ? 'text-emerald-600' : 'text-red-600');

export default function Historico() {
  const navigate = useNavigate();
  const [ops, setOps] = useState([]);
  const [dividendos, setDividendos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editarOp, setEditarOp] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState({});

  const loadData = async () => {
    setLoading(true); setError('');
    try {
      const [o, d] = await Promise.all([
        base44.entities.Operacao.filter({ status: 'FECHADA' }, '-data_fechamento', 500),
        base44.entities.Dividendo.list('-created_date', 500),
      ]);
      setOps(o || []);
      setDividendos(d || []);
    } catch (e) { setError(e.response?.data?.error || e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleEditar = async (id, dados) => {
    setSaving(true); setError('');
    try {
      const updated = await base44.entities.Operacao.update(id, dados);
      setOps((p) => p.map((o) => (o.id === id ? { ...updated, grupo_nome: o.grupo_nome } : o)));
      setEditarOp(null);
    } catch (e) { setError(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    const o = toDelete;
    if (!o) return;
    setSaving(true); setError('');
    try {
      await base44.entities.Operacao.delete(o.id);
      setOps((p) => p.filter((x) => x.id !== o.id));
      setToDelete(null);
    } catch (e) { setError(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const divPorGrupo = {};
  dividendos.filter((d) => d.data_pagamento <= todayStr).forEach((d) => { (divPorGrupo[d.grupo_nome] ||= []).push(d); });

  const grupos = {};
  ops.forEach((o) => { (grupos[o.grupo_nome] ||= []).push(o); });
  const groupMaxDate = (nome) => {
    const opsDates = (grupos[nome] || []).map((o) => o.data_fechamento ? new Date(o.data_fechamento).getTime() : 0);
    const divDates = (divPorGrupo[nome] || []).map((d) => d.data_pagamento ? new Date(d.data_pagamento).getTime() : 0);
    return Math.max(0, ...opsDates, ...divDates);
  };
  const nomes = [...new Set([...Object.keys(grupos), ...Object.keys(divPorGrupo)])].sort((a, b) => groupMaxDate(b) - groupMaxDate(a));

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Histórico de Operações</h1>
          <Button size="sm" onClick={() => navigate('/importar-historico')}><Upload className="w-4 h-4 mr-1" /> Importar Histórico</Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : nomes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">Nenhuma operação encerrada.</p>
        ) : (
          nomes.map((nome) => {
            const lista = (grupos[nome] || []).slice().sort((a, b) => {
              const da = a.data_fechamento ? new Date(a.data_fechamento).getTime() : 0;
              const db = b.data_fechamento ? new Date(b.data_fechamento).getTime() : 0;
              return db - da;
            });
            const divs = divPorGrupo[nome] || [];
            const totalOps = lista.reduce((s, o) => s + (o.resultado_valor || 0), 0);
            const totalDiv = divs.reduce((s, d) => s + (d.valor_total || 0), 0);
            const total = totalOps + totalDiv;
            return (
              <Card key={nome}>
                <CardContent className="p-0">
                  <div className="overflow-x-auto hidden md:block">
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
                        <th className="p-2">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-primary/5 cursor-pointer hover:bg-primary/10" onClick={() => setCollapsed((p) => ({ ...p, [nome]: !p[nome] }))}>
                        <td colSpan={11} className="p-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              {collapsed[nome] ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                              <span className="font-bold">{nome}</span>
                            </div>
                            <span>Resultado Total: <b className={color(total)}>{fmt(total)}</b></span>
                          </div>
                        </td>
                      </tr>
                      {!collapsed[nome] && lista.map((o) => (
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
                          <td className="p-2">
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditarOp(o)} title="Editar operação"><Pencil className="w-3.5 h-3.5" /></Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setToDelete(o)} title="Excluir operação"><Trash2 className="w-3.5 h-3.5" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!collapsed[nome] && divs.map((d) => (
                        <tr key={`div-${d.id}`} className="border-t bg-amber-50/50">
                          <td className="p-2 font-medium"><span className="inline-flex items-center gap-1"><Coins className="w-3.5 h-3.5 text-amber-500" />{d.ativo}</span></td>
                          <td className="p-2 text-muted-foreground">—</td>
                          <td className="p-2 text-xs text-amber-600 font-medium">DIV</td>
                          <td className="p-2">—</td>
                          <td className="p-2 text-right">{d.quantidade}</td>
                          <td className="p-2 text-right">{fmt(d.valor_por_acao)}</td>
                          <td className="p-2 text-right">—</td>
                          <td className="p-2 text-right">—</td>
                          <td className="p-2 text-right text-emerald-600 font-medium">{fmt(d.valor_total)}</td>
                          <td className="p-2 text-right text-muted-foreground">{d.data_pagamento ? new Date(d.data_pagamento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                  <HistoricoGrupoMobile nome={nome} lista={lista} divs={divs} total={total} onEdit={setEditarOp} onDelete={setToDelete} collapsed={!!collapsed[nome]} onToggle={() => setCollapsed((p) => ({ ...p, [nome]: !p[nome] }))} />
                </CardContent>
              </Card>
            );
          })
        )}
        <EditarHistoricoDialog operacao={editarOp} onClose={() => setEditarOp(null)} onSubmit={handleEditar} />
        <ResponsiveDialog
          open={!!toDelete}
          onOpenChange={(v) => !v && setToDelete(null)}
          title="Excluir operação"
          className="max-w-sm"
          footer={<><Button variant="outline" onClick={() => setToDelete(null)} disabled={saving}>Cancelar</Button><Button variant="destructive" onClick={handleDelete} disabled={saving}>{saving ? 'Excluindo...' : 'Excluir'}</Button></>}
        >
          <p className="text-sm text-muted-foreground">Deseja realmente excluir a operação <b>{toDelete?.ativo}</b>? Essa ação não pode ser desfeita.</p>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </ResponsiveDialog>
      </div>
    </div>
  );
}