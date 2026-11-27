import React, { useMemo } from 'react';
import { Globe2, Sparkles, TrendingUp, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import MacroStrip from './MacroStrip';
import NoticiasMercado from './NoticiasMercado';

const fmtPct = (v) =>
  v === null || v === undefined || !Number.isFinite(Number(v))
    ? '—'
    : `${Number(v).toFixed(2).replace('.', ',')}%`;

export default function MacroTab({ macro, loadingMacro, analiseAtual }) {
  const juroRealPct = useMemo(() => {
    const selic = Number(macro?.selicPct);
    const ipca = Number(macro?.ipca12m?.value);
    if (!Number.isFinite(selic) || !Number.isFinite(ipca)) return null;
    return (((1 + selic / 100) / (1 + ipca / 100)) - 1) * 100;
  }, [macro]);

  const regimeTexto = useMemo(() => {
    if (juroRealPct === null) return 'Aguardando séries oficiais do Banco Central (Selic e IPCA 12m).';
    if (juroRealPct >= 7) {
      return 'Juro real altamente restritivo: favorece estruturas geradoras de caixa (Colar Perfeito, venda coberta, renda fixa indexada) e exige margem de segurança maior em ações de crescimento.';
    }
    if (juroRealPct >= 4.5) {
      return 'Juro real moderadamente restritivo: equilíbrio entre proteger a carteira com opções e selecionar empresas com ROE consistentemente acima da Selic.';
    }
    return 'Juro real acomodatício: ambiente mais construtivo para expansão de múltiplos em bolsa e estruturas direcionais de alta.';
  }, [juroRealPct]);

  const agenteMacro = useMemo(() => {
    const agentes = analiseAtual?.agentes || [];
    return agentes.find((a) => /macro/i.test(String(a.nome || a.agente || ''))) || null;
  }, [analiseAtual]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2">
          <Globe2 className="w-4 h-4 text-primary" />
          <h2 className="font-heading text-base font-semibold">
            Cenário Macroeconômico (BCB SGS) & Notícias
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Taxas oficiais do Banco Central usadas na precificação Black-Scholes, no custo de oportunidade e na leitura do Comitê IA.
        </p>
      </div>

      <MacroStrip macro={macro} loading={loadingMacro} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h3 className="font-heading text-sm font-semibold">Juro Real & Custo de Oportunidade</h3>
            </div>
            <Badge variant="secondary" className="tabular-nums">Juro Real: {fmtPct(juroRealPct)}</Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{regimeTexto}</p>
          <div className="pt-1 text-[11px] text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            Cálculo ex-post pela fórmula de Fisher: (1 + Selic) / (1 + IPCA 12m) − 1.
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="font-heading text-sm font-semibold">Parecer do Agente Macro</h3>
            </div>
            {agenteMacro?.vies && <Badge variant="outline">{agenteMacro.vies}</Badge>}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {agenteMacro
              ? (agenteMacro.leitura || agenteMacro.resumo || agenteMacro.parecer)
              : 'Execute o Comitê IA na aba Operacional para registrar a leitura integrada de juros, câmbio e inflação.'}
          </p>
        </div>
      </div>

      <NoticiasMercado />
    </div>
  );
}