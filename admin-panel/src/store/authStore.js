import { create } from 'zustand';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const useAuthStore = create((set, get) => ({
  user: null,
  loading: true,
  error: null,

  // Initialize auth listener
  initialize: () => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

          if (userDoc.exists()) {
            const userData = userDoc.data();

            // Check if user is admin
            if (userData.role === 'admin') {
              set({
                user: {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email,
                  ...userData
                },
                loading: false,
                error: null
              });
            } else {
              // Not an admin - sign out
              await signOut(auth);
              set({
                user: null,
                loading: false,
                error: 'Access denied: Admin privileges required'
              });
            }
          } else {
            set({
              user: null,
              loading: false,
              error: 'User data not found'
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          set({
            user: null,
            loading: false,
            error: error.message
          });
        }
      } else {
        set({ user: null, loading: false, error: null });
      }
    });

    return unsubscribe;
  },

  // Sign in
  signIn: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));

      if (!userDoc.exists()) {
        throw new Error('User data not found');
      }

      const userData = userDoc.data();

      // Check if user is admin
      if (userData.role !== 'admin') {
        await signOut(auth);
        throw new Error('Access denied: Admin privileges required');
      }

      set({
        user: {
          uid: user.uid,
          email: user.email,
          ...userData
        },
        loading: false,
        error: null
      });

      return true;
    } catch (error) {
      console.error('Sign in error:', error);
      set({
        user: null,
        loading: false,
        error: error.message
      });
      throw error;
    }
  },

  // Sign out
  signOut: async () => {
    try {
      await signOut(auth);
      set({ user: null, loading: false, error: null });
    } catch (error) {
      console.error('Sign out error:', error);
      set({ error: error.message });
      throw error;
    }
  },

  // Clear error
  clearError: () => set({ error: null }),
}));

export default useAuthStore;
