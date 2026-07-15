// Pinned, not the device default: prices would otherwise be grouped one way
// here and another wherever the default happens to differ.
const LOCALE = 'en-US';

// Decimals by magnitude: $62,888 needs none and would be noise with four, while
// DOGE at $0.07467 is rounded to nothing without them. A fixed count cannot
// serve both, and the default of three loses a meaningful move on the cheap end.
export function formatPrice(n: number): string {
  const decimals = n >= 10000 ? 0 : n >= 1 ? 2 : 4;
  return `$${n.toLocaleString(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}
