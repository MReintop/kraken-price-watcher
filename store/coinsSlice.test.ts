import { configureStore } from '@reduxjs/toolkit';
import reducer, { tickersApplied, fetchCoins, KrakenTick } from './coinsSlice';
import { Coin, FetchStatus } from '../types';

// Builders: state each test's Arrange in terms of ONLY the field under test.
const makeCoin = (overrides: Partial<Coin> = {}): Coin => ({
  id: 'bitcoin',
  name: 'Bitcoin',
  symbol: 'btc',
  image: 'x',
  current_price: 100,
  price_change_percentage_24h: 1,
  market_cap: 0,
  total_volume: 0,
  ...overrides,
});

type CoinsState = ReturnType<typeof reducer>;

const makeState = (overrides: Partial<CoinsState> = {}): CoinsState => ({
  items: [],
  status: FetchStatus.Idle,
  live: false,
  ...overrides,
});

const makeTick = (overrides: Partial<KrakenTick> = {}): KrakenTick => ({
  symbol: 'BTC',
  last: 200,
  changePct: 5,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Reducer unit tests — only for `tickersApplied`, whose symbol-matching logic
// is non-trivial. (Per the Redux testing guide, simpler reducers are treated as
// an implementation detail and covered via the integration tests below.)
// ---------------------------------------------------------------------------
describe('tickersApplied', () => {
  it('matches a coin case-insensitively and updates price + change', () => {
    // Arrange
    const state = makeState({ items: [makeCoin({ symbol: 'btc' })] });

    // Act
    const result = reducer(
      state,
      tickersApplied([makeTick({ symbol: 'BTC', last: 250, changePct: 7 })]),
    );

    // Assert
    expect(result.items[0].current_price).toBe(250);
    expect(result.items[0].price_change_percentage_24h).toBe(7);
  });

  it('ignores ticks for symbols not in the list', () => {
    // Arrange
    const state = makeState({ items: [makeCoin({ symbol: 'btc' })] });

    // Act
    const result = reducer(state, tickersApplied([makeTick({ symbol: 'DOGE' })]));

    // Assert — the known coin is untouched
    expect(result.items[0].current_price).toBe(100);
  });

  it('applies each tick in a batch to its matching coin', () => {
    // Arrange
    const state = makeState({
      items: [
        makeCoin({ id: 'bitcoin', symbol: 'btc' }),
        makeCoin({ id: 'ethereum', symbol: 'eth' }),
      ],
    });

    // Act
    const result = reducer(
      state,
      tickersApplied([
        makeTick({ symbol: 'BTC', last: 300 }),
        makeTick({ symbol: 'ETH', last: 20 }),
      ]),
    );

    // Assert
    expect(result.items[0].current_price).toBe(300);
    expect(result.items[1].current_price).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// Integration tests for the fetch lifecycle — a real store with the network
// mocked at the `fetch` level, dispatching the actual thunk (the guide's
// recommended way to cover pending/fulfilled/rejected).
// ---------------------------------------------------------------------------
describe('fetchCoins (integration)', () => {
  const makeStore = (preloaded?: CoinsState) =>
    configureStore({
      reducer: { coins: reducer },
      ...(preloaded ? { preloadedState: { coins: preloaded } } : {}),
    });

  const mockFetch = (impl: () => Promise<unknown>) => {
    (globalThis as { fetch?: unknown }).fetch = jest.fn(impl);
  };

  afterEach(() => {
    delete (globalThis as { fetch?: unknown }).fetch;
  });

  it('goes Loading then Succeeded and stores the coins on a first load', async () => {
    // Arrange
    const coins = [makeCoin({ id: 'solana', symbol: 'sol' })];
    mockFetch(async () => ({ ok: true, json: async () => coins }));
    const store = makeStore();

    // Act — pending fires synchronously, fulfilled after the await resolves
    const pending = store.dispatch(fetchCoins());
    const statusWhilePending = store.getState().coins.status;
    await pending;

    // Assert
    expect(statusWhilePending).toBe(FetchStatus.Loading);
    expect(store.getState().coins.status).toBe(FetchStatus.Succeeded);
    expect(store.getState().coins.items).toEqual(coins);
  });

  it('does NOT flash Loading on a background refresh (list already populated)', async () => {
    // Arrange — store already has data from a previous load
    mockFetch(async () => ({ ok: true, json: async () => [makeCoin()] }));
    const store = makeStore(
      makeState({ items: [makeCoin()], status: FetchStatus.Succeeded }),
    );

    // Act
    const pending = store.dispatch(fetchCoins());
    const statusWhilePending = store.getState().coins.status;
    await pending;

    // Assert — stays Succeeded so the UI doesn't blink a spinner
    expect(statusWhilePending).toBe(FetchStatus.Succeeded);
  });

  it('marks Failed with an HTTP message when the response is not ok', async () => {
    // Arrange
    mockFetch(async () => ({ ok: false, status: 500 }));
    const store = makeStore();

    // Act
    await store.dispatch(fetchCoins());

    // Assert
    expect(store.getState().coins.status).toBe(FetchStatus.Failed);
    expect(store.getState().coins.error).toBe('HTTP 500');
  });
});
