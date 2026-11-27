import React, { useMemo, useState } from 'react';
import {
  Database,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Info,
  Building2,
  ArrowUpDown,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import MobileSelect from '@/components/MobileSelect';

const fmtPct = (v, dec = 1) =>
  v === null || v === undefined || !Number.isFinite(Number(v))
    ? '—'
    : `${Number(v).toFixed(dec).replace('.', ',')}%`;

const fmtX = (v) =>
  v === null || v === undefined || !Number.isFinite(Number(v))
    ? '—'
    : `${Number(v).toFixed(2).replace('.', ',')}x`;

const fmtBrl = (v) =>
  v === null || v === undefined || !Number.isFinite(Number(v))
    ? '—'
    : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtBi = (vM) => {
  if (vM === null || vM === undefined || !Number.isFinite(Number(vM))) return '—';
  const n = Number(vM);
  return Math.abs(n) >= 1000
    ? `R$ ${(n / 1000).toFixed(1).replace('.', ',')} bi`
    : `R$ ${n.toFixed(0)} mi`;
};

const fmtData = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = String(iso).split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
};

function median(values) {
  const nums = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!nums.length) return null;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

const ORDENACAO = [
  { value: 'roe_pct', label: 'Maior ROE' },
  { value: 'margem_liquida_pct', label: 'Maior margem líquida' },
  { value: 'pl', label: 'Menor P/L' },
  { value: 'pvp', label: 'Menor P/VP' },
  { value: 'divida_liquida_pl', label: 'Menor dívida líquida/PL' },
];

const QUALIDADE = [
  { value: 'TODAS', label: 'Todas as empresas' },
  { value: 'ROE_ALTO', label: 'Alta qualidade (ROE ≥ 15%)' },
  { value: 'PL_BAIXO', label: 'Descontadas (P/L ≤ 8x)' },
  { value: 'POUCA_DIVIDA', label: 'Pouca alavancagem (Dív.Líq/PL ≤ 1,5)' },
];

export default function FundamentosTab({
  fundamentos = [],
  quotesMap = {},
  selicPct = null,
  analiseAtual = null,
  syncing = false,
  runningComite = false,
  onSync,
  onRunComite,
}) {
  const [busca, setBusca] = useState('');
  const [setorSel, setSetorSel] = useState('TODOS');
  const [qualidade, setQualidade] = useState('TODAS');
  const [ordenarPor, setOrdenarPor] = useState('roe_pct');
  const [ativoDetalhe, setAtivoDetalhe] = useState(null);

  const enriquecidos = useMemo(() => {
    return (fundamentos || []).map((f) => {
      const spot = Number(quotesMap[f.ativo_base]);
      const lpa = Number(f.lpa_ltm);
      const vpa = Number(f.vpa);
      const pl = spot > 0 && Number.isFinite(lpa) && lpa > 0 ? spot / lpa : null;
      const pvp = spot > 0 && Number.isFinite(vpa) && vpa > 0 ? spot / vpa : null;
      const eyPct = spot > 0 && Number.isFinite(lpa) ? (lpa / spot) * 100 : null;
      const spreadSelic =
        eyPct !== null && Number.isFinite(Number(selicPct)) ? eyPct - Number(selicPct) : null;

      return {
        ...f,
        spot: Number.isFinite(spot) && spot > 0 ? spot : null,
        pl,
        pvp,
        eyPct,
        spreadSelic,
      };
    });
  }, [fundamentos, quotesMap, selicPct]);

  const setores = useMemo(() => {
    const unique = [...new Set(enriquecidos.map((f) => f.setor).filter(Boolean))].sort();
    return ['TODOS', ...unique];
  }, [enriquecidos]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toUpperCase();
    return enriquecidos
      .filter((f) => {
        if (setorSel !== 'TODOS' && f.setor !== setorSel) return false;
        if (qualidade === 'ROE_ALTO' && !(Number(f.roe_pct) >= 15)) return false;
        if (qualidade === 'PL_BAIXO' && !(f.pl !== null && f.pl > 0 && f.pl <= 8)) return false;
        if (qualidade === 'POUCA_DIVIDA' && !(f.instituicao_financeira || (f.divida_liquida_pl !== null && f.divida_liquida_pl <= 1.5))) return false;
        if (q && !String(f.ativo_base || '').toUpperCase().includes(q) && !String(f.razao_social || '').toUpperCase().includes(q)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const asc = ordenarPor === 'pl' || ordenarPor === 'pvp' || ordenarPor === 'divida_liquida_pl';
        const va = Number.isFinite(Number(a[ordenarPor])) ? Number(a[ordenarPor]) : (asc ? Infinity : -Infinity);
        const vb = Number.isFinite(Number(b[ordenarPor])) ? Number(b[ordenarPor]) : (asc ? Infinity : -Infinity);
        return asc ? va - vb : vb - va;
      });
  }, [enriquecidos, busca, setorSel, qualidade, ordenarPor]);

  const resumo = useMemo(() => {
    const roeMed = median(enriquecidos.map((f) => Number(f.roe_pct)));
    const plMed = median(enriquecidos.map((f) => f.pl).filter((v) => v !== null && v > 0 && v < 80));
    const eyMed = median(enriquecidos.map((f) => f.eyPct).filter((v) => v !== null));
    return { total: enriquecidos.length, roeMed, plMed, eyMed };
  }, [enriquecidos]);

  const agenteFundamentalista = useMemo(() => {
    const agentes = analiseAtual?.agentes || [];
    return agentes.find((a) => /fundamental/i.test(String(a.nome || a.agente || ''))) || null;
  }, [analiseAtual]);

  const selecionado = useMemo(
    () => enriquecidos.find((f) => f.ativo_base === ativoDetalhe) || null,
    [enriquecidos, ativoDetalhe]
  );

  return (
    <div className="space-y-4">
      {/* Cabeçalho e ações da aba */}
      <div className="rounded-xl border bg-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            <h2 className="font-heading text-base font-semibold">
              Fundamentalista & Longo Prazo (CVM Dados Abertos)
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Demonstrativos consolidados DFP + ITR (LTM oficial) combinados com a cotação atual da OpLab para avaliar qualidade e valuation.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={onSync} disabled={syncing}>
            {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
            {syncing ? 'Sincronizando CVM...' : 'Sincronizar CVM (DFP + ITR)'}
          </Button>
          {onRunComite && (
            <Button size="sm" onClick={() => onRunComite('SOB_DEMANDA')} disabled={runningComite}>
              {runningComite ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
              {runningComite ? 'Analisando...' : 'Atualizar parecer IA'}
            </Button>
          )}
        </div>
      </div>

      {/* Resumo quantitativo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-card p-3">
          <div className="text-xs text-muted-foreground">Empresas sincronizadas</div>
          <div className="font-heading text-lg font-bold tabular-nums mt-0.5">{resumo.total}</div>
          <div className="text-[11px] text-muted-foreground">CVM DFP + ITR · LTM</div>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <div className="text-xs text-muted-foreground">ROE mediano</div>
          <div className="font-heading text-lg font-bold tabular-nums mt-0.5">{fmtPct(resumo.roeMed)}</div>
          <div className="text-[11px] text-muted-foreground">Retorno sobre patrimônio</div>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <div className="text-xs text-muted-foreground">P/L mediano</div>
          <div className="font-heading text-lg font-bold tabular-nums mt-0.5">{fmtX(resumo.plMed)}</div>
          <div className="text-[11px] text-muted-foreground">Preço / Lucro LTM</div>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <div className="text-xs text-muted-foreground">Earnings Yield vs. Selic</div>
          <div className="font-heading text-lg font-bold tabular-nums mt-0.5">
            {fmtPct(resumo.eyMed)}{' '}
            <span className="text-xs font-normal text-muted-foreground">/ {fmtPct(selicPct, 2)}</span>
          </div>
          <div className="text-[11px] text-muted-foreground">Lucro/Preço mediano vs. taxa básica</div>
        </div>
      </div>

      {/* Parecer do Agente Fundamentalista */}
      {agenteFundamentalista && (
        <div className="rounded-xl border bg-card p-4 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Parecer do Agente Fundamentalista</span>
            </div>
            {agenteFundamentalista.vies && (
              <Badge variant="outline" className="text-xs">{agenteFundamentalista.vies}</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {agenteFundamentalista.leitura || agenteFundamentalista.resumo || agenteFundamentalista.parecer}
          </p>
        </div>
      )}

      {/* Filtros + Tabela */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="p-3 border-b space-y-2.5">
          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            <div className="relative w-full md:w-64">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar ticker ou empresa..."
                className="pl-8 h-8 text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5 md:ml-auto">
              <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div className="w-full md:w-56">
                <MobileSelect
                  value={ordenarPor}
                  onValueChange={setOrdenarPor}
                  options={ORDENACAO}
                  placeholder="Ordenar por"
                />
              </div>
            </div>
            <div className="w-full md:w-64">
              <MobileSelect
                value={qualidade}
                onValueChange={setQualidade}
                options={QUALIDADE}
                placeholder="Qualidade"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {setores.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSetorSel(s)}
                className={`px-2.5 py-1 rounded-md border text-xs transition-colors ${
                  setorSel === s
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-accent'
                }`}
              >
                {s === 'TODOS' ? 'Todos setores' : s}
              </button>
            ))}
          </div>
        </div>

        {!filtrados.length ? (
          <div className="p-8 text-center space-y-2">
            <Building2 className="w-8 h-8 text-muted-foreground mx-auto opacity-60" />
            <p className="text-sm font-medium">
              {fundamentos.length
                ? 'Nenhum ativo encontrado para os filtros aplicados.'
                : 'Nenhum balanço CVM sincronizado ainda.'}
            </p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Clique em "Sincronizar CVM (DFP + ITR)" para carregar os demonstrativos oficiais dos seus ativos monitorados e liberar a análise fundamentalista completa.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground border-b">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Ativo / Empresa</th>
                  <th className="px-2 py-2.5 font-medium text-right">Spot</th>
                  <th className="px-2 py-2.5 font-medium text-right">Receita LTM</th>
                  <th className="px-2 py-2.5 font-medium text-right">Lucro LTM</th>
                  <th className="px-2 py-2.5 font-medium text-right">ROE</th>
                  <th className="px-2 py-2.5 font-medium text-right">Marg. Líq.</th>
                  <th className="px-2 py-2.5 font-medium text-right">P/L</th>
                  <th className="px-2 py-2.5 font-medium text-right">P/VP</th>
                  <th className="px-4 py-2.5 font-medium text-right">Dív.Líq/PL</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtrados.map((f) => {
                  const ativo = ativoDetalhe === f.ativo_base;
                  return (
                    <tr
                      key={f.ativo_base}
                      onClick={() => setAtivoDetalhe(ativo ? null : f.ativo_base)}
                      className={`cursor-pointer transition-colors ${ativo ? 'bg-primary/5' : 'hover:bg-accent/40'}`}
                    >
                      <td className="px-4 py-2.5">
                        <div className="font-semibold flex items-center gap-1.5">
                          <span>{f.ativo_base}</span>
                          <span className="text-[10px] font-normal text-muted-foreground border rounded px-1">
                            {f.periodo_ref}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate max-w-[220px]">
                          {f.setor}{f.razao_social ? ` · ${f.razao_social}` : ''}
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{fmtBrl(f.spot)}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{fmtBi(f.receita_ltm_m)}</td>
                      <td className={`px-2 py-2.5 text-right tabular-nums font-medium ${Number(f.lucro_liquido_ltm_m) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {fmtBi(f.lucro_liquido_ltm_m)}
                      </td>
                      <td className="px-2 py-2.5 text-right font-semibold tabular-nums">{fmtPct(f.roe_pct)}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{fmtPct(f.margem_liquida_pct)}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums">
                        <div>{fmtX(f.pl)}</div>
                        {f.spreadSelic !== null && (
                          <div className={`text-[10px] ${f.spreadSelic >= 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                            EY {f.spreadSelic >= 0 ? '+' : ''}{f.spreadSelic.toFixed(1)}pp
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{fmtX(f.pvp)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {f.instituicao_financeira ? 'IF (Banco)' : fmtX(f.divida_liquida_pl)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Ficha do ativo selecionado */}
        {selecionado && (
          <div className="border-t bg-muted/30 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-heading text-sm font-semibold">
                  Ficha CVM · {selecionado.ativo_base} ({selecionado.razao_social || selecionado.setor})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Referência {selecionado.periodo_ref} · Data-base {fmtData(selecionado.data_referencia)} · CNPJ {selecionado.cnpj || '—'}
                </p>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setAtivoDetalhe(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 text-xs">
              <div className="rounded-lg border bg-card p-2.5">
                <div className="text-muted-foreground">Patrimônio Líquido</div>
                <div className="font-semibold tabular-nums mt-0.5">{fmtBi(selecionado.patrimonio_liquido_m)}</div>
              </div>
              <div className="rounded-lg border bg-card p-2.5">
                <div className="text-muted-foreground">LPA (LTM)</div>
                <div className="font-semibold tabular-nums mt-0.5">{fmtBrl(selecionado.lpa_ltm)}</div>
              </div>
              <div className="rounded-lg border bg-card p-2.5">
                <div className="text-muted-foreground">VPA</div>
                <div className="font-semibold tabular-nums mt-0.5">{fmtBrl(selecionado.vpa)}</div>
              </div>
              <div className="rounded-lg border bg-card p-2.5">
                <div className="text-muted-foreground">Earnings Yield</div>
                <div className="font-semibold tabular-nums mt-0.5">{fmtPct(selecionado.eyPct)}</div>
              </div>
              <div className="rounded-lg border bg-card p-2.5">
                <div className="text-muted-foreground">Caixa & Equiv.</div>
                <div className="font-semibold tabular-nums mt-0.5">
                  {selecionado.instituicao_financeira ? 'N/A (IF)' : fmtBi(selecionado.caixa_m)}
                </div>
              </div>
              <div className="rounded-lg border bg-card p-2.5">
                <div className="text-muted-foreground">Dívida Líquida</div>
                <div className="font-semibold tabular-nums mt-0.5">
                  {selecionado.instituicao_financeira ? 'N/A (IF)' : fmtBi(selecionado.divida_liquida_m)}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="px-4 py-2.5 border-t text-xs text-muted-foreground flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            Fonte oficial: Portal de Dados Abertos da CVM (DFP + ITR · Licença ODbL). Toque em uma linha para abrir a ficha completa de balanço e indicadores.
          </span>
        </div>
      </div>
    </div>
  );
}