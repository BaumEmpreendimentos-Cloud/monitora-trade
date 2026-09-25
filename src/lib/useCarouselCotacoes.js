import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { isMarketOpen } from '@/lib/marketHours';

export const DEFAULT_CAROUSEL_TICKERS = ['PETR4', 'VALE3', 'ITUB4', 'BBAS3', 'WEGE3', 'B3SA3', 'ABEV3', 'BOVA11'];

async function fetchQuotes(tickers) {
  if (!tickers.length) return [];
  try {
    const res = await base44.functions.invoke('oplabMarket', { action: 'quote', tickers: tickers.join(',') });
    const quotes = res.data?.quotes || [];
    return tickers.map((t) => {
      const q = quotes.find((x) => (x.symbol || x.ticker) === t);
      if (!q) return null;
      return { symbol: t, price: q.close, change: q.variation ?? 0 };
    }).filter(Boolean);
  } catch (e) {
    return [];
  }
}

export function useCarouselCotacoes(tickers) {
  const [cotacoes, setCotacoes] = useState([]);
  const list = tickers?.length ? tickers : DEFAULT_CAROUSEL_TICKERS;

  useEffect(() => {
    let active = true;
    const load = async () => {
      const data = await fetchQuotes(list);
      if (active) setCotacoes(data);
    };
    load();
    const interval = setInterval(() => {
      if (isMarketOpen()) load();
    }, 5 * 60 * 1000);
    return () => { active = false; clearInterval(interval); };
  }, [list.join(',')]);

  return cotacoes;
}