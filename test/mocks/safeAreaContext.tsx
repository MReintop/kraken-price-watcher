import { View } from 'react-native';

// Minimal stand-in so screens using SafeAreaView render under jsdom without a
// real provider / native measurement.
export const SafeAreaProvider = ({ children }: any) => children;
export const SafeAreaView = ({ edges, ...props }: any) => <View {...props} />;
export const useSafeAreaInsets = () => ({
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
});
