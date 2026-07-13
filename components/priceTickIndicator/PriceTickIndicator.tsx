import { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { changeColors } from '../../theme';

type Direction = 'up' | 'down';

interface PriceTickIndicatorProps {
  price: number;
}

export default function PriceTickIndicator({ price }: PriceTickIndicatorProps) {
  const prevPrice = useRef(price);
  const [direction, setDirection] = useState<Direction | null>(null);
  // Lazy state initializer: construct the Animated.Value once, stable reference.
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const prev = prevPrice.current;
    prevPrice.current = price;
    if (price === prev) return;

    setDirection(price > prev ? 'up' : 'down');

    // One blink: appear at full, then fade out.
    opacity.setValue(1);
    const animation = Animated.timing(opacity, {
      toValue: 0,
      duration: 900,
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      if (finished) setDirection(null);
    });

    return () => animation.stop();
  }, [price, opacity]);

  if (!direction) return null;

  return (
    <Animated.View style={{ opacity }}>
      <Ionicons
        name={direction === 'up' ? 'arrow-up' : 'arrow-down'}
        size={20}
        color={changeColors(direction === 'up').fg}
      />
    </Animated.View>
  );
}
