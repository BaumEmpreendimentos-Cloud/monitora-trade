import React from 'react';
import { Target } from 'lucide-react';
import { summarizeSignals } from '@/lib/monitora-ai/riskIndicators';
import CollapsibleCard from './CollapsibleCard';

const pct = (v) => (Number.isFinite(Number(v)) ? `${Number(v) > 0 ? '+' : ''}${Number(v).toFixed(2)}%` : '—');

export default function DesempenhoSinais({ sinais = [], diagnostico }) {
  const resumo = summarizeSignals(sinais);
  const d = diagnostico || {};

  return (
    <CollapsibleCard
      id="desempenho"
      icon={Target}
      title="Desempenho dos sinais"
      subtitle="histórico avaliado"
      footer={
        <p className="px-4 py-2 border-t text-xs text-muted-foreground">
          Calculado apenas sobre os {resumo.total} sinal(is) já avaliados com cotação. Não é desempenho de conta nem projeção de resultado.
        </p>
      }
    >
      {!resumo.total ? (
        <div className="px-4 py-3 space-y-1">
          <p className="text-sm text-muted-foreground">
            Sem métricas porque nenhum sinal foi avaliado ainda.
          </p>
          <p className="text-xs text-muted-foreground">
            {d.aprovadas
              ? `Há ${d.aprovadas} oportunidade(s) aprovada(s) aguardando avaliação no painel Resultado dos sinais.`
              : 'Aprove uma oportunidade e use "Avaliar sinais" para começar o acompanhamento.'}
          </p>
        </div>
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
    </CollapsibleCard>
  );
}