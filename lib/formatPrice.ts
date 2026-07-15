// Pinned, not the device default: prices would otherwise be grouped one way
// here and another wherever the default happens to differ.
const LOCALE = 'en-US';

// Stable-decimals price formatting: the decimal count depends only on the
// magnitude (not the exact value), so an animating number doesn't flicker its
// decimal places mid-tween.
export function formatPrice(n: number): string {
  const decimals = n >= 10000 ? 0 : n >= 1 ? 2 : 4;
  return `$${n.toLocaleString(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}
