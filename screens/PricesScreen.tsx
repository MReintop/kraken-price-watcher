import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FetchStatus, RootStackParamList } from '../types';
import CoinCard from '../components/coinCard/CoinCard';
import { theme } from '../theme';
import { shallowEqual } from 'react-redux';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchCoins,
  selectCoinIds,
  selectCoinsError,
  selectCoinsStatus,
  selectLive,
} from '../store/coinsSlice';

type Props = NativeStackScreenProps<RootStackParamList, 'Prices'>;

export default function PricesScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  // Subscribe to just the id list — with shallowEqual this only re-renders if actual data changes
  const coinIds = useAppSelector(selectCoinIds, shallowEqual);
  const status = useAppSelector(selectCoinsStatus);
  const error = useAppSelector(selectCoinsError);
  const live = useAppSelector(selectLive);

  // pull-to-refresh is view state, not app state → stays local
  const [refreshing, setRefreshing] = useState(false);

  const { width } = useWindowDimensions();
  const numColumns =
    width >= theme.breakpoint.md ? 4 : width >= theme.breakpoint.sm ? 2 : 1;

  // Initial metadata load. Live prices then stream in over the Kraken socket
  useEffect(() => {
    dispatch(fetchCoins());
  }, [dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchCoins());
    setRefreshing(false);
  }, [dispatch]);

  if (status === FetchStatus.Loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.color.accent} />
      </View>
    );
  }

  if (status === FetchStatus.Failed && coinIds.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? 'Something went wrong'}</Text>
        <Text style={styles.retry} onPress={() => dispatch(fetchCoins())}>
          Tap to retry
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Markets</Text>
        <View style={styles.live}>
          <View
            style={[
              styles.dot,
              { backgroundColor: live ? theme.color.up : theme.color.muted },
            ]}
          />
          <Text style={styles.liveText}>{live ? 'Live' : 'Connecting…'}</Text>
        </View>
      </View>

      <FlatList
        key={numColumns}
        data={coinIds}
        numColumns={numColumns}
        keyExtractor={(id) => id}
        columnWrapperStyle={numColumns > 1 ? styles.column : undefined}
        contentContainerStyle={styles.list}
        renderItem={({ item: id }) => (
          <CoinCard
            coinId={id}
            onSelect={(coin) => navigation.navigate('CoinDetail', { coin })}
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
    gap: theme.space.sm,
  },
  errorText: {
    color: theme.color.down,
    fontSize: theme.font.body,
    fontWeight: '600',
  },
  retry: {
    color: theme.color.accent,
    fontSize: theme.font.small,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.md,
    paddingBottom: theme.space.sm,
  },
  title: {
    color: theme.color.text,
    fontSize: theme.font.h1,
    fontWeight: '800',
  },
  live: { flexDirection: 'row', alignItems: 'center', gap: theme.space.xs },
  dot: {
    width: 8,
    height: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.up,
  },
  liveText: {
    color: theme.color.muted,
    fontSize: theme.font.caption,
    fontWeight: '600',
  },
  list: { padding: theme.space.lg, gap: theme.space.sm }, // vertical gap between rows
  column: { gap: theme.space.sm }, // horizontal gap between cards in a row
});
