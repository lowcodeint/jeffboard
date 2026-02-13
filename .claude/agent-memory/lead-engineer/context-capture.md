# Context Capture Implementation (JB-8)

## Overview
Implemented `context capture` CLI command for auto-capturing key decisions, gotchas, and changes from agent sessions to the project context system.

## Key Files
- **cli/src/commands/context.ts** - Added `capture` subcommand and helper functions
- **cli/README.md** - Documented the new command

## Implementation Details

### Keyword-Based Categorization
Simple keyword matching categorizes summaries into sections:
- **architecture-decisions**: "decided", "chose", "architecture", "design pattern", "approach"
- **known-gotchas**: "gotcha", "bug", "watch out", "careful", "pitfall", "beware", "caveat", "warning"
- **recent-changes**: "changed", "added", "removed", "updated", "refactored", "migrated"
- **agent-notes**: Default fallback when no keywords match

Multiple sections can be matched for a single summary (e.g., "added" + "watch out" → recent-changes + known-gotchas).

### Duplicate Detection
Simple text similarity check prevents redundant entries:
1. Normalize both texts (lowercase, strip punctuation/whitespace)
2. Exact match after normalization → duplicate
3. Substring containment → duplicate

Works across all entries in the target section, not just same agent or story.

### Entry Format
Entries are prefixed with story shortId for traceability:
```
[JB-8] Summary text here
```

Auto-truncation (from writeProjectContextEntry) ensures sections stay under line limits.

## Usage Pattern
Agents should call this at the end of work sessions:
```bash
jeffboard context capture \
  -s <SHORT-ID> \
  -a <agent-name> \
  --summary "<key learnings>" \
  --service-account <path>
```

## Design Decisions
1. **Keyword-based vs ML**: Chose simple keyword matching over ML for simplicity, maintainability, and predictability
2. **Multiple sections**: Allow one summary to write to multiple sections (e.g., a change that's also a gotcha)
3. **Story attribution**: Prefix entries with story shortId for traceability
4. **Duplicate detection**: Use text normalization for similarity checking rather than exact string match

## Testing
Verified:
- ✅ Keyword categorization works (architecture-decisions, known-gotchas, recent-changes)
- ✅ Multiple section writes for multi-category summaries
- ✅ Duplicate detection prevents redundant entries
- ✅ Story attribution included in entries
- ✅ CLI builds successfully
- ✅ Help output correct
