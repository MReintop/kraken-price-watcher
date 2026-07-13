import { View, Text, Image, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types';
import { getCoinDetails } from '../components/priceRow/PriceRowUtils';
import { theme } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'CoinDetail'>;

export default function CoinDetailScreen({ route }: Props) {
  const { coin } = route.params;
  const d = getCoinDetails(coin);

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <View style={styles.head}>
        <Image source={{ uri: coin.image }} style={styles.icon} />
        <Text style={styles.name}>{d.name}</Text>
        <Text style={styles.symbol}>{coin.symbol.toUpperCase()}</Text>
      </View>

      <Text style={styles.price}>{d.priceLabel}</Text>
      <View style={[styles.pill, { backgroundColor: d.isUp ? theme.tint.up : theme.tint.down }]}>
        <Text style={[styles.change, { color: d.color }]}>{d.changeLabel} (24h)</Text>
      </View>

      <View style={styles.card}>
        <Stat label="Market cap" value={`$${coin.market_cap.toLocaleString()}`} />
        <View style={styles.divider} />
        <Stat label="24h volume" value={`$${coin.total_volume.toLocaleString()}`} />
      </View>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.color.bg,
    alignItems: 'center',
    padding: theme.space.xl,
    gap: theme.space.md,
  },
  head: { alignItems: 'center', gap: theme.space.xs, marginTop: theme.space.lg },
  icon: { width: 72, height: 72, borderRadius: theme.radius.pill },
  name: { color: theme.color.text, fontSize: theme.font.h1, fontWeight: '800' },
  symbol: { color: theme.color.muted, fontSize: theme.font.small, fontWeight: '600' },
  price: { color: theme.color.text, fontSize: 32, fontWeight: '800', marginTop: theme.space.sm },
  pill: {
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.xs,
    borderRadius: theme.radius.pill,
  },
  change: { fontSize: theme.font.small, fontWeight: '700' },
  card: {
    width: '100%',
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.lg,
    padding: theme.space.lg,
    marginTop: theme.space.lg,
  },
  stat: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { color: theme.color.muted, fontSize: theme.font.small },
  statValue: { color: theme.color.text, fontSize: theme.font.small, fontWeight: '600' },
  divider: { height: 1, backgroundColor: theme.color.border, marginVertical: theme.space.md },
});
