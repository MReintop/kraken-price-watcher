import { View, Text, StyleSheet } from 'react-native';
import { Coin } from '../../types';
import { formatPrice } from '../../lib/formatPrice';
import { theme } from '../../theme';

interface StatProps {
  label: string;
  value: string;
}

function Stat({ label, value }: StatProps) {
  return (
    <View style={styles.stat}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

interface CoinStatsProps {
  coin: Coin;
}

export default function CoinStats({ coin }: CoinStatsProps) {
  // Both figures are CoinGecko's, so they arrive together or not at all. Saying
  // the market cap is unavailable beats printing a confident $0.
  if (coin.market_cap == null || coin.total_volume == null) {
    return (
      <View style={styles.card}>
        <Text style={styles.unavailable}>Market context unavailable</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Stat label="Market cap" value={formatPrice(coin.market_cap)} />
      <View style={styles.divider} />
      <Stat label="24h volume" value={formatPrice(coin.total_volume)} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.lg,
    padding: theme.space.lg,
    marginTop: theme.space.lg,
  },
  stat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: { color: theme.color.muted, fontSize: theme.font.small },
  unavailable: {
    color: theme.color.muted,
    fontSize: theme.font.small,
    textAlign: 'center',
  },
  value: {
    color: theme.color.text,
    fontSize: theme.font.small,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: theme.color.border,
    marginVertical: theme.space.md,
  },
});
