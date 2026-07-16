import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  PressableStateCallbackType,
} from 'react-native';
import { getCoinDetails } from './CoinCardUtils';
import { theme, webTransition, changeColors } from '../../theme';
import { useAppSelector } from '../../store/hooks';
import {
  selectCoinById,
  selectIsCoinUnavailable,
} from '../../store/coinsSlice';

interface CoinCardProps {
  coinId: string;
  onSelect: () => void; // the parent knows the id; the card just signals a tap
}

type WebPressableState = PressableStateCallbackType & { hovered?: boolean };

export default function CoinCard({ coinId, onSelect }: CoinCardProps) {
  const coin = useAppSelector(selectCoinById(coinId));
  const unavailable = useAppSelector(selectIsCoinUnavailable(coinId));
  if (!coin) return null;

  const coinDetails = getCoinDetails(coin, !unavailable);
  const change = changeColors(coinDetails.isUp);

  return (
    <Pressable
      onPress={onSelect}
      accessibilityRole="button"
      accessibilityLabel={coinDetails.a11yLabel}
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
          accessibilityElementsHidden
          importantForAccessibility="no"
          alt=""
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

      {unavailable && <Text style={styles.frozen}>Not updating</Text>}

      <View style={[styles.pill, { backgroundColor: change.tint }]}>
        <Text style={[styles.change, { color: change.fg }]}>
          {coinDetails.changeLabel}
        </Text>
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
  name: {
    color: theme.color.text,
    fontSize: theme.font.body,
    fontWeight: '700',
  },
  symbol: {
    color: theme.color.muted,
    fontSize: theme.font.caption,
    fontWeight: '500',
  },
  price: {
    color: theme.color.text,
    fontSize: theme.font.h2,
    fontWeight: '800',
  },
  frozen: {
    color: theme.color.down,
    fontSize: theme.font.caption,
    fontWeight: '600',
  },
  pill: {
    alignSelf: 'flex-start', // hug the change text, don't stretch full width
    paddingHorizontal: theme.space.sm,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
  change: { fontSize: theme.font.caption, fontWeight: '600' },
});
