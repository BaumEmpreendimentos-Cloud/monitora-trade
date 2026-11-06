import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, Plus, Pencil, ChevronDown, ChevronRight, Coins, Trash2, Bell, BellRing, Repeat, History, Receipt, Layers, TrendingUp } from 'lucide-react';
import OperacaoForm from '@/components/operacoes/OperacaoForm';
import EncerrarDialog from '@/components/operacoes/EncerrarDialog';
import EditarOperacaoDialog from '@/components/operacoes/EditarOperacaoDialog';
import EditarIdentificadorDialog from '@/components/operacoes/EditarIdentificadorDialog';
import DividendoForm from '@/components/operacoes/DividendoForm';
import AlertaForm from '@/components/operacoes/AlertaForm';
import MapaCalorGrupo from '@/components/operacoes/MapaCalorGrupo';
import GrupoMobile from '@/components/operacoes/GrupoMobile';
import DashboardOperacoes from '@/components/operacoes/DashboardOperacoes';
import PullToRefresh from '@/components/PullToRefresh';
import { calcValorInicial, calcResultadoValor, calcResultadoPct, calcExtrinseco, businessDaysUntil, moneynessRowClass } from '@/lib/operacoes';
import { isMarketOpen } from '@/lib/marketHours';
import { Link } from 'react-router-dom';

const fmt = (v) => (v === null || v === undefined || v === '' ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const fmtPct = (v) => (v === null || v === undefined || v === '' ? '—' : `${Number(v) >= 0 ? '+' : ''}${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`);
const color = (v) => (v === null || v === undefined ? '' : v >= 0 ? 'text-emerald-600' : 'text-red-600');
const isOption = (c) => c === 'CALL' || c === 'PUT';

export default function Operacoes() {
  const [grupos, setGrupos] = useState([]);
  const [ops, setOps] = useState([]);
  const [quotes, setQuotes] = useState({});
  const [prevQuotes, setPrevQuotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formGrupo, setFormGrupo] = useState(null);
  const [encerrar, setEncerrar] = useState(null);
  const [editarOp, setEditarOp] = useState(null);
  const [editarGrupo, setEditarGrupo] = useState(null);
  const [selectedOp, setSelectedOp] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [dividendoGrupo, setDividendoGrupo] = useState(null);
  const [alertaGrupo, setAlertaGrupo] = useState(null);
  const [alertaOp, setAlertaOp] = useState(null);
  const [alertas, setAlertas] = useState([]);
  const [dividendos, setDividendos] = useState([]);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [g, o, d, a] = await Promise.all([
        base44.entities.GrupoOperacao.list(),
        base44.entities.Operacao.list('-created_date', 5000),
        base44.entities.Dividendo.list('-created_date', 5000),
        base44.entities.Alerta.filter({ status: 'ATIVO' }),
      ]);
      setGrupos(g || []); setOps(o || []); setDividendos(d || []); setAlertas(a || []);
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
      const prevMap = {};
      arr.forEach((q) => {
        const sym = q.symbol || q.ticker;
        map[sym] = q.close;
        let prev = q.close;
        if (q.variation != null && q.variation > -99.999) {
          prev = q.close / (1 + q.variation / 100);
        } else if (q.previous_close != null) {
          prev = q.previous_close;
        }
        prevMap[sym] = prev;
      });
      setQuotes(map);
      setPrevQuotes(prevMap);
      setLastUpdate(new Date());
    } catch (e) { setError(e.response?.data?.error || e.message); }
    finally { setLoadingQuotes(false); }
  }, [ops]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { if (ops.length) fetchQuotes(); }, [ops, fetchQuotes]);
  useEffect(() => {
    const id = setInterval(() => {
      if (ops.some((x) => x.status === 'ABERTA') && isMarketOpen()) fetchQuotes();
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchQuotes]);

  const openOps = ops.filter((o) => o.status === 'ABERTA');
  const closedOps = ops.filter((o) => o.status === 'FECHADA');
  const groupsWithOpen = grupos.filter((g) => openOps.some((o) => o.grupo_id === g.id));
  const groupHistorico = (id) => closedOps.filter((o) => o.grupo_id === id).reduce((s, o) => s + (o.resultado_valor || 0), 0);
  const dayVar = (o) => {
    const cur = quotes[o.ativo];
    const prev = prevQuotes[o.ativo];
    if (cur == null || prev == null) return 0;
    const dir = o.operacao === 'VENDA' ? -1 : 1;
    return (cur - prev) * o.quantidade * dir;
  };
  const groupDia = (id) => openOps.filter((o) => o.grupo_id === id && !o.simulada).reduce((s, o) => s + dayVar(o), 0);
  const groupAberto = (id) => openOps.filter((o) => o.grupo_id === id).reduce((s, o) => {
    const r = calcResultadoValor(o.operacao, o.quantidade, o.preco_entrada, quotes[o.ativo]);
    return s + (r || 0);
  }, 0);
  const todayStr = new Date().toISOString().split('T')[0];
  const isDivPendente = (d) => d.data_pagamento > todayStr;
  const groupDivPendente = (id) => dividendos.filter((d) => d.grupo_id === id && isDivPendente(d)).reduce((s, d) => s + (d.valor_total || 0), 0);
  const groupDivPago = (id) => dividendos.filter((d) => d.grupo_id === id && !isDivPendente(d)).reduce((s, d) => s + (d.valor_total || 0), 0);
  const totalDivPendente = dividendos.filter(isDivPendente).reduce((s, d) => s + (d.valor_total || 0), 0);
  const totalDivPago = dividendos.filter((d) => !isDivPendente(d)).reduce((s, d) => s + (d.valor_total || 0), 0);

  const totalDia = openOps.filter((o) => !o.simulada).reduce((s, o) => s + dayVar(o), 0);
  const totalHist = closedOps.reduce((s, o) => s + (o.resultado_valor || 0), 0);
  const totalAberto = openOps.reduce((s, o) => s + (calcResultadoValor(o.operacao, o.quantidade, o.preco_entrada, quotes[o.ativo]) || 0), 0);
  const totalEncerradas = totalHist + totalDivPago;
  const totalTotal = totalEncerradas + totalAberto + totalDivPendente;

  const hasAlertaGrupo = (gid) => alertas.some(a => a.grupo_id === gid);
  const hasAlertaOp = (oid) => alertas.some(a => a.operacao_id === oid);
  const refreshAlertas = () => base44.entities.Alerta.filter({ status: 'ATIVO' }).then(setAlertas).catch(() => {});

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

  const handleEncerrar = async (preco, irrf) => {
    const o = encerrar;
    if (!o) return;
    try {
      const updated = await base44.entities.Operacao.update(o.id, {
        status: 'FECHADA',
        preco_fechamento: preco,
        irrf: irrf || 0,
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
      const user = await base44.auth.me();
      await base44.entities.GrupoOperacao.update(g.id, { nome: novoNome });
      await Promise.all(['Operacao', 'Dividendo', 'Alerta'].map(async (entityName) => {
        let result;
        do {
          result = await base44.entities[entityName].updateMany(
            { created_by_id: user.id, grupo_id: g.id, grupo_nome: { $ne: novoNome } },
            { $set: { grupo_nome: novoNome } }
          );
        } while (result.has_more);
      }));
      setGrupos((p) => p.map((x) => (x.id === g.id ? { ...x, nome: novoNome } : x)));
      const atualizarNome = (items) => items.map((x) => (x.grupo_id === g.id ? { ...x, grupo_nome: novoNome } : x));
      setOps(atualizarNome);
      setDividendos(atualizarNome);
      setAlertas(atualizarNome);
      setEditarGrupo(null);
    } catch (e) { setError(e.response?.data?.error || e.message); }
  };

  const handleCreateDividendo = async ({ ativo, dataPagamento, quantidade, valorPorAcao, valorTotal }) => {
    const g = dividendoGrupo;
    if (!g) return;
    setError('');
    try {
      const nova = await base44.entities.Dividendo.create({
        grupo_id: g.id, grupo_nome: g.nome, ativo,
        data_pagamento: dataPagamento, quantidade, valor_por_acao: valorPorAcao, valor_total: valorTotal,
      });
      setDividendos((p) => [...p, nova]);
      setDividendoGrupo(null);
    } catch (e) { setError(e.response?.data?.error || e.message); }
  };

  const handleDeleteSimulada = async (op) => {
    if (!confirm(`Excluir a operação simulada ${op.ativo}?`)) return;
    setError('');
    try {
      await base44.entities.Operacao.delete(op.id);
      setOps((p) => p.filter((x) => x.id !== op.id));
    } catch (e) { setError(e.response?.data?.error || e.message); }
  };

  const handleDeleteGrupoSimulado = async (g) => {
    const gOps = ops.filter((o) => o.grupo_id === g.id && o.status === 'ABERTA' && o.simulada);
    if (!confirm(`Excluir todas as ${gOps.length} operações simuladas do grupo "${g.nome}"?`)) return;
    setError('');
    try {
      await base44.entities.Operacao.deleteMany({ grupo_id: g.id, status: 'ABERTA', simulada: true });
      setOps((p) => p.filter((x) => !(x.grupo_id === g.id && x.status === 'ABERTA' && x.simulada)));
    } catch (e) { setError(e.response?.data?.error || e.message); }
  };

  const handleDeleteDividendo = async (id) => {
    setError('');
    try {
      await base44.entities.Dividendo.delete(id);
      setDividendos((p) => p.filter((d) => d.id !== id));
    } catch (e) { setError(e.response?.data?.error || e.message); }
  };

  return (
    <PullToRefresh onRefresh={fetchQuotes}>
    <div className="p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3" data-tour="ops-header">
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold">Operações</h1>
            <p className="text-sm text-muted-foreground">Acompanhamento de operações abertas</p>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdate && <span className="text-xs text-muted-foreground">Atualizado: {lastUpdate.toLocaleTimeString('pt-BR')}</span>}
            <Button variant="outline" size="sm" onClick={fetchQuotes} disabled={loadingQuotes || !openOps.length}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loadingQuotes ? 'animate-spin' : ''}`} /> Atualizar
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/rolagem"><Repeat className="w-4 h-4 mr-1" /> Rolagem</Link>
            </Button>
            <Button size="sm" onClick={() => { setFormGrupo(null); setFormOpen(true); }} data-tour="ops-nova"><Plus className="w-4 h-4 mr-1" /> Nova Operação</Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2" data-tour="ops-quick-links">
          <Button variant="outline" size="sm" asChild><Link to="/historico"><History className="w-4 h-4 mr-1" /> Histórico</Link></Button>
          <Button variant="outline" size="sm" asChild><Link to="/irpf"><Receipt className="w-4 h-4 mr-1" /> IR</Link></Button>
          <Button variant="outline" size="sm" asChild><Link to="/opcoes"><Layers className="w-4 h-4 mr-1" /> Simulador</Link></Button>
          <Button variant="outline" size="sm" asChild><Link to="/cotacoes"><TrendingUp className="w-4 h-4 mr-1" /> Cotações</Link></Button>
          <Button variant="outline" size="sm" asChild><Link to="/estrategias"><Layers className="w-4 h-4 mr-1" /> Estratégias</Link></Button>
        </div>

        <div data-tour="ops-dashboard"><DashboardOperacoes openOps={openOps} closedOps={closedOps} totalDia={totalDia} /></div>

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
              const baseRef = (() => {
                const counts = {};
                gOpen.forEach((o) => { if (o.ativo_base) counts[o.ativo_base] = (counts[o.ativo_base] || 0) + 1; });
                return Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || null;
              })();
              const baseQuote = baseRef ? quotes[baseRef] : null;
              const ativosBaseGrupo = [...new Set(gOpen.map((o) => o.ativo_base || o.ativo))];
              const gDivPendente = dividendos.filter((d) => d.grupo_id === g.id && isDivPendente(d));
              return (
                <Card key={g.id} data-tour="ops-grupo">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto hidden md:block">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={`bg-primary/5 cursor-pointer hover:bg-primary/10 ${selectedGroup === g.id ? 'bg-primary/10' : ''}`} onClick={() => setExpanded((p) => ({ ...p, [g.id]: !p[g.id] }))}>
                          <th colSpan={14} className="p-2.5 text-left font-normal normal-case">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-1.5">
                                {expanded[g.id] ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                                <div className="flex flex-col">
                                  <span className="font-bold text-sm w-[9.5rem] truncate" title={g.nome}>{g.nome}</span>
                                  {baseRef && (
                                    <span className="text-xs text-muted-foreground leading-tight">Ativo base: <b className="text-foreground">{baseRef}</b>{baseQuote != null ? ` • ${fmt(baseQuote)}` : ''}</span>
                                  )}
                                </div>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setEditarGrupo(g); }} title="Editar identificador"><Pencil className="w-3.5 h-3.5" /></Button>
                                <Button size="sm" variant="secondary" className="bg-gradient-to-r from-red-500 via-yellow-400 to-emerald-500 text-white border-0 hover:opacity-90 text-xs" onClick={(e) => { e.stopPropagation(); setSelectedOp(null); setSelectedGroup((p) => (p === g.id ? null : g.id)); }} title="Mapa de calor do grupo" data-tour="ops-mapa-calor">Mapa de Calor</Button>
                                <Button size="sm" variant="outline" className="text-xs" onClick={(e) => { e.stopPropagation(); setDividendoGrupo(g); }} title="Adicionar dividendo" disabled={!ativosBaseGrupo.length}><Coins className="w-3.5 h-3.5 mr-1" /> Dividendo</Button>
                                <Button size="sm" variant="outline" className={`text-xs ${hasAlertaGrupo(g.id) ? 'text-amber-600 border-amber-400' : ''}`} onClick={(e) => { e.stopPropagation(); setAlertaGrupo(g); }} title="Criar alerta de resultado" data-tour="ops-alerta">{hasAlertaGrupo(g.id) ? <BellRing className="w-3.5 h-3.5 mr-1" /> : <Bell className="w-3.5 h-3.5 mr-1" />} Alerta</Button>
                                <Button size="sm" variant="outline" className="text-xs" asChild onClick={(e) => e.stopPropagation()} title="Ir para Análise de Opções"><Link to="/opcoes" state={{ selectedGrupoId: g.id, tab: 'rolagem', mode: 'posicao' }}><Repeat className="w-3.5 h-3.5 mr-1" /> Rolagem</Link></Button>
                                <Button size="sm" variant="outline" className="text-xs" onClick={(e) => { e.stopPropagation(); setFormGrupo(g); setFormOpen(true); }} title="Adicionar operação a este identificador"><Plus className="w-3.5 h-3.5 mr-1" /> Adicionar</Button>
                                {gOpen.some((o) => o.simulada) && (
                                  <Button size="sm" variant="outline" className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); handleDeleteGrupoSimulado(g); }} title="Excluir operações simuladas"><Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir Sim.</Button>
                                )}
                              </div>
                              <div className="flex gap-4 text-sm shrink-0">
                                <span>Op. Encerradas: <b className={color(hist + groupDivPago(g.id))}>{fmt(hist + groupDivPago(g.id))}</b></span>
                                <span>Valor Total: <b className={color(hist + groupDivPago(g.id) + groupAberto(g.id) + groupDivPendente(g.id))}>{fmt(hist + groupDivPago(g.id) + groupAberto(g.id) + groupDivPendente(g.id))}</b></span>
                                <span>Resultado do Dia: <b className={color(dia)}>{fmt(dia)}</b></span>
                              </div>
                            </div>
                          </th>
                        </tr>
                        {expanded[g.id] && (
                        <tr className="bg-muted/50 text-xs text-muted-foreground uppercase">
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
                        )}
                      </thead>
                      {expanded[g.id] && (
                      <tbody>
                        {gOpen.map((o) => {
                          const atual = quotes[o.ativo];
                          const rv = calcResultadoValor(o.operacao, o.quantidade, o.preco_entrada, atual);
                          const rp = calcResultadoPct(o.operacao, o.preco_entrada, atual);
                          const extr = isOption(o.categoria) ? calcExtrinseco(o.categoria, o.strike, atual, quotes[o.ativo_base]) : null;
                          const diasVenc = businessDaysUntil(o.vencimento);
                          const isSel = selectedOp?.id === o.id;
                          const mnyClass = moneynessRowClass(o.categoria, o.strike, quotes[o.ativo_base]);
                          return (
                            <tr key={o.id} className={`border-t cursor-pointer hover:bg-accent/40 ${isSel ? 'bg-primary/5' : ''} ${mnyClass}`} onClick={() => { setSelectedGroup(null); setSelectedOp(isSel ? null : o); }}>
                              <td className="p-2 font-medium">
                                {o.ativo}
                                {o.simulada && <span className="ml-1 px-1 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400" title="Operação simulada">SIM</span>}
                              </td>
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
                                  <Button size="icon" variant="ghost" className={`h-7 w-7 ${hasAlertaOp(o.id) ? 'text-amber-600' : ''}`} onClick={() => setAlertaOp(o)} title="Criar alerta de preço">{hasAlertaOp(o.id) ? <BellRing className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}</Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditarOp(o)} title="Editar operação"><Pencil className="w-3.5 h-3.5" /></Button>
                                  {o.simulada && (
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteSimulada(o)} title="Excluir simulação"><Trash2 className="w-3.5 h-3.5" /></Button>
                                  )}
                                  <Button size="sm" variant="outline" onClick={() => setEncerrar(o)}>Encerrar</Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {gDivPendente.map((d) => (
                          <tr key={`div-${d.id}`} className="border-t bg-amber-50/50">
                            <td className="p-2 font-medium"><span className="inline-flex items-center gap-1"><Coins className="w-3.5 h-3.5 text-amber-500" />{d.ativo}</span></td>
                            <td className="p-2 text-muted-foreground">{d.data_pagamento ? new Date(d.data_pagamento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                            <td className="p-2 text-xs text-amber-600 font-medium">DIV</td>
                            <td className="p-2"></td>
                            <td className="p-2 text-right">{d.quantidade}</td>
                            <td className="p-2 text-right">{fmt(d.valor_por_acao)}</td>
                            <td className="p-2"></td>
                            <td className="p-2"></td>
                            <td className="p-2"></td>
                            <td className="p-2"></td>
                            <td className="p-2"></td>
                            <td className="p-2 text-right text-amber-600 text-xs">Pendente</td>
                            <td className="p-2 text-right text-emerald-600 font-medium">{fmt(d.valor_total)}</td>
                            <td className="p-2">
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteDividendo(d.id)} title="Excluir dividendo"><Trash2 className="w-3.5 h-3.5" /></Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      )}
                    </table>
                    </div>
                    <GrupoMobile
                     grupo={g}
                     openOps={gOpen}
                     pendingDivs={gDivPendente}
                     quotes={quotes}
                     expanded={!!expanded[g.id]}
                     onToggleExpand={() => setExpanded((p) => ({ ...p, [g.id]: !p[g.id] }))}
                     selectedOp={selectedOp}
                     onSelectOp={(o) => { setSelectedGroup(null); setSelectedOp(o); }}
                     onSelectGroup={(id) => { setSelectedOp(null); setSelectedGroup((p) => (p === id ? null : id)); }}
                     onEditGrupo={setEditarGrupo}
                     onEditOp={setEditarOp}
                     onEncerrar={setEncerrar}
                     onAddDividendo={setDividendoGrupo}
                     onDeleteDividendo={handleDeleteDividendo}
                     onAlertaGrupo={setAlertaGrupo}
                     onAlertaOp={setAlertaOp}
                     alertas={alertas}
                     summary={{ hist, dia, divPago: groupDivPago(g.id), aberto: groupAberto(g.id), divPendente: groupDivPendente(g.id) }}
                    />
                    {selectedGroup === g.id && (
                      <MapaCalorGrupo operacoes={gOpen} quotes={quotes} />
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <OperacaoForm open={formOpen} onClose={() => { setFormOpen(false); setFormGrupo(null); }} grupos={groupsWithOpen} onSubmit={handleCreate} identificadorInicial={formGrupo?.nome} />
      <EncerrarDialog operacao={encerrar} onClose={() => setEncerrar(null)} onConfirm={handleEncerrar} />
      <EditarOperacaoDialog operacao={editarOp} onClose={() => setEditarOp(null)} onSubmit={handleEditarOperacao} />
      <EditarIdentificadorDialog grupo={editarGrupo} onClose={() => setEditarGrupo(null)} onSubmit={handleEditarIdentificador} />
      <DividendoForm
        open={!!dividendoGrupo}
        onClose={() => setDividendoGrupo(null)}
        grupo={dividendoGrupo}
        ativosBase={dividendoGrupo ? [...new Set(openOps.filter((o) => o.grupo_id === dividendoGrupo.id).map((o) => o.ativo_base || o.ativo))] : []}
        onSubmit={handleCreateDividendo}
      />
      <AlertaForm open={!!alertaGrupo} onClose={() => { setAlertaGrupo(null); refreshAlertas(); }} tipo="RESULTADO" grupo={alertaGrupo} />
      <AlertaForm open={!!alertaOp} onClose={() => { setAlertaOp(null); refreshAlertas(); }} tipo="PRECO" operacao={alertaOp} />
    </div>
    </PullToRefresh>
  );
}