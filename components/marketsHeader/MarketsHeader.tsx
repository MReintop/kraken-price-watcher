import { View, Text, StyleSheet } from 'react-native';
import LiveBadge from '../liveBadge/LiveBadge';
import { theme } from '../../theme';
import type { SocketStatus } from '../../store/coinsSlice';

interface MarketsHeaderProps {
  status: SocketStatus;
}

export default function MarketsHeader({ status }: MarketsHeaderProps) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>Markets</Text>
      <LiveBadge status={status} />
    </View>
  );
}

const styles = StyleSheet.create({
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
});
