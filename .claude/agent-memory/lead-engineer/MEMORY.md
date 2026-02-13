# Lead Engineer Memory - JeffBoard Project

## Project Structure

### Core Directories
- **D:\code\jeffboard** - Main project root
- **cli/** - TypeScript CLI using Firebase Admin SDK for Firestore operations
- **functions/** - Firebase Cloud Functions (TypeScript, ESNext modules)
- **src/** - React frontend (Vite + TypeScript)
- **public/** - Static assets

### Build Outputs (git-ignored)
- **dist/** - Vite production build
- **cli/dist/** - Compiled CLI JavaScript
- **functions/lib/** - Compiled Cloud Functions JavaScript

## Firebase Configuration

### Project Details
- Firebase project ID: `jeff-board`
- Region: `us-central1`
- Config files: `.firebaserc`, `firebase.json`

### Collections
- **projects** - Project metadata (includes optional `webhookUrl` field)
  - **context** subcollection - Project context sections (shared knowledge across agents)
- **stories** - Story documents (top-level, not nested)
  - **activity** subcollection - Status change history
- **agents** - Agent configuration (6 documents)
- **counters** - Auto-increment for short IDs
- **webhookEvents** - Webhook events for status changes (written by Cloud Functions)
- **config/allowedUsers** - Single doc with authorized UIDs

### Data Model
- Stories use shortId format: `{shortCode}-{number}` (e.g., "JB-1")
- Story status values: `backlog | in-design | in-progress | in-review | done | blocked | cancelled`
- Story tags: optional `string[]` field for categorization (frontend, backend, api, database, etc.)
- File reservations: optional `reservedFiles: string[]` field supports wildcards (e.g., "src/components/*")
- Blocked stories: `blockedReason` field explains why blocked, `previousStatus` stores status to restore
- Webhook event status values: `pending | retrying | delivered | failed`
- CLI uses Firebase Admin SDK (bypasses security rules)
- Client PWA is read-only (enforced by Firestore rules)

## Technology Stack

### Frontend
- React 19.2.0
- Vite 7.2.4
- TypeScript 5.9.3
- Tailwind CSS 4.1.18
- Zustand for state management
- Firebase SDK 12.9.0 (client SDK)
- Browser Notification API for stuck agent alerts (JB-15)
- Web Audio API for notification sounds (JB-15)

### Backend/CLI
- Firebase Admin SDK 13.0.1
- Node.js 22
- TypeScript with ESNext modules

### Cloud Functions
- Firebase Functions v2 (`firebase-functions` 6.2.0)
- Firebase Admin SDK 13.0.1
- TypeScript with ESNext modules and bundler resolution
- Node.js 22 runtime
- Region: us-central1

## Agent Routing (JB-24)

### Implementation Files
- **src/utils/agentRouting.ts** - Core scoring logic, constants from taxonomy
- **src/components/shared/AgentRecommendation.tsx** - Recommendation UI component
- **CreateStorySheet.tsx** - Shows recommendation, auto-selects agent when tags change

### Routing Logic
- Implemented per `docs/agent-routing-taxonomy.md`
- Primary tag match = 3 points, secondary = 1 point, fallback bonus for lead-engineer = 0.5
- Returns ranked list with scores and match explanations
- Used in create story form to auto-recommend agent based on tags

## Development Patterns

### TypeScript Configuration
- Use `"module": "ESNext"` for both CLI and Cloud Functions
- Use `"moduleResolution": "bundler"` for Cloud Functions
- Use `.js` extensions in imports for ESNext modules
- Strict mode enabled

### Testing
- Cloud Functions: Node.js built-in test runner (`node --test`)
- Import from `.js` files in tests (TypeScript compiles to .js)

### Build Scripts
- Root `package.json` has orchestration scripts
- Individual directories (cli/, functions/) have local build scripts
- Use `npm run build:functions` before deploying functions

### Deployment
- **Hosting only:** `npm run deploy:hosting`
- **Firestore rules/indexes:** `npm run deploy:firestore`
- **Functions only:** `npm run deploy:functions`
- **Everything:** `npm run deploy`

## Cloud Functions Implementation

### File Structure
```
functions/
├── src/
│   ├── index.ts                    # Exported functions + re-exports
│   ├── index.test.ts               # Tests for onStoryStatusChange
│   ├── webhook-dispatcher.ts       # HTTP POST webhook delivery
│   ├── webhook-dispatcher.test.ts  # Tests for webhook dispatcher
│   └── types.ts                    # Shared TypeScript interfaces
├── lib/                            # Compiled output (git-ignored)
├── package.json
├── tsconfig.json
└── README.md
```

### Function Patterns
- Use `onDocumentUpdated` for update triggers, `onDocumentCreated` for create triggers
- Export functions from `index.ts` (Firebase detects exports)
- Use `FieldValue.serverTimestamp()` for timestamps
- Non-blocking error handling for non-critical operations
- Log with `console.log()` (appears in Cloud Functions logs)
- Use `defineSecret()` from `firebase-functions/params` for sensitive config
- Lazy-initialize Firestore with `getFirestore()` inside functions (not at module load) to avoid test failures

### Testing Pattern
- Export testable helper functions alongside main trigger
- Mock Firestore data with plain objects + Timestamp
- Test edge cases: undefined snapshots, null fields, all status transitions

## Common Pitfalls Avoided

1. **Import extensions:** Always use `.js` in imports for ESNext modules (even when source is `.ts`)
2. **Module resolution:** Cloud Functions use "bundler" resolution (not "node")
3. **Timestamps:** Use `FieldValue.serverTimestamp()` for Firestore writes, not `Timestamp.now()`
4. **Security:** Cloud Functions use Admin SDK (bypass rules), client uses regular SDK (rules enforced)
5. **Non-blocking:** Webhook event creation failures shouldn't prevent story updates
6. **Module-level Firestore:** Don't call `getFirestore()` at module load time - causes test failures. Use lazy initialization inside functions.
7. **Webhook retries:** Only retry 5xx and timeout errors. Don't retry 4xx client errors (bad config)
8. **HMAC signatures:** Use raw request body for signature verification, not parsed JSON

## Documentation Standards

- README.md in each major directory (functions/, cli/)
- Implementation summaries for major features
- Update FIRESTORE_DATA_MODEL.md when adding collections or fields
- JSDoc comments for public functions
- Inline comments for complex logic (explain "why" not "what")

## TypeScript Type Synchronization

When adding fields to the Story document schema:
1. **Web app types:** `src/types/index.ts` - Full Story interface with Firebase Timestamp
2. **CLI types:** `cli/src/lib/firestore.ts` - StoryDocument interface and firestore helper return types
3. **Cloud Functions types:** `functions/src/types.ts` - Subset of fields needed by functions
4. **Firestore rules:** `firestore.rules` - Update `affectedKeys().hasOnly([...])` to allow new fields
5. **Data model docs:** `FIRESTORE_DATA_MODEL.md` - Document schema and field descriptions
6. **Build verification:** Run `npm run build` in root, cli/, and functions/ to verify all three compile

**Important:** CLI uses a separate `StoryDocument` interface (not Story) for typed return values from `listStories()` and other firestore helpers. Include all fields needed by CLI commands in this interface.

## Token Dashboard Implementation (JB-11)

### Route & Navigation
- Dashboard accessible at `/tokens` route (protected)
- Board/Tokens segmented control in AppHeader for navigation
- Uses react-router-dom `useLocation` and `useNavigate` hooks

### Page Components (src/components/dashboard/)
1. **TokenSummaryCards** - 4 metric cards (Total Tokens, Total Cost, Avg/Story, Sessions)
2. **CostByComplexity** - S/M/L/XL breakdown with proportional progress bars
3. **CostPerStoryChart** - Top 10 horizontal bar chart ranked by cost
4. **TokenFilterBar** - Epic dropdown, Priority pills, Complexity pills, active filter count
5. **TokenStoryTable** - Sortable table with pagination (10 per page)

### Data & Filtering
- Real-time via `useStories` hook (Firestore onSnapshot)
- Date range filter: start/end date inputs with full-day inclusion
- Epic filter: dropdown of unique epic names from stories
- Priority filter: toggleable pills (P0-P3) with semantic colors
- Complexity filter: toggleable pills (S-XL) with blue active state
- Filters update page state, reset pagination on change

### Sorting & Pagination
- Sortable columns: ID, Title, Complexity, Tokens, Cost, Sessions
- Sort indicators: bidirectional arrow (inactive), up/down arrow (active)
- Active sort column highlighted in blue
- Pagination: smart page numbers (first, last, current +/- 1, ellipsis)
- Items per page: 10 (configurable)

### Token Data Display
- Stories without `tokenUsage` shown at 50% opacity with "No data" placeholders
- Token counts formatted: 1M, 1K, or raw number
- Cost formatted: $0.00 with 2 decimals
- Input/output tokens breakdown in summary cards and table

### Styling Additions
- Added `.scrollbar-thin` CSS utility (6px width, gray, rounded thumb)
- Follows design brief: blue-600 primary, rounded-lg cards, shadow-sm, dark mode compatible
- Mobile responsive: cards 2-col, filters wrap, table horizontal scroll

### Cost-per-Complexity Analysis (JB-12)
- `CostComplexityAnalysis.tsx` component shows expected vs actual cost per tier
- Displays average/min/max cost for S/M/L/XL tiers
- Grouped bar chart with min-max range (light bar) + average marker (dark line)
- Outlier detection: stories costing >2x tier average highlighted in amber
- Detail table sorted by cost-to-average ratio
- Only includes stories with tokenUsage data
- Added to token dashboard between CostByComplexity and CostPerStoryChart

## Agent Routing System (JB-21, JB-22, JB-23)

### Taxonomy Location
- **docs/agent-routing-taxonomy.md** - Authoritative source for tags, agent capabilities, and scoring model
- Version 1.0 established in JB-21

### Tag System
- Stories have optional `tags?: string[]` field
- 10 valid tags: frontend, backend, api, database, security, ui-design, infrastructure, testing, documentation, devops
- CLI commands accept `--tags tag1,tag2,tag3` (comma-separated)
- Web UI renders tags as colored pills

### Routing Logic
- **Implementation:** `cli/src/lib/routing.ts` - Reusable scoring module
- **Command:** `cli/src/commands/route.ts` - CLI command interface
- **Scoring:**
  - Primary tag match: 3 points
  - Secondary tag match: 1 point
  - Fallback bonus: 0.5 (lead-engineer only, when score is 0)
- **Tie-break order:** lead-engineer > solution-architect > security-reviewer > designer > quality-inspector > product-manager
- **Usage:** `jeffboard route --story JB-23` or `jeffboard route --tags "frontend,api"`

### Agent Capabilities (excerpt from taxonomy)
```typescript
const AGENT_CAPABILITIES = {
  'lead-engineer': {
    primary: ['frontend', 'backend', 'api', 'database'],
    secondary: ['infrastructure', 'testing', 'devops'],
  },
  'solution-architect': {
    primary: ['database', 'infrastructure', 'documentation'],
    secondary: ['backend', 'api', 'security'],
  },
  // ... see docs/agent-routing-taxonomy.md for full matrix
};
```

## CLI Command Patterns

### Adding New Commands
1. Create command file in `cli/src/commands/<name>.ts`
2. Export a function that returns a `Command` from Commander.js
3. Use existing validators from `cli/src/lib/validators.ts`
4. Use firestore helpers from `cli/src/lib/firestore.ts`
5. Import and register in `cli/src/index.ts`
6. Document in `cli/README.md`
7. Update `FIRESTORE_DATA_MODEL.md` if adding new collections

### Example Pattern
```typescript
import { Command } from 'commander';
import { getProjectId } from '../lib/config.js';
import { validateRequired } from '../lib/validators.js';

export function createMyCommand() {
  return new Command('mycommand')
    .description('Description here')
    .requiredOption('-t, --text <text>', 'Text parameter')
    .option('-p, --project <projectId>', 'Project ID (auto-detected from .claude/jeffboard.json)')
    .action(async (options) => {
      try {
        const projectId = getProjectId(options.project);
        validateRequired(options.text, 'Text');
        // implementation
        console.log('✓ Success message');
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}
```

### Context Commands (JB-6, JB-7)
- `context read` - Read project context sections
- `context write` - Append entries with auto-truncation
- `context inject` - Format context for agent prompt injection with token budgeting
- Context stored in `projects/{projectId}/context/{sectionName}`
- 8 sections with different line limits (tech-stack: 20, known-gotchas: 30, etc.)
- Auto-truncation removes oldest entries when limit exceeded
- `inject` command filters to relevant sections (architecture-decisions, known-gotchas, active-conventions, data-model, and agent-specific notes)
- Token budget enforced at ~4 chars per token, default 2000 tokens
- Outputs to stdout (formatted markdown), logs to stderr (section sizes, truncation status)

### Heartbeat Command (JB-13)
- `heartbeat` - Update story heartbeat timestamp for stuck detection
- Updates `lastHeartbeat`, `heartbeatAgent`, and optional `heartbeatMessage` fields on story document
- Debounced to 30 seconds using local temp file (`/tmp/jeffboard-heartbeats/state.json`)
- Used by agents to signal active work on long-running tasks
- Fast execution (under 500ms when not debounced)

### Context Capture Command (JB-8)
- `context capture` - Auto-capture decisions, gotchas, changes from agent sessions
- Keyword-based categorization into sections (architecture-decisions, known-gotchas, recent-changes, agent-notes)
- Simple text normalization for duplicate detection
- Story shortId attribution for traceability
- See [context-capture.md](context-capture.md) for implementation details

### Usage Command (JB-10)
- `usage` - Report token usage for a story
- Accumulates tokens across sessions using `FieldValue.increment()` for atomic operations
- Required flags: `-s` (story shortId), `-i` (input tokens), `-o` (output tokens), `-c` (cost USD)
- Validates all inputs are positive numbers
- Auto-calculates `totalTokens` as `inputTokens + outputTokens`
- Increments `sessions` counter by 1 on each report
- Returns both session values and running totals

### Duplicate Story ID Prevention (JB-25)
- **Counter logic:** `getNextShortId()` in `firestore.ts` uses Firestore transaction to atomically increment the counter
- **Race condition fix:** `createStory()` checks for duplicate shortId after getting counter value but before writing story
- **Retry logic:** If duplicate detected, retries up to 3 times with exponential backoff (100ms, 200ms, 400ms)
- **Migration script:** `cli/scripts/check-duplicates.ts` scans all stories and reports duplicates
- **Pattern:** Always verify no existing document with same unique field before writing, even if counter is atomic

### File Reservation Command (JB-18, JB-20)
- `reserve` - Manage file reservations for parallel story execution (burst mode)
- Set reservations: `reserve -s JB-18 --files "src/types/index.ts,cli/src/commands/reserve.ts"`
- Check conflicts: `reserve -s JB-18 --check` (compares against in-progress and in-design stories)
- Clear reservations: `reserve -s JB-18 --clear`
- Request file: `reserve -s JB-20 --request --file src/App.tsx` (blocks requester, adds notes to both stories)
- Release reservations: `reserve -s JB-18 --release` (clears files, auto-unblocks waiting stories)
- Wildcard support: Use glob patterns like `src/components/dashboard/*` to reserve entire directories
- High-conflict file detection: Shared files (package.json, tsconfig.json, route configs, etc.) automatically flagged
- Overlap checking uses minimatch for glob pattern matching
- Auto-checks for conflicts after setting reservations
- Exit code 1 if conflicts detected (for CI integration)
- Request mode: finds holding story, adds notes explaining conflict, moves requester to blocked status
- Release mode: clears reservations, finds blocked stories waiting on these files, restores to previousStatus
- Blocked stories tracked via blockedReason format: "Waiting for file: {filePath} (held by {shortId})"

## React Component Patterns (JB-14)

### Shared Components Location
- All reusable components go in `src/components/shared/`
- Examples: AgentAvatar, PriorityBadge, RelativeTime, HeartbeatIndicator

### HeartbeatIndicator Component (JB-14)
- Shows colored dot on story cards for in-progress and in-design stories
- Status thresholds: green (< 2 min), yellow (5-15 min), red (> 15 min)
- Updates every 30 seconds using setInterval in useEffect
- Displays tooltip with last heartbeat time and optional message
- Uses Tailwind utility classes (no CSS modules or inline styles)
- Integrated into StoryCard component with conditional rendering based on story status

### Stuck Detection and Notifications (JB-15)
- `useStuckDetection` hook in `src/hooks/` monitors in-progress stories for heartbeat staleness
- Tracks yellow->red transitions (15+ min no heartbeat) to avoid duplicate notifications
- Browser Notification API permission requested on first visit
- Notifications include story shortId, title, agent name, time since heartbeat
- Clicking notification focuses JeffBoard tab via window.focus()
- `useAudioAlert` hook manages audio preference in localStorage (default: enabled)
- Audio generated using Web Audio API (440 Hz sine wave, 150ms duration with fade in/out)
- AudioAlertToggle component in AppHeader shows speaker icon with muted/unmuted states
- Graceful degradation if Notification API unavailable or permission denied
- Integration in BoardPage: useStuckDetection called with stories, plays audio on detection

## Links to Detailed Docs

- See `FIRESTORE_DATA_MODEL.md` for complete schema
- See `functions/README.md` for Cloud Functions details
- See `cli/README.md` for CLI usage
- See `cli/templates/PROJECT_CONTEXT_SPEC.md` for context file specification
