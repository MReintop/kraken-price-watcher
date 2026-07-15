import { useEffect, useState } from 'react';
import { Candle, FetchStatus, Timeframe } from '../types';
import { TIMEFRAMES } from '../lib/candleChart';
import { krakenPairFor } from '../lib/coins';
import { fetchKrakenCandles } from '../lib/kraken';

export type CandlesByTimeframe = Record<Timeframe, Candle[]>;

// Historical candles barely move, so they are cached per coin across visits.
// The TTL stops a long session showing yesterday's chart.
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

const fetchTimeframe = async (coinId: string, tf: Timeframe) => {
  const pair = krakenPairFor(coinId);
  if (!pair) throw new Error(`No Kraken pair is mapped for "${coinId}"`);
  return [tf, await fetchKrakenCandles(pair, tf)] as const;
};

interface CandlesState {
  byTimeframe: CandlesByTimeframe | undefined;
  status: FetchStatus;
}

// A cache hit seeds straight to Succeeded, so no spinner flashes.
const initState = (coinId: string): CandlesState => {
  const cached = freshEntry(coinId);
  return {
    byTimeframe: cached?.data,
    status: cached ? FetchStatus.Succeeded : FetchStatus.Loading,
  };
};

export function useCandles(coinId: string): CandlesState {
  const [state, setState] = useState<CandlesState>(() => initState(coinId));
  const [trackedId, setTrackedId] = useState(coinId);

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
