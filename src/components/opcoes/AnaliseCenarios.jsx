import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Cpu, Loader2, Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { calculateBlackScholes, calculateExpiryPayoffAtPrice } from '@/lib/blackScholes';

const PRESET_SCENARIOS = [
  { title: 'Copom Eleva Selic (+0.50%)', desc: 'Alta de juros surpreendente pelo Banco Central, pressionando ações e alterando o carrego do Rho.' },
  { title: 'Queda de 10% nas Commodities', desc: 'Desaceleração global e queda brusca nos preços de commodities atingindo estatais e exportadoras.' },
  { title: 'Dólar R$ 6,00 + Aversão Fiscal', desc: 'Estresse na curva de juros futuros (DI), abertura de prêmio de risco e disparada de IV.' },
  { title: 'IV Crush Pós-Balanço (-12% IV)', desc: 'Divulgação de resultados corporativos com queda acelerada da volatilidade implícita.' },
];

export default function AnaliseCenarios({ legs, spotPrice, iv = 0.28, interestRate = 0.1325, ticker = '' }) {
  const [ivShock, setIvShock] = useState(0);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState(null);

  const percentageSteps = [-20, -15, -10, -5, 0, 5, 10, 15, 20];
  const timeHorizons = [
    { label: 'Hoje (D-0)', days: 22 },
    { label: 'D+7', days: 15 },
    { label: 'D+14', days: 7 },
    { label: 'Vencimento', days: 0 },
  ];

  const computePnL = useMemo(() => {
    return (pricePct, daysRemaining) => {
      const simSpot = spotPrice * (1 + pricePct / 100);
      const simIv = Math.max(0.05, iv + ivShock / 100);

      let initialNet = 0;
      legs.forEach((leg) => {
        initialNet += (leg.side === 'BUY' ? -1 : 1) * leg.premium * leg.quantity;
      });

      if (daysRemaining <= 0) {
        return initialNet + calculateExpiryPayoffAtPrice(legs, simSpot, spotPrice);
      }

      let simValue = 0;
      legs.forEach((leg) => {
        const mult = leg.side === 'BUY' ? 1 : -1;
        if (leg.type === 'STOCK') {
          simValue += mult * (simSpot - leg.premium) * leg.quantity;
        } else {
          const bs = calculateBlackScholes(simSpot, leg.strike, daysRemaining, simIv, interestRate, leg.type);
          simValue += mult * bs.price * leg.quantity;
        }
      });
      return initialNet + simValue;
    };
  }, [legs, spotPrice, iv, ivShock, interestRate]);

  const handleAiAnalysis = async (scenarioText) => {
    if (!legs.length || !spotPrice) return;
    setAiLoading(true);
    setAiError(null);
    setAiAnalysis(null);

    try {
      const legsDesc = legs.map((l) =>
        `${l.side === 'BUY' ? 'Compra' : 'Venda'} ${l.quantity}x ${l.type} ${l.ticker || ''} strike ${l.strike} prêmio R$ ${l.premium}`
      ).join('; ');

      const response = await base44.functions.invoke('analiseCenarios', {
        ticker,
        spotPrice,
        iv,
        ivShock,
        interestRate,
        legsDesc,
        scenarioText: scenarioText || '',
      });

      setAiAnalysis(response.data);
    } catch (err) {
      setAiError(err.message || 'Erro ao processar análise com IA.');
    } finally {
      setAiLoading(false);
    }
  };

  if (!legs.length || !spotPrice) {
    return (
      <p className="text-sm text-muted-foreground text-center py-10">
        Selecione um grupo com operações para visualizar a análise de cenários.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header + IV Shock slider */}
      <div className="bg-muted/50 border rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Cpu className="w-4 h-4 text-purple-500" />
            Matriz de Cenários & Teste de Estresse B3
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Simule variações de preço, choque de IV e horizontes de tempo.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-card border rounded-lg p-2.5 text-xs w-full md:w-auto">
          <span className="text-muted-foreground whitespace-nowrap">Choque de IV:</span>
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
            {ivShock > 0 ? '+' : ''}{ivShock}%
          </span>
        </div>
      </div>

      {/* Matriz de stress */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Matriz de P&L (R$) por Horizonte</h4>
            <span className="text-xs text-muted-foreground font-mono">
              IV Efetiva: {((iv + ivShock / 100) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs font-mono">
              <thead>
                <tr className="border-b text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                  <th className="py-2 px-2 text-left">Var.</th>
                  <th className="py-2 px-2 text-left">Preço</th>
                  {timeHorizons.map((h) => (
                    <th key={h.label} className={`py-2 px-2 ${h.label === 'Vencimento' ? 'text-emerald-500 font-bold' : ''}`}>
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {percentageSteps.map((pct) => {
                  const simPrice = spotPrice * (1 + pct / 100);
                  const isCurrent = pct === 0;
                  return (
                    <tr key={pct} className={isCurrent ? 'bg-muted/50 font-semibold' : 'hover:bg-muted/30'}>
                      <td className={`py-2 px-2 text-left font-bold ${pct > 0 ? 'text-emerald-600' : pct < 0 ? 'text-red-600' : ''}`}>
                        {pct > 0 ? '+' : ''}{pct}%
                      </td>
                      <td className="py-2 px-2 text-left text-muted-foreground">{simPrice.toFixed(2)}</td>
                      {timeHorizons.map((h) => {
                        const pnl = computePnL(pct, h.days);
                        const isExpiry = h.label === 'Vencimento';
                        return (
                          <td
                            key={h.label}
                            className={`py-2 px-2 ${pnl >= 0 ? 'text-emerald-600' : 'text-red-600'} ${isExpiry ? 'font-bold' : ''}`}
                          >
                            {pnl >= 0 ? '+' : ''}{pnl.toFixed(0)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Análise com IA */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <h4 className="text-sm font-semibold">Análise de Cenários com IA</h4>
          </div>

          {/* Cenários predefinidos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {PRESET_SCENARIOS.map((scn) => (
              <button
                key={scn.title}
                onClick={() => {
                  setSelectedScenario(scn.title);
                  handleAiAnalysis(scn.desc);
                }}
                disabled={aiLoading}
                className="text-left p-3 rounded-lg border border-border hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20 transition disabled:opacity-50"
              >
                <div className="text-xs font-semibold">{scn.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{scn.desc}</div>
              </button>
            ))}
          </div>

          {/* Botão de análise geral */}
          <Button
            onClick={() => handleAiAnalysis('')}
            disabled={aiLoading}
            className="w-full"
            variant="outline"
          >
            {aiLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Cpu className="w-4 h-4 mr-2" />}
            {aiLoading ? 'Analisando...' : 'Análise Geral com IA'}
          </Button>

          {/* Erro */}
          {aiError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{aiError}</span>
            </div>
          )}

          {/* Resultado */}
          {aiAnalysis && (
            <div className="space-y-3 border-t pt-3">
              {selectedScenario && (
                <div className="text-xs font-semibold text-purple-600">{selectedScenario}</div>
              )}
              <div className="space-y-2">
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase">Resumo Executivo</div>
                  <p className="text-sm mt-0.5">{aiAnalysis.executiveSummary}</p>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase">Impacto no P&L</div>
                  <p className="text-sm mt-0.5">{aiAnalysis.estimatedPnLImpact}</p>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase">Risco de Margem B3</div>
                  <p className="text-sm mt-0.5">{aiAnalysis.b3MarginRisk}</p>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Ações Recomendadas</div>
                  <ul className="space-y-1">
                    {(aiAnalysis.recommendedActions || []).map((action, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}