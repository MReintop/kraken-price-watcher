import { render, screen, fireEvent, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import coinsReducer, { tickersApplied } from '../store/coinsSlice';
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

  it('shows an error state when the identity request fails', async () => {
    // Arrange — 404, not 503: a 5xx is retried with backoff, so it would not
    // surface for several seconds. The retry itself is covered in lib/http.
    stubUpstreams({ metadataStatus: 404 });

    // Act
    renderScreen();

    // Assert
    expect(await screen.findByText(/HTTP 404/)).toBeTruthy();
  });

  it('shows a live tick without refetching', async () => {
    // Arrange
    stubUpstreams({ coins: [makeCoin({ current_price: 62888 })] });
    const { store } = renderScreen();
    await screen.findByText('Bitcoin');

    // Act — what the socket does, minus the socket
    act(() => {
      store.dispatch(
        tickersApplied([{ symbol: 'BTC', last: 63500, changePct: 2 }]),
      );
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
      store.dispatch(
        tickersApplied([{ symbol: 'BTC', last: 70000, changePct: 1 }]),
      );
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
      store.dispatch(
        tickersApplied([{ symbol: 'DOGE', last: 999, changePct: 5 }]),
      );
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
          { symbol: 'BTC', last: 11111, changePct: 1 },
          { symbol: 'ETH', last: 22222, changePct: 2 },
        ]),
      );
    });

    // Assert
    expect(await screen.findByText(/11,111/)).toBeTruthy();
    expect(screen.getByText(/22,222/)).toBeTruthy();
  });
});
