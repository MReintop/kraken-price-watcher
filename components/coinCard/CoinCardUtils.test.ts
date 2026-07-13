import { getCoinDetails } from './CoinCardUtils';
import { Coin } from '../../types';

// Test-data builder: gives each test a valid Coin and lets the Arrange step
// state ONLY the field under test via overrides.
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

describe('getCoinDetails', () => {
  it('formats price with thousands separators', () => {
    // Arrange
    const coin = makeCoin({ current_price: 62888 });

    // Act
    const result = getCoinDetails(coin);

    // Assert
    expect(result.priceLabel).toBe('$62,888');
  });

  it('marks a negative change as down + red', () => {
    // Arrange
    const coin = makeCoin({ price_change_percentage_24h: -1.45 });

    // Act
    const result = getCoinDetails(coin);

    // Assert
    expect(result.isUp).toBe(false);
    expect(result.changeLabel).toContain('▼');
  });

  it('marks a positive change as up + green', () => {
    // Arrange
    const coin = makeCoin({ price_change_percentage_24h: 2.5 });

    // Act
    const result = getCoinDetails(coin);

    // Assert
    expect(result.isUp).toBe(true);
    expect(result.changeLabel).toBe('▲ 2.50%');
  });
});
