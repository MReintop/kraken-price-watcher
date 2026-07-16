import { fetchWithRetry } from './http';
import { fetchKrakenLastPrices } from './kraken';
import { Coin } from '../types';
import trackedCoins from './trackedCoins.json';

const COINGECKO_BASE =
  process.env.EXPO_PUBLIC_COINGECKO_BASE_URL ??
  'https://api.coingecko.com/api/v3';

// The instrument registry, held locally so the socket can start without waiting
// to be told which symbols exist. JSON not TS: the e2e stub is plain Node and
// reads the same file, so a TS copy would drift.
export const TRACKED_COINS: readonly {
  id: string;
  name: string;
  symbol: string;
  pair: string;
}[] = trackedCoins;

export const krakenPairFor = (id: string) =>
  TRACKED_COINS.find((coin) => coin.id === id)?.pair;

// The 24h change comes from here too: Kraken's REST ticker has no true 24h
// reference, only today's open, so seeding from it flips sign on the first tick.
export interface CoinContext {
  id: string;
  image: string;
  market_cap: number;
  total_volume: number;
  price_change_percentage_24h: number;
}

const METADATA_URL = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${TRACKED_COINS.map(
  (coin) => coin.id,
).join(',')}&price_change_percentage=24h`;

// On its own, never awaited by the prices: a rate limit's long Retry-After would
// otherwise hold every Kraken price off screen. Mapped field by field because the
// body is cast, not validated — identity belongs to the registry.
export async function fetchMarketContext(): Promise<CoinContext[]> {
  const response = await fetchWithRetry(METADATA_URL);
  if (!response.ok) {
    throw new Error(`CoinGecko markets: HTTP ${response.status}`);
  }
  const body = (await response.json()) as CoinContext[];
  return body.map(
    ({ id, image, market_cap, total_volume, price_change_percentage_24h }) => ({
      id,
      image,
      market_cap,
      total_volume,
      price_change_percentage_24h,
    }),
  );
}

// Kraken alone decides whether there is a market to show.
export async function fetchCoins(): Promise<Coin[]> {
  const lastPrices = await fetchKrakenLastPrices(
    TRACKED_COINS.map((coin) => coin.pair),
  );

  return TRACKED_COINS.flatMap(({ id, name, symbol, pair }) => {
    const last = lastPrices.get(pair);
    if (last == null) return [];
    return [{ id, name, symbol, current_price: last }];
  });
}
