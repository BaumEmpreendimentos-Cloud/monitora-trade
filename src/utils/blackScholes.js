// Black-Scholes pricing engine adapted for Brazilian B3 market (252 business days convention)
// Ported from APP-Opções (TypeScript) to JavaScript for Monitora Trade

// Standard normal CDF (Abramowitz and Stegun approximation)
export function cdfNormal(x) {
  const b1 = 0.319381530;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;
  const p = 0.2316419;
  const c = 0.39894228;

  if (x >= 0.0) {
    const t = 1.0 / (1.0 + p * x);
    return 1.0 - c * Math.exp(-x * x / 2.0) * t *
      (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1);
  } else {
    const t = 1.0 / (1.0 - p * x);
    return c * Math.exp(-x * x / 2.0) * t *
      (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1);
  }
}

// Standard normal PDF
export function pdfNormal(x) {
  return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
}

/**
 * Black-Scholes calculation for B3 (252 business days)
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

  const Nd1 = cdfNormal(d1);
  const Nd2 = cdfNormal(d2);
  const NminusD1 = cdfNormal(-d1);
  const NminusD2 = cdfNormal(-d2);
  const nd1 = pdfNormal(d1);
  const discount = Math.exp(-r * T);

  let price = 0, delta = 0, theta = 0, rho = 0;

  if (type === 'CALL') {
    price = S * Nd1 - K * discount * Nd2;
    delta = Nd1;
    theta = (-(S * nd1 * sigma) / (2 * Math.sqrt(T)) - r * K * discount * Nd2) / 252;
    rho = (K * T * discount * Nd2) / 100;
  } else {
    price = K * discount * NminusD2 - S * NminusD1;
    delta = Nd1 - 1;
    theta = (-(S * nd1 * sigma) / (2 * Math.sqrt(T)) + r * K * discount * NminusD2) / 252;
    rho = (-K * T * discount * NminusD2) / 100;
  }

  const gamma = nd1 / (S * sigma * Math.sqrt(T));
  const vega = (S * Math.sqrt(T) * nd1) / 100;

  return { price: Math.max(0, price), delta, gamma, theta, vega, rho };
}

/**
 * Calculate total portfolio Greeks for all legs combined
 */
export function calculatePortfolioGreeks(legs, spotPrice, iv = 0.28, interestRate = 0.1325) {
  let delta = 0, gamma = 0, theta = 0, vega = 0, rho = 0, netDebitCredit = 0;

  legs.forEach((leg) => {
    const sign = leg.side === 'BUY' ? 1 : -1;
    const qty = leg.quantity;
    netDebitCredit += (leg.side === 'SELL' ? 1 : -1) * leg.premium * qty;

    if (leg.type === 'STOCK') {
      delta += sign * qty;
      return;
    }

    const bs = calculateBlackScholes(spotPrice, leg.strike, leg.daysToExpiry, iv, interestRate, leg.type);
    delta += sign * bs.delta * qty;
    gamma += sign * bs.gamma * qty;
    theta += sign * bs.theta * qty;
    vega += sign * bs.vega * qty;
    rho += sign * bs.rho * qty;
  });

  return { delta, gamma, theta, vega, rho, netDebitCredit };
}

/**
 * Calculate payoff at expiration for a given underlying price
 */
export function calculateExpiryPayoffAtPrice(legs, testPrice, initialSpotPrice) {
  let totalProfit = 0;

  legs.forEach((leg) => {
    const sign = leg.side === 'BUY' ? 1 : -1;
    const qty = leg.quantity;

    if (leg.type === 'STOCK') {
      totalProfit += sign * (testPrice - initialSpotPrice) * qty;
      return;
    }

    const payoffAtExpiry = leg.type === 'CALL'
      ? Math.max(0, testPrice - leg.strike)
      : Math.max(0, leg.strike - testPrice);

    if (leg.side === 'BUY') {
      totalProfit += (payoffAtExpiry - leg.premium) * qty;
    } else {
      totalProfit += (leg.premium - payoffAtExpiry) * qty;
    }
  });

  return totalProfit;
}

/**
 * Calculate theoretical payoff TODAY (D-0) for a given underlying price
 */
export function calculateCurrentPayoffAtPrice(legs, testPrice, initialSpotPrice, iv = 0.28, interestRate = 0.1325, daysElapsed = 0) {
  let totalProfit = 0;

  legs.forEach((leg) => {
    const sign = leg.side === 'BUY' ? 1 : -1;
    const qty = leg.quantity;

    if (leg.type === 'STOCK') {
      totalProfit += sign * (testPrice - initialSpotPrice) * qty;
      return;
    }

    const remainingDays = Math.max(0, leg.daysToExpiry - daysElapsed);
    const bs = calculateBlackScholes(testPrice, leg.strike, remainingDays, iv, interestRate, leg.type);

    if (leg.side === 'BUY') {
      totalProfit += (bs.price - leg.premium) * qty;
    } else {
      totalProfit += (leg.premium - bs.price) * qty;
    }
  });

  return totalProfit;
}

/**
 * Generate data points for the Payoff chart across a realistic price range
 */
export function generatePayoffCurve(legs, spotPrice, iv = 0.28, interestRate = 0.1325, rangePercent = 0.25, steps = 60) {
  if (legs.length === 0) return [];

  const minPrice = Math.max(1, spotPrice * (1 - rangePercent));
  const maxPrice = spotPrice * (1 + rangePercent);
  const stepSize = (maxPrice - minPrice) / steps;
  const points = [];

  for (let p = minPrice; p <= maxPrice + 0.0001; p += stepSize) {
    const expiryPnL = calculateExpiryPayoffAtPrice(legs, p, spotPrice);
    const currentPnL = calculateCurrentPayoffAtPrice(legs, p, spotPrice, iv, interestRate, 0);
    const halfTermPnL = calculateCurrentPayoffAtPrice(legs, p, spotPrice, iv, interestRate, 15);

    points.push({
      price: Math.round(p * 100) / 100,
      expiryPnL: Math.round(expiryPnL * 100) / 100,
      currentPnL: Math.round(currentPnL * 100) / 100,
      halfTermPnL: Math.round(halfTermPnL * 100) / 100,
    });
  }

  return points;
}

/**
 * Identify break-even points where expiryPnL crosses zero
 */
export function findBreakEvens(legs, spotPrice, rangePercent = 0.4) {
  if (legs.length === 0) return [];

  const minPrice = Math.max(0.5, spotPrice * (1 - rangePercent));
  const maxPrice = spotPrice * (1 + rangePercent);
  const steps = 300;
  const stepSize = (maxPrice - minPrice) / steps;
  const breakEvens = [];
  let prevPnL = calculateExpiryPayoffAtPrice(legs, minPrice, spotPrice);

  for (let p = minPrice + stepSize; p <= maxPrice; p += stepSize) {
    const currPnL = calculateExpiryPayoffAtPrice(legs, p, spotPrice);
    if ((prevPnL <= 0 && currPnL >= 0) || (prevPnL >= 0 && currPnL <= 0)) {
      const zeroPrice = p - stepSize + (stepSize * Math.abs(prevPnL)) / (Math.abs(prevPnL) + Math.abs(currPnL));
      if (!breakEvens.some((be) => Math.abs(be - zeroPrice) < 0.15)) {
        breakEvens.push(Math.round(zeroPrice * 100) / 100);
      }
    }
    prevPnL = currPnL;
  }

  return breakEvens;
}

/**
 * Approximate B3 CORE margin requirements for the structure
 */
export function estimateB3Margin(legs, spotPrice) {
  if (legs.length === 0) {
    return {
      estimatedInitialMargin: 0,
      marginType: 'ISENTA_COBERTA',
      description: 'Nenhuma perna cadastrada.',
      riskScore: 'BAIXO',
      collateralRecommendations: [],
    };
  }

  const stockLeg = legs.find((l) => l.type === 'STOCK');
  const stockQty = stockLeg ? (stockLeg.side === 'BUY' ? stockLeg.quantity : -stockLeg.quantity) : 0;

  const soldCalls = legs.filter((l) => l.type === 'CALL' && l.side === 'SELL');
  const soldPuts = legs.filter((l) => l.type === 'PUT' && l.side === 'SELL');
  const boughtCalls = legs.filter((l) => l.type === 'CALL' && l.side === 'BUY');
  const boughtPuts = legs.filter((l) => l.type === 'PUT' && l.side === 'BUY');

  const totalSoldCallQty = soldCalls.reduce((s, l) => s + l.quantity, 0);
  const totalBoughtCallQty = boughtCalls.reduce((s, l) => s + l.quantity, 0);
  const totalSoldPutQty = soldPuts.reduce((s, l) => s + l.quantity, 0);
  const totalBoughtPutQty = boughtPuts.reduce((s, l) => s + l.quantity, 0);

  const uncoveredCalls = Math.max(0, totalSoldCallQty - Math.max(0, stockQty) - totalBoughtCallQty);
  const uncoveredPuts = Math.max(0, totalSoldPutQty - totalBoughtPutQty);

  if (uncoveredCalls === 0 && uncoveredPuts === 0 && totalSoldCallQty > 0 && stockQty >= totalSoldCallQty) {
    return {
      estimatedInitialMargin: 0,
      marginType: 'ISENTA_COBERTA',
      description: 'Lançamento coberto — sem margem adicional exigida.',
      riskScore: 'BAIXO',
      collateralRecommendations: ['Posição coberta pelo ativo-objeto.'],
    };
  }

  if (uncoveredCalls > 0) {
    const margin = uncoveredCalls * spotPrice * 0.20 + soldCalls.reduce((s, l) => s + l.premium * l.quantity, 0) * 0.5;
    return {
      estimatedInitialMargin: Math.round(margin),
      marginType: 'RISCO_CORE_B3',
      description: 'Call descoberta: margem B3 CORE estimada em ~20% do valor do ativo + prêmio.',
      riskScore: 'ALTO',
      collateralRecommendations: ['Considere comprar uma Call para formar trava e reduzir margem.'],
    };
  }

  if (uncoveredPuts > 0) {
    const margin = uncoveredPuts * spotPrice * 0.15 + soldPuts.reduce((s, l) => s + l.premium * l.quantity, 0);
    return {
      estimatedInitialMargin: Math.round(margin),
      marginType: 'RISCO_CORE_B3',
      description: 'Put descoberta: margem B3 CORE estimada em ~15% do strike + prêmio.',
      riskScore: 'MODERADO',
      collateralRecommendations: ['Considere comprar uma Put mais baixa para formar trava.'],
    };
  }

  const allStrikes = legs.filter((l) => l.type !== 'STOCK').map((l) => l.strike);
  if (allStrikes.length >= 2) {
    const spread = Math.max(...allStrikes) - Math.min(...allStrikes);
    const maxQty = Math.max(...legs.map((l) => l.quantity));
    const margin = spread * maxQty;
    return {
      estimatedInitialMargin: Math.round(margin),
      marginType: 'TRAVADA',
      description: 'Trava: margem = diferença entre strikes × quantidade.',
      riskScore: 'BAIXO',
      collateralRecommendations: ['Risco limitado pela estrutura de trava.'],
    };
  }

  return {
    estimatedInitialMargin: 0,
    marginType: 'ISENTA_COBERTA',
    description: 'Estrutura sem margem adicional.',
    riskScore: 'BAIXO',
    collateralRecommendations: [],
  };
}

/**
 * Calculate net strategy payoff at a simulated price
 */
export function calculateStrategyPayoff(legs, simSpot, initialSpot) {
  return {
    netProfitLoss: calculateExpiryPayoffAtPrice(legs, simSpot, initialSpot ?? simSpot),
  };
}
