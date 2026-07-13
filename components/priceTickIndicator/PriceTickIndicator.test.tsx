import { render, screen } from '@testing-library/react';
import { Animated } from 'react-native';
import PriceTickIndicator from './PriceTickIndicator';

// The indicator shows a single fade-out "blink" then hides itself when the
// animation completes. In jsdom that completion fires immediately (resetting to
// null), so stub `timing` to a no-op animation and observe the arrow mid-blink.
beforeEach(() => {
  jest.spyOn(Animated, 'timing').mockReturnValue({
    start: jest.fn(),
    stop: jest.fn(),
    reset: jest.fn(),
  } as unknown as Animated.CompositeAnimation);
});
afterEach(() => jest.restoreAllMocks());

describe('PriceTickIndicator', () => {
  it('renders nothing until the price changes', () => {
    // Arrange / Act
    const { container } = render(<PriceTickIndicator price={100} />);

    // Assert
    expect(container.firstChild).toBeNull();
  });

  it('shows an up arrow when the price increases', () => {
    // Arrange
    const { rerender } = render(<PriceTickIndicator price={100} />);

    // Act
    rerender(<PriceTickIndicator price={101} />);

    // Assert — the mocked Ionicons renders its name as text
    expect(screen.getByText('arrow-up')).toBeTruthy();
  });

  it('shows a down arrow when the price decreases', () => {
    // Arrange
    const { rerender } = render(<PriceTickIndicator price={100} />);

    // Act
    rerender(<PriceTickIndicator price={99} />);

    // Assert
    expect(screen.getByText('arrow-down')).toBeTruthy();
  });
});
