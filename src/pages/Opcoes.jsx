import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LineChart as LineChartIcon, Target, Cpu, RefreshCw, TrendingUp, Layers } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { operacoesToLegs } from '@/lib/opcoesAdapter';
import SimuladorOperacoes from '@/components/opcoes/SimuladorOperacoes';
import { calculatePortfolioGreeks } from '@/lib/blackScholes';
import { analyzePositionProactively, calcUnrealizedPnL } from '@/lib/proactiveEngine';
import PayoffChart from '@/components/opcoes/PayoffChart';
import PainelGreeks from '@/components/opcoes/PainelGreeks';
import PainelRiscoMargem from '@/components/opcoes/PainelRiscoMargem';
import RolagemProativa from '@/components/opcoes/RolagemProativa';
import CalculadoraRolagem from '@/components/opcoes/CalculadoraRolagem';
import AnaliseCenarios from '@/components/opcoes/AnaliseCenarios';

const INTEREST_RATE = 0.1325;

export default function Opcoes() {
  const [grupos, setGrupos] = useState([]);
  const [operacoes, setOperacoes] = useState([]);
  const [selectedGrupoId, setSelectedGrupoId] = useState(null);
  const [spotPrice, setSpotPrice] = useState(null);
  const [iv, setIv] = useState(0.30);
  const [tab, setTab] = useState('payoff');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [targetProfit, setTargetProfit] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [simulatedLegs, setSimulatedLegs] = useState(null);
  const [mode, setMode] = useState('posicao');
  const [simInitialLegs, setSimInitialLegs] = useState(null);
  const [simSpotPrice, setSimSpotPrice] = useState(null);
  const [simStrategyInfo, setSimStrategyInfo] = useState(null);
  const [simAtivoBase, setSimAtivoBase] = useState('');
  const location = useLocation();

  // Carregar grupos e operações abertas
  useEffect(() => {
    (async () => {
      try {
        const [gs, ops] = await Promise.all([
          base44.entities.GrupoOperacao.list('-created_date', 500),
          base44.entities.Operacao.list('-created_date', 5000),
        ]);
        setGrupos(gs || []);
        setOperacoes((ops || []).filter((o) => o.status === 'ABERTA'));
      } catch (e) {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Receber template da página de Estratégias ou grupo selecionado da tela de Operações
  useEffect(() => {
    if (location.state?.mode === 'simulador') {
      setMode('simulador');
      setSimInitialLegs(location.state.template?.legs || null);
      setSimSpotPrice(location.state.spotPrice || null);
      setSimStrategyInfo(location.state.strategyInfo || null);
      setSimAtivoBase(location.state.ativoBase || '');
    } else if (location.state?.selectedGrupoId) {
      setMode('posicao');
      setSelectedGrupoId(location.state.selectedGrupoId);
      if (location.state.tab) setTab(location.state.tab);
    }
  }, [location.state]);

  // Apenas grupos com operações ativas (mesma regra da tela Operações)
  const gruposAtivos = useMemo(() => {
    return grupos.filter((g) => operacoes.some((o) => o.grupo_id === g.id));
  }, [grupos, operacoes]);

  const grupoOps = useMemo(() => {
    if (!selectedGrupoId) return [];
    return operacoes.filter((o) => o.grupo_id === selectedGrupoId);
  }, [selectedGrupoId, operacoes]);

  const legs = useMemo(() => operacoesToLegs(grupoOps), [grupoOps]);

  const ativoBase = useMemo(() => {
    return grupoOps.find((o) => o.ativo_base)?.ativo_base || grupoOps[0]?.ativo_base || '';
  }, [grupoOps]);

  const selectedGrupo = useMemo(() => grupos.find((g) => g.id === selectedGrupoId), [grupos, selectedGrupoId]);

  // Ao trocar de grupo, limpa qualquer simulação de rolagem pendente
  useEffect(() => { setSimulatedLegs(null); }, [selectedGrupoId]);

  const displayLegs = simulatedLegs || legs;

  const fetchSpot = useCallback(async () => {
    if (!ativoBase) { setSpotPrice(null); return; }
    setRefreshing(true);
    try {
      const res = await base44.functions.invoke('oplabMarket', { action: 'quote', tickers: ativoBase });
      setSpotPrice(res.data?.quotes?.[0]?.close ?? null);
    } catch (e) {
      setSpotPrice(null);
    } finally {
      setRefreshing(false);
    }
  }, [ativoBase]);

  useEffect(() => { fetchSpot(); }, [fetchSpot]);

  const greeks = useMemo(() => {
    if (!displayLegs.length || !spotPrice) return null;
    return calculatePortfolioGreeks(displayLegs, spotPrice, iv, INTEREST_RATE);
  }, [displayLegs, spotPrice, iv]);

  const unrealizedPnL = useMemo(() => {
    return calcUnrealizedPnL(legs, spotPrice, iv, INTEREST_RATE);
  }, [legs, spotPrice, iv]);

  const diagnostico = useMemo(() => {
    if (!legs.length || !spotPrice) return null;
    return analyzePositionProactively(
      legs, spotPrice, unrealizedPnL,
      Number(targetProfit) || 0,
      -Math.abs(Number(stopLoss)) || 0,
      iv, INTEREST_RATE
    );
  }, [legs, spotPrice, unrealizedPnL, targetProfit, stopLoss, iv]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const tabs = [
    { id: 'payoff', label: 'Payoff', icon: LineChartIcon },
    { id: 'rolagem', label: 'Rolagem', icon: Target },
    { id: 'cenarios', label: 'Cenários', icon: Cpu },
  ];

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-[1400px] mx-auto space-y-4">
        {/* Header */}
        <div data-tour="opcoes-header">
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Análise de Opções</h1>
          <p className="text-sm text-muted-foreground">
            Simulador de Payoff, Rolagem Proativa e Análise de Cenários com IA
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 border-b" data-tour="opcoes-mode">
          <button onClick={() => setMode('posicao')} className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${mode === 'posicao' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <LineChartIcon className="w-4 h-4" /> Análise de Posição
          </button>
          <button onClick={() => setMode('simulador')} className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${mode === 'simulador' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <Layers className="w-4 h-4" /> Simulador Livre
          </button>
        </div>

        {mode === 'simulador' ? (
          <SimuladorOperacoes initialLegs={simInitialLegs} initialSpotPrice={simSpotPrice} iv={iv} strategyInfo={simStrategyInfo} ativoBase={simAtivoBase} />
        ) : (
        <>
        {/* Seletor de grupo */}
        {gruposAtivos.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhum grupo com operações ativas encontrado. Abra operações na aba Operações para usar as ferramentas de análise.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div data-tour="opcoes-grupos">
              <Label className="text-xs text-muted-foreground uppercase mb-2 block">Selecione um Grupo</Label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5">
                {gruposAtivos.map((g) => {
                  const count = operacoes.filter((o) => o.grupo_id === g.id).length;
                  return (
                    <button
                      key={g.id}
                      onClick={() => { setSelectedGrupoId(g.id); setTargetProfit(''); setStopLoss(''); }}
                      className={`px-2.5 py-2 rounded-lg border text-left transition ${
                        selectedGrupoId === g.id
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border hover:bg-accent'
                      }`}
                    >
                      <div className="text-xs font-medium truncate">{g.nome}</div>
                      <div className="text-[10px] text-muted-foreground">{count} op.</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Painel de controle: spot, IV, refresh */}
            {selectedGrupoId && (
              <Card data-tour="opcoes-spot">
                <CardContent className="p-4 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="text-xs text-muted-foreground uppercase">Ativo Base</div>
                        <div className="text-lg font-bold">{ativoBase || '—'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground uppercase">Spot</div>
                        <div className="text-lg font-bold font-mono">
                          {spotPrice != null ? `R$ ${spotPrice.toFixed(2)}` : '—'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground uppercase">P&L Teórico</div>
                        <div className={`text-lg font-bold font-mono ${unrealizedPnL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {unrealizedPnL >= 0 ? '+' : ''}R$ {unrealizedPnL.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchSpot} disabled={refreshing || !ativoBase}>
                      <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                      Atualizar
                    </Button>
                  </div>

                  {/* IV slider */}
                  <div className="flex items-center gap-3">
                    <Label className="text-xs whitespace-nowrap w-20">Volatilidade (IV):</Label>
                    <input
                      type="range"
                      min="0.05"
                      max="1"
                      step="0.01"
                      value={iv}
                      onChange={(e) => setIv(Number(e.target.value))}
                      className="flex-1 accent-primary cursor-pointer"
                    />
                    <span className="text-sm font-mono font-bold w-12 text-right">{(iv * 100).toFixed(0)}%</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tabs */}
            {selectedGrupoId && legs.length > 0 && spotPrice != null && (
              <>
                <div className="flex gap-1 border-b overflow-x-auto" data-tour="opcoes-tabs">
                  {tabs.map((t) => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                          tab === t.id
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {t.label}
                      </button>
                    );
                  })}
                </div>

                {/* Tab content */}
                {tab === 'payoff' && (
                  <div className="space-y-4">
                    {simulatedLegs && (
                      <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-primary/40 bg-primary/5 text-sm">
                        <span>Exibindo <strong>simulação pós-rolagem</strong> — payoff, gregas e margem refletem a posição resultante.</span>
                        <Button variant="outline" size="sm" onClick={() => setSimulatedLegs(null)}>Voltar à posição atual</Button>
                      </div>
                    )}
                    <PayoffChart
                      legs={displayLegs}
                      spotPrice={spotPrice}
                      iv={iv}
                      interestRate={INTEREST_RATE}
                      ticker={ativoBase}
                    />
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Gregas do Portfólio</h3>
                      <PainelGreeks greeks={greeks} />
                    </div>
                    <PainelRiscoMargem legs={displayLegs} spotPrice={spotPrice} />
                  </div>
                )}

                {tab === 'rolagem' && (
                  <div className="space-y-6">
                    <CalculadoraRolagem
                      operacoes={grupoOps}
                      ativoBase={ativoBase}
                      spotPrice={spotPrice}
                      onSimulate={(simLegs) => { setSimulatedLegs(simLegs); setTab('payoff'); }}
                    />

                    <div className="border-t pt-4 space-y-4">
                      <Card>
                        <CardContent className="p-4 space-y-3">
                          <h3 className="text-sm font-semibold">Configuração de Monitoramento Proativo</h3>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label htmlFor="target" className="text-xs">Meta de Lucro (R$)</Label>
                              <Input
                                id="target"
                                type="number"
                                value={targetProfit}
                                onChange={(e) => setTargetProfit(e.target.value)}
                                placeholder="Ex: 500"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="stop" className="text-xs">Stop Loss (R$)</Label>
                              <Input
                                id="stop"
                                type="number"
                                value={stopLoss}
                                onChange={(e) => setStopLoss(e.target.value)}
                                placeholder="Ex: 300"
                              />
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Defina metas e stops para ativar sugestões automáticas de encerramento e rolagem.
                          </p>
                        </CardContent>
                      </Card>
                      <RolagemProativa diagnostico={diagnostico} />
                    </div>
                  </div>
                )}

                {tab === 'cenarios' && (
                  <AnaliseCenarios
                    legs={legs}
                    spotPrice={spotPrice}
                    iv={iv}
                    interestRate={INTEREST_RATE}
                    ticker={ativoBase}
                  />
                )}
              </>
            )}

            {/* Empty state quando grupo selecionado sem dados suficientes */}
            {selectedGrupoId && (legs.length === 0 || spotPrice == null) && (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    {legs.length === 0
                      ? 'Este grupo não possui operações abertas.'
                      : 'Não foi possível obter a cotação do ativo base. Verifique o ticker e tente atualizar.'}
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
        </>
        )}
      </div>
    </div>
  );
}