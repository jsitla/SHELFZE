// Firebase Configuration
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyC66xR2UVuJX0RSDrWQDR7e3h5ONGwPiz4",
  authDomain: "pantryai-3d396.firebaseapp.com",
  projectId: "pantryai-3d396",
  storageBucket: "pantryai-3d396.firebasestorage.app",
  messagingSenderId: "747247644525",
  appId: "1:747247644525:web:fce1891acfe75c5b5e7464",
  measurementId: "G-JSZ0LF3C6Y"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Auth with error handling
let auth;
try {
  // Try to initialize auth with AsyncStorage persistence
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (error) {
  // If auth is already initialized, just get the existing instance
  if (__DEV__) console.log('Auth already initialized, using existing instance');
  auth = getAuth(app);
}

export { auth };

// Initialize Firestore
export const db = getFirestore(app);
