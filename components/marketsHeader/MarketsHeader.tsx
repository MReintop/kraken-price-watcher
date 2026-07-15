import { View, Text, StyleSheet } from 'react-native';
import LiveBadge from '../liveBadge/LiveBadge';
import { theme } from '../../theme';

interface MarketsHeaderProps {
  live: boolean;
}

export default function MarketsHeader({ live }: MarketsHeaderProps) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>Markets</Text>
      <LiveBadge live={live} />
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
