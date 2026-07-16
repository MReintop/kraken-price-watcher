import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Coin, FetchStatus } from '../types';
import {
  fetchCoins as fetchCoinsFromApi,
  fetchMarketContext as fetchMarketContextFromApi,
  type CoinContext,
} from '../lib/coins';
import type { RootState } from './store';

// `live` needs an ack for every symbol and a ticker since; `stale` is the one a
// boolean cannot express — connected, believed healthy, silently frozen.
export type SocketStatus = 'connecting' | 'live' | 'stale' | 'offline';

interface CoinsState {
  items: Coin[];
  status: FetchStatus;
  error?: string;
  socket: SocketStatus;
  // Symbols Kraken refused: their price is the frozen REST seed.
  unavailable: string[];
  // Kept, not merged-and-dropped: context can land before the prices it decorates.
  context: Record<string, CoinContext>;
  // Guards against a slow earlier context request overwriting a newer one.
  contextRequestId?: string;
}

const initialState: CoinsState = {
  items: [],
  status: FetchStatus.Idle,
  socket: 'connecting',
  unavailable: [],
  context: {},
};

// Price only: change_pct is Kraken's venue, the on-screen 24h is CoinGecko's
// cross-exchange one, so taking it would swap the source under the label.
export interface KrakenTick {
  symbol: string; // base symbol, upper-case (e.g. "BTC")
  last: number;
}

const decorate = (coin: Coin, context?: CoinContext) => {
  if (!context) return;
  coin.image = context.image;
  coin.market_cap = context.market_cap;
  coin.total_volume = context.total_volume;
  coin.price_change_percentage_24h = context.price_change_percentage_24h;
};

// Rejection means Kraken failed — a market with no prices. The message reaches
// the error view as-is.
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

// Separate from the prices, and silent on failure: the market renders without it.
export const fetchMarketContext = createAsyncThunk<CoinContext[], void>(
  'coins/fetchContext',
  () => fetchMarketContextFromApi(),
);

const coinsSlice = createSlice({
  name: 'coins',
  initialState,
  reducers: {
    tickersApplied(state, action: PayloadAction<KrakenTick[]>) {
      for (const tick of action.payload) {
        const coin = state.items.find(
          (c) => c.symbol.toUpperCase() === tick.symbol,
        );
        // Skip an unchanged price: repeat trades at one level are common, and
        // re-assigning would churn the row for nothing.
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
        for (const coin of state.items) decorate(coin, state.context[coin.id]);
        state.status = FetchStatus.Succeeded;
      })
      .addCase(fetchCoins.rejected, (state, action) => {
        state.status = FetchStatus.Failed;
        state.error = action.payload ?? 'Failed to load prices';
      })
      .addCase(fetchMarketContext.pending, (state, action) => {
        state.contextRequestId = action.meta.requestId;
      })
      .addCase(fetchMarketContext.fulfilled, (state, action) => {
        // Drop a slow earlier request: its older figures must not land on newer.
        if (action.meta.requestId !== state.contextRequestId) return;
        state.context = Object.fromEntries(
          action.payload.map((entry) => [entry.id, entry]),
        );
        for (const coin of state.items) decorate(coin, state.context[coin.id]);
      });
  },
});

export const { tickersApplied, socketStatusChanged, subscriptionsSettled } =
  coinsSlice.actions;
export default coinsSlice.reducer;

export const selectCoinsStatus = (s: RootState) => s.coins.status;
export const selectCoinsError = (s: RootState) => s.coins.error;
export const selectSocketStatus = (s: RootState) => s.coins.socket;

// Refusals counted against rendered rows only: the socket can refuse a symbol
// that never got a row, and that is no shortfall against what is on screen.
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
