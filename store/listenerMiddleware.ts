import { createListenerMiddleware } from '@reduxjs/toolkit';
import type { RootState, AppDispatch } from './store';
import { fetchCoins } from './coinsSlice';
import { TRACKED_COINS } from '../lib/coins';
import { startKrakenTicker } from './krakenSocket';

// Untyped, then typed via withTypes below: typing it here would make the store's
// middleware types reference themselves.
export const listenerMiddleware = createListenerMiddleware();

const startAppListening = listenerMiddleware.startListening.withTypes<
  RootState,
  AppDispatch
>();

let stopSocket: (() => void) | undefined;

// On `pending`, not `fulfilled`: symbols are local, so the socket starts without
// waiting on CoinGecko. Unsubscribes after the first start so refresh can't open
// a second connection.
startAppListening({
  actionCreator: fetchCoins.pending,
  effect: (_action, listenerApi) => {
    if (stopSocket) return;
    const symbols = TRACKED_COINS.map((coin) => coin.symbol);
    stopSocket = startKrakenTicker(symbols, listenerApi.dispatch);
    listenerApi.unsubscribe();
  },
});
