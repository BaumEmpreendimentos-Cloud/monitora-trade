import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RefreshCw, Layers, Plus, Trash2, Scale, Calendar, RotateCcw } from 'lucide-react';
import {
  groupExercises, findOptionInExercise, findNextExercise, exerciseLabel,
  calcRollFlow, calcOpenFlow, classifyRollResult,
} from '@/lib/rolagemCalculo';
import { operacoesToLegs } from '@/lib/opcoesAdapter';
import { ShieldAlert } from 'lucide-react';

const fmt = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const toneClass = {
  good: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900',
  warn: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900',
  bad: 'text-red-600 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900',
};

export default function CalculadoraRolagem({ operacoes, ativoBase, spotPrice, onSimulate }) {
  const optionLegs = useMemo(() => (operacoes || []).filter((o) => o.categoria === 'CALL' || o.categoria === 'PUT'), [operacoes]);
  const [chain, setChain] = useState([]);
  const [quotes, setQuotes] = useState({});
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [legConfigs, setLegConfigs] = useState({});
  const [newLegs, setNewLegs] = useState([]);
  const [showWeekly, setShowWeekly] = useState(false);
  const [legsExcluidas, setLegsExcluidas] = useState([]);

  const toggleLegExcluida = useCallback((legId) => {
    setLegsExcluidas((prev) => (prev.includes(legId) ? prev.filter((id) => id !== legId) : [...prev, legId]));
  }, []);

  const getExercises = useCallback((tipo) => {
    const all = groupExercises(chain, tipo);
    return showWeekly ? all : all.filter((ex) => !ex.week);
  }, [chain, showWeekly]);

  const fetchData = useCallback(async () => {
    if (!ativoBase) return;
    setLoading(true);
    try {
      const tickers = optionLegs.map((o) => o.ativo).filter(Boolean);
      const [chainRes, quoteRes] = await Promise.all([
        base44.functions.invoke('oplabMarket', { action: 'optionChain', symbol: ativoBase }),
        tickers.length ? base44.functions.invoke('oplabMarket', { action: 'quote', tickers: tickers.join(',') }) : Promise.resolve({ data: { quotes: [] } }),
      ]);
      const chainOptions = chainRes.data?.options || [];
      setChain(chainOptions);
      const qMap = {};
      chainOptions.forEach((o) => { if (o.symbol) qMap[o.symbol] = o.close; });
      (quoteRes.data?.quotes || []).forEach((q) => { qMap[q.symbol] = q.close; });
      setQuotes(qMap);
      setLastUpdate(new Date());
      // Forçar atualização dos preços de fechamento e prêmios das novas séries
      setLegConfigs((prev) => {
        const next = { ...prev };
        optionLegs.forEach((leg) => {
          const existing = next[leg.id] || {};
          const allEx = groupExercises(chainOptions, leg.categoria);
          const exercises = showWeekly ? allEx : allEx.filter((ex) => !ex.week);
          let targetDueDate = existing.targetDueDate;
          if (!targetDueDate && exercises.length) {
            const nextEx = findNextExercise(exercises, leg.vencimento);
            targetDueDate = nextEx?.due_date || '';
          }
          // Se a série atual não existe mais no filtro (ex.: semanais desligado), recompute
          if (targetDueDate && exercises.length && !exercises.find((e) => e.due_date === targetDueDate)) {
            const nextEx = findNextExercise(exercises, leg.vencimento);
            targetDueDate = nextEx?.due_date || '';
          }
          const curStrike = existing.targetStrike != null && existing.targetStrike !== '' ? Number(existing.targetStrike) : leg.strike;
          const match = targetDueDate ? findOptionInExercise(exercises, curStrike, leg.categoria, targetDueDate) : null;
          next[leg.id] = {
            ...existing,
            targetDueDate: targetDueDate || '',
            targetStrike: curStrike,
            newQty: existing.newQty != null ? existing.newQty : leg.quantidade,
            closePrice: qMap[leg.ativo] ?? '',
            newPremium: match?.close ?? '',
          };
        });
        return next;
      });
    } catch (e) { /* ignore */ } finally { setLoading(false); }
  }, [ativoBase, optionLegs, showWeekly]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Inicializar/atualizar configs das pernas quando chain/quotes carregarem
  useEffect(() => {
    setLegConfigs((prev) => {
      const next = { ...prev };
      optionLegs.forEach((leg) => {
        const existing = next[leg.id] || {};
        const exercises = getExercises(leg.categoria);
        let targetDueDate = existing.targetDueDate;
        if (!targetDueDate && exercises.length) {
          const nextEx = findNextExercise(exercises, leg.vencimento);
          targetDueDate = nextEx?.due_date || '';
        }
        const match = targetDueDate ? findOptionInExercise(exercises, existing.targetStrike != null && existing.targetStrike !== '' ? Number(existing.targetStrike) : leg.strike, leg.categoria, targetDueDate) : null;
        next[leg.id] = {
          targetDueDate: targetDueDate || '',
          targetStrike: existing.targetStrike != null && existing.targetStrike !== '' ? existing.targetStrike : leg.strike,
          newQty: existing.newQty != null ? existing.newQty : leg.quantidade,
          closePrice: existing.closePrice !== '' && existing.closePrice != null ? existing.closePrice : (quotes[leg.ativo] ?? ''),
          newPremium: existing.newPremium !== '' && existing.newPremium != null ? existing.newPremium : (match?.close ?? ''),
        };
      });
      Object.keys(next).forEach((id) => { if (!optionLegs.find((l) => l.id === id)) delete next[id]; });
      return next;
    });
  }, [optionLegs, chain, quotes]);

  const onExerciseChange = (legId, newDueDate) => {
    setLegConfigs((prev) => {
      const leg = optionLegs.find((l) => l.id === legId);
      if (!leg) return prev;
      const exercises = getExercises(leg.categoria);
      const curStrike = prev[legId]?.targetStrike != null && prev[legId]?.targetStrike !== '' ? Number(prev[legId].targetStrike) : leg.strike;
      const match = findOptionInExercise(exercises, curStrike, leg.categoria, newDueDate);
      const ex = exercises.find((e) => e.due_date === newDueDate);
      const strikes = ex ? [...new Set(ex.options.map((o) => o.strike))].sort((a, b) => a - b) : [];
      const strikeExists = strikes.some((s) => Math.abs((s || 0) - (curStrike || 0)) < 0.001);
      const finalStrike = strikeExists ? curStrike : (strikes.length ? strikes.reduce((c, s) => Math.abs((s || 0) - (leg.strike || 0)) < Math.abs((c || 0) - (leg.strike || 0)) ? s : c, strikes[0]) : curStrike);
      const finalMatch = findOptionInExercise(exercises, finalStrike, leg.categoria, newDueDate);
      return { ...prev, [legId]: { ...prev[legId], targetDueDate: newDueDate, targetStrike: finalStrike ?? '', newPremium: finalMatch?.close ?? '' } };
    });
  };

  const onStrikeChange = (legId, newStrike) => {
    setLegConfigs((prev) => {
      const leg = optionLegs.find((l) => l.id === legId);
      if (!leg) return prev;
      const exercises = getExercises(leg.categoria);
      const match = findOptionInExercise(exercises, Number(newStrike), leg.categoria, prev[legId]?.targetDueDate);
      return { ...prev, [legId]: { ...prev[legId], targetStrike: newStrike, newPremium: match?.close ?? '' } };
    });
  };

  const setLegField = (legId, field, value) => {
    setLegConfigs((prev) => ({ ...prev, [legId]: { ...prev[legId], [field]: value } }));
  };

  const addNewLeg = () => {
    const exercises = getExercises('CALL');
    const firstEx = exercises[0];
    const newLeg = { id: `new_${Date.now()}`, categoria: 'CALL', dueDate: firstEx?.due_date || '', strike: '', operacao: 'VENDA', quantidade: 100, premium: '' };
    setNewLegs((prev) => [...prev, newLeg]);
  };

  const updateNewLeg = (id, field, value) => {
    setNewLegs((prev) => prev.map((l) => {
      if (l.id !== id) return l;
      const updated = { ...l, [field]: value };
      if (field === 'dueDate' || field === 'categoria') {
        const exercises = getExercises(updated.categoria);
        const ex = exercises.find((e) => e.due_date === updated.dueDate);
        if (ex && ex.options.length) {
          const atm = ex.options.reduce((c, o) => Math.abs((o.strike || 0) - (spotPrice || 0)) < Math.abs((c.strike || 0) - (spotPrice || 0)) ? o : c, ex.options[0]);
          updated.strike = atm.strike;
          updated.premium = atm.close ?? '';
        } else { updated.strike = ''; updated.premium = ''; }
      }
      if (field === 'strike') {
        const exercises = getExercises(updated.categoria);
        const match = findOptionInExercise(exercises, Number(updated.strike), updated.categoria, updated.dueDate);
        updated.premium = match?.close ?? '';
      }
      return updated;
    }));
  };

  const removeNewLeg = (id) => setNewLegs((prev) => prev.filter((l) => l.id !== id));

  const legFlows = useMemo(() => optionLegs.map((leg) => {
    const cfg = legConfigs[leg.id] || {};
    const exercises = getExercises(leg.categoria);
    const curStrike = cfg.targetStrike != null && cfg.targetStrike !== '' ? Number(cfg.targetStrike) : leg.strike;
    const match = findOptionInExercise(exercises, curStrike, leg.categoria, cfg.targetDueDate);
    const flow = calcRollFlow(leg.operacao, leg.quantidade, cfg.newQty ?? leg.quantidade, cfg.closePrice, cfg.newPremium);
    return { leg, cfg, match, exercises, ...flow };
  }), [optionLegs, legConfigs, chain, getExercises]);

  // Ao alternar séries semanais, revalidar a série selecionada de cada perna
  useEffect(() => {
    setLegConfigs((prev) => {
      let changed = false;
      const next = { ...prev };
      optionLegs.forEach((leg) => {
        const existing = next[leg.id] || {};
        const exercises = getExercises(leg.categoria);
        if (!exercises.length) return;
        if (!existing.targetDueDate || !exercises.find((e) => e.due_date === existing.targetDueDate)) {
          const nextEx = findNextExercise(exercises, leg.vencimento);
          const newDue = nextEx?.due_date || '';
          const curStrike = existing.targetStrike != null && existing.targetStrike !== '' ? Number(existing.targetStrike) : leg.strike;
          const match = newDue ? findOptionInExercise(exercises, curStrike, leg.categoria, newDue) : null;
          next[leg.id] = { ...existing, targetDueDate: newDue, newPremium: match?.close ?? '' };
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [showWeekly]); // eslint-disable-line react-hooks/exhaustive-deps

  const newLegFlows = useMemo(() => newLegs.map((leg) => ({ leg, openFlow: calcOpenFlow(leg.operacao, leg.quantidade, leg.premium) })), [newLegs]);

  // Pernas que entram na rolagem (excluindo as desmarcadas pelo usuário)
  const legFlowsAtivas = useMemo(
    () => legFlows.filter((f) => !legsExcluidas.includes(f.leg.id)),
    [legFlows, legsExcluidas]
  );

  const totalClose = legFlowsAtivas.reduce((s, f) => s + f.closeFlow, 0);
  const totalOpen = legFlowsAtivas.reduce((s, f) => s + f.openFlow, 0) + newLegFlows.reduce((s, f) => s + f.openFlow, 0);
  const netFlow = totalClose + totalOpen;
  const totalQty = legFlowsAtivas.reduce((s, f) => s + (Number(f.cfg.newQty) || 0), 0) + newLegs.reduce((s, l) => s + (Number(l.quantidade) || 0), 0);
  const resultado = classifyRollResult(netFlow, totalQty);

  const simularNoPayoff = () => {
    const outrasOps = (operacoes || []).filter((o) => o.categoria !== 'CALL' && o.categoria !== 'PUT');
    const opsRoladas = legFlowsAtivas.map(({ leg, cfg, match }) => ({
      id: `${leg.id}_rolada`,
      categoria: leg.categoria,
      operacao: leg.operacao,
      ativo: match?.symbol || leg.ativo,
      strike: match?.strike ?? (cfg.targetStrike != null && cfg.targetStrike !== '' ? Number(cfg.targetStrike) : leg.strike),
      preco_entrada: Number(cfg.newPremium) || 0,
      quantidade: Number(cfg.newQty ?? leg.quantidade) || 0,
      vencimento: cfg.targetDueDate || leg.vencimento,
      ativo_base: ativoBase,
    })).filter((o) => o.quantidade > 0);
    const opsAdicionadas = newLegs.map((l) => ({
      id: `${l.id}_nova`,
      categoria: l.categoria,
      operacao: l.operacao,
      ativo: l.ticker || `${ativoBase}_NOVA`,
      strike: Number(l.strike) || 0,
      preco_entrada: Number(l.premium) || 0,
      quantidade: Number(l.quantidade) || 0,
      vencimento: l.dueDate,
      ativo_base: ativoBase,
    })).filter((o) => o.quantidade > 0);
    onSimulate?.(operacoesToLegs([...outrasOps, ...opsRoladas, ...opsAdicionadas]));
  };

  if (!optionLegs.length && !newLegs.length) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground text-center py-6">Este grupo não possui opções (CALL/PUT) para simular rolagem.</p>
        {chain.length > 0 && <Button variant="outline" size="sm" onClick={addNewLeg} className="w-full"><Plus className="w-4 h-4 mr-1" /> Adicionar Nova Perna</Button>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2"><Layers className="w-4 h-4 text-primary" /> Calculadora Tática de Rolagem B3</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{optionLegs.length} perna(s) em {ativoBase || '—'}{lastUpdate && ` — Atualizado: ${lastUpdate.toLocaleTimeString('pt-BR')}`}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={showWeekly ? 'default' : 'outline'} size="sm" onClick={() => setShowWeekly(!showWeekly)}><Calendar className="w-4 h-4 mr-1" /> Semanais: {showWeekly ? 'Sim' : 'Não'}</Button>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}><RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Atualizar</Button>
        </div>
      </div>

      {/* Pernas existentes */}
      {legFlows.map(({ leg, cfg, match, exercises, closeFlow, openFlow, netFlow: legNet }) => {
        const isSell = leg.operacao === 'VENDA';
        const curQty = cfg.newQty ?? leg.quantidade;
        const excluida = legsExcluidas.includes(leg.id);
        const legNetAtivo = excluida ? 0 : legNet;
        return (
          <Card key={leg.id} className={excluida ? 'opacity-60' : ''}>
            <CardContent className="p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold flex-wrap">
                  <Checkbox
                    checked={!excluida}
                    onCheckedChange={() => toggleLegExcluida(leg.id)}
                    title={excluida ? 'Incluir esta perna na rolagem' : 'Excluir esta perna da rolagem'}
                  />
                  <span className="text-xs uppercase text-muted-foreground">{excluida ? 'Não rolar' : 'Rolar'}</span>
                  <span className="text-muted-foreground/40">|</span>
                  <span className={isSell ? 'text-red-600' : 'text-emerald-600'}>{isSell ? 'VENDIDA' : 'COMPRADA'}</span>
                  <span>{leg.categoria}</span>
                  <span className="font-mono text-muted-foreground">{leg.ativo}</span>
                  <span className="text-muted-foreground">Strike R$ {Number(leg.strike).toFixed(2)}</span>
                  <span className="text-muted-foreground">Qtd {leg.quantidade}</span>
                </div>
                {excluida ? (
                  <span className="text-xs font-bold px-2 py-1 rounded text-muted-foreground bg-muted">Fora da rolagem</span>
                ) : (
                  <span className={`text-xs font-bold px-2 py-1 rounded ${legNetAtivo >= 0 ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' : 'text-red-600 bg-red-50 dark:bg-red-950/30'}`}>{legNetAtivo >= 0 ? '+ CRÉDITO' : '- DÉBITO'} {fmt(Math.abs(legNetAtivo))}</span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {/* Fechamento */}
                <div className="border rounded-lg p-2 space-y-1.5">
                  <div className="text-xs font-medium text-muted-foreground uppercase">1. Fechamento Atual ({isSell ? 'Recompra' : 'Venda Liq.'})</div>
                  <div><Label className="text-xs">Preço de Fechamento (R$)</Label>
                    <Input type="number" step="0.01" value={cfg.closePrice ?? ''} onChange={(e) => setLegField(leg.id, 'closePrice', e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className={`text-right text-sm font-semibold ${closeFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{leg.quantidade} un × R$ {Number(cfg.closePrice || 0).toFixed(2)} = {closeFlow >= 0 ? '+' : ''}{fmt(closeFlow)}</div>
                </div>

                {/* Nova série */}
                <div className="border rounded-lg p-2 space-y-1.5">
                  <div className="text-xs font-medium text-muted-foreground uppercase">2. Nova Série & Rebalanceamento ({isSell ? 'Venda Nova' : 'Compra Nova'})</div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    <div><Label className="text-xs">Série (Mês)</Label>
                      <select value={cfg.targetDueDate || ''} onChange={(e) => onExerciseChange(leg.id, e.target.value)} className="w-full h-8 text-sm rounded-md border border-input bg-transparent px-2">
                        {exercises.length === 0 && <option value="">Sem séries</option>}
                        {exercises.map((ex) => <option key={ex.due_date} value={ex.due_date}>{exerciseLabel(ex)}</option>)}
                      </select>
                    </div>
                    <div><Label className="text-xs">Novo Strike (R$)</Label>
                      <select value={cfg.targetStrike ?? ''} onChange={(e) => onStrikeChange(leg.id, e.target.value)} className="w-full h-8 text-sm rounded-md border border-input bg-transparent px-2">
                        {(() => {
                          const ex = exercises.find((e) => e.due_date === cfg.targetDueDate);
                          const strikes = ex ? [...new Set(ex.options.map((o) => o.strike))].sort((a, b) => a - b) : [];
                          if (!strikes.length) return <option value="">Sem strikes</option>;
                          return strikes.map((s) => <option key={s} value={s}>{Number(s).toFixed(2)}</option>);
                        })()}
                      </select>
                    </div>
                    <div><Label className="text-xs">Novo Ticker</Label><div className="font-mono font-semibold text-sm h-8 flex items-center">{match?.symbol || '—'}</div></div>
                    <div><Label className="text-xs">Dias Úteis</Label><div className="font-mono font-semibold text-sm h-8 flex items-center">{match?.days_to_maturity ?? '—'}</div></div>
                    <div><Label className="text-xs">Prêmio Novo (R$)</Label>
                      <Input type="number" step="0.01" value={cfg.newPremium ?? ''} onChange={(e) => setLegField(leg.id, 'newPremium', e.target.value)} className="h-8 text-sm" />
                    </div>
                  </div>

                  {/* Controles de quantidade */}
                  <div className="border rounded-md p-2 space-y-1.5">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground"><Scale className="w-3 h-3" /> Quantidade no Novo Strike</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Input type="number" value={curQty} onChange={(e) => setLegField(leg.id, 'newQty', Number(e.target.value))} className="h-8 text-sm w-24" />
                      <div className="flex gap-1 flex-wrap">
                        <button onClick={() => setLegField(leg.id, 'newQty', leg.quantidade)} className={`px-2 py-1 text-xs rounded border ${curQty === leg.quantidade ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent'}`}>1:1</button>
                        <button onClick={() => setLegField(leg.id, 'newQty', Math.max(0, curQty - 100))} className="px-2 py-1 text-xs rounded border border-border hover:bg-accent">-100</button>
                        <button onClick={() => setLegField(leg.id, 'newQty', curQty + 100)} className="px-2 py-1 text-xs rounded border border-border hover:bg-accent">+100</button>
                        <button onClick={() => setLegField(leg.id, 'newQty', Math.floor(curQty / 2))} className="px-2 py-1 text-xs rounded border border-border hover:bg-accent">-50%</button>
                        <button onClick={() => setLegField(leg.id, 'newQty', curQty * 2)} className="px-2 py-1 text-xs rounded border border-border hover:bg-accent">2x</button>
                      </div>
                      <div className={`ml-auto text-sm font-semibold ${openFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{curQty} un × R$ {Number(cfg.newPremium || 0).toFixed(2)} = {openFlow >= 0 ? '+' : ''}{fmt(openFlow)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Botão adicionar perna */}
      {chain.length > 0 && <Button variant="outline" size="sm" onClick={addNewLeg} className="w-full border-dashed"><Plus className="w-4 h-4 mr-1" /> Adicionar Nova Perna</Button>}

      {/* Novas pernas */}
      {newLegFlows.map(({ leg, openFlow }) => {
        const exercises = getExercises(leg.categoria);
        const ex = exercises.find((e) => e.due_date === leg.dueDate);
        const strikes = ex ? [...new Set(ex.options.map((o) => o.strike))].sort((a, b) => a - b) : [];
        return (
          <Card key={leg.id} className="border-dashed border-primary/40">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-primary">Nova Perna</h4>
                <button onClick={() => removeNewLeg(leg.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><Label className="text-xs">Tipo</Label>
                  <div className="flex rounded-md border overflow-hidden">
                    <button onClick={() => updateNewLeg(leg.id, 'categoria', 'CALL')} className={`flex-1 py-1.5 text-xs font-medium ${leg.categoria === 'CALL' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>CALL</button>
                    <button onClick={() => updateNewLeg(leg.id, 'categoria', 'PUT')} className={`flex-1 py-1.5 text-xs font-medium ${leg.categoria === 'PUT' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>PUT</button>
                  </div>
                </div>
                <div><Label className="text-xs">Série (Mês)</Label>
                  <select value={leg.dueDate} onChange={(e) => updateNewLeg(leg.id, 'dueDate', e.target.value)} className="w-full h-8 text-sm rounded-md border border-input bg-transparent px-2">
                    {exercises.map((ex) => <option key={ex.due_date} value={ex.due_date}>{exerciseLabel(ex)}</option>)}
                  </select>
                </div>
                <div><Label className="text-xs">Strike (R$)</Label>
                  <select value={leg.strike} onChange={(e) => updateNewLeg(leg.id, 'strike', e.target.value)} className="w-full h-8 text-sm rounded-md border border-input bg-transparent px-2">
                    <option value="">Selecione...</option>
                    {strikes.map((s) => <option key={s} value={s}>{Number(s).toFixed(2)}</option>)}
                  </select>
                </div>
                <div><Label className="text-xs">Operação</Label>
                  <div className="flex rounded-md border overflow-hidden">
                    <button onClick={() => updateNewLeg(leg.id, 'operacao', 'COMPRA')} className={`flex-1 py-1.5 text-xs font-medium ${leg.operacao === 'COMPRA' ? 'bg-emerald-600 text-white' : 'hover:bg-accent'}`}>Compra</button>
                    <button onClick={() => updateNewLeg(leg.id, 'operacao', 'VENDA')} className={`flex-1 py-1.5 text-xs font-medium ${leg.operacao === 'VENDA' ? 'bg-red-600 text-white' : 'hover:bg-accent'}`}>Venda</button>
                  </div>
                </div>
                <div><Label className="text-xs">Quantidade</Label><Input type="number" value={leg.quantidade} onChange={(e) => updateNewLeg(leg.id, 'quantidade', Number(e.target.value))} className="h-8 text-sm" /></div>
                <div><Label className="text-xs">Prêmio (R$)</Label><Input type="number" step="0.01" value={leg.premium} onChange={(e) => updateNewLeg(leg.id, 'premium', e.target.value)} className="h-8 text-sm" /></div>
                <div className="col-span-2 flex items-end justify-end"><div className={`text-sm font-semibold ${openFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{openFlow >= 0 ? '+ CRÉDITO' : '- DÉBITO'} {fmt(Math.abs(openFlow))}</div></div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Balanço consolidado */}
      <Card className={toneClass[resultado.tone]}>
        <CardContent className="p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-bold">Balanço Financeiro Consolidado</h4>
            <div className="flex flex-wrap items-center gap-2">
              {legsExcluidas.length > 0 && (
                <>
                  <span className="text-xs text-muted-foreground">
                    {legsExcluidas.length} {legsExcluidas.length === 1 ? 'perna fora da rolagem' : 'pernas fora da rolagem'}
                  </span>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setLegsExcluidas([])}>
                    <RotateCcw className="w-3 h-3 mr-1" /> Restaurar todas
                  </Button>
                </>
              )}
              <span className="text-xs font-bold px-2 py-1 rounded bg-card border">{resultado.label}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><div className="text-xs text-muted-foreground">1. Fechamento das Pernas Atuais</div><div className={`text-lg font-bold font-mono ${totalClose >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{totalClose >= 0 ? '+' : ''}{fmt(totalClose)}</div></div>
            <div><div className="text-xs text-muted-foreground">2. Abertura Novas Séries + Novas Pernas</div><div className={`text-lg font-bold font-mono ${totalOpen >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{totalOpen >= 0 ? '+' : ''}{fmt(totalOpen)}</div></div>
            <div><div className="text-xs text-muted-foreground">Saldo Financeiro Líquido</div><div className={`text-xl font-bold font-mono ${netFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{netFlow >= 0 ? '+ CRÉDITO' : '- DÉBITO'} {fmt(Math.abs(netFlow))}</div></div>
          </div>
          <p className="text-xs">{resultado.desc}</p>
        </CardContent>
      </Card>

      {onSimulate && (
        <Button onClick={simularNoPayoff} className="w-full">
          <ShieldAlert className="w-4 h-4 mr-1" /> Simular Risco e Margem Pós-Rolagem
        </Button>
      )}
    </div>
  );
}