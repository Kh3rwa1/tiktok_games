/**
 * Kisku - Neo-Brutalism Game Platform
 * Bold, Raw, Unapologetic Design
 */

import React, { useEffect, useCallback, useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { View, StyleSheet, Platform, UIManager, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Enable LayoutAnimation on Android for smooth animations
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Suppress non-critical warnings in production for performance
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'VirtualizedLists should never be nested',
]);

// Neo-Brutalism Theme - Bold, Raw, High Contrast
const NeoBrutalismTheme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    primary: '#FF6B6B',
    background: '#FFFEF0',
    card: '#FFFFFF',
    text: '#000000',
    border: '#000000',
    notification: '#FF6B6B',
  },
};

// Stores
import { useAuthStore } from './src/store/authStore';

// Components
import { ErrorBoundary, LoadingSkeleton } from './src/components';

// Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import GamePlayerScreen from './src/screens/GamePlayerScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SearchScreen from './src/screens/SearchScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';

// Types
import { RootStackParamList, MainTabParamList } from './src/types';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * Home Tabs Navigator
 * Neo-Brutalism style with bold borders and high contrast
 */
function HomeTabs() {
  // Memoize icon renderer for performance
  const getTabBarIcon = useCallback(({ route, focused, color, size }: any) => {
    const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
      Home: focused ? 'home' : 'home-outline',
      Search: focused ? 'search' : 'search-outline',
      Favorites: focused ? 'heart' : 'heart-outline',
      Profile: focused ? 'person' : 'person-outline',
    };
    return <Ionicons name={iconMap[route.name] || 'ellipse'} size={size} color={color} />;
  }, []);

  // Neo-Brutalism screen options
  const screenOptions = useMemo(() => ({
    tabBarIcon: ({ focused, color, size }: any) => getTabBarIcon,
    tabBarActiveTintColor: '#000000',
    tabBarInactiveTintColor: '#666666',
    tabBarHideOnKeyboard: true,
    lazy: true,
    tabBarStyle: {
      backgroundColor: '#FFFEF0',
      borderTopColor: '#000000',
      borderTopWidth: 3,
      paddingBottom: Platform.OS === 'ios' ? 20 : 5,
      paddingTop: 5,
      height: Platform.OS === 'ios' ? 80 : 60,
      elevation: 0,
    },
    headerStyle: {
      backgroundColor: '#FFFEF0',
      elevation: 0,
      shadowOpacity: 0,
      borderBottomWidth: 3,
      borderBottomColor: '#000000',
    },
    headerTintColor: '#000000',
    tabBarLabelStyle: {
      fontSize: 12,
      fontWeight: '800' as const,
    },
  }), [getTabBarIcon]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...screenOptions,
        tabBarIcon: ({ focused, color, size }) => {
          const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
            Home: focused ? 'home' : 'home-outline',
            Search: focused ? 'search' : 'search-outline',
            Favorites: focused ? 'heart' : 'heart-outline',
            Profile: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={iconMap[route.name] || 'ellipse'} size={size} color={color} />;
        },
      })}
      backBehavior="initialRoute"
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{ title: 'Discover' }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{ title: 'Favorites' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );
}

/**
 * Loading Screen Component
 * Neo-Brutalism style loading
 */
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <LoadingSkeleton variant="game" count={3} />
    </View>
  );
}

/**
 * Main App Component
 * Kisku - Neo-Brutalism Game Platform
 */
export default function App() {
  const { isLoading } = useAuthStore();

  useEffect(() => {
    console.log('Kisku App Initialized');
  }, []);

  // Show loading screen while initializing
  if (isLoading) {
    return (
      <SafeAreaProvider>
        <GestureHandlerRootView style={styles.container}>
          <LoadingScreen />
          <StatusBar style="dark" />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerRootView style={styles.container}>
          <NavigationContainer theme={NeoBrutalismTheme}>
            <Stack.Navigator
              screenOptions={{
                headerStyle: {
                  backgroundColor: '#FFFEF0',
                  elevation: 0,
                  shadowOpacity: 0,
                  borderBottomWidth: 3,
                  borderBottomColor: '#000000',
                },
                headerTintColor: '#000000',
                cardStyle: { backgroundColor: '#FFFEF0' },
                headerTitleStyle: {
                  fontWeight: '800',
                  fontSize: 18,
                },
                ...TransitionPresets.SlideFromRightIOS,
                gestureEnabled: true,
                gestureResponseDistance: 100,
                detachPreviousScreen: true,
                freezeOnBlur: true,
              }}
            >
              {/* Main App - No login required for browsing */}
              <Stack.Screen
                name="MainTabs"
                component={HomeTabs}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="GamePlayer"
                component={GamePlayerScreen}
                options={{
                  headerShown: false,
                  presentation: 'fullScreenModal',
                  gestureEnabled: true,
                  gestureDirection: 'vertical',
                }}
              />
              <Stack.Screen
                name="Notifications"
                component={NotificationsScreen}
                options={{
                  headerShown: false,
                  ...TransitionPresets.SlideFromRightIOS,
                }}
              />
              {/* Auth screens - accessible when needed (e.g., for commenting) */}
              <Stack.Screen
                name="Login"
                component={LoginScreen}
                options={{
                  headerShown: false,
                  presentation: 'modal',
                }}
              />
              <Stack.Screen
                name="Register"
                component={RegisterScreen}
                options={{
                  headerShown: false,
                  presentation: 'modal',
                }}
              />
            </Stack.Navigator>
          </NavigationContainer>

          {/* Global Toast Notifications */}
          <Toast />

          {/* Status Bar */}
          <StatusBar style="dark" backgroundColor="#FFFEF0" />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFEF0',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFEF0',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});
