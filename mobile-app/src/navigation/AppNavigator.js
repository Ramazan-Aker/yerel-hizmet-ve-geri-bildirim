import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Auth Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

// Main Screens
import HomeScreen from '../screens/HomeScreen';
import IssuesScreen from '../screens/IssuesScreen';
import MyIssuesScreen from '../screens/MyIssuesScreen';
import CreateReportScreen from '../screens/CreateReportScreen';
import ReportDetailScreen from '../screens/ReportDetailScreen';
import IssueDetailScreen from '../screens/IssueDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Auth Context
import { useAuth } from '../hooks/useAuth';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Auth Navigator - Giriş ve Kayıt ekranlarını içerir
const AuthNavigator = () => {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        cardStyle: { backgroundColor: '#fff' }
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
};

// Tab Navigator - Ana akış sekmelerini içerir
const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#9e9e9e',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#f0f0f0',
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarIcon: ({ color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Issues') {
            iconName = 'list';
          } else if (route.name === 'Profile') {
            iconName = 'person';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ tabBarLabel: 'Ana Sayfa' }}
      />
      <Tab.Screen 
        name="Issues" 
        component={IssuesScreen} 
        options={{ tabBarLabel: 'Sorunlar' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ tabBarLabel: 'Profilim' }}
      />
    </Tab.Navigator>
  );
};

// Main Navigator - Kimlik doğrulanmış kullanıcılar için ana uygulama akışı
const MainNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#fff' }
      }}
    >
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen name="CreateReport" component={CreateReportScreen} />
      <Stack.Screen name="ReportDetail" component={ReportDetailScreen} />
      <Stack.Screen name="IssueDetail" component={IssueDetailScreen} />
      <Stack.Screen name="MyIssues" component={MyIssuesScreen} />
    </Stack.Navigator>
  );
};

// App Navigator - Auth ve Main navigasyonları arasında geçiş yapar
const AppNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    // Gerçek bir uygulamada burada bir loading ekranı gösterilebilir
    return null;
  }

  return (
    <NavigationContainer>
      {user ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

export default AppNavigator; 