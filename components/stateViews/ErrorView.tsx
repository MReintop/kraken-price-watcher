import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme';

type Props = { message?: string; onRetry: () => void };

export default function ErrorView({ message, onRetry }: Props) {
  return (
    <View style={styles.center}>
      <Text style={styles.errorText}>{message ?? 'Something went wrong'}</Text>
      <Text style={styles.retry} onPress={onRetry}>
        Tap to retry
      </Text>
    </View>
  );
}

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
  retry: {
    color: theme.color.accentText,
    fontSize: theme.font.small,
    fontWeight: '600',
  },
});
