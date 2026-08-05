import React, { useState, useCallback, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';

const fmt = (v) => (v === null || v === undefined || v === '' ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const fmtPct = (v) => (v === null || v === undefined || v === '' ? '—' : `${Number(v) >= 0 ? '+' : ''}${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`);

export default function Cotacoes() {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState([]);
  const [tracked, setTracked] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);

  const runSearch = useCallback(async () => {
    if (!term.trim()) return;
    setLoadingSearch(true);
    setError('');
    try {
      const res = await base44.functions.invoke('oplabMarket', { action: 'search', expr: term.trim(), limit: 20 });
      setResults(res.data.results || []);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoadingSearch(false);
    }
  }, [term]);

  const trackedRef = useRef(tracked);
  useEffect(() => { trackedRef.current = tracked; }, [tracked]);

  const refreshQuotes = useCallback(async (symbols) => {
    const list = symbols || trackedRef.current;
    if (!list.length) return;
    const tickers = list.map((s) => s.symbol || s);
    setLoadingQuotes(true);
    setError('');
    try {
      const res = await base44.functions.invoke('oplabMarket', { action: 'quote', tickers: tickers.join(',') });
      const quotes = res.data.quotes || [];
      setTracked((prev) => prev.map((p) => {
        const q = quotes.find((x) => (x.symbol || x.ticker) === p.symbol);
        return q ? { ...p, ...q } : p;
      }));
      setLastUpdate(new Date());
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoadingQuotes(false);
    }
  }, []);

  const addSymbol = (r) => {
    const entry = { symbol: r.symbol, name: r.description || r.name || r.full_name || '' };
    if (trackedRef.current.some((p) => p.symbol === entry.symbol)) return;
    setResults([]);
    setTerm('');
    const newList = [...trackedRef.current, entry];
    trackedRef.current = newList;
    setTracked(newList);
    refreshQuotes(newList);
  };

  useEffect(() => {
    const id = setInterval(() => {
      if (trackedRef.current.length) refreshQuotes();
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [refreshQuotes]);

  const removeSymbol = (sym) => {
    setTracked((prev) => prev.filter((p) => p.symbol !== sym));
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold">Cotações B3</h1>
            <p className="text-sm text-muted-foreground">Ações e opções da Bovespa — valores de fechamento</p>
          </div>
          {lastUpdate && (
            <p className="text-xs text-muted-foreground">Atualizado: {lastUpdate.toLocaleString('pt-BR')}</p>
          )}
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Buscar ação ou opção (ex.: PETR, VALE, PETR...)"
                value={term}
                onChange={(e) => setTerm(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                className="uppercase"
              />
              <Button onClick={runSearch} disabled={loadingSearch || !term.trim()}>
                <Search className="w-4 h-4 mr-1" /> Buscar
              </Button>
            </div>

            {loadingSearch && <p className="text-sm text-muted-foreground mt-3">Buscando...</p>}

            {results.length > 0 && (
              <div className="mt-3 border border-border rounded-md divide-y divide-border">
                {results.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => addSymbol(r)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-accent text-left"
                  >
                    <div>
                      <p className="font-semibold">{r.symbol}</p>
                      <p className="text-xs text-muted-foreground">{r.name || r.description || r.company || '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs px-2 py-0.5 rounded bg-muted">{r.type || '—'}</p>
                      {r.close !== undefined && <p className="text-sm mt-1">{fmt(r.close)}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-heading font-semibold">Acompanhando ({tracked.length})</h2>
            <Button variant="outline" size="sm" onClick={() => refreshQuotes()} disabled={loadingQuotes || !tracked.length}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loadingQuotes ? 'animate-spin' : ''}`} /> Atualizar
            </Button>
          </div>

          {tracked.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-10">Busque e selecione ativos para acompanhar os fechamentos.</p>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tracked.map((item) => {
              const close = item.close;
              const variation = item.variation;
              const prev = item.previous_close;
              const isUp = variation >= 0;
              return (
                <Card key={item.symbol}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-lg">{item.symbol}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{item.name || '—'}</p>
                      </div>
                      <button onClick={() => removeSymbol(item.symbol)} className="text-xs text-muted-foreground hover:text-destructive">✕</button>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-2xl font-heading font-bold">{fmt(close)}</p>
                        <p className={`text-sm flex items-center gap-1 ${isUp ? 'text-emerald-600' : 'text-red-600'}`}>
                          {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          {fmtPct(variation)}
                        </p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground space-y-0.5">
                        <p>Anterior: {fmt(prev)}</p>
                        {item.high !== undefined && <p>Máx: {fmt(item.high)}</p>}
                        {item.low !== undefined && <p>Mín: {fmt(item.low)}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}