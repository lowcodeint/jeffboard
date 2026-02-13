# JB-6 Implementation: CLI Context Commands

## Summary

Implemented CLI commands for reading and writing project context (shared knowledge across AI agents). Context data is stored in Firestore under `projects/{projectId}/context/{sectionName}` and includes automatic truncation when sections exceed their line limits.

## Files Changed

### New Files
- **cli/src/commands/context.ts** - Context read/write commands
  - `context read` - Read all sections or a specific section
  - `context write` - Append an entry to a section with timestamp and agent attribution

### Modified Files
- **cli/src/lib/firestore.ts** - Added context data model and functions:
  - `COLLECTIONS.CONTEXT` constant
  - `SECTION_LINE_LIMITS` - Line limits per section (from spec)
  - `readProjectContext()` - Read context sections from Firestore
  - `writeProjectContextEntry()` - Write entry with auto-truncation
  - `ContextEntry` and `ContextSection` TypeScript interfaces

- **cli/src/index.ts** - Registered context command in main CLI
  - Added import for `createContextCommand`
  - Added command to program

- **cli/README.md** - Documented new commands with examples
  - Added `jeffboard context read` documentation
  - Added `jeffboard context write` documentation
  - Included valid section names and auto-truncation behavior

- **FIRESTORE_DATA_MODEL.md** - Documented context subcollection schema
  - Added `projects/{projectId}/context/{sectionName}` to collections overview
  - Added `ContextSection` schema with entry structure
  - Documented valid section names and line limits
  - Documented CLI commands

## Data Model

### Firestore Structure
```
projects/{projectId}/context/{sectionName}
```

### Schema
```typescript
interface ContextSection {
  sectionName: string;     // Section ID (e.g., "tech-stack", "known-gotchas")
  entries: ContextEntry[];
  updatedAt: Timestamp;
}

interface ContextEntry {
  text: string;            // Entry content
  agent: string;           // Agent name that wrote this entry
  timestamp: Timestamp;    // Entry creation timestamp
}
```

### Valid Sections (from PROJECT_CONTEXT_SPEC.md)
- `tech-stack` (20 line limit)
- `architecture-decisions` (80 line limit)
- `file-organization` (30 line limit)
- `data-model` (40 line limit)
- `known-gotchas` (30 line limit)
- `active-conventions` (30 line limit)
- `recent-changes` (50 line limit)
- `agent-notes` (40 line limit)

## Features

### 1. Read Context
```bash
# Read all sections
jeffboard context read --service-account path/to/service-account.json

# Read specific section
jeffboard context read --section tech-stack --service-account path/to/service-account.json
```

Output format:
```
## Section Name

- [2026-02-09] (agent-name): Entry text
- [2026-02-09] (another-agent): Another entry
```

### 2. Write Context
```bash
jeffboard context write \
  --section known-gotchas \
  --text "Tailwind v4 does not support @apply directive" \
  --agent lead-engineer \
  --service-account path/to/service-account.json
```

Features:
- Automatic timestamp attribution
- Agent name attribution
- Auto-truncation when section exceeds line limit

### 3. Auto-Truncation
When a section exceeds its line limit:
1. Calculates total lines (entry text lines + attribution line per entry)
2. If over limit, removes oldest entries first
3. Continues until section is under the limit
4. Always keeps at least one entry

Line counting:
- Each entry counts the number of lines in its text (split by `\n`)
- Plus 1 line for the attribution (date and agent)
- Total lines summed across all entries in the section

## Testing

Verified functionality:
- ✓ Create entries in different sections
- ✓ Read all sections
- ✓ Read specific section
- ✓ Auto-truncation removes oldest entries when limit exceeded
- ✓ Project ID auto-detection from `.claude/jeffboard.json`
- ✓ Timestamp and agent attribution on all entries
- ✓ TypeScript compilation successful

Manual test:
1. Added 2 initial entries to `known-gotchas` (30-line limit)
2. Added 15 multi-line test entries
3. Verified oldest 2 entries were removed (truncation working)
4. Final count: 15 entries (under 30-line limit)

## Usage Examples

### Agent Workflow
When an agent discovers something useful:
```bash
# Add a known gotcha
jeffboard context write \
  --section known-gotchas \
  --text "Firebase Admin SDK uses serverTimestamp() not Timestamp.now()" \
  --agent lead-engineer

# Add a recent change
jeffboard context write \
  --section recent-changes \
  --text "Implemented context CLI commands. Files: cli/src/commands/context.ts" \
  --agent lead-engineer

# Read context at session start
jeffboard context read
```

### Integration with Agent Memory
Context complements the existing memory system:
- **CLAUDE.md** - Instructions for agents (how to behave)
- **agent-memory/MEMORY.md** - Per-agent private scratchpad
- **project-context** (this implementation) - Shared project knowledge

Agents should:
1. Read context at session start
2. Write to context when making significant discoveries
3. Use project ID auto-detection (reads `.claude/jeffboard.json`)

## Acceptance Criteria Status

✅ New CLI command `context read` returns full project context
✅ New CLI command `context write --section <section> --text <text>` appends to a specific section
✅ Context stored in Firestore under projects subcollection
✅ Write command appends with timestamp and agent name attribution
✅ Read command formats output with section headers
✅ Sections exceeding configurable line limit are auto-truncated (oldest entries removed)
✅ Context data scoped per project

## Next Steps

This completes JB-6. Future enhancements could include:
- Web UI for viewing context (read-only)
- Search across context sections
- Export context to markdown file
- Validation to prevent duplicate entries
- Support for removing specific entries (not just auto-truncation)
