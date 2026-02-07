# AgentBoard

A Progressive Web App (PWA) Kanban board for monitoring AI agent work. Built for iPhone-first mobile access with real-time updates via Firebase Firestore.

## Overview

AgentBoard provides a visual, mobile-friendly way to monitor the status of work being done by a team of AI agents. View stories moving across Kanban columns in real-time as agents update their progress through a command-line interface.

## Features

- **iPhone-First PWA** - Optimized for mobile, installable on iOS Home Screen
- **Real-Time Updates** - Live board updates via Firestore listeners
- **Six Kanban Columns** - Backlog, In Design, In Progress, In Review, Done, Blocked
- **Agent Integration** - CLI tool for agents to update story status
- **Multi-Project Support** - Manage multiple projects from one board
- **Dark Mode** - Respects system preference
- **Mobile-First Design** - Swipeable columns, touch-optimized UI

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Backend**: Firebase (Firestore, Auth, Hosting)
- **PWA**: vite-plugin-pwa with Workbox
- **CLI**: Node.js + Commander + firebase-admin

## Project Structure

```
agentboard/
├── src/                    # React PWA source code
│   ├── components/         # React components
│   ├── hooks/             # Custom React hooks
│   ├── services/          # Firebase client SDK
│   ├── stores/            # Zustand stores
│   ├── types/             # TypeScript types
│   ├── utils/             # Utility functions
│   └── styles/            # Global styles
├── cli/                   # CLI tool for agents
│   ├── src/
│   │   ├── commands/      # CLI commands
│   │   └── lib/           # Firebase Admin SDK
│   └── README.md          # CLI documentation
├── public/                # Static assets
├── firebase.json          # Firebase configuration
├── firestore.rules        # Firestore security rules
├── firestore.indexes.json # Firestore indexes
└── FIRESTORE_DATA_MODEL.md # Data model documentation
```

## Getting Started

### Prerequisites

- Node.js 20.x or later
- Firebase project (create at https://console.firebase.google.com)
- Firebase CLI (`npm install -g firebase-tools`)

### 1. Firebase Setup

1. Create a new Firebase project in the [Firebase Console](https://console.firebase.google.com)
2. Enable Firestore in your project
3. Enable Firebase Authentication with Google provider
4. Note your Firebase project configuration values

### 2. Clone and Install

```bash
cd D:/code/agentboard
npm install
cd cli && npm install && cd ..
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your Firebase credentials:

```bash
cp .env.example .env
```

Edit `.env` with your Firebase project configuration:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### 4. Deploy Firestore Rules and Indexes

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### 5. Create Firebase Service Account (for CLI)

1. Go to Firebase Console > Project Settings > Service Accounts
2. Click "Generate New Private Key"
3. Save the JSON file securely (outside the repo)
4. Set the environment variable:

```bash
export AGENTBOARD_SERVICE_ACCOUNT=/path/to/service-account.json
```

### 6. Seed Initial Data

First, sign in to the PWA once to get your Firebase Auth UID. Then seed the database:

```bash
cd cli
npm run build
npm start seed -- --uid YOUR_FIREBASE_AUTH_UID
```

### 7. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## CLI Tool Usage

The CLI tool allows AI agents to update story status. See `cli/README.md` for full documentation.

### Quick Examples

Update story status:

```bash
cd cli
npm start update -- --story AB-3 --status in-progress --agent lead-engineer
```

Create a new story:

```bash
npm start create -- \
  --project proj_abc123 \
  --title "Implement feature X" \
  --priority P1 \
  --agent lead-engineer
```

Add a note:

```bash
npm start note -- --story AB-3 --text "Completed testing" --author lead-engineer
```

List stories:

```bash
npm start list
```

## Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Firebase Hosting

```bash
firebase deploy --only hosting
```

Your PWA will be available at `https://your-project-id.web.app`

## Architecture

### Data Model

See `FIRESTORE_DATA_MODEL.md` for complete documentation.

**Collections:**
- `projects` - Project definitions
- `stories` - Story documents (top-level)
- `stories/{id}/activity` - Status change history (subcollection)
- `agents` - Agent configuration (6 predefined agents)
- `counters` - Auto-increment counters for story IDs
- `config` - Configuration (allowed users)

### Security

- **PWA**: Read-only access for authenticated users
- **CLI**: Writes via Firebase Admin SDK (bypasses security rules)
- **Authentication**: Google Sign-In via Firebase Auth
- **Authorization**: Single-user (UID whitelist in `config/allowedUsers`)

### Real-Time Updates

The PWA uses Firestore `onSnapshot` listeners to receive real-time updates when agents modify stories. Changes appear on the board within 1-2 seconds of CLI writes.

## Development Workflow

### Epic 1: Foundation (Complete)

- [x] Firebase project and Firestore configuration
- [x] React + Vite + TypeScript scaffold
- [x] Tailwind CSS with mobile-first design
- [x] PWA configuration with service worker
- [x] Firebase client SDK integration
- [x] Zustand state management
- [x] CLI tool with firebase-admin
- [x] Seed command with sample data

### Next: Epic 2 - Kanban Board UI

- [ ] Swipeable column layout for mobile
- [ ] Story card components
- [ ] Real-time Firestore listeners
- [ ] Project selector
- [ ] Card detail view

## Documentation

- [Firestore Data Model](./FIRESTORE_DATA_MODEL.md) - Database schema and queries
- [CLI Tool Documentation](./cli/README.md) - CLI usage and commands

## License

MIT
