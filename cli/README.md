# JeffBoard CLI

Command-line tool for AI agents to update the JeffBoard Kanban board.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Firebase Service Account

The CLI tool uses the Firebase Admin SDK to write data to Firestore. You need a service account key:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings > Service Accounts
4. Click "Generate New Private Key"
5. Save the JSON file to a secure location (DO NOT commit to git)

### 3. Configure Service Account Path

Set the `JEFFBOARD_SERVICE_ACCOUNT` environment variable:

```bash
export JEFFBOARD_SERVICE_ACCOUNT=/path/to/your-service-account.json
```

Or create a `.env` file in the `cli` directory:

```
JEFFBOARD_SERVICE_ACCOUNT=/path/to/your-service-account.json
```

Alternatively, pass the path with the `--service-account` flag on each command.

### 4. Build the CLI

```bash
npm run build
```

### 5. Seed Initial Data

```bash
npm start seed -- --uid <your-firebase-auth-uid>
```

To get your Firebase Auth UID:
1. Sign in to the JeffBoard PWA once
2. Open browser console
3. Run: `firebase.auth().currentUser.uid`
4. Copy the UID and use it in the seed command above

## Usage

### Update Story Status

```bash
npm start update -- --story KB-14 --status in-progress --agent lead-engineer
```

With a note:

```bash
npm start update -- --story KB-14 --status in-progress --agent lead-engineer --note "Started implementation"
```

Block a story:

```bash
npm start update -- --story KB-14 --status blocked --agent lead-engineer --reason "Waiting for API key"
```

### Create a New Story

```bash
npm start create -- \
  --project proj_abc123 \
  --title "Implement password reset flow" \
  --priority P1 \
  --complexity M \
  --agent lead-engineer
```

With full details:

```bash
npm start create -- \
  --project proj_abc123 \
  --title "Implement password reset flow" \
  --description "Add password reset functionality to auth module" \
  --user-story "As a user, I want to reset my password so that I can regain access to my account" \
  --epic "Authentication" \
  --priority P1 \
  --complexity M \
  --agent lead-engineer
```

### Add a Note to a Story

```bash
npm start note -- --story KB-14 --text "Refactored auth module for better testability" --author lead-engineer
```

### Send a Heartbeat

Send a heartbeat to signal active work on a story (debounced to 30 seconds):

```bash
npm start heartbeat -- --story KB-14 --agent lead-engineer --message "Running tests"
```

### List Stories

List all stories:

```bash
npm start list
```

Filter by project:

```bash
npm start list -- --project proj_abc123
```

Filter by status:

```bash
npm start list -- --status in-progress
```

Combine filters:

```bash
npm start list -- --project proj_abc123 --status in-progress
```

### Seed Sample Data

Seed agents only:

```bash
npm start seed -- --agents-only
```

Seed agents, sample project, and stories:

```bash
npm start seed -- --uid <your-firebase-auth-uid>
```

## Command Reference

### `jeffboard init`

Initialize JeffBoard for a repository.

**Required:**
- `-n, --name <projectName>` - Project name (e.g., "JeffBoard")
- `-s, --short-code <shortCode>` - Project short code (e.g., "JB")

**Optional:**
- `-w, --webhook-url <url>` - Webhook URL for status change notifications

**Example:**
```bash
jeffboard init --name "JeffBoard" --short-code JB --webhook-url https://scheduler.example.com/webhook
```

Creates `.claude/jeffboard.json` config file and initializes the project in Firestore.

### `jeffboard config`

Update project configuration settings.

**Optional:**
- `-p, --project <projectId>` - Project ID (auto-detected from .claude/jeffboard.json)
- `-w, --webhook-url <url>` - Set webhook URL for status change notifications
- `--clear-webhook-url` - Clear the webhook URL
- `-b, --burst-mode <on|off>` - Enable or disable burst mode (parallel story execution)
- `--max-parallel <n>` - Set maximum parallel stories (default: 3)

**Example:**
```bash
jeffboard config --webhook-url https://scheduler.example.com/webhook
jeffboard config --clear-webhook-url
jeffboard config --burst-mode on
jeffboard config --burst-mode off
jeffboard config --max-parallel 5
```

**Burst Mode:**
- When enabled (`on`), allows multiple stories to be in `in-progress` simultaneously (parallel execution)
- When disabled (`off`, default), scheduler enforces single-story-at-a-time constraint
- Toggling off while stories are in progress: existing work continues, but no new parallel assignments

**Max Parallel Stories:**
- Limits how many stories can be assigned simultaneously when burst mode is enabled
- Default: 3
- Only applies when burst mode is `on`

### `jeffboard update`

Update a story's status.

**Required:**
- `-s, --story <storyId>` - Story ID or short ID (e.g., KB-14)
- `--status <status>` - New status: backlog, in-design, in-progress, in-review, done, blocked
- `-a, --agent <agent>` - Agent making the change

**Optional:**
- `-r, --reason <reason>` - Blocked reason (required if status is blocked)
- `-n, --note <note>` - Optional note about the change

### `jeffboard create`

Create a new story.

**Required:**
- `-p, --project <projectId>` - Project ID
- `-t, --title <title>` - Story title
- `--priority <priority>` - Priority: P0, P1, P2, P3

**Optional:**
- `-d, --description <description>` - Story description
- `-u, --user-story <userStory>` - User story statement
- `-e, --epic <epicName>` - Epic name
- `-c, --complexity <complexity>` - Complexity: S, M, L, XL (default: M)
- `-a, --agent <agent>` - Assigned agent

### `jeffboard note`

Add a note to a story.

**Required:**
- `-s, --story <storyId>` - Story ID or short ID
- `-t, --text <text>` - Note text

**Optional:**
- `-a, --author <author>` - Note author (default: "user")

### `jeffboard list`

List stories.

**Optional:**
- `-p, --project <projectId>` - Filter by project ID
- `-s, --status <status>` - Filter by status

### `jeffboard seed`

Seed Firestore with sample data.

**Optional:**
- `--uid <uid>` - Firebase Auth UID to add to allowedUsers
- `--agents-only` - Only seed agents collection

### `jeffboard context read`

Read project context (shared knowledge across agents).

**Optional:**
- `-p, --project <projectId>` - Project ID (auto-detected from .claude/jeffboard.json if not provided)
- `-s, --section <section>` - Section name to read (reads all sections if omitted)

**Valid sections:**
- `tech-stack` - Technologies and versions
- `architecture-decisions` - Design choices and rationale
- `file-organization` - Directory structure patterns
- `data-model` - Database schema and relationships
- `known-gotchas` - Common issues and footguns
- `active-conventions` - Team patterns and standards
- `recent-changes` - Recent significant changes
- `agent-notes` - Per-agent specialized knowledge

**Example:**
```bash
jeffboard context read
jeffboard context read --section tech-stack
```

### `jeffboard context write`

Append an entry to a project context section.

**Required:**
- `-s, --section <section>` - Section name (see valid sections above)
- `-t, --text <text>` - Text content to append
- `-a, --agent <agent>` - Agent name making the entry

**Optional:**
- `-p, --project <projectId>` - Project ID (auto-detected from .claude/jeffboard.json if not provided)

**Example:**
```bash
jeffboard context write \
  --section known-gotchas \
  --text "Tailwind v4 does not support @apply directive" \
  --agent lead-engineer
```

**Auto-truncation:** Sections have line limits. When exceeded, oldest entries are automatically removed.

### `jeffboard context inject`

Format project context for injection into agent startup prompts. Outputs markdown-formatted context to stdout, with logging to stderr.

**Optional:**
- `-p, --project <projectId>` - Project ID (auto-detected from .claude/jeffboard.json if not provided)
- `-a, --agent <agent>` - Agent name (filters agent-notes to only this agent's notes)
- `-b, --budget <tokens>` - Token budget for output (default: 2000, estimated as ~4 chars per token)

**Behavior:**
- Includes relevant sections: `architecture-decisions`, `known-gotchas`, `active-conventions`, `data-model`
- If `--agent` is specified, also includes that agent's notes from the `agent-notes` section
- Enforces token budget by truncating sections if total output would exceed limit
- Logs section sizes and truncation status to stderr

**Example:**
```bash
# Inject context for lead-engineer with default 2000 token budget
jeffboard context inject --agent lead-engineer > prompt-context.md

# Inject with custom budget
jeffboard context inject --agent qa-engineer --budget 1000 > prompt-context.md

# Capture just the formatted output (redirect stderr to /dev/null)
jeffboard context inject --agent lead-engineer 2>/dev/null
```

**Output format:**
```markdown
# Project Context

## Architecture Decisions

- [2026-02-09] (lead-engineer): Use ESNext modules...

## Known Gotchas

- [2026-02-09] (test-agent): Entry 1...
[truncated]

## Agent Notes

- [2026-02-09] (lead-engineer): Always use absolute paths...
```

**Stderr logging:**
```
[inject] Included 3 sections, 2000 chars (~500 tokens):
  - architecture-decisions: 189 chars
  - known-gotchas: 1792 chars [TRUNCATED]
  - agent-notes: 120 chars
```

### `jeffboard context capture`

Auto-capture key decisions, gotchas, or changes from an agent session to the appropriate context sections. Automatically categorizes the summary into sections based on keywords and avoids writing duplicate entries.

**Required:**
- `-s, --story <shortId>` - Story short ID (e.g., JB-14)
- `-a, --agent <agent>` - Agent name making the entry
- `--summary <text>` - Summary of key decisions, gotchas, or changes

**Optional:**
- `-p, --project <projectId>` - Project ID (auto-detected from .claude/jeffboard.json if not provided)

**Behavior:**
- Keywords in the summary determine which sections to write to:
  - "decided", "chose", "architecture", "design pattern", "approach" → `architecture-decisions`
  - "gotcha", "bug", "watch out", "careful", "pitfall", "beware", "caveat", "warning" → `known-gotchas`
  - "changed", "added", "removed", "updated", "refactored", "migrated" → `recent-changes`
  - No keyword match → fallback to `agent-notes`
- Multiple sections can be matched for a single summary
- Duplicate detection prevents redundant entries (checks text similarity)
- Entry is automatically attributed with story shortId, agent name, and timestamp
- Auto-truncation respects the 500-line context limit

**Example:**
```bash
# Capture an architecture decision
jeffboard context capture \
  --story JB-14 \
  --agent lead-engineer \
  --summary "Decided to use Firebase Admin SDK for CLI to bypass security rules"

# Capture a gotcha
jeffboard context capture \
  --story JB-22 \
  --agent lead-engineer \
  --summary "Watch out: Tailwind v4 does not support @apply directive"

# Capture a change
jeffboard context capture \
  --story JB-8 \
  --agent lead-engineer \
  --summary "Added context capture command to CLI for auto-capturing decisions"
```

**Output:**
```
✓ Captured 1 context entry for JB-14
```

**Use case:** Agents should call this at the end of a work session to record important learnings, decisions, or gotchas discovered while working on a story. This builds up institutional knowledge across sessions.

### `jeffboard heartbeat`

Update story heartbeat timestamp to signal that an agent is actively working on a story. Used for stuck detection.

**Required:**
- `-s, --story <storyId>` - Story ID or short ID (e.g., JB-14)
- `-a, --agent <agent>` - Agent sending the heartbeat

**Optional:**
- `-m, --message <message>` - Optional heartbeat message (e.g., "Processing API integration")

**Debouncing:**
- If called within 30 seconds of the last heartbeat for the same story, the write is skipped to avoid excessive Firestore writes
- Debounce state is tracked in a local temp file (`/tmp/jeffboard-heartbeats/state.json`)

**Example:**
```bash
jeffboard heartbeat \
  --story JB-14 \
  --agent lead-engineer \
  --message "Running integration tests"
```

**Use case:** Agents working on long-running tasks should send periodic heartbeats (every 1-2 minutes) so the scheduler can detect if they get stuck. The debounce mechanism ensures frequent calls won't create performance issues.

### `jeffboard usage`

Report token usage for a story. Accumulates tokens across multiple sessions.

**Required:**
- `-s, --story <storyId>` - Story ID or short ID (e.g., JB-14)
- `-i, --input-tokens <number>` - Number of input tokens used in this session
- `-o, --output-tokens <number>` - Number of output tokens used in this session
- `-c, --cost <usd>` - Estimated cost in USD for this session

**Example:**
```bash
jeffboard usage \
  --story JB-14 \
  --input-tokens 15000 \
  --output-tokens 8500 \
  --cost 0.0425
```

**Behavior:**
- All numeric values must be positive numbers
- Tokens and costs are accumulated (summed) across multiple reports, not replaced
- `totalTokens` is automatically calculated as `inputTokens + outputTokens`
- `sessions` counter is incremented by 1 on each report
- Returns confirmation with both session values and running totals

**Output example:**
```
✓ Updated token usage for JB-14

Session:
  Input tokens:  15,000
  Output tokens: 8,500
  Total tokens:  23,500
  Cost:          $0.0425

Running totals:
  Input tokens:  42,000
  Output tokens: 28,500
  Total tokens:  70,500
  Cost:          $0.1275
  Sessions:      3
```

**Use case:** AI agents should report token usage after completing work on a story to track the cost and token consumption of AI-assisted development. This data can be used for cost analysis and optimization.

### `jeffboard route`

Recommend the best agent for a story based on its tags. Uses the scoring model defined in `docs/agent-routing-taxonomy.md`.

**Options (choose one):**
- `-s, --story <shortId>` - Story short ID (e.g., JB-23) - reads tags from the story
- `-t, --tags <tags>` - Comma-separated tags (e.g., "frontend,api") - provide tags directly

**Example:**
```bash
# Route based on story tags
jeffboard route --story JB-23

# Route based on direct tags
jeffboard route --tags "frontend,api"
```

**Output:**
- Recommended agent with score breakdown
- Full ranking of all agents
- Warnings for unknown tags (not in taxonomy)
- Tie-break explanation if multiple agents have the same score

**Scoring Model:**
- Primary tag match: 3 points
- Secondary tag match: 1 point
- Fallback bonus: 0.5 points (lead-engineer only, when score is 0)
- Ties broken by priority order: lead-engineer > solution-architect > security-reviewer > designer > quality-inspector > product-manager

**Example output:**
```
Story: JB-23 — Implement automatic agent routing logic
Tags: frontend, api

════════════════════════════════════════════════════════════
RECOMMENDED AGENT: lead-engineer
Score: 6.0
════════════════════════════════════════════════════════════
  Tag matches:
    frontend: 3 (PRIMARY)
    api: 3 (PRIMARY)

Agent Rankings:
────────────────────────────────────────────────────────────
→ 1. lead-engineer             Score: 6.0
     Tag matches:
       frontend: 3 (PRIMARY)
       api: 3 (PRIMARY)

  2. designer                  Score: 3.0
     Tag matches:
       frontend: 3 (PRIMARY)

  3. solution-architect        Score: 1.0
     Tag matches:
       api: 1 (SECONDARY)
```

**Use case:** Product managers and the scheduler can use this command to determine which agent should be assigned to a story based on its tags. The routing logic follows the capability matrix in the taxonomy document.

### `jeffboard reserve`

Manage file reservations for stories to prevent parallel execution conflicts. Supports wildcards for pattern matching (e.g., `src/components/*`).

**Required:**
- `-s, --story <shortId>` - Story ID (e.g., JB-14)

**Modes (choose one):**

#### Set Reservations
Reserve specific files for a story:

```bash
jeffboard reserve -s JB-14 --files src/App.tsx,src/components/Board.tsx
```

Supports wildcards:
```bash
jeffboard reserve -s JB-14 --files src/components/*,cli/src/commands/*
```

**Behavior:**
- Updates the story's `reservedFiles` array
- Auto-checks for conflicts with other in-progress/in-design stories
- Warns if high-conflict shared files are reserved (package.json, tsconfig.json, etc.)

#### Check for Conflicts
Check if a story's reserved files conflict with other active stories:

```bash
jeffboard reserve -s JB-14 --check
```

**Behavior:**
- Lists all files reserved by this story
- Checks for overlaps with other in-progress/in-design stories
- Exits with code 1 if conflicts are found
- Marks high-conflict files with `[HIGH-CONFLICT]` tag

#### Request a File
Request a file that's currently reserved by another story:

```bash
jeffboard reserve -s JB-20 --request --file src/App.tsx
```

**Behavior:**
- Finds which story currently holds the requested file
- If file is available, confirms and exits
- If file is reserved:
  - Adds note to requesting story explaining the block
  - Adds note to holding story about the conflict
  - Moves requesting story to `blocked` status with blockedReason
  - Provides command to release the file when holder completes

#### Release Reservations
Release all file reservations for a completed story and unblock waiting stories:

```bash
jeffboard reserve -s JB-18 --release
```

**Behavior:**
- Clears the story's `reservedFiles` array
- Finds all blocked stories waiting for files from this story
- Restores blocked stories to their previous status (usually `in-progress`)
- Adds activity notes documenting the unblock

#### Clear Reservations
Clear all file reservations for a story without unblocking others:

```bash
jeffboard reserve -s JB-14 --clear
```

**Behavior:**
- Removes the story's `reservedFiles` array
- Does NOT unblock waiting stories (use `--release` for that)

**Example Workflow:**

```bash
# 1. Agent starts JB-18, reserves files
jeffboard reserve -s JB-18 --files src/App.tsx,src/components/*

# 2. Agent starts JB-20, needs src/App.tsx
jeffboard reserve -s JB-20 --request --file src/App.tsx
# → JB-20 moves to blocked, notes added to both stories

# 3. JB-18 completes work
jeffboard update -s JB-18 --status in-review --agent lead-engineer
jeffboard reserve -s JB-18 --release
# → JB-20 automatically unblocked and restored to in-progress
```

**High-Conflict Files:**

These shared files are flagged with warnings when reserved:
- `package.json`, `package-lock.json`
- `tsconfig.json`, `vite.config.ts`
- `firebase.json`, `firestore.rules`, `firestore.indexes.json`
- `src/App.tsx`, `src/routes.tsx`, `src/types/index.ts`
- `cli/src/index.ts`, `functions/src/index.ts`

### `jeffboard schedule`

Analyze backlog and determine which stories can be assigned in parallel based on burst mode settings and file reservation conflicts.

**Required:**
- `--check` - Analyze backlog and return assignable stories

**Optional:**
- `-p, --project <projectId>` - Project ID (auto-detected from .claude/jeffboard.json)
- `--max-parallel <n>` - Override default max parallel stories (default: 3)

**Example:**
```bash
jeffboard schedule --check
jeffboard schedule --check --max-parallel 5
```

**Behavior:**

When burst mode is **OFF** (serial mode):
- Returns only the highest priority unblocked story from backlog
- Enforces single-story-at-a-time execution

When burst mode is **ON** (parallel mode):
- Gets all in-progress and in-design stories and their file reservations
- Analyzes backlog stories in priority order (P0 → P1 → P2 → P3)
- For each candidate:
  - Checks if `reservedFiles` overlap with any active story
  - Checks if `reservedFiles` overlap with other stories already assigned in this batch
  - If no conflicts: marks as ASSIGNABLE
  - If conflicts detected: marks as QUEUED with conflict details
- Returns up to `maxParallel` non-overlapping stories (default: 3)
- Logs reasoning for each decision (why included or excluded)

**Overlap Detection:**
- Uses glob pattern matching (same logic as `reserve --check`)
- Stories with no `reservedFiles` are always assignable
- File path normalization handles Windows/Unix path differences

**Output Example:**

Serial mode:
```
Project: JeffBoard
Burst Mode: Disabled
Max Parallel Stories: 3

Stories in progress: 1
Stories in design: 0
Stories in backlog: 5

Serial mode (burst mode disabled):

Next story to assign:
  JB-20  P0  Add file reservation system
```

Parallel mode:
```
Project: JeffBoard
Burst Mode: Enabled
Max Parallel Stories: 3

Stories in progress: 2
Stories in design: 1
Stories in backlog: 5

Parallel mode (burst mode enabled):

Active stories with file reservations: 2

JB-20 (P0): No file reservations - ASSIGNABLE
JB-21 (P1): File conflicts detected - QUEUED
  - JB-18 (src/App.tsx, src/components/Board.tsx)
JB-22 (P1): No conflicts - ASSIGNABLE
JB-23 (P2): No conflicts - ASSIGNABLE

Reached max parallel limit (3)

=== SCHEDULING SUMMARY ===

3 story(ies) ready to assign:

  JB-20  P0  Add file reservation system (no reservations)
  JB-22  P1  Update token dashboard (3 files)
  JB-23  P2  Add note acknowledgment (2 files)

1 story(ies) queued due to conflicts:

  JB-21  P1  Refactor board layout
    Conflicts with: JB-18 (src/App.tsx)
```

**Use Case:**

This command is intended for the **Product Manager agent** to call during scheduling cycles. It provides deterministic scheduling logic that:
1. Respects the project's burst mode configuration
2. Prevents parallel work on conflicting files
3. Enforces max parallel story limits
4. Prioritizes work by priority level (P0 first)

The PM agent can then assign the returned stories and add notes explaining why others were queued.

## Global Options

- `--service-account <path>` - Path to Firebase service account JSON file

## Integration with AI Agents

AI agents should call the CLI tool during their workflow to update the board:

### Example: Lead Engineer Workflow

```bash
# Agent picks up a story from backlog
jeffboard update --story KB-14 --status in-progress --agent lead-engineer

# Agent adds a note
jeffboard note --story KB-14 --text "Implementing authentication module" --author lead-engineer

# Agent completes work and moves to review
jeffboard update --story KB-14 --status in-review --agent lead-engineer --note "Implementation complete"
```

### Example: Product Manager Workflow

```bash
# PM creates a new story
jeffboard create \
  --project proj_abc123 \
  --title "Add user profile page" \
  --priority P1 \
  --complexity M \
  --epic "User Management" \
  --agent product-manager

# PM moves story to design phase
jeffboard update --story KB-15 --status in-design --agent product-manager
```

## Migration Scripts

### Check for Duplicate Story IDs

Run this one-time script to detect any duplicate story shortIds in the database:

```bash
npx tsx scripts/check-duplicates.ts --service-account /path/to/service-account.json
```

**What it does:**
- Scans all stories in Firestore
- Groups stories by shortId
- Reports any duplicates with full details (creation date, status, title)
- Exits with code 0 if no duplicates found, code 1 if duplicates detected

**When to run:**
- After upgrading to the duplicate-prevention fix
- If you suspect duplicate IDs exist
- As a periodic data integrity check

**Output example:**
```
⚠️  Found 1 duplicate shortId(s):

═══════════════════════════════════════════════════════════════════════════════

ShortId: JB-25 (2 stories)
────────────────────────────────────────────────────────────────────────────────
  1. ID: abc123
     Title: Prevent duplicate story ID generation
     Status: in-progress
     Project: proj_jeffboard
     Created: 2026-02-09T20:15:00.000Z

  2. ID: def456
     Title: Some other story
     Status: backlog
     Project: proj_jeffboard
     Created: 2026-02-09T20:16:00.000Z
```

## Troubleshooting

### "Failed to initialize Firebase"

Make sure:
1. Service account JSON file exists at the specified path
2. The file is valid JSON
3. The service account has Firestore permissions

### "Story not found"

The story ID or short ID doesn't exist. Use `jeffboard list` to see available stories.

### "Invalid status"

Valid statuses are: backlog, in-design, in-progress, in-review, done, blocked

### "Project not found"

The project ID doesn't exist. Use the Firebase Console or seed command to create a project first.

### "Duplicate shortId detected"

This error occurs during story creation if a race condition is detected. The CLI automatically retries up to 3 times with exponential backoff. If you see this error persisting:
1. Run the duplicate detection script: `npx tsx scripts/check-duplicates.ts --service-account <path>`
2. Manually resolve any existing duplicates
3. Try creating the story again
