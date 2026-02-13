# JeffBoard

A Progressive Web App (PWA) Kanban board for monitoring AI agent work. Built for iPhone-first mobile access with real-time updates via Firebase Firestore.

## Overview

JeffBoard provides a visual, mobile-friendly way to monitor the status of work being done by a team of AI agents. View stories moving across Kanban columns in real-time as agents update their progress through a command-line interface.

### Key Features

- **iPhone-First PWA** - Optimized for mobile, installable on iOS Home Screen
- **Real-Time Updates** - Live board updates via Firestore listeners (1-2 second latency)
- **Six Kanban Columns** - Backlog, In Design, In Progress, In Review, Done, Blocked
- **Agent Integration** - CLI tool for agents to update story status
- **Multi-Project Support** - Manage multiple projects from one board
- **Dark Mode** - Respects system preference
- **Mobile-First Design** - Swipeable columns, touch-optimized UI

### Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand
- **Backend**: Firebase (Firestore, Auth, Hosting)
- **PWA**: vite-plugin-pwa with Workbox service worker
- **CLI**: Node.js + Commander + firebase-admin SDK

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup Guide](#detailed-setup-guide)
- [Deployment](#deployment)
- [CLI Tool Usage](#cli-tool-usage)
- [iPhone Installation](#iphone-installation)
- [Agent Integration Guide](#agent-integration-guide)
- [Project Structure](#project-structure)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [Documentation](#documentation)

---

## Prerequisites

- Node.js 20.x or later
- npm 10.x or later
- Firebase CLI (`npm install -g firebase-tools`)
- A Google account for Firebase and authentication
- An iPhone (iOS 16.4+) for the PWA experience

---

## Quick Start

For experienced developers who want to get up and running fast:

```bash
# 1. Clone and install
cd D:/code/jeffboard
npm install
cd cli && npm install && cd ..

# 2. Create Firebase project at https://console.firebase.google.com
# Enable Firestore, Firebase Auth (Google provider), and Hosting

# 3. Configure environment
cp .env.example .env
# Edit .env with your Firebase config values

# 4. Login and initialize Firebase
firebase login
firebase use --add  # Select your project

# 5. Deploy Firestore configuration
npm run deploy:firestore

# 6. Generate service account key (for CLI)
# Go to Firebase Console > Project Settings > Service Accounts > Generate New Private Key
export JEFFBOARD_SERVICE_ACCOUNT=/path/to/service-account.json

# 7. Seed initial data
cd cli && npm run build && npm start seed -- --uid YOUR_AUTH_UID && cd ..

# 8. Deploy to Firebase Hosting
npm run deploy:hosting

# 9. Open the hosted URL and sign in
```

See [Detailed Setup Guide](#detailed-setup-guide) for step-by-step instructions.

---

## Detailed Setup Guide

### Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project" or "Create a project"
3. Enter a project name (e.g., "jeffboard" or "my-jeffboard")
4. Disable Google Analytics (optional, not needed for this app)
5. Click "Create project"

### Step 2: Enable Firestore

1. In your Firebase project, click "Firestore Database" in the left sidebar
2. Click "Create database"
3. Select "Start in production mode" (we'll deploy custom rules later)
4. Choose a Firestore location (e.g., `us-central1`)
5. Click "Enable"

### Step 3: Enable Firebase Authentication

1. Click "Authentication" in the left sidebar
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Click "Google" in the providers list
5. Toggle "Enable"
6. Enter a project support email (your Google account email)
7. Click "Save"

### Step 4: Get Firebase Configuration

1. In Firebase Console, click the gear icon next to "Project Overview"
2. Click "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon (`</>`) to add a web app
5. Register app with nickname (e.g., "JeffBoard PWA")
6. Copy the Firebase configuration object (you'll need these values)

### Step 5: Clone and Install Dependencies

```bash
# Navigate to the project directory
cd D:/code/jeffboard

# Install PWA dependencies
npm install

# Install CLI dependencies
cd cli
npm install
cd ..
```

### Step 6: Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and fill in your Firebase configuration values from Step 4:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

**Note**: These values are safe to expose in client-side code. They are NOT secrets. Firestore security rules control access, not these config values.

### Step 7: Configure Firebase CLI

```bash
# Login to Firebase (opens browser)
firebase login

# Link this directory to your Firebase project
firebase use --add
# Select your project from the list
# Give it an alias (e.g., "default")
```

This will create or update `.firebaserc` with your project ID.

### Step 8: Generate Service Account Key (for CLI)

The CLI tool needs a service account key to write to Firestore using the Admin SDK.

1. Go to Firebase Console > Project Settings > Service Accounts
2. Click "Generate new private key"
3. Click "Generate key" in the confirmation dialog
4. Save the JSON file to a secure location **outside this repository**
   - Example: `D:/firebase-keys/jeffboard-service-account.json`
5. Set the environment variable:

**Windows (PowerShell):**
```powershell
$env:JEFFBOARD_SERVICE_ACCOUNT="D:/firebase-keys/jeffboard-service-account.json"
```

**macOS/Linux:**
```bash
export JEFFBOARD_SERVICE_ACCOUNT=/path/to/service-account.json
```

**Permanent Setup (Optional):**
- Windows: Add to System Environment Variables
- macOS/Linux: Add the export line to your `~/.bashrc` or `~/.zshrc`

### Step 9: Deploy Firestore Rules and Indexes

```bash
# Deploy security rules and composite indexes
npm run deploy:firestore

# Or deploy them separately:
# npm run deploy:rules
# npm run deploy:indexes
```

This deploys:
- `firestore.rules` - Security rules (read-only for authenticated users)
- `firestore.indexes.json` - Composite indexes for efficient queries

**Wait for indexes to build** (usually 1-5 minutes). You can check status:
```bash
firebase firestore:indexes
```

### Step 10: Get Your Firebase Auth UID

Before seeding data, you need your Firebase Auth UID:

1. Run the development server:
   ```bash
   npm run dev
   ```
2. Open http://localhost:5173 in your browser
3. Sign in with Google
4. Open browser DevTools Console (F12)
5. Run this command:
   ```javascript
   firebase.auth().currentUser.uid
   ```
6. Copy the UID (e.g., `abc123xyz456`)

### Step 11: Seed Initial Data

```bash
cd cli
npm run build
npm start seed -- --uid YOUR_AUTH_UID_HERE
cd ..
```

This creates:
- 6 predefined agents (solution-architect, lead-engineer, etc.)
- A sample project
- 10 sample stories across all statuses
- Your UID in the allowed users list

### Step 12: Test Locally

```bash
npm run dev
```

Open http://localhost:5173 and sign in. You should see:
- The sample project in the project selector
- Stories distributed across the Kanban columns
- Real-time updates when you use the CLI to modify stories

### Step 13: Deploy to Firebase Hosting

```bash
# Build and deploy everything
npm run deploy

# Or just deploy hosting (after UI changes)
npm run deploy:hosting
```

Your app will be live at:
```
https://YOUR_PROJECT_ID.web.app
https://YOUR_PROJECT_ID.firebaseapp.com
```

🎉 **You're done!** Visit the URL on your iPhone to add it to your Home Screen.

---

## Deployment

### Available Deploy Scripts

```bash
# Build and deploy everything (hosting + rules + indexes)
npm run deploy

# Deploy only hosting (after UI changes)
npm run deploy:hosting

# Deploy only Firestore rules
npm run deploy:rules

# Deploy only Firestore indexes
npm run deploy:indexes

# Deploy both rules and indexes
npm run deploy:firestore
```

### Typical Deployment Workflow

**After code changes:**
```bash
npm run deploy:hosting
```

**After Firestore rules changes:**
```bash
npm run deploy:rules
```

**After data model changes (new queries):**
```bash
npm run deploy:indexes
```

### Build Output

The build process:
1. Compiles TypeScript to JavaScript
2. Bundles React app with Vite
3. Generates service worker with Workbox
4. Outputs to `dist/` directory

The `dist/` directory contains:
- `index.html` - Main HTML file
- `assets/` - Bundled JS and CSS with content hashes
- `sw.js` - Service worker for offline support
- `manifest.json` - PWA manifest
- `icons/` - App icons for various sizes

---

## CLI Tool Usage

The CLI tool allows AI agents to create and update stories from the command line.

### Basic Commands

**Update story status:**
```bash
cd cli
npm start update -- --story AB-3 --status in-progress --agent lead-engineer
```

**Create a new story:**
```bash
npm start create -- \
  --project proj_abc123 \
  --title "Implement feature X" \
  --priority P1 \
  --agent lead-engineer
```

**Add a note to a story:**
```bash
npm start note -- --story AB-3 --text "Completed testing" --author lead-engineer
```

**List all stories:**
```bash
npm start list
```

**List stories for a specific project:**
```bash
npm start list -- --project proj_abc123
```

**List stories by status:**
```bash
npm start list -- --status in-progress
```

### Story Statuses

Valid status values:
- `backlog` - Not yet started
- `in-design` - Being designed/planned
- `in-progress` - Actively being worked on
- `in-review` - Awaiting review
- `done` - Completed
- `blocked` - Blocked by external dependency

### Priority Levels

Valid priority values:
- `P0` - Critical (red badge)
- `P1` - High (orange badge)
- `P2` - Medium (yellow badge)
- `P3` - Low (blue badge)

### Agents

Pre-seeded agents:
- `solution-architect` - Designs system architecture
- `lead-engineer` - Implements features
- `qa-specialist` - Tests and validates
- `devops-engineer` - Handles deployment and infrastructure
- `ux-designer` - Designs user experience
- `product-manager` - Manages product direction

### CLI Examples

**Agent starting work:**
```bash
npm start update -- --story KB-14 --status in-progress --agent lead-engineer
```

**Agent blocked:**
```bash
npm start update -- --story KB-14 --status blocked --agent lead-engineer
npm start note -- --story KB-14 --text "Waiting for API keys from client" --author lead-engineer
```

**Agent completing work:**
```bash
npm start update -- --story KB-14 --status in-review --agent lead-engineer
npm start note -- --story KB-14 --text "Ready for review" --author lead-engineer
```

**Creating a new story:**
```bash
npm start create -- \
  --project proj_abc123 \
  --title "Add user authentication" \
  --priority P0 \
  --agent lead-engineer
```

### File Reservations (Burst Mode)

When burst mode is enabled and multiple stories run in parallel, agents can reserve files to prevent merge conflicts:

**Reserve files for a story:**
```bash
npm start reserve -- -s JB-18 --files src/App.tsx,src/components/Board.tsx
```

**Check for conflicts:**
```bash
npm start reserve -- -s JB-18 --check
```

**Request a file from another story:**
```bash
# Agent working on JB-20 needs a file held by JB-18
npm start reserve -- -s JB-20 --request --file src/App.tsx
# → JB-20 moves to blocked, notes added to both stories
```

**Release files when done:**
```bash
npm start reserve -- -s JB-18 --release
# → Clears reservations and unblocks waiting stories
```

This prevents parallel agents from creating merge conflicts when working on the same files.

### Full CLI Documentation

See [`cli/README.md`](./cli/README.md) for complete CLI documentation including:
- All available commands and options
- Environment variable configuration
- Error handling
- Integration patterns

---

## iPhone Installation

### Adding to Home Screen

1. Open Safari on your iPhone
2. Navigate to your deployed Firebase Hosting URL
   - `https://YOUR_PROJECT_ID.web.app`
3. Sign in with Google
4. Tap the Share button (square with arrow pointing up)
5. Scroll down and tap "Add to Home Screen"
6. Edit the name if desired (default: "JeffBoard")
7. Tap "Add" in the top right

The app will now appear as an icon on your Home Screen and run in standalone mode (no Safari UI).

### PWA Features on iOS

- **Standalone mode** - Runs fullscreen without browser chrome
- **Offline support** - Service worker caches app shell
- **App-like experience** - Native feel with no URL bar
- **Push to Home Screen** - Quick access from Home Screen
- **Splash screen** - Shows app icon/name on launch

### iOS PWA Limitations

- No push notifications (iOS limitation)
- No background sync (iOS limitation)
- Must be added via Safari (not Chrome or Firefox)
- Service worker has limited cache control

Despite these limitations, the PWA provides an excellent mobile experience for viewing the Kanban board.

---

## Agent Integration Guide

### Integrating with Claude Code Agents

JeffBoard is designed to integrate with Claude Code agents (or any AI agent with CLI access).

#### Pattern 1: Status Updates at Workflow Stages

**Solution Architect Agent:**
```bash
# Starting design work
jeffboard update --story AB-5 --status in-design --agent solution-architect

# Design complete
jeffboard update --story AB-5 --status backlog --agent solution-architect
jeffboard note --story AB-5 --text "Architecture document completed" --author solution-architect
```

**Lead Engineer Agent:**
```bash
# Starting implementation
jeffboard update --story AB-5 --status in-progress --agent lead-engineer

# Implementation complete
jeffboard update --story AB-5 --status in-review --agent lead-engineer
jeffboard note --story AB-5 --text "Implementation complete, ready for review" --author lead-engineer
```

**QA Specialist Agent:**
```bash
# Starting testing
jeffboard update --story AB-5 --status in-review --agent qa-specialist

# Testing complete
jeffboard update --story AB-5 --status done --agent qa-specialist
jeffboard note --story AB-5 --text "All tests passing" --author qa-specialist
```

#### Pattern 2: Progress Notes During Work

```bash
# Agent starting work
jeffboard update --story AB-8 --status in-progress --agent lead-engineer

# Agent making progress (periodic notes)
jeffboard note --story AB-8 --text "Completed user authentication module" --author lead-engineer
jeffboard note --story AB-8 --text "Working on database integration" --author lead-engineer

# Agent encountering blocker
jeffboard update --story AB-8 --status blocked --agent lead-engineer
jeffboard note --story AB-8 --text "Need database credentials from DevOps" --author lead-engineer

# Agent unblocked
jeffboard update --story AB-8 --status in-progress --agent lead-engineer
jeffboard note --story AB-8 --text "Credentials received, resuming work" --author lead-engineer
```

#### Pattern 3: Creating Stories from Epics

```bash
# Solution Architect breaks epic into stories
jeffboard create --project proj_abc123 --title "Design API schema" --priority P0 --agent solution-architect
jeffboard create --project proj_abc123 --title "Implement REST endpoints" --priority P1 --agent lead-engineer
jeffboard create --project proj_abc123 --title "Write API tests" --priority P1 --agent qa-specialist
```

#### Integration with Agent Memory

Agents should record the project ID in their memory:

```markdown
# Agent Memory

## Current Project
- Project ID: `proj_abc123`
- Project Name: "E-commerce Platform"

## JeffBoard Integration
- Use `jeffboard update` to change story status
- Use `jeffboard note` to log progress
- Use `jeffboard list --project proj_abc123` to see current workload
```

#### Automation Example

Add CLI path to agent's environment:

```bash
# In agent's shell profile or memory
export PATH="$PATH:D:/code/jeffboard/cli/dist"
export JEFFBOARD_SERVICE_ACCOUNT="D:/firebase-keys/jeffboard-service-account.json"

# Now agent can run commands directly
jeffboard update --story AB-3 --status in-progress --agent lead-engineer
```

---

## Project Structure

```
jeffboard/
├── src/                          # React PWA source code
│   ├── components/               # React components
│   │   ├── auth/                # Authentication components
│   │   │   ├── AuthProvider.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── board/               # Kanban board components
│   │   │   ├── KanbanBoard.tsx
│   │   │   ├── KanbanColumn.tsx
│   │   │   ├── StoryCard.tsx
│   │   │   ├── StoryDetailSheet.tsx
│   │   │   ├── EmptyColumn.tsx
│   │   │   └── ColumnTabs.tsx
│   │   ├── filters/             # Filter controls
│   │   │   ├── AgentFilter.tsx
│   │   │   ├── PriorityFilter.tsx
│   │   │   └── SearchBar.tsx
│   │   ├── layout/              # App shell and layout
│   │   │   ├── AppHeader.tsx
│   │   │   ├── ProjectSelector.tsx
│   │   │   ├── AgentSummaryBar.tsx
│   │   │   ├── BlockedBanner.tsx
│   │   │   └── ToastContainer.tsx
│   │   └── shared/              # Reusable UI components
│   │       ├── AgentAvatar.tsx
│   │       ├── PriorityBadge.tsx
│   │       ├── RelativeTime.tsx
│   │       └── LoadingSkeleton.tsx
│   ├── hooks/                   # Custom React hooks
│   │   ├── useStories.ts        # Real-time stories listener
│   │   ├── useProjects.ts       # Real-time projects listener
│   │   ├── useAgents.ts         # Agents data fetcher
│   │   └── useStoryActivity.ts  # Activity history fetcher
│   ├── services/                # Firebase client SDK
│   │   ├── firebase.ts          # Firebase initialization
│   │   ├── auth.ts              # Auth service
│   │   └── firestore.ts         # Firestore service
│   ├── stores/                  # Zustand stores
│   │   ├── boardStore.ts        # Board state (filters, selection)
│   │   └── toastStore.ts        # Toast notifications
│   ├── types/                   # TypeScript types
│   │   └── index.ts             # All type definitions
│   ├── utils/                   # Utility functions
│   │   ├── constants.ts         # Status/priority constants
│   │   ├── formatting.ts        # Date/time formatters
│   │   └── sorting.ts           # Story sorting logic
│   └── styles/                  # Global styles
│       └── index.css            # Tailwind imports
├── cli/                         # CLI tool for agents
│   ├── src/
│   │   ├── commands/            # CLI commands
│   │   │   ├── create.ts
│   │   │   ├── update.ts
│   │   │   ├── note.ts
│   │   │   ├── list.ts
│   │   │   └── seed.ts
│   │   ├── lib/                 # Firebase Admin SDK
│   │   │   ├── firebase.ts      # Admin SDK initialization
│   │   │   └── idGenerator.ts   # Short ID generation
│   │   └── index.ts             # CLI entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md                # CLI documentation
├── public/                      # Static assets
│   ├── icons/                   # PWA icons
│   ├── manifest.json            # PWA manifest
│   └── vite.svg
├── .env.example                 # Environment template
├── .env                         # Environment variables (gitignored)
├── firebase.json                # Firebase configuration
├── firestore.rules              # Firestore security rules
├── firestore.indexes.json       # Firestore composite indexes
├── package.json                 # PWA dependencies & scripts
├── vite.config.ts               # Vite configuration
├── tailwind.config.ts           # Tailwind configuration
├── tsconfig.json                # TypeScript configuration
├── FIRESTORE_DATA_MODEL.md      # Data model documentation
└── README.md                    # This file
```

---

## Development

### Running Locally

```bash
# Start development server (PWA)
npm run dev

# Build TypeScript (CLI)
cd cli && npm run build && cd ..

# Watch mode (CLI)
cd cli && npm run dev
```

### Building

```bash
# Build PWA for production
npm run build

# Build CLI
cd cli && npm run build && cd ..
```

### Linting

```bash
npm run lint
```

### Preview Production Build

```bash
npm run build
npm run preview
```

### Firebase Emulators (Optional)

For local development with Firebase emulators:

```bash
firebase emulators:start
```

Then update `.env` to point to local emulators:
```env
VITE_FIREBASE_FIRESTORE_EMULATOR=localhost:8080
VITE_FIREBASE_AUTH_EMULATOR=localhost:9099
```

---

## Troubleshooting

### "Permission denied" when using CLI

**Problem**: CLI can't write to Firestore

**Solution**:
1. Verify `JEFFBOARD_SERVICE_ACCOUNT` environment variable is set
2. Verify the service account JSON file exists at that path
3. Verify the service account has "Firebase Admin SDK Administrator" role
4. Try running with the environment variable inline:
   ```bash
   JEFFBOARD_SERVICE_ACCOUNT=/path/to/key.json npm start update -- ...
   ```

### "Index not found" errors

**Problem**: Query requires a composite index that isn't deployed

**Solution**:
```bash
npm run deploy:indexes
```

Wait 1-5 minutes for indexes to build. Check status:
```bash
firebase firestore:indexes
```

### PWA not updating after deployment

**Problem**: Service worker is caching old version

**Solution**:
1. On iPhone: Close the app completely (swipe up from app switcher)
2. Reopen the app
3. If still showing old version, remove from Home Screen and re-add

### "Not authenticated" errors in PWA

**Problem**: User is not in the allowed users list

**Solution**:
1. Get your Firebase Auth UID (see Step 10 in setup)
2. Re-run seed command with your UID:
   ```bash
   cd cli && npm start seed -- --uid YOUR_UID && cd ..
   ```

### Stories not appearing in PWA

**Problem**: No stories in the database, or filtered out

**Solution**:
1. Run seed command to create sample data
2. Check filters in the UI (agent filter, priority filter)
3. Verify you're viewing the correct project in the project selector

### Build errors with Tailwind v4

**Problem**: PostCSS errors or `@tailwind` directives not working

**Solution**: Ensure you have the correct Tailwind v4 setup:
1. `postcss.config.js` should use `'@tailwindcss/postcss': {}`
2. `src/styles/index.css` should use `@import 'tailwindcss'` not `@tailwind`
3. Remove any `@apply` directives (not supported in v4)

---

## Documentation

- [Firestore Data Model](./FIRESTORE_DATA_MODEL.md) - Database schema, collections, and queries
- [CLI Tool Documentation](./cli/README.md) - Complete CLI reference
- [Component Tree](./COMPONENT_TREE.md) - React component hierarchy
- [Epic 3 Implementation](./EPIC_3_IMPLEMENTATION.md) - Kanban board implementation notes
- [Authentication Guide](./AUTHENTICATION.md) - Auth flow and security

### External Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [PWA Documentation](https://web.dev/progressive-web-apps/)

---

## Architecture

### Data Flow

1. Agent runs `jeffboard update --story AB-3 --status in-progress`
2. CLI writes to Firestore using Admin SDK (bypasses security rules)
3. PWA's `onSnapshot` listener fires within 1-2 seconds
4. React re-renders the affected story card
5. If card moved columns, toast notification appears
6. Card animates into new position in the correct column

### Security Model

- **PWA**: Read-only access for authenticated users via Firebase Auth
- **CLI**: Writes using Firebase Admin SDK (bypasses security rules)
- **Authorization**: Single-user model with UID whitelist in `config/allowedUsers`
- **No Cloud Functions**: All writes via CLI, all reads via client SDK

### Firebase Collections

- `projects` - Project definitions
- `stories` - Story documents (top-level, not subcollection)
- `stories/{id}/activity` - Activity history (subcollection)
- `agents` - Agent definitions (6 predefined)
- `counters` - Auto-increment counters for short story IDs
- `config/allowedUsers` - UID whitelist for authentication

See [FIRESTORE_DATA_MODEL.md](./FIRESTORE_DATA_MODEL.md) for complete schema.

---

## Cost Analysis

**Firebase Spark Plan (Free Tier) is sufficient for this app.**

| Resource | Free Limit | Projected Usage | Headroom |
|----------|-----------|-----------------|----------|
| Firestore reads | 50,000/day | ~1,300/day | 38x |
| Firestore writes | 20,000/day | ~130/day | 153x |
| Firestore storage | 1 GiB | <1 MiB | 1000x+ |
| Hosting storage | 10 GiB | ~5 MiB | 2000x+ |
| Hosting transfer | 360 MiB/day | ~10 MiB/day | 36x |
| Auth users | Unlimited | 1 | N/A |

Even at 10x the projected usage, you won't approach any limits.

---

## License

MIT

---

## Support

For issues, questions, or contributions:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review the [Documentation](#documentation)
3. Open an issue in the repository

---

**Built with Claude Code agents for Claude Code agents.** 🤖
