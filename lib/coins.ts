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
interface CoinMetadata {
  id: string;
  image: string;
  market_cap: number;
  total_volume: number;
  price_change_percentage_24h: number;
}

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

// Kraken decides whether there is a market to show; CoinGecko only decorates it,
// so only Kraken's failure is this function's failure.
export async function fetchCoins(): Promise<Coin[]> {
  const [metadata, lastPrices] = await Promise.allSettled([
    fetchCoinMetadata(),
    fetchKrakenLastPrices(TRACKED_COINS.map((coin) => coin.pair)),
  ]);

  if (lastPrices.status === 'rejected') throw lastPrices.reason;
  const enrichment = metadata.status === 'fulfilled' ? metadata.value : [];

  return TRACKED_COINS.flatMap(({ id, name, symbol, pair }) => {
    const last = lastPrices.value.get(pair);
    if (last == null) return [];
    // Listed field by field rather than spread: the response is cast, not
    // validated, so it carries its own id/name/symbol whatever the type says,
    // and a spread would let identity change source with CoinGecko's health.
    const context = enrichment.find((entry) => entry.id === id);
    return [
      {
        id,
        name,
        symbol,
        current_price: last,
        image: context?.image,
        market_cap: context?.market_cap,
        total_volume: context?.total_volume,
        price_change_percentage_24h: context?.price_change_percentage_24h,
      },
    ];
  });
}
