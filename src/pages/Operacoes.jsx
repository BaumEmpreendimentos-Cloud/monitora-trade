import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, Plus, Pencil } from 'lucide-react';
import OperacaoForm from '@/components/operacoes/OperacaoForm';
import EncerrarDialog from '@/components/operacoes/EncerrarDialog';
import EditarOperacaoDialog from '@/components/operacoes/EditarOperacaoDialog';
import EditarIdentificadorDialog from '@/components/operacoes/EditarIdentificadorDialog';
import MapaCalor from '@/components/operacoes/MapaCalor';
import { calcValorInicial, calcResultadoValor, calcResultadoPct, calcExtrinseco, businessDaysUntil } from '@/lib/operacoes';

const fmt = (v) => (v === null || v === undefined || v === '' ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const fmtPct = (v) => (v === null || v === undefined || v === '' ? '—' : `${Number(v) >= 0 ? '+' : ''}${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`);
const color = (v) => (v === null || v === undefined ? '' : v >= 0 ? 'text-emerald-600' : 'text-red-600');
const isOption = (c) => c === 'CALL' || c === 'PUT';

export default function Operacoes() {
  const [grupos, setGrupos] = useState([]);
  const [ops, setOps] = useState([]);
  const [quotes, setQuotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [encerrar, setEncerrar] = useState(null);
  const [editarOp, setEditarOp] = useState(null);
  const [editarGrupo, setEditarGrupo] = useState(null);
  const [selectedOp, setSelectedOp] = useState(null);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [g, o] = await Promise.all([
        base44.entities.GrupoOperacao.list(),
        base44.entities.Operacao.list('-created_date', 500),
      ]);
      setGrupos(g || []); setOps(o || []);
    } catch (e) { setError(e.response?.data?.error || e.message); }
    finally { setLoading(false); }
  }, []);

  const fetchQuotes = useCallback(async () => {
    const open = ops.filter((x) => x.status === 'ABERTA');
    if (!open.length) { setQuotes({}); return; }
    const tickers = [...new Set([
      ...open.map((x) => x.ativo),
      ...open.filter((x) => isOption(x.categoria)).map((x) => x.ativo_base).filter(Boolean),
    ])];
    setLoadingQuotes(true);
    try {
      const res = await base44.functions.invoke('oplabMarket', { action: 'quote', tickers: tickers.join(',') });
      const arr = res.data.quotes || [];
      const map = {};
      arr.forEach((q) => { map[q.symbol || q.ticker] = q.close; });
      setQuotes(map);
      setLastUpdate(new Date());
    } catch (e) { setError(e.response?.data?.error || e.message); }
    finally { setLoadingQuotes(false); }
  }, [ops]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { if (ops.length) fetchQuotes(); }, [ops, fetchQuotes]);
  useEffect(() => {
    const id = setInterval(() => {
      if (ops.some((x) => x.status === 'ABERTA')) fetchQuotes();
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchQuotes]);

  const openOps = ops.filter((o) => o.status === 'ABERTA');
  const closedOps = ops.filter((o) => o.status === 'FECHADA');
  const groupsWithOpen = grupos.filter((g) => openOps.some((o) => o.grupo_id === g.id));
  const groupHistorico = (id) => closedOps.filter((o) => o.grupo_id === id).reduce((s, o) => s + (o.resultado_valor || 0), 0);
  const groupDia = (id) => openOps.filter((o) => o.grupo_id === id).reduce((s, o) => {
    const r = calcResultadoValor(o.operacao, o.quantidade, o.preco_entrada, quotes[o.ativo]);
    return s + (r || 0);
  }, 0);

  const handleCreate = async ({ identificador, ativo, ativo_base, categoria, operacao, quantidade, precoEntrada, dataAbertura, strike, vencimento }) => {
    setError('');
    try {
      let grupo = grupos.find((g) => g.nome.toLowerCase() === identificador.toLowerCase());
      if (!grupo) {
        grupo = await base44.entities.GrupoOperacao.create({ nome: identificador });
        setGrupos((p) => [...p, grupo]);
      }
      const valorInicial = calcValorInicial(operacao, quantidade, precoEntrada);
      const nova = await base44.entities.Operacao.create({
        grupo_id: grupo.id, grupo_nome: grupo.nome, ativo, ativo_base, categoria, operacao,
        quantidade, preco_entrada: precoEntrada, valor_inicial: valorInicial,
        data_abertura: dataAbertura, strike, vencimento, status: 'ABERTA',
      });
      setOps((p) => [...p, nova]);
      setFormOpen(false);
    } catch (e) { setError(e.response?.data?.error || e.message); }
  };

  const handleEncerrar = async (preco) => {
    const o = encerrar;
    if (!o) return;
    try {
      const updated = await base44.entities.Operacao.update(o.id, {
        status: 'FECHADA',
        preco_fechamento: preco,
        resultado_valor: calcResultadoValor(o.operacao, o.quantidade, o.preco_entrada, preco),
        resultado_pct: calcResultadoPct(o.operacao, o.preco_entrada, preco),
        data_fechamento: new Date().toISOString(),
      });
      setOps((p) => p.map((x) => (x.id === o.id ? updated : x)));
      setEncerrar(null);
    } catch (e) { setError(e.response?.data?.error || e.message); }
  };

  const handleEditarOperacao = async (dados) => {
    const o = editarOp;
    if (!o) return;
    setError('');
    try {
      const valorInicial = calcValorInicial(dados.operacao, dados.quantidade, dados.precoEntrada);
      const updated = await base44.entities.Operacao.update(o.id, {
        ativo: dados.ativo, ativo_base: dados.ativo_base, categoria: dados.categoria, operacao: dados.operacao,
        quantidade: dados.quantidade, preco_entrada: dados.precoEntrada,
        valor_inicial: valorInicial, data_abertura: dados.dataAbertura,
        strike: dados.strike, vencimento: dados.vencimento,
      });
      setOps((p) => p.map((x) => (x.id === o.id ? updated : x)));
      setEditarOp(null);
    } catch (e) { setError(e.response?.data?.error || e.message); }
  };

  const handleEditarIdentificador = async (novoNome) => {
    const g = editarGrupo;
    if (!g) return;
    setError('');
    try {
      await base44.entities.GrupoOperacao.update(g.id, { nome: novoNome });
      setGrupos((p) => p.map((x) => (x.id === g.id ? { ...x, nome: novoNome } : x)));
      await base44.entities.Operacao.updateMany({ grupo_id: g.id }, { $set: { grupo_nome: novoNome } });
      setOps((p) => p.map((x) => (x.grupo_id === g.id ? { ...x, grupo_nome: novoNome } : x)));
      setEditarGrupo(null);
    } catch (e) { setError(e.response?.data?.error || e.message); }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold">Operações</h1>
            <p className="text-sm text-muted-foreground">Acompanhamento de operações abertas</p>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdate && <span className="text-xs text-muted-foreground">Atualizado: {lastUpdate.toLocaleTimeString('pt-BR')}</span>}
            <Button variant="outline" size="sm" onClick={fetchQuotes} disabled={loadingQuotes || !openOps.length}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loadingQuotes ? 'animate-spin' : ''}`} /> Atualizar
            </Button>
            <Button size="sm" onClick={() => setFormOpen(true)}><Plus className="w-4 h-4 mr-1" /> Nova Operação</Button>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : groupsWithOpen.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">Nenhuma operação aberta. Clique em "Nova Operação".</p>
        ) : (
          <div className="space-y-4">
            {groupsWithOpen.map((g) => {
              const gOpen = openOps.filter((o) => o.grupo_id === g.id);
              const hist = groupHistorico(g.id);
              const dia = groupDia(g.id);
              const selectedInGroup = selectedOp && gOpen.some((o) => o.id === selectedOp.id);
              return (
                <Card key={g.id}>
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
                          <th className="text-right p-2">Strike</th>
                          <th className="text-right p-2">Venc. (d.u.)</th>
                          <th className="text-right p-2">Valor Inicial</th>
                          <th className="text-right p-2">Cotação</th>
                          <th className="text-right p-2">Extrínseco</th>
                          <th className="text-right p-2">Result. %</th>
                          <th className="text-right p-2">Result. Valor</th>
                          <th className="p-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-primary/5">
                          <td colSpan={14} className="p-2.5">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-bold">{g.nome}</span>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditarGrupo(g)} title="Editar identificador"><Pencil className="w-3.5 h-3.5" /></Button>
                              </div>
                              <div className="flex gap-6 text-sm">
                                <span>Resultado Histórico: <b className={color(hist)}>{fmt(hist)}</b></span>
                                <span>Resultado do Dia: <b className={color(dia)}>{fmt(dia)}</b></span>
                              </div>
                            </div>
                          </td>
                        </tr>
                        {gOpen.map((o) => {
                          const atual = quotes[o.ativo];
                          const rv = calcResultadoValor(o.operacao, o.quantidade, o.preco_entrada, atual);
                          const rp = calcResultadoPct(o.operacao, o.preco_entrada, atual);
                          const extr = isOption(o.categoria) ? calcExtrinseco(o.categoria, o.strike, atual, quotes[o.ativo_base]) : null;
                          const diasVenc = businessDaysUntil(o.vencimento);
                          const isSel = selectedOp?.id === o.id;
                          return (
                            <tr key={o.id} className={`border-t cursor-pointer hover:bg-accent/40 ${isSel ? 'bg-primary/5' : ''}`} onClick={() => setSelectedOp(isSel ? null : o)}>
                              <td className="p-2 font-medium">{o.ativo}</td>
                              <td className="p-2 text-muted-foreground">{o.data_abertura ? new Date(o.data_abertura).toLocaleDateString('pt-BR') : '—'}</td>
                              <td className="p-2">{o.categoria}</td>
                              <td className="p-2">{o.operacao}</td>
                              <td className="p-2 text-right">{o.quantidade}</td>
                              <td className="p-2 text-right">{fmt(o.preco_entrada)}</td>
                              <td className="p-2 text-right">{isOption(o.categoria) ? fmt(o.strike) : '—'}</td>
                              <td className="p-2 text-right">{isOption(o.categoria) ? (diasVenc != null ? `${diasVenc}` : '—') : '—'}</td>
                              <td className="p-2 text-right">{fmt(o.valor_inicial)}</td>
                              <td className="p-2 text-right">{fmt(atual)}</td>
                              <td className={`p-2 text-right ${color(extr)}`}>{isOption(o.categoria) ? fmt(extr) : '—'}</td>
                              <td className={`p-2 text-right ${color(rp)}`}>{fmtPct(rp)}</td>
                              <td className={`p-2 text-right ${color(rv)}`}>{fmt(rv)}</td>
                              <td className="p-2" onClick={(e) => e.stopPropagation()}>
                                <div className="flex gap-1">
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditarOp(o)} title="Editar operação"><Pencil className="w-3.5 h-3.5" /></Button>
                                  <Button size="sm" variant="outline" onClick={() => setEncerrar(o)}>Encerrar</Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {selectedInGroup && (
                      <MapaCalor operation={selectedOp} currentPrice={quotes[selectedOp.ativo]} />
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <OperacaoForm open={formOpen} onClose={() => setFormOpen(false)} grupos={grupos} onSubmit={handleCreate} />
      <EncerrarDialog operacao={encerrar} onClose={() => setEncerrar(null)} onConfirm={handleEncerrar} />
      <EditarOperacaoDialog operacao={editarOp} onClose={() => setEditarOp(null)} onSubmit={handleEditarOperacao} />
      <EditarIdentificadorDialog grupo={editarGrupo} onClose={() => setEditarGrupo(null)} onSubmit={handleEditarIdentificador} />
    </div>
  );
}