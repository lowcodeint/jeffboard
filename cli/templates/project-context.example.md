# Project Context

<!--
  This is a populated example of the project context file, using JeffBoard itself
  as the reference project. Agents working on JeffBoard would find this file at:
  .claude/project-context.md
-->

## Tech Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Frontend | React | 19 | Functional components, hooks only |
| Styling | Tailwind CSS | v4 | No @apply support; use @import 'tailwindcss' |
| State | Zustand | latest | Single boardStore + toastStore |
| Backend | Firebase (no Cloud Functions yet) | n/a | All writes via CLI Admin SDK |
| Database | Firestore | n/a | See FIRESTORE_DATA_MODEL.md for schema |
| Auth | Firebase Auth | n/a | Google provider only, single-user UID whitelist |
| Hosting | Firebase Hosting | n/a | PWA deployed via `npm run deploy:hosting` |
| CLI/Tooling | Node.js + Commander + firebase-admin | Node 20+ | CLI at cli/dist/index.js |
| Testing | None yet | n/a | No test framework configured |
| Build | Vite | latest | vite-plugin-pwa for service worker |

## Architecture Decisions

### [2026-02-09] No git branches for parallel agent work (product-manager)
**Context:** Burst mode epic needs parallel story execution.
**Decision:** File reservation model instead of git branches.
**Tradeoff:** Agents must declare file reservations upfront. Less flexible than branches but avoids merge conflicts entirely since agents work on the same branch.

### [2026-02-09] Top-level stories collection, not subcollection of projects (solution-architect)
**Context:** Stories need to be queried by projectId, status, and agent.
**Decision:** Stories are a top-level collection with a `projectId` field, not a subcollection under `projects/{id}/stories`.
**Tradeoff:** Requires composite indexes but allows cross-project queries and simpler CLI access.

### [2026-02-09] Read-only PWA, all writes via CLI Admin SDK (solution-architect)
**Context:** Single-user app where only AI agents write data.
**Decision:** PWA is read-only. Firestore security rules block all client writes. CLI uses Admin SDK to bypass rules.
**Tradeoff:** No in-app editing. But simplifies security model dramatically -- no need for per-field write rules.

### [2026-02-09] Six agent types with fixed roles (product-manager)
**Context:** Need to model the AI agent team.
**Decision:** Six predefined agent documents in Firestore: product-manager, solution-architect, lead-engineer, security-reviewer, designer, quality-inspector.
**Tradeoff:** Fixed roster. Adding a new agent type requires a seed update. Fine for current scale.

## File Organization

- `src/` -- React PWA source. Components organized by domain: `auth/`, `board/`, `filters/`, `layout/`, `shared/`.
- `src/hooks/` -- Custom React hooks. One hook per file, named `use<Thing>.ts`.
- `src/services/` -- Firebase client SDK wrappers. Thin abstractions over Firestore/Auth calls.
- `src/stores/` -- Zustand stores. `boardStore.ts` for filters/selection state, `toastStore.ts` for notifications.
- `src/types/index.ts` -- All TypeScript types in one file. Both Firestore document shapes and UI state types.
- `src/utils/` -- Pure utility functions: constants, formatting, sorting.
- `cli/src/` -- CLI tool source. `commands/` for each command, `lib/` for shared Firebase/config logic.
- `cli/dist/` -- Compiled CLI output (gitignored? check). Entry point: `cli/dist/index.js`.
- Root markdown files: `FIRESTORE_DATA_MODEL.md`, `ROADMAP_EPICS.md`, `COMPONENT_TREE.md`, `AUTHENTICATION.md`.
- `.claude/` -- JeffBoard config (`jeffboard.json`), agent memory (`agent-memory/<agent>/MEMORY.md`).

## Data Model

See `FIRESTORE_DATA_MODEL.md` for full schema. Key points:

- **projects** -- Project documents. Fields: name, shortCode, description, isArchived.
- **stories** -- Top-level. Fields: shortId (e.g., "JB-5"), projectId, status, priority, complexity, assignedAgent, notes[] (embedded array), epicName.
- **stories/{id}/activity** -- Subcollection. Status change history with timestamps.
- **agents** -- Six fixed documents keyed by agent slug (e.g., "lead-engineer").
- **counters/stories** -- Atomic counter document. One field per shortCode for auto-increment IDs.
- **config/allowedUsers** -- Single document with `uids: string[]` for auth whitelist.

Notes array is embedded in the story document (not a subcollection). Each note has text, author, createdAt, and optional imageUrl. NoteReactions track which agents have acknowledged which notes.

## Known Gotchas

- **Tailwind v4 no @apply**: v4 dropped `@apply`. Use `@import 'tailwindcss'` in CSS, not `@tailwind base/components/utilities`. PostCSS config must use `@tailwindcss/postcss`. (2026-02-09, lead-engineer)
- **CLI cwd matters for config discovery**: The CLI walks up from `process.cwd()` looking for `.claude/jeffboard.json`. If you run it from the wrong directory, it won't find the config. Always run from the project root or pass `--project` explicitly. (2026-02-09, lead-engineer)
- **Service worker caching on iOS**: After deploying, iPhone users must fully close and reopen the PWA to get updates. There is no force-refresh mechanism. (2026-02-09, lead-engineer)
- **Firestore composite indexes take 1-5 minutes**: After deploying new indexes, queries that depend on them will fail until the index finishes building. Check with `firebase firestore:indexes`. (2026-02-09, solution-architect)
- **Notes are embedded, not a subcollection**: Story notes live inside the story document as an array. This means updating a note requires rewriting the whole notes array. Fine at current scale but will need migration if notes get large. (2026-02-09, solution-architect)

## Active Conventions

- **Commit messages**: Short imperative summary, no emojis. Co-authored-by line for Claude agents.
- **Story IDs**: Format is `{shortCode}-{number}`, e.g., JB-5. Auto-incremented by the CLI.
- **Agent slugs**: Lowercase hyphenated, e.g., `lead-engineer`. Used as Firestore document IDs and CLI `--agent` values.
- **No Cloud Functions yet**: All server-side logic runs in the CLI via Admin SDK. Cloud Functions are planned for Epic 1 (webhooks).
- **Status flow**: backlog -> in-design -> in-progress -> in-review -> done. Blocked and cancelled are lateral states.
- **PWA is read-only**: Never add write operations to the web app. All mutations go through the CLI.

## Recent Changes

- **2026-02-09** (lead-engineer): Added CLI `get` command for reading full story details and note threads. Files: cli/src/commands/get.ts, cli/src/index.ts.
- **2026-02-09** (lead-engineer): Fixed Tailwind v4 + PostCSS build issues. Migrated from @tailwind directives to @import. Files: src/styles/index.css, postcss.config.js.
- **2026-02-09** (lead-engineer): Initial commit -- Epic 1 foundation. Full PWA with Kanban board, real-time Firestore sync, Firebase Auth, CLI for story management.
- **2026-02-09** (product-manager): Created roadmap with 6 epics, 24 stories (JB-1 through JB-24). File: ROADMAP_EPICS.md.

## Agent Notes

### product-manager
- Roadmap lives in `ROADMAP_EPICS.md` with full epic/story details.
- 6 agent types currently defined. May need a `quality-inspector` renamed or repurposed -- the seed data has `mendix-code-explainer` in Firestore but the TypeScript types list `quality-inspector`.
- Design brief (`.claude/design-brief.md`) does not exist yet. Must be created before any UI stories start.

### solution-architect
- Firestore data model is well-documented in `FIRESTORE_DATA_MODEL.md`. Refer to it before making schema changes.
- The notes-as-embedded-array pattern works for now but should be reconsidered if note volume grows beyond ~50 per story.
- The project context file schema (this file's template) is at `cli/templates/project-context.md`.

### lead-engineer
- CLI entry point is `cli/src/index.ts`. Each command is a separate file in `cli/src/commands/`.
- Build the CLI with `cd cli && npm run build`. Output goes to `cli/dist/`.
- The web app uses Zustand for state. `boardStore.ts` is the main store -- it holds filters, selected project, and story data.
- Vite dev server: `npm run dev` from project root. Runs on port 5173.

### security-reviewer

### designer

### quality-inspector
