// TypeScript types for Firestore documents and application state

import { Timestamp } from 'firebase/firestore';

// Enums
export type StoryStatus = 'backlog' | 'in-design' | 'in-progress' | 'in-review' | 'done' | 'blocked';
export type Priority = 'P0' | 'P1' | 'P2' | 'P3';
export type Complexity = 'S' | 'M' | 'L' | 'XL';
export type AgentId =
  | 'product-manager'
  | 'solution-architect'
  | 'lead-engineer'
  | 'security-reviewer'
  | 'ui-consistency-reviewer'
  | 'mendix-code-explainer';

// Firestore document interfaces
export interface Project {
  id: string;
  name: string;
  description: string;
  shortCode: string;
  isArchived: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AcceptanceCriterion {
  text: string;
  completed: boolean;
}

export interface StoryNote {
  text: string;
  author: string;
  createdAt: Timestamp;
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

// UI state types
export interface ToastItem {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  createdAt: number;
}

// Constants
export const STORY_STATUSES: StoryStatus[] = [
  'backlog',
  'in-design',
  'in-progress',
  'in-review',
  'done',
  'blocked'
];

export const PRIORITIES: Priority[] = ['P0', 'P1', 'P2', 'P3'];

export const COMPLEXITIES: Complexity[] = ['S', 'M', 'L', 'XL'];
