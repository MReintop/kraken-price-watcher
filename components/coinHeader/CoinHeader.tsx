import { View, Text, Image, StyleSheet } from 'react-native';
import { Coin } from '../../types';
import { getCoinDetails } from '../coinCard/CoinCardUtils';
import { formatPrice } from '../../lib/formatPrice';
import PriceTickIndicator from '../priceTickIndicator/PriceTickIndicator';
import { theme, changeColors } from '../../theme';

interface CoinHeaderProps {
  coin: Coin;
  updating: boolean;
}

export default function CoinHeader({ coin, updating }: CoinHeaderProps) {
  const details = getCoinDetails(coin, updating);
  const change = changeColors(details.isUp);

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Image source={{ uri: coin.image }} style={styles.icon} />
        <Text style={styles.name}>{details.name}</Text>
        <Text style={styles.symbol}>{coin.symbol.toUpperCase()}</Text>
      </View>

      <View style={styles.priceRow}>
        <View style={styles.tickSlot} />
        {/* The last trade, not a tween towards it: every intermediate frame of
            an interpolation is a price that never happened. The arrow beside it
            is the cue that something moved. */}
        <Text style={styles.price}>{formatPrice(coin.current_price)}</Text>
        <View style={styles.tickSlot}>
          <PriceTickIndicator price={coin.current_price} />
        </View>
      </View>

      <View style={[styles.pill, { backgroundColor: change.tint }]}>
        <Text style={[styles.change, { color: change.fg }]}>
          {details.changeLabel} (24h)
        </Text>
      </View>

      {!updating && <Text style={styles.frozen}>Not updating</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: theme.space.sm,
    marginTop: theme.space.lg,
  },
  head: { alignItems: 'center', gap: theme.space.xs },
  icon: { width: 72, height: 72, borderRadius: theme.radius.pill },
  name: { color: theme.color.text, fontSize: theme.font.h1, fontWeight: '800' },
  symbol: {
    color: theme.color.muted,
    fontSize: theme.font.small,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.sm,
  },
  tickSlot: { width: 24, alignItems: 'center', justifyContent: 'center' },
  price: { color: theme.color.text, fontSize: 32, fontWeight: '800' },
  pill: {
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.xs,
    borderRadius: theme.radius.pill,
  },
  change: { fontSize: theme.font.small, fontWeight: '700' },
  frozen: {
    color: theme.color.down,
    fontSize: theme.font.small,
    fontWeight: '600',
  },
});
