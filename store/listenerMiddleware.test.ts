import { configureStore } from '@reduxjs/toolkit';
import type { Coin } from '../types';

const makeCoin = (overrides: Partial<Coin> = {}): Coin => ({
  id: 'bitcoin',
  name: 'Bitcoin',
  symbol: 'btc',
  image: 'x',
  current_price: 62888,
  price_change_percentage_24h: -1.45,
  market_cap: 0,
  total_volume: 0,
  ...overrides,
});

// The middleware registers its listener and tracks `stopSocket` at module scope,
// so each test needs a FRESH copy of the module (reset registry + re-require)
// to exercise the "start once" guard from a clean slate. krakenSocket is mocked
// so no real WebSocket opens; we assert on how the listener drives it.
const setup = () => {
  jest.resetModules();
  const startKrakenTicker = jest.fn(() => jest.fn()); // returns a stop fn
  jest.doMock('./krakenSocket', () => ({ startKrakenTicker }));

  const { listenerMiddleware } = require('./listenerMiddleware');
  const coinsReducer = require('./coinsSlice').default;
  const { fetchCoins } = require('./coinsSlice');

  const store = configureStore({
    reducer: { coins: coinsReducer },
    middleware: (getDefault: any) =>
      getDefault().prepend(listenerMiddleware.middleware),
  });

  return { store, startKrakenTicker, fetchCoins };
};

// Let the listener effect (scheduled as a microtask) run before asserting.
const flush = () => new Promise((r) => setTimeout(r, 0));

afterEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
});

describe('listenerMiddleware — Kraken socket lifecycle', () => {
  it('starts the ticker with the coin symbols on the first successful load', async () => {
    // Arrange
    const { store, startKrakenTicker, fetchCoins } = setup();

    // Act
    store.dispatch(
      fetchCoins.fulfilled(
        [
          makeCoin({ symbol: 'btc' }),
          makeCoin({ id: 'ethereum', symbol: 'eth' }),
        ],
        'req-1',
        undefined,
      ),
    );
    await flush();

    // Assert — symbols passed through, plus a dispatch fn for tick delivery
    expect(startKrakenTicker).toHaveBeenCalledTimes(1);
    expect(startKrakenTicker).toHaveBeenCalledWith(
      ['btc', 'eth'],
      expect.any(Function),
    );
  });

  it('does not re-open the socket on a later refetch', async () => {
    // Arrange
    const { store, startKrakenTicker, fetchCoins } = setup();

    // Act — two successful loads in a row
    store.dispatch(fetchCoins.fulfilled([makeCoin()], 'req-1', undefined));
    await flush();
    store.dispatch(fetchCoins.fulfilled([makeCoin()], 'req-2', undefined));
    await flush();

    // Assert — the listener unsubscribed itself after the first start
    expect(startKrakenTicker).toHaveBeenCalledTimes(1);
  });
});
