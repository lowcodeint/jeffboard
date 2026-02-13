// TypeScript types for Firestore documents and application state

import { Timestamp } from 'firebase/firestore';

// Enums
export type StoryStatus = 'ideas' | 'backlog' | 'in-design' | 'in-progress' | 'in-review' | 'done' | 'blocked' | 'cancelled';
export type Priority = 'P0' | 'P1' | 'P2' | 'P3';
export type Complexity = 'S' | 'M' | 'L' | 'XL';
export type AgentId =
  | 'product-manager'
  | 'solution-architect'
  | 'lead-engineer'
  | 'security-reviewer'
  | 'designer'
  | 'quality-inspector';

// Firestore document interfaces
export interface Project {
  id: string;
  name: string;
  description: string;
  shortCode: string;
  webhookUrl?: string;
  burstMode?: boolean;
  isArchived: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AcceptanceCriterion {
  text: string;
  completed: boolean;
}

export interface StoryNote {
  id?: string;
  text: string;
  imageUrl?: string;
  author: string;
  createdAt: Timestamp;
}

export interface NoteReaction {
  noteId: string;
  author: string;
  createdAt: Timestamp;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  sessions: number;
}

export interface Story {
  id: string;
  shortId: string;
  projectId: string;
  epicName: string;
  title: string;
  description: string;
  userStory: string;
  acceptanceCriteria: AcceptanceCriterion[];
  status: StoryStatus;
  previousStatus: StoryStatus | null;
  blockedReason: string | null;
  priority: Priority;
  complexity: Complexity;
  assignedAgent: string | null;
  notes: StoryNote[];
  noteReactions: NoteReaction[];
  tags?: string[];
  tokenUsage?: TokenUsage | null;
  lastHeartbeat?: Timestamp | null;
  heartbeatAgent?: string | null;
  heartbeatMessage?: string | null;
  reservedFiles?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Activity {
  id: string;
  fromStatus: StoryStatus | null;
  toStatus: StoryStatus;
  agent: string;
  note: string | null;
  timestamp: Timestamp;
}

export interface Agent {
  id: string;
  name: string;
  displayName: string;
  abbreviation: string;
  color: string;
  colorHex: string;
  role: string;
  model: string;
}

export interface AllowedUsersConfig {
  uids: string[];
}

export interface WebhookEvent {
  id: string;
  eventType: 'status-changed';
  storyId: string;
  shortId: string;
  projectId: string;
  oldStatus: StoryStatus;
  newStatus: StoryStatus;
  assignedAgent: string | null;
  epicName: string | null;
  status: 'pending' | 'delivered' | 'failed' | 'retrying';
  error?: string;
  createdAt: Timestamp;
  attemptedAt?: Timestamp;
  attempts: number;
}

// UI state types
export interface ToastItem {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  createdAt: number;
}

// Constants
export const STORY_STATUSES: StoryStatus[] = [
  'ideas',
  'backlog',
  'in-design',
  'in-progress',
  'in-review',
  'done',
  'blocked',
  'cancelled'
];

export const PRIORITIES: Priority[] = ['P0', 'P1', 'P2', 'P3'];

export const COMPLEXITIES: Complexity[] = ['S', 'M', 'L', 'XL'];
