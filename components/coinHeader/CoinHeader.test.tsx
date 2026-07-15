import { render, screen } from '@testing-library/react';
import { Coin } from '../../types';
import CoinHeader from './CoinHeader';

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

describe('CoinHeader', () => {
  it('renders the name, upper-case ticker and 24h change', () => {
    // Arrange
    const coin = makeCoin({
      name: 'Bitcoin',
      symbol: 'btc',
      price_change_percentage_24h: -1.45,
    });

    // Act
    render(<CoinHeader coin={coin} />);

    // Assert
    expect(screen.getByText('Bitcoin')).toBeTruthy();
    expect(screen.getByText('BTC')).toBeTruthy();
    // The arrow carries the sign; "▼ -1.45%" would say it twice.
    expect(screen.getByText('▼ 1.45% (24h)')).toBeTruthy();
  });

  it('renders the current price', () => {
    // Arrange
    const coin = makeCoin({ current_price: 62888 });

    // Act
    render(<CoinHeader coin={coin} />);

    // Assert
    expect(screen.getByText('$62,888')).toBeTruthy();
  });

  it('shows the new price immediately, never a value between the two', () => {
    // Arrange
    const { rerender } = render(
      <CoinHeader coin={makeCoin({ current_price: 62888 })} />,
    );

    // Act — the next trade lands
    rerender(<CoinHeader coin={makeCoin({ current_price: 63500 })} />);

    // Assert — a tween would still be showing $62,888 here, then walk through
    // prices that were never traded on the way up
    expect(screen.getByText('$63,500')).toBeTruthy();
    expect(screen.queryByText('$62,888')).toBeNull();
  });
});
