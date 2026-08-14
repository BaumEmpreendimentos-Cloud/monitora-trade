import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Receipt, Settings, AlertTriangle } from 'lucide-react';
import OnboardingFiscal from '@/components/irpf/OnboardingFiscal';
import { apurarImpostoRenda, mesLabel } from '@/lib/imposto';

const fmt = (v) => (v === null || v === undefined || v === '' ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const color = (v) => (v === null || v === undefined ? '' : v >= 0 ? 'text-emerald-600' : 'text-red-600');

export default function IRPF() {
  const [config, setConfig] = useState(null);
  const [ops, setOps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [configs, operacoes] = await Promise.all([
        base44.entities.ConfiguracaoFiscal.list('-created_date', 10),
        base44.entities.Operacao.list('-created_date', 5000),
      ]);
      const cfg = (configs && configs[0]) || null;
      setConfig(cfg);
      setOps(operacoes || []);
      if (!cfg || !cfg.onboarding_completo) setOnboardingOpen(true);
    } catch (e) { console.error('IRPF load error', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleOnboardingSubmit = async (dados) => {
    try {
      if (config?.id) {
        const updated = await base44.entities.ConfiguracaoFiscal.update(config.id, dados);
        setConfig(updated);
      } else {
        const created = await base44.entities.ConfiguracaoFiscal.create(dados);
        setConfig(created);
      }
      setOnboardingOpen(false);
    } catch (e) { console.error('onboarding submit error', e); }
  };

  const apuracao = config?.onboarding_completo ? apurarImpostoRenda(ops, config) : [];
  const totalAPagar = apuracao.reduce((s, a) => s + (a.impostoAPagar || 0), 0);
  const totalResultado = apuracao.reduce((s, a) => s + (a.resultadoBruto || 0), 0);
  const totalIRRF = apuracao.reduce((s, a) => s + (a.irrf || 0), 0);

  if (loading) {
    return <div className="p-4 md:p-8"><p className="text-sm text-muted-foreground">Carregando...</p></div>;
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold">Imposto de Renda</h1>
            <p className="text-sm text-muted-foreground">Apuração mensal de IR sobre operações de renda variável</p>
          </div>
          {config?.onboarding_completo && (
            <Button variant="outline" size="sm" onClick={() => setOnboardingOpen(true)}>
              <Settings className="w-4 h-4 mr-1" /> Configurar
            </Button>
          )}
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 dark:text-amber-200">
            Os cálculos apresentados são estimativas baseadas nos dados registrados no app. A responsabilidade pela conferência, exatidão e recolhimento dos impostos é exclusivamente do usuário. Consulte um contador para validação.
          </p>
        </div>

        {!config?.onboarding_completo ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Receipt className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold mb-1">Configuração inicial necessária</h3>
              <p className="text-sm text-muted-foreground mb-4">Para iniciar a apuração de imposto de renda, é necessário definir o mês inicial e informar se há prejuízos acumulados.</p>
              <Button onClick={() => setOnboardingOpen(true)}>Iniciar configuração</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card><CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Resultado Total</p>
                <p className={`text-lg font-bold ${color(totalResultado)}`}>R$ {fmt(totalResultado)}</p>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <p className="text-xs text-muted-foreground">IRRF Retido</p>
                <p className="text-lg font-bold">R$ {fmt(totalIRRF)}</p>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <p className="text-xs text-muted-foreground">IR a Pagar</p>
                <p className="text-lg font-bold text-red-600">R$ {fmt(totalAPagar)}</p>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Mês Inicial</p>
                <p className="text-lg font-bold">{config?.mes_inicio ? mesLabel(config.mes_inicio) : '—'}</p>
              </CardContent></Card>
            </div>

            {apuracao.length === 0 ? (
              <Card><CardContent className="p-8 text-center">
                <Receipt className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma operação fechada encontrada a partir do mês inicial.</p>
              </CardContent></Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 text-xs text-muted-foreground uppercase">
                          <th className="text-left p-2.5">Mês</th>
                          <th className="text-left p-2.5">Categoria</th>
                          <th className="text-left p-2.5">Tipo</th>
                          <th className="text-right p-2.5">Ops</th>
                          <th className="text-right p-2.5">Resultado</th>
                          <th className="text-right p-2.5">IRRF</th>
                          <th className="text-right p-2.5">Prejuízo Comp.</th>
                          <th className="text-right p-2.5">Alíq.</th>
                          <th className="text-right p-2.5">IR Devido</th>
                          <th className="text-right p-2.5">IR a Pagar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {apuracao.map((a, i) => (
                          <tr key={i} className="border-t hover:bg-accent/30">
                            <td className="p-2.5 font-medium whitespace-nowrap">{mesLabel(a.mes)}</td>
                            <td className="p-2.5">{a.categoriaLabel}</td>
                            <td className="p-2.5 text-muted-foreground">{a.tipo}</td>
                            <td className="p-2.5 text-right">{a.operacoes}</td>
                            <td className={`p-2.5 text-right ${color(a.resultadoBruto)}`}>{fmt(a.resultadoBruto)}</td>
                            <td className="p-2.5 text-right">{fmt(a.irrf)}</td>
                            <td className="p-2.5 text-right">{fmt(a.prejuizoCompensado)}</td>
                            <td className="p-2.5 text-right">{(a.aliquota * 100).toFixed(0)}%</td>
                            <td className="p-2.5 text-right">{a.isento ? <span className="text-emerald-600 text-xs font-medium">Isento</span> : fmt(a.impostoDevido)}</td>
                            <td className={`p-2.5 text-right font-medium ${a.impostoAPagar > 0 ? 'text-red-600' : ''}`}>{fmt(a.impostoAPagar)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      <OnboardingFiscal
        open={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
        onSubmit={handleOnboardingSubmit}
        configExistente={config}
      />
    </div>
  );
}