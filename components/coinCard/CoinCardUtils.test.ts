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
  price_decimals: 1,
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
    const result = getCoinDetails(coin, true);

    // Assert
    expect(result.priceLabel).toBe('$62,888.0');
  });

  it('marks a negative change as down + red', () => {
    // Arrange
    const coin = makeCoin({ price_change_percentage_24h: -1.45 });

    // Act
    const result = getCoinDetails(coin, true);

    // Assert
    expect(result.change?.isUp).toBe(false);
    expect(result.change?.label).toContain('▼');
  });

  it('marks a positive change as up + green', () => {
    // Arrange
    const coin = makeCoin({ price_change_percentage_24h: 2.5 });

    // Act
    const result = getCoinDetails(coin, true);

    // Assert
    expect(result.change?.isUp).toBe(true);
    expect(result.change?.label).toBe('▲ 2.50%');
  });

  it('labels a loss without repeating the sign', () => {
    // Arrange
    const coin = makeCoin({ price_change_percentage_24h: -1.45 });

    // Act
    const result = getCoinDetails(coin, true);

    // Assert — the arrow already says it; "▼ -1.45%" says it twice
    expect(result.change?.label).toBe('▼ 1.45%');
  });

  it('speaks a loss in words, since a screen reader cannot read an arrow', () => {
    // Arrange
    const coin = makeCoin({
      name: 'Bitcoin',
      current_price: 62888,
      price_change_percentage_24h: -1.45,
    });

    // Act
    const result = getCoinDetails(coin, true);

    // Assert
    expect(result.a11yLabel).toBe(
      'Bitcoin, $62,888.0, down 1.45% in the last 24 hours',
    );
  });

  it('speaks a gain in words', () => {
    // Arrange
    const coin = makeCoin({
      name: 'Solana',
      current_price: 142.5,
      price_decimals: 2,
      price_change_percentage_24h: 5.1,
    });

    // Act
    const result = getCoinDetails(coin, true);

    // Assert
    expect(result.a11yLabel).toBe(
      'Solana, $142.50, up 5.10% in the last 24 hours',
    );
  });
});
