// Story write operations via client Firebase SDK

import { doc, updateDoc, arrayUnion, arrayRemove, collection, addDoc, Timestamp, getFirestore, runTransaction } from 'firebase/firestore';
import { app } from '../lib/firebase';
import type { StoryNote, NoteReaction, StoryStatus, Priority, Complexity } from '../types';

const db = getFirestore(app);

/**
 * Append a note to a story's notes array and touch updatedAt.
 * Uses arrayUnion so it's safe against concurrent writes.
 */
export async function addNote(storyId: string, text: string, authorName: string): Promise<void> {
  const note: StoryNote = {
    id: crypto.randomUUID(),
    text,
    author: authorName,
    createdAt: Timestamp.now(),
  };

  const storyRef = doc(db, 'stories', storyId);
  await updateDoc(storyRef, {
    notes: arrayUnion(note),
    updatedAt: Timestamp.now(),
  });
}

/**
 * Update a story's status and create an activity log entry.
 * Mirrors the CLI logic: sets previousStatus/blockedReason for blocked/cancelled,
 * clears them otherwise.
 */
export async function updateStoryStatus(
  storyId: string,
  newStatus: StoryStatus,
  currentStatus: StoryStatus,
  authorName: string,
  reason?: string,
): Promise<void> {
  const storyRef = doc(db, 'stories', storyId);

  const needsReason = newStatus === 'blocked' || newStatus === 'cancelled';
  const storyUpdate: Record<string, unknown> = {
    status: newStatus,
    updatedAt: Timestamp.now(),
  };

  if (needsReason) {
    storyUpdate.previousStatus = currentStatus;
    storyUpdate.blockedReason = reason || null;
  } else {
    storyUpdate.previousStatus = null;
    storyUpdate.blockedReason = null;
  }

  await updateDoc(storyRef, storyUpdate);

  // Create activity log entry
  const activityRef = collection(db, 'stories', storyId, 'activity');
  await addDoc(activityRef, {
    fromStatus: currentStatus,
    toStatus: newStatus,
    agent: authorName,
    note: reason || null,
    timestamp: Timestamp.now(),
  });
}

/**
 * Add a thumbs-up reaction to a specific note.
 */
export async function addNoteReaction(storyId: string, noteId: string, authorName: string): Promise<void> {
  const reaction: NoteReaction = {
    noteId,
    author: authorName,
    createdAt: Timestamp.now(),
  };

  const storyRef = doc(db, 'stories', storyId);
  await updateDoc(storyRef, {
    noteReactions: arrayUnion(reaction),
    updatedAt: Timestamp.now(),
  });
}

/**
 * Remove a reaction from a note (for toggle behavior).
 */
export async function removeNoteReaction(storyId: string, reaction: NoteReaction): Promise<void> {
  const storyRef = doc(db, 'stories', storyId);
  await updateDoc(storyRef, {
    noteReactions: arrayRemove(reaction),
    updatedAt: Timestamp.now(),
  });
}

/**
 * Update arbitrary story fields (title, description, priority, etc.).
 * Only sends changed fields to minimize the Firestore write.
 */
export async function updateStoryFields(
  storyId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  const storyRef = doc(db, 'stories', storyId);
  await updateDoc(storyRef, {
    ...fields,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Mark all unread notes as read by adding reactions for the current user.
 * Groups by storyId to minimize writes (one updateDoc per story).
 */
export async function markAllNotesRead(
  unreadNotes: { storyId: string; noteId: string }[],
  authorName: string,
): Promise<void> {
  // Group notes by storyId
  const byStory = new Map<string, string[]>();
  for (const { storyId, noteId } of unreadNotes) {
    const existing = byStory.get(storyId) || [];
    existing.push(noteId);
    byStory.set(storyId, existing);
  }

  // One write per story with all reactions batched
  const writes = Array.from(byStory.entries()).map(([storyId, noteIds]) => {
    const reactions: NoteReaction[] = noteIds.map((noteId) => ({
      noteId,
      author: authorName,
      createdAt: Timestamp.now(),
    }));
    const storyRef = doc(db, 'stories', storyId);
    return updateDoc(storyRef, {
      noteReactions: arrayUnion(...reactions),
      updatedAt: Timestamp.now(),
    });
  });

  await Promise.all(writes);
}

/**
 * Create a new story from the web UI with atomic shortId generation.
 * Uses a Firestore transaction to atomically increment the counter and
 * create the story document, preventing duplicate shortIds.
 *
 * @returns Object with the Firestore document ID and the generated shortId
 */
export async function createStory(data: {
  projectId: string;
  shortCode: string;
  title: string;
  description?: string;
  userStory?: string;
  epicName?: string;
  acceptanceCriteria?: { text: string; completed: boolean }[];
  priority: Priority;
  complexity: Complexity;
  assignedAgent?: string | null;
  tags?: string[];
}): Promise<{ id: string; shortId: string }> {
  const storyRef = doc(collection(db, 'stories'));
  const counterRef = doc(db, 'counters', 'stories');

  const shortId = await runTransaction(db, async (transaction) => {
    // Step 1: Read and increment the counter atomically
    const counterDoc = await transaction.get(counterRef);
    const currentValue = counterDoc.exists() ? (counterDoc.data()?.[data.shortCode] || 0) : 0;
    const nextValue = currentValue + 1;
    const newShortId = `${data.shortCode}-${nextValue}`;

    // Step 2: Write counter increment and story document in the same transaction
    transaction.set(counterRef, { [data.shortCode]: nextValue }, { merge: true });

    const now = Timestamp.now();
    transaction.set(storyRef, {
      id: storyRef.id,
      shortId: newShortId,
      projectId: data.projectId,
      title: data.title,
      description: data.description || '',
      userStory: data.userStory || '',
      epicName: data.epicName || '',
      acceptanceCriteria: data.acceptanceCriteria || [],
      status: 'backlog',
      previousStatus: null,
      blockedReason: null,
      priority: data.priority,
      complexity: data.complexity,
      assignedAgent: data.assignedAgent || null,
      tags: data.tags || [],
      notes: [],
      noteReactions: [],
      createdAt: now,
      updatedAt: now,
    });

    return newShortId;
  });

  // Activity log is outside the transaction — append-only and non-critical
  const activityRef = collection(db, 'stories', storyRef.id, 'activity');
  await addDoc(activityRef, {
    fromStatus: null,
    toStatus: 'backlog',
    agent: 'user',
    note: 'Story created',
    timestamp: Timestamp.now(),
  });

  return { id: storyRef.id, shortId };
}
