import { formatPrice } from './formatPrice';

describe('formatPrice', () => {
  it('shows no decimals for large prices', () => {
    // Arrange
    const price = 62888;

    // Act
    const result = formatPrice(price);

    // Assert
    expect(result).toBe('$62,888');
  });

  it('shows 2 decimals for mid-range prices', () => {
    // Arrange
    const price = 1781.73;

    // Act
    const result = formatPrice(price);

    // Assert
    expect(result).toBe('$1,781.73');
  });

  it('shows 4 decimals for sub-dollar prices', () => {
    // Arrange
    const price = 0.1625;

    // Act
    const result = formatPrice(price);

    // Assert
    expect(result).toBe('$0.1625');
  });
});
