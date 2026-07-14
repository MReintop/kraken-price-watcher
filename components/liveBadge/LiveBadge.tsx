import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme';

// Dot + label showing whether the Kraken price stream is connected.
export default function LiveBadge({ live }: { live: boolean }) {
  return (
    <View style={styles.live}>
      <View
        style={[
          styles.dot,
          { backgroundColor: live ? theme.color.up : theme.color.muted },
        ]}
      />
      <Text style={styles.liveText}>{live ? 'Live' : 'Connecting…'}</Text>
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
