import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import StrategyCatalog from '@/components/opcoes/StrategyCatalog';

export default function Estrategias() {
  const navigate = useNavigate();
  const [ativoBase, setAtivoBase] = useState('PETR4');
  const [spotPrice, setSpotPrice] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchSpot = useCallback(async () => {
    if (!ativoBase.trim()) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke('oplabMarket', { action: 'quote', tickers: ativoBase.trim().toUpperCase() });
      setSpotPrice(res.data?.quotes?.[0]?.close ?? null);
    } catch (e) {
      setSpotPrice(null);
    } finally {
      setLoading(false);
    }
  }, [ativoBase]);

  useEffect(() => { fetchSpot(); }, [fetchSpot]);

  // Escala os strikes do template proporcionalmente ao spot atual e envia ao Simulador
  const handleApplyTemplate = (template) => {
    const refPrice = 38; // preço de referência dos templates (PETR4)
    const scaledLegs = template.legs.map((leg, index) => {
      const offset = leg.strike > 0 ? (leg.strike - refPrice) : 0;
      const adjustedStrike = leg.strike > 0 ? Number(((spotPrice || refPrice) + offset).toFixed(2)) : 0;
      return {
        ...leg,
        id: `leg-${Date.now()}-${index}`,
        strike: adjustedStrike,
        ticker: leg.ticker,
      };
    });
    navigate('/opcoes', { state: {
      mode: 'simulador',
      template: { ...template, legs: scaledLegs },
      spotPrice: spotPrice || refPrice,
      ativoBase,
      strategyInfo: {
        name: template.name,
        detailedDescription: template.detailedDescription,
        b3PracticalTips: template.b3PracticalTips,
        marginRequirementB3: template.marginRequirementB3,
      },
    } });
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-[1400px] mx-auto space-y-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Estratégias</h1>
          <p className="text-sm text-muted-foreground">Catálogo de estruturas clássicas de opções B3 — clique para simular no Payoff</p>
        </div>

        <div className="flex flex-col md:flex-row md:items-end gap-3 p-4 rounded-xl border bg-card">
          <div className="space-y-1.5">
            <Label htmlFor="ativo">Ativo Base para Calibração</Label>
            <div className="flex gap-2">
              <Input id="ativo" value={ativoBase} onChange={(e) => setAtivoBase(e.target.value.toUpperCase())} placeholder="Ex: PETR4, BOVA11..." className="uppercase" />
              <Button onClick={fetchSpot} disabled={loading || !ativoBase.trim()}>
                <Search className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Buscar Spot
              </Button>
            </div>
          </div>
          {spotPrice != null && (
            <div className="md:ml-auto text-right">
              <div className="text-xs text-muted-foreground uppercase">Spot {ativoBase}</div>
              <div className="text-lg font-bold font-mono">R$ {spotPrice.toFixed(2)}</div>
            </div>
          )}
        </div>

        <StrategyCatalog onSelectTemplate={handleApplyTemplate} spotPrice={spotPrice} ativoBase={ativoBase} />
      </div>
    </div>
  );
}