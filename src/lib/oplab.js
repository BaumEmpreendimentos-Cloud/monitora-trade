import { base44 } from '@/api/base44Client';

// Busca metadados de uma opção na OpLab e deriva ativo-base, strike e vencimento a partir do ticker.
// Retorna { ativo_base, strike, vencimento, categoria } ou null se não for uma opção.
export async function lookupOption(ticker) {
  const t = (ticker || '').trim().toUpperCase();
  if (t.length < 5) return null;
  const res = await base44.functions.invoke('oplabMarket', {
    action: 'search', expr: t, type: 'OPTION', limit: 30,
  });
  const results = res.data?.results || [];
  const exact = results.find((r) => r.symbol === t && (r.type === 'CALL' || r.type === 'PUT'));
  if (!exact) return null;

  const desc = exact.description || '';
  let strike = null;
  const strikeMatch = desc.match(/R\$\s*([\d.,]+)/);
  if (strikeMatch) {
    let raw = strikeMatch[1];
    if (raw.includes(',')) raw = raw.replace(/\./g, '').replace(',', '.');
    strike = Number(raw);
    if (Number.isNaN(strike)) strike = null;
  }
  let vencimento = null;
  const dateMatch = desc.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (dateMatch) vencimento = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;

  return {
    ativo_base: exact.parent_symbol || '',
    strike,
    vencimento,
    categoria: exact.type,
  };
}