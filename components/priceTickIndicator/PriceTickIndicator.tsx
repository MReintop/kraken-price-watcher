import { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';
// Imported per family, not from the barrel: the barrel makes Metro emit every
// icon font in the package — megabytes of them — for the two glyphs used here.
import Ionicons from '@expo/vector-icons/Ionicons';
import { changeColors } from '../../theme';
import { useReducedMotion } from '../../hooks/useReducedMotion';

type Direction = 'up' | 'down';

interface PriceTickIndicatorProps {
  price: number;
}

export default function PriceTickIndicator({ price }: PriceTickIndicatorProps) {
  const prevPrice = useRef(price);
  const [direction, setDirection] = useState<Direction | null>(null);
  // Lazy state initializer: construct the Animated.Value once, stable reference.
  const [opacity] = useState(() => new Animated.Value(0));
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const prev = prevPrice.current;
    prevPrice.current = price;
    if (price === prev) return;

    // Decoration only, so reduced motion omits it rather than blinking it.
    if (reducedMotion) return;

    setDirection(price > prev ? 'up' : 'down');

    // One blink: appear at full, then fade out.
    opacity.setValue(1);
    // Opacity is one of the props the native driver supports, so the fade runs
    // off the JS thread — which is where the ticks are arriving.
    const animation = Animated.timing(opacity, {
      toValue: 0,
      duration: 900,
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished) setDirection(null);
    });

    return () => animation.stop();
  }, [price, opacity, reducedMotion]);

  if (!direction) return null;

  return (
    // Hidden: the price already announces the change; this would repeat it.
    <Animated.View
      style={{ opacity }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Ionicons
        name={direction === 'up' ? 'arrow-up' : 'arrow-down'}
        size={20}
        color={changeColors(direction === 'up').fg}
      />
    </Animated.View>
  );
}
