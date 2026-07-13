import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  PressableStateCallbackType,
} from 'react-native';
import { Coin } from '../../types';
import { getCoinDetails } from './CoinCardUtils';
import { theme, webTransition } from '../../theme';
import { useAppSelector } from '../../store/hooks';
import { selectCoinById } from '../../store/coinsSlice';

interface CoinCardProps {
  coinId: string;
  onSelect: (coin: Coin) => void;
}

type WebPressableState = PressableStateCallbackType & { hovered?: boolean };

export default function CoinCard({ coinId, onSelect }: CoinCardProps) {
  const coin = useAppSelector(selectCoinById(coinId));
  if (!coin) return null;

  const coinDetails = getCoinDetails(coin);

  return (
    <Pressable
      onPress={() => onSelect(coin)}
      accessibilityRole="button"
      style={(state) => {
        const { pressed, hovered } = state as WebPressableState;
        return [
          styles.card,
          webTransition,
          hovered && styles.cardHovered,
          pressed && styles.cardPressed,
        ];
      }}
    >
      <View style={styles.header}>
        <Image
          source={{ uri: coin.image }}
          style={styles.icon}
          accessibilityLabel={`${coinDetails.name} icon`}
        />
        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={1}>
            {coinDetails.name}
          </Text>
          <Text style={styles.symbol}>{coin.symbol.toUpperCase()}</Text>
        </View>
      </View>

      <Text style={styles.price} numberOfLines={1}>
        {coinDetails.priceLabel}
      </Text>

      <View
        style={[
          styles.pill,
          { backgroundColor: coinDetails.isUp ? theme.tint.up : theme.tint.down },
        ]}
      >
        <Text style={[styles.change, { color: coinDetails.color }]}>{coinDetails.changeLabel}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1, // share the row width equally across numColumns
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.md,
    padding: theme.space.lg,
    gap: theme.space.sm,
    borderWidth: 1,
    borderColor: 'transparent', // reserved so hover border doesn't shift layout
  },
  cardHovered: {
    backgroundColor: theme.color.surfaceAlt,
    transform: [{ translateY: -2 }],
  },
  cardPressed: { backgroundColor: theme.color.surfaceAlt },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  icon: { width: 32, height: 32, borderRadius: theme.radius.pill },
  identity: { flexShrink: 1 },
  name: { color: theme.color.text, fontSize: theme.font.body, fontWeight: '700' },
  symbol: { color: theme.color.muted, fontSize: theme.font.caption, fontWeight: '500' },
  price: { color: theme.color.text, fontSize: theme.font.h2, fontWeight: '800' },
  pill: {
    alignSelf: 'flex-start', // hug the change text, don't stretch full width
    paddingHorizontal: theme.space.sm,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
  change: { fontSize: theme.font.caption, fontWeight: '600' },
});
