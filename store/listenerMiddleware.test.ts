import { configureStore } from '@reduxjs/toolkit';
import { TRACKED_COINS } from '../lib/coins';

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

const ALL_SYMBOLS = TRACKED_COINS.map((coin) => coin.symbol);

afterEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
});

describe('listenerMiddleware — Kraken socket lifecycle', () => {
  it('starts the ticker as soon as the app asks for coins', async () => {
    // Arrange
    const { store, startKrakenTicker, fetchCoins } = setup();

    // Act
    store.dispatch(fetchCoins.pending('req-1', undefined));
    await flush();

    // Assert — symbols come from the local registry, plus a dispatch fn
    expect(startKrakenTicker).toHaveBeenCalledTimes(1);
    expect(startKrakenTicker).toHaveBeenCalledWith(
      ALL_SYMBOLS,
      expect.any(Function),
    );
  });

  it('starts the ticker even when CoinGecko fails outright', async () => {
    // Arrange
    const { store, startKrakenTicker, fetchCoins } = setup();

    // Act — the metadata call errors; Kraken itself is perfectly healthy
    store.dispatch(fetchCoins.pending('req-1', undefined));
    store.dispatch(
      fetchCoins.rejected(new Error('429'), 'req-1', undefined, 'rate limited'),
    );
    await flush();

    // Assert — a CoinGecko outage must not hide a working Kraken feed
    expect(startKrakenTicker).toHaveBeenCalledTimes(1);
  });

  it('does not re-open the socket on a later refetch', async () => {
    // Arrange
    const { store, startKrakenTicker, fetchCoins } = setup();

    // Act — a load, then a pull-to-refresh
    store.dispatch(fetchCoins.pending('req-1', undefined));
    await flush();
    store.dispatch(fetchCoins.pending('req-2', undefined));
    await flush();

    // Assert — the listener unsubscribed itself after the first start
    expect(startKrakenTicker).toHaveBeenCalledTimes(1);
  });
});
