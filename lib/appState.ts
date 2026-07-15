import { AppState, type AppStateStatus } from 'react-native';

export type { AppStateStatus };

// A seam, so the socket can own its foreground policy without importing a
// native module into the node test project — and so a test can drive a
// background/foreground cycle without a device.
export function subscribeAppState(
  onChange: (status: AppStateStatus) => void,
): () => void {
  const subscription = AppState.addEventListener('change', onChange);
  // react-native-web returns nothing here, so this cannot assume a subscription.
  return () => subscription?.remove();
}
