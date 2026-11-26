import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles, ScanSearch, Loader2, AlertTriangle, Info } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import MacroStrip from '@/components/monitora-ai/MacroStrip';
import CarteiraResumo from '@/components/monitora-ai/CarteiraResumo';
import OportunidadeCard from '@/components/monitora-ai/OportunidadeCard';
import ComitePanel from '@/components/monitora-ai/ComitePanel';
import SinaisPanel from '@/components/monitora-ai/SinaisPanel';
import { getOfficialMacroRates, getBatchQuotes, quotesToMap } from '@/lib/monitora-ai/marketEngine';
import { analyzeOpenGroups } from '@/lib/monitora-ai/portfolioEngine';
import { scanTemplatesForAsset, buildOpportunityRecord } from '@/lib/monitora-ai/opportunityEngine';
import { validateOpportunityAgainstRisk, classifyRiskLevel } from '@/lib/monitora-ai/riskEngine';
import { persistOpportunities, updateOpportunityStatus, evaluateSignals } from '@/lib/monitora-ai/signalEngine';

const FALLBACK_TICKERS = ['PETR4', 'VALE3', 'ITUB4', 'BBAS3', 'WEGE3'];

function parseAgentes(json) {
  try {
    const list = JSON.parse(json || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export default function MonitoraAI() {
  const queryClient = useQueryClient();
  const [ativoSel, setAtivoSel] = useState('');
  const [scanning, setScanning] = useState(false);
  const [running, setRunning] = useState(false);
  const [avaliando, setAvaliando] = useState(false);

  const { data: macro, isLoading: loadingMacro } = useQuery({
    queryKey: ['monitora-ai-macro'],
    queryFn: getOfficialMacroRates,
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: openOps = [], isLoading: loadingOps } = useQuery({
    queryKey: ['monitora-ai-open-ops'],
    queryFn: async () => (await base44.entities.Operacao.filter({ status: 'ABERTA' }, { sort: '-data_abertura', limit: 200 })).items || [],
    refetchInterval: 5 * 60 * 1000,
  });

  const tickers = useMemo(() => {
    const set = new Set((openOps || []).map((o) => o.ativo_base).filter(Boolean));
    FALLBACK_TICKERS.forEach((t) => set.add(t));
    return [...set].slice(0, 8);
  }, [openOps]);

  const { data: quotes = [] } = useQuery({
    queryKey: ['monitora-ai-quotes', tickers.join(',')],
    queryFn: () => getBatchQuotes(tickers),
    enabled: tickers.length > 0,
    refetchInterval: 2 * 60 * 1000,
  });

  const { data: oportunidades = [], isLoading: loadingOportunidades } = useQuery({
    queryKey: ['monitora-ai-oportunidades'],
    queryFn: async () => (await base44.entities.AiOportunidade.filter({}, { sort: '-created_date', limit: 24 })).items || [],
  });

  const { data: analises = [], isLoading: loadingAnalises } = useQuery({
    queryKey: ['monitora-ai-analises'],
    queryFn: async () => (await base44.entities.AiAnalise.filter({}, { sort: '-created_date', limit: 6 })).items || [],
  });

  const { data: sinais = [] } = useQuery({
    queryKey: ['monitora-ai-sinais'],
    queryFn: async () => (await base44.entities.AiResultadoSinal.filter({}, { sort: '-created_date', limit: 20 })).items || [],
  });

  const quotesMap = useMemo(() => quotesToMap(quotes), [quotes]);
  const groups = useMemo(
    () => analyzeOpenGroups(openOps, quotesMap, { selicDecimal: macro?.selicDecimal ?? 0.1325 }),
    [openOps, quotesMap, macro]
  );
  const ativos = useMemo(() => {
    const doPortfolio = [...new Set(groups.map((g) => g.ativoBase).filter(Boolean))];
    return [...new Set([...doPortfolio, ...FALLBACK_TICKERS])].slice(0, 6);
  }, [groups]);

  const ativo = ativoSel || ativos[0] || '';
  const analiseAtual = analises[0]
    ? { ...analises[0], agentes: parseAgentes(analises[0].agentes_json) }
    : null;

  const avisos = [];
  if (macro?.indisponivel) avisos.push('BCB indisponível: a Selic usada é premissa padrão, não dado oficial.');
  if (!quotes.length) avisos.push('Cotações OpLab indisponíveis: o spot usa o preço de entrada das operações.');
  avisos.push('Limites de risco por capital não são avaliados: a plataforma não guarda saldo de conta. Veto por risco ilimitado e concentração seguem ativos.');
  if (groups.some((g) => g.spotSource === 'entrada')) avisos.push('Alguns grupos sem cotação atual — P&L calculado sobre o preço de entrada.');

  async function handleScan() {
    if (!ativo) return;
    const spot = quotesMap[ativo];
    if (!spot) {
      toast({ title: 'Cotação indisponível', description: `Não foi possível obter o spot de ${ativo}.`, variant: 'destructive' });
      return;
    }
    setScanning(true);
    try {
      const { candidates, chainAvailable } = await scanTemplatesForAsset({
        ativoBase: ativo,
        spotPrice: spot,
        selicDecimal: macro?.selicDecimal ?? 0.1325,
        selicMeta: macro?.selicMeta,
      });

      if (!chainAvailable) {
        toast({ title: 'Cadeia indisponível', description: `A OpLab não retornou a cadeia de ${ativo}. Nenhum cálculo foi registrado.`, variant: 'destructive' });
        return;
      }
      if (!candidates.length) {
        toast({ title: 'Sem estruturas resolvidas', description: `Nenhum template do catálogo pôde ser montado com a cadeia atual de ${ativo}.`, variant: 'destructive' });
        return;
      }

      const records = candidates.map((c) => {
        const validation = validateOpportunityAgainstRisk({
          opportunity: c,
          portfolioGroups: groups,
          capitalTotalBrl: 0,
        });
        return buildOpportunityRecord(c, validation, {
          nivelRisco: classifyRiskLevel(validation, c.scoreQuant, c.quant?.marginEstimate?.riskLevel),
        });
      });

      await persistOpportunities(records);
      const vetadas = records.filter((r) => r.status === 'VETADA_RISCO').length;
      toast({
        title: `${records.length} oportunidade(s) registradas`,
        description: vetadas ? `${vetadas} vetada(s) pelo motor de risco.` : 'Todas enquadradas nos limites de risco.',
      });
      queryClient.invalidateQueries({ queryKey: ['monitora-ai-oportunidades'] });
    } catch (error) {
      toast({ title: 'Falha na varredura', description: error?.message || 'Erro ao consultar a cadeia.', variant: 'destructive' });
    } finally {
      setScanning(false);
    }
  }

  async function handleComite() {
    setRunning(true);
    try {
      const res = await base44.functions.invoke('monitoraAI', {
        action: 'committee',
        rotina_etapa: 'SOB_DEMANDA',
        tickers,
        quantPayload: {
          macro: macro ? {
            selicPct: macro.selicPct,
            selicData: macro.selicMeta?.date,
            cdi: macro.cdi?.value ?? null,
            ptax: macro.ptax?.value ?? null,
            ipca12m: macro.ipca12m?.value ?? null,
          } : null,
          portfolioSummary: groups.map((g) => ({
            grupo: g.grupoNome,
            ativo: g.ativoBase,
            spot: g.spotPrice,
            spotOrigem: g.spotSource,
            pnlNaoRealizado: g.unrealizedPnL,
            margemEstimadaNaoOficial: g.estimatedMarginBrl,
          })),
          ressalvas: [
            'PoP é estimativa do modelo, não calibrada com histórico.',
            'Margem estimada é metodologia simplificada, não oficial da B3.',
          ],
        },
      });
      if (res.data?.error) throw new Error(res.data.error);

      // Persistência com o token do usuário: o registro fica isolado na conta (RLS owner)
      const snap = await base44.entities.AiSnapshotMercado.create(res.data.snapshot);
      await base44.entities.AiAnalise.create({ ...res.data.analise, snapshot_id: snap.id });

      toast({ title: 'Comitê executado', description: 'Análise registrada com snapshot de mercado.' });
      queryClient.invalidateQueries({ queryKey: ['monitora-ai-analises'] });
    } catch (error) {
      toast({ title: 'Comitê não executado', description: error?.message || 'Erro ao gerar a análise.', variant: 'destructive' });
    } finally {
      setRunning(false);
    }
  }

  async function handleStatus(op, status) {
    try {
      await updateOpportunityStatus(op.id, status);
      queryClient.invalidateQueries({ queryKey: ['monitora-ai-oportunidades'] });
    } catch (error) {
      toast({ title: 'Não foi possível atualizar', description: error?.message, variant: 'destructive' });
    }
  }

  async function handleAvaliar() {
    setAvaliando(true);
    try {
      const { avaliados, ignorados } = await evaluateSignals(oportunidades, quotesMap);
      toast({
        title: `${avaliados} sinal(is) avaliados`,
        description: ignorados > 0 ? `${ignorados} sem cotação ou estrutura neutra foram ignorados.` : 'Resultados atualizados com a cotação atual.',
      });
      queryClient.invalidateQueries({ queryKey: ['monitora-ai-sinais'] });
    } catch (error) {
      toast({ title: 'Falha ao avaliar sinais', description: error?.message, variant: 'destructive' });
    } finally {
      setAvaliando(false);
    }
  }

  return (
    <div className="max-w-[1600px] mx-auto px-3 md:px-6 py-4 md:py-6 space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h1 className="font-heading text-xl md:text-2xl font-bold">Monitora AI</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          Central de inteligência sob demanda — carteira, mercado e risco, com números calculados no app.
        </p>
      </div>

      {avisos.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 space-y-0.5">
          {avisos.map((a) => (
            <p key={a} className="text-[11px] text-amber-800 flex items-start gap-1.5">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" /> {a}
            </p>
          ))}
        </div>
      )}

      <MacroStrip macro={macro} loading={loadingMacro} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <CarteiraResumo groups={groups} loading={loadingOps} avisos={[]} />

          <section className="rounded-xl border bg-card">
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <ScanSearch className="w-4 h-4 text-muted-foreground" />
                <h2 className="font-heading text-sm font-semibold">Oportunidades</h2>
              </div>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleScan} disabled={scanning || !ativo}>
                {scanning ? <Loader2 className="w-3 h-3 animate-spin" /> : <ScanSearch className="w-3 h-3" />}
                {scanning ? 'Varrendo' : 'Varredura'}
              </Button>
            </div>

            <div className="px-4 py-2 border-b flex flex-wrap gap-1.5">
              {ativos.map((a) => (
                <button
                  key={a}
                  onClick={() => setAtivoSel(a)}
                  className={`px-2 py-0.5 rounded border text-[11px] transition-colors ${a === ativo ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-accent'}`}
                >
                  {a}
                </button>
              ))}
            </div>

            <div className="p-3 space-y-2">
              {loadingOportunidades ? (
                <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
              ) : !oportunidades.length ? (
                <p className="text-sm text-muted-foreground py-3">
                  Nenhuma oportunidade registrada. Escolha um ativo e rode a varredura — os números vêm da cadeia OpLab e dos módulos de cálculo do app.
                </p>
              ) : (
                oportunidades.map((op) => <OportunidadeCard key={op.id} op={op} onStatus={handleStatus} />)
              )}
            </div>

            <p className="px-4 py-2 border-t text-[10px] text-muted-foreground flex items-start gap-1">
              <Info className="w-3 h-3 mt-0.5 shrink-0" />
              Aprovar, vetar ou marcar como executada apenas registra o status. Nenhuma ordem é enviada à corretora.
            </p>
          </section>
        </div>

        <div className="space-y-4">
          <ComitePanel analise={analiseAtual} running={running} onRun={handleComite} loading={loadingAnalises} />
          <SinaisPanel sinais={sinais} avaliando={avaliando} onAvaliar={handleAvaliar} />
        </div>
      </div>
    </div>
  );
}