/**
 * Normaliza o retorno de consultas do SDK: sem opções o .filter() devolve Array,
 * com opções devolve { items, next_cursor, has_more }.
 */
export function toList(res) {
  if (Array.isArray(res)) return res;
  return Array.isArray(res?.items) ? res.items : [];
}