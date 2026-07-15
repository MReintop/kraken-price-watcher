import { Coin } from '../../types';

export function getCoinDetails(coin: Coin) {
  const up = coin.price_change_percentage_24h >= 0;
  const magnitude = Math.abs(coin.price_change_percentage_24h).toFixed(2);
  const priceLabel = `$${coin.current_price.toLocaleString()}`;

  return {
    name: coin.name,
    priceLabel,
    // The arrow carries the sign, so the number is unsigned — otherwise a loss
    // reads "▼ -1.45%" and says it twice.
    changeLabel: `${up ? '▲' : '▼'} ${magnitude}%`,
    // Spoken, not drawn: a screen reader announces "▼" as nothing useful.
    a11yLabel: `${coin.name}, ${priceLabel}, ${up ? 'up' : 'down'} ${magnitude}% in the last 24 hours`,
    isUp: up,
  };
}
