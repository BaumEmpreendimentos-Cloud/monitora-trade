// Catálogo de estruturas/estratégias clássicas de opções B3
// Adaptado de APP-Opções

export const strategyTemplates = [
  {
    id: 'covered-call',
    name: 'Financiamento (Covered Call / Venda Coberta)',
    description: 'Compra da ação à vista e venda de CALL OTM para gerar renda imediata e proteção parcial de queda.',
    category: 'ALTA / RENDA',
    sentiment: 'BULLISH',
    maxProfit: 'Prêmio recebido + valorização até o Strike da CALL',
    maxLoss: 'Preço da ação - Prêmio recebido (risco substancial na queda da ação)',
    legs: [
      { id: 'tpl-1', type: 'STOCK', side: 'BUY', quantity: 100, strike: 0, premium: 38.00, ticker: 'PETR4', dueDate: 'À Vista' },
      { id: 'tpl-2', type: 'CALL', side: 'SELL', quantity: 100, strike: 40.00, premium: 1.25, ticker: 'PETRJ400', dueDate: '2026-10-16' },
    ],
  },
  {
    id: 'bull-call-spread',
    name: 'Trava de Alta com CALL (Bull Call Spread)',
    description: 'Compra de CALL ITM/ATM e venda simultânea de CALL OTM para reduzir o custo da montagem com risco limitado.',
    category: 'ALTA',
    sentiment: 'BULLISH',
    maxProfit: 'Diferença entre strikes - Débito líquido pago',
    maxLoss: 'Débito líquido pago na montagem',
    legs: [
      { id: 'tpl-3', type: 'CALL', side: 'BUY', quantity: 100, strike: 37.00, premium: 2.10, ticker: 'PETRJ370', dueDate: '2026-10-16' },
      { id: 'tpl-4', type: 'CALL', side: 'SELL', quantity: 100, strike: 40.00, premium: 0.85, ticker: 'PETRJ400', dueDate: '2026-10-16' },
    ],
  },
  {
    id: 'bear-put-spread',
    name: 'Trava de Baixa com PUT (Bear Put Spread)',
    description: 'Compra de PUT ITM/ATM e venda de PUT OTM para lucrar com a queda moderada ou acentuada do ativo.',
    category: 'BAIXA',
    sentiment: 'BEARISH',
    maxProfit: 'Diferença entre strikes - Débito líquido pago',
    maxLoss: 'Débito líquido pago na montagem',
    legs: [
      { id: 'tpl-5', type: 'PUT', side: 'BUY', quantity: 100, strike: 39.00, premium: 1.90, ticker: 'PETRV390', dueDate: '2026-10-16' },
      { id: 'tpl-6', type: 'PUT', side: 'SELL', quantity: 100, strike: 36.00, premium: 0.65, ticker: 'PETRV360', dueDate: '2026-10-16' },
    ],
  },
  {
    id: 'long-straddle',
    name: 'Compra de Straddle (Long Straddle)',
    description: 'Compra simultânea de CALL e PUT no mesmo strike (ATM). Lucra com grandes explosões de preço e volatilidade em qualquer direção.',
    category: 'VOLATILIDADE',
    sentiment: 'VOLATILITY',
    maxProfit: 'Ilimitado',
    maxLoss: 'Total dos prêmios pagos nas duas pontas',
    legs: [
      { id: 'tpl-7', type: 'CALL', side: 'BUY', quantity: 100, strike: 38.00, premium: 1.65, ticker: 'PETRJ380', dueDate: '2026-10-16' },
      { id: 'tpl-8', type: 'PUT', side: 'BUY', quantity: 100, strike: 38.00, premium: 1.55, ticker: 'PETRV380', dueDate: '2026-10-16' },
    ],
  },
  {
    id: 'iron-condor',
    name: 'Iron Condor (Condor de Ferro)',
    description: 'Venda de Trava de Baixa com CALL + Venda de Trava de Alta com PUT fora do dinheiro. Lucra com mercado lateralizado entre os strikes vendidos.',
    category: 'LATERAL / RENDA',
    sentiment: 'NEUTRAL',
    maxProfit: 'Crédito líquido total recebido',
    maxLoss: 'Largura da asa - Crédito líquido recebido',
    legs: [
      { id: 'tpl-9', type: 'PUT', side: 'BUY', quantity: 100, strike: 34.00, premium: 0.30, ticker: 'PETRV340', dueDate: '2026-10-16' },
      { id: 'tpl-10', type: 'PUT', side: 'SELL', quantity: 100, strike: 36.00, premium: 0.75, ticker: 'PETRV360', dueDate: '2026-10-16' },
      { id: 'tpl-11', type: 'CALL', side: 'SELL', quantity: 100, strike: 40.00, premium: 0.80, ticker: 'PETRJ400', dueDate: '2026-10-16' },
      { id: 'tpl-12', type: 'CALL', side: 'BUY', quantity: 100, strike: 42.00, premium: 0.35, ticker: 'PETRJ420', dueDate: '2026-10-16' },
    ],
  },
  {
    id: 'long-butterfly',
    name: 'Borboleta Comprada (Long Butterfly)',
    description: 'Compra 1 Asa Inferior, Vende 2 Miolos (ATM), Compra 1 Asa Superior. Relação risco/retorno assimétrica com ganho máximo no strike central.',
    category: 'LATERAL / PRECISA',
    sentiment: 'NEUTRAL',
    maxProfit: 'Diferença entre strikes do miolo e da asa - Custo da montagem',
    maxLoss: 'Débito pago na montagem',
    legs: [
      { id: 'tpl-13', type: 'CALL', side: 'BUY', quantity: 100, strike: 36.00, premium: 2.70, ticker: 'PETRJ360', dueDate: '2026-10-16' },
      { id: 'tpl-14', type: 'CALL', side: 'SELL', quantity: 200, strike: 38.00, premium: 1.50, ticker: 'PETRJ380', dueDate: '2026-10-16' },
      { id: 'tpl-15', type: 'CALL', side: 'BUY', quantity: 100, strike: 40.00, premium: 0.70, ticker: 'PETRJ400', dueDate: '2026-10-16' },
    ],
  },
];