import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import coinsReducer from '../../store/coinsSlice';
import { Coin, FetchStatus } from '../../types';
import CoinCard from './CoinCard';

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

// Arrange helper: a store preloaded with the given coins.
const setupStore = (items: Coin[]) =>
  configureStore({
    reducer: { coins: coinsReducer },
    preloadedState: {
      coins: {
        items,
        status: FetchStatus.Succeeded,
        socket: 'live' as const,
        unavailable: [],
        context: true,
      },
    },
  });

// Act helper: render the card against a store.
const renderCard = (
  store: ReturnType<typeof setupStore>,
  onSelect = jest.fn(),
) =>
  render(
    <Provider store={store}>
      <CoinCard coinId="bitcoin" onSelect={onSelect} />
    </Provider>,
  );

describe('CoinCard', () => {
  it('renders the coin name, ticker and formatted price', () => {
    // Arrange
    const store = setupStore([makeCoin()]);

    // Act
    renderCard(store);

    // Assert
    expect(screen.getByText('Bitcoin')).toBeTruthy();
    expect(screen.getByText('BTC')).toBeTruthy();
    expect(screen.getByText('$62,888')).toBeTruthy();
  });

  it('calls onSelect when pressed', () => {
    // Arrange
    const onSelect = jest.fn();
    renderCard(setupStore([makeCoin()]), onSelect);

    // Act
    fireEvent.click(screen.getByRole('button'));

    // Assert
    expect(onSelect).toHaveBeenCalled();
  });

  it('renders nothing when the coin is not in the store', () => {
    // Arrange
    const store = setupStore([]);

    // Act
    const { container } = renderCard(store);

    // Assert
    expect(container.firstChild).toBeNull();
  });
});
