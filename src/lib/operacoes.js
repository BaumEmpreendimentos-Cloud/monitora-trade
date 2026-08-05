// Cálculos financeiros das operações (Monitora Trade)

// Valor inicial: saída de caixa (compra = negativo) / entrada de caixa (venda = positivo)
export const calcValorInicial = (operacao, quantidade, preco) =>
  (operacao === 'VENDA' ? 1 : -1) * quantidade * preco;

// Resultado em valor monetário (mark-to-market)
export const calcResultadoValor = (operacao, quantidade, entrada, atual) => {
  if (atual === null || atual === undefined || atual === '') return null;
  return operacao === 'COMPRA'
    ? (atual - entrada) * quantidade
    : (entrada - atual) * quantidade;
};

// Resultado em percentual
export const calcResultadoPct = (operacao, entrada, atual) => {
  if (atual === null || atual === undefined || atual === '' || !entrada) return null;
  return operacao === 'COMPRA'
    ? ((atual - entrada) / entrada) * 100
    : ((entrada - atual) / entrada) * 100;
};