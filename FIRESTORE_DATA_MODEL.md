# Firestore Data Model

This document describes the Firestore data structure for AgentBoard.

## Collections Overview

```
Firestore Root
│
├── projects/{projectId}           # Project documents
├── stories/{storyId}              # Story documents (top-level, not nested)
│   └── activity/{activityId}      # Subcollection: status change history
├── agents/{agentId}               # Agent configuration (6 documents)
├── counters/{counterId}           # Auto-increment counters for short IDs
└── config/allowedUsers            # Single document: authorized user UIDs
```

## Document Schemas

### `projects/{projectId}`

```typescript
interface Project {
  id: string;              // Firestore document ID (auto-generated)
  name: string;            // "AgentBoard", "MendixConnect", etc.
  description: string;     // Brief project description
  shortCode: string;       // "KB", "MC" -- used in story short IDs
  isArchived: boolean;     // Soft delete / hide from selector
  createdAt: Timestamp;    // Firestore server timestamp
  updatedAt: Timestamp;    // Updated on any story change in this project
}
```

### `stories/{storyId}`

```typescript
interface Story {
  id: string;              // Firestore document ID (auto-generated)
  shortId: string;         // Human-readable: "KB-14"
  projectId: string;       // Foreign key to projects collection
  epicName: string;        // "Core Board Infrastructure"
  title: string;           // "Implement password reset flow"
  description: string;     // Full story description text
  userStory: string;       // "As a... I want... So that..."
  acceptanceCriteria: AcceptanceCriterion[];
  status: StoryStatus;     // Enum value
  previousStatus: StoryStatus | null;  // For "return from blocked"
  blockedReason: string | null;
  priority: Priority;      // "P0" | "P1" | "P2" | "P3"
  complexity: Complexity;  // "S" | "M" | "L" | "XL"
  assignedAgent: string | null;  // Agent ID, nullable for unassigned
  notes: StoryNote[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

type StoryStatus = "backlog" | "in-design" | "in-progress" | "in-review" | "done" | "blocked";
type Priority = "P0" | "P1" | "P2" | "P3";
type Complexity = "S" | "M" | "L" | "XL";
```

### `stories/{storyId}/activity/{activityId}`

```typescript
interface Activity {
  id: string;
  fromStatus: StoryStatus | null;  // null for story creation
  toStatus: StoryStatus;
  agent: string;            // Agent name that triggered the change
  note: string | null;      // Optional context note
  timestamp: Timestamp;
}
```

### `agents/{agentId}`

```typescript
interface Agent {
  id: string;               // "product-manager", "lead-engineer", etc.
  name: string;             // Same as id (for query simplicity)
  displayName: string;      // "Product Manager", "Lead Engineer"
  abbreviation: string;     // "PM", "SA", "LE", "SR", "UI", "MCE"
  color: string;            // Tailwind color name: "yellow", "orange", etc.
  colorHex: string;         // "#FACC15" for programmatic use
  role: string;             // "Defines product requirements and writes user stories"
  model: string;            // "opus" or "sonnet"
}
```

The six agent documents:

| Document ID              | Display Name              | Abbr | Color  | Hex     | Model  |
|--------------------------|---------------------------|------|--------|---------|--------|
| product-manager          | Product Manager           | PM   | yellow | #FACC15 | opus   |
| solution-architect       | Solution Architect        | SA   | orange | #FB923C | opus   |
| lead-engineer            | Lead Engineer             | LE   | cyan   | #22D3EE | sonnet |
| security-reviewer        | Security Reviewer         | SR   | red    | #F87171 | sonnet |
| ui-consistency-reviewer  | UI Consistency Reviewer   | UI   | blue   | #60A5FA | sonnet |
| mendix-code-explainer    | Mendix Code Explainer     | MCE  | green  | #4ADE80 | sonnet |

### `counters/stories`

```typescript
interface StoryCounter {
  // One field per project, keyed by shortCode
  [shortCode: string]: number;  // e.g., { "KB": 14, "MC": 7 }
}
```

This document uses Firestore `FieldValue.increment(1)` for atomic counter increments when the CLI creates a new story.

### `config/allowedUsers`

```typescript
interface AllowedUsersConfig {
  uids: string[];  // Array of allowed Firebase Auth UIDs
}
```

For V1, this contains exactly one UID. Checked in security rules.

## Firestore Indexes

Three composite indexes are required:

1. **stories by projectId + updatedAt** - Primary board query
2. **stories by projectId + status + updatedAt** - Optional optimization
3. **activity by timestamp** - Status history timeline

These are defined in `firestore.indexes.json`.

## Query Patterns

| Query | Used By | Firestore Call |
|-------|---------|----------------|
| All stories for a project | Board (onSnapshot) | `where("projectId", "==", id).orderBy("updatedAt", "desc")` |
| All projects | Project selector (onSnapshot) | `where("isArchived", "==", false).orderBy("updatedAt", "desc")` |
| All agents | Filter bar (get once) | `collection("agents")` |
| Activity for one story | Card detail sheet (get) | `stories/{id}/activity` ordered by `timestamp desc` |

## Security Model

The Firestore security rules enforce:

- **Reads**: Only authenticated users whose UID is in `config/allowedUsers.uids`
- **Writes from PWA**: Blocked (read-only board)
- **Writes from CLI**: Bypass rules via Admin SDK

This keeps the security model simple: one allowed user can read everything, nobody can write from the client.
