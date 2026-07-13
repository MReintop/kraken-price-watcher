import { useEffect, useState } from 'react';
import { Candle, FetchStatus, Timeframe } from '../types';
import { TIMEFRAME_DAYS, TIMEFRAMES, mapOhlcRows } from '../lib/candleChart';

export type CandlesByTimeframe = Record<Timeframe, Candle[]>;

// Historical candles barely change (only the current one, which the live price
// handles), so cache per coin across visits → no refetch while fresh. Entries
// expire after CACHE_TTL_MS so a long-lived session doesn't show stale candles.
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  data: CandlesByTimeframe;
  at: number; // epoch ms when fetched
}

const cache = new Map<string, CacheEntry>();

const freshEntry = (coinId: string): CacheEntry | undefined => {
  const entry = cache.get(coinId);
  return entry && Date.now() - entry.at < CACHE_TTL_MS ? entry : undefined;
};

const fetchTimeframe = (coinId: string, tf: Timeframe) =>
  fetch(
    `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?vs_currency=usd&days=${TIMEFRAME_DAYS[tf]}`,
  )
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((rows: number[][]) => [tf, mapOhlcRows(rows)] as const);

interface CandlesState {
  byTimeframe: CandlesByTimeframe | undefined;
  status: FetchStatus;
}

// Seed from a fresh cache hit if we have one, otherwise start in Loading so the
// spinner shows immediately (the effect below kicks off the fetch).
const initState = (coinId: string): CandlesState => {
  const cached = freshEntry(coinId);
  return {
    byTimeframe: cached?.data,
    status: cached ? FetchStatus.Succeeded : FetchStatus.Loading,
  };
};

// Fetch ALL timeframes once per coin (then the socket does the live updating).
// Switching timeframe in the UI just picks from the returned map — no new fetch.
export function useCandles(coinId: string): CandlesState {
  const [state, setState] = useState<CandlesState>(() => initState(coinId));
  const [trackedId, setTrackedId] = useState(coinId);

  // Reset synchronously when the coin changes — React's recommended alternative
  // to syncing state inside an effect (avoids a stale-data render + cascade).
  if (coinId !== trackedId) {
    setTrackedId(coinId);
    setState(initState(coinId));
  }

  useEffect(() => {
    if (freshEntry(coinId)) return; // fresh cache → nothing to fetch

    let cancelled = false;
    Promise.all(TIMEFRAMES.map((tf) => fetchTimeframe(coinId, tf)))
      .then((entries) => {
        if (cancelled) return;
        const data = Object.fromEntries(entries) as CandlesByTimeframe;
        cache.set(coinId, { data, at: Date.now() });
        setState({ byTimeframe: data, status: FetchStatus.Succeeded });
      })
      .catch(() => {
        if (!cancelled) {
          setState((s) => ({ ...s, status: FetchStatus.Failed }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [coinId]);

  return state;
}
