// Kanban column component

import type { Story, StoryStatus } from '../../types';
import { STATUS_NAMES, STATUS_COLORS } from '../../utils/constants';
import { StoryCard } from './StoryCard';
import { EmptyColumn } from './EmptyColumn';
import { sortStoriesInColumn } from '../../utils/sorting';

interface KanbanColumnProps {
  status: StoryStatus;
  stories: Story[];
  onCardClick: (story: Story) => void;
  searchQuery?: string;
  searchMatchIds?: Set<string>;
}

/**
 * KanbanColumn component
 * Displays a single column with header and story cards
 * Stories are sorted by priority and recency
 *
 * @param status - Column status
 * @param stories - Stories in this column
 * @param onCardClick - Handler when a card is clicked
 * @param searchQuery - Active search query for text highlighting
 * @param searchMatchIds - Set of story IDs that match search (empty = no search active)
 */
export function KanbanColumn({ status, stories, onCardClick, searchQuery, searchMatchIds }: KanbanColumnProps) {
  const sortedStories = sortStoriesInColumn(stories, status);
  const bgColorClass = STATUS_COLORS[status];
  const hasActiveSearch = !!searchQuery && searchMatchIds && searchMatchIds.size > 0;

  return (
    <div
      className={`
        flex flex-col
        h-full
        ${bgColorClass}
      `}
    >
      {/* Column header - sticky at top */}
      <div className="sticky top-0 z-10 bg-inherit px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {STATUS_NAMES[status]}
          </h2>
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded-full">
            {stories.length}
          </span>
        </div>
      </div>

      {/* Cards container - scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {sortedStories.length === 0 ? (
          <EmptyColumn status={status} />
        ) : (
          <div className="space-y-3">
            {sortedStories.map((story) => {
              const isMatch = hasActiveSearch ? searchMatchIds!.has(story.id) : undefined;
              return (
                <StoryCard
                  key={story.id}
                  story={story}
                  onClick={() => onCardClick(story)}
                  searchQuery={searchQuery}
                  searchMatch={isMatch}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
