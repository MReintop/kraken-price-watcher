import { useEffect, useState } from 'react';
import { Animated, Easing, StyleProp, Text, TextStyle } from 'react-native';
import { formatPrice } from '../../lib/formatPrice';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface AnimatedPriceProps {
  value: number;
  style?: StyleProp<TextStyle>;
}

export default function AnimatedPrice({ value, style }: AnimatedPriceProps) {
  const reducedMotion = useReducedMotion();
  // Lazy initializer: constructed once, and readable during render (a ref is not).
  const [animated] = useState(() => new Animated.Value(value));
  const [text, setText] = useState(() => formatPrice(value));

  // Re-render only when the *formatted* string changes, not on every frame.
  useEffect(() => {
    const id = animated.addListener(({ value: v }) => {
      const next = formatPrice(v);
      setText((prev) => (prev === next ? prev : next));
    });
    return () => animated.removeListener(id);
  }, [animated]);

  useEffect(() => {
    // Reduced motion means no tween at all, not a faster one.
    if (reducedMotion) {
      animated.setValue(value);
      return;
    }

    const anim = Animated.timing(animated, {
      toValue: value,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // driving JS text, not a native style prop
    });
    anim.start();
    return () => anim.stop();
  }, [value, animated, reducedMotion]);

  return <Text style={style}>{text}</Text>;
}
