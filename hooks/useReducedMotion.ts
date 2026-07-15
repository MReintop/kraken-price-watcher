import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// Tracks the OS "reduce motion" setting, which the user can change while the app
// is open, so animations can be skipped rather than merely shortened.
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let cancelled = false;

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (!cancelled) setReduced(enabled);
    });

    // Not every platform implements this event — react-native-web returns
    // nothing at all — so the subscription may not exist.
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduced,
    );

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  return reduced;
}
