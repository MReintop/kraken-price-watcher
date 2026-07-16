import { Coin } from '../../types';
import { formatPrice } from '../../lib/formatPrice';

export function getCoinDetails(coin: Coin, updating: boolean) {
  const up = coin.price_change_percentage_24h >= 0;
  const magnitude = Math.abs(coin.price_change_percentage_24h).toFixed(2);
  const priceLabel = formatPrice(coin.current_price);
  // Said, not implied by a greyer pixel: this price is real and frozen, which
  // looks exactly like a market that is not moving.
  const frozen = updating ? '' : ', not updating';

  return {
    name: coin.name,
    priceLabel,
    // The arrow carries the sign, so the number is unsigned — otherwise a loss
    // reads "▼ -1.45%" and says it twice.
    changeLabel: `${up ? '▲' : '▼'} ${magnitude}%`,
    // Spoken, not drawn: a screen reader announces "▼" as nothing useful.
    a11yLabel: `${coin.name}, ${priceLabel}, ${up ? 'up' : 'down'} ${magnitude}% in the last 24 hours${frozen}`,
    isUp: up,
  };
}
