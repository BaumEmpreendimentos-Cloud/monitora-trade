import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldAlert, DollarSign, Scale, Flame, CheckCircle2 } from 'lucide-react';
import { calculateMarginAnalysis, classifyRiskReward } from '@/lib/margemB3';

const fmt = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const riskBadge = {
  CRITICO: 'text-red-600 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900',
  MODERADO: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900',
  BAIXO: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900',
};

export default function PainelRiscoMargem({ legs, spotPrice }) {
  const [spotDropStress, setSpotDropStress] = useState(10);

  const margin = useMemo(() => calculateMarginAnalysis(legs, spotPrice, spotDropStress), [legs, spotPrice, spotDropStress]);
  const riskReward = useMemo(() => classifyRiskReward(legs, spotPrice), [legs, spotPrice]);

  if (!legs?.length || !spotPrice) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        Selecione um grupo com operações para ver risco e margem.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-primary" /> Gerenciador de Risco & Margem B3
        </h3>
        <span className={`text-xs font-bold px-2 py-1 rounded border ${riskBadge[margin.riskLevel]}`}>
          RISCO {margin.riskLevel}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="uppercase font-medium">Margem B3 Estimada (CORE)</span>
              <Scale className="w-4 h-4" />
            </div>
            <div className="text-xl font-bold font-mono">{fmt(margin.netEstimatedMargin)}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {margin.hasShortRisk ? 'Exigência estimada de garantias pela corretora.' : 'Estrutura coberta ou de risco limitado. Margem praticamente zerada.'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="uppercase font-medium">Cobertura de Custódia</span>
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="text-lg font-bold">
              {margin.coveredCallQty > 0 ? `${margin.coveredCallQty} opções cobertas` : 'Sem ações em custódia'}
            </div>
            <p className="text-[11px] mt-1">
              {margin.uncoveredCallQty > 0 ? (
                <span className="text-red-600 font-semibold">Atenção: {margin.uncoveredCallQty} CALLs a descoberto.</span>
              ) : (
                <span className="text-emerald-600">Pontas de CALL cobertas ou travadas.</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="uppercase font-medium">Alívio por Travas</span>
              <DollarSign className="w-4 h-4" />
            </div>
            <div className="text-lg font-bold font-mono">{fmt(margin.spreadRelief)}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Redução de margem por opções compradas casadas com vendidas.</p>
          </CardContent>
        </Card>
      </div>

      {riskReward && (
        <Card>
          <CardContent className="p-4 grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-muted-foreground uppercase">Lucro Máximo Potencial</div>
              <div className="text-lg font-bold font-mono text-emerald-600">
                {riskReward.unlimitedProfit ? 'ILIMITADO' : fmt(riskReward.maxProfit)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase">Perda Máxima Potencial</div>
              <div className="text-lg font-bold font-mono text-red-600">
                {riskReward.unlimitedLoss ? 'ILIMITADA' : fmt(riskReward.maxLoss)}
              </div>
            </div>
            {riskReward.unlimitedLoss && (
              <p className="col-span-2 text-xs text-red-600">⚠️ Risco ilimitado na alta (CALL descoberta).</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Flame className="w-4 h-4 text-red-500" /> Estresse de Preço na Margem
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Choque no preço à vista (spot):</span>
            <span className="font-mono font-bold">± {spotDropStress}%</span>
          </div>
          <input
            type="range"
            min="5"
            max="30"
            step="5"
            value={spotDropStress}
            onChange={(e) => setSpotDropStress(Number(e.target.value))}
            className="w-full accent-primary cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
            <span>Queda: {fmt(margin.spotDropPrice)}</span>
            <span>Alta: {fmt(margin.spotSurgePrice)}</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t">
            <span className="text-xs text-muted-foreground">Margem estimada sob estresse</span>
            <span className="text-sm font-bold font-mono">{fmt(margin.marginUnderStress)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="text-[11px] text-muted-foreground space-y-1">
        <div className="flex items-center gap-1.5 font-semibold text-foreground">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Diretrizes de Risco B3
        </div>
        <ul className="list-disc pl-5 space-y-0.5">
          <li>Para posições vendidas a descoberto, mantenha colchão de liquidez de 30% a 50% além da margem exigida.</li>
          <li>Corretoras podem aplicar deságio sobre títulos e ações aceitos como garantia.</li>
          <li>Em rolagens durante estresse, a margem pode aumentar temporariamente na desmontagem/montagem simultânea.</li>
        </ul>
      </div>
    </div>
  );
}