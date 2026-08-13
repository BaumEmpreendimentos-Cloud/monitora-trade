/**
 * Retorna true se o horário atual está dentro do horário de mercado
 * (09:50 às 18:00), considerando o fuso do usuário.
 */
export function isMarketOpen(date = new Date()) {
  const h = date.getHours();
  const m = date.getMinutes();
  const minutes = h * 60 + m;
  const start = 9 * 60 + 50; // 09:50
  const end = 18 * 60;      // 18:00
  return minutes >= start && minutes < end;
}