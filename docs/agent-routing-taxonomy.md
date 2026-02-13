# Agent Routing Taxonomy

This document defines the story tag taxonomy and agent capability mapping used by JeffBoard's automatic agent routing system. It is the authoritative reference for JB-22 (tag UI/CLI) and JB-23 (routing logic implementation).

---

## 1. Story Tags

Stories are tagged with one or more of the following labels to describe the nature of the work. Tags are stored as a `string[]` on the story document.

| Tag | Description | Examples |
|-----|-------------|----------|
| `frontend` | Client-side UI implementation: React components, state management, styling, responsive layout, animations | Build Kanban board layout, Add dark mode toggle, Implement drag-and-drop |
| `backend` | Server-side logic: Cloud Functions, Cloud Run services, server-side data processing, scheduled jobs | Implement webhook dispatcher, Add scheduled cleanup function |
| `api` | API design and integration: HTTP endpoints, REST/GraphQL interfaces, third-party API consumption, CLI commands | Build CLI heartbeat command, Integrate Algolia search API |
| `database` | Data modeling and Firestore operations: schema changes, indexes, migration scripts, query optimization | Extend story schema with tokenUsage, Add composite index for filtering |
| `security` | Security-related work: authentication, authorization, Firestore rules, input validation, vulnerability remediation | Update security rules for new field, Audit auth flow for token leaks |
| `ui-design` | Visual design and UX: layout decisions, color systems, typography, interaction patterns, design system components | Design story card component, Create design brief, Establish color palette |
| `infrastructure` | DevOps and platform concerns: Firebase project config, hosting, CI/CD, environment management, deployment | Configure Firebase Hosting, Set up GitHub Actions pipeline |
| `testing` | Test authoring and test infrastructure: unit tests, integration tests, regression test definitions, test tooling | Write Cloud Function unit tests, Sync regression tests |
| `documentation` | Written artifacts: architecture docs, data model docs, READMEs, inline code documentation, taxonomy definitions | Update FIRESTORE_DATA_MODEL.md, Write API reference |
| `devops` | Operational concerns: monitoring, logging, alerting, performance profiling, cost optimization | Add stuck-agent alerting, Implement heartbeat monitoring |

### Tagging Guidelines

- **Apply 1-3 tags per story.** Most stories have a primary tag and optionally one or two secondary tags. More than 3 tags usually indicates the story should be split.
- **Tag the work, not the artifact.** A story that adds a Firestore field and builds a UI to display it should be tagged `database` + `frontend`, not just `frontend`.
- **Prefer specificity.** Use `security` over `backend` when the work is primarily about auth or access control. Use `ui-design` over `frontend` when the work is about design decisions rather than code implementation.
- **Unknown tags are allowed but discouraged.** The routing system will warn on tags not in this taxonomy but will not reject them. Unknown tags receive zero weight in routing.

---

## 2. Agent Capability Mapping

Each agent type has primary and secondary capability tags. Primary tags indicate the agent's core expertise -- the work they are best suited for. Secondary tags indicate competence -- the agent can handle this work but another agent might be a better fit.

### Capability Matrix

| Agent | Primary Tags | Secondary Tags |
|-------|-------------|----------------|
| **product-manager** | `documentation` | `ui-design`, `testing` |
| **solution-architect** | `database`, `infrastructure`, `documentation` | `backend`, `api`, `security` |
| **lead-engineer** | `frontend`, `backend`, `api`, `database` | `infrastructure`, `testing`, `devops` |
| **security-reviewer** | `security` | `backend`, `api`, `database` |
| **designer** | `ui-design`, `frontend` | `documentation`, `testing` |
| **quality-inspector** | `testing` | `documentation`, `security`, `frontend`, `backend` |

### Capability Rationale

**product-manager** -- Owns requirements and story definitions. Primary strength is documentation (writing stories, specs, roadmaps). Secondary awareness of UI design (for reviewing design proposals) and testing (for defining acceptance criteria and regression tests).

**solution-architect** -- Designs data models, system architecture, and infrastructure topology. Strongest in database schema design, infrastructure decisions, and architecture documentation. Competent in backend/API design and security modeling since these are architectural concerns.

**lead-engineer** -- The generalist implementer. Primary across all code-centric tags: frontend, backend, API, and database. Secondary in infrastructure, testing, and devops since the lead-engineer frequently touches these during feature implementation. This is the fallback agent when no specialist matches.

**security-reviewer** -- Specialist in security analysis. Primary only on the `security` tag. Secondary awareness of backend, API, and database since security issues often live in these layers.

**designer** -- Specialist in visual design, UX strategy, and UI consistency. Combines the roles of UI reviewer and UX strategist. Primary on `ui-design` and `frontend` (the visual implementation layer). Secondary in documentation (design briefs, component inventories) and testing (visual regression).

**quality-inspector** -- Specialist in verification and quality assurance. Primary on `testing`. Secondary across documentation (reviewing docs for accuracy), security (checking for obvious vulnerabilities), and implementation tags (reviewing code quality).

---

## 3. Scoring Model

When a story has tags, the routing system scores each agent using a weighted capability match. The agent with the highest score is recommended.

### Score Calculation

```
score(agent, story) = sum_over_tags(tag_weight(agent, tag)) + fallback_bonus(agent)
```

Where:

| Component | Value | Description |
|-----------|-------|-------------|
| Primary tag match | **3** | The tag appears in the agent's primary capability list |
| Secondary tag match | **1** | The tag appears in the agent's secondary capability list |
| No match | **0** | The agent has no declared capability for this tag |
| Fallback bonus | **0.5** | Applied only to `lead-engineer` when total score is 0 (ensures a default) |

### Normalization

The raw score is not normalized. Higher is better. Ties are broken by agent priority order (see below).

### Tie-Breaking Priority

When two or more agents have the same score, prefer the agent earlier in this list:

1. lead-engineer
2. solution-architect
3. security-reviewer
4. designer
5. quality-inspector
6. product-manager

Rationale: The lead-engineer is the most versatile implementer and the safest default. The product-manager is last because it rarely implements stories.

### Minimum Score Threshold

- If the highest-scoring agent has a score of **0** (no tag matches at all), route to `lead-engineer` as the default.
- The routing function should return a **ranked list** of agents (not just the top one) so the PM or human can make an informed override.

### Worked Examples

**Example 1: "Add tags field to story creation CLI and web UI"**
Tags: `frontend`, `api`

| Agent | Calculation | Score |
|-------|-------------|-------|
| lead-engineer | frontend(3) + api(3) | **6** |
| designer | frontend(3) + api(0) | **3** |
| solution-architect | frontend(0) + api(1) | **1** |
| security-reviewer | frontend(0) + api(1) | **1** |
| quality-inspector | frontend(1) + api(0) | **1** |
| product-manager | frontend(0) + api(0) | **0** |

Result: **lead-engineer** (score 6)

**Example 2: "Update Firestore security rules for new tags field"**
Tags: `security`, `database`

| Agent | Calculation | Score |
|-------|-------------|-------|
| security-reviewer | security(3) + database(1) | **4** |
| solution-architect | security(1) + database(3) | **4** |
| lead-engineer | security(0) + database(3) | **3** |
| quality-inspector | security(1) + database(0) | **1** |
| designer | security(0) + database(0) | **0** |
| product-manager | security(0) + database(0) | **0** |

Result: **lead-engineer** wins the tie-break (security-reviewer and solution-architect tied at 4, but reviewing the tie-break list: lead-engineer is at position 1, solution-architect at 2, security-reviewer at 3). Wait -- lead-engineer scored 3, not 4. The tie is between security-reviewer (4) and solution-architect (4). Tie-break: solution-architect (position 2) beats security-reviewer (position 3).

Result: **solution-architect** (score 4, wins tie-break over security-reviewer)

**Example 3: "Write architecture decision record for burst mode"**
Tags: `documentation`, `infrastructure`

| Agent | Calculation | Score |
|-------|-------------|-------|
| solution-architect | documentation(3) + infrastructure(3) | **6** |
| product-manager | documentation(3) + infrastructure(0) | **3** |
| lead-engineer | documentation(0) + infrastructure(1) | **1** |
| quality-inspector | documentation(1) + infrastructure(0) | **1** |
| designer | documentation(1) + infrastructure(0) | **1** |
| security-reviewer | documentation(0) + infrastructure(0) | **0** |

Result: **solution-architect** (score 6)

**Example 4: "Implement heartbeat status indicators on story cards"**
Tags: `frontend`, `devops`

| Agent | Calculation | Score |
|-------|-------------|-------|
| lead-engineer | frontend(3) + devops(1) | **4** |
| designer | frontend(3) + devops(0) | **3** |
| quality-inspector | frontend(1) + devops(0) | **1** |
| solution-architect | frontend(0) + devops(0) | **0** |
| security-reviewer | frontend(0) + devops(0) | **0** |
| product-manager | frontend(0) + devops(0) | **0** |

Result: **lead-engineer** (score 4)

**Example 5: Untagged story**
Tags: `[]` (empty)

All agents score 0. Fallback bonus applies to lead-engineer (0.5).

Result: **lead-engineer** (score 0.5)

---

## 4. Implementation Notes for JB-22 and JB-23

### For JB-22 (Tag UI/CLI)

- The `tags` field is a `string[]` on the Story document (added in JB-21).
- CLI `create` should accept `--tags <tag1,tag2,...>` and split on commas.
- CLI `update` should accept `--tags <tag1,tag2,...>` to replace tags (not append).
- Web UI should render tags as colored pills on story cards and in the detail sheet.
- Tag validation: warn on unknown tags (not in this taxonomy) but do not reject them.
- Suggested tag colors for UI rendering (Tailwind classes):

| Tag | Color |
|-----|-------|
| `frontend` | blue |
| `backend` | emerald |
| `api` | violet |
| `database` | amber |
| `security` | red |
| `ui-design` | pink |
| `infrastructure` | slate |
| `testing` | lime |
| `documentation` | sky |
| `devops` | orange |

### For JB-23 (Routing Logic)

- Implement the scoring function as a pure function: `rankAgents(tags: string[]): { agentId: string; score: number }[]`
- The capability matrix and weights from this document should be encoded as constants, not fetched from Firestore.
- Return the full ranked list sorted by score descending, then tie-break order.
- The PM agent calls this function and includes the top recommendation (with score) in a note on the story.
- If the user or PM passes an explicit `--agent` flag, skip routing entirely.

### Constants for Implementation

```typescript
const TAG_WEIGHTS = {
  PRIMARY: 3,
  SECONDARY: 1,
  NONE: 0,
  FALLBACK_BONUS: 0.5,
} as const;

const AGENT_CAPABILITIES: Record<string, { primary: string[]; secondary: string[] }> = {
  'product-manager': {
    primary: ['documentation'],
    secondary: ['ui-design', 'testing'],
  },
  'solution-architect': {
    primary: ['database', 'infrastructure', 'documentation'],
    secondary: ['backend', 'api', 'security'],
  },
  'lead-engineer': {
    primary: ['frontend', 'backend', 'api', 'database'],
    secondary: ['infrastructure', 'testing', 'devops'],
  },
  'security-reviewer': {
    primary: ['security'],
    secondary: ['backend', 'api', 'database'],
  },
  'designer': {
    primary: ['ui-design', 'frontend'],
    secondary: ['documentation', 'testing'],
  },
  'quality-inspector': {
    primary: ['testing'],
    secondary: ['documentation', 'security', 'frontend', 'backend'],
  },
};

const TIE_BREAK_ORDER: string[] = [
  'lead-engineer',
  'solution-architect',
  'security-reviewer',
  'designer',
  'quality-inspector',
  'product-manager',
];
```

---

## 5. Taxonomy Versioning

This taxonomy will evolve as new agent types are added or existing agents gain new capabilities. When updating:

1. Add or modify tags in the table in Section 1.
2. Update the capability matrix in Section 2.
3. Re-verify the worked examples in Section 3 still produce correct results.
4. Update the constants block in Section 4.
5. Bump this version note.

**Current version:** 1.1 (JB-36: consolidated ui-consistency-reviewer and ux-design-strategist into designer)
