import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { AppRegistry } from 'react-native';

// Ana uygulama bileşeni
const App = () => {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
};

// Expo kullandığımız için bu kısım gerekli değil, ancak hata için ekliyoruz
AppRegistry.registerComponent('main', () => App);

export default App; 