// B3 expiration series letters and reference assets
// Ported from APP-Opções data/ibovAssets.ts

export const B3_EXPIRATION_LETTERS = [
  { month: 'Janeiro', monthName: 'Janeiro', monthNumber: 1, callLetter: 'A', putLetter: 'M' },
  { month: 'Fevereiro', monthName: 'Fevereiro', monthNumber: 2, callLetter: 'B', putLetter: 'N' },
  { month: 'Março', monthName: 'Março', monthNumber: 3, callLetter: 'C', putLetter: 'O' },
  { month: 'Abril', monthName: 'Abril', monthNumber: 4, callLetter: 'D', putLetter: 'P' },
  { month: 'Maio', monthName: 'Maio', monthNumber: 5, callLetter: 'E', putLetter: 'Q' },
  { month: 'Junho', monthName: 'Junho', monthNumber: 6, callLetter: 'F', putLetter: 'R' },
  { month: 'Julho', monthName: 'Julho', monthNumber: 7, callLetter: 'G', putLetter: 'S' },
  { month: 'Agosto', monthName: 'Agosto', monthNumber: 8, callLetter: 'H', putLetter: 'T' },
  { month: 'Setembro', monthName: 'Setembro', monthNumber: 9, callLetter: 'I', putLetter: 'U' },
  { month: 'Outubro', monthName: 'Outubro', monthNumber: 10, callLetter: 'J', putLetter: 'V' },
  { month: 'Novembro', monthName: 'Novembro', monthNumber: 11, callLetter: 'K', putLetter: 'W' },
  { month: 'Dezembro', monthName: 'Dezembro', monthNumber: 12, callLetter: 'L', putLetter: 'X' },
];

export function getNextB3SeriesLetter(currentLetter, type) {
  const targetKey = type === 'CALL' ? 'callLetter' : 'putLetter';
  const currentIndex = B3_EXPIRATION_LETTERS.findIndex((b) => b[targetKey] === (currentLetter || '').toUpperCase());
  if (currentIndex === -1 || currentIndex === B3_EXPIRATION_LETTERS.length - 1) {
    return type === 'CALL' ? B3_EXPIRATION_LETTERS[0].callLetter : B3_EXPIRATION_LETTERS[0].putLetter;
  }
  return B3_EXPIRATION_LETTERS[currentIndex + 1][targetKey];
}

export function getNextB3MonthLetter(currentLetter, isCall) {
  const callLetters = B3_EXPIRATION_LETTERS.map((b) => b.callLetter);
  const putLetters = B3_EXPIRATION_LETTERS.map((b) => b.putLetter);
  const clean = (currentLetter || '').toUpperCase();
  if (isCall) {
    const idx = callLetters.indexOf(clean);
    if (idx >= 0) return callLetters[(idx + 1) % 12];
    return 'J';
  } else {
    const idx = putLetters.indexOf(clean);
    if (idx >= 0) return putLetters[(idx + 1) % 12];
    return 'V';
  }
}
