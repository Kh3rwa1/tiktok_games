/**
 * Auth Store - Unified API-based authentication
 * Uses server JWT authentication instead of Firebase
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, AuthState } from '../types';
import api from '../services/api';

export const useAuthStore = create<AuthState & {
  hasSeenOnboarding: boolean;
  setHasSeenOnboarding: (value: boolean) => void;
  completeOnboarding: () => Promise<void>;
}>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  error: null,
  hasSeenOnboarding: false,

  setUser: (user: User | null) => set({ user }),

  setToken: (token: string | null) => {
    api.setToken(token);
    set({ token });
  },

  setHasSeenOnboarding: (value: boolean) => set({ hasSeenOnboarding: value }),

  completeOnboarding: async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      set({ hasSeenOnboarding: true });
    } catch (error) {
      console.error('Error saving onboarding state:', error);
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });

      const { user, token } = await api.login(email, password);

      // Transform server user to app user format
      const appUser: User = {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar || 'https://via.placeholder.com/150',
        bio: user.bio || '',
        role: user.role,
        followers_count: user.followers_count || 0,
        following_count: user.following_count || 0,
        games_count: user.games_count || 0,
        total_games_played: user.total_games_played || 0,
        total_play_time: user.total_play_time || 0,
        created_at: user.created_at,
      };

      api.setToken(token);

      set({
        user: appUser,
        token,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      console.error('Sign in error:', error);
      set({
        error: error.message || 'Failed to sign in',
        isLoading: false
      });
      throw error;
    }
  },

  signUp: async (username: string, email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });

      const { user, token } = await api.register(username, email, password);

      // Transform server user to app user format
      const appUser: User = {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar || 'https://via.placeholder.com/150',
        bio: user.bio || '',
        role: user.role,
        followers_count: 0,
        following_count: 0,
        games_count: 0,
        total_games_played: 0,
        total_play_time: 0,
        created_at: user.created_at,
      };

      api.setToken(token);

      set({
        user: appUser,
        token,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      console.error('Sign up error:', error);
      set({
        error: error.message || 'Failed to sign up',
        isLoading: false
      });
      throw error;
    }
  },

  signOut: async () => {
    try {
      set({ isLoading: true, error: null });

      await api.logout();

      set({
        user: null,
        token: null,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      console.error('Sign out error:', error);
      set({
        error: error.message || 'Failed to sign out',
        isLoading: false
      });
      throw error;
    }
  },

  updateProfile: async (updates: Partial<User>) => {
    try {
      const { user } = get();
      if (!user) throw new Error('No user logged in');

      set({ isLoading: true, error: null });

      const updatedUser = await api.updateProfile(updates);

      set({
        user: {
          ...user,
          ...updatedUser,
        },
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      console.error('Update profile error:', error);
      set({
        error: error.message || 'Failed to update profile',
        isLoading: false
      });
      throw error;
    }
  }
}));

// Initialize auth state on app start
const initializeAuth = async () => {
  try {
    // Check onboarding status
    const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');

    const token = await AsyncStorage.getItem('userToken');

    if (token) {
      api.setToken(token);

      try {
        const user = await api.getMe();

        const appUser: User = {
          id: user.id,
          username: user.username,
          email: user.email,
          avatar: user.avatar || 'https://via.placeholder.com/150',
          bio: user.bio || '',
          role: user.role,
          followers_count: user.followers_count || 0,
          following_count: user.following_count || 0,
          games_count: user.games_count || 0,
          total_games_played: user.total_games_played || 0,
          total_play_time: user.total_play_time || 0,
          created_at: user.created_at,
        };

        useAuthStore.setState({
          user: appUser,
          token,
          isLoading: false,
          hasSeenOnboarding: hasSeenOnboarding === 'true'
        });
      } catch (error) {
        // Token is invalid, clear it
        await AsyncStorage.removeItem('userToken');
        api.setToken(null);
        useAuthStore.setState({
          user: null,
          token: null,
          isLoading: false,
          hasSeenOnboarding: hasSeenOnboarding === 'true'
        });
      }
    } else {
      useAuthStore.setState({
        user: null,
        token: null,
        isLoading: false,
        hasSeenOnboarding: hasSeenOnboarding === 'true'
      });
    }
  } catch (error) {
    console.error('Error initializing auth:', error);
    useAuthStore.setState({
      user: null,
      token: null,
      isLoading: false,
      hasSeenOnboarding: false
    });
  }
};

// Run initialization
initializeAuth();
