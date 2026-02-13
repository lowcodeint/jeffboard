# Project Context File Specification

## Overview

The project context file (`.claude/project-context.md`) is a structured markdown document that preserves project knowledge across AI agent sessions. It sits alongside the existing `.claude/jeffboard.json` config and `.claude/agent-memory/` per-agent memory directories.

## How It Relates to Existing Files

| File | Scope | Purpose | Who writes |
|------|-------|---------|------------|
| `.claude/CLAUDE.md` | Project | Instructions for agents (behavioral rules) | Human only |
| `.claude/agent-memory/<agent>/MEMORY.md` | Agent | Private scratchpad for one agent | The owning agent |
| `.claude/project-context.md` | Project | Shared project knowledge (facts about the codebase) | All agents |

**Key distinction:** CLAUDE.md tells agents *how to behave*. MEMORY.md is *personal notes*. project-context.md is *shared knowledge about the project*.

## File Location

The file lives at `.claude/project-context.md` in the root of any project that uses JeffBoard for agent orchestration. It is committed to version control.

## Size Limit

**Maximum: 500 lines.** This limit exists to prevent context window bloat when agents read the file at session start. If the file approaches 500 lines:

1. Summarize or remove entries from "Recent Changes" (oldest first).
2. Consolidate "Known Gotchas" entries that are no longer relevant.
3. Compress "Agent Notes" by removing stale information.
4. Move detailed architecture rationale to a linked document if needed.

## Section Name Reference

When using the CLI `context` command, use the kebab-case identifier. The template uses Title Case headers for readability.

| Template Header | CLI Identifier |
|----------------|----------------|
| ## Tech Stack | `tech-stack` |
| ## Architecture Decisions | `architecture-decisions` |
| ## File Organization | `file-organization` |
| ## Data Model | `data-model` |
| ## Known Gotchas | `known-gotchas` |
| ## Active Conventions | `active-conventions` |
| ## Recent Changes | `recent-changes` |
| ## Agent Notes | `agent-notes` |

## Schema Sections

### Tech Stack (max 20 lines)
A table of the project's core technologies. Updated when major upgrades happen.

### Architecture Decisions (max 80 lines)
Significant design choices with context, decision, and tradeoffs. Newest entries first. Superseded decisions are marked `[SUPERSEDED]` but kept for historical context until the section needs trimming.

### File Organization (max 30 lines)
Directory structure conventions. Not a full tree listing -- just the patterns and rules that help agents put code in the right place.

### Data Model (max 40 lines)
Key collections/tables and their relationships. Links to detailed docs. Highlights denormalization strategy and important constraints.

### Known Gotchas (max 30 lines)
Things that have tripped agents up. Each entry has a short title, explanation, date, and discovering agent. Remove entries when the underlying issue is fixed.

### Active Conventions (max 30 lines)
Patterns the team follows: naming, commits, branching, PR workflow, code style rules not captured in linter configs.

### Recent Changes (max 50 lines)
Rolling log of significant codebase changes. Date, agent, summary, and affected files. Oldest entries pruned first when space is needed.

### Agent Notes (max 40 lines per agent)
Per-agent sections for specialized knowledge. Each agent writes only to their own section but can read all sections. Useful for agent-specific tips, tooling notes, and domain knowledge.

## When to Read

Agents should read `.claude/project-context.md` at the **start of every session**, before beginning any work. Specifically:

| Trigger | Action |
|---------|--------|
| Agent session starts | Read the full file |
| Agent picks up a new story | Read the full file (context may have changed since last read) |
| Agent is unsure about a convention or pattern | Re-read relevant sections |
| Agent encounters an error that seems like it might be a known issue | Check "Known Gotchas" |

Reading is cheap (one file read). Agents should err on the side of reading more often.

## When to Write

Agents should write to `.claude/project-context.md` at **session end** or when making **significant discoveries**. Not every session needs a write. Only write when you have something genuinely useful to add.

| Trigger | Section to Update | What to Write |
|---------|------------------|---------------|
| Made an architecture decision | Architecture Decisions | Context, decision, tradeoff |
| Discovered a non-obvious bug or footgun | Known Gotchas | Short title + explanation |
| Changed the tech stack (new dependency, upgrade) | Tech Stack | Updated row in the table |
| Established a new convention | Active Conventions | Pattern description |
| Completed significant code changes | Recent Changes | Date, summary, files |
| Learned something useful for future sessions | Agent Notes (own section) | Tip or finding |
| Fixed a known gotcha | Known Gotchas | Remove or mark as resolved |
| Made a change that affects file organization | File Organization | Updated description |

### Write Rules

1. **Always attribute writes.** Include the date and your agent name.
2. **Write to your own Agent Notes section only.** Read others; do not edit them.
3. **Shared sections are append-or-edit.** Any agent can add entries to Architecture Decisions, Known Gotchas, Recent Changes, etc. Editing existing entries in shared sections is allowed when correcting factual errors.
4. **Do not duplicate.** Before writing, check if the information already exists.
5. **Be concise.** Each entry should be 1-5 lines. If you need more space, link to a separate document.
6. **Prune when you write.** If a section is near its line limit, remove stale entries before adding new ones.

## Anti-Patterns

- **Writing raw conversation logs.** The context file is curated knowledge, not a dump.
- **Writing per-story details.** Story-specific notes belong in JeffBoard story notes, not the context file. The context file is for cross-cutting project knowledge.
- **Writing instructions.** Instructions for agents belong in CLAUDE.md, not here.
- **Letting the file grow unchecked.** If nobody prunes, the file becomes noise. Every agent that writes should also prune.
- **Writing to another agent's notes section.** Use JeffBoard story notes for cross-agent communication.

## Bootstrapping a New Project

When a new project is initialized with `jeffboard init`, the context file can be scaffolded by copying the template:

```bash
cp <jeffboard-repo>/cli/templates/project-context.md .claude/project-context.md
```

The `init` command may be extended in the future (JB-6) to do this automatically.

## Future: CLI Commands (JB-6)

The follow-on story JB-6 will add CLI commands for programmatic read/write:

- `context read` -- Returns the full file or a specific section.
- `context write --section <name> --text <text>` -- Appends to a section with attribution.

Until JB-6 is implemented, agents read and write the file directly using standard file I/O.
