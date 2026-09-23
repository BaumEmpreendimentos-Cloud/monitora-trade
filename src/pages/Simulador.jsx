import React, { useState, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Search, RefreshCw } from 'lucide-react';
import PayoffChart from '@/components/simulador/PayoffChart';
import ScenarioAnalysis from '@/components/simulador/ScenarioAnalysis';
import {
  calculatePortfolioGreeks,
  estimateB3Margin,
  findBreakEvens,
} from '@/utils/blackScholes';

const fmt = (v) => (v === null || v === undefined || v === '' ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const fmtPct = (v) => (v === null || v === undefined ? '—' : `${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`);

let legIdCounter = 0;

export default function Simulador() {
  const [ativoBase, setAtivoBase] = useState('');
  const [ativoBuscado, setAtivoBuscado] = useState('');
  const [spotPrice, setSpotPrice] = useState(50);
  const [iv, setIv] = useState(0.28);
  const [interestRate, setInterestRate] = useState(0.1325);
  const [legs, setLegs] = useState([]);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchChain = useCallback(async (symbol) => {
    if (!symbol) return;
    setLoading(true);
    setError('');
    try {
      const [chainRes, quoteRes] = await Promise.all([
        base44.functions.invoke('oplabMarket', { action: 'optionChain', symbol }),
        base44.functions.invoke('oplabMarket', { action: 'quote', tickers: symbol }),
      ]);
      const opts = chainRes.data?.options || [];
      setOptions(opts);
      const q = quoteRes.data?.quotes || [];
      if (q[0]?.close) setSpotPrice(q[0].close);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = (e) => {
    e?.preventDefault();
    const sym = ativoBase.trim().toUpperCase();
    if (!sym) return;
    setAtivoBuscado(sym);
    fetchChain(sym);
  };

  const addLeg = () => {
    legIdCounter += 1;
    setLegs((prev) => [
      ...prev,
      {
        id: `leg-${legIdCounter}`,
        type: 'CALL',
        side: 'BUY',
        strike: spotPrice,
        premium: 2.0,
        quantity: 100,
        daysToExpiry: 22,
        ticker: '',
      },
    ]);
  };

  const updateLeg = (id, field, value) => {
    setLegs((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  const removeLeg = (id) => {
    setLegs((prev) => prev.filter((l) => l.id !== id));
  };

  const greeks = useMemo(() => calculatePortfolioGreeks(legs, spotPrice, iv, interestRate), [legs, spotPrice, iv, interestRate]);
  const margin = useMemo(() => estimateB3Margin(legs, spotPrice), [legs, spotPrice]);
  const breakEvens = useMemo(() => findBreakEvens(legs, spotPrice, 0.35), [legs, spotPrice]);

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Simulador de Payoff</h1>
          <p className="text-sm text-muted-foreground">Monte estratégias multi-pernas e visualize o gráfico de payoff com Greeks</p>
        </div>

        {/* Market data search */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3 md:items-end">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="ativo">Ativo Base</Label>
                <div className="flex gap-2">
                  <Input id="ativo" value={ativoBase} onChange={(e) => setAtivoBase(e.target.value.toUpperCase())} placeholder="Ex: PETR4, VALE3..." className="uppercase" />
                  <Button type="submit" disabled={loading || !ativoBase.trim()}>
                    <Search className="w-4 h-4 mr-1" /> Buscar
                  </Button>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Spot</Label>
                  <Input type="number" step="0.01" value={spotPrice} onChange={(e) => setSpotPrice(Number(e.target.value))} className="w-28" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">IV (%)</Label>
                  <Input type="number" step="0.1" value={(iv * 100).toFixed(1)} onChange={(e) => setIv(Number(e.target.value) / 100)} className="w-20" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Selic (%)</Label>
                  <Input type="number" step="0.01" value={(interestRate * 100).toFixed(2)} onChange={(e) => setInterestRate(Number(e.target.value) / 100)} className="w-20" />
                </div>
              </div>
            </form>
            {ativoBuscado && (
              <Button variant="outline" size="sm" onClick={() => fetchChain(ativoBuscado)} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Atualizar cotação
              </Button>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>

        {/* Leg builder */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Pernas da Estratégia</h2>
              <Button size="sm" onClick={addLeg}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar Perna
              </Button>
            </div>

            {legs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhuma perna adicionada. Clique em "Adicionar Perna" para começar.
              </p>
            ) : (
              <div className="space-y-2">
                {legs.map((leg, idx) => (
                  <div key={leg.id} className="flex flex-wrap items-end gap-2 p-3 border rounded-lg bg-muted/30">
                    <div className="text-xs font-bold text-muted-foreground w-6">#{idx + 1}</div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Tipo</Label>
                      <select
                        value={leg.type}
                        onChange={(e) => updateLeg(leg.id, 'type', e.target.value)}
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                      >
                        <option value="CALL">CALL</option>
                        <option value="PUT">PUT</option>
                        <option value="STOCK">AÇÃO</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Lado</Label>
                      <select
                        value={leg.side}
                        onChange={(e) => updateLeg(leg.id, 'side', e.target.value)}
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                      >
                        <option value="BUY">Compra</option>
                        <option value="SELL">Venda</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Strike</Label>
                      <Input type="number" step="0.5" value={leg.strike} onChange={(e) => updateLeg(leg.id, 'strike', Number(e.target.value))} className="w-20 h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Prêmio</Label>
                      <Input type="number" step="0.01" value={leg.premium} onChange={(e) => updateLeg(leg.id, 'premium', Number(e.target.value))} className="w-20 h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Qtd</Label>
                      <Input type="number" value={leg.quantity} onChange={(e) => updateLeg(leg.id, 'quantity', Number(e.target.value))} className="w-16 h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Dias úteis</Label>
                      <Input type="number" value={leg.daysToExpiry} onChange={(e) => updateLeg(leg.id, 'daysToExpiry', Number(e.target.value))} className="w-16 h-9" />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeLeg(leg.id)} className="h-9 w-9 text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payoff chart */}
        {legs.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <h2 className="text-sm font-semibold">Curva de Payoff — {ativoBuscado || 'Estratégia'}</h2>
              <PayoffChart legs={legs} spotPrice={spotPrice} iv={iv} interestRate={interestRate} ticker={ativoBuscado || ''} />
            </CardContent>
          </Card>
        )}

        {/* Greeks & margin summary */}
        {legs.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-xs text-muted-foreground">Delta</div>
                <div className="text-lg font-bold">{fmt(greeks.delta)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-xs text-muted-foreground">Gamma</div>
                <div className="text-lg font-bold">{fmt(greeks.gamma)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-xs text-muted-foreground">Theta/dia</div>
                <div className="text-lg font-bold">{fmt(greeks.theta)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-xs text-muted-foreground">Vega (1% IV)</div>
                <div className="text-lg font-bold">{fmt(greeks.vega)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-xs text-muted-foreground">Margem B3</div>
                <div className="text-lg font-bold">R$ {fmt(margin.estimatedInitialMargin)}</div>
                <div className="text-[10px] text-muted-foreground">{margin.marginType}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-xs text-muted-foreground">Break-Even</div>
                <div className="text-sm font-bold">
                  {breakEvens.length > 0 ? breakEvens.map((be) => `R$ ${be.toFixed(2)}`).join(', ') : '—'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-xs text-muted-foreground">Fluxo Inicial</div>
                <div className={`text-lg font-bold ${greeks.netDebitCredit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {fmt(greeks.netDebitCredit)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-xs text-muted-foreground">Risco</div>
                <div className="text-sm font-bold">{margin.riskScore}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Scenario Analysis */}
        {legs.length > 0 && (
          <ScenarioAnalysis
            legs={legs}
            spotPrice={spotPrice}
            ticker={ativoBuscado || ''}
            iv={iv}
            interestRate={interestRate}
          />
        )}
      </div>
    </div>
  );
}
