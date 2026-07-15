import { fetchWithRetry } from './http';
import { fetchKrakenLastPrices } from './kraken';
import { Coin } from '../types';
import trackedCoins from './trackedCoins.json';

const COINGECKO_BASE =
  process.env.EXPO_PUBLIC_COINGECKO_BASE_URL ??
  'https://api.coingecko.com/api/v3';

// CoinGecko says what a coin *is*; Kraken says what it is *worth*. The pair is
// Kraken's own canonical name, which is what its responses are keyed by.
//
// JSON, not a TS const, because the e2e stub is a plain Node script and has to
// read the same list — a second copy there would drift silently.
export const TRACKED_COINS: readonly { id: string; pair: string }[] =
  trackedCoins;

export const krakenPairFor = (id: string) =>
  TRACKED_COINS.find((coin) => coin.id === id)?.pair;

// The 24h change comes from here too: Kraken's REST ticker cannot express one
// (its only reference point is today's open), while its socket sends a true 24h
// figure. Seeding from CoinGecko keeps the window the same before and after the
// socket connects — otherwise the number visibly flips sign on first tick.
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
