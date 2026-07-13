import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Coin } from '../../types';
import { getCoinDetails } from './PriceRowUtils';
import { theme } from '../../theme';

interface PriceRowProps {
  coin: Coin;
  onPress?: () => void;
}

export default function PriceRow({ coin, onPress }: PriceRowProps) {
  const d = getCoinDetails(coin);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <Image
        source={{ uri: coin.image }}
        style={styles.icon}
        accessibilityLabel={`${d.name} icon`}
      />

      <View style={styles.identity}>
        <Text style={styles.name}>{d.name}</Text>
        <Text style={styles.symbol}>{coin.symbol.toUpperCase()}</Text>
      </View>

      <View style={styles.right}>
        <Text style={styles.price}>{d.priceLabel}</Text>
        <View
          style={[styles.pill, { backgroundColor: d.isUp ? theme.tint.up : theme.tint.down }]}
        >
          <Text style={[styles.change, { color: d.color }]}>{d.changeLabel}</Text>
        </View>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color={theme.color.muted}
        style={styles.chevron}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.md,
    paddingVertical: theme.space.md,
    paddingHorizontal: theme.space.lg,
  },
  rowPressed: { backgroundColor: theme.color.surfaceAlt },
  icon: { width: 36, height: 36, borderRadius: theme.radius.pill },
  identity: { gap: 2 },
  name: { color: theme.color.text, fontSize: theme.font.body, fontWeight: '600' },
  symbol: { color: theme.color.muted, fontSize: theme.font.caption, fontWeight: '500' },
  right: { marginLeft: 'auto', alignItems: 'flex-end', gap: theme.space.xs },
  price: { color: theme.color.text, fontSize: theme.font.body, fontWeight: '700' },
  pill: {
    paddingHorizontal: theme.space.sm,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
  change: { fontSize: theme.font.caption, fontWeight: '600' },
  chevron: { marginLeft: theme.space.xs },
});
