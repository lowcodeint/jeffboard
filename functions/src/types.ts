/**
 * Type definitions for JeffBoard Cloud Functions
 */

export type StoryStatus =
  | 'backlog'
  | 'in-design'
  | 'in-progress'
  | 'in-review'
  | 'done'
  | 'blocked'
  | 'cancelled';

/**
 * Webhook event written to Firestore when a story status changes
 */
export interface WebhookEvent {
  /** Unique event ID (same as document ID) */
  id: string;

  /** Event type - currently only status-changed is supported */
  eventType: 'status-changed';

  /** Story document ID */
  storyId: string;

  /** Story short ID (e.g., "JB-1") */
  shortId: string;

  /** Project document ID */
  projectId: string;

  /** Previous status value */
  oldStatus: StoryStatus;

  /** New status value */
  newStatus: StoryStatus;

  /** Agent assigned to the story (nullable) */
  assignedAgent: string | null;

  /** Epic name (nullable) */
  epicName: string | null;

  /** Webhook delivery status */
  status: 'pending' | 'delivered' | 'failed' | 'retrying';

  /** Error message if delivery failed */
  error?: string;

  /** Timestamp when event was created */
  createdAt: FirebaseFirestore.Timestamp;

  /** Timestamp when webhook was last attempted */
  attemptedAt?: FirebaseFirestore.Timestamp;

  /** Number of delivery attempts */
  attempts: number;
}

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
 * Story document structure (subset - only fields needed by Cloud Functions)
 */
export interface Story {
  id: string;
  shortId: string;
  projectId: string;
  epicName: string;
  status: StoryStatus;
  assignedAgent: string | null;
  tags?: string[];
  tokenUsage?: TokenUsage | null;
  reservedFiles?: string[];
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Project document structure (subset - only fields needed by Cloud Functions)
 */
export interface Project {
  id: string;
  name: string;
  shortCode: string;
  webhookUrl?: string;
  webhookSecret?: string;
  burstMode?: boolean;
}
