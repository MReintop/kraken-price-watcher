import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import coinsReducer from '../../store/coinsSlice';
import { Coin, FetchStatus } from '../../types';
import CoinList from './CoinList';

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

// Arrange helper: a store preloaded with the given coins (cards read from it).
const setupStore = (items: Coin[]) =>
  configureStore({
    reducer: { coins: coinsReducer },
    preloadedState: {
      coins: { items, status: FetchStatus.Succeeded, live: true },
    },
  });

// Act helper: render the list of the given coins against a preloaded store.
const renderList = (
  items: Coin[],
  {
    onSelect = jest.fn(),
    onRefresh = jest.fn().mockResolvedValue(undefined),
  } = {},
) =>
  render(
    <Provider store={setupStore(items)}>
      <CoinList
        coinIds={items.map((c) => c.id)}
        onSelect={onSelect}
        onRefresh={onRefresh}
      />
    </Provider>,
  );

describe('CoinList', () => {
  it('renders a card for each coin id', () => {
    // Arrange / Act
    renderList([
      makeCoin(),
      makeCoin({ id: 'ethereum', name: 'Ethereum', symbol: 'eth' }),
    ]);

    // Assert
    expect(screen.getByText('Bitcoin')).toBeTruthy();
    expect(screen.getByText('Ethereum')).toBeTruthy();
  });

  it('calls onSelect with the coin id when a card is pressed', () => {
    // Arrange
    const onSelect = jest.fn();
    renderList([makeCoin()], { onSelect });

    // Act
    fireEvent.click(screen.getByRole('button'));

    // Assert
    expect(onSelect).toHaveBeenCalledWith('bitcoin');
  });
});
