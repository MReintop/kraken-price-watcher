import { useLayoutEffect } from 'react';
import { StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigateKey, RootStackParamList } from '../types';
import CoinHeader from '../components/coinHeader/CoinHeader';
import CoinChart from '../components/coinChart/CoinChart';
import CoinStats from '../components/coinStats/CoinStats';
import { useAppSelector } from '../store/hooks';
import { selectCoinById, selectIsCoinUnavailable } from '../store/coinsSlice';
import { theme } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, NavigateKey.CoinDetail>;

export default function CoinDetailScreen({ route, navigation }: Props) {
  const { coinId } = route.params;
  // Store is the source of truth — the id is enough (no stale snapshot).
  const coin = useAppSelector(selectCoinById(coinId));
  const unavailable = useAppSelector(selectIsCoinUnavailable(coinId));

  useLayoutEffect(() => {
    if (coin) navigation.setOptions({ title: coin.name });
  }, [navigation, coin]);

  if (!coin) return null;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <CoinHeader coin={coin} updating={!unavailable} />
      <CoinChart coinId={coin.id} livePrice={coin.current_price} />
      <CoinStats coin={coin} />
    </SafeAreaView>
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
});
