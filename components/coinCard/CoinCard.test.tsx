import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import coinsReducer from '../../store/coinsSlice';
import { Coin, FetchStatus } from '../../types';
import CoinCard from './CoinCard';

const bitcoin: Coin = {
  id: 'bitcoin',
  name: 'Bitcoin',
  symbol: 'btc',
  image: 'x',
  current_price: 62888,
  price_change_percentage_24h: -1.45,
  market_cap: 0,
  total_volume: 0,
};

// Render CoinCard inside a store preloaded with the given coins.
function renderCard(items: Coin[], onSelect = jest.fn()) {
  const store = configureStore({
    reducer: { coins: coinsReducer },
    preloadedState: {
      coins: { items, status: FetchStatus.Succeeded, live: true },
    },
  });
  const utils = render(
    <Provider store={store}>
      <CoinCard coinId="bitcoin" onSelect={onSelect} />
    </Provider>,
  );
  return { ...utils, onSelect };
}

describe('CoinCard', () => {
  it('renders the coin name, ticker and formatted price', () => {
    // Arrange / Act
    renderCard([bitcoin]);

    // Assert
    expect(screen.getByText('Bitcoin')).toBeTruthy();
    expect(screen.getByText('BTC')).toBeTruthy();
    expect(screen.getByText('$62,888')).toBeTruthy();
  });

  it('calls onSelect with the coin when pressed', () => {
    // Arrange
    const { onSelect } = renderCard([bitcoin]);

    // Act
    fireEvent.click(screen.getByRole('button'));

    // Assert
    expect(onSelect).toHaveBeenCalledWith(bitcoin);
  });

  it('renders nothing when the coin is not in the store', () => {
    // Arrange / Act
    const { container } = renderCard([]);

    // Assert
    expect(container.firstChild).toBeNull();
  });
});
