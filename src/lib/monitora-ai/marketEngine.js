import { base44 } from '@/api/base44Client';

const DEFAULT_SELIC_DECIMAL = 0.1325;

/**
 * Taxas oficiais do BCB (via função de backend, sem CORS) e cotações OpLab.
 * Quando o BCB não responde, a Selic cai para premissa padrão e é sinalizada na UI.
 */
export async function getOfficialMacroRates() {
  try {
    const res = await base44.functions.invoke('monitoraAI', { action: 'macro' });
    const d = res.data || {};
    const selicPct = Number.isFinite(Number(d.selicPct)) ? Number(d.selicPct) : null;
    return {
      selicPct,
      selicDecimal: selicPct !== null ? selicPct / 100 : DEFAULT_SELIC_DECIMAL,
      selicMeta: d.selicMeta || { value: null, date: 'fallback', source: 'Premissa padrão' },
      cdi: d.cdi || null,
      ptax: d.ptax || null,
      ipca12m: d.ipca12m || null,
      capturedAt: d.capturedAt || new Date().toISOString(),
      indisponivel: selicPct === null,
    };
  } catch (error) {
    return {
      selicPct: null,
      selicDecimal: DEFAULT_SELIC_DECIMAL,
      selicMeta: { value: null, date: 'fallback', source: 'Premissa padrão' },
      cdi: null,
      ptax: null,
      ipca12m: null,
      capturedAt: new Date().toISOString(),
      indisponivel: true,
      erro: error?.message || 'Falha ao consultar o BCB',
    };
  }
}

export async function getBatchQuotes(tickers = []) {
  const list = [...new Set((tickers || [])
    .map((t) => String(t || '').toUpperCase().trim())
    .filter((t) => /^[A-Z0-9]{4,10}$/.test(t)))].slice(0, 8);
  if (!list.length) return [];

  try {
    const res = await base44.functions.invoke('oplabMarket', { action: 'quote', tickers: list.join(',') });
    const raw = res.data?.quotes || [];
    return raw.map((q) => ({
      symbol: String(q.symbol || q.ticker || '').toUpperCase(),
      price: Number(q.close ?? q.last ?? q.price ?? 0),
      variationPct: Number(q.variation ?? q.change ?? 0),
      volume: Number(q.volume ?? 0),
      source: 'OpLab v3',
    })).filter((q) => q.symbol && q.price > 0);
  } catch (error) {
    return [];
  }
}

export async function getOptionChain(symbol) {
  const s = String(symbol || '').toUpperCase().trim();
  if (!s) return [];
  try {
    const res = await base44.functions.invoke('oplabMarket', { action: 'optionChain', symbol: s });
    return Array.isArray(res.data?.options) ? res.data.options : [];
  } catch (error) {
    return [];
  }
}

export function quotesToMap(quotes = []) {
  return Object.fromEntries(quotes.map((q) => [q.symbol, q.price]));
}