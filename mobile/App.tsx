/**
 * Premium Mobile App Entry Point
 * AAA+ Quality TypeScript Implementation
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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

// Types
import { RootStackParamList, MainTabParamList } from './src/types';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * Home Tabs Navigator
 * Bottom navigation with premium styling
 */
function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Search':
              iconName = focused ? 'search' : 'search-outline';
              break;
            case 'Favorites':
              iconName = focused ? 'heart' : 'heart-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'ellipse';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FF0050',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: '#000',
          borderTopColor: '#1a1a1a',
          borderTopWidth: 1,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerStyle: {
          backgroundColor: '#000',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#1a1a1a',
        },
        headerTintColor: '#fff',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      })}
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
 * Shows while auth state is being determined
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
 * Premium entry point with error boundary and toast notifications
 */
export default function App() {
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    // Any app-level initialization can go here
    console.log('TikTok Games App Initialized');
  }, []);

  // Show loading screen while determining auth state
  if (isLoading) {
    return (
      <SafeAreaProvider>
        <GestureHandlerRootView style={styles.container}>
          <LoadingScreen />
          <StatusBar style="light" />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerRootView style={styles.container}>
          <NavigationContainer>
            <Stack.Navigator
              screenOptions={{
                headerStyle: {
                  backgroundColor: '#000',
                  elevation: 0,
                  shadowOpacity: 0,
                  borderBottomWidth: 1,
                  borderBottomColor: '#1a1a1a',
                },
                headerTintColor: '#fff',
                cardStyle: { backgroundColor: '#000' },
                headerTitleStyle: {
                  fontWeight: '700',
                  fontSize: 18,
                },
                // Premium transitions
                cardStyleInterpolator: ({ current: { progress } }) => ({
                  cardStyle: {
                    opacity: progress,
                  },
                }),
              }}
            >
              {user == null ? (
                // Auth Stack
                <>
                  <Stack.Screen
                    name="Login"
                    component={LoginScreen}
                    options={{
                      headerShown: false,
                      animationTypeForReplace: 'push',
                    }}
                  />
                  <Stack.Screen
                    name="Register"
                    component={RegisterScreen}
                    options={{
                      headerShown: false,
                      animationTypeForReplace: 'push',
                    }}
                  />
                </>
              ) : (
                // Main App Stack
                <>
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
                </>
              )}
            </Stack.Navigator>
          </NavigationContainer>

          {/* Global Toast Notifications */}
          <Toast />

          {/* Status Bar */}
          <StatusBar style="light" backgroundColor="#000" />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});
