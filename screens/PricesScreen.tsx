import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Coin, RootStackParamList } from '../types';
import PriceRow from '../components/priceRow/PriceRow';
import { theme } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Prices'>;

const MARKETS_URL =
  'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,cardano,ripple,dogecoin,polkadot,chainlink';

const REFRESH_MS = 10_000;

export default function PricesScreen({ navigation }: Props) {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(MARKETS_URL);
    const data: Coin[] = await res.json();
    setCoins(data);
  }, []);

  // initial load + live auto-refresh
  useEffect(() => {
    load().finally(() => setLoading(false));
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.color.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Markets</Text>
        <View style={styles.live}>
          <View style={styles.dot} />
          <Text style={styles.liveText}>Live</Text>
        </View>
      </View>

      <FlatList
        data={coins}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => (
          <PriceRow
            coin={item}
            onPress={() => navigation.navigate('CoinDetail', { coin: item })}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.color.muted}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.color.bg },
  center: {
    flex: 1,
    backgroundColor: theme.color.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.md,
    paddingBottom: theme.space.sm,
  },
  title: { color: theme.color.text, fontSize: theme.font.h1, fontWeight: '800' },
  live: { flexDirection: 'row', alignItems: 'center', gap: theme.space.xs },
  dot: {
    width: 8,
    height: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.up,
  },
  liveText: { color: theme.color.muted, fontSize: theme.font.caption, fontWeight: '600' },
  list: { padding: theme.space.lg, gap: theme.space.sm },
  sep: { height: theme.space.sm },
});
