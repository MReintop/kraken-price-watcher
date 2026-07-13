import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Timeframe } from '../../types';
import { TIMEFRAMES } from '../../lib/candleChart';
import { theme } from '../../theme';

interface TimeframeSelectorProps {
  value: Timeframe;
  onChange: (tf: Timeframe) => void;
}

export default function TimeframeSelector({ value, onChange }: TimeframeSelectorProps) {
  return (
    <View style={styles.row}>
      {TIMEFRAMES.map((tf) => {
        const selected = tf === value;
        return (
          <Pressable
            key={tf}
            onPress={() => onChange(tf)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {tf}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: theme.space.sm },
  chip: {
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.xs,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.surface,
  },
  chipSelected: { backgroundColor: theme.color.accent },
  label: { color: theme.color.muted, fontSize: theme.font.small, fontWeight: '600' },
  labelSelected: { color: theme.color.text },
});
