# AgentBoard CLI

Command-line tool for AI agents to update the AgentBoard Kanban board.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Firebase Service Account

The CLI tool uses the Firebase Admin SDK to write data to Firestore. You need a service account key:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings > Service Accounts
4. Click "Generate New Private Key"
5. Save the JSON file to a secure location (DO NOT commit to git)

### 3. Configure Service Account Path

Set the `AGENTBOARD_SERVICE_ACCOUNT` environment variable:

```bash
export AGENTBOARD_SERVICE_ACCOUNT=/path/to/your-service-account.json
```

Or create a `.env` file in the `cli` directory:

```
AGENTBOARD_SERVICE_ACCOUNT=/path/to/your-service-account.json
```

Alternatively, pass the path with the `--service-account` flag on each command.

### 4. Build the CLI

```bash
npm run build
```

### 5. Seed Initial Data

```bash
npm start seed -- --uid <your-firebase-auth-uid>
```

To get your Firebase Auth UID:
1. Sign in to the AgentBoard PWA once
2. Open browser console
3. Run: `firebase.auth().currentUser.uid`
4. Copy the UID and use it in the seed command above

## Usage

### Update Story Status

```bash
npm start update -- --story KB-14 --status in-progress --agent lead-engineer
```

With a note:

```bash
npm start update -- --story KB-14 --status in-progress --agent lead-engineer --note "Started implementation"
```

Block a story:

```bash
npm start update -- --story KB-14 --status blocked --agent lead-engineer --reason "Waiting for API key"
```

### Create a New Story

```bash
npm start create -- \
  --project proj_abc123 \
  --title "Implement password reset flow" \
  --priority P1 \
  --complexity M \
  --agent lead-engineer
```

With full details:

```bash
npm start create -- \
  --project proj_abc123 \
  --title "Implement password reset flow" \
  --description "Add password reset functionality to auth module" \
  --user-story "As a user, I want to reset my password so that I can regain access to my account" \
  --epic "Authentication" \
  --priority P1 \
  --complexity M \
  --agent lead-engineer
```

### Add a Note to a Story

```bash
npm start note -- --story KB-14 --text "Refactored auth module for better testability" --author lead-engineer
```

### List Stories

List all stories:

```bash
npm start list
```

Filter by project:

```bash
npm start list -- --project proj_abc123
```

Filter by status:

```bash
npm start list -- --status in-progress
```

Combine filters:

```bash
npm start list -- --project proj_abc123 --status in-progress
```

### Seed Sample Data

Seed agents only:

```bash
npm start seed -- --agents-only
```

Seed agents, sample project, and stories:

```bash
npm start seed -- --uid <your-firebase-auth-uid>
```

## Command Reference

### `agentboard update`

Update a story's status.

**Required:**
- `-s, --story <storyId>` - Story ID or short ID (e.g., KB-14)
- `--status <status>` - New status: backlog, in-design, in-progress, in-review, done, blocked
- `-a, --agent <agent>` - Agent making the change

**Optional:**
- `-r, --reason <reason>` - Blocked reason (required if status is blocked)
- `-n, --note <note>` - Optional note about the change

### `agentboard create`

Create a new story.

**Required:**
- `-p, --project <projectId>` - Project ID
- `-t, --title <title>` - Story title
- `--priority <priority>` - Priority: P0, P1, P2, P3

**Optional:**
- `-d, --description <description>` - Story description
- `-u, --user-story <userStory>` - User story statement
- `-e, --epic <epicName>` - Epic name
- `-c, --complexity <complexity>` - Complexity: S, M, L, XL (default: M)
- `-a, --agent <agent>` - Assigned agent

### `agentboard note`

Add a note to a story.

**Required:**
- `-s, --story <storyId>` - Story ID or short ID
- `-t, --text <text>` - Note text

**Optional:**
- `-a, --author <author>` - Note author (default: "user")

### `agentboard list`

List stories.

**Optional:**
- `-p, --project <projectId>` - Filter by project ID
- `-s, --status <status>` - Filter by status

### `agentboard seed`

Seed Firestore with sample data.

**Optional:**
- `--uid <uid>` - Firebase Auth UID to add to allowedUsers
- `--agents-only` - Only seed agents collection

## Global Options

- `--service-account <path>` - Path to Firebase service account JSON file

## Integration with AI Agents

AI agents should call the CLI tool during their workflow to update the board:

### Example: Lead Engineer Workflow

```bash
# Agent picks up a story from backlog
agentboard update --story KB-14 --status in-progress --agent lead-engineer

# Agent adds a note
agentboard note --story KB-14 --text "Implementing authentication module" --author lead-engineer

# Agent completes work and moves to review
agentboard update --story KB-14 --status in-review --agent lead-engineer --note "Implementation complete"
```

### Example: Product Manager Workflow

```bash
# PM creates a new story
agentboard create \
  --project proj_abc123 \
  --title "Add user profile page" \
  --priority P1 \
  --complexity M \
  --epic "User Management" \
  --agent product-manager

# PM moves story to design phase
agentboard update --story KB-15 --status in-design --agent product-manager
```

## Troubleshooting

### "Failed to initialize Firebase"

Make sure:
1. Service account JSON file exists at the specified path
2. The file is valid JSON
3. The service account has Firestore permissions

### "Story not found"

The story ID or short ID doesn't exist. Use `agentboard list` to see available stories.

### "Invalid status"

Valid statuses are: backlog, in-design, in-progress, in-review, done, blocked

### "Project not found"

The project ID doesn't exist. Use the Firebase Console or seed command to create a project first.
