// Firestore helper functions for writing data

import { randomUUID } from 'crypto';
import { FieldValue, Timestamp, Query } from 'firebase-admin/firestore';
import { getDb } from './firebase.js';

export const COLLECTIONS = {
  PROJECTS: 'projects',
  STORIES: 'stories',
  AGENTS: 'agents',
  COUNTERS: 'counters',
  CONFIG: 'config',
  ACTIVITY: 'activity',
  CONTEXT: 'context',
  MEETINGS: 'meetings'
} as const;

// Valid story status values
export const VALID_STATUSES = [
  'ideas',
  'backlog',
  'in-design',
  'in-progress',
  'in-review',
  'done',
  'blocked',
  'cancelled'
] as const;

export type StoryStatus = (typeof VALID_STATUSES)[number];

/**
 * Token usage tracking for a story
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  sessions: number;
}

/**
 * Story document type (subset of fields used by CLI)
 */
export interface StoryDocument {
  id: string;
  shortId: string;
  projectId: string;
  status: StoryStatus;
  assignedAgent: string | null;
  title: string;
  description: string;
  priority: string;
  complexity: string;
  epicName: string;
  notes?: any[];
  noteReactions?: any[];
  blockedReason?: string | null;
  reservedFiles?: string[];
  [key: string]: any;
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

  if ((status === 'blocked' || status === 'cancelled') && blockedReason) {
    updateData.blockedReason = blockedReason;
    updateData.previousStatus = fromStatus;
  } else if (status !== 'blocked' && status !== 'cancelled') {
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
 * Update a story's tags
 * @param storyId Story document ID or short ID
 * @param tags Array of tag strings
 */
export async function updateStoryTags(storyId: string, tags: string[]) {
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

  await storyRef.update({
    tags,
    updatedAt: FieldValue.serverTimestamp()
  });

  return storyDoc.data()?.shortId || storyId;
}

/**
 * Add a note to a story
 * @param storyId Story document ID or short ID
 * @param text Note text
 * @param author Note author (agent name or "user")
 */
export async function addStoryNote(storyId: string, text: string, author: string, imageUrl?: string) {
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
  const noteData: Record<string, unknown> = {
    id: randomUUID(),
    text,
    author,
    createdAt: Timestamp.now()
  };
  if (imageUrl) {
    noteData.imageUrl = imageUrl;
  }

  await storyRef.update({
    notes: FieldValue.arrayUnion(noteData),
    updatedAt: FieldValue.serverTimestamp()
  });

  return storyDoc.data()?.shortId || storyId;
}

/**
 * Create a new story with atomic counter increment in a single transaction.
 * The counter increment and story document creation happen atomically,
 * preventing duplicate shortIds even under concurrent writes.
 *
 * @param data Story data
 * @param maxRetries Maximum retries on transaction contention (default 3)
 * @returns Created story document ID and shortId
 */
export async function createStory(
  data: {
    projectId: string;
    title: string;
    description?: string;
    userStory?: string;
    epicName?: string;
    priority: string;
    complexity?: string;
    assignedAgent?: string;
    tags?: string[];
  },
  maxRetries: number = 3
) {
  const db = getDb();

  // Get project to determine short code (outside transaction — project data is stable)
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

  // Retry loop for transaction contention or duplicate detection
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Generate a fresh document ref each attempt — if a previous attempt's
    // transaction failed after partial writes, reusing the ref could conflict
    const storyRef = db.collection(COLLECTIONS.STORIES).doc();

    try {
      const shortId = await db.runTransaction(async (transaction) => {
        // Step 1: Read and increment the counter atomically
        // Firestore transactions use optimistic concurrency on all docs read
        // via transaction.get(). Two concurrent creates will serialize here
        // because both read the same counter document.
        const counterRef = db.collection(COLLECTIONS.COUNTERS).doc('stories');
        const counterDoc = await transaction.get(counterRef);
        const currentValue = counterDoc.exists ? (counterDoc.data()?.[shortCode] || 0) : 0;
        const nextValue = currentValue + 1;
        const newShortId = `${shortCode}-${nextValue}`;

        // Step 2: Safety check — verify no story with this shortId already exists.
        // This guards against counter-out-of-sync scenarios (e.g., counter was
        // manually reset, or stories were imported without updating the counter).
        // The query is not transactional, but the counter read above IS — so
        // concurrent creates are already serialized by the counter document lock.
        const existingSnapshot = await db
          .collection(COLLECTIONS.STORIES)
          .where('shortId', '==', newShortId)
          .limit(1)
          .get();

        if (!existingSnapshot.empty) {
          // Counter is behind — advance it past the existing story and retry
          transaction.set(counterRef, { [shortCode]: nextValue }, { merge: true });
          throw new Error(`Duplicate shortId detected: ${newShortId}. Counter advanced, retrying...`);
        }

        // Step 3: Write counter increment and story document in the same transaction.
        // Both writes are atomic — if either fails, both roll back.
        transaction.set(counterRef, { [shortCode]: nextValue }, { merge: true });

        transaction.set(storyRef, {
          id: storyRef.id,
          shortId: newShortId,
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
          tags: data.tags || [],
          notes: [],
          noteReactions: [],
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        });

        return newShortId;
      });

      // Activity log is outside the transaction — it's append-only and non-critical
      const activityRef = storyRef.collection(COLLECTIONS.ACTIVITY).doc();
      await activityRef.set({
        fromStatus: null,
        toStatus: 'backlog',
        agent: data.assignedAgent || 'system',
        note: 'Story created',
        timestamp: FieldValue.serverTimestamp()
      });

      return { id: storyRef.id, shortId };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Retry on duplicate detection or transaction contention
      if (attempt < maxRetries - 1) {
        const delay = 100 * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      throw lastError;
    }
  }

  // Should never reach here, but TypeScript needs this
  throw lastError || new Error('Failed to create story after retries');
}

/**
 * List all stories for a project
 * @param projectId Project ID
 * @param status Optional status filter
 * @returns Array of story documents
 */
export async function listStories(projectId?: string, status?: string): Promise<StoryDocument[]> {
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
  } as StoryDocument));
}

/**
 * Acknowledge a note by adding a reaction
 * @param storyId Story document ID or short ID
 * @param noteId Note ID to acknowledge
 * @param author Agent name acknowledging the note
 */
export async function acknowledgeNote(storyId: string, noteId: string, author: string) {
  const db = getDb();

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

  // Check if already acknowledged
  const data = storyDoc.data();
  const reactions = data?.noteReactions || [];
  const alreadyAcked = reactions.some(
    (r: any) => r.noteId === noteId && r.author === author
  );

  if (alreadyAcked) {
    return { alreadyAcked: true, shortId: data?.shortId || storyId };
  }

  await storyRef.update({
    noteReactions: FieldValue.arrayUnion({
      noteId,
      author,
      createdAt: Timestamp.now()
    }),
    updatedAt: FieldValue.serverTimestamp()
  });

  return { alreadyAcked: false, shortId: data?.shortId || storyId };
}

/**
 * Get notes that an agent has not acknowledged
 * @param storyId Story document ID or short ID
 * @param agent Agent name to check
 * @returns Array of unacknowledged notes
 */
export async function getUnacknowledgedNotes(storyId: string, agent: string) {
  const db = getDb();

  let storyDoc;

  if (storyId.includes('-')) {
    const found = await findStoryByShortId(storyId);
    if (!found) {
      throw new Error(`Story not found: ${storyId}`);
    }
    storyDoc = found;
  } else {
    const ref = db.collection(COLLECTIONS.STORIES).doc(storyId);
    storyDoc = await ref.get();
    if (!storyDoc.exists) {
      throw new Error(`Story not found: ${storyId}`);
    }
  }

  const data = storyDoc.data();
  const notes: any[] = data?.notes || [];
  const reactions: any[] = data?.noteReactions || [];

  return notes.filter((note) => {
    // Skip notes without id (legacy) and notes by the agent itself
    if (!note.id || note.author === agent) return false;
    return !reactions.some(
      (r: any) => r.noteId === note.id && r.author === agent
    );
  });
}

// Context section line limits (from PROJECT_CONTEXT_SPEC.md)
const SECTION_LINE_LIMITS: Record<string, number> = {
  'tech-stack': 20,
  'architecture-decisions': 80,
  'file-organization': 30,
  'data-model': 40,
  'known-gotchas': 30,
  'active-conventions': 30,
  'recent-changes': 50,
  'agent-notes': 40
};

export interface ContextEntry {
  text: string;
  agent: string;
  timestamp: Timestamp;
}

export interface ContextSection {
  sectionName: string;
  entries: ContextEntry[];
}

/**
 * Read project context sections
 * @param projectId Project ID
 * @param sectionName Optional section name to filter by
 * @returns Array of context sections with entries
 */
export async function readProjectContext(
  projectId: string,
  sectionName?: string
): Promise<ContextSection[]> {
  const db = getDb();
  const projectRef = db.collection(COLLECTIONS.PROJECTS).doc(projectId);
  const contextRef = projectRef.collection(COLLECTIONS.CONTEXT);

  let query;
  if (sectionName) {
    query = contextRef.where('sectionName', '==', sectionName);
  } else {
    query = contextRef;
  }

  const snapshot = await query.get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      sectionName: data.sectionName || doc.id,
      entries: data.entries || []
    };
  });
}

/**
 * Write an entry to a project context section
 * Auto-truncates if section exceeds line limit
 * @param projectId Project ID
 * @param sectionName Section name
 * @param text Entry text
 * @param agent Agent name
 */
export async function writeProjectContextEntry(
  projectId: string,
  sectionName: string,
  text: string,
  agent: string
): Promise<void> {
  const db = getDb();
  const projectRef = db.collection(COLLECTIONS.PROJECTS).doc(projectId);
  const sectionRef = projectRef.collection(COLLECTIONS.CONTEXT).doc(sectionName);

  // Get current entries
  const sectionDoc = await sectionRef.get();
  const currentEntries: ContextEntry[] = sectionDoc.exists
    ? (sectionDoc.data()?.entries || [])
    : [];

  // Create new entry
  const newEntry: ContextEntry = {
    text,
    agent,
    timestamp: Timestamp.now()
  };

  // Add new entry
  const updatedEntries = [...currentEntries, newEntry];

  // Check if truncation is needed
  const lineLimit = SECTION_LINE_LIMITS[sectionName];
  if (lineLimit) {
    const totalLines = updatedEntries.reduce((sum, entry) => {
      // Count lines in entry text (split by newlines + 1 for metadata line)
      const textLines = entry.text.split('\n').length;
      return sum + textLines + 1; // +1 for the attribution line
    }, 0);

    // If exceeds limit, remove oldest entries until under limit
    if (totalLines > lineLimit) {
      let currentLines = totalLines;
      while (currentLines > lineLimit && updatedEntries.length > 1) {
        const removed = updatedEntries.shift();
        if (removed) {
          const removedLines = removed.text.split('\n').length + 1;
          currentLines -= removedLines;
        }
      }
    }
  }

  // Write updated section
  await sectionRef.set({
    sectionName,
    entries: updatedEntries,
    updatedAt: FieldValue.serverTimestamp()
  });
}

// ─── Meeting types ──────────────────────────────────────────────────────

export type MeetingType = 'retro' | 'planning' | 'ad-hoc';
export const VALID_MEETING_TYPES: MeetingType[] = ['retro', 'planning', 'ad-hoc'];

export type DecisionCategory = 'process' | 'technical' | 'product';
export type ActionStatus = 'open' | 'done';
export type ChangeType = 'story' | 'commit' | 'deploy' | 'config-change';

export interface AgendaItem {
  topic: string;
  presenter: string | null;
  notes: string;
  resolved: boolean;
}

export interface Decision {
  text: string;
  rationale: string;
  category: DecisionCategory;
}

export interface ActionItem {
  id: string;
  text: string;
  owner: string;
  status: ActionStatus;
  dueBy: Timestamp | null;
  linkedStoryId: string | null;
}

export interface LinkedChange {
  type: ChangeType;
  refId: string;
  description: string;
}

export interface MeetingData {
  projectId: string;
  type: MeetingType;
  date?: Date;
  sprintNumber?: number | null;
  summary: string;
  participants?: string[];
  agenda?: AgendaItem[];
  decisions?: Decision[];
  actionItems?: ActionItem[];
  linkedChanges?: LinkedChange[];
}

const MAX_SUMMARY_LENGTH = 5000;

/**
 * Create a new meeting document
 * @param data Meeting data
 * @returns Created meeting document ID
 */
export async function createMeeting(data: MeetingData): Promise<{ id: string }> {
  const db = getDb();

  // Verify project exists
  const projectRef = db.collection(COLLECTIONS.PROJECTS).doc(data.projectId);
  const projectDoc = await projectRef.get();
  if (!projectDoc.exists) {
    throw new Error(`Project not found: ${data.projectId}`);
  }

  // Truncate summary if needed
  let summary = data.summary;
  if (summary.length > MAX_SUMMARY_LENGTH) {
    console.warn(`WARNING: Summary truncated from ${summary.length} to ${MAX_SUMMARY_LENGTH} characters`);
    summary = summary.substring(0, MAX_SUMMARY_LENGTH);
  }

  // Check for duplicate (same date+type+sprint)
  const meetingDate = data.date ? Timestamp.fromDate(data.date) : Timestamp.now();
  const dateStr = meetingDate.toDate().toISOString().split('T')[0];
  const existingQuery = db.collection(COLLECTIONS.MEETINGS)
    .where('projectId', '==', data.projectId)
    .where('type', '==', data.type);
  const existingSnapshot = await existingQuery.get();
  const duplicates = existingSnapshot.docs.filter(doc => {
    const d = doc.data();
    const docDateStr = d.date?.toDate?.()?.toISOString?.()?.split('T')[0];
    const sprintMatch = data.sprintNumber != null
      ? d.sprintNumber === data.sprintNumber
      : d.sprintNumber == null;
    return docDateStr === dateStr && sprintMatch;
  });
  if (duplicates.length > 0) {
    console.warn(`WARNING: Duplicate meeting detected — same date (${dateStr}), type (${data.type}), and sprint (${data.sprintNumber ?? 'none'}). Proceeding anyway.`);
  }

  // Assign UUIDs to action items that don't have one
  const actionItems = (data.actionItems || []).map(item => ({
    ...item,
    id: item.id || randomUUID(),
    dueBy: item.dueBy ?? null,
    linkedStoryId: item.linkedStoryId ?? null
  }));

  const meetingRef = db.collection(COLLECTIONS.MEETINGS).doc();
  await meetingRef.set({
    id: meetingRef.id,
    projectId: data.projectId,
    type: data.type,
    date: meetingDate,
    sprintNumber: data.sprintNumber ?? null,
    summary,
    participants: data.participants || [],
    agenda: data.agenda || [],
    decisions: data.decisions || [],
    actionItems,
    linkedChanges: data.linkedChanges || [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });

  return { id: meetingRef.id };
}

/**
 * List meetings for a project, ordered by date descending
 */
export async function listMeetings(projectId: string, options?: {
  type?: MeetingType;
  limit?: number;
}): Promise<any[]> {
  const db = getDb();
  let query: Query = db.collection(COLLECTIONS.MEETINGS)
    .where('projectId', '==', projectId);

  if (options?.type) {
    query = query.where('type', '==', options.type);
  }

  query = query.orderBy('date', 'desc');

  const limit = options?.limit ?? 10;
  query = query.limit(limit);

  const snapshot = await query.get();
  return snapshot.docs.map(doc => doc.data());
}

/**
 * Get a single meeting by ID
 */
export async function getMeeting(meetingId: string): Promise<any | null> {
  const db = getDb();
  const doc = await db.collection(COLLECTIONS.MEETINGS).doc(meetingId).get();
  if (!doc.exists) return null;
  return doc.data();
}

/**
 * Find all open action items across all meetings for a project
 */
export async function getOpenActionItems(projectId: string): Promise<Array<{ meetingId: string; meetingDate: any; meetingType: string; actionItem: any }>> {
  const db = getDb();
  const snapshot = await db.collection(COLLECTIONS.MEETINGS)
    .where('projectId', '==', projectId)
    .orderBy('date', 'desc')
    .get();

  const results: Array<{ meetingId: string; meetingDate: any; meetingType: string; actionItem: any }> = [];
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const actionItems = data.actionItems || [];
    for (const item of actionItems) {
      if (item.status === 'open') {
        results.push({
          meetingId: data.id,
          meetingDate: data.date,
          meetingType: data.type,
          actionItem: item
        });
      }
    }
  }
  return results;
}

/**
 * List meetings for a project without requiring composite indexes.
 * Fetches by projectId only and sorts/filters client-side.
 * Use this when composite indexes (projectId + date, projectId + type + date) may not be deployed.
 */
export async function listMeetingsSimple(projectId: string, options?: {
  type?: MeetingType;
  limit?: number;
}): Promise<any[]> {
  const db = getDb();
  const snapshot = await db.collection(COLLECTIONS.MEETINGS)
    .where('projectId', '==', projectId)
    .get();

  let results = snapshot.docs.map(doc => doc.data());

  // Sort by date descending (client-side)
  results.sort((a: any, b: any) => {
    const dateA = a.date?.toDate ? a.date.toDate().getTime() : 0;
    const dateB = b.date?.toDate ? b.date.toDate().getTime() : 0;
    return dateB - dateA;
  });

  // Filter by type if specified
  if (options?.type) {
    results = results.filter((m: any) => m.type === options.type);
  }

  // Apply limit
  const limit = options?.limit ?? 10;
  return results.slice(0, limit);
}

/**
 * Find all open action items across all meetings for a project.
 * Does not require composite indexes — uses simple projectId query + client-side filtering.
 */
export async function getOpenActionItemsSimple(projectId: string): Promise<Array<{ meetingId: string; meetingDate: any; meetingType: string; actionItem: any }>> {
  const db = getDb();
  const snapshot = await db.collection(COLLECTIONS.MEETINGS)
    .where('projectId', '==', projectId)
    .get();

  const results: Array<{ meetingId: string; meetingDate: any; meetingType: string; actionItem: any }> = [];
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const actionItems = data.actionItems || [];
    for (const item of actionItems) {
      if (item.status === 'open') {
        results.push({
          meetingId: data.id,
          meetingDate: data.date,
          meetingType: data.type,
          actionItem: item
        });
      }
    }
  }

  // Sort by meeting date descending
  results.sort((a, b) => {
    const dateA = a.meetingDate?.toDate ? a.meetingDate.toDate().getTime() : 0;
    const dateB = b.meetingDate?.toDate ? b.meetingDate.toDate().getTime() : 0;
    return dateB - dateA;
  });

  return results;
}

/**
 * Update an action item within a meeting document using a transaction.
 * Finds the action item by ID or array index.
 * @param meetingId Meeting document ID
 * @param itemIdentifier Action item ID (UUID) or 1-based index
 * @param updates Fields to update on the action item
 * @returns The updated action item and meeting info
 */
export async function updateActionItem(
  meetingId: string,
  itemIdentifier: string,
  updates: { status?: ActionStatus; linkedStoryId?: string | null }
): Promise<{ actionItem: ActionItem; meetingType: string; meetingDate: any; alreadyDone: boolean }> {
  const db = getDb();
  const meetingRef = db.collection(COLLECTIONS.MEETINGS).doc(meetingId);

  return await db.runTransaction(async (transaction) => {
    const meetingDoc = await transaction.get(meetingRef);
    if (!meetingDoc.exists) {
      throw new Error(`Meeting not found: ${meetingId}`);
    }

    const data = meetingDoc.data()!;
    const actionItems: ActionItem[] = data.actionItems || [];

    if (actionItems.length === 0) {
      throw new Error('This meeting has no action items.');
    }

    // Find action item by ID or 1-based index
    let itemIndex: number;
    const asIndex = parseInt(itemIdentifier, 10);
    if (!isNaN(asIndex) && String(asIndex) === itemIdentifier) {
      // It's a numeric index (1-based)
      itemIndex = asIndex - 1;
      if (itemIndex < 0 || itemIndex >= actionItems.length) {
        throw new Error(`Action item index ${asIndex} out of range. This meeting has ${actionItems.length} action item(s) (1-${actionItems.length}).`);
      }
    } else {
      // It's a UUID
      itemIndex = actionItems.findIndex(a => a.id === itemIdentifier);
      if (itemIndex === -1) {
        throw new Error(`Action item not found with ID: ${itemIdentifier}. Use 'meeting get --id ${meetingId} --action-items-only' to see item IDs.`);
      }
    }

    const item = { ...actionItems[itemIndex] };

    // Check if already done (no-op for status change, but still allow link updates)
    const wasAlreadyDone = updates.status === 'done' && item.status === 'done';
    if (wasAlreadyDone && updates.linkedStoryId === undefined) {
      // Pure no-op: trying to mark done when already done, with no link change
      return { actionItem: item, meetingType: data.type, meetingDate: data.date, alreadyDone: true };
    }

    // Apply updates
    if (updates.status !== undefined) {
      item.status = updates.status;
    }
    if (updates.linkedStoryId !== undefined) {
      item.linkedStoryId = updates.linkedStoryId;
    }

    // Write back
    const updatedItems = [...actionItems];
    updatedItems[itemIndex] = item;

    transaction.update(meetingRef, {
      actionItems: updatedItems,
      updatedAt: FieldValue.serverTimestamp()
    });

    return { actionItem: item, meetingType: data.type, meetingDate: data.date, alreadyDone: false };
  });
}

// ─── Board metrics helpers (for meeting prep) ───────────────────────────

export interface BoardMetrics {
  completedStories: StoryDocument[];
  blockedStories: StoryDocument[];
  inProgressStories: StoryDocument[];
  averageCycleTimeDays: number | null;
  priorityBreakdown: Record<string, number>;
}

/**
 * Get board metrics for a project within a time window.
 * Queries stories completed since a given date, plus currently blocked/in-progress.
 */
export async function getBoardMetrics(
  projectId: string,
  since: Date
): Promise<BoardMetrics> {
  const db = getDb();
  const storiesRef = db.collection(COLLECTIONS.STORIES);

  // Fetch all stories for the project (we need multiple status filters)
  const snapshot = await storiesRef
    .where('projectId', '==', projectId)
    .get();

  const allStories = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as StoryDocument));

  const sinceTs = Timestamp.fromDate(since);

  // Completed stories since the lookback date
  const completedStories = allStories.filter(s => {
    if (s.status !== 'done') return false;
    const updatedAt = s.updatedAt;
    if (!updatedAt) return false;
    const updatedDate = updatedAt.toDate ? updatedAt.toDate() : new Date(updatedAt);
    return updatedDate >= since;
  });

  // Currently blocked stories
  const blockedStories = allStories.filter(s => s.status === 'blocked');

  // Currently in-progress stories
  const inProgressStories = allStories.filter(s => s.status === 'in-progress');

  // Calculate average cycle time for completed stories
  let averageCycleTimeDays: number | null = null;
  const cycleTimes: number[] = [];
  for (const story of completedStories) {
    const created = story.createdAt;
    const updated = story.updatedAt;
    if (created && updated) {
      const createdDate = created.toDate ? created.toDate() : new Date(created);
      const updatedDate = updated.toDate ? updated.toDate() : new Date(updated);
      const diffMs = updatedDate.getTime() - createdDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      cycleTimes.push(diffDays);
    }
  }
  if (cycleTimes.length > 0) {
    averageCycleTimeDays = cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length;
  }

  // Priority breakdown (all non-cancelled, non-done stories)
  const priorityBreakdown: Record<string, number> = {};
  for (const story of allStories) {
    if (story.status === 'cancelled') continue;
    const priority = story.priority || 'Unknown';
    priorityBreakdown[priority] = (priorityBreakdown[priority] || 0) + 1;
  }

  return {
    completedStories,
    blockedStories,
    inProgressStories,
    averageCycleTimeDays,
    priorityBreakdown
  };
}

/**
 * Get agent activity: which agents worked on which stories, with session/token info.
 */
export async function getAgentActivity(
  projectId: string,
  since: Date
): Promise<Array<{ agent: string; stories: Array<{ shortId: string; title: string; status: string; sessions: number; totalTokens: number }> }>> {
  const db = getDb();
  const snapshot = await db.collection(COLLECTIONS.STORIES)
    .where('projectId', '==', projectId)
    .get();

  const allStories = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as StoryDocument));

  // Filter stories that were updated since the lookback date
  const recentStories = allStories.filter(s => {
    const updatedAt = s.updatedAt;
    if (!updatedAt) return false;
    const updatedDate = updatedAt.toDate ? updatedAt.toDate() : new Date(updatedAt);
    return updatedDate >= since;
  });

  // Group by agent
  const agentMap = new Map<string, Array<{ shortId: string; title: string; status: string; sessions: number; totalTokens: number }>>();
  for (const story of recentStories) {
    const agent = story.assignedAgent || 'unassigned';
    if (!agentMap.has(agent)) {
      agentMap.set(agent, []);
    }
    agentMap.get(agent)!.push({
      shortId: story.shortId,
      title: story.title,
      status: story.status,
      sessions: story.tokenUsage?.sessions || 0,
      totalTokens: story.tokenUsage?.totalTokens || 0
    });
  }

  // Convert to sorted array
  return Array.from(agentMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([agent, stories]) => ({ agent, stories }));
}
