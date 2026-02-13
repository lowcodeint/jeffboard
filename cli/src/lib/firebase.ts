// Firebase Admin SDK initialization

import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';

let db: Firestore | null = null;

/**
 * Initialize Firebase Admin SDK with service account
 * @param serviceAccountPath Path to service account JSON file
 * @returns Firestore instance
 */
export function initializeFirebase(serviceAccountPath?: string): Firestore {
  if (db) {
    return db;
  }

  try {
    // Get service account path from environment or parameter
    const accountPath =
      serviceAccountPath ||
      process.env.JEFFBOARD_SERVICE_ACCOUNT ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (!accountPath) {
      throw new Error(
        'Service account path not provided. Set JEFFBOARD_SERVICE_ACCOUNT environment variable ' +
          'or pass --service-account flag.'
      );
    }

    // Read and parse service account JSON
    const resolvedPath = resolve(accountPath);
    const serviceAccountJson = readFileSync(resolvedPath, 'utf8');
    const serviceAccount = JSON.parse(serviceAccountJson) as ServiceAccount;

    // Initialize Firebase Admin
    initializeApp({
      credential: cert(serviceAccount),
      storageBucket: 'jeff-board.firebasestorage.app'
    });

    db = getFirestore();
    console.log('Firebase Admin SDK initialized successfully');

    return db;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to initialize Firebase: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Get Firestore instance (must call initializeFirebase first)
 */
export function getDb(): Firestore {
  if (!db) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }
  return db;
}
