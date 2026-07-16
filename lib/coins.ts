import { fetchWithRetry } from './http';
import { fetchKrakenLastPrices } from './kraken';
import { Coin } from '../types';
import trackedCoins from './trackedCoins.json';

const COINGECKO_BASE =
  process.env.EXPO_PUBLIC_COINGECKO_BASE_URL ??
  'https://api.coingecko.com/api/v3';

// The instrument registry: CoinGecko's id, the base symbol the socket
// subscribes by, and Kraken's REST pair. Holding all three locally is what lets
// the socket start without waiting to be told which symbols exist.
//
// JSON, not a TS const: the e2e stub is a plain Node script and reads this same
// list, so a second copy there would drift silently.
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

// Fetched on its own, and never awaited by the prices: this call is retried, and
// a rate limit with a long Retry-After would otherwise hold every Kraken price
// off the screen for the length of CoinGecko's backoff.
//
// Mapped field by field rather than returned whole: the body is cast, not
// validated, so it carries its own id, name and symbol no matter what the type
// says, and identity belongs to the registry.
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
