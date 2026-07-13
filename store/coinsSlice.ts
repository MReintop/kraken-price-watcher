import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Coin, FetchStatus } from '../types';
import type { RootState } from './store';

const MARKETS_URL =
  'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,cardano,ripple,dogecoin,polkadot,chainlink&price_change_percentage=24h';

interface CoinsState {
  items: Coin[];
  status: FetchStatus;
  error?: string;
  live: boolean; // Kraken WebSocket connected?
}

const initialState: CoinsState = {
  items: [],
  status: FetchStatus.Idle,
  live: false,
};

export interface KrakenTick {
  symbol: string; // base symbol, upper-case (e.g. "BTC")
  last: number;
  changePct: number;
}

// Thunk: fetch the market list. rejectWithValue carries a user-friendly message.
export const fetchCoins = createAsyncThunk<
  Coin[],
  void,
  { rejectValue: string }
>('coins/fetch', async (_, { rejectWithValue }) => {
  try {
    const res = await fetch(MARKETS_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as Coin[];
  } catch (e) {
    return rejectWithValue(
      e instanceof Error ? e.message : 'Failed to load prices',
    );
  }
});

const coinsSlice = createSlice({
  name: 'coins',
  initialState,
  reducers: {
    // Merge a batch of live ticks (already coalesced/throttled by the socket).
    tickersApplied(state, action: PayloadAction<KrakenTick[]>) {
      for (const tick of action.payload) {
        console.log('SIIN muutus', tick.symbol, action.payload);
        const coin = state.items.find(
          (c) => c.symbol.toUpperCase() === tick.symbol,
        );
        if (coin) {
          coin.current_price = tick.last;
          coin.price_change_percentage_24h = tick.changePct;
        }
      }
    },
    socketStatusChanged(state, action: PayloadAction<boolean>) {
      state.live = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCoins.pending, (state) => {
        if (state.items.length === 0) state.status = FetchStatus.Loading;
        state.error = undefined;
      })
      .addCase(fetchCoins.fulfilled, (state, action: PayloadAction<Coin[]>) => {
        state.items = action.payload;
        state.status = FetchStatus.Succeeded;
      })
      .addCase(fetchCoins.rejected, (state, action) => {
        state.status = FetchStatus.Failed;
        state.error = action.payload ?? 'Failed to load prices';
      });
  },
});

export const { tickersApplied, socketStatusChanged } = coinsSlice.actions;
export default coinsSlice.reducer;

// Selectors
export const selectCoins = (s: RootState) => s.coins.items;
export const selectCoinsStatus = (s: RootState) => s.coins.status;
export const selectCoinsError = (s: RootState) => s.coins.error;
export const selectLive = (s: RootState) => s.coins.live;

// Fine-grained selectors for the live list:
// - the screen subscribes to just the id list (use with `shallowEqual` so it
//   only re-renders when a coin is added/removed, not on price ticks)
// - each row subscribes to its own coin, so one tick re-renders only that row
export const selectCoinIds = (s: RootState) => s.coins.items.map((c) => c.id);
export const selectCoinById = (id: string) => (s: RootState) =>
  s.coins.items.find((c) => c.id === id);
