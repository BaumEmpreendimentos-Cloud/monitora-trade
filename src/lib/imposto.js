// Apuração de Imposto de Renda sobre operações de renda variável (Monitora Trade)
// Base legal: IN RFB 1585/2015 e Lei 11.033/2004.

export const CATEGORIAS_FISCAIS = {
  ACOES: { label: 'Ações', aliquota: 0.15, aliquotaDayTrade: 0.20, isencaoLimite: 20000 },
  OPCOES: { label: 'Opções', aliquota: 0.15, aliquotaDayTrade: 0.20, isencaoLimite: 0 },
  FII: { label: 'FIIs', aliquota: 0.15, aliquotaDayTrade: 0.20, isencaoLimite: 0 },
  FUTUROS: { label: 'Futuros', aliquota: 0.15, aliquotaDayTrade: 0.20, isencaoLimite: 0 },
};

// Mapeia a categoria da operação para a categoria fiscal de apuração
export const categoriaFiscal = (categoria) => {
  switch (categoria) {
    case 'ACAO': return 'ACOES';
    case 'CALL':
    case 'PUT': return 'OPCOES';
    case 'FII': return 'FII';
    case 'DOLLAR': return 'FUTUROS';
    default: return null;
  }
};

// Detecta se a operação é day trade (abertura e fechamento no mesmo dia)
export const isDayTradeOp = (op) => {
  if (!op.data_abertura || !op.data_fechamento) return false;
  const dAbertura = new Date(op.data_abertura + 'T00:00:00');
  const dFechamento = new Date(op.data_fechamento);
  if (Number.isNaN(dAbertura.getTime()) || Number.isNaN(dFechamento.getTime())) return false;
  return dAbertura.toDateString() === dFechamento.toDateString();
};

// Chave de mês no formato YYYY-MM
export const mesChave = (dataStr) => {
  if (!dataStr) return null;
  const d = new Date(dataStr);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Rótulo legível para o mês (ex: Jan/2024)
export const mesLabel = (chave) => {
  if (!chave) return '';
  const [ano, mes] = chave.split('-');
  const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${nomes[parseInt(mes, 10) - 1]}/${ano}`;
};

const PREJUIZO_FIELDS = {
  ACOES: { swing: 'prejuizo_acumulado_acoes', dayTrade: 'prejuizo_dt_acoes' },
  OPCOES: { swing: 'prejuizo_acumulado_opcoes', dayTrade: 'prejuizo_dt_opcoes' },
  FII: { swing: 'prejuizo_acumulado_fii', dayTrade: 'prejuizo_dt_fii' },
  FUTUROS: { swing: 'prejuizo_acumulado_futuros', dayTrade: 'prejuizo_dt_futuros' },
};

/**
 * Apura IR mensal encadeado sobre operações fechadas.
 * Regras:
 * - Prejuízos acumulados compensam lucros futuros (mesmo tipo: swing↔swing, day trade↔day trade).
 * - Mês com lucro: abate prejuízo acumulado; se lucro > prejuízo, paga IR sobre o excedente e zera o prejuízo.
 * - Mês com prejuízo: acumula para o mês seguinte (o lucro não carrega, apenas o prejuízo).
 * - Ações (swing trade): isenção de IR se total de vendas ≤ R$ 20.000 no mês.
 *
 * @param {Array} operacoes - operações (status FECHADA com data_fechamento)
 * @param {Object} config - ConfiguracaoFiscal do usuário
 * @returns {Array} apurações por mês/categoria/tipo, ordenadas cronologicamente
 */
export const apurarImpostoRenda = (operacoes, config) => {
  if (!operacoes || !config || !config.mes_inicio) return [];

  const mesInicio = config.mes_inicio;

  // Filtra operações fechadas a partir do mês inicial
  const fechadas = operacoes.filter((o) =>
    o.status === 'FECHADA' && o.data_fechamento && mesChave(o.data_fechamento) && mesChave(o.data_fechamento) >= mesInicio
  );

  // Agrupa por mês
  const meses = {};
  fechadas.forEach((op) => {
    const chave = mesChave(op.data_fechamento);
    if (!chave) return;
    if (!meses[chave]) meses[chave] = [];
    meses[chave].push(op);
  });

  const chavesMes = Object.keys(meses).sort();

  // Estado de prejuízos acumulados por categoria + tipo
  const prejuizo = {};
  Object.keys(CATEGORIAS_FISCAIS).forEach((cat) => {
    const f = PREJUIZO_FIELDS[cat];
    prejuizo[cat] = {
      swing: Number(config[f.swing] || 0),
      dayTrade: Number(config[f.dayTrade] || 0),
    };
  });

  const resultados = [];

  chavesMes.forEach((chave) => {
    const opsDoMes = meses[chave];

    Object.keys(CATEGORIAS_FISCAIS).forEach((cat) => {
      const opsCat = opsDoMes.filter((o) => categoriaFiscal(o.categoria) === cat);
      if (!opsCat.length) return;

      const cfg = CATEGORIAS_FISCAIS[cat];

      ['swing', 'dayTrade'].forEach((tipo) => {
        const opsTipo = opsCat.filter((o) =>
          tipo === 'dayTrade' ? isDayTradeOp(o) : !isDayTradeOp(o)
        );
        if (!opsTipo.length) return;

        const resultadoBruto = opsTipo.reduce((s, o) => s + (Number(o.resultado_valor) || 0), 0);
        const irrf = opsTipo.reduce((s, o) => s + (Number(o.irrf) || 0), 0);
        const aliquota = tipo === 'dayTrade' ? cfg.aliquotaDayTrade : cfg.aliquota;

        // Isenção para ações swing trade (vendas ≤ R$ 20.000 no mês)
        let isento = false;
        let baseCalculo = resultadoBruto;
        if (tipo === 'swing' && cfg.isencaoLimite > 0 && resultadoBruto > 0) {
          const totalVendas = opsTipo.reduce((s, o) => {
            const preco = o.operacao === 'VENDA' ? Number(o.preco_entrada) : Number(o.preco_fechamento);
            return s + (preco || 0) * (Number(o.quantidade) || 0);
          }, 0);
          if (totalVendas <= cfg.isencaoLimite) {
            isento = true;
            baseCalculo = 0;
          }
        }

        // Compensa prejuízo acumulado (apenas se houver lucro e não for isento)
        let prejuizoCompensado = 0;
        if (resultadoBruto > 0 && !isento) {
          prejuizoCompensado = Math.min(prejuizo[cat][tipo], resultadoBruto);
          baseCalculo = resultadoBruto - prejuizoCompensado;
        }

        const impostoDevido = baseCalculo > 0 ? baseCalculo * aliquota : 0;
        const impostoAPagar = Math.max(0, impostoDevido - irrf);

        // Atualiza prejuízo acumulado
        if (resultadoBruto < 0) {
          // Mês com prejuízo: acumula
          prejuizo[cat][tipo] += Math.abs(resultadoBruto);
        } else if (prejuizoCompensado > 0) {
          // Mês com lucro: consome prejuízo (remainder permanece se prejuízo > lucro)
          prejuizo[cat][tipo] = Math.max(0, prejuizo[cat][tipo] - prejuizoCompensado);
        }

        resultados.push({
          mes: chave,
          categoria: cat,
          categoriaLabel: cfg.label,
          tipo: tipo === 'dayTrade' ? 'Day Trade' : 'Swing Trade',
          operacoes: opsTipo.length,
          resultadoBruto,
          irrf,
          isento,
          prejuizoCompensado,
          prejuizoAcumuladoFinal: prejuizo[cat][tipo],
          aliquota,
          impostoDevido,
          impostoAPagar,
        });
      });
    });
  });

  return resultados;
};