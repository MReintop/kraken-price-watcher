import { render, screen } from '@testing-library/react';
import { Coin } from '../../types';
import CoinStats from './CoinStats';

const makeCoin = (overrides: Partial<Coin> = {}): Coin => ({
  id: 'bitcoin',
  name: 'Bitcoin',
  symbol: 'btc',
  image: 'x',
  current_price: 62888,
  price_decimals: 1,
  price_change_percentage_24h: -1.45,
  market_cap: 0,
  total_volume: 0,
  ...overrides,
});

describe('CoinStats', () => {
  it('renders market cap and 24h volume with thousands separators', () => {
    // Arrange
    const coin = makeCoin({ market_cap: 1234567, total_volume: 890123 });

    // Act
    render(<CoinStats coin={coin} />);

    // Assert — build expected via the same toLocaleString so locale can't skew it
    expect(screen.getByText('Market cap')).toBeTruthy();
    expect(screen.getByText(`$${(1234567).toLocaleString()}`)).toBeTruthy();
    expect(screen.getByText('24h volume')).toBeTruthy();
    expect(screen.getByText(`$${(890123).toLocaleString()}`)).toBeTruthy();
  });

  it('says so when there is no market context, rather than showing zero', () => {
    // Arrange — what a CoinGecko outage leaves behind: a real Kraken price and
    // nothing to put beside it
    const coin = makeCoin({ market_cap: undefined, total_volume: undefined });

    // Act
    render(<CoinStats coin={coin} />);

    // Assert — "$0" here is a number nobody reported
    expect(screen.getByText('Market context unavailable')).toBeTruthy();
    expect(screen.queryByText('$0')).toBeNull();
  });
});
