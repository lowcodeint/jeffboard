# JeffBoard Roadmap: Epics & User Stories

## Epic 1: Webhook-Driven Scheduling
**Priority:** P0 | **Goal:** Replace 15-minute cron polling with real-time webhook triggers

### Problem Statement
When a story status changes (e.g., design approved, moved to in-progress), agents don't start for up to 15 minutes because the scheduler polls on a cron interval. This creates unacceptable latency in the feedback loop between human review and agent execution.

### Value Proposition
Agents respond to status changes within seconds instead of minutes, dramatically improving the interactive workflow between humans and AI agents. The user can approve a design and see work begin almost immediately.

### Stories

#### JB-1: Implement Firestore Cloud Function triggers for status changes
**Priority:** P0 | **Complexity:** L | **Agent:** lead-engineer

As a JeffBoard platform operator, I want Firestore Cloud Functions that fire when a story's status field changes, so that downstream systems are notified in real-time.

**Acceptance Criteria:**
- Cloud Function triggers on story document `onUpdate` in the `stories` collection
- Function detects status field changes (compares `before.data().status` vs `after.data().status`)
- Function ignores updates where status did not change (e.g., note additions, field edits)
- Function extracts: storyId, shortId, projectId, oldStatus, newStatus, assignedAgent, epicName
- Function writes a webhook event to a new `webhookEvents` collection with status `pending`
- Cloud Functions deployed via `firebase deploy --only functions`
- Unit tests cover: status change detection, non-status-change filtering, payload structure

#### JB-2: Build webhook dispatcher to notify external scheduler
**Priority:** P0 | **Complexity:** M | **Agent:** lead-engineer

As a JeffBoard platform operator, I want webhook events dispatched to a configurable endpoint when story statuses change, so that the external scheduler can react immediately.

**Acceptance Criteria:**
- Cloud Function (or extension of JB-1) reads from `webhookEvents` collection
- Sends HTTP POST to a webhook URL configured in `projects/{projectId}` document field `webhookUrl`
- Payload includes: shortId, projectId, oldStatus, newStatus, assignedAgent, timestamp
- Includes HMAC signature header for webhook verification (secret stored in Firebase project config)
- Retries up to 3 times with exponential backoff on failure (5xx or timeout)
- Marks webhookEvent as `delivered`, `failed`, or `retrying` with attempt count
- Failed events are queryable for debugging

#### JB-3: Add webhook URL configuration to project settings
**Priority:** P1 | **Complexity:** S | **Agent:** lead-engineer

As a JeffBoard user, I want to configure a webhook URL per project, so that status change notifications are sent to the right scheduler endpoint.

**Acceptance Criteria:**
- `projects` document schema extended with optional `webhookUrl: string` field
- CLI `init` command accepts `--webhook-url` option to set the URL during project setup
- New CLI command `config` or extension of `init` to update webhookUrl on existing projects
- Firestore security rules updated to allow the new field
- Data model documentation updated

#### JB-4: Add webhook event log viewer to the web UI
**Priority:** P2 | **Complexity:** M | **Agent:** lead-engineer

As a JeffBoard user, I want to see a log of webhook events and their delivery status in the web UI, so that I can debug scheduling issues.

**Acceptance Criteria:**
- New section or tab in the UI showing recent webhook events for the selected project
- Each entry shows: story shortId, status change (old -> new), delivery status, timestamp
- Failed events are visually highlighted (red badge or icon)
- List is ordered by timestamp descending, limited to last 50 events
- Real-time updates via Firestore onSnapshot

---

## Epic 2: Agent Memory Across Sessions
**Priority:** P0 | **Goal:** Persist project context so agents don't start from scratch each session

### Problem Statement
Each worker agent session starts fresh with no memory of previous sessions. Agents rediscover architecture decisions, repeat mistakes, and waste tokens re-reading codebases. Claude Code has MEMORY.md but usage is ad-hoc and not structured for multi-agent collaboration.

### Value Proposition
Agents ramp up faster, make fewer repeated mistakes, and produce more consistent output across sessions. Token costs decrease because agents spend less time re-exploring the codebase.

### Stories

#### JB-5: Define structured project context file schema
**Priority:** P0 | **Complexity:** S | **Agent:** solution-architect

As a JeffBoard platform designer, I want a well-defined schema for a project context file that agents read/write, so that knowledge is preserved across sessions in a structured, useful way.

**Acceptance Criteria:**
- Schema defined in markdown covering sections: architecture decisions, tech stack, file organization conventions, known gotchas, agent-specific notes, recent changes summary
- Schema supports per-agent sections (e.g., lead-engineer notes vs security-reviewer notes)
- Maximum file size recommendation to prevent context window bloat (suggest: 500 lines max)
- Schema stored as a template file in the JeffBoard repo
- Document when agents should read vs write to the context file
- Example populated context file included

#### JB-6: Implement CLI commands for reading/writing project context
**Priority:** P0 | **Complexity:** M | **Agent:** lead-engineer

As an AI agent, I want CLI commands to read and append to the project context file, so that I can consume prior knowledge and contribute my own findings.

**Acceptance Criteria:**
- New CLI command `context read` returns the full project context file content
- New CLI command `context write --section <section> --text <text>` appends to a specific section
- Context stored in Firestore under `projects/{projectId}/context` subcollection or as a document field
- Write command appends with timestamp and agent name attribution
- Read command formats output clearly with section headers
- Sections that exceed a configurable line limit are auto-truncated (oldest entries removed)
- Context data is scoped per project

#### JB-7: Auto-inject project context into agent startup
**Priority:** P1 | **Complexity:** M | **Agent:** lead-engineer

As a JeffBoard platform operator, I want agents to automatically receive relevant project context when they start working on a story, so that they don't need to manually fetch it.

**Acceptance Criteria:**
- Scheduler/agent startup script calls `context read` and includes output in the agent's initial prompt or system message
- Only relevant sections injected (e.g., lead-engineer gets architecture + gotchas + their own notes, not security-reviewer notes)
- Context injection is configurable (can be disabled per project or per story)
- Total injected context capped at a token budget (configurable, default ~2000 tokens)
- Agent startup logs which sections were injected

#### JB-8: Auto-capture key decisions from agent sessions to context
**Priority:** P2 | **Complexity:** M | **Agent:** lead-engineer

As a JeffBoard platform operator, I want agents to automatically write important findings back to the project context at session end, so that knowledge accumulates without manual effort.

**Acceptance Criteria:**
- Agent completion script calls `context write` with a summary of key decisions, gotchas discovered, or architecture changes
- Summary is generated from the agent's session (not raw conversation logs)
- Each write is attributed with story shortId, agent name, and timestamp
- Duplicate/redundant entries are avoided (agent checks existing context before writing)
- Project context file remains under the 500-line limit after writes

---

## Epic 3: Cost & Token Tracking with Dashboard
**Priority:** P1 | **Goal:** Understand and visualize the cost of AI-built features

### Problem Statement
The user has no visibility into how many tokens each story consumes or what AI-driven development costs. Without this data, it's impossible to calibrate complexity estimates, budget projects, or identify inefficient agent behavior.

### Value Proposition
Cost transparency enables better planning, budgeting, and optimization. Correlating cost with complexity estimates improves future estimation accuracy.

### Stories

#### JB-9: Extend story data model with token usage fields
**Priority:** P1 | **Complexity:** S | **Agent:** lead-engineer

As a JeffBoard platform developer, I want story documents to store token usage data, so that cost information is persisted and queryable.

**Acceptance Criteria:**
- Story document schema extended with `tokenUsage` object: `{ inputTokens: number, outputTokens: number, totalTokens: number, estimatedCostUsd: number, sessions: number }`
- Field is optional (null/absent for stories without tracking)
- Firestore security rules updated to include new field
- Data model documentation updated
- TypeScript types updated in both CLI and web app

#### JB-10: Implement CLI command to report token usage for a story
**Priority:** P1 | **Complexity:** M | **Agent:** lead-engineer

As an AI agent, I want a CLI command to report my token usage after completing a story, so that usage data is captured automatically.

**Acceptance Criteria:**
- New CLI command `usage` that accepts: `--story <shortId>`, `--input-tokens <n>`, `--output-tokens <n>`, `--cost <usd>`
- Command updates the story's `tokenUsage` field, accumulating across multiple sessions
- `sessions` counter increments on each report
- Command validates inputs are positive numbers
- If called multiple times for same story, tokens are summed (not replaced)
- Returns confirmation with running totals

#### JB-11: Build token usage dashboard in the web UI
**Priority:** P1 | **Complexity:** L | **Agent:** lead-engineer

As a JeffBoard user, I want a dashboard showing token usage per story and per project, so that I can understand AI development costs.

**Acceptance Criteria:**
- New dashboard page or panel accessible from the main navigation
- Project-level summary: total tokens, total cost, average cost per story, cost by complexity tier
- Story-level table: shortId, title, complexity, tokens used, estimated cost, sessions count
- Sortable by any column
- Filter by epic, priority, complexity, date range
- Bar chart or similar visualization showing cost per story
- Responsive design, works on mobile
- Real-time updates via Firestore onSnapshot

#### JB-12: Add cost-per-complexity analysis view
**Priority:** P2 | **Complexity:** M | **Agent:** lead-engineer

As a JeffBoard user, I want to see how actual token costs correlate with complexity estimates (S/M/L/XL), so that I can calibrate future estimates.

**Acceptance Criteria:**
- Dashboard section showing average cost per complexity tier (S, M, L, XL)
- Visualization (box plot or grouped bar chart) comparing expected vs actual effort
- Highlights outliers (stories that cost significantly more or less than their tier average)
- Data table showing individual stories with their complexity and actual cost
- Only includes stories with token usage data (excludes stories with no data)

---

## Epic 4: Heartbeat / Stuck Detection
**Priority:** P1 | **Goal:** Detect and alert when agents are stuck or crashed

### Problem Statement
Agents can silently hang, crash, or get stuck in loops. The user has no way to know until they manually check the board, which wastes time and delays the entire pipeline.

### Value Proposition
Real-time health visibility reduces wasted time from stuck agents. Automatic alerts mean the user can intervene quickly instead of discovering failures hours later.

### Stories

#### JB-13: Implement CLI heartbeat command
**Priority:** P1 | **Complexity:** S | **Agent:** lead-engineer

As an AI agent, I want a CLI command to emit a heartbeat timestamp, so that the system knows I'm still actively working.

**Acceptance Criteria:**
- New CLI command `heartbeat` that accepts `--story <shortId>` and optional `--message <text>`
- Writes `lastHeartbeat` timestamp and optional message to the story document
- Also writes `heartbeatAgent` field identifying which agent sent it
- Command is fast (< 500ms) to minimize disruption to agent work
- Can be called repeatedly without creating excessive Firestore writes (debounce if called within 30 seconds)
- Returns confirmation with timestamp

#### JB-14: Add heartbeat status indicators to the board UI
**Priority:** P1 | **Complexity:** M | **Agent:** lead-engineer

As a JeffBoard user, I want to see health status indicators on story cards, so that I can tell at a glance which agents are active, slow, or stuck.

**Acceptance Criteria:**
- Story cards for stories in `in-progress` or `in-design` status show a health indicator dot
- Green dot: heartbeat received within last 2 minutes
- Yellow dot: no heartbeat for 5+ minutes
- Red dot: no heartbeat for 15+ minutes
- No indicator shown for stories in other statuses (backlog, done, etc.)
- Indicator updates in real-time (computed from Firestore onSnapshot data)
- Tooltip on hover shows last heartbeat time and message

#### JB-15: Implement browser notifications for stuck agents
**Priority:** P1 | **Complexity:** M | **Agent:** lead-engineer

As a JeffBoard user, I want browser notifications when an agent goes red (stuck for 15+ minutes), so that I don't have to constantly watch the board.

**Acceptance Criteria:**
- Browser Notification API permission requested when user first visits the board
- Notification fired when any in-progress story's heartbeat transitions from yellow to red
- Notification includes: story shortId, title, agent name, time since last heartbeat
- Clicking the notification focuses the JeffBoard tab
- Optional audio alert (subtle ping sound) configurable via a toggle in the UI header
- Notifications are not duplicated (once per story per red transition, not repeating)
- Graceful degradation if Notification API is not available or permission denied

#### JB-16: Add stuck detection summary to the board header
**Priority:** P2 | **Complexity:** S | **Agent:** lead-engineer

As a JeffBoard user, I want a summary in the board header showing how many agents are healthy, slow, or stuck, so that I have an at-a-glance health overview.

**Acceptance Criteria:**
- Board header shows a small status summary: "3 active, 1 slow, 0 stuck" or similar
- Counts are computed from stories currently in `in-progress` or `in-design`
- Summary uses color coding matching the dot indicators (green/yellow/red)
- Clicking summary scrolls to or filters the board to show affected stories
- Updates in real-time

---

## Epic 5: Burst Mode -- Parallel Story Execution
**Priority:** P2 | **Goal:** Allow non-overlapping stories to run in parallel within a project

### Problem Statement
Currently only one story runs at a time per project. For projects with multiple independent features (touching different files), this creates unnecessary serialization. The user explicitly rejected git branching in favor of a file reservation model to avoid merge conflicts.

### Value Proposition
Parallel execution can 2-3x throughput for projects with independent workstreams, without the complexity and merge conflict risk of git branches.

### Stories

#### JB-17: Add burst mode toggle to project settings
**Priority:** P2 | **Complexity:** S | **Agent:** lead-engineer

As a JeffBoard user, I want a project-level toggle to enable/disable burst mode, so that I can opt into parallel execution when I'm confident in the setup.

**Acceptance Criteria:**
- Project document extended with `burstMode: boolean` field (default: false)
- CLI command to toggle: `config --burst-mode on|off`
- Web UI shows burst mode status in project selector or header
- When off, scheduler behavior is unchanged (one story at a time)
- When toggled off while stories are running in parallel, existing stories continue but no new parallel stories are started
- Data model documentation updated

#### JB-18: Implement file reservation model for stories
**Priority:** P2 | **Complexity:** L | **Agent:** lead-engineer

As a JeffBoard PM agent, I want stories to declare which files they will create or modify, so that the system can detect overlaps before allowing parallel execution.

**Acceptance Criteria:**
- Story document extended with `reservedFiles: string[]` field (list of file paths relative to project root)
- CLI command to set reservations: `reserve --story <shortId> --files <file1,file2,...>`
- CLI command to check for overlaps: `reserve --check --story <shortId>` returns conflicting stories if any
- Reservations are checked against all stories currently in `in-progress` or `in-design` status
- Wildcard support for directories (e.g., `src/components/dashboard/*`)
- Special handling for shared files: `package.json`, `package-lock.json`, route configs, barrel exports are flagged as high-conflict
- Overlapping reservations block parallel assignment with clear error message listing conflicts

#### JB-19: Update PM scheduling logic for parallel assignment
**Priority:** P2 | **Complexity:** L | **Agent:** lead-engineer

As a JeffBoard PM agent, I want the scheduling logic to assign multiple stories in parallel when burst mode is enabled and files don't overlap, so that throughput increases.

**Acceptance Criteria:**
- PM agent checks `burstMode` flag before considering parallel assignment
- When burst mode is on, PM can assign a new story if its reserved files don't overlap with any in-progress story's reserved files
- PM logs its overlap-check reasoning in a note on the story
- If overlap is detected, story is queued with a note explaining which files conflict and which story holds the reservation
- Maximum parallel stories configurable per project (default: 3)
- PM respects priority order when choosing which stories to parallelize

#### JB-20: Handle mid-task file conflict requests
**Priority:** P2 | **Complexity:** M | **Agent:** lead-engineer

As an AI agent working on a story, I want to request access to a file that another agent has reserved, so that I can handle unexpected file dependencies gracefully.

**Acceptance Criteria:**
- New CLI command `reserve --request --story <shortId> --file <filePath>` to request a reserved file
- Request is recorded as a note on both the requesting story and the reserving story
- Requesting story is moved to `blocked` status with reason "Waiting for file: <filePath> (held by <shortId>)"
- When the holding story completes, blocked stories with matching file requests are automatically unblocked
- PM agent is notified of the conflict to mediate if needed
- If the holding story is cancelled, reservations are released

---

## Epic 6: Agent Specialization Routing
**Priority:** P2 | **Goal:** Route stories to the best-fit agent type based on story content and tags

### Problem Statement
All implementation stories go to the generic lead-engineer agent, even when specialized agents (security-reviewer, designer, etc.) would produce better results. The PM manually assigns agents, which is error-prone and doesn't scale.

### Value Proposition
Automatic routing to specialized agents improves output quality, reduces rework, and leverages the full agent roster without requiring the user to manually triage every story.

### Stories

#### JB-21: Define agent capability tags and story tag taxonomy
**Priority:** P2 | **Complexity:** S | **Agent:** solution-architect

As a JeffBoard platform designer, I want a taxonomy of story tags and agent capability tags, so that stories can be automatically matched to the best-fit agent.

**Acceptance Criteria:**
- Taxonomy document defining story tags: `frontend`, `backend`, `api`, `database`, `security`, `ui-design`, `infrastructure`, `testing`, `documentation`, `devops`
- Agent capability mapping: which tags each agent type handles best
- Scoring model: how to rank agent fit when multiple agents match (primary vs secondary capabilities)
- Tags support multi-select (a story can have multiple tags)
- Document stored in repo and referenced by the routing logic
- Story document schema extended with `tags: string[]` field

#### JB-22: Add tag field to story creation and editing
**Priority:** P2 | **Complexity:** S | **Agent:** lead-engineer

As a JeffBoard user or PM agent, I want to add tags when creating or editing stories, so that the routing system has data to work with.

**Acceptance Criteria:**
- CLI `create` command accepts `--tags <tag1,tag2,...>` option
- CLI `update` command accepts `--tags <tag1,tag2,...>` to modify tags
- Web UI story detail sheet shows tags as colored pills
- Web UI create story sheet includes tag selector (multi-select)
- Tags are validated against the defined taxonomy (warn on unknown tags but allow them)
- Tags displayed on story cards in the board view

#### JB-23: Implement automatic agent routing logic
**Priority:** P2 | **Complexity:** M | **Agent:** lead-engineer

As a JeffBoard PM agent, I want an automatic routing function that recommends the best agent for a story based on its tags, so that I can assign stories more effectively.

**Acceptance Criteria:**
- Routing function takes a story's tags and returns a ranked list of suitable agents
- Uses the capability mapping from JB-21 to score agents
- Falls back to `lead-engineer` if no strong match is found
- PM agent calls this function during story assignment and includes the reasoning in a note
- Routing can be overridden by explicit `--agent` flag in CLI
- Routing logic is tested with representative story/tag combinations

#### JB-24: Add routing recommendations to the web UI
**Priority:** P3 | **Complexity:** S | **Agent:** lead-engineer

As a JeffBoard user, I want to see agent routing recommendations when viewing a story, so that I can understand why a particular agent was assigned.

**Acceptance Criteria:**
- Story detail sheet shows "Recommended agent: <agent>" based on tags
- Shows routing score/reasoning if available (from PM note)
- User can override assignment from the UI (if write access is ever added)
- Recommendation updates when tags change

---

## Epic 7: Retro Tooling
**Priority:** P0 | **Goal:** Give retro/planning meetings structured tooling for data-driven discussions and persistent meeting records

### Problem Statement
The user conducts retro and planning meetings as conversations in the Claude Code CLI, which works well for the discussion itself. But there is no structured way to (a) pull relevant board data before a meeting, (b) mark that a meeting is in progress with an agenda, (c) store meeting outcomes (decisions, action items, summaries) persistently, or (d) retrieve past meeting context in future retros. This means meetings start cold, decisions are lost, and action items go untracked.

### Value Proposition
Retro tooling closes the observe-discuss-decide-act-remember loop. Teams get data-driven discussions (pre-meeting metrics), persistent institutional memory (stored meeting records), and trackable follow-through (action items). The CLI conversation remains the core experience -- tools enhance it without adding ceremony. Success is measured by whether past meeting decisions are surfaced automatically in future meetings and action items reach completion.

### Design Principles
- The CLI conversation IS the retro -- do not try to replace it
- Tools enhance the existing workflow, not add ceremony
- The loop: **observe** (data pull) -> **discuss** (CLI conversation) -> **decide** (meeting summary) -> **act** (CLAUDE.md changes, new stories) -> **remember** (stored in JeffBoard for next time)

### In Scope
- Firestore `meetings` collection for persistent storage
- CLI commands: `meeting create`, `meeting list`, `meeting get`
- Pre-meeting data pull (board metrics, past decisions, unresolved action items)
- ASCII banner system for meeting start/close with dynamic content
- Action item tracking within meeting records

### Out of Scope
- Web UI for meetings (future epic if needed)
- Video/audio integration
- Calendar scheduling
- Real-time multi-user collaborative meeting editing
- Automated meeting facilitation (the user/agent drives the conversation)

### Stories

#### JB-29: Design meetings collection schema
**Priority:** P0 | **Complexity:** S | **Agent:** solution-architect

As a JeffBoard platform designer, I want a well-defined Firestore schema for meeting records, so that meeting data is stored in a structured, queryable way that supports the full retro workflow.

**Acceptance Criteria:**
- Schema defined for a top-level `meetings` collection with document structure covering: date, type (retro/planning/ad-hoc), project ID, sprint/iteration number, summary, participants (agent names)
- `decisions` array within the meeting doc, each with: text, rationale, category (process/technical/product)
- `actionItems` array within the meeting doc, each with: text, owner (agent name or "user"), status (open/done), dueBy (optional), linkedStoryId (optional, for stories created as a result)
- `linkedChanges` array for tracking artifacts produced: CLAUDE.md updates, stories created, config changes
- `agenda` array for pre-planned discussion topics
- Schema stored in `FIRESTORE_DATA_MODEL.md` update
- Example populated meeting document included in the design doc
- Consider how `meeting get` will query past decisions across meetings (e.g., "what did we decide about X")

**Technical Notes:**
- Keep meeting docs as single documents (not subcollections) since meetings are relatively small and infrequently written
- Action items should be queryable by status (open vs done) -- consider whether this needs a separate collection or if array filtering in the client is sufficient
- Design the schema so that pre-meeting data pull can find unresolved action items from past meetings efficiently

**Edge Cases:**
- Meeting with no decisions (pure discussion)
- Meeting with no action items
- Action item that links to a story created during the meeting (story may not exist yet at write time)
- Very long meeting summaries (set a max length recommendation)

**Definition of Done:**
- [ ] Schema documented in FIRESTORE_DATA_MODEL.md
- [ ] Example document included
- [ ] Query patterns for list/get/search documented
- [ ] Firestore index requirements identified

---

#### JB-30: Implement `meeting create` CLI command
**Priority:** P0 | **Complexity:** M | **Agent:** lead-engineer

As a retro facilitator (user or agent), I want a CLI command to create a meeting record in Firestore, so that meeting outcomes are persistently stored and retrievable.

**Acceptance Criteria:**
- New CLI command `meeting create` that accepts: `--type <retro|planning|ad-hoc>`, `--summary <text>`, `--sprint <number>` (optional)
- Command creates a meeting document in the `meetings` collection per the schema from JB-29
- Supports `--decisions <json>` flag to pass an array of decision objects
- Supports `--action-items <json>` flag to pass an array of action item objects
- Supports `--linked-changes <json>` flag to pass an array of linked change references
- Supports `--agenda <json>` flag to pass agenda items
- Meeting is scoped to the current project (reads from `.claude/jeffboard.json`)
- Returns the created meeting ID and a formatted summary of what was stored
- Firestore security rules updated to allow CLI writes to `meetings` collection (admin SDK)
- Firestore indexes created as needed per schema design

**Technical Notes:**
- The facilitator agent will call this at the end of a retro conversation to persist the outcomes
- JSON flags are necessary because decisions and action items are structured objects, not plain strings
- Consider also accepting a `--file <path>` flag that reads the meeting data from a JSON file (easier for agents to produce than long CLI flags)

**Edge Cases:**
- Missing required fields (type is required, summary is required)
- Empty decisions or action items arrays (valid -- not every meeting produces both)
- Very long summary text (truncate with warning at 5000 chars)
- Duplicate meeting creation (idempotency -- same date + type + sprint should warn)

**Dependencies:** JB-29 (schema must be designed first)

**Definition of Done:**
- [ ] CLI command implemented and tested
- [ ] Firestore security rules updated
- [ ] Firestore indexes deployed
- [ ] Command returns formatted confirmation
- [ ] Error handling for missing/invalid fields

---

#### JB-31: Implement `meeting list` and `meeting get` CLI commands
**Priority:** P0 | **Complexity:** M | **Agent:** lead-engineer

As a retro facilitator, I want CLI commands to list past meetings and retrieve full details of a specific meeting, so that past context is accessible during future retros.

**Acceptance Criteria:**
- `meeting list` shows recent meetings for the current project, ordered by date descending
- List output includes: meeting ID, date, type, sprint number, one-line summary (truncated to 80 chars)
- `meeting list` supports `--type <retro|planning|ad-hoc>` filter
- `meeting list` supports `--limit <n>` (default 10)
- `meeting get --id <meetingId>` returns full meeting details: summary, all decisions with rationale, all action items with status, linked changes
- `meeting get` formats output with clear sections and indentation for readability
- `meeting get --id <meetingId> --decisions-only` returns just the decisions array (useful for pre-meeting data pull)
- `meeting get --id <meetingId> --action-items-only` returns just the action items (useful for tracking)
- Support `--open-actions` flag on `meeting list` or as a standalone query to find all unresolved action items across all meetings

**Technical Notes:**
- The `--open-actions` query needs to scan action items across multiple meeting docs. If this is too slow with array-contains queries, consider the schema design from JB-29 (may need a separate subcollection or denormalized field)
- Output formatting should be CLI-friendly (plain text with indentation, not JSON) unless `--json` flag is passed

**Edge Cases:**
- No meetings exist yet (friendly message, not an error)
- Meeting ID not found (clear error message)
- Project with 100+ meetings (pagination or limit enforcement)
- Meetings with no decisions or no action items (still display cleanly)

**Dependencies:** JB-30 (create must exist before list/get are useful)

**Definition of Done:**
- [ ] `meeting list` command implemented
- [ ] `meeting get` command implemented with all filter flags
- [ ] `--open-actions` query implemented
- [ ] Output is well-formatted for CLI consumption
- [ ] Error handling for invalid inputs

---

#### JB-32: Build pre-meeting data pull command
**Priority:** P0 | **Complexity:** L | **Agent:** lead-engineer

As a retro facilitator, I want a CLI command that gathers all relevant data before a meeting starts, so that the discussion is grounded in facts rather than memory.

**Acceptance Criteria:**
- New CLI command `meeting prep` (or `meeting data`) that outputs a structured data package
- **Board metrics section:** stories completed since last retro (count + list with shortIds), stories currently blocked (with reasons), stories in-progress (with assigned agents), average cycle time (time from in-progress to done), stories by priority breakdown
- **Past decisions section:** decisions from the last N retros (default 3) that are still relevant, formatted with date and rationale
- **Unresolved action items section:** all open action items from past meetings, with owner and original meeting date
- **Agent activity section:** which agents worked on which stories since last retro, sessions count per agent (from token usage data if available)
- Output is formatted as a readable briefing document (not raw JSON)
- Supports `--since <date>` to control the lookback window (default: since last retro meeting)
- Supports `--format json` for programmatic consumption

**Technical Notes:**
- This command queries multiple collections: stories (for board metrics), meetings (for past decisions and action items), and possibly activity subcollections (for cycle time calculation)
- Cycle time calculation: diff between the activity entry where status became `in-progress` and where it became `done` (or `in-review`)
- "Since last retro" means finding the most recent meeting with type=retro and using its date as the cutoff
- If no past retros exist, use project creation date or a 30-day lookback

**Edge Cases:**
- First-ever retro (no past meetings to reference -- show board metrics only with a note)
- No stories completed in the period (show "0 stories completed" not an error)
- Stories that were blocked and unblocked multiple times (count total blocked time)
- Agent with no activity (include in agent list with "no activity" note)

**Dependencies:** JB-31 (needs meeting get/list to find past retros), but board metrics portion can be built independently

**Definition of Done:**
- [ ] Command outputs all four data sections
- [ ] Board metrics are accurate (verified against manual count)
- [ ] Past decisions pulled from meeting records
- [ ] Open action items surfaced
- [ ] Formatted output is readable and useful as a meeting briefing
- [ ] Edge case for first retro handled gracefully

---

#### JB-33: Implement meeting banner system
**Priority:** P1 | **Complexity:** M | **Agent:** lead-engineer

As a retro facilitator, I want ASCII banners displayed at the start and end of a meeting, so that there is a clear visual indicator that the conversation has entered "meeting mode" and a summary of outcomes at the close.

**Acceptance Criteria:**
- `meeting banner --type <retro|planning|ad-hoc>` displays a styled ASCII banner in the terminal
- Banner includes: project name (from `.claude/jeffboard.json`), meeting type, current date, sprint number (if provided via `--sprint <n>`)
- Banner includes agenda items if provided via `--agenda <item1,item2,...>`
- Different visual styles for different meeting types (e.g., retro uses a different border/header than planning)
- `meeting banner --close` displays a closing banner
- Closing banner accepts `--decisions <n>` and `--actions <n>` to show counts: "3 decisions made, 2 action items assigned"
- Banners are rendered in plain ASCII (no Unicode box-drawing characters) for maximum terminal compatibility
- Banner width adapts to reasonable terminal widths (80-120 chars)

**Technical Notes:**
- This is purely a display command -- it does not write to Firestore
- The facilitator agent calls this at the start and end of the conversation
- Keep the implementation simple: template strings with padding, not a complex rendering engine
- Consider using ANSI color codes (with a `--no-color` fallback) for visual distinction

**Edge Cases:**
- Very long project name or agenda items (truncate with ellipsis)
- No sprint number provided (omit that line, don't show "Sprint: undefined")
- Terminal that doesn't support ANSI colors (--no-color flag or auto-detect)
- No agenda items provided (show "Open discussion" or omit the section)

**Definition of Done:**
- [ ] Opening banner renders correctly for all three meeting types
- [ ] Closing banner renders with decision/action counts
- [ ] Dynamic content (project name, date, sprint, agenda) populates correctly
- [ ] Looks good in standard terminal widths
- [ ] --no-color flag works

---

#### JB-34: Implement action item tracking
**Priority:** P1 | **Complexity:** M | **Agent:** lead-engineer

As a retro facilitator, I want to update the status of action items from past meetings, so that follow-through is tracked and unresolved items surface in future retros.

**Acceptance Criteria:**
- New CLI command `meeting action` (or extend `meeting update`) to update action item status
- `meeting action --meeting <id> --item <index> --status done` marks an action item as complete
- `meeting action --meeting <id> --item <index> --link-story <shortId>` links an action item to a story that was created to address it
- `meeting actions --open` lists all open action items across all meetings for the current project (same as `--open-actions` from JB-31, but as a dedicated command for clarity)
- When an action item is marked done, the meeting document is updated in place (array element update)
- When a linked story moves to `done`, consider surfacing this in the next pre-meeting data pull as "action item potentially resolved"
- Action items can have an optional `dueBy` date; overdue items are flagged in `meeting actions --open` output

**Technical Notes:**
- Updating a single array element in Firestore requires reading the doc, modifying the array, and writing back (no native array element update). Consider using a transaction for safety.
- The `--item <index>` approach is simple but fragile if items are reordered. Consider using a generated ID per action item instead.
- The "auto-resolve when linked story is done" feature could be a Cloud Function trigger or just a query-time check -- query-time is simpler and avoids new infrastructure.

**Edge Cases:**
- Action item index out of range (clear error)
- Meeting not found (clear error)
- Action item already marked done (no-op with message)
- Action item with no owner (still trackable, just unassigned)
- Linking to a story that doesn't exist (warn but allow -- story may be created later)

**Dependencies:** JB-30 (meetings must be creatable first)

**Definition of Done:**
- [ ] Action items can be marked done
- [ ] Action items can be linked to stories
- [ ] Open action items query works across all meetings
- [ ] Overdue items are flagged
- [ ] Error handling for invalid inputs
