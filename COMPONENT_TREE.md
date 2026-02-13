# JeffBoard Component Tree

Visual reference for the React component hierarchy in the JeffBoard application.

## Application Structure

```
App (Router + AuthProvider)
├── LoginPage                        (/login route)
│   └── Google Sign-In UI
│
└── ProtectedRoute                   (/ route - requires auth)
    └── BoardPage
        ├── AppHeader
        │   ├── App Title ("JeffBoard")
        │   ├── ProjectSelector (dropdown)
        │   │   └── Project list with "All Projects" option
        │   └── User Avatar + Sign Out button
        │
        ├── BlockedBanner (conditional - only if blocked stories exist)
        │   └── "N stories blocked • Tap to view"
        │
        ├── AgentSummaryBar (conditional - only if stories exist)
        │   └── [AgentAvatar + count] for each active agent
        │
        ├── KanbanBoard (main content area)
        │   ├── ColumnTabs
        │   │   └── [Tab button] × 6 (Backlog, In Design, In Progress, In Review, Done, Blocked)
        │   │
        │   └── Swipeable Columns Container (CSS scroll-snap)
        │       └── [KanbanColumn] × 6
        │           ├── Column Header (name + story count)
        │           └── Cards Container (scrollable)
        │               ├── EmptyColumn (if no stories)
        │               └── [StoryCard] × N
        │                   ├── AgentAvatar
        │                   ├── Story ID (e.g., KB-14)
        │                   ├── Priority Badge (P0-P3)
        │                   ├── Title (2-line clamp)
        │                   ├── Agent name
        │                   └── RelativeTime ("2h ago")
        │
        ├── StoryDetailSheet (modal - conditional on selectedStoryId)
        │   ├── Backdrop (click to close)
        │   └── Bottom Sheet
        │       ├── Sticky Header
        │       │   ├── Story ID + Priority Badge
        │       │   ├── Title
        │       │   └── Close button
        │       │
        │       └── Scrollable Content
        │           ├── Metadata Grid (Status, Priority, Complexity, Agent)
        │           ├── Epic Name
        │           ├── Blocked Reason (red callout - if blocked)
        │           ├── User Story (italicized)
        │           ├── Description
        │           ├── Acceptance Criteria (checklist)
        │           ├── Status History (timeline)
        │           ├── Notes (yellow callouts)
        │           └── Timestamps (created, updated)
        │
        └── ToastContainer (bottom of screen)
            └── [Toast] × N (auto-dismiss after 3s)
                ├── Message
                └── Dismiss button
```

## Data Flow

```
Firebase Firestore
    ↓ (real-time onSnapshot listeners)
Custom Hooks (useStories, useProjects, useAgents)
    ↓
BoardPage (orchestration component)
    ↓
Components (presentational)
    ↓
User Interactions (clicks, swipes)
    ↓
Zustand Stores (boardStore, toastStore)
    ↓
Component Re-renders
```

## State Management

### Zustand Stores

**boardStore:**
- `activeProjectId` - Selected project (null = all projects) - **persisted**
- `activeColumnIndex` - Current column visible on mobile - **persisted**
- `agentFilter` - Selected agent filter (null = all agents)
- `priorityFilter` - Set of selected priorities
- `selectedStoryId` - Story ID for detail sheet (null = closed)

**toastStore:**
- `toasts[]` - Array of toast notifications
- `addToast(message, type)` - Add notification
- `removeToast(id)` - Remove notification

### React State (Local)

Each component manages its own UI state:
- `ProjectSelector`: `isOpen` (dropdown state)
- `AppHeader`: `isSigningOut` (loading state)
- `RelativeTime`: `formattedTime` (auto-updating)
- `StoryDetailSheet`: Modal open/close handled by parent via `selectedStoryId`

### Firebase State (via Hooks)

- `useProjects()` → `{ projects, loading, error }`
- `useStories(projectId)` → `{ stories, loading, error }`
- `useAgents()` → `{ agents, loading, error }`
- `useStoryActivity(storyId)` → `{ activity, loading, error }`

## Routing

```
/               → BoardPage (protected)
/login          → LoginPage (public)
/*              → Redirect to /
```

## Mobile-First Features

1. **Swipeable Columns**
   - CSS scroll-snap on container
   - One column visible at a time (100vw width each)
   - Smooth native-feeling swipe gesture

2. **Bottom Sheet Modal**
   - Slides up from bottom (90vh height)
   - Backdrop dismisses on click
   - Prevents body scroll when open

3. **Touch Targets**
   - All interactive elements ≥44pt (Apple HIG)
   - Cards, buttons, tabs all optimized for touch

4. **Safe Area Insets**
   - `pt-safe-top` on header (iPhone notch)
   - `pb-safe-bottom` on toast container (home indicator)

5. **Responsive Typography**
   - Base text sizes optimized for mobile readability
   - Title hierarchy uses weight and color, not just size

## Component Dependencies

### Shared Components (Reusable)

```
AgentAvatar
├── Uses: getAgentColor(), getAgentInitials() from utils/constants
└── Props: agentId, agentName, size ('sm'|'md'|'lg')

PriorityBadge
├── Uses: PRIORITY_COLORS, PRIORITY_NAMES from utils/constants
└── Props: priority, showLabel

RelativeTime
├── Uses: formatRelativeTime() from utils/formatting
├── Auto-updates every 60 seconds via interval
└── Props: timestamp

LoadingSkeleton
├── Pulsing animation via Tailwind
└── Props: count (for list)
```

### Board Components (Feature-Specific)

```
KanbanBoard
├── Uses: groupByStatus(), filterByAgent(), filterByPriority() from utils/sorting
├── Manages: swipe state, scroll synchronization
└── Children: ColumnTabs, KanbanColumn[]

KanbanColumn
├── Uses: sortStoriesInColumn() from utils/sorting
├── Displays: column header, story cards, empty state
└── Children: StoryCard[], EmptyColumn

StoryCard
├── Compact card for list view
├── 44pt touch target, 2-line title truncation
└── Children: AgentAvatar, PriorityBadge, RelativeTime

StoryDetailSheet
├── Bottom sheet modal with full details
├── Fetches activity subcollection via useStoryActivity()
└── Children: AgentAvatar, PriorityBadge, timeline, notes
```

## File Locations Reference

```
src/
├── App.tsx                          # Router + routes
├── pages/
│   └── BoardPage.tsx                # Main board orchestration
├── components/
│   ├── auth/
│   │   ├── AuthProvider.tsx         # Auth context provider
│   │   ├── ProtectedRoute.tsx       # Route wrapper
│   │   └── LoginPage.tsx            # Login UI
│   ├── board/
│   │   ├── KanbanBoard.tsx          # Board container
│   │   ├── KanbanColumn.tsx         # Single column
│   │   ├── ColumnTabs.tsx           # Navigation tabs
│   │   ├── StoryCard.tsx            # Card in list
│   │   ├── StoryDetailSheet.tsx     # Detail modal
│   │   └── EmptyColumn.tsx          # Empty state
│   ├── filters/
│   │   └── AgentSummaryBar.tsx      # Agent workload bar
│   ├── layout/
│   │   ├── AppHeader.tsx            # App header
│   │   ├── BlockedBanner.tsx        # Blocked stories banner
│   │   ├── ProjectSelector.tsx      # Project dropdown
│   │   └── ToastContainer.tsx       # Toast notifications
│   └── shared/
│       ├── AgentAvatar.tsx          # Agent avatar
│       ├── PriorityBadge.tsx        # Priority badge
│       ├── RelativeTime.tsx         # Relative timestamp
│       └── LoadingSkeleton.tsx      # Loading state
├── hooks/
│   ├── useStories.ts                # Stories listener
│   ├── useProjects.ts               # Projects listener
│   ├── useAgents.ts                 # Agents fetcher
│   └── useStoryActivity.ts          # Activity fetcher
├── stores/
│   ├── boardStore.ts                # Board state
│   └── toastStore.ts                # Toast state
├── services/
│   ├── firebase.ts                  # Firebase app init
│   ├── firestore.ts                 # Firestore instance
│   └── auth.ts                      # Auth helpers
├── utils/
│   ├── constants.ts                 # Colors, names, helpers
│   ├── formatting.ts                # Date/text formatting
│   └── sorting.ts                   # Story sorting/filtering
├── types/
│   └── index.ts                     # TypeScript types
└── styles/
    └── index.css                    # Global styles + animations
```

## Key Interactions

### Opening Story Detail
```
User clicks StoryCard
  → onClick handler calls useBoardStore.setSelectedStoryId(story.id)
  → BoardPage re-renders
  → StoryDetailSheet receives selectedStory (found by ID)
  → Sheet slides up with animation
  → useStoryActivity(storyId) fetches activity subcollection
```

### Switching Projects
```
User clicks ProjectSelector dropdown
  → Opens dropdown menu
User selects project
  → onClick calls onProjectSelect(projectId)
  → BoardPage calls useBoardStore.setActiveProjectId(projectId)
  → BoardPage calls setActiveColumnIndex(0) to reset to first column
  → useStories(projectId) hook re-subscribes with new filter
  → Board re-renders with filtered stories
```

### Swiping Columns
```
User swipes left/right on board
  → CSS scroll-snap scrolls to next column
  → Scroll event fires (debounced)
  → KanbanBoard calculates new activeColumnIndex
  → Calls useBoardStore.setActiveColumnIndex(newIndex)
  → ColumnTabs re-renders with new active tab highlighted
```

### Real-Time Story Update
```
CLI updates story status (KB-14: in-progress → done)
  → Firestore document updated
  → onSnapshot listener in useStories() fires (< 2 seconds)
  → Stories array updated with new data
  → BoardPage receives new stories
  → Board re-renders, card moves to Done column
  → Toast appears: "KB-14 completed!"
```

## Performance Optimizations

1. **Debounced scroll events** - Prevents jank during swipe
2. **One-time agent fetch** - Agents rarely change, no real-time needed
3. **Lazy activity loading** - Only fetches when detail sheet opens
4. **CSS scroll-snap** - Native browser optimization, no JS
5. **Memoized sorting** - `sortStoriesInColumn()` creates new array only when needed
6. **Incremental Firestore updates** - Only changed documents re-fetched

## Accessibility Features

- **ARIA labels** on icon buttons (sign-out, close, blocked indicator)
- **Keyboard support** - Escape closes detail sheet
- **Semantic HTML** - Proper heading hierarchy (h1 → h2 → h3)
- **Focus management** - Backdrop click closes modal
- **Color contrast** - All text meets WCAG AA
- **Touch targets** - All ≥44pt per Apple HIG

---

This component tree serves as a quick reference for understanding the application structure and data flow.
