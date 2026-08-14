import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Receipt, Settings, AlertTriangle } from 'lucide-react';
import OnboardingFiscal from '@/components/irpf/OnboardingFiscal';
import DarfDialog from '@/components/irpf/DarfDialog';
import PainelCategoria from '@/components/irpf/PainelCategoria';
import { apurarImpostoRenda, mesLabel, CATEGORIAS_FISCAIS } from '@/lib/imposto';

const fmt = (v) => (v === null || v === undefined || v === '' ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const color = (v) => (v === null || v === undefined ? '' : v >= 0 ? 'text-emerald-600' : 'text-red-600');

export default function IRPF() {
  const { user } = useAuth();
  const [config, setConfig] = useState(null);
  const [ops, setOps] = useState([]);
  const [apuracoesSalvas, setApuracoesSalvas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [darfApuracao, setDarfApuracao] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [configs, operacoes, salvas] = await Promise.all([
        base44.entities.ConfiguracaoFiscal.list('-created_date', 10),
        base44.entities.Operacao.list('-created_date', 5000),
        base44.entities.ApuracaoMensal.list('-created_date', 5000),
      ]);
      const cfg = (configs && configs[0]) || null;
      setConfig(cfg);
      setOps(operacoes || []);
      setApuracoesSalvas(salvas || []);
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

  // Agrupa por categoria
  const apuracaoPorCategoria = {};
  apuracao.forEach((a) => {
    if (!apuracaoPorCategoria[a.categoria]) apuracaoPorCategoria[a.categoria] = [];
    apuracaoPorCategoria[a.categoria].push(a);
  });

  const darfMap = {};
  apuracoesSalvas.forEach((r) => {
    darfMap[`${r.mes}-${r.categoria}-${r.tipo}`] = r;
  });

  const handleDarfConfirm = async (apur) => {
    const key = `${apur.mes}-${apur.categoria}-${apur.tipoKey}`;
    const existing = darfMap[key];
    const dados = {
      mes: apur.mes,
      categoria: apur.categoria,
      tipo: apur.tipoKey,
      resultado_bruto: apur.resultadoBruto,
      irrf: apur.irrf,
      prejuizo_compensado: apur.prejuizoCompensado,
      prejuizo_acumulado_final: apur.prejuizoAcumuladoFinal,
      aliquota: apur.aliquota,
      imposto_devido: apur.impostoDevido,
      imposto_pagar: apur.impostoAPagar,
      darf_gerada: true,
      data_geracao_darf: new Date().toISOString(),
      aceite_responsabilidade: true,
    };
    try {
      let saved;
      if (existing?.id) {
        saved = await base44.entities.ApuracaoMensal.update(existing.id, { ...dados, pago: existing.pago, data_pagamento: existing.data_pagamento });
      } else {
        saved = await base44.entities.ApuracaoMensal.create(dados);
      }
      setApuracoesSalvas((p) => {
        const filtered = p.filter((r) => r.id !== saved.id);
        return [saved, ...filtered];
      });
      setDarfApuracao(null);
    } catch (e) { console.error('darf confirm error', e); }
  };

  const handleMarcarPago = async (apur) => {
    const key = `${apur.mes}-${apur.categoria}-${apur.tipoKey}`;
    const existing = darfMap[key];
    if (!existing) return;
    const novoPago = !existing.pago;
    try {
      const updated = await base44.entities.ApuracaoMensal.update(existing.id, {
        pago: novoPago,
        data_pagamento: novoPago ? new Date().toISOString() : null,
      });
      setApuracoesSalvas((p) => p.map((r) => (r.id === existing.id ? updated : r)));
    } catch (e) { console.error('marcar pago error', e); }
  };

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
              <div className="space-y-6">
                {Object.keys(CATEGORIAS_FISCAIS)
                  .filter((cat) => apuracaoPorCategoria[cat]?.length)
                  .map((cat) => (
                    <PainelCategoria
                      key={cat}
                      titulo={CATEGORIAS_FISCAIS[cat].label}
                      itens={apuracaoPorCategoria[cat]}
                      darfMap={darfMap}
                      onGerarDarf={setDarfApuracao}
                      onMarcarPago={handleMarcarPago}
                    />
                  ))}
              </div>
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
      <DarfDialog
        apuracao={darfApuracao}
        userName={user?.full_name}
        open={!!darfApuracao}
        onClose={() => setDarfApuracao(null)}
        onConfirm={handleDarfConfirm}
      />
    </div>
  );
}