import { fetchWithRetry } from './http';
import { Candle, Timeframe } from '../types';

const KRAKEN_BASE =
  process.env.EXPO_PUBLIC_KRAKEN_BASE_URL ?? 'https://api.kraken.com/0/public';

// Kraken answers a failed query with HTTP 200 and a populated `error` array, so
// `response.ok` alone would let "Unknown asset pair" through as success.
interface KrakenEnvelope<T> {
  error: string[];
  result: T;
}

async function krakenGet<T>(path: string): Promise<T> {
  const response = await fetchWithRetry(`${KRAKEN_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`Kraken ${path}: HTTP ${response.status}`);
  }
  const body = (await response.json()) as KrakenEnvelope<T>;
  if (body.error?.length) {
    throw new Error(`Kraken ${path}: ${body.error.join(', ')}`);
  }
  return body.result;
}

// `c` is [last trade price, lot volume]. `o` is deliberately unused: it is
// *today's* open, so it measures however long today has been — not 24 hours.
type TickerResult = Record<string, { c: [string, string] }>;

// One request for every pair. Kraken keys the response by its own canonical pair
// name and not in the order asked, so callers must look up by name.
export async function fetchKrakenLastPrices(
  pairs: readonly string[],
): Promise<Map<string, number>> {
  const result = await krakenGet<TickerResult>(
    `/Ticker?pair=${pairs.join(',')}`,
  );

  return new Map(
    Object.entries(result).map(([pair, ticker]) => [pair, Number(ticker.c[0])]),
  );
}

// Kraken buckets candles by minutes-per-candle, so a timeframe is an interval
// plus how many of those candles to keep.
const TIMEFRAME_INTERVALS: Record<
  Timeframe,
  { interval: number; points: number }
> = {
  [Timeframe.Day]: { interval: 60, points: 24 },
  [Timeframe.Month]: { interval: 1440, points: 30 },
  [Timeframe.Year]: { interval: 10080, points: 52 },
};

type OhlcRow = [number, string, string, string, string, string, string, number];

export async function fetchKrakenCandles(
  pair: string,
  timeframe: Timeframe,
): Promise<Candle[]> {
  const { interval, points } = TIMEFRAME_INTERVALS[timeframe];
  const result = await krakenGet<Record<string, OhlcRow[] | number>>(
    `/OHLC?pair=${pair}&interval=${interval}`,
  );

  const rows = Object.entries(result).find(([key]) => key !== 'last')?.[1];
  if (!Array.isArray(rows)) {
    throw new Error(`Kraken OHLC ${pair}: no candles in response`);
  }

  // Rows are [time, open, high, low, close, vwap, volume, count]: prices arrive
  // as strings, and the timestamp is in seconds.
  return rows.slice(-points).map(([time, open, high, low, close]) => ({
    t: time * 1000,
    o: Number(open),
    h: Number(high),
    l: Number(low),
    c: Number(close),
  }));
}
