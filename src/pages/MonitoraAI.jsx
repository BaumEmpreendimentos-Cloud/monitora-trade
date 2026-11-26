import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles, ScanSearch, Loader2, AlertTriangle, Info, SlidersHorizontal, Star } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import MacroStrip from '@/components/monitora-ai/MacroStrip';
import CotacoesMonitoradas from '@/components/monitora-ai/CotacoesMonitoradas';
import NoticiasMercado from '@/components/monitora-ai/NoticiasMercado';
import CarteiraResumo from '@/components/monitora-ai/CarteiraResumo';
import PainelRiscoCarteira from '@/components/monitora-ai/PainelRiscoCarteira';
import OportunidadeCard from '@/components/monitora-ai/OportunidadeCard';
import ExecutarOportunidadeDialog from '@/components/monitora-ai/ExecutarOportunidadeDialog';
import OperacoesMonitora from '@/components/monitora-ai/OperacoesMonitora';
import ComitePanel from '@/components/monitora-ai/ComitePanel';
import DesempenhoSinais from '@/components/monitora-ai/DesempenhoSinais';
import SinaisPanel from '@/components/monitora-ai/SinaisPanel';
import CollapsibleCard from '@/components/monitora-ai/CollapsibleCard';
import PreferenciasMonitora from '@/components/monitora-ai/PreferenciasMonitora';
import { getOfficialMacroRates, getBatchQuotes, quotesToMap } from '@/lib/monitora-ai/marketEngine';
import { analyzeOpenGroups } from '@/lib/monitora-ai/portfolioEngine';
import { scanTemplatesForAsset, buildOpportunityRecord, DEFAULT_TEMPLATE_IDS } from '@/lib/monitora-ai/opportunityEngine';
import { validateOpportunityAgainstRisk, classifyRiskLevel } from '@/lib/monitora-ai/riskEngine';
import { persistOpportunities, updateOpportunityStatus, evaluateSignals, diagnosticarSinais } from '@/lib/monitora-ai/signalEngine';
import { normalizarAtivos, normalizarEstrategias, ativosEfetivos, normalizarCapital, MAX_ATIVOS } from '@/lib/monitora-ai/preferences';
import { normalizarMetaCollar } from '@/lib/collar';
import { toList } from '@/lib/toList';

const STATUS_ACOMPANHADOS = ['APROVADA', 'EXECUTADA'];

// Avisos das rotinas somem sozinhos após 2 segundos
const notificar = (props) => toast({ duration: 2000, ...props });

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
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [salvandoPrefs, setSalvandoPrefs] = useState(false);
  const [opExecutando, setOpExecutando] = useState(null);

  const { data: macro, isLoading: loadingMacro } = useQuery({
    queryKey: ['monitora-ai-macro'],
    queryFn: getOfficialMacroRates,
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: prefs } = useQuery({
    queryKey: ['monitora-ai-prefs'],
    queryFn: async () => {
      const me = await base44.auth.me();
      return {
        ativos: normalizarAtivos(me?.monitora_ativos),
        estrategias: normalizarEstrategias(me?.monitora_estrategias),
        metaCollar: normalizarMetaCollar(me?.monitora_collar_meta),
        capitalRef: normalizarCapital(me?.monitora_capital_ref),
      };
    },
  });

  const { data: openOps = [], isLoading: loadingOps } = useQuery({
    queryKey: ['monitora-ai-open-ops'],
    queryFn: async () => toList(await base44.entities.Operacao.filter({ status: 'ABERTA' }, { sort: '-data_abertura', limit: 200 })),
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: oportunidades = [], isLoading: loadingOportunidades } = useQuery({
    queryKey: ['monitora-ai-oportunidades'],
    queryFn: async () => toList(await base44.entities.AiOportunidade.filter({}, { sort: '-created_date', limit: 24 })),
  });

  const { data: analises = [], isLoading: loadingAnalises } = useQuery({
    queryKey: ['monitora-ai-analises'],
    queryFn: async () => toList(await base44.entities.AiAnalise.filter({}, { sort: '-created_date', limit: 6 })),
  });

  const { data: operacoesMonitora = [] } = useQuery({
    queryKey: ['monitora-ai-operacoes-monitora'],
    queryFn: async () => toList(await base44.entities.Operacao.filter({ origem: 'MONITORA_AI' }, { sort: '-data_abertura', limit: 200 })),
  });

  const { data: sinais = [] } = useQuery({
    queryKey: ['monitora-ai-sinais'],
    queryFn: async () => toList(await base44.entities.AiResultadoSinal.filter({}, { sort: '-created_date', limit: 20 })),
  });

  const ativosMonitorados = useMemo(() => ativosEfetivos(prefs?.ativos), [prefs]);
  const favoritas = useMemo(() => prefs?.estrategias || [], [prefs]);

  // Cotações priorizam os ativos com oportunidade aprovada/executada, para que os sinais possam ser avaliados
  const tickers = useMemo(() => {
    const emAcompanhamento = oportunidades
      .filter((o) => STATUS_ACOMPANHADOS.includes(o.status))
      .map((o) => o.ativo_base);
    // Posições abertas vêm antes: sem cotação, o P&L do grupo cai no preço de entrada
    const doPortfolio = (openOps || []).map((o) => o.ativo_base || o.ativo);
    return [...new Set([...emAcompanhamento, ...doPortfolio, ...ativosMonitorados].filter(Boolean))].slice(0, 16);
  }, [oportunidades, ativosMonitorados, openOps]);

  const { data: quotes = [] } = useQuery({
    queryKey: ['monitora-ai-quotes', tickers.join(',')],
    queryFn: () => getBatchQuotes(tickers),
    enabled: tickers.length > 0,
    refetchInterval: 2 * 60 * 1000,
  });

  const quotesMap = useMemo(() => quotesToMap(quotes), [quotes]);

  // IV por ativo: aproveita a IV de referência da última oportunidade registrada do ativo
  const ivMap = useMemo(() => {
    const mapa = {};
    [...oportunidades].forEach((o) => {
      const iv = Number(o.iv_referencia) / 100;
      if (o.ativo_base && iv > 0.02) mapa[o.ativo_base] = iv;
    });
    return mapa;
  }, [oportunidades]);

  const groups = useMemo(
    () => analyzeOpenGroups(openOps, quotesMap, { selicDecimal: macro?.selicDecimal ?? 0.1325, ivMap }),
    [openOps, quotesMap, macro, ivMap]
  );

  const ativos = useMemo(() => {
    const doPortfolio = [...new Set(groups.map((g) => g.ativoBase).filter(Boolean))];
    const comOportunidade = [...new Set(oportunidades.map((o) => o.ativo_base).filter(Boolean))];
    return [...new Set([...ativosMonitorados, ...doPortfolio, ...comOportunidade])].slice(0, MAX_ATIVOS);
  }, [ativosMonitorados, groups, oportunidades]);

  const ativo = ativoSel || ativos[0] || '';

  // Executadas e encerradas saem do quadro de oportunidades (seguem em Operações)
  const oportunidadesQuadro = useMemo(
    () => oportunidades.filter((o) => !['EXECUTADA', 'EXPIRADA'].includes(o.status)),
    [oportunidades]
  );

  // Ativo selecionado na barra de chips filtra o quadro (sem seleção = todos)
  const oportunidadesDoAtivo = useMemo(
    () => (ativoSel ? oportunidadesQuadro.filter((o) => o.ativo_base === ativoSel) : oportunidadesQuadro),
    [oportunidadesQuadro, ativoSel]
  );

  // Estratégias preferidas aparecem primeiro, sem esconder as demais
  const oportunidadesOrdenadas = useMemo(() => {
    const peso = (o) => (favoritas.includes(o.template_id) ? 1 : 0);
    return [...oportunidadesDoAtivo].sort((a, b) => {
      const diff = peso(b) - peso(a);
      if (diff !== 0) return diff;
      return String(b.created_date || '').localeCompare(String(a.created_date || ''));
    });
  }, [oportunidadesDoAtivo, favoritas]);

  const diagnostico = useMemo(() => diagnosticarSinais(oportunidades, quotesMap), [oportunidades, quotesMap]);

  const analiseAtual = analises[0]
    ? { ...analises[0], agentes: parseAgentes(analises[0].agentes_json) }
    : null;

  const avisos = [];
  if (macro?.indisponivel) avisos.push('BCB indisponível: a Selic usada é premissa padrão, não dado oficial.');
  if (!quotes.length) avisos.push('Cotações OpLab indisponíveis: o spot usa o preço de entrada das operações.');
  if (!prefs?.capitalRef) avisos.push('Sem capital de referência informado: os vetos de risco por operação (1,5%) e de margem (35%) não são avaliados. Informe o capital em "Ativos e estratégias".');
  const gruposSemCotacao = groups.filter((g) => g.spotSource === 'entrada');
  if (gruposSemCotacao.length) {
    const nomes = [...new Set(gruposSemCotacao.map((g) => g.grupoNome))].join(', ');
    avisos.push(`Sem cotação atual em ${nomes} — P&L calculado sobre o preço de entrada.`);
  }

  async function handleScan() {
    if (!ativo) return;
    const spot = quotesMap[ativo];
    if (!spot) {
      notificar({ title: 'Cotação indisponível', description: `Não foi possível obter o spot de ${ativo}.`, variant: 'destructive' });
      return;
    }
    setScanning(true);
    try {
      const { candidates, chainAvailable } = await scanTemplatesForAsset({
        ativoBase: ativo,
        spotPrice: spot,
        selicDecimal: macro?.selicDecimal ?? 0.1325,
        selicMeta: macro?.selicMeta,
        collarMeta: prefs?.metaCollar,
        // Varre as estratégias preferidas além das padrão do catálogo
        templateIds: [...new Set([...favoritas, ...DEFAULT_TEMPLATE_IDS])],
      });

      if (!chainAvailable) {
        notificar({ title: 'Cadeia indisponível', description: `A OpLab não retornou a cadeia de ${ativo}. Nenhum cálculo foi registrado.`, variant: 'destructive' });
        return;
      }
      if (!candidates.length) {
        notificar({ title: 'Sem estruturas resolvidas', description: `Nenhum template do catálogo pôde ser montado com a cadeia atual de ${ativo}.`, variant: 'destructive' });
        return;
      }

      const records = candidates.map((c) => {
        const validation = validateOpportunityAgainstRisk({
          opportunity: c,
          portfolioGroups: groups,
          capitalTotalBrl: prefs?.capitalRef || 0,
        });
        return buildOpportunityRecord(c, validation, {
          nivelRisco: classifyRiskLevel(validation, c.scoreQuant, c.quant?.marginEstimate?.riskLevel),
        });
      });

      await persistOpportunities(records);
      const vetadas = records.filter((r) => r.status === 'VETADA_RISCO').length;
      notificar({
        title: `${records.length} oportunidade(s) registradas`,
        description: vetadas ? `${vetadas} vetada(s) pelo motor de risco.` : 'Todas enquadradas nos limites de risco.',
      });
      queryClient.invalidateQueries({ queryKey: ['monitora-ai-oportunidades'] });
    } catch (error) {
      notificar({ title: 'Falha na varredura', description: error?.message || 'Erro ao consultar a cadeia.', variant: 'destructive' });
    } finally {
      setScanning(false);
    }
  }

  async function handleSalvarPreferencias({ ativos: novosAtivos, estrategias, metaCollar, capitalRef }) {
    setSalvandoPrefs(true);
    try {
      const listaAtivos = normalizarAtivos(novosAtivos);
      const listaEstrategias = normalizarEstrategias(estrategias);
      await base44.auth.updateMe({
        monitora_ativos: listaAtivos,
        monitora_estrategias: listaEstrategias,
        monitora_collar_meta: normalizarMetaCollar(metaCollar),
        monitora_capital_ref: normalizarCapital(capitalRef),
      });
      await queryClient.invalidateQueries({ queryKey: ['monitora-ai-prefs'] });
      setPrefsOpen(false);
      notificar({
        title: 'Preferências salvas',
        description: `${listaAtivos.length} ativo(s) monitorado(s) · ${listaEstrategias.length} estratégia(s) preferida(s).`,
      });
    } catch (error) {
      notificar({ title: 'Não foi possível salvar', description: error?.message, variant: 'destructive' });
    } finally {
      setSalvandoPrefs(false);
    }
  }

  async function handleComite(etapa = 'SOB_DEMANDA') {
    setRunning(true);
    try {
      const res = await base44.functions.invoke('monitoraAI', {
        action: 'committee',
        rotina_etapa: etapa,
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

      notificar({ title: 'Comitê executado', description: 'Análise registrada com snapshot de mercado.' });
      queryClient.invalidateQueries({ queryKey: ['monitora-ai-analises'] });
    } catch (error) {
      notificar({ title: 'Comitê não executado', description: error?.message || 'Erro ao gerar a análise.', variant: 'destructive' });
    } finally {
      setRunning(false);
    }
  }

  async function handleStatus(op, status) {
    try {
      await updateOpportunityStatus(op.id, status);
      queryClient.invalidateQueries({ queryKey: ['monitora-ai-oportunidades'] });
    } catch (error) {
      notificar({ title: 'Não foi possível atualizar', description: error?.message, variant: 'destructive' });
    }
  }

  async function handleExecutada(grupo) {
    notificar({
      title: 'Operação executada',
      description: `Grupo "${grupo?.nome || ''}" gravado em Operações e no quadro de acompanhamento.`,
    });
    queryClient.invalidateQueries({ queryKey: ['monitora-ai-oportunidades'] });
    queryClient.invalidateQueries({ queryKey: ['monitora-ai-open-ops'] });
    queryClient.invalidateQueries({ queryKey: ['monitora-ai-operacoes-monitora'] });
  }

  async function handleEncerrarSinal(sinal) {
    try {
      await base44.entities.AiResultadoSinal.delete(sinal.id);
      if (sinal.oportunidade_id) await updateOpportunityStatus(sinal.oportunidade_id, 'EXPIRADA');
      queryClient.invalidateQueries({ queryKey: ['monitora-ai-sinais'] });
      queryClient.invalidateQueries({ queryKey: ['monitora-ai-oportunidades'] });
      notificar({ title: 'Sinal encerrado', description: 'A oportunidade saiu do quadro de sinais.' });
    } catch (error) {
      notificar({ title: 'Não foi possível encerrar', description: error?.message, variant: 'destructive' });
    }
  }

  async function handleAvaliar() {
    setAvaliando(true);
    try {
      const res = await evaluateSignals(oportunidades, quotesMap);
      const partes = [];
      if (res.semCotacao) partes.push(`${res.semCotacao} sem cotação`);
      if (res.semReferencia) partes.push(`${res.semReferencia} sem preço de referência`);
      if (res.neutras) partes.push(`${res.neutras} estrutura(s) neutra(s)`);

      notificar({
        title: res.avaliados ? `${res.avaliados} sinal(is) avaliados` : 'Nenhum sinal avaliado',
        description: res.avaliados
          ? (partes.length ? `Ignorados: ${partes.join(' · ')}.` : 'Resultados atualizados com a cotação atual.')
          : (res.aprovadas
            ? `Há ${res.aprovadas} aprovada(s)/executada(s), mas ${partes.join(' · ') || 'sem dados suficientes para avaliar'}.`
            : 'Aprove ou marque como executada uma oportunidade antes de avaliar.'),
      });
      queryClient.invalidateQueries({ queryKey: ['monitora-ai-sinais'] });
    } catch (error) {
      notificar({ title: 'Falha ao avaliar sinais', description: error?.message, variant: 'destructive' });
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
            <p key={a} className="text-xs text-amber-800 flex items-start gap-1.5">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" /> {a}
            </p>
          ))}
        </div>
      )}

      <CotacoesMonitoradas quotes={quotes} />

      <MacroStrip macro={macro} loading={loadingMacro} />

      <NoticiasMercado />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <CarteiraResumo groups={groups} loading={loadingOps} avisos={[]} />
          <PainelRiscoCarteira groups={groups} loading={loadingOps} />

          <CollapsibleCard
            id="oportunidades"
            icon={ScanSearch}
            title="Oportunidades"
            subtitle="catálogo de estruturas"
            defaultOpen
            actions={
              <>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setPrefsOpen(true)}>
                  <SlidersHorizontal className="w-3 h-3" /> Ativos e estratégias
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleScan} disabled={scanning || !ativo}>
                  {scanning ? <Loader2 className="w-3 h-3 animate-spin" /> : <ScanSearch className="w-3 h-3" />}
                  {scanning ? 'Varrendo' : 'Varredura'}
                </Button>
              </>
            }
            footer={
              <div className="px-4 py-2 border-t text-xs text-muted-foreground space-y-1">
                <p className="flex items-start gap-1">
                  <Info className="w-3 h-3 mt-0.5 shrink-0" />
                  Fluxo: Ativa → Aprovada → Executada. Executar abre o cadastro das pernas (quantidade, ativo e preço) e grava a estrutura em Operações, onde o resultado é acompanhado. Nenhuma ordem é enviada à corretora.
                </p>
                {favoritas.length > 0 && (
                  <p className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-500" />
                    {favoritas.length} estratégia(s) preferida(s) marcadas com ★ e listadas primeiro.
                  </p>
                )}
              </div>
            }
          >
            <div className="px-4 py-2 border-b">
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setAtivoSel('')}
                  className={`px-2 py-0.5 rounded border text-xs transition-colors ${!ativoSel ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-accent'}`}
                >
                  Todos
                </button>
                {ativos.map((a) => (
                  <button
                    key={a}
                    onClick={() => setAtivoSel(a)}
                    className={`px-2 py-0.5 rounded border text-xs transition-colors ${a === ativoSel ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-accent'}`}
                  >
                    {a}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {ativoSel
                  ? `${oportunidadesOrdenadas.length} oportunidade(s) de ${ativoSel} · varredura em ${ativoSel}`
                  : `${oportunidadesOrdenadas.length} oportunidade(s) no quadro · clique em um ativo para filtrar`}
                {ativosMonitorados.length ? ` · ${ativosMonitorados.length} ativo(s) monitorado(s)` : ''} · ajuste em "Ativos e estratégias"
              </p>
            </div>

            <div className="p-3 space-y-2">
              {loadingOportunidades ? (
                <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
              ) : !oportunidadesOrdenadas.length ? (
                <p className="text-sm text-muted-foreground py-3">
                  {ativoSel
                    ? `Nenhuma oportunidade registrada para ${ativoSel}. Rode a varredura com esse ativo selecionado.`
                    : 'Nenhuma oportunidade registrada. Escolha um ativo e rode a varredura — os números vêm da cadeia OpLab e dos módulos de cálculo do app.'}
                </p>
              ) : (
                oportunidadesOrdenadas.map((op) => (
                  <OportunidadeCard
                    key={op.id}
                    op={op}
                    onStatus={handleStatus}
                    onExecutar={setOpExecutando}
                    favorita={favoritas.includes(op.template_id)}
                  />
                ))
              )}
            </div>
          </CollapsibleCard>
        </div>

        <div className="space-y-4">
          <ComitePanel analise={analiseAtual} running={running} onRun={handleComite} loading={loadingAnalises} />
          <OperacoesMonitora
            operacoes={operacoesMonitora}
            quotesMap={quotesMap}
            selicDecimal={macro?.selicDecimal ?? 0.1325}
            ivMap={ivMap}
          />
          <DesempenhoSinais sinais={sinais} diagnostico={diagnostico} />
          <SinaisPanel
            sinais={sinais}
            avaliando={avaliando}
            onAvaliar={handleAvaliar}
            onEncerrar={handleEncerrarSinal}
            diagnostico={diagnostico}
          />
        </div>
      </div>

      <ExecutarOportunidadeDialog
        open={!!opExecutando}
        onOpenChange={(v) => { if (!v) setOpExecutando(null); }}
        op={opExecutando}
        onSaved={handleExecutada}
      />

      <PreferenciasMonitora
        open={prefsOpen}
        onOpenChange={setPrefsOpen}
        ativos={ativosMonitorados}
        estrategias={favoritas}
        metaCollar={prefs?.metaCollar}
        capitalRef={prefs?.capitalRef}
        onSalvar={handleSalvarPreferencias}
        salvando={salvandoPrefs}
      />
    </div>
  );
}