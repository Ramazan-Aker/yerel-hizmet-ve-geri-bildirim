import 'react-native-gesture-handler';
import React from 'react';
import { View } from 'react-native';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { AppRegistry } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Ana uygulama bileşeni
const App = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </View>
    </GestureHandlerRootView>
  );
};

// Expo kullandığımız için bu kısım gerekli değil, ancak hata için ekliyoruz
AppRegistry.registerComponent('main', () => App);

export default App; 