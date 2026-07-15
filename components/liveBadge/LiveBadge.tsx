import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme';
import type { SocketStatus } from '../../store/coinsSlice';

interface LiveBadgeProps {
  status: SocketStatus;
}

// `stale` is the one worth shouting about: the prices are still on screen and
// still look current, so this badge is the only thing saying they are not.
const LABEL: Record<SocketStatus, string> = {
  connecting: 'Connecting…',
  live: 'Live',
  stale: 'Not updating',
  offline: 'Offline',
};

const DOT: Record<SocketStatus, string> = {
  connecting: theme.color.muted,
  live: theme.color.up,
  stale: theme.color.down,
  offline: theme.color.muted,
};

export default function LiveBadge({ status }: LiveBadgeProps) {
  return (
    <View
      style={styles.live}
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      accessibilityLabel={`Price feed: ${LABEL[status]}`}
    >
      <View style={[styles.dot, { backgroundColor: DOT[status] }]} />
      <Text style={styles.liveText}>{LABEL[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  live: { flexDirection: 'row', alignItems: 'center', gap: theme.space.xs },
  dot: { width: 8, height: 8, borderRadius: theme.radius.pill },
  liveText: {
    color: theme.color.muted,
    fontSize: theme.font.caption,
    fontWeight: '600',
  },
});
