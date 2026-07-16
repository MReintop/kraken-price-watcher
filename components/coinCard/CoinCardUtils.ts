import { Coin } from '../../types';
import { formatPrice } from '../../lib/formatPrice';

export function getCoinDetails(coin: Coin, updating: boolean) {
  const priceLabel = formatPrice(coin.current_price, coin.price_decimals);
  // Said, not implied by a greyer pixel: this price is real and frozen, which
  // looks exactly like a market that is not moving.
  const frozen = updating ? '' : ', not updating';

  const pct = coin.price_change_percentage_24h;
  // Undefined is not zero and not flat — CoinGecko simply did not answer, and a
  // change pill reading "▲ 0.00%" would be an invention.
  const change =
    pct == null
      ? undefined
      : {
          isUp: pct >= 0,
          // The arrow carries the sign, so the number is unsigned — otherwise a
          // loss reads "▼ -1.45%" and says it twice.
          label: `${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(2)}%`,
          // Spoken, not drawn: a screen reader announces "▼" as nothing useful.
          spoken: `${pct >= 0 ? 'up' : 'down'} ${Math.abs(pct).toFixed(2)}% in the last 24 hours`,
        };

  return {
    name: coin.name,
    priceLabel,
    change,
    a11yLabel: `${coin.name}, ${priceLabel}, ${change?.spoken ?? '24 hour change unavailable'}${frozen}`,
  };
}
