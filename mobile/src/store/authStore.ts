import { create } from 'zustand';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { User, AuthState } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  error: null,

  setUser: (user: User | null) => set({ user }),

  setToken: (token: string | null) => set({ token }),

  signIn: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });

      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Get ID token
      const token = await firebaseUser.getIdToken();

      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

      if (userDoc.exists()) {
        const userData = {
          id: firebaseUser.uid,
          uid: firebaseUser.uid,
          ...userDoc.data()
        } as User;

        // Save token to AsyncStorage
        await AsyncStorage.setItem('userToken', token);

        set({
          user: userData,
          token,
          isLoading: false,
          error: null
        });
      } else {
        throw new Error('User data not found in Firestore');
      }
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

      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Update Firebase Auth profile
      await updateProfile(firebaseUser, {
        displayName: username,
        photoURL: 'https://via.placeholder.com/150'
      });

      // Create user document in Firestore
      const userData: Partial<User> = {
        uid: firebaseUser.uid,
        username,
        email: email.toLowerCase(),
        avatar: 'https://via.placeholder.com/150',
        bio: '',
        favoriteGames: [],
        playHistory: [],
        stats: {
          totalGamesPlayed: 0,
          totalPlayTime: 0
        },
        isActive: true,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), userData);

      // Get ID token
      const token = await firebaseUser.getIdToken();

      // Save token to AsyncStorage
      await AsyncStorage.setItem('userToken', token);

      const fullUserData = {
        id: firebaseUser.uid,
        ...userData
      } as User;

      set({
        user: fullUserData,
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

      // Sign out from Firebase
      await firebaseSignOut(auth);

      // Remove token from AsyncStorage
      await AsyncStorage.removeItem('userToken');

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

      // Update Firestore
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: new Date()
      });

      // Update Firebase Auth profile if needed
      if (updates.username || updates.avatar) {
        const currentUser = auth.currentUser;
        if (currentUser) {
          await updateProfile(currentUser, {
            displayName: updates.username || currentUser.displayName,
            photoURL: updates.avatar || currentUser.photoURL
          });
        }
      }

      // Update local state
      set({
        user: {
          ...user,
          ...updates,
          updatedAt: new Date()
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

// Initialize auth state listener
onAuthStateChanged(auth, async (firebaseUser) => {
  if (firebaseUser) {
    try {
      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

      if (userDoc.exists()) {
        const userData = {
          id: firebaseUser.uid,
          uid: firebaseUser.uid,
          ...userDoc.data()
        } as User;

        // Get fresh token
        const token = await firebaseUser.getIdToken();
        await AsyncStorage.setItem('userToken', token);

        useAuthStore.setState({
          user: userData,
          token,
          isLoading: false
        });
      }
    } catch (error) {
      console.error('Error loading user:', error);
      useAuthStore.setState({
        user: null,
        token: null,
        isLoading: false
      });
    }
  } else {
    useAuthStore.setState({
      user: null,
      token: null,
      isLoading: false
    });
  }
});
