import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme';
import type { SocketStatus } from '../../store/coinsSlice';

interface LiveBadgeProps {
  status: SocketStatus;
  tracked: number;
  unavailable: number;
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

// A connection carrying seven of eight symbols is not "Live" — that word covers
// for the one frozen row. The count is in the text because a dot cannot say
// which of the two it means.
const summarise = (status: SocketStatus, tracked: number, refused: number) => {
  if (status !== 'live' || refused === 0 || tracked === 0) {
    return { label: LABEL[status], dot: DOT[status] };
  }
  return {
    label: `Degraded ${tracked - refused}/${tracked}`,
    dot: theme.color.down,
  };
};

export default function LiveBadge({
  status,
  tracked,
  unavailable,
}: LiveBadgeProps) {
  const { label, dot } = summarise(status, tracked, unavailable);

  return (
    <View
      style={styles.live}
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      accessibilityLabel={`Price feed: ${label}`}
    >
      <View style={[styles.dot, { backgroundColor: dot }]} />
      <Text style={styles.liveText}>{label}</Text>
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
