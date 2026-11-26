import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Target, ShieldAlert, Lightbulb, TrendingUp } from 'lucide-react';

const priorityConfig = {
  CRITICAL: { color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-900', icon: ShieldAlert },
  HIGH: { color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-900', icon: AlertTriangle },
  MEDIUM: { color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-900', icon: Lightbulb },
  INFO: { color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border', icon: TrendingUp },
};

export default function RolagemProativa({ diagnostico }) {
  if (!diagnostico) return null;

  const { suggestions, overallRisk, portfolioDelta, dailyTheta, daysToNearestExpiry } = diagnostico;

  const riskColor = overallRisk === 'CRITICO' ? 'text-red-600'
    : overallRisk === 'ALTO' ? 'text-orange-600'
    : overallRisk === 'MODERADO' ? 'text-amber-600'
    : 'text-emerald-600';

  return (
    <div className="space-y-4">
      {/* Resumo de risco */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Risco Geral</div>
            <div className={`text-lg font-bold ${riskColor}`}>{overallRisk}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Delta</div>
            <div className="text-lg font-bold font-mono">{portfolioDelta.toFixed(1)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Theta/dia</div>
            <div className={`text-lg font-bold font-mono ${dailyTheta > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {dailyTheta >= 0 ? '+' : ''}{dailyTheta.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Venc. + Próx.</div>
            <div className="text-lg font-bold font-mono">{daysToNearestExpiry}d</div>
          </CardContent>
        </Card>
      </div>

      {/* Sugestões */}
      {suggestions.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Target className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhuma ação proativa necessária. Posição dentro dos parâmetros.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Defina meta de lucro e stop loss acima para ativar o monitoramento automático.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {suggestions.map((sug) => {
            const cfg = priorityConfig[sug.priority] || priorityConfig.INFO;
            const Icon = cfg.icon;
            return (
              <Card key={sug.id} className={`${cfg.border} ${cfg.bg}`}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <Icon className={`w-5 h-5 ${cfg.color} mt-0.5 shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-bold uppercase ${cfg.color}`}>{sug.priority}</span>
                        <h4 className="text-sm font-semibold">{sug.title}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{sug.triggerReason}</p>
                      <p className="text-xs mt-1">{sug.explanation}</p>
                      {sug.action && (
                        <div className="mt-2">
                          <span className="text-xs font-medium px-2 py-1 rounded bg-primary text-primary-foreground">
                            {sug.action}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}