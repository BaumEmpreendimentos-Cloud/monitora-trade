import React from 'react';
import { Activity, Loader2, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CollapsibleCard from './CollapsibleCard';

const brl = (v) => (Number.isFinite(Number(v)) ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—');
const pct = (v) => (Number.isFinite(Number(v)) ? `${Number(v) > 0 ? '+' : ''}${Number(v).toFixed(2)}%` : '—');

const DESFECHO_STYLE = {
  ALVO_ATINGIDO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  STOP_ATINGIDO: 'bg-red-50 text-red-700 border-red-200',
  EXPIRADO_LUCRO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  EXPIRADO_PREJUIZO: 'bg-red-50 text-red-700 border-red-200',
  EM_ACOMPANHAMENTO: 'bg-slate-50 text-slate-600 border-slate-200',
};

const DESFECHO_LABEL = {
  ALVO_ATINGIDO: 'Alvo atingido',
  STOP_ATINGIDO: 'Stop atingido',
  EXPIRADO_LUCRO: 'Expirado com lucro',
  EXPIRADO_PREJUIZO: 'Expirado com prejuízo',
  EM_ACOMPANHAMENTO: 'Em acompanhamento',
};

export default function SinaisPanel({ sinais = [], avaliando, onAvaliar, onEncerrar, diagnostico }) {
  const d = diagnostico || {};

  return (
    <CollapsibleCard
      id="sinais"
      icon={Activity}
      title="Resultado dos sinais"
      subtitle="acompanhamento"
      actions={
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onAvaliar} disabled={avaliando}>
          {avaliando && <Loader2 className="w-3 h-3 animate-spin" />} Avaliar sinais
        </Button>
      }
      footer={
        <p className="px-4 py-2 border-t text-xs text-muted-foreground flex items-start gap-1">
          <Info className="w-3 h-3 mt-0.5 shrink-0" />
          Compara a cotação atual do ativo base com o preço de referência da oportunidade. Encerrar remove o sinal e expira a oportunidade. Não envia ordem.
        </p>
      }
    >
      {!sinais.length ? (
        <div className="px-4 py-3 space-y-1.5">
          <p className="text-sm text-muted-foreground">Nenhum sinal avaliado ainda.</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>1. Aprove (ou marque como executada) uma oportunidade no painel de Oportunidades.</li>
            <li>2. Clique em "Avaliar sinais" para registrar a cotação atual do ativo base.</li>
            {d.aprovadas > 0 ? (
              <li className="text-foreground/80">
                Agora: {d.aprovadas} oportunidade(s) aprovada(s)/executada(s), {d.prontas} pronta(s) para avaliar.
              </li>
            ) : (
              <li className="text-foreground/80">Agora: nenhuma oportunidade aprovada ou executada — por isso a lista está vazia.</li>
            )}
            {d.semCotacao > 0 && <li>{d.semCotacao} aguardando cotação do ativo base (a OpLab não retornou preço).</li>}
            {d.neutras > 0 && <li>{d.neutras} estrutura(s) neutra(s) não geram sinal direcional.</li>}
          </ul>
        </div>
      ) : (
        <ul className="divide-y">
          {sinais.map((s) => (
            <li key={s.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{s.ativo_base}</div>
                <div className="text-xs text-muted-foreground">
                  entrada {brl(s.preco_entrada_ref)} → {brl(s.preco_avaliacao)}
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className={`inline-block text-xs px-1.5 py-0.5 rounded border ${DESFECHO_STYLE[s.desfecho] || DESFECHO_STYLE.EM_ACOMPANHAMENTO}`}>
                  {DESFECHO_LABEL[s.desfecho] || s.desfecho}
                </span>
                <div className={`text-xs tabular-nums mt-0.5 ${Number(s.retorno_pct) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{pct(s.retorno_pct)}</div>
                {onEncerrar && (
                  <button
                    type="button"
                    onClick={() => onEncerrar(s)}
                    className="text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-0.5 mt-0.5"
                  >
                    <X className="w-3 h-3" /> Encerrar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </CollapsibleCard>
  );
}