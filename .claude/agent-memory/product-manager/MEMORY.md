# Product Manager Memory - JeffBoard

## Project Overview
JeffBoard is a Kanban board app that orchestrates AI agent workflows. Firebase/Firestore backend, React/TypeScript frontend, CLI for agent interactions. Short code: JB.

## Roadmap (7 Epics, 34 Stories)
Created 2026-02-09. Epics 1-6 (JB-1 to JB-24) all done. Epic 7 (JB-29 to JB-34) active as of 2026-02-11.

### Epic Priority Order
1. **Webhook-Driven Scheduling** (P0) - JB-1 to JB-4 - DONE
2. **Agent Memory Across Sessions** (P0) - JB-5 to JB-8 - DONE
3. **Cost & Token Tracking** (P1) - JB-9 to JB-12 - DONE
4. **Heartbeat / Stuck Detection** (P1) - JB-13 to JB-16 - DONE
5. **Burst Mode Parallel Execution** (P2) - JB-17 to JB-20 - DONE
6. **Agent Specialization Routing** (P2) - JB-21 to JB-24 - DONE
7. **Retro Tooling** (P0) - JB-29 to JB-34 - ACTIVE

### Epic 7: Retro Tooling Dependencies
- JB-29 before JB-30 (schema before create command)
- JB-30 before JB-31 (create before list/get)
- JB-31 before JB-32 (list/get before pre-meeting data pull uses past meeting queries)
- JB-30 before JB-34 (create before action item tracking)
- JB-33 (banners) is independent, can be built anytime

## Architecture Notes
- 6 agent types: product-manager, solution-architect, lead-engineer, security-reviewer, designer, quality-inspector
- Stories stored in top-level `stories` collection with `activity` subcollection
- CLI at `D:/code/jeffboard/cli/dist/index.js`, service account at `D:/code/jeffboard/cli/service-account.json`
- Web UI: React + Vite + Tailwind v4, components in src/components/
- Design brief exists at `.claude/design-brief.md`
- Meetings collection will be added as part of Epic 7 (Retro Tooling)

## Decision: No Git Branches for Parallel Work
User explicitly rejected git branching for burst mode. File reservation model chosen instead to avoid merge conflicts. Same directory, same branch, non-overlapping files.

## CLI Notes
- `create` requires `-t` and `--priority`, other fields optional
- Description field `-d` is used for the full user story text
- Default complexity is M if not specified
- Stories auto-increment short IDs (JB-1, JB-2, etc.)
- IMPORTANT: `update -a <agent>` sets the assignedAgent field, not just the activity log agent. When updating status as PM, use `-a <assigned-agent>` not `-a product-manager` to avoid reassigning the story.

## Plan File
Full epic/story details in `D:\code\jeffboard\ROADMAP_EPICS.md`
