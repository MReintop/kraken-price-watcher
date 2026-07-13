import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import PricesScreen from './screens/PricesScreen';
import CoinDetailScreen from './screens/CoinDetailScreen';
import { RootStackParamList } from './types';
import { customDarkTheme, navigatorScreenOptions, theme } from './theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer theme={customDarkTheme}>
        <Stack.Navigator screenOptions={navigatorScreenOptions}>
          <Stack.Screen
            name="Prices"
            component={PricesScreen}
            options={{ title: 'Kraken-lite' }}
          />
          <Stack.Screen
            name="CoinDetail"
            component={CoinDetailScreen}
            options={({ route }) => ({ title: route.params.coin.name })}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
