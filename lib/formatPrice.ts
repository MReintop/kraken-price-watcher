// Stable-decimals price formatting: the decimal count depends only on the
// magnitude (not the exact value), so an animating number doesn't flicker its
// decimal places mid-tween.
export function formatPrice(n: number): string {
  const decimals = n >= 10000 ? 0 : n >= 1 ? 2 : 4;
  return `$${n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}
