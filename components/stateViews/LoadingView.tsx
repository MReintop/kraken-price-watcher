import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { theme } from '../../theme';

export default function LoadingView() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={theme.color.accent} />
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
});
