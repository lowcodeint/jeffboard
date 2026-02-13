// Firebase Authentication service

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  browserLocalPersistence,
  setPersistence,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type Auth,
  type User
} from 'firebase/auth';
import { app } from '../lib/firebase';

// Initialize Firebase Auth
export const auth: Auth = getAuth(app);

// Set persistence to local (survives browser restarts, works in PWA)
setPersistence(auth, browserLocalPersistence);

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

/**
 * Handle redirect result on app load (for mobile Safari sign-in flow)
 * Must be called early in app initialization
 */
export async function handleRedirectResult(): Promise<User | null> {
  try {
    const result = await getRedirectResult(auth);
    return result?.user ?? null;
  } catch (error) {
    console.error('Redirect result error:', error);
    return null;
  }
}

/**
 * Sign in with Google
 * Uses popup for all environments (works on modern mobile browsers).
 * Falls back to redirect only if the popup is blocked.
 */
export async function signInWithGoogle(): Promise<void> {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error: any) {
    // If popup was blocked, fall back to redirect
    if (error?.code === 'auth/popup-blocked') {
      await signInWithRedirect(auth, googleProvider);
      return;
    }
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
