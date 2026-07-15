import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Coin, FetchStatus } from '../types';
import { fetchCoins as fetchCoinsFromApi } from '../lib/coins';
import type { RootState } from './store';

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

// rejectWithValue carries a message the error view can show as-is.
export const fetchCoins = createAsyncThunk<
  Coin[],
  void,
  { rejectValue: string }
>('coins/fetch', async (_, { rejectWithValue }) => {
  try {
    return await fetchCoinsFromApi();
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
    tickersApplied(state, action: PayloadAction<KrakenTick[]>) {
      for (const tick of action.payload) {
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

export const selectCoins = (s: RootState) => s.coins.items;
export const selectCoinsStatus = (s: RootState) => s.coins.status;
export const selectCoinsError = (s: RootState) => s.coins.error;
export const selectLive = (s: RootState) => s.coins.live;

// Use with `shallowEqual` — this builds a new array every call, so a reference
// check re-renders the whole list on every tick.
export const selectCoinIds = (s: RootState) => s.coins.items.map((c) => c.id);
// Per-coin, so a tick re-renders only that coin's row.
export const selectCoinById = (id: string) => (s: RootState) =>
  s.coins.items.find((c) => c.id === id);
