import { render, screen } from '@testing-library/react';
import { Animated } from 'react-native';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import PriceTickIndicator from './PriceTickIndicator';

// The hook asks the OS, asynchronously — which leaves the process, and would
// otherwise decide mid-test which branch this component takes.
jest.mock('../../hooks/useReducedMotion', () => ({
  useReducedMotion: jest.fn(),
}));
const mockReducedMotion = (enabled: boolean) =>
  (useReducedMotion as jest.Mock).mockReturnValue(enabled);

// The indicator shows a single fade-out "blink" then hides itself when the
// animation completes. In jsdom that completion fires immediately (resetting to
// null), so stub `timing` to a no-op animation and observe the arrow mid-blink.
beforeEach(() => {
  mockReducedMotion(false);
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

  it('shows no arrow at all under reduced motion', () => {
    // Arrange
    mockReducedMotion(true);
    const { container, rerender } = render(<PriceTickIndicator price={100} />);

    // Act
    rerender(<PriceTickIndicator price={101} />);

    // Assert — the arrow is decoration, so it is omitted rather than stilled
    expect(container.firstChild).toBeNull();
    expect(Animated.timing).not.toHaveBeenCalled();
  });
});
