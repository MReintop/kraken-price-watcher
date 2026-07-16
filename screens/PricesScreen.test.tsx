import { render, screen, fireEvent, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import coinsReducer, {
  socketStatusChanged,
  subscriptionsSettled,
  tickersApplied,
} from '../store/coinsSlice';
import { NavigateKey } from '../types';
import { makeCoin, stubUpstreams } from '../test/upstreams';
import PricesScreen from './PricesScreen';

// A real store with the real reducer (no listener middleware → no live socket).
const setupStore = () => configureStore({ reducer: { coins: coinsReducer } });

const renderScreen = (store = setupStore()) => {
  const navigation = { navigate: jest.fn() } as any;
  const utils = render(
    <Provider store={store}>
      <PricesScreen navigation={navigation} route={{} as any} />
    </Provider>,
  );
  return { ...utils, navigation, store };
};

afterEach(() => jest.resetAllMocks());

describe('PricesScreen (integration with a real store)', () => {
  it('loads coins from the API into the store and renders them', async () => {
    // Arrange
    stubUpstreams({
      coins: [
        makeCoin(),
        makeCoin({ id: 'ethereum', name: 'Ethereum', symbol: 'eth' }),
      ],
    });

    // Act
    const { store } = renderScreen();

    // Assert — UI reflects the fetched data...
    expect(await screen.findByText('Bitcoin')).toBeTruthy();
    expect(screen.getByText('Ethereum')).toBeTruthy();
    // ...and the store actually holds it (proves the thunk → reducer path).
    expect(store.getState().coins.items).toHaveLength(2);
  });

  it('shows the price Kraken quoted, not the one CoinGecko listed', async () => {
    // Arrange — identity and price come from different upstreams now
    stubUpstreams({ coins: [makeCoin({ current_price: 64788 })] });

    // Act
    renderScreen();

    // Assert
    expect(await screen.findByText(/64,788/)).toBeTruthy();
  });

  it('names the coin from the registry, not from CoinGecko', async () => {
    // Arrange — CoinGecko is answering, and calling it something else
    stubUpstreams({
      coins: [makeCoin({ name: 'Bitcoin (renamed upstream)' })],
    });

    // Act
    renderScreen();

    // Assert — identity must not change source with CoinGecko's health, for the
    // same reason the price does not
    expect(await screen.findByText('Bitcoin')).toBeTruthy();
  });

  it('navigates to the detail screen with the coin when a card is pressed', async () => {
    // Arrange
    stubUpstreams();
    const { navigation } = renderScreen();
    await screen.findByText('Bitcoin');

    // Act
    fireEvent.click(screen.getByRole('button'));

    // Assert
    expect(navigation.navigate).toHaveBeenCalledWith(NavigateKey.CoinDetail, {
      coinId: 'bitcoin',
    });
  });

  it('shows an error state when Kraken cannot be reached', async () => {
    // Arrange — 404, not 503: a 5xx is retried with backoff, so it would not
    // surface for several seconds. The retry itself is covered in lib/http.
    stubUpstreams({ tickerStatus: 404 });

    // Act
    renderScreen();

    // Assert — no Kraken means no prices, which is the one upstream that is
    // the product rather than decoration around it
    expect(await screen.findByText(/HTTP 404/)).toBeTruthy();
  });

  // Kraken owns every price; CoinGecko owns the figures beside them. An outage
  // in the second must not take the first off screen.
  describe('when CoinGecko is down but Kraken is healthy', () => {
    const renderWithoutContext = () => {
      stubUpstreams({
        coins: [makeCoin({ current_price: 64788 })],
        metadataStatus: 404,
      });
      return renderScreen();
    };

    it('still shows the Kraken price', async () => {
      // Arrange / Act
      renderWithoutContext();

      // Assert
      expect(await screen.findByText(/64,788/)).toBeTruthy();
    });

    it('still names the coin, from the local registry', async () => {
      // Arrange / Act
      renderWithoutContext();

      // Assert — identity is local, so it does not depend on either upstream
      expect(await screen.findByText('Bitcoin')).toBeTruthy();
      expect(screen.getByText('BTC')).toBeTruthy();
    });

    it('applies live ticks to a coin CoinGecko never described', async () => {
      // Arrange
      const { store } = renderWithoutContext();
      await screen.findByText('Bitcoin');

      // Act
      act(() => {
        store.dispatch(tickersApplied([{ symbol: 'BTC', last: 70000 }]));
      });

      // Assert — the row exists to receive the tick, which is the whole point
      // of not gating it on metadata
      expect(await screen.findByText(/70,000/)).toBeTruthy();
    });

    it('omits the 24h change rather than inventing a flat one', async () => {
      // Arrange / Act
      renderWithoutContext();
      await screen.findByText('Bitcoin');

      // Assert — "▲ 0.00%" would be a number nobody reported
      expect(screen.queryByText(/%/)).toBeNull();
    });

    it('does not show the error screen', async () => {
      // Arrange / Act
      renderWithoutContext();
      await screen.findByText('Bitcoin');

      // Assert
      expect(screen.queryByText(/HTTP 404/)).toBeNull();
    });
  });

  it('shows a live tick without refetching', async () => {
    // Arrange
    stubUpstreams({ coins: [makeCoin({ current_price: 62888 })] });
    const { store } = renderScreen();
    await screen.findByText('Bitcoin');

    // Act — what the socket does, minus the socket
    act(() => {
      store.dispatch(tickersApplied([{ symbol: 'BTC', last: 63500 }]));
    });

    // Assert
    expect(await screen.findByText(/63,500/)).toBeTruthy();
  });

  it('matches a tick to its coin regardless of symbol case', async () => {
    // Arrange — the API lists 'btc'; the socket sends 'BTC'
    stubUpstreams({ coins: [makeCoin({ symbol: 'btc' })] });
    const { store } = renderScreen();
    await screen.findByText('Bitcoin');

    // Act
    act(() => {
      store.dispatch(tickersApplied([{ symbol: 'BTC', last: 70000 }]));
    });

    // Assert — a casing mismatch here would silently show a stale price
    expect(await screen.findByText(/70,000/)).toBeTruthy();
  });

  it('ignores a tick for a coin it is not showing', async () => {
    // Arrange
    stubUpstreams({ coins: [makeCoin({ current_price: 62888 })] });
    const { store } = renderScreen();
    await screen.findByText('Bitcoin');

    // Act
    act(() => {
      store.dispatch(tickersApplied([{ symbol: 'DOGE', last: 999 }]));
    });

    // Assert
    expect(screen.getByText(/62,888/)).toBeTruthy();
  });

  it('applies every tick in a batch', async () => {
    // Arrange
    stubUpstreams({
      coins: [
        makeCoin(),
        makeCoin({ id: 'ethereum', name: 'Ethereum', symbol: 'eth' }),
      ],
    });
    const { store } = renderScreen();
    await screen.findByText('Bitcoin');

    // Act
    act(() => {
      store.dispatch(
        tickersApplied([
          { symbol: 'BTC', last: 11111 },
          { symbol: 'ETH', last: 22222 },
        ]),
      );
    });

    // Assert
    expect(await screen.findByText(/11,111/)).toBeTruthy();
    expect(screen.getByText(/22,222/)).toBeTruthy();
  });

  // The socket settling with one symbol refused is the state these assert. The
  // socket's own tests prove it dispatches that; only a rendered screen proves
  // anybody is listening.
  describe('a partially subscribed feed', () => {
    const renderTwoCoins = async () => {
      stubUpstreams({
        coins: [
          makeCoin(),
          makeCoin({ id: 'ethereum', name: 'Ethereum', symbol: 'eth' }),
        ],
      });
      const rendered = renderScreen();
      await screen.findByText('Bitcoin');
      return rendered;
    };

    const settleWith = (
      store: ReturnType<typeof setupStore>,
      refused: string[],
    ) =>
      act(() => {
        store.dispatch(subscriptionsSettled(refused));
        store.dispatch(socketStatusChanged('live'));
      });

    it('marks the refused coin rather than leaving its seed looking current', async () => {
      // Arrange
      const { store } = await renderTwoCoins();

      // Act — Kraken took BTC and refused ETH
      settleWith(store, ['ETH']);

      // Assert — ETH still shows its REST seed, and now says so
      expect(await screen.findByText('Not updating')).toBeTruthy();
    });

    it('counts the degraded feed in the header', async () => {
      // Arrange
      const { store } = await renderTwoCoins();

      // Act
      settleWith(store, ['ETH']);

      // Assert — "Live" here would cover for the frozen row
      expect(await screen.findByText('Degraded 1/2')).toBeTruthy();
      expect(screen.queryByText('Live')).toBeNull();
    });

    it('counts only the coins actually on screen', async () => {
      // Arrange — the socket subscribes from the local registry, so it can refuse
      // a symbol Kraken's REST seed never returned a price for
      stubUpstreams({ coins: [makeCoin()] });
      const { store } = renderScreen();
      await screen.findByText('Bitcoin');

      // Act — ETH is refused, and was never rendered
      settleWith(store, ['ETH']);

      // Assert — every row on screen is live; counting a refusal for a row that
      // does not exist reports a shortfall against the wrong total
      expect(await screen.findByText('Live')).toBeTruthy();
    });

    it('leaves a fully subscribed feed saying Live', async () => {
      // Arrange
      const { store } = await renderTwoCoins();

      // Act
      settleWith(store, []);

      // Assert
      expect(await screen.findByText('Live')).toBeTruthy();
      expect(screen.queryByText('Not updating')).toBeNull();
    });

    it('marks only the refused row', async () => {
      // Arrange
      const { store } = await renderTwoCoins();

      // Act
      settleWith(store, ['ETH']);
      await screen.findByText('Not updating');

      // Assert — BTC was accepted, so nothing on its card should say otherwise
      expect(screen.getAllByText('Not updating')).toHaveLength(1);
    });
  });
});
