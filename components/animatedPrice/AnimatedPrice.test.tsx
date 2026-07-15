import { render, screen } from '@testing-library/react';
import { Animated } from 'react-native';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import AnimatedPrice from './AnimatedPrice';

// The hook asks the OS, asynchronously — which leaves the process, and would
// otherwise decide mid-test which branch this component takes.
jest.mock('../../hooks/useReducedMotion', () => ({
  useReducedMotion: jest.fn(),
}));
const mockReducedMotion = (enabled: boolean) =>
  (useReducedMotion as jest.Mock).mockReturnValue(enabled);

beforeEach(() => mockReducedMotion(false));
afterEach(() => jest.restoreAllMocks());

describe('AnimatedPrice', () => {
  it('renders the formatted price on first paint, unanimated', () => {
    // Arrange / Act
    render(<AnimatedPrice value={62888} />);

    // Assert — the opening value is the real one, not a tween from zero
    expect(screen.getByText('$62,888')).toBeTruthy();
  });

  // jsdom runs the tween to completion synchronously, so the intermediate
  // frames are not observable here — only whether a tween was created at all.
  it('tweens towards a new value rather than setting it', () => {
    // Arrange
    const timing = jest.spyOn(Animated, 'timing');
    const { rerender } = render(<AnimatedPrice value={62888} />);

    // Act
    rerender(<AnimatedPrice value={63500} />);

    // Assert
    expect(timing).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: 63500 }),
    );
    expect(screen.getByText('$63,500')).toBeTruthy();
  });

  it('jumps straight to the new value under reduced motion', () => {
    // Arrange
    mockReducedMotion(true);
    const timing = jest.spyOn(Animated, 'timing');
    const { rerender } = render(<AnimatedPrice value={62888} />);

    // Act
    rerender(<AnimatedPrice value={63500} />);

    // Assert — no tween at all, and the price is current rather than stale
    expect(timing).not.toHaveBeenCalled();
    expect(screen.getByText('$63,500')).toBeTruthy();
  });
});
