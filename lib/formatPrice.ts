// Pinned, not the device default: prices would otherwise be grouped one way
// here and another wherever the default happens to differ.
const LOCALE = 'en-US';

// Decimals come from the market (Kraken pair_decimals), never from magnitude:
// magnitude rounds a real 62,888.4 trade to 62,888. Aggregate figures with no
// pair precision — market cap, volume — pass 0.
export function formatPrice(n: number, decimals: number): string {
  return `$${n.toLocaleString(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}
