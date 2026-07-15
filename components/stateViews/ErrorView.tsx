import { View, Text, Pressable, StyleSheet } from 'react-native';
import { theme } from '../../theme';

interface ErrorViewProps {
  message?: string;
  onRetry: () => void;
}

export default function ErrorView({ message, onRetry }: ErrorViewProps) {
  return (
    <View style={styles.center}>
      <Text style={styles.errorText}>{message ?? 'Something went wrong'}</Text>
      {/* A Pressable, not a Text with onPress: only this announces itself as a
          button and takes a pressed state. */}
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Retry"
        style={styles.retryTarget}
      >
        <Text style={styles.retry}>Tap to retry</Text>
      </Pressable>
    </View>
  );
}

// 44 is the smallest target Apple and Android both consider reachable; the text
// alone is about half that.
const MIN_TARGET = 44;

const styles = StyleSheet.create({
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
  retryTarget: {
    minHeight: MIN_TARGET,
    minWidth: MIN_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.space.md,
  },
  retry: {
    color: theme.color.accentText,
    fontSize: theme.font.small,
    fontWeight: '600',
  },
});
