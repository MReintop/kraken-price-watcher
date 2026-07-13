import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import coinsReducer from '../store/coinsSlice';
import { Coin } from '../types';
import PricesScreen from './PricesScreen';

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

// A real store with the real reducer (no listener middleware → no live socket).
const setupStore = () => configureStore({ reducer: { coins: coinsReducer } });

const mockFetchOnce = (data: unknown, ok = true, status = 200) => {
  (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
    ok,
    status,
    json: async () => data,
  });
};

const renderScreen = (store = setupStore()) => {
  const navigation = { navigate: jest.fn() } as any;
  const utils = render(
    <Provider store={store}>
      <PricesScreen navigation={navigation} route={{} as any} />
    </Provider>,
  );
  return { ...utils, navigation, store };
};

beforeEach(() => {
  globalThis.fetch = jest.fn() as unknown as typeof fetch;
});

afterEach(() => {
  jest.resetAllMocks();
});

describe('PricesScreen (integration with a real store)', () => {
  it('loads coins from the API into the store and renders them', async () => {
    // Arrange
    mockFetchOnce([
      makeCoin(),
      makeCoin({ id: 'ethereum', name: 'Ethereum', symbol: 'eth' }),
    ]);

    // Act
    const { store } = renderScreen();

    // Assert — UI reflects the fetched data...
    expect(await screen.findByText('Bitcoin')).toBeTruthy();
    expect(screen.getByText('Ethereum')).toBeTruthy();
    // ...and the store actually holds it (proves the thunk → reducer path).
    expect(store.getState().coins.items).toHaveLength(2);
  });

  it('navigates to the detail screen with the coin when a card is pressed', async () => {
    // Arrange
    mockFetchOnce([makeCoin()]);
    const { navigation } = renderScreen();
    await screen.findByText('Bitcoin');

    // Act
    fireEvent.click(screen.getByRole('button'));

    // Assert
    expect(navigation.navigate).toHaveBeenCalledWith('CoinDetail', {
      coin: expect.objectContaining({ id: 'bitcoin' }),
    });
  });

  it('shows an error state when the request fails', async () => {
    // Arrange
    mockFetchOnce({}, false, 503);

    // Act
    renderScreen();

    // Assert
    expect(await screen.findByText('HTTP 503')).toBeTruthy();
  });
});
