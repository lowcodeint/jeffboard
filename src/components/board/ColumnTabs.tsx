// Column tabs navigation for mobile swipe view

import type { StoryStatus } from '../../types';
import { COLUMN_ORDER, STATUS_NAMES } from '../../utils/constants';

interface ColumnTabsProps {
  activeIndex: number;
  storyCounts: Record<StoryStatus, number>;
  onTabClick: (index: number) => void;
}

/**
 * ColumnTabs component
 * Top navigation tabs showing all columns with story counts
 * Active column is highlighted, blocked column has red accent if it has stories
 *
 * @param activeIndex - Index of currently visible column
 * @param storyCounts - Count of stories in each column
 * @param onTabClick - Handler when a tab is clicked
 */
export function ColumnTabs({
  activeIndex,
  storyCounts,
  onTabClick
}: ColumnTabsProps) {
  return (
    <div className="bg-white dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex overflow-x-auto scrollbar-hide">
        {COLUMN_ORDER.map((status, index) => {
          const isActive = index === activeIndex;
          const isIdeas = status === 'ideas';
          const isBlocked = status === 'blocked';
          const isCancelled = status === 'cancelled';
          const count = storyCounts[status] || 0;
          const hasIdeasStories = isIdeas && count > 0;
          const hasBlockedStories = isBlocked && count > 0;
          const hasCancelledStories = isCancelled && count > 0;

          return (
            <button
              key={status}
              onClick={() => onTabClick(index)}
              className={`
                flex-shrink-0
                px-4 py-3
                text-sm font-medium
                border-b-2
                transition-colors
                whitespace-nowrap
                ${
                  isActive
                    ? isIdeas
                      ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950'
                      : isBlocked
                      ? 'border-red-500 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950'
                      : isCancelled
                      ? 'border-slate-500 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900'
                      : 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }
                ${hasIdeasStories && !isActive ? 'text-emerald-600 dark:text-emerald-400' : ''}
                ${hasBlockedStories && !isActive ? 'text-red-600 dark:text-red-400' : ''}
                ${hasCancelledStories && !isActive ? 'text-slate-500 dark:text-slate-400' : ''}
              `}
            >
              {STATUS_NAMES[status]}
              {count > 0 && (
                <span
                  className={`
                    ml-2 px-2 py-0.5 rounded-full text-xs font-semibold
                    ${
                      isActive
                        ? isIdeas
                          ? 'bg-emerald-500 text-white'
                          : isBlocked
                          ? 'bg-red-500 text-white'
                          : isCancelled
                          ? 'bg-slate-500 text-white'
                          : 'bg-blue-500 text-white'
                        : hasIdeasStories
                        ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300'
                        : hasBlockedStories
                        ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                        : hasCancelledStories
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }
                  `}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
