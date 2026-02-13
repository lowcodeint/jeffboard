// Story card component (collapsed view)

import type { Story, NoteReaction } from '../../types';
import { AgentAvatar } from '../shared/AgentAvatar';
import { PriorityBadge } from '../shared/PriorityBadge';
import { RelativeTime } from '../shared/RelativeTime';
import { HeartbeatIndicator } from '../shared/HeartbeatIndicator';
import { TagPill } from '../shared/TagPill';
import { useAuth } from '../auth/AuthProvider';

interface StoryCardProps {
  story: Story;
  onClick: () => void;
  searchQuery?: string;
  searchMatch?: boolean; // undefined = no search active, true = match, false = no match
}

/**
 * Highlight matching substrings in text with a yellow mark tag
 */
function HighlightText({ text, query }: { text: string; query?: string }) {
  if (!query) return <>{text}</>;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const parts: { text: string; highlight: boolean }[] = [];

  let startIndex = 0;
  let matchIndex = lowerText.indexOf(lowerQuery, startIndex);

  while (matchIndex !== -1) {
    if (matchIndex > startIndex) {
      parts.push({ text: text.slice(startIndex, matchIndex), highlight: false });
    }
    parts.push({ text: text.slice(matchIndex, matchIndex + query.length), highlight: true });
    startIndex = matchIndex + query.length;
    matchIndex = lowerText.indexOf(lowerQuery, startIndex);
  }

  if (startIndex < text.length) {
    parts.push({ text: text.slice(startIndex), highlight: false });
  }

  if (parts.length === 0) return <>{text}</>;

  return (
    <>
      {parts.map((part, i) =>
        part.highlight ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 text-inherit rounded px-0.5">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </>
  );
}

/**
 * StoryCard component
 * Displays a collapsed story card with key information
 * Optimized for mobile scanning - shows agent, priority, title, and last update
 *
 * Apple HIG compliant: 44pt minimum touch target
 *
 * @param story - Story data
 * @param onClick - Click handler for opening detail view
 * @param searchQuery - Active search query for text highlighting
 * @param searchMatch - Whether this card matches the search (undefined = no search)
 */
export function StoryCard({ story, onClick, searchQuery, searchMatch }: StoryCardProps) {
  const { user } = useAuth();
  const hasBlockedReason = !!story.blockedReason;

  // Count notes from others that this user hasn't acknowledged
  const currentUserName = user?.displayName || user?.email || '';
  const reactions = story.noteReactions || [];
  const unacknowledgedNoteCount = story.notes.filter((note) => {
    if (!note.id || note.author === currentUserName) return false;
    return !reactions.some(
      (r: NoteReaction) => r.noteId === note.id && r.author === currentUserName
    );
  }).length;

  // Show heartbeat indicator for statuses where agents are actively working
  const showHeartbeat = story.status === 'in-progress' || story.status === 'in-design' || story.status === 'in-review';

  // Search visual feedback
  const isSearchActive = searchMatch !== undefined;
  const isMatch = searchMatch === true;
  const isDimmed = isSearchActive && !isMatch;

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left
        bg-white dark:bg-gray-800
        rounded-lg shadow-sm
        p-4
        border-l-4
        transition-all duration-200
        hover:shadow-md active:scale-[0.98]
        min-h-[44px]
        animate-fade-in
        ${isMatch
          ? 'border border-blue-300 dark:border-blue-600 ring-2 ring-blue-200 dark:ring-blue-800'
          : 'border border-gray-200 dark:border-gray-700'
        }
        ${isDimmed ? 'opacity-30' : ''}
        ${hasBlockedReason && story.status !== 'blocked' ? 'border-l-red-500 dark:border-l-red-500' : 'border-l-transparent'}
      `}
    >
      {/* Top row: Avatar, Story ID, Priority, Blocked indicator */}
      <div className="flex items-start gap-3 mb-2">
        <AgentAvatar
          agentId={story.assignedAgent}
          agentName={story.assignedAgent}
          size="sm"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              <HighlightText text={story.shortId} query={isMatch ? searchQuery : undefined} />
            </span>
            {showHeartbeat && (
              <HeartbeatIndicator
                lastHeartbeat={story.lastHeartbeat}
                heartbeatMessage={story.heartbeatMessage}
              />
            )}
            {story.epicName && (
              <span className="px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-[10px] font-medium truncate max-w-[120px]">
                <HighlightText text={story.epicName} query={isMatch ? searchQuery : undefined} />
              </span>
            )}
            {unacknowledgedNoteCount > 0 && (
              <span
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 text-[10px] font-semibold"
                title={`${unacknowledgedNoteCount} unacknowledged note(s)`}
                aria-label={`${unacknowledgedNoteCount} unread notes`}
              >
                💬 {unacknowledgedNoteCount}
              </span>
            )}
            {hasBlockedReason && (
              <span
                className="text-red-500"
                title={story.blockedReason || undefined}
                aria-label="Blocked"
              >
                ⚠️
              </span>
            )}
          </div>

          {/* Title - truncate to 2 lines */}
          <h3 className={`text-sm font-semibold line-clamp-2 ${
            story.status === 'cancelled'
              ? 'text-gray-500 dark:text-gray-500 line-through opacity-60'
              : 'text-gray-900 dark:text-gray-100'
          }`}>
            <HighlightText text={story.title} query={isMatch ? searchQuery : undefined} />
          </h3>

          {/* Tags */}
          {story.tags && story.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {story.tags.map((tag) => (
                <TagPill key={tag} tag={tag} size="sm" />
              ))}
            </div>
          )}
        </div>

        <PriorityBadge priority={story.priority} />
      </div>

      {/* Bottom row: Agent name, Last updated */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span className="truncate">
          {story.assignedAgent || 'Unassigned'}
        </span>
        <RelativeTime timestamp={story.updatedAt} />
      </div>
    </button>
  );
}
