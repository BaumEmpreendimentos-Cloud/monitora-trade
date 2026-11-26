/** Ativos sugeridos quando o usuário ainda não configurou a própria lista. */
export const ATIVOS_PADRAO = ['PETR4', 'VALE3', 'ITUB4', 'BBAS3', 'WEGE3'];

export const MAX_ATIVOS = 8;

export function normalizarAtivo(valor) {
  return String(valor || '').toUpperCase().trim();
}

export function normalizarAtivos(lista) {
  const arr = Array.isArray(lista) ? lista : [];
  return [...new Set(arr.map(normalizarAtivo).filter((t) => /^[A-Z0-9]{4,10}$/.test(t)))].slice(0, MAX_ATIVOS);
}

export function normalizarEstrategias(lista) {
  const arr = Array.isArray(lista) ? lista : [];
  return [...new Set(arr.map((id) => String(id || '').trim()).filter(Boolean))];
}

/** Capital de referência informado pelo usuário (R$). 0 = não informado. */
export function normalizarCapital(valor) {
  const n = Number(String(valor ?? '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? Number(n.toFixed(2)) : 0;
}

/** Ativos efetivos: lista do usuário quando existir; senão, a lista padrão. */
export function ativosEfetivos(preferencias) {
  const doUsuario = normalizarAtivos(preferencias);
  return doUsuario.length ? doUsuario : ATIVOS_PADRAO;
}