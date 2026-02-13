// Empty state for a column with no stories

import type { StoryStatus } from '../../types';
import { STATUS_NAMES } from '../../utils/constants';

interface EmptyColumnProps {
  status: StoryStatus;
}

/**
 * EmptyColumn component
 * Displays a subtle empty state message when a column has no stories
 *
 * @param status - Column status to display appropriate message
 */
export function EmptyColumn({ status }: EmptyColumnProps) {
  const messages: Record<StoryStatus, string> = {
    'ideas': 'No ideas yet',
    'backlog': 'No stories in backlog',
    'in-design': 'No stories in design',
    'in-progress': 'No stories in progress',
    'in-review': 'No stories in review',
    'done': 'No completed stories',
    'blocked': 'No blocked stories',
    'cancelled': 'No cancelled stories'
  };

  const emojis: Record<StoryStatus, string> = {
    'ideas': '💡',
    'backlog': '📋',
    'in-design': '✏️',
    'in-progress': '🚀',
    'in-review': '👀',
    'done': '✅',
    'blocked': '🚫',
    'cancelled': '❌'
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 animate-fade-in">
      <div className="text-4xl mb-3 opacity-30 dark:opacity-20">
        {emojis[status]}
      </div>
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 text-center">
        {messages[status]}
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-1">
        {STATUS_NAMES[status]}
      </p>
    </div>
  );
}
