import { renderHook, waitFor, act } from '@testing-library/react';
import { AccessibilityInfo } from 'react-native';
import { useReducedMotion } from './useReducedMotion';

type Listener = (enabled: boolean) => void;

// react-native-web ships AccessibilityInfo, but nothing in jsdom answers it, so
// the OS setting is stubbed here.
const stubAccessibilityInfo = (enabled: boolean) => {
  const listeners: Listener[] = [];
  jest
    .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
    .mockResolvedValue(enabled);
  jest
    .spyOn(AccessibilityInfo, 'addEventListener')
    .mockImplementation((_event, handler) => {
      listeners.push(handler as unknown as Listener);
      return { remove: jest.fn() } as never;
    });
  return { emit: (value: boolean) => listeners.forEach((l) => l(value)) };
};

afterEach(() => jest.restoreAllMocks());

describe('useReducedMotion', () => {
  it('reports false when the OS has motion enabled', async () => {
    // Arrange
    stubAccessibilityInfo(false);

    // Act
    const { result } = renderHook(() => useReducedMotion());

    // Assert
    await waitFor(() => expect(result.current).toBe(false));
  });

  it('reports true when the OS asks for reduced motion', async () => {
    // Arrange
    stubAccessibilityInfo(true);

    // Act
    const { result } = renderHook(() => useReducedMotion());

    // Assert
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('follows the setting being changed while the app is open', async () => {
    // Arrange — the user can flip this in Settings without relaunching
    const { emit } = stubAccessibilityInfo(false);
    const { result } = renderHook(() => useReducedMotion());
    await waitFor(() => expect(result.current).toBe(false));

    // Act
    act(() => emit(true));

    // Assert
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('removes its listener on unmount', async () => {
    // Arrange
    const remove = jest.fn();
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(false);
    jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockReturnValue({ remove } as never);
    const { unmount } = renderHook(() => useReducedMotion());

    // Act
    unmount();

    // Assert
    expect(remove).toHaveBeenCalled();
  });
});
