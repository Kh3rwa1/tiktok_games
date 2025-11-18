import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration
// Set these via environment variables in your .env file
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "YOUR_APP_ID"
};

// Validate Firebase configuration
const validateConfig = () => {
  const missingKeys: string[] = [];
  const placeholderValues = ['YOUR_API_KEY', 'YOUR_AUTH_DOMAIN', 'YOUR_PROJECT_ID', 'YOUR_STORAGE_BUCKET', 'YOUR_MESSAGING_SENDER_ID', 'YOUR_APP_ID'];

  if (!firebaseConfig.apiKey || placeholderValues.includes(firebaseConfig.apiKey)) {
    missingKeys.push('EXPO_PUBLIC_FIREBASE_API_KEY');
  }
  if (!firebaseConfig.authDomain || placeholderValues.includes(firebaseConfig.authDomain)) {
    missingKeys.push('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN');
  }
  if (!firebaseConfig.projectId || placeholderValues.includes(firebaseConfig.projectId)) {
    missingKeys.push('EXPO_PUBLIC_FIREBASE_PROJECT_ID');
  }
  if (!firebaseConfig.storageBucket || placeholderValues.includes(firebaseConfig.storageBucket)) {
    missingKeys.push('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET');
  }
  if (!firebaseConfig.messagingSenderId || placeholderValues.includes(firebaseConfig.messagingSenderId)) {
    missingKeys.push('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
  }
  if (!firebaseConfig.appId || placeholderValues.includes(firebaseConfig.appId)) {
    missingKeys.push('EXPO_PUBLIC_FIREBASE_APP_ID');
  }

  if (missingKeys.length > 0) {
    console.error(
      '🔥 Firebase Configuration Error!\n\n' +
      'Missing or invalid Firebase configuration keys:\n' +
      missingKeys.map(key => `  - ${key}`).join('\n') +
      '\n\n' +
      'Please create a .env file in the mobile directory with your Firebase credentials:\n\n' +
      'EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key\n' +
      'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com\n' +
      'EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id\n' +
      'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com\n' +
      'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789\n' +
      'EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123\n\n' +
      'Get these values from Firebase Console > Project Settings > General > Your Apps'
    );
  }

  return missingKeys.length === 0;
};

// Validate configuration
const isConfigValid = validateConfig();

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

  // Initialize Firebase Auth with AsyncStorage persistence
  if (getApps().length === 1) {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } else {
    auth = getAuth(app);
  }

  // Initialize Firestore
  db = getFirestore(app);

  // Initialize Firebase Storage
  storage = getStorage(app);
} catch (error: any) {
  console.error('Firebase initialization error:', error.message);

  // Re-throw with more helpful message
  if (error.code === 'app/invalid-api-key') {
    throw new Error(
      'Invalid Firebase API key. Please check your EXPO_PUBLIC_FIREBASE_API_KEY in .env file.'
    );
  }
  throw error;
}

// Export configuration status for components that need to check
export const isFirebaseConfigured = isConfigValid;

export { app, auth, db, storage };
