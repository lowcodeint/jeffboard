# Firestore Data Model

This document describes the Firestore data structure for JeffBoard.

## Collections Overview

```
Firestore Root
│
├── projects/{projectId}           # Project documents
│   └── context/{sectionName}      # Subcollection: project context sections
├── stories/{storyId}              # Story documents (top-level, not nested)
│   └── activity/{activityId}      # Subcollection: status change history
├── meetings/{meetingId}           # Meeting records (retros, planning, ad-hoc)
├── agents/{agentId}               # Agent configuration (6 documents)
├── counters/{counterId}           # Auto-increment counters for short IDs
├── webhookEvents/{eventId}        # Webhook events (Cloud Functions)
└── config/allowedUsers            # Single document: authorized user UIDs
```

## Document Schemas

### `projects/{projectId}`

```typescript
interface Project {
  id: string;              // Firestore document ID (auto-generated)
  name: string;            // "JeffBoard", "MendixConnect", etc.
  description: string;     // Brief project description
  shortCode: string;       // "KB", "MC" -- used in story short IDs
  isArchived: boolean;     // Soft delete / hide from selector
  webhookUrl?: string;     // Optional webhook URL for status change notifications
  webhookSecret?: string;  // Optional HMAC secret for webhook signature verification
  burstMode?: boolean;     // Optional burst mode flag for parallel story execution (default: false)
  maxParallelStories?: number;  // Optional max parallel stories when burst mode enabled (default: 3)
  createdAt: Timestamp;    // Firestore server timestamp
  updatedAt: Timestamp;    // Updated on any story change in this project
}
```

**Webhook Configuration:**
- `webhookUrl` is used by Cloud Functions to send status change notifications
- Set via CLI: `jeffboard init --webhook-url <url>` or `jeffboard config --webhook-url <url>`
- Clear via CLI: `jeffboard config --clear-webhook-url`
- When a story's status changes, Cloud Functions will POST to this URL if configured

**Burst Mode Configuration:**
- `burstMode` enables parallel story execution (multiple stories in `in-progress` at once)
- When `false` (default), scheduler enforces single-story-at-a-time constraint
- When `true`, scheduler can assign multiple stories to different agents simultaneously
- Set via CLI: `jeffboard config --burst-mode on` or `jeffboard config --burst-mode off`
- Displayed in web UI header with "BURST" badge when enabled
- Toggling off while stories are in progress: existing work continues, but no new parallel assignments until count returns to one or zero

**Max Parallel Stories:**
- `maxParallelStories` limits how many stories can be assigned simultaneously when burst mode is enabled
- Default: 3
- Only applies when `burstMode` is `true`
- Set via CLI: `jeffboard config --max-parallel <n>`
- Used by `jeffboard schedule --check` to determine how many stories to return from backlog

### `projects/{projectId}/context/{sectionName}`

```typescript
interface ContextSection {
  sectionName: string;     // Section ID: "tech-stack", "known-gotchas", etc.
  entries: ContextEntry[];
  updatedAt: Timestamp;    // Last write timestamp
}

interface ContextEntry {
  text: string;            // Entry content
  agent: string;           // Agent name that wrote this entry
  timestamp: Timestamp;    // Entry creation timestamp
}
```

**Valid section names:**
- `tech-stack` (max 20 lines)
- `architecture-decisions` (max 80 lines)
- `file-organization` (max 30 lines)
- `data-model` (max 40 lines)
- `known-gotchas` (max 30 lines)
- `active-conventions` (max 30 lines)
- `recent-changes` (max 50 lines)
- `agent-notes` (max 40 lines)

**Auto-truncation:** When a section exceeds its line limit, the oldest entries are automatically removed during write operations.

**CLI commands:**
- `jeffboard context read [--section <name>]` - Read all sections or a specific section
- `jeffboard context write --section <name> --text <text> -a <agent>` - Append entry to section

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
  tags: string[];                // Story tags for agent routing (see docs/agent-routing-taxonomy.md)
  notes: StoryNote[];
  tokenUsage?: TokenUsage | null;   // Optional: token/cost tracking
  lastHeartbeat: Timestamp | null;  // Last heartbeat from agent (for stuck detection)
  heartbeatAgent: string | null;    // Agent that sent last heartbeat
  heartbeatMessage: string | null;  // Optional message with heartbeat
  reservedFiles?: string[];         // File paths reserved by this story (supports wildcards)
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface TokenUsage {
  inputTokens: number;      // Total input tokens consumed
  outputTokens: number;     // Total output tokens generated
  totalTokens: number;      // Sum of input + output
  estimatedCostUsd: number; // Estimated cost in USD
  sessions: number;         // Number of agent work sessions
}

type StoryStatus = "backlog" | "in-design" | "in-progress" | "in-review" | "done" | "blocked";
type Priority = "P0" | "P1" | "P2" | "P3";
type Complexity = "S" | "M" | "L" | "XL";
```

**File Reservations:**

The `reservedFiles` field enables conflict detection for parallel story execution (burst mode). Agents or the scheduler can declare which files a story will modify, and the CLI can check for overlaps before allowing concurrent work.

**Features:**
- Wildcard support: `src/components/dashboard/*` reserves all files in that directory
- High-conflict file detection: Shared files like `package.json`, `tsconfig.json`, route configs are flagged
- Overlap checking: Compares against all `in-progress` and `in-design` stories

**CLI commands:**
```bash
# Set file reservations
jeffboard reserve -s JB-18 --files "src/types/index.ts,cli/src/commands/reserve.ts,firestore.rules"

# Check for conflicts
jeffboard reserve -s JB-18 --check

# Clear reservations
jeffboard reserve -s JB-18 --clear
```

**High-conflict shared files** (auto-flagged):
- `package.json`, `package-lock.json`, `tsconfig.json`
- `vite.config.ts`, `firebase.json`, `firestore.rules`, `firestore.indexes.json`
- Entry points: `src/App.tsx`, `src/routes.tsx`, `src/index.tsx`, `src/main.tsx`
- Type definitions: `src/types/index.ts`, `cli/src/index.ts`, `functions/src/index.ts`

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

### `meetings/{meetingId}`

```typescript
// meetings/{meetingId}
interface Meeting {
  id: string;                  // Firestore document ID (auto-generated)
  projectId: string;           // FK to projects collection
  type: MeetingType;           // "retro" | "planning" | "ad-hoc"
  date: Timestamp;             // When the meeting occurred/is scheduled
  sprintNumber: number | null; // Sprint this meeting relates to (null for ad-hoc)
  summary: string;             // Brief meeting summary/notes
  participants: string[];      // Agent names and/or user IDs

  // Structured arrays (embedded, not subcollections)
  agenda: AgendaItem[];          // Discussion topics
  decisions: Decision[];         // Decisions made during meeting
  actionItems: ActionItem[];     // Tasks/follow-ups assigned
  linkedChanges: LinkedChange[]; // Artifacts produced

  createdAt: Timestamp;        // Firestore server timestamp
  updatedAt: Timestamp;        // Updated on any edit
}

type MeetingType = "retro" | "planning" | "ad-hoc";

interface AgendaItem {
  topic: string;             // Discussion topic
  presenter: string | null;  // Who raised it
  notes: string;             // Discussion notes
  resolved: boolean;         // Was it resolved?
}

interface Decision {
  text: string;              // What was decided
  rationale: string;         // Why this decision
  category: DecisionCategory;
}

type DecisionCategory = "process" | "technical" | "product";

interface ActionItem {
  id: string;                      // Unique within doc (UUID)
  text: string;                    // Task description
  owner: string;                   // Agent name or user
  status: ActionStatus;            // "open" | "done"
  dueBy: Timestamp | null;        // Optional deadline
  linkedStoryId: string | null;   // FK to stories (shortId, e.g. "JB-30")
}

type ActionStatus = "open" | "done";

interface LinkedChange {
  type: ChangeType;          // What kind of artifact
  refId: string;             // Story shortId, commit SHA, version, etc.
  description: string;       // Brief description
}

type ChangeType = "story" | "commit" | "deploy" | "config-change";
```

**Design decisions:**
- **Top-level collection** (not a subcollection of projects) for simpler cross-project queries and consistency with the `stories` pattern. Uses `projectId` foreign key for filtering.
- **Single-document pattern** with no subcollections. All arrays are embedded. Typical doc size is ~3-7 KB, well within Firestore's 1 MB limit.
- **ActionItem `id` field** (UUID) enables targeted updates to specific action items within the array.
- **`linkedStoryId`** is an optional soft reference to story shortIds (e.g. "JB-30"). Not a hard FK — stories may not exist yet when an action item is created.
- **V1 write access:** CLI/Admin SDK only. Meetings are created/updated via CLI commands, not the PWA. The web UI reads meetings for display only. This matches the pattern used for story creation.

**Open action items query (Option A — approved):**

Firestore's `array-contains` cannot query on partial object matches inside arrays. For finding open action items (needed by JB-32's pre-meeting prep), V1 uses client-side filtering: fetch recent meetings (last 10-20 by date) and filter `actionItems` where `status === "open"` in application code. This is simple, requires no extra writes, and works well for small-to-medium meeting counts. If performance becomes an issue at scale, migrate to Option B: add a top-level `hasOpenActions: boolean` field maintained on each update, then query `where("hasOpenActions","==",true)` to narrow results before client-side filtering.

#### Example Document

```json
{
  "id": "abc123def456",
  "projectId": "proj_jeffboard_01",
  "type": "retro",
  "date": "2026-02-10T18:00:00Z",
  "sprintNumber": 5,
  "summary": "Sprint 5 retrospective. Discussed burst mode improvements and CLI reliability.",
  "participants": ["product-manager", "lead-engineer", "solution-architect"],

  "agenda": [
    {
      "topic": "Burst mode stability",
      "presenter": "lead-engineer",
      "notes": "File reservation conflicts reduced by 90% after JB-18",
      "resolved": true
    },
    {
      "topic": "Retro tooling epic planning",
      "presenter": "product-manager",
      "notes": "Agreed on meetings collection as foundational schema",
      "resolved": true
    }
  ],

  "decisions": [
    {
      "text": "Use single-document pattern for meetings, no subcollections",
      "rationale": "Keeps reads atomic and consistent with stories pattern",
      "category": "technical"
    },
    {
      "text": "Prioritize retro tooling epic for next sprint",
      "rationale": "Team needs structured meeting history for better process",
      "category": "product"
    }
  ],

  "actionItems": [
    {
      "id": "ai-001",
      "text": "Implement meetings CRUD CLI commands",
      "owner": "lead-engineer",
      "status": "open",
      "dueBy": "2026-02-14T00:00:00Z",
      "linkedStoryId": "JB-30"
    },
    {
      "id": "ai-002",
      "text": "Add meeting list/detail views to web UI",
      "owner": "lead-engineer",
      "status": "open",
      "dueBy": null,
      "linkedStoryId": "JB-31"
    }
  ],

  "linkedChanges": [
    {
      "type": "story",
      "refId": "JB-18",
      "description": "File reservation feature completed"
    },
    {
      "type": "deploy",
      "refId": "v2.3.0",
      "description": "Burst mode v2 deployed to production"
    }
  ],

  "createdAt": "2026-02-10T18:00:00Z",
  "updatedAt": "2026-02-10T19:30:00Z"
}
```

#### Security Rules (Draft)

```
// To be added to firestore.rules during JB-30 implementation
match /meetings/{meetingId} {
  // Read: same as other collections (allowed users only)
  allow read: if isAllowedUser();

  // Write: CLI/Admin SDK only (no client writes for V1)
  // Meetings are created/updated via CLI commands, not the PWA
  allow write: if false;
}
```

### `agents/{agentId}`

```typescript
interface Agent {
  id: string;               // "product-manager", "lead-engineer", etc.
  name: string;             // Same as id (for query simplicity)
  displayName: string;      // "Product Manager", "Lead Engineer"
  abbreviation: string;     // "PM", "SA", "LE", "SR", "DS", "QI"
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
| designer                 | Designer                  | DS   | blue   | #60A5FA | sonnet |
| quality-inspector        | Quality Inspector         | QI   | purple | #C084FC | sonnet |

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

### `webhookEvents/{eventId}`

```typescript
interface WebhookEvent {
  id: string;                    // Firestore document ID (auto-generated)
  eventType: 'status-changed';   // Event type (only status-changed for now)
  storyId: string;               // Foreign key to stories collection
  shortId: string;               // Story short ID (e.g., "JB-1")
  projectId: string;             // Foreign key to projects collection
  oldStatus: StoryStatus;        // Previous status value
  newStatus: StoryStatus;        // New status value
  assignedAgent: string | null;  // Agent assigned to the story
  epicName: string | null;       // Epic name
  status: 'pending' | 'delivered' | 'failed' | 'retrying';  // Webhook delivery status
  error?: string;                // Error message if delivery failed
  createdAt: Timestamp;          // When the event was created
  attemptedAt?: Timestamp;       // When webhook was last attempted
  attempts: number;              // Number of delivery attempts
}
```

**Written by:** Cloud Functions `onStoryStatusChange` trigger when a story's status field changes.

**Purpose:** Queue of webhook events for downstream systems (e.g., scheduler, external integrations).

**Lifecycle:**
1. Cloud Function `onStoryStatusChange` creates event with `status: 'pending'` and `attempts: 0`
2. Cloud Function `dispatchWebhookEvent` processes pending events
3. On success, updates `status: 'delivered'` and sets `attemptedAt`
4. On retryable failure (5xx, timeout), updates `status: 'retrying'`, increments `attempts`, sets `error` and `attemptedAt`
5. After 3 failed attempts, updates `status: 'failed'` with final error message

## Firestore Indexes

Seven composite indexes are required:

1. **stories by projectId + updatedAt** - Primary board query
2. **stories by projectId + status + updatedAt** - Optional optimization
3. **activity by timestamp** - Status history timeline
4. **webhookEvents by projectId + createdAt** - Webhook events panel query
5. **meetings by projectId + date DESC** - Primary meeting list query
6. **meetings by projectId + type + date DESC** - Filter meetings by type within a project
7. **meetings by projectId + sprintNumber** - Find meetings for a specific sprint

Indexes 1-4 are defined in `firestore.indexes.json`. Indexes 5-7 should be added during JB-30 implementation.

## Query Patterns

| Query | Used By | Firestore Call |
|-------|---------|----------------|
| All stories for a project | Board (onSnapshot) | `where("projectId", "==", id).orderBy("updatedAt", "desc")` |
| All projects | Project selector (onSnapshot) | `where("isArchived", "==", false).orderBy("updatedAt", "desc")` |
| All agents | Filter bar (get once) | `collection("agents")` |
| Activity for one story | Card detail sheet (get) | `stories/{id}/activity` ordered by `timestamp desc` |
| Webhook events for a project | Webhook events panel (onSnapshot) | `where("projectId", "==", id).orderBy("createdAt", "desc").limit(50)` |
| List meetings for project | Meeting list page, CLI `meeting list` | `where("projectId", "==", id).orderBy("date", "desc")` |
| Get single meeting | Meeting detail view, CLI `meeting get` | `meetings.doc(meetingId).get()` |
| Meetings by type | Retro history filter | `where("projectId", "==", id).where("type", "==", "retro").orderBy("date", "desc")` |
| Meetings for sprint | Sprint summary view | `where("projectId", "==", id).where("sprintNumber", "==", n)` |
| Open action items | Pre-meeting data pull (JB-32) | Fetch recent meetings by date, then client-side filter `actionItems` where `status === "open"` |

## Security Model

The Firestore security rules enforce:

- **Reads**: Only authenticated users whose UID is in `config/allowedUsers.uids`
- **Writes from PWA**: Limited to specific story fields (notes, noteReactions, status updates) and project `burstMode`/`updatedAt` toggle
- **Writes from CLI**: Bypass rules via Admin SDK
- **Writes from Cloud Functions**: Bypass rules via Admin SDK

The PWA can read all collections (projects, stories, agents, config, webhookEvents, meetings) but can only write to stories (limited fields), projects (`burstMode` and `updatedAt` only), and config/scheduler (`maxConcurrentSessions`). Meetings are read-only from the PWA; all writes go through CLI/Admin SDK. Cloud Functions have full write access via Admin SDK for creating webhook events and activity entries.
