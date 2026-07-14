import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import coinsReducer from '../store/coinsSlice';
import { Coin, FetchStatus } from '../types';
import { useCandles } from '../hooks/useCandles';
import CoinDetailScreen from './CoinDetailScreen';

// Stub the chart's data hook (its fetching is covered by useCandles' own tests);
// this test only exercises the screen: store lookup → composed sections + title.
jest.mock('../hooks/useCandles', () => ({ useCandles: jest.fn() }));
const mockUseCandles = useCandles as jest.Mock;

const makeCoin = (overrides: Partial<Coin> = {}): Coin => ({
  id: 'bitcoin',
  name: 'Bitcoin',
  symbol: 'btc',
  image: 'x',
  current_price: 62888,
  price_change_percentage_24h: -1.45,
  market_cap: 1234567,
  total_volume: 890123,
  ...overrides,
});

// Arrange helper: a store preloaded with the given coins.
const setupStore = (items: Coin[]) =>
  configureStore({
    reducer: { coins: coinsReducer },
    preloadedState: {
      coins: { items, status: FetchStatus.Succeeded, live: true },
    },
  });

// Act helper: render the detail screen for a coin id against a preloaded store.
const renderScreen = (items: Coin[], coinId = 'bitcoin') => {
  const navigation = { setOptions: jest.fn() } as any;
  const utils = render(
    <Provider store={setupStore(items)}>
      <CoinDetailScreen
        navigation={navigation}
        route={{ params: { coinId } } as any}
      />
    </Provider>,
  );
  return { ...utils, navigation };
};

beforeEach(() => {
  mockUseCandles.mockReturnValue({
    byTimeframe: undefined,
    status: FetchStatus.Loading,
  });
});

afterEach(() => jest.clearAllMocks());

describe('CoinDetailScreen', () => {
  it('renders the coin header and stats for the coin from the store', () => {
    // Arrange / Act
    renderScreen([makeCoin()]);

    // Assert — header (name/ticker) and stats sections are composed in
    expect(screen.getByText('Bitcoin')).toBeTruthy();
    expect(screen.getByText('BTC')).toBeTruthy();
    expect(screen.getByText('Market cap')).toBeTruthy();
  });

  it('sets the navigation title to the coin name', () => {
    // Arrange / Act
    const { navigation } = renderScreen([makeCoin()]);

    // Assert
    expect(navigation.setOptions).toHaveBeenCalledWith({ title: 'Bitcoin' });
  });

  it('renders nothing when the coin is not in the store', () => {
    // Arrange / Act
    const { container, navigation } = renderScreen([]);

    // Assert
    expect(container.firstChild).toBeNull();
    expect(navigation.setOptions).not.toHaveBeenCalled();
  });
});
