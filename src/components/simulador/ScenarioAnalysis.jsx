import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Cpu, Loader2, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, ShieldAlert, ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { calculateStrategyPayoff, calculateBlackScholes } from '@/utils/blackScholes';

const fmtBRL = (v) => (v >= 0 ? `+R$ ${v.toFixed(2)}` : `-R$ ${Math.abs(v).toFixed(2)}`);

export default function ScenarioAnalysis({ legs, spotPrice, ticker, iv, interestRate }) {
  const [ivShock, setIvShock] = useState(0);
  const [customPrompt, setCustomPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiError, setAiError] = useState(null);

  const percentageSteps = [-20, -15, -10, -5, 0, 5, 10, 15, 20];

  const computePnLAtScenario = useMemo(() => {
    return (priceMultiplier, daysRemaining) => {
      const simSpot = spotPrice * (1 + priceMultiplier / 100);
      const simIv = Math.max(0.05, iv + ivShock / 100);

      let initialNet = 0;
      legs.forEach((leg) => {
        const mult = leg.side === 'BUY' ? -1 : 1;
        initialNet += mult * leg.premium * leg.quantity;
      });

      if (daysRemaining <= 0) {
        const { netProfitLoss } = calculateStrategyPayoff(legs, simSpot);
        return netProfitLoss;
      }

      let simValue = 0;
      legs.forEach((leg) => {
        const mult = leg.side === 'BUY' ? 1 : -1;
        if (leg.type === 'STOCK') {
          simValue += mult * (simSpot - leg.strike) * leg.quantity;
        } else {
          const bs = calculateBlackScholes(simSpot, leg.strike, daysRemaining, simIv, interestRate, leg.type);
          simValue += mult * bs.price * leg.quantity;
        }
      });

      return initialNet + simValue;
    };
  }, [legs, spotPrice, iv, ivShock, interestRate]);

  const handleTriggerAi = async (scenarioText) => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await base44.functions.invoke('analiseCenarios', {
        ticker,
        spotPrice,
        scenarioDescription: scenarioText,
        legs,
        interestRate,
        iv,
      });
      if (res.error) throw new Error(res.error);
      setAiAnalysis(res.analysis);
    } catch (err) {
      setAiError(err.message || 'Erro ao conectar com assistente de cenários.');
    } finally {
      setAiLoading(false);
    }
  };

  const presetScenarios = [
    { title: 'Copom Eleva Selic (+0.50%)', desc: 'Alta de juros surpreendente pelo Banco Central, pressionando ações e alterando o carrego do Rho.' },
    { title: 'Queda de 10% nas Commodities', desc: 'Desaceleração global e queda brusca nos preços de commodities atingindo estatais e exportadoras.' },
    { title: 'Aversão a Risco Fiscal e Dólar R$ 6,00', desc: 'Estresse na curva de juros futuros (DI), abertura de prêmio de risco e disparada de IV.' },
    { title: 'IV Crush Pós-Balanço (-12% IV)', desc: 'Divulgação de resultados corporativos com queda acelerada da volatilidade implícita.' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Cpu className="w-5 h-5 text-purple-500" />
              Matriz de Cenários & Teste de Estresse B3
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Simule variações simultâneas de preço, choque de IV e horizontes de tempo.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <Label className="whitespace-nowrap">Choque de IV:</Label>
            <input
              type="range"
              min="-15"
              max="25"
              step="1"
              value={ivShock}
              onChange={(e) => setIvShock(Number(e.target.value))}
              className="w-32 accent-purple-500 cursor-pointer"
            />
            <span className={`font-mono font-bold w-14 text-right ${ivShock > 0 ? 'text-purple-500' : ivShock < 0 ? 'text-amber-500' : 'text-muted-foreground'}`}>
              {ivShock > 0 ? `+${ivShock}%` : `${ivShock}%`}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Stress Matrix */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">Matriz de P&L (R$) por Horizonte Temporal</h3>
            <span className="text-[11px] text-muted-foreground font-mono">
              IV Efetiva: {((iv + ivShock / 100) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs font-mono">
              <thead>
                <tr className="border-b text-muted-foreground text-[11px] uppercase">
                  <th className="py-2 px-3 text-left">Var. (%)</th>
                  <th className="py-2 px-3 text-left">Preço Sim.</th>
                  <th className="py-2 px-3">Hoje (D-0)</th>
                  <th className="py-2 px-3">D+7</th>
                  <th className="py-2 px-3">D+14</th>
                  <th className="py-2 px-3 text-emerald-600 font-bold">Vencimento</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {percentageSteps.map((pct) => {
                  const simPrice = spotPrice * (1 + pct / 100);
                  const pnlD0 = computePnLAtScenario(pct, 22);
                  const pnlD7 = computePnLAtScenario(pct, 15);
                  const pnlD14 = computePnLAtScenario(pct, 7);
                  const pnlExpiry = computePnLAtScenario(pct, 0);
                  const isCurrent = pct === 0;
                  return (
                    <tr key={pct} className={`hover:bg-muted/40 ${isCurrent ? 'bg-muted/60 font-semibold' : ''}`}>
                      <td className="py-2 px-3 text-left font-bold">
                        <span className={pct > 0 ? 'text-emerald-600' : pct < 0 ? 'text-red-600' : ''}>
                          {pct > 0 ? '+' : ''}{pct}%
                        </span>
                      </td>
                      <td className="py-2 px-3 text-left">R$ {simPrice.toFixed(2)}</td>
                      <td className={`py-2 px-3 ${pnlD0 >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtBRL(pnlD0)}</td>
                      <td className={`py-2 px-3 ${pnlD7 >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtBRL(pnlD7)}</td>
                      <td className={`py-2 px-3 ${pnlD14 >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtBRL(pnlD14)}</td>
                      <td className={`py-2 px-3 font-bold ${pnlExpiry >= 0 ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20' : 'text-red-600 bg-red-50 dark:bg-red-950/20'}`}>
                        {fmtBRL(pnlExpiry)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* AI Scenario Analysis */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Cpu className="w-4 h-4 text-purple-500" />
            Análise de Cenários com IA (Gemini)
          </h3>

          {/* Preset scenarios */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {presetScenarios.map((s) => (
              <button
                key={s.title}
                onClick={() => handleTriggerAi(s.desc)}
                disabled={aiLoading}
                className="text-left p-3 border rounded-lg hover:bg-muted/40 transition disabled:opacity-50"
              >
                <div className="text-sm font-semibold">{s.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.desc}</div>
              </button>
            ))}
          </div>

          {/* Custom scenario */}
          <div className="flex gap-2">
            <Input
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Descreva um cenário personalizado..."
              onKeyDown={(e) => { if (e.key === 'Enter' && customPrompt.trim()) handleTriggerAi(customPrompt); }}
            />
            <Button onClick={() => customPrompt.trim() && handleTriggerAi(customPrompt)} disabled={aiLoading || !customPrompt.trim()}>
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            </Button>
          </div>

          {/* AI Error */}
          {aiError && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="w-4 h-4" />
              {aiError}
            </div>
          )}

          {/* AI Result */}
          {aiAnalysis && (
            <div className="space-y-3 p-4 border rounded-lg bg-purple-50 dark:bg-purple-950/10">
              <div>
                <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1">Resumo Executivo</div>
                <p className="text-sm">{aiAnalysis.executiveSummary}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Impacto no P&L
                  </div>
                  <p className="text-sm">{aiAnalysis.estimatedPnLImpact}</p>
                </div>
                <div>
                  <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> Risco de Margem B3
                  </div>
                  <p className="text-sm">{aiAnalysis.b3MarginRisk}</p>
                </div>
              </div>
              {aiAnalysis.recommendedActions && aiAnalysis.recommendedActions.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Ações Recomendadas
                  </div>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    {aiAnalysis.recommendedActions.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
