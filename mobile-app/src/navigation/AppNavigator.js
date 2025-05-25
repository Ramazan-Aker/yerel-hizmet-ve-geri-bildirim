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
import CreateIssueScreen from '../screens/CreateIssueScreen';
import ReportDetailScreen from '../screens/ReportDetailScreen';
import IssueDetailScreen from '../screens/IssueDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Admin Screens
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import AdminIssueDetailScreen from '../screens/AdminIssueDetailScreen';
import AdminIssuesListScreen from '../screens/AdminIssuesListScreen';
import AdminReportsScreen from '../screens/AdminReportsScreen';
import WorkerIssueDetailScreen from '../screens/WorkerIssueDetailScreen';

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
      <Stack.Screen 
        name="Login" 
        component={LoginScreen} 
        key="login-screen" 
      />
      <Stack.Screen 
        name="Register" 
        component={RegisterScreen} 
        key="register-screen" 
      />
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
        key="home-tab"
      />
      <Tab.Screen 
        name="Issues" 
        component={IssuesScreen} 
        options={{ tabBarLabel: 'Sorunlar' }}
        key="issues-tab"
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ tabBarLabel: 'Profilim' }}
        key="profile-tab"
      />
    </Tab.Navigator>
  );
};

// Admin Tab Navigator - Yetkili kullanıcılar için ana sekmeler
const AdminTabNavigator = () => {
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

          if (route.name === 'AdminDashboard') {
            iconName = 'dashboard';
          } else if (route.name === 'AdminIssues') {
            iconName = 'assignment';
          } else if (route.name === 'Profile') {
            iconName = 'person';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="AdminDashboard" 
        component={AdminDashboardScreen} 
        options={{ tabBarLabel: 'Panel' }}
        key="admin-dashboard-tab"
      />
      <Tab.Screen 
        name="AdminIssues" 
        component={AdminIssuesListScreen} 
        options={{ tabBarLabel: 'Sorunlar' }}
        initialParams={{ filter: 'all' }}
        key="admin-issues-tab"
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ tabBarLabel: 'Profilim' }}
        key="admin-profile-tab"
      />
    </Tab.Navigator>
  );
};

// Worker Tab Navigator - Çalışan kullanıcılar için ana sekmeler
const WorkerTabNavigator = () => {
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

          if (route.name === 'WorkerIssues') {
            iconName = 'assignment';
          } else if (route.name === 'Profile') {
            iconName = 'person';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="WorkerIssues" 
        component={AdminIssuesListScreen} 
        options={{ tabBarLabel: 'Görevlerim' }}
        initialParams={{ filter: 'assigned' }}
        key="worker-issues-tab"
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ tabBarLabel: 'Profilim' }}
        key="worker-profile-tab"
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
      <Stack.Screen 
        name="Tabs" 
        component={TabNavigator} 
        key="tabs-screen" 
      />
      <Stack.Screen 
        name="CreateIssue" 
        component={CreateIssueScreen} 
        key="create-issue-screen" 
      />
      <Stack.Screen 
        name="ReportDetail" 
        component={ReportDetailScreen} 
        key="report-detail-screen" 
      />
      <Stack.Screen 
        name="IssueDetail" 
        component={IssueDetailScreen} 
        key="issue-detail-screen" 
      />
      <Stack.Screen 
        name="MyIssues" 
        component={MyIssuesScreen} 
        key="my-issues-screen" 
      />
    </Stack.Navigator>
  );
};

// Admin Navigator - Yetkili kullanıcılar için uygulama akışı
const AdminNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#fff' }
      }}
    >
      <Stack.Screen 
        name="AdminTabs" 
        component={AdminTabNavigator} 
        key="admin-tabs-screen" 
      />
      <Stack.Screen 
        name="AdminIssueDetail" 
        component={AdminIssueDetailScreen} 
        key="admin-issue-detail-screen" 
      />
      <Stack.Screen 
        name="AdminIssuesList" 
        component={AdminIssuesListScreen} 
        key="admin-issues-list-screen" 
      />
      <Stack.Screen 
        name="AdminReports" 
        component={AdminReportsScreen} 
        key="admin-reports-screen" 
      />
    </Stack.Navigator>
  );
};

// Worker Navigator - Çalışan kullanıcılar için uygulama akışı
const WorkerNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#fff' }
      }}
    >
      <Stack.Screen 
        name="WorkerTabs" 
        component={WorkerTabNavigator} 
        key="worker-tabs-screen" 
      />
      <Stack.Screen 
        name="WorkerIssueDetail" 
        component={WorkerIssueDetailScreen} 
        key="worker-issue-detail-screen" 
      />
      <Stack.Screen 
        name="IssueDetail" 
        component={IssueDetailScreen} 
        key="issue-detail-screen" 
      />
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
  
  // Debug için kullanıcı bilgilerini yazdır
  console.log('AppNavigator - Kullanıcı bilgileri:', user);
  console.log('AppNavigator - Kullanıcı rolü:', user?.role);
  
  // Kullanıcı rolüne göre navigasyon seç
  let navigator;
  if (!user) {
    navigator = <AuthNavigator />;
    console.log('AppNavigator - Yönlendirme: Auth Navigator');
  } else if (user.role === 'admin' || user.role === 'municipal_worker') {
    navigator = <AdminNavigator />;
    console.log('AppNavigator - Yönlendirme: Admin Navigator');
  } else if (user.role === 'worker') {
    navigator = <WorkerNavigator />;
    console.log('AppNavigator - Yönlendirme: Worker Navigator');
  } else {
    navigator = <MainNavigator />;
    console.log('AppNavigator - Yönlendirme: Main Navigator');
  }

  return (
    <NavigationContainer
      key="main-navigation-container"
      theme={{
        colors: {
          background: '#ffffff',
          border: '#f0f0f0',
          card: '#ffffff',
          notification: '#ff3b30',
          primary: '#3b82f6',
          text: '#000000',
        },
        dark: false,
      }}
    >
      {navigator}
    </NavigationContainer>
  );
};

export default AppNavigator; 