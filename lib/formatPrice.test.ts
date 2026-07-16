import { formatPrice } from './formatPrice';

describe('formatPrice', () => {
  // The headline case: Kraken quotes BTC/USD to a tenth of a dollar, so this is a
  // trade that really happened — magnitude would round it to $62,888.
  it('renders a price at the precision its market trades in', () => {
    // Arrange / Act
    const result = formatPrice(62888.4, 1);

    // Assert
    expect(result).toBe('$62,888.4');
  });

  it('pads a round trade out to the market precision', () => {
    // Arrange / Act — landed on a whole dollar, in a tenth-of-a-dollar market
    const result = formatPrice(62888, 1);

    // Assert
    expect(result).toBe('$62,888.0');
  });

  it('keeps enough precision for a sub-$1 asset to visibly tick', () => {
    // Arrange / Act — a dogecoin move at 7 decimals
    const before = formatPrice(0.0712, 7);
    const after = formatPrice(0.0698, 7);

    // Assert
    expect(before).toBe('$0.0712000');
    expect(after).not.toBe(before);
  });

  it('renders whole-unit aggregates (market cap, volume) without decimals', () => {
    // Arrange / Act
    const result = formatPrice(1_000_000, 0);

    // Assert
    expect(result).toBe('$1,000,000');
  });

  // The size of the number is not evidence about the market it traded on.
  it('lets the market decide the decimals, never the size of the value', () => {
    // Arrange / Act — same 2-decimal market, either side of any magnitude line
    expect(formatPrice(9999.99, 2)).toBe('$9,999.99');
    expect(formatPrice(10_000.5, 2)).toBe('$10,000.50');
  });
});
