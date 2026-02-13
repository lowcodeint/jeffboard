# Solution Architect Memory - JeffBoard

## Project Overview
JeffBoard is a Kanban board PWA for orchestrating AI agent workflows. Firebase + React 19 + TypeScript + Vite + Tailwind v4. CLI at `cli/dist/index.js` with firebase-admin SDK.

## Key Files I Own or Authored
- `cli/templates/project-context.md` -- Schema template for project context files (JB-5)
- `cli/templates/project-context.example.md` -- Populated example using JeffBoard itself (JB-5)
- `cli/templates/PROJECT_CONTEXT_SPEC.md` -- Read/write specification for agents (JB-5)
- `docs/agent-routing-taxonomy.md` -- Story tag taxonomy, agent capability mapping, scoring model (JB-21)

## Architecture Decisions I've Made or Endorsed
- Project context file lives at `.claude/project-context.md` in target projects (not in JeffBoard itself)
- Three-file memory model: CLAUDE.md (instructions), MEMORY.md (private per-agent), project-context.md (shared knowledge)
- 500-line max for context file with per-section limits to prevent context window bloat
- Per-agent notes sections within the shared context file for specialized knowledge

## Project Structure Notes
- `.claude/` directory holds: `jeffboard.json` (project config), `agent-memory/<agent>/MEMORY.md` (per-agent memory)
- `cli/templates/` is the new home for schema/template files
- Data model docs: `FIRESTORE_DATA_MODEL.md` at project root
- Roadmap: `ROADMAP_EPICS.md` at project root
- 6 agent types: product-manager, solution-architect, lead-engineer, security-reviewer, designer, quality-inspector

## Architecture Decisions - Agent Routing (JB-21)
- 10 story tags defined: frontend, backend, api, database, security, ui-design, infrastructure, testing, documentation, devops
- Scoring: primary tag match = 3 pts, secondary = 1 pt, no match = 0. Fallback bonus of 0.5 for lead-engineer.
- Tie-break order: lead-engineer > solution-architect > security-reviewer > designer > quality-inspector > product-manager
- Tags stored as `tags: string[]` on Story document (optional, defaults to empty array)
- Pre-existing TS errors in `src/pages/TokenDashboardPage.tsx` (arithmetic type errors) -- not related to tags work

## Dependencies for Follow-On Work
- JB-6 (CLI context commands) depends on the schema defined in JB-5
- JB-7 (auto-inject context) will need to read the project-context.md file and filter by agent
- JB-8 (auto-capture) will need to write structured entries to project-context.md sections
- JB-22 (tag UI/CLI) depends on the `tags` field added in JB-21 and the taxonomy in `docs/agent-routing-taxonomy.md`
- JB-23 (routing logic) depends on the scoring model and constants block in `docs/agent-routing-taxonomy.md`
