import { useEffect, useState } from 'react';
import { Candle, FetchStatus, Timeframe } from '../types';
import { TIMEFRAMES } from '../lib/candleChart';
import { krakenPairFor } from '../lib/coins';
import { fetchKrakenCandles } from '../lib/kraken';

// Historical candles barely move, so they are cached across visits. The TTL
// stops a long session showing yesterday's chart.
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  candles: Candle[];
  at: number; // epoch ms when fetched
}

// Keyed per coin *and* timeframe, so one range can be held, refetched or failed
// without touching the other two.
const keyOf = (coinId: string, timeframe: Timeframe) =>
  `${coinId}:${timeframe}`;

const cache = new Map<string, CacheEntry>();
// A second hook asking for a range already in flight waits for that request
// rather than opening its own.
const inFlight = new Map<string, Promise<Candle[]>>();

const freshCandles = (coinId: string, timeframe: Timeframe) => {
  const entry = cache.get(keyOf(coinId, timeframe));
  return entry && Date.now() - entry.at < CACHE_TTL_MS
    ? entry.candles
    : undefined;
};

function load(
  coinId: string,
  timeframe: Timeframe,
  signal?: AbortSignal,
): Promise<Candle[]> {
  const key = keyOf(coinId, timeframe);
  const existing = inFlight.get(key);
  if (existing) return existing;

  const pair = krakenPairFor(coinId);
  const request = pair
    ? fetchKrakenCandles(pair, timeframe, signal)
    : Promise.reject(new Error(`No Kraken pair is mapped for "${coinId}"`));

  const tracked = request
    .then((candles) => {
      cache.set(key, { candles, at: Date.now() });
      return candles;
    })
    .finally(() => inFlight.delete(key));

  inFlight.set(key, tracked);
  return tracked;
}

interface CandlesState {
  candles: Candle[] | undefined;
  status: FetchStatus;
}

// A cache hit seeds straight to Succeeded, so no spinner flashes.
const initState = (coinId: string, timeframe: Timeframe): CandlesState => {
  const candles = freshCandles(coinId, timeframe);
  return {
    candles,
    status: candles ? FetchStatus.Succeeded : FetchStatus.Loading,
  };
};

export function useCandles(coinId: string, timeframe: Timeframe): CandlesState {
  const [state, setState] = useState<CandlesState>(() =>
    initState(coinId, timeframe),
  );
  const [tracked, setTracked] = useState({ coinId, timeframe });

  if (coinId !== tracked.coinId || timeframe !== tracked.timeframe) {
    setTracked({ coinId, timeframe });
    setState(initState(coinId, timeframe));
  }

  useEffect(() => {
    if (freshCandles(coinId, timeframe)) return;

    const controller = new AbortController();
    let cancelled = false;

    load(coinId, timeframe, controller.signal)
      .then((candles) => {
        if (cancelled) return;
        setState({ candles, status: FetchStatus.Succeeded });
        // Only now, and only what is missing: the range being looked at gets the
        // network to itself, and the other two arrive before they are asked for.
        // Firing all three at once makes the visible chart queue behind ranges
        // nobody has opened, and pays for three whenever a user glances at one.
        for (const other of TIMEFRAMES) {
          if (other !== timeframe && !freshCandles(coinId, other)) {
            load(coinId, other).catch(() => {
              // A prefetch nobody asked for must not surface as an error. The
              // range refetches, and reports properly, if it is ever selected.
            });
          }
        }
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ ...s, status: FetchStatus.Failed }));
      });

    return () => {
      cancelled = true;
      // Leaving the screen stops the request, rather than leaving it to finish
      // into a component that is gone.
      controller.abort();
    };
  }, [coinId, timeframe]);

  return state;
}
