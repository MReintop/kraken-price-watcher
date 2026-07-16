import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Coin, FetchStatus } from '../types';
import { fetchCoins as fetchCoinsFromApi } from '../lib/coins';
import type { RootState } from './store';

// An open socket is not a working feed. `live` means Kraken answered for every
// symbol *and* a ticker has landed since; `stale` is the dangerous state a
// boolean cannot express — connected, believed healthy, and silently frozen.
export type SocketStatus = 'connecting' | 'live' | 'stale' | 'offline';

interface CoinsState {
  items: Coin[];
  status: FetchStatus;
  error?: string;
  socket: SocketStatus;
  // Symbols Kraken refused, or never answered for. Their prices are whatever
  // CoinGecko last said and will not move.
  unavailable: string[];
}

const initialState: CoinsState = {
  items: [],
  status: FetchStatus.Idle,
  socket: 'connecting',
  unavailable: [],
};

// Price only. Kraken's `change_pct` is its own spot market while the 24h figure
// on screen is CoinGecko's cross-exchange one — same window, different venue, so
// taking it would swap the source under the label on the first tick.
export interface KrakenTick {
  symbol: string; // base symbol, upper-case (e.g. "BTC")
  last: number;
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
        // Re-assigning the same number would still churn the row for a price
        // that has not changed, and repeat trades at one level are common.
        if (coin && coin.current_price !== tick.last) {
          coin.current_price = tick.last;
        }
      }
    },
    socketStatusChanged(state, action: PayloadAction<SocketStatus>) {
      state.socket = action.payload;
    },
    // Sent once per connection, when every symbol has been answered for or the
    // handshake deadline has passed.
    subscriptionsSettled(state, action: PayloadAction<string[]>) {
      state.unavailable = action.payload;
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

export const { tickersApplied, socketStatusChanged, subscriptionsSettled } =
  coinsSlice.actions;
export default coinsSlice.reducer;

export const selectCoinsStatus = (s: RootState) => s.coins.status;
export const selectCoinsError = (s: RootState) => s.coins.error;
export const selectSocketStatus = (s: RootState) => s.coins.socket;

// Refusals counted against the rows that exist. The socket subscribes from the
// local registry, so it can refuse a symbol the REST seed never priced and no
// row was ever built for — counting that as a shortfall reports it against a
// total it was never part of.
export const selectUnavailableOnScreen = (s: RootState) =>
  s.coins.items.filter((coin) =>
    s.coins.unavailable.includes(coin.symbol.toUpperCase()),
  ).length;

// Per-coin, so one refused symbol re-renders one row rather than the list.
export const selectIsCoinUnavailable = (id: string) => (s: RootState) => {
  const coin = s.coins.items.find((c) => c.id === id);
  return coin ? s.coins.unavailable.includes(coin.symbol.toUpperCase()) : false;
};

// Use with `shallowEqual` — this builds a new array every call, so a reference
// check re-renders the whole list on every tick.
export const selectCoinIds = (s: RootState) => s.coins.items.map((c) => c.id);
// Per-coin, so a tick re-renders only that coin's row.
export const selectCoinById = (id: string) => (s: RootState) =>
  s.coins.items.find((c) => c.id === id);
