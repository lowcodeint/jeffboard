// Firestore helper functions for writing data

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getDb } from './firebase.js';

export const COLLECTIONS = {
  PROJECTS: 'projects',
  STORIES: 'stories',
  AGENTS: 'agents',
  COUNTERS: 'counters',
  CONFIG: 'config',
  ACTIVITY: 'activity'
} as const;

// Valid story status values
export const VALID_STATUSES = [
  'backlog',
  'in-design',
  'in-progress',
  'in-review',
  'done',
  'blocked'
] as const;

export type StoryStatus = (typeof VALID_STATUSES)[number];

/**
 * Get the next short ID for a story in a project
 * @param shortCode Project short code (e.g., "KB")
 * @returns Next short ID number
 */
export async function getNextShortId(shortCode: string): Promise<number> {
  const db = getDb();
  const counterRef = db.collection(COLLECTIONS.COUNTERS).doc('stories');

  // Use a transaction to atomically increment and read the counter
  const nextId = await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(counterRef);
    const currentValue = doc.exists ? (doc.data()?.[shortCode] || 0) : 0;
    const nextValue = currentValue + 1;

    transaction.set(counterRef, { [shortCode]: nextValue }, { merge: true });

    return nextValue;
  });

  return nextId;
}

/**
 * Find a story by short ID (e.g., "KB-14")
 * @param shortId Story short ID
 * @returns Story document snapshot or null
 */
export async function findStoryByShortId(shortId: string) {
  const db = getDb();
  const storiesRef = db.collection(COLLECTIONS.STORIES);
  const snapshot = await storiesRef.where('shortId', '==', shortId).limit(1).get();

  if (snapshot.empty) {
    return null;
  }

  return snapshot.docs[0];
}

/**
 * Update a story's status and add activity log entry
 * @param storyId Story document ID or short ID
 * @param status New status
 * @param agent Agent making the change
 * @param blockedReason Optional reason if blocking
 * @param note Optional note
 */
export async function updateStoryStatus(
  storyId: string,
  status: StoryStatus,
  agent: string,
  blockedReason?: string,
  note?: string
) {
  const db = getDb();

  // Find story by short ID if provided (e.g., "KB-14")
  let storyRef;
  let storyDoc;

  if (storyId.includes('-')) {
    const found = await findStoryByShortId(storyId);
    if (!found) {
      throw new Error(`Story not found: ${storyId}`);
    }
    storyDoc = found;
    storyRef = found.ref;
  } else {
    storyRef = db.collection(COLLECTIONS.STORIES).doc(storyId);
    storyDoc = await storyRef.get();
    if (!storyDoc.exists) {
      throw new Error(`Story not found: ${storyId}`);
    }
  }

  const currentData = storyDoc.data();
  const fromStatus = currentData?.status || null;

  // Update story document
  const updateData: any = {
    status,
    assignedAgent: agent,
    updatedAt: FieldValue.serverTimestamp()
  };

  if (status === 'blocked' && blockedReason) {
    updateData.blockedReason = blockedReason;
    updateData.previousStatus = fromStatus;
  } else if (status !== 'blocked') {
    updateData.blockedReason = null;
    if (currentData?.previousStatus) {
      updateData.previousStatus = null;
    }
  }

  await storyRef.update(updateData);

  // Add activity log entry
  const activityRef = storyRef.collection(COLLECTIONS.ACTIVITY).doc();
  await activityRef.set({
    fromStatus,
    toStatus: status,
    agent,
    note: note || null,
    timestamp: FieldValue.serverTimestamp()
  });

  return storyDoc.data()?.shortId || storyId;
}

/**
 * Add a note to a story
 * @param storyId Story document ID or short ID
 * @param text Note text
 * @param author Note author (agent name or "user")
 */
export async function addStoryNote(storyId: string, text: string, author: string) {
  const db = getDb();

  // Find story by short ID if provided
  let storyRef;
  let storyDoc;

  if (storyId.includes('-')) {
    const found = await findStoryByShortId(storyId);
    if (!found) {
      throw new Error(`Story not found: ${storyId}`);
    }
    storyDoc = found;
    storyRef = found.ref;
  } else {
    storyRef = db.collection(COLLECTIONS.STORIES).doc(storyId);
    storyDoc = await storyRef.get();
    if (!storyDoc.exists) {
      throw new Error(`Story not found: ${storyId}`);
    }
  }

  // Add note to notes array
  await storyRef.update({
    notes: FieldValue.arrayUnion({
      text,
      author,
      createdAt: Timestamp.now()
    }),
    updatedAt: FieldValue.serverTimestamp()
  });

  return storyDoc.data()?.shortId || storyId;
}

/**
 * Create a new story
 * @param data Story data
 * @returns Created story document ID
 */
export async function createStory(data: {
  projectId: string;
  title: string;
  description?: string;
  userStory?: string;
  epicName?: string;
  priority: string;
  complexity?: string;
  assignedAgent?: string;
}) {
  const db = getDb();

  // Get project to determine short code
  const projectRef = db.collection(COLLECTIONS.PROJECTS).doc(data.projectId);
  const projectDoc = await projectRef.get();

  if (!projectDoc.exists) {
    throw new Error(`Project not found: ${data.projectId}`);
  }

  const projectData = projectDoc.data();
  const shortCode = projectData?.shortCode;

  if (!shortCode) {
    throw new Error(`Project ${data.projectId} has no short code`);
  }

  // Get next short ID
  const shortIdNum = await getNextShortId(shortCode);
  const shortId = `${shortCode}-${shortIdNum}`;

  // Create story document
  const storyRef = db.collection(COLLECTIONS.STORIES).doc();
  await storyRef.set({
    id: storyRef.id,
    shortId,
    projectId: data.projectId,
    title: data.title,
    description: data.description || '',
    userStory: data.userStory || '',
    epicName: data.epicName || '',
    acceptanceCriteria: [],
    status: 'backlog',
    previousStatus: null,
    blockedReason: null,
    priority: data.priority,
    complexity: data.complexity || 'M',
    assignedAgent: data.assignedAgent || null,
    notes: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });

  // Add creation activity
  const activityRef = storyRef.collection(COLLECTIONS.ACTIVITY).doc();
  await activityRef.set({
    fromStatus: null,
    toStatus: 'backlog',
    agent: data.assignedAgent || 'system',
    note: 'Story created',
    timestamp: FieldValue.serverTimestamp()
  });

  return { id: storyRef.id, shortId };
}

/**
 * List all stories for a project
 * @param projectId Project ID
 * @param status Optional status filter
 * @returns Array of story documents
 */
export async function listStories(projectId?: string, status?: string) {
  const db = getDb();
  let query = db.collection(COLLECTIONS.STORIES);

  if (projectId) {
    query = query.where('projectId', '==', projectId) as any;
  }

  if (status) {
    query = query.where('status', '==', status) as any;
  }

  const snapshot = await query.orderBy('updatedAt', 'desc').limit(50).get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data()
  }));
}
