import { createListenerMiddleware } from '@reduxjs/toolkit';
import type { RootState, AppDispatch } from './store';
import { fetchCoins } from './coinsSlice';
import { TRACKED_COINS } from '../lib/coins';
import { startKrakenTicker } from './krakenSocket';

// Created untyped so the store can include it without RootState/AppDispatch
// referencing themselves through the store's own middleware types.
export const listenerMiddleware = createListenerMiddleware();

// Types are applied here instead, via withTypes — no circular reference.
const startAppListening = listenerMiddleware.startListening.withTypes<
  RootState,
  AppDispatch
>();

let stopSocket: (() => void) | undefined;

// Started when the app asks for coins, not when CoinGecko answers. The symbols
// come from the local registry, so CoinGecko being slow, rate limited or down
// delays metadata and nothing else — the prices are Kraken's and arrive anyway.
//
// Unsubscribes after the first start so a pull-to-refresh cannot open a second
// connection.
startAppListening({
  actionCreator: fetchCoins.pending,
  effect: (_action, listenerApi) => {
    if (stopSocket) return;
    const symbols = TRACKED_COINS.map((coin) => coin.symbol);
    stopSocket = startKrakenTicker(symbols, listenerApi.dispatch);
    listenerApi.unsubscribe();
  },
});
