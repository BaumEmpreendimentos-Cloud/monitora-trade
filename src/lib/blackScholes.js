// Motor Black-Scholes adaptado para B3 (252 dias úteis)
// Adaptado de APP-Opções (https://github.com/BaumEmpreendimentos-Cloud/APP-Op-es)

// CDF normal padrão (Abramowitz & Stegun)
export function cdfNormal(x) {
  const b1 = 0.319381530, b2 = -0.356563782, b3 = 1.781477937;
  const b4 = -1.821255978, b5 = 1.330274429, p = 0.2316419, c = 0.39894228;
  if (x >= 0) {
    const t = 1 / (1 + p * x);
    return 1 - c * Math.exp(-x * x / 2) * t * (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1);
  }
  const t = 1 / (1 - p * x);
  return c * Math.exp(-x * x / 2) * t * (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1);
}

export function pdfNormal(x) {
  return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
}

/**
 * Cálculo Black-Scholes para B3 (252 dias úteis)
 * @param S Preço spot
 * @param K Strike
 * @param daysToExpiry Dias até vencimento
 * @param iv Volatilidade implícita (decimal, ex: 0.28)
 * @param r Taxa livre de risco (decimal, ex: 0.1325)
 * @param type 'CALL' | 'PUT'
 */
export function calculateBlackScholes(S, K, daysToExpiry, iv, r = 0.1325, type) {
  if (daysToExpiry <= 0.001) {
    const intrinsic = type === 'CALL' ? Math.max(0, S - K) : Math.max(0, K - S);
    const delta = type === 'CALL' ? (S >= K ? 1 : 0) : (S <= K ? -1 : 0);
    return { price: intrinsic, delta, gamma: 0, theta: 0, vega: 0, rho: 0 };
  }

  const T = Math.max(0.001, daysToExpiry / 252);
  const sigma = Math.max(0.01, iv);

  const d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);

  const Nd1 = cdfNormal(d1), Nd2 = cdfNormal(d2);
  const N_minus_d1 = cdfNormal(-d1), N_minus_d2 = cdfNormal(-d2);
  const nd1 = pdfNormal(d1);
  const discount = Math.exp(-r * T);

  let price, delta, theta, rho;

  if (type === 'CALL') {
    price = S * Nd1 - K * discount * Nd2;
    delta = Nd1;
    theta = (-(S * nd1 * sigma) / (2 * Math.sqrt(T)) - r * K * discount * Nd2) / 252;
    rho = (K * T * discount * Nd2) / 100;
  } else {
    price = K * discount * N_minus_d2 - S * N_minus_d1;
    delta = Nd1 - 1;
    theta = (-(S * nd1 * sigma) / (2 * Math.sqrt(T)) + r * K * discount * N_minus_d2) / 252;
    rho = (-K * T * discount * N_minus_d2) / 100;
  }

  const gamma = nd1 / (S * sigma * Math.sqrt(T));
  const vega = (S * Math.sqrt(T) * nd1) / 100;

  return { price: Math.max(0, price), delta, gamma, theta, vega, rho };
}

// Gregas consolidadas do portfólio
export function calculatePortfolioGreeks(legs, spotPrice, iv = 0.28, r = 0.1325) {
  let delta = 0, gamma = 0, theta = 0, vega = 0, rho = 0, netDebitCredit = 0;

  legs.forEach((leg) => {
    const sign = leg.side === 'BUY' ? 1 : -1;
    const qty = leg.quantity;
    netDebitCredit += (leg.side === 'SELL' ? 1 : -1) * leg.premium * qty;

    if (leg.type === 'STOCK') {
      delta += sign * qty;
      return;
    }

    const bs = calculateBlackScholes(spotPrice, leg.strike, leg.daysToExpiry, iv, r, leg.type);
    delta += sign * bs.delta * qty;
    gamma += sign * bs.gamma * qty;
    theta += sign * bs.theta * qty;
    vega += sign * bs.vega * qty;
    rho += sign * bs.rho * qty;
  });

  return { delta, gamma, theta, vega, rho, netDebitCredit };
}

// Payoff no vencimento para um preço simulado
export function calculateExpiryPayoffAtPrice(legs, testPrice, initialSpotPrice) {
  let total = 0;
  legs.forEach((leg) => {
    const sign = leg.side === 'BUY' ? 1 : -1;
    const qty = leg.quantity;
    if (leg.type === 'STOCK') {
      total += sign * (testPrice - initialSpotPrice) * qty;
      return;
    }
    const payoff = leg.type === 'CALL' ? Math.max(0, testPrice - leg.strike) : Math.max(0, leg.strike - testPrice);
    total += (leg.side === 'BUY' ? payoff - leg.premium : leg.premium - payoff) * qty;
  });
  return total;
}

// Payoff teórico hoje (D-0)
export function calculateCurrentPayoffAtPrice(legs, testPrice, initialSpotPrice, iv = 0.28, r = 0.1325, daysElapsed = 0) {
  let total = 0;
  legs.forEach((leg) => {
    const sign = leg.side === 'BUY' ? 1 : -1;
    const qty = leg.quantity;
    if (leg.type === 'STOCK') {
      total += sign * (testPrice - initialSpotPrice) * qty;
      return;
    }
    const remaining = Math.max(0, leg.daysToExpiry - daysElapsed);
    const bs = calculateBlackScholes(testPrice, leg.strike, remaining, iv, r, leg.type);
    total += (leg.side === 'BUY' ? bs.price - leg.premium : leg.premium - bs.price) * qty;
  });
  return total;
}

// Gera pontos para o gráfico de payoff
export function generatePayoffCurve(legs, spotPrice, iv = 0.28, r = 0.1325, rangePercent = 0.28, steps = 80) {
  if (!legs.length) return [];
  const min = Math.max(1, spotPrice * (1 - rangePercent));
  const max = spotPrice * (1 + rangePercent);
  const step = (max - min) / steps;
  const points = [];
  for (let p = min; p <= max + 0.0001; p += step) {
    points.push({
      price: Math.round(p * 100) / 100,
      expiryPnL: Math.round(calculateExpiryPayoffAtPrice(legs, p, spotPrice) * 100) / 100,
      currentPnL: Math.round(calculateCurrentPayoffAtPrice(legs, p, spotPrice, iv, r, 0) * 100) / 100,
    });
  }
  return points;
}

// Encontra pontos de break-even
export function findBreakEvens(legs, spotPrice, rangePercent = 0.4) {
  if (!legs.length) return [];
  const min = Math.max(0.5, spotPrice * (1 - rangePercent));
  const max = spotPrice * (1 + rangePercent);
  const steps = 300;
  const step = (max - min) / steps;
  const breakEvens = [];
  let prev = calculateExpiryPayoffAtPrice(legs, min, spotPrice);
  for (let p = min + step; p <= max; p += step) {
    const curr = calculateExpiryPayoffAtPrice(legs, p, spotPrice);
    const cruzouZero = Number.isFinite(prev) && Number.isFinite(curr)
      && ((prev < 0 && curr > 0) || (prev > 0 && curr < 0));
    if (cruzouZero) {
      const denominador = Math.abs(prev) + Math.abs(curr);
      const zero = denominador > 0
        ? p - step + (step * Math.abs(prev)) / denominador
        : null;
      if (Number.isFinite(zero) && !breakEvens.some((be) => Math.abs(be - zero) < 0.15)) {
        breakEvens.push(Math.round(zero * 100) / 100);
      }
    }
    prev = curr;
  }
  return breakEvens;
}