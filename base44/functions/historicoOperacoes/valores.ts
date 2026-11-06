const numero = (valor) => valor === null || valor === undefined || valor === '' ? null : Number.isFinite(Number(valor)) ? Number(valor) : null;

// Não altera valores históricos preenchidos, inclusive zero e resultados negativos.
export function completarResultado(operacao) {
  const entrada = numero(operacao.preco_entrada);
  const fechamento = numero(operacao.preco_fechamento);
  const quantidade = numero(operacao.quantidade);
  const salvo = numero(operacao.resultado_valor);
  const direcao = operacao.operacao === 'COMPRA' ? 1 : operacao.operacao === 'VENDA' ? -1 : null;
  const diferenca = entrada !== null && fechamento !== null && direcao !== null ? (fechamento - entrada) * direcao : null;
  const calculado = diferenca !== null && quantidade !== null ? diferenca * quantidade : null;
  const percentual = diferenca !== null && entrada > 0 ? diferenca / entrada * 100 : null;
  return {
    ...operacao,
    resultado_valor: salvo ?? calculado,
    resultado_pct: salvo === null ? percentual : numero(operacao.resultado_pct) ?? percentual,
  };
}

export function hojeBrasil() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export async function somarResultadosAusentes(entidade, query, grupos) {
  let cursor;
  do {
    const pagina = await entidade.filter({ ...query, $or: [{ resultado_valor: null }, { resultado_valor: { $exists: false } }] }, { sort: 'id', limit: 500, ...(cursor ? { cursor } : {}) });
    for (const operacao of pagina.items) {
      const grupo = grupos.get(operacao.grupo_id);
      if (grupo) grupo.total += completarResultado(operacao).resultado_valor ?? 0;
    }
    cursor = pagina.has_more ? pagina.next_cursor : null;
  } while (cursor);
}