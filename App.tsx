import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';

import PricesScreen from './screens/PricesScreen';
import CoinDetailScreen from './screens/CoinDetailScreen';
import { NavigateKey, RootStackParamList } from './types';
import { customDarkTheme, navigatorScreenOptions } from './theme';
import { store } from './store/store';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <NavigationContainer theme={customDarkTheme}>
        <Stack.Navigator screenOptions={navigatorScreenOptions}>
          <Stack.Screen
            name={NavigateKey.Prices}
            component={PricesScreen}
            options={{ title: 'Kraken-lite' }}
          />
          <Stack.Screen
            name={NavigateKey.CoinDetail}
            component={CoinDetailScreen}
          />
        </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </Provider>
  );
}
