// Resolve pernas de um template de estratégia para opções reais da B3 via OpLab.
// Busca a cadeia de opções do ativo, encontra o próximo vencimento mensal e
// mapeia cada perna para a opção com strike mais próximo do strike alvo.

import { base44 } from '@/api/base44Client';

const REF_PRICE = 38; // preço de referência dos templates (PETR4 ~ R$ 38)

// Verifica se um símbolo de opção é semanal (possui W no código)
function isWeekly(symbol) {
  return /W\d+$/i.test(symbol || '');
}

// Diferença em dias entre uma data futura e hoje
function daysFromToday(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

// Encontra o próximo vencimento mensal com pelo menos 15 dias de duração.
// Se o vencimento mais próximo estiver abaixo de 15 dias, usa o seguinte.
function findNextMonthlyExpiration(options) {
  const MIN_DIAS = 15;
  const monthlyDates = new Set();
  (options || []).forEach((o) => {
    if (o.due_date && !isWeekly(o.symbol)) {
      monthlyDates.add(o.due_date);
    }
  });
  const sorted = [...monthlyDates].sort((a, b) => a.localeCompare(b));
  const today = new Date().toISOString().slice(0, 10);
  const futuros = sorted.filter((d) => d >= today);
  // Primeiro vencimento mensal com pelo menos 15 dias
  const elegivel = futuros.find((d) => daysFromToday(d) >= MIN_DIAS);
  if (elegivel) return elegivel;
  // Fallback: último vencimento disponível
  return futuros[futuros.length - 1] || sorted[sorted.length - 1] || null;
}

// Encontra a opção com strike mais próximo do alvo, do tipo correto, no vencimento informado
function findClosestOption(options, type, targetStrike, dueDate) {
  const candidates = (options || []).filter(
    (o) => o.type === type && o.due_date === dueDate && !isWeekly(o.symbol)
  );
  if (!candidates.length) return null;
  return candidates.reduce((best, o) => {
    const diff = Math.abs((o.strike || 0) - targetStrike);
    const bestDiff = best ? Math.abs((best.strike || 0) - targetStrike) : Infinity;
    return diff < bestDiff ? o : best;
  }, null);
}

/**
 * Resolve as pernas de um template para opções reais da B3.
 * @param {string} ativoBase - ticker do ativo base (ex: PETR4)
 * @param {number} spotPrice - preço spot atual do ativo
 * @param {Array} templateLegs - pernas do template
 * @returns {Promise<{legs: Array, dueDate: string|null, resolved: boolean}>}
 */
export async function resolveStrategyLegs(ativoBase, spotPrice, templateLegs) {
  const ref = spotPrice || REF_PRICE;
  const scale = ref / REF_PRICE;

  let chainOptions = [];
  let resolvedDueDate = null;

  try {
    const res = await base44.functions.invoke('oplabMarket', {
      action: 'optionChain',
      symbol: ativoBase.toUpperCase(),
    });
    chainOptions = res.data?.options || [];
    resolvedDueDate = findNextMonthlyExpiration(chainOptions);
  } catch (e) {
    chainOptions = [];
  }

  const legs = (templateLegs || []).map((leg, index) => {
    const isStock = leg.type === 'STOCK';

    if (isStock) {
      return {
        ...leg,
        id: `leg-${Date.now()}-${index}`,
        ticker: ativoBase.toUpperCase(),
        strike: 0,
        premium: ref,
        dueDate: 'À Vista',
      };
    }

    // Strike alvo escalado proporcionalmente ao spot atual
    const targetStrike = Number(((leg.strike || 0) * scale).toFixed(2));

    if (resolvedDueDate && chainOptions.length) {
      const match = findClosestOption(chainOptions, leg.type, targetStrike, resolvedDueDate);
      if (match) {
        return {
          ...leg,
          id: `leg-${Date.now()}-${index}`,
          ticker: match.symbol,
          strike: match.strike,
          premium: match.close || 0,
          dueDate: match.due_date,
        };
      }
    }

    // Fallback: strike escalado, sem ticker real — NÃO usar o ticker do template (PETR4)
    // pois pertence a outro ativo base. Deixar vazio para o usuário buscar manualmente.
    return {
      ...leg,
      id: `leg-${Date.now()}-${index}`,
      strike: targetStrike,
      premium: leg.premium || 0,
      ticker: '',
      dueDate: resolvedDueDate || leg.dueDate || 'À Vista',
    };
  });

  return { legs, dueDate: resolvedDueDate, resolved: chainOptions.length > 0 };
}