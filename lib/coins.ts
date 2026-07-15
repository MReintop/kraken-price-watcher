import { fetchWithRetry } from './http';
import { fetchKrakenLastPrices } from './kraken';
import { Coin } from '../types';
import trackedCoins from './trackedCoins.json';

const COINGECKO_BASE =
  process.env.EXPO_PUBLIC_COINGECKO_BASE_URL ??
  'https://api.coingecko.com/api/v3';

// JSON, not a TS const: the e2e stub is a plain Node script and reads this same
// list, so a second copy there would drift silently.
export const TRACKED_COINS: readonly { id: string; pair: string }[] =
  trackedCoins;

export const krakenPairFor = (id: string) =>
  TRACKED_COINS.find((coin) => coin.id === id)?.pair;

// The 24h change comes from here too: Kraken's REST ticker has no true 24h
// reference, only today's open, so seeding from it flips sign on the first tick.
type CoinMetadata = Pick<
  Coin,
  | 'id'
  | 'name'
  | 'symbol'
  | 'image'
  | 'market_cap'
  | 'total_volume'
  | 'price_change_percentage_24h'
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

// The price comes from Kraken — the same source the socket and the candles use,
// so the number never jumps sources. Everything else comes from CoinGecko.
export async function fetchCoins(): Promise<Coin[]> {
  const [metadata, lastPrices] = await Promise.all([
    fetchCoinMetadata(),
    fetchKrakenLastPrices(TRACKED_COINS.map((coin) => coin.pair)),
  ]);

  return TRACKED_COINS.flatMap(({ id, pair }) => {
    const coin = metadata.find((entry) => entry.id === id);
    const last = lastPrices.get(pair);
    if (!coin || last == null) return [];
    return [{ ...coin, current_price: last }];
  });
}
