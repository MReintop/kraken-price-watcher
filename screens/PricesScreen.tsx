import { useCallback, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FetchStatus, NavigateKey, RootStackParamList } from '../types';
import MarketsHeader from '../components/marketsHeader/MarketsHeader';
import CoinList from '../components/coinList/CoinList';
import LoadingView from '../components/stateViews/LoadingView';
import ErrorView from '../components/stateViews/ErrorView';
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

type Props = NativeStackScreenProps<RootStackParamList, NavigateKey.Prices>;

export default function PricesScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  // shallowEqual: the ids are a new array each call, so identity would always differ.
  const coinIds = useAppSelector(selectCoinIds, shallowEqual);
  const status = useAppSelector(selectCoinsStatus);
  const error = useAppSelector(selectCoinsError);
  const live = useAppSelector(selectLive);

  useEffect(() => {
    dispatch(fetchCoins());
  }, [dispatch]);

  const onRefresh = useCallback(async () => {
    await dispatch(fetchCoins());
  }, [dispatch]);

  if (status === FetchStatus.Loading) return <LoadingView />;

  if (status === FetchStatus.Failed && coinIds.length === 0) {
    return <ErrorView message={error} onRetry={() => dispatch(fetchCoins())} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <MarketsHeader live={live} />
      <CoinList
        coinIds={coinIds}
        onSelect={(id) =>
          navigation.navigate(NavigateKey.CoinDetail, { coinId: id })
        }
        onRefresh={onRefresh}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.color.bg },
});
