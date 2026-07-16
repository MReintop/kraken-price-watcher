// Pinned, not the device default: prices would otherwise be grouped one way
// here and another wherever the default happens to differ.
const LOCALE = 'en-US';

// Decimals by magnitude: $62,888 needs none, DOGE at $0.07467 needs four. A fixed
// count can't serve both.
export function formatPrice(n: number): string {
  const decimals = n >= 10000 ? 0 : n >= 1 ? 2 : 4;
  return `$${n.toLocaleString(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}
