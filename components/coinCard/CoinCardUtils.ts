import { Coin } from '../../types';

export function getCoinDetails(coin: Coin) {
  const up = coin.price_change_percentage_24h >= 0;
  return {
    name: coin.name,
    priceLabel: `$${coin.current_price.toLocaleString()}`,
    changeLabel: `${up ? '▲' : '▼'} ${coin.price_change_percentage_24h.toFixed(2)}%`,
    isUp: up,
    // Color is a presentation concern — callers derive it from `isUp` via
    // theme's changeColors() so gain/loss colors stay consistent app-wide.
  };
}
