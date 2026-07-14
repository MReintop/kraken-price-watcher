import { useCallback, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import CoinCard from '../coinCard/CoinCard';
import { theme } from '../../theme';

type Props = {
  coinIds: string[];
  onSelect: (id: string) => void;
  onRefresh: () => Promise<void>;
};

export default function CoinList({ coinIds, onSelect, onRefresh }: Props) {
  const [refreshing, setRefreshing] = useState(false);

  const { width } = useWindowDimensions();
  const numColumns =
    width >= theme.breakpoint.md ? 4 : width >= theme.breakpoint.sm ? 2 : 1;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  }, [onRefresh]);

  return (
    <FlatList
      key={numColumns}
      data={coinIds}
      numColumns={numColumns}
      keyExtractor={(id) => id}
      columnWrapperStyle={numColumns > 1 ? styles.column : undefined}
      contentContainerStyle={styles.list}
      renderItem={({ item: id }) => (
        <CoinCard coinId={id} onSelect={() => onSelect(id)} />
      )}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.color.muted}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: theme.space.lg, gap: theme.space.sm }, // vertical gap between rows
  column: { gap: theme.space.sm }, // horizontal gap between cards in a row
});
