import React, { useState } from 'react';
import { Brain, Loader2, RefreshCw, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import CollapsibleCard from './CollapsibleCard';

const VIES_STYLE = {
  BULLISH: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  BEARISH: 'text-red-700 bg-red-50 border-red-200',
  NEUTRO: 'text-slate-600 bg-slate-50 border-slate-200',
};

// Etapas da rotina aceitas pela entidade AiAnalise
const ETAPAS = [
  { id: 'PRE_ABERTURA', label: 'Pré-abertura' },
  { id: 'PREGAO', label: 'Pregão' },
  { id: 'CRUZAMENTO', label: 'Cruzamento' },
  { id: 'POS_FECHAMENTO', label: 'Pós-fechamento' },
  { id: 'SOB_DEMANDA', label: 'Sob demanda' },
];

const etapaLabel = (id) => ETAPAS.find((e) => e.id === id)?.label || id;

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

export default function ComitePanel({ analise, running, onRun, loading }) {
  const [etapa, setEtapa] = useState('SOB_DEMANDA');

  return (
    <CollapsibleCard
      id="comite"
      icon={Brain}
      title="Comitê Monitora AI"
      subtitle="interpretação de IA"
      actions={
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onRun(etapa)} disabled={running}>
          {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          {running ? 'Processando' : 'Executar comitê'}
        </Button>
      }
    >
      <div className="px-4 py-2 border-b">
        <div className="flex flex-wrap gap-1.5">
          {ETAPAS.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setEtapa(e.id)}
              className={`px-2 py-0.5 rounded border text-xs transition-colors ${etapa === e.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-accent'}`}
            >
              {e.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          A leitura é gerada para a etapa escolhida, com dados observados e métricas calculadas no app.
        </p>
      </div>

      {loading ? (
        <div className="p-4 space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-16 w-full" /></div>
      ) : !analise ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          Nenhuma análise gerada. O comitê recebe apenas dados observados e métricas calculadas no app.
        </p>
      ) : (
        <div className="px-4 py-3 space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {analise.regime_mercado && (
              <span className="text-xs font-medium px-2 py-1 rounded border border-border bg-muted text-foreground/80">Regime: {analise.regime_mercado}</span>
            )}
            {analise.rotina_etapa && (
              <span className="text-xs font-medium px-2 py-1 rounded border border-border bg-muted text-foreground/80">Etapa: {etapaLabel(analise.rotina_etapa)}</span>
            )}
            {analise.correlacao_chave && (
              <span className="text-xs font-medium px-2 py-1 rounded border border-border bg-muted text-foreground/80">{analise.correlacao_chave}</span>
            )}
            <span className="text-xs text-foreground/70 inline-flex items-center gap-1 ml-auto">
              <Clock className="w-3.5 h-3.5" /> {fmtDate(analise.gerado_em)}
            </span>
          </div>

          <p className="text-sm leading-relaxed">{analise.resumo_executivo}</p>

          {!!analise.agentes?.length && (
            <ul className="space-y-1.5">
              {analise.agentes.map((a, i) => (
                <li key={`${a.nome}-${i}`} className="rounded-lg border border-border bg-muted/40 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground">{a.nome}</span>
                    {a.vies && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${VIES_STYLE[String(a.vies).toUpperCase()] || VIES_STYLE.NEUTRO}`}>{a.vies}</span>
                    )}
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed mt-1">{a.leitura}</p>
                </li>
              ))}
            </ul>
          )}

          <p className="text-xs text-foreground/70">
            {analise.modelo_ia ? `Modelo: ${analise.modelo_ia} · ` : ''}Vinculada ao snapshot {analise.snapshot_id ? `#${analise.snapshot_id.slice(-6)}` : '—'} · conteúdo interpretativo, não recomendação.
          </p>
        </div>
      )}
    </CollapsibleCard>
  );
}