import React from 'react';
import { Target } from 'lucide-react';
import { summarizeSignals } from '@/lib/monitora-ai/riskIndicators';

const pct = (v) => (Number.isFinite(Number(v)) ? `${Number(v) > 0 ? '+' : ''}${Number(v).toFixed(2)}%` : '—');

export default function DesempenhoSinais({ sinais = [] }) {
  const resumo = summarizeSignals(sinais);

  return (
    <section className="rounded-xl border bg-card">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b">
        <Target className="w-4 h-4 text-muted-foreground" />
        <h2 className="font-heading text-sm font-semibold">Desempenho dos sinais</h2>
        <span className="text-xs uppercase tracking-wide text-muted-foreground">histórico avaliado</span>
      </div>

      {!resumo.total ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          Nenhum sinal avaliado ainda. Aprove uma oportunidade e use "Avaliar sinais" para começar o acompanhamento.
        </p>
      ) : (
      <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="rounded-lg border bg-muted/40 px-3 py-2">
          <div className="text-xs text-foreground/70">Sinais avaliados</div>
          <div className="font-heading text-sm font-semibold tabular-nums mt-0.5">{resumo.total}</div>
          <div className="text-xs text-foreground/70 mt-0.5">{resumo.acompanhamento} em acompanhamento</div>
        </div>
        <div className="rounded-lg border bg-muted/40 px-3 py-2">
          <div className="text-xs text-foreground/70">Taxa de acerto</div>
          <div className="font-heading text-sm font-semibold tabular-nums mt-0.5">
            {resumo.taxaAcerto === null ? '—' : `${resumo.taxaAcerto}%`}
          </div>
          <div className="text-xs text-foreground/70 mt-0.5">{resumo.positivos} no alvo · {resumo.negativos} no stop</div>
        </div>
        <div className="rounded-lg border bg-muted/40 px-3 py-2">
          <div className="text-xs text-foreground/70">Retorno médio</div>
          <div className={`font-heading text-sm font-semibold tabular-nums mt-0.5 ${Number(resumo.retornoMedio) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {pct(resumo.retornoMedio)}
          </div>
          <div className="text-xs text-foreground/70 mt-0.5">por sinal avaliado</div>
        </div>
        <div className="rounded-lg border bg-muted/40 px-3 py-2">
          <div className="text-xs text-foreground/70">Melhor / pior</div>
          <div className="font-heading text-sm font-semibold tabular-nums mt-0.5">
            <span className="text-emerald-600">{pct(resumo.melhor)}</span>
            <span className="text-foreground/50"> / </span>
            <span className="text-red-600">{pct(resumo.pior)}</span>
          </div>
          <div className="text-xs text-foreground/70 mt-0.5">retorno no momento da avaliação</div>
        </div>
      </div>

      )}

      <p className="px-4 py-2 border-t text-xs text-foreground/70">
        Métricas calculadas a partir dos sinais já avaliados com cotação. Não é desempenho de conta nem projeção de resultado.
      </p>
    </section>
  );
}