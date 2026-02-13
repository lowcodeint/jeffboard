# Project Context

<!--
  PROJECT CONTEXT FILE SCHEMA v1.0
  ================================
  This file preserves project knowledge across AI agent sessions.
  It lives at: .claude/project-context.md (in the target project, NOT in JeffBoard)

  RULES:
  - Maximum 500 lines. If approaching the limit, agents must summarize older entries.
  - Every write must include a date and agent attribution.
  - Agents read this file at session start. They write to it at session end or when
    making significant discoveries.
  - This file is version-controlled. Commits to it should be atomic.
  - Do NOT duplicate information already in CLAUDE.md or MEMORY.md.
    CLAUDE.md = instructions for agents (how to behave).
    MEMORY.md = per-agent scratchpad (personal notes).
    project-context.md = shared project knowledge (what we know about the codebase).
-->

## Tech Stack

<!-- Canonical list of technologies, versions, and key dependencies. Update when major
     upgrades happen. Keep this section under 20 lines. -->

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Frontend | | | |
| Styling | | | |
| State | | | |
| Backend | | | |
| Database | | | |
| Auth | | | |
| Hosting | | | |
| CLI/Tooling | | | |
| Testing | | | |

## Architecture Decisions

<!-- Significant design choices and their rationale. Format: one decision per entry.
     When a decision is superseded, mark it [SUPERSEDED] and add the replacement.
     Newest entries at the top. Keep this section under 80 lines. -->

<!-- Example entry:
### [2026-02-09] Use Firestore instead of PostgreSQL (solution-architect)
**Context:** Need a database for the MVP. Team is small, timeline is tight.
**Decision:** Firestore for managed infra, real-time sync, and free tier.
**Tradeoff:** Limited query flexibility. No joins. Must denormalize.
-->

## File Organization

<!-- Describe the project's directory structure conventions. Not a full tree listing --
     just the patterns and rules that help agents find things and put new code in the
     right place. Keep under 30 lines. -->

## Data Model

<!-- Key collections/tables, their relationships, and denormalization strategy.
     Link to detailed docs if they exist. Keep under 40 lines. -->

## Known Gotchas

<!-- Things that have tripped agents up before. Format: short title + explanation.
     Remove entries that are no longer relevant. Keep under 30 lines. -->

<!-- Example entry:
- **Tailwind v4 no @apply**: Tailwind CSS v4 does not support `@apply` directives.
  Use utility classes directly or CSS variables instead. (2026-02-09, lead-engineer)
-->

## Active Conventions

<!-- Patterns the team has established that agents should follow. Examples: naming
     conventions, commit message format, PR workflow, branch strategy. Keep under 30 lines. -->

## Recent Changes

<!-- A rolling log of significant changes to the codebase. Oldest entries should be
     pruned when the file approaches 500 lines. Newest at top. Keep under 50 lines. -->

<!-- Example entry:
- **2026-02-09** (lead-engineer): Added CLI `get` command for reading story details.
  Files: cli/src/commands/get.ts, cli/src/index.ts
-->

## Agent Notes

<!-- Per-agent sections for specialized knowledge. Each agent owns their section and
     can read others' sections. An agent should only write to their own section.
     Each section should stay under 40 lines. -->

### product-manager

### solution-architect

### lead-engineer

### security-reviewer

### designer

### quality-inspector
