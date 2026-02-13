// Notification bell showing unacknowledged notes across all stories

import { useState, useRef, useEffect, useMemo } from 'react';
import type { Story, StoryNote, NoteReaction } from '../../types';
import { useAuth } from '../auth/AuthProvider';
import { useBoardStore } from '../../stores/boardStore';
import { markAllNotesRead } from '../../services/stories';

interface NotificationBellProps {
  stories: Story[];
}

interface UnreadNote {
  story: Story;
  note: StoryNote;
}

function formatRelativeTime(timestamp: { toMillis: () => number }): string {
  const now = Date.now();
  const diff = now - timestamp.toMillis();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell({ stories }: NotificationBellProps) {
  const { user } = useAuth();
  const { setSelectedStoryId } = useBoardStore();
  const [isOpen, setIsOpen] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentUserName = user?.displayName || user?.email || '';

  const unreadNotes = useMemo(() => {
    const result: UnreadNote[] = [];
    for (const story of stories) {
      if (!story.notes?.length) continue;
      for (const note of story.notes) {
        if (!note.id) continue;
        if (note.author === currentUserName) continue;
        const hasReacted = (story.noteReactions || []).some(
          (r: NoteReaction) => r.noteId === note.id && r.author === currentUserName
        );
        if (!hasReacted) {
          result.push({ story, note });
        }
      }
    }
    // Sort newest first
    result.sort((a, b) => b.note.createdAt.toMillis() - a.note.createdAt.toMillis());
    return result;
  }, [stories, currentUserName]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleNoteClick = (storyId: string) => {
    setSelectedStoryId(storyId);
    setIsOpen(false);
  };

  const handleMarkAllRead = async () => {
    if (markingAllRead || unreadNotes.length === 0) return;
    setMarkingAllRead(true);
    try {
      await markAllNotesRead(
        unreadNotes.map(({ story, note }) => ({ storyId: story.id, noteId: note.id! })),
        currentUserName,
      );
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const count = unreadNotes.length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ''}`}
      >
        {/* Bell icon */}
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Badge */}
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Notifications
              </span>
              {count > 0 && (
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                  {count} unread
                </span>
              )}
            </div>
            {count > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markingAllRead}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:opacity-50 transition-colors"
              >
                {markingAllRead ? 'Marking...' : 'Mark all read'}
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {unreadNotes.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                No new notes
              </div>
            ) : (
              unreadNotes.map(({ story, note }) => (
                <button
                  key={`${story.id}-${note.id}`}
                  onClick={() => handleNoteClick(story.id)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                      {story.shortId}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {note.author}
                    </span>
                    {note.imageUrl && (
                      <svg className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                    <span className="ml-auto text-[10px] text-gray-400 dark:text-gray-500">
                      {formatRelativeTime(note.createdAt)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 line-clamp-1">
                    {note.text}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
