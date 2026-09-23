import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw, ArrowRight, Layers } from 'lucide-react';
import { buildRollRow, calcRollFlow, classifyRollResult } from '@/lib/rolagemCalculo';

const fmt = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const toneClass = { good: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900', warn: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900', bad: 'text-red-600 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900' };

export default function CalculadoraRolagem({ operacoes, ativoBase, spotPrice }) {
  const opcoes = useMemo(() => (operacoes || []).filter((o) => o.categoria === 'CALL' || o.categoria === 'PUT'), [operacoes]);
  const rows = useMemo(() => opcoes.map(buildRollRow), [opcoes]);

  const [prices, setPrices] = useState({}); // { [id]: { closePrice, newPremium } }
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchQuotes = useCallback(async () => {
    if (!rows.length) return;
    setLoading(true);
    try {
      const tickers = [...new Set(rows.flatMap((r) => [r.ticker, r.newTicker]).filter(Boolean))];
      const res = await base44.functions.invoke('oplabMarket', { action: 'quote', tickers: tickers.join(',') });
      const map = {};
      (res.data?.quotes || []).forEach((q) => { map[q.symbol || q.ticker] = q.close; });
      const next = {};
      rows.forEach((r) => {
        next[r.id] = {
          closePrice: map[r.ticker] ?? '',
          newPremium: map[r.newTicker] ?? '',
        };
      });
      setPrices(next);
      setLastUpdate(new Date());
    } catch (e) {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [rows]);

  useEffect(() => { fetchQuotes(); }, [fetchQuotes]);

  const setField = (id, field, value) => {
    setPrices((p) => ({ ...p, [id]: { ...p[id], [field]: value } }));
  };

  const flows = useMemo(() => {
    return rows.map((r) => {
      const pr = prices[r.id] || {};
      const flow = calcRollFlow(r, pr.closePrice, pr.newPremium);
      return { row: r, prices: pr, ...flow };
    });
  }, [rows, prices]);

  const totalClose = flows.reduce((s, f) => s + f.closeFlow, 0);
  const totalOpen = flows.reduce((s, f) => s + f.openFlow, 0);
  const netFlow = totalClose + totalOpen;
  const totalQty = rows.reduce((s, r) => s + (Number(r.quantidade) || 0), 0);
  const resultado = classifyRollResult(netFlow, totalQty);

  if (!opcoes.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-10">
        Este grupo não possui opções (CALL/PUT) para simular rolagem.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            Calculadora Tática de Rolagem B3 (Multi-Pernas)
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {rows.length} perna(s) em {ativoBase || '—'} — mesmo strike, próximo exercício mensal.
            {lastUpdate && ` Atualizado: ${lastUpdate.toLocaleTimeString('pt-BR')}`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchQuotes} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Atualizar Cotações
        </Button>
      </div>

      <div className="space-y-3">
        {flows.map(({ row, prices: pr, closeFlow, openFlow, netFlow: legNet }) => {
          const isSell = row.operacao === 'VENDA';
          return (
            <Card key={row.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span className={isSell ? 'text-red-600' : 'text-emerald-600'}>{isSell ? 'VENDIDA' : 'COMPRADA'}</span>
                    <span>{row.categoria}</span>
                    <span className="font-mono text-muted-foreground">{row.ticker}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-mono">{row.newTicker || '—'}</span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${legNet >= 0 ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' : 'text-red-600 bg-red-50 dark:bg-red-950/30'}`}>
                    Saldo: {legNet >= 0 ? '+ CRÉDITO' : '- DÉBITO'} {fmt(Math.abs(legNet))}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Fechamento */}
                  <div className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs font-medium text-muted-foreground uppercase">
                      <span>1. Fechamento Atual ({isSell ? 'Recompra' : 'Venda Liq.'})</span>
                      <span>Série {row.currentLetter}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <Label className="text-[11px]">Strike</Label>
                        <div className="font-mono font-semibold">R$ {Number(row.strike).toFixed(2)}</div>
                      </div>
                      <div>
                        <Label className="text-[11px]">Qtd a Fechar</Label>
                        <div className="font-mono font-semibold">{row.quantidade}</div>
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor={`close-${row.id}`} className="text-[11px]">Preço Fechamento</Label>
                        <Input
                          id={`close-${row.id}`}
                          type="number"
                          step="0.01"
                          value={pr.closePrice ?? ''}
                          onChange={(e) => setField(row.id, 'closePrice', e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    <div className={`text-right text-sm font-semibold ${closeFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {row.quantidade} un × R$ {Number(pr.closePrice || 0).toFixed(2)} = {closeFlow >= 0 ? '+' : ''}{fmt(closeFlow)}
                    </div>
                  </div>

                  {/* Nova série */}
                  <div className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs font-medium text-muted-foreground uppercase">
                      <span>2. Nova Série ({isSell ? 'Venda Nova' : 'Compra Nova'})</span>
                      <span>Série {row.nextLetter}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <Label className="text-[11px]">Ticker</Label>
                        <div className="font-mono font-semibold">{row.newTicker || '—'}</div>
                      </div>
                      <div>
                        <Label className="text-[11px]">Qtd Nova</Label>
                        <div className="font-mono font-semibold">{row.quantidade}</div>
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor={`new-${row.id}`} className="text-[11px]">Prêmio Novo</Label>
                        <Input
                          id={`new-${row.id}`}
                          type="number"
                          step="0.01"
                          value={pr.newPremium ?? ''}
                          onChange={(e) => setField(row.id, 'newPremium', e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    <div className={`text-right text-sm font-semibold ${openFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {row.quantidade} un × R$ {Number(pr.newPremium || 0).toFixed(2)} = {openFlow >= 0 ? '+' : ''}{fmt(openFlow)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Balanço consolidado */}
      <Card className={toneClass[resultado.tone]}>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-bold">Balanço Financeiro Consolidado da Estrutura Rolada</h4>
            <span className="text-xs font-bold px-2 py-1 rounded bg-card border">{resultado.label}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-muted-foreground">1. Fechamento das Pernas Atuais</div>
              <div className={`text-lg font-bold font-mono ${totalClose >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {totalClose >= 0 ? '+' : ''}{fmt(totalClose)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">2. Abertura das Novas Séries</div>
              <div className={`text-lg font-bold font-mono ${totalOpen >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {totalOpen >= 0 ? '+' : ''}{fmt(totalOpen)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Saldo Financeiro Líquido</div>
              <div className={`text-xl font-bold font-mono ${netFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {netFlow >= 0 ? '+ CRÉDITO' : '- DÉBITO'} {fmt(Math.abs(netFlow))}
              </div>
              {totalQty > 0 && (
                <div className="text-xs text-muted-foreground">({(netFlow / totalQty) >= 0 ? '+' : ''}{fmt(netFlow / totalQty)} / unidade)</div>
              )}
            </div>
          </div>
          <p className="text-xs">{resultado.desc}</p>
        </CardContent>
      </Card>
    </div>
  );
}