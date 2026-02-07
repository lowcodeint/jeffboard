// Firebase Authentication service

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type Auth,
  type User
} from 'firebase/auth';
import { app } from '../lib/firebase';

// Initialize Firebase Auth
export const auth: Auth = getAuth(app);

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Detect if running on iOS (for choosing sign-in method)
function isIOS(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/**
 * Sign in with Google
 * Uses redirect on iOS (for PWA compatibility), popup on desktop
 */
export async function signInWithGoogle(): Promise<void> {
  try {
    if (isIOS()) {
      // Use redirect on iOS for better PWA support
      await signInWithRedirect(auth, googleProvider);
    } else {
      // Use popup on desktop for better UX
      await signInWithPopup(auth, googleProvider);
    }
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
}

/**
 * Listen to auth state changes
 */
export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}
