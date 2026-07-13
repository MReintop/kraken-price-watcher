import { useEffect, useState } from 'react';
import { Animated, Easing, StyleProp, Text, TextStyle } from 'react-native';
import { formatPrice } from '../../lib/formatPrice';

interface AnimatedPriceProps {
  value: number;
  style?: StyleProp<TextStyle>;
}


export default function AnimatedPrice({ value, style }: AnimatedPriceProps) {
  // Lazy state initializer constructs the Animated.Value exactly once and keeps
  // a stable reference — without reading/writing a ref during render.
  const [animated] = useState(() => new Animated.Value(value));
  const [text, setText] = useState(() => formatPrice(value));

  // Mirror the animated value into React state as formatted text. Only
  // re-render when the *formatted* string changes (not every ~60fps frame),
  // so the tween drives at most a handful of updates per second.
  useEffect(() => {
    const id = animated.addListener(({ value: v }) => {
      const next = formatPrice(v);
      setText((prev) => (prev === next ? prev : next));
    });
    return () => animated.removeListener(id);
  }, [animated]);

  useEffect(() => {
    const anim = Animated.timing(animated, {
      toValue: value,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // driving JS text, not a native style prop
    });
    anim.start();
    return () => anim.stop();
  }, [value, animated]);

  return <Text style={style}>{text}</Text>;
}
