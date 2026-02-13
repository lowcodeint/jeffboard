// Firestore instance and helper functions

import { getFirestore, Firestore } from 'firebase/firestore';
import { app } from '../lib/firebase';

// Initialize Firestore
export const db: Firestore = getFirestore(app);

// Collection names as constants
export const COLLECTIONS = {
  PROJECTS: 'projects',
  STORIES: 'stories',
  AGENTS: 'agents',
  COUNTERS: 'counters',
  CONFIG: 'config',
  ACTIVITY: 'activity', // Subcollection
  WEBHOOK_EVENTS: 'webhookEvents'
} as const;
