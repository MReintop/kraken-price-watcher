import { createListenerMiddleware } from '@reduxjs/toolkit';
import type { RootState, AppDispatch } from './store';
import { fetchCoins } from './coinsSlice';
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

// When the first CoinGecko load succeeds, we know the symbol set — start the
// live Kraken socket once, then unsubscribe so later refetches don't re-open it.
startAppListening({
  actionCreator: fetchCoins.fulfilled,
  effect: (action, listenerApi) => {
    if (stopSocket) return;

    // Map all current symbols
    const symbols = action.payload.map((c) => c.symbol);

    // set function for stopping socket
    stopSocket = startKrakenTicker(symbols, listenerApi.dispatch);
    listenerApi.unsubscribe();
  },
});
