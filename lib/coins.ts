import { fetchWithRetry } from './http';
import { fetchKrakenPrices } from './kraken';
import { Coin } from '../types';

const COINGECKO_BASE =
  process.env.EXPO_PUBLIC_COINGECKO_BASE_URL ??
  'https://api.coingecko.com/api/v3';

// CoinGecko says what a coin *is*; Kraken says what it is *worth*. The pair is
// Kraken's own canonical name, which is what its responses are keyed by.
export const TRACKED_COINS = [
  { id: 'bitcoin', pair: 'XXBTZUSD' },
  { id: 'ethereum', pair: 'XETHZUSD' },
  { id: 'solana', pair: 'SOLUSD' },
  { id: 'cardano', pair: 'ADAUSD' },
  { id: 'ripple', pair: 'XXRPZUSD' },
  { id: 'dogecoin', pair: 'XDGUSD' },
  { id: 'polkadot', pair: 'DOTUSD' },
  { id: 'chainlink', pair: 'LINKUSD' },
] as const;

export const krakenPairFor = (id: string) =>
  TRACKED_COINS.find((coin) => coin.id === id)?.pair;

type CoinMetadata = Pick<
  Coin,
  'id' | 'name' | 'symbol' | 'image' | 'market_cap' | 'total_volume'
>;

const METADATA_URL = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${TRACKED_COINS.map(
  (coin) => coin.id,
).join(',')}&price_change_percentage=24h`;

async function fetchCoinMetadata(): Promise<CoinMetadata[]> {
  const response = await fetchWithRetry(METADATA_URL);
  if (!response.ok) {
    throw new Error(`CoinGecko markets: HTTP ${response.status}`);
  }
  return response.json();
}

// Identity from CoinGecko, price from Kraken — the same source the live socket
// and the candles use, so every price in the app comes from one place.
export async function fetchCoins(): Promise<Coin[]> {
  const [metadata, prices] = await Promise.all([
    fetchCoinMetadata(),
    fetchKrakenPrices(TRACKED_COINS.map((coin) => coin.pair)),
  ]);

  return TRACKED_COINS.flatMap(({ id, pair }) => {
    const coin = metadata.find((entry) => entry.id === id);
    const price = prices.get(pair);
    if (!coin || !price) return [];
    return [
      {
        ...coin,
        current_price: price.last,
        price_change_percentage_24h: price.changePct,
      },
    ];
  });
}
