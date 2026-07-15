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

// The first successful load is what reveals the symbol set, so the socket starts
// here — once, then unsubscribes so later refetches don't re-open it.
startAppListening({
  actionCreator: fetchCoins.fulfilled,
  effect: (action, listenerApi) => {
    if (stopSocket) return;

    const symbols = action.payload.map((c) => c.symbol);

    stopSocket = startKrakenTicker(symbols, listenerApi.dispatch);
    listenerApi.unsubscribe();
  },
});
