// Priority filter component with tappable priority pills

import type { Story, Priority } from '../../types';
import { PRIORITIES } from '../../types';
import { PRIORITY_NAMES } from '../../utils/constants';
import { useBoardStore } from '../../stores/boardStore';

interface PriorityFilterProps {
  stories: Story[];
  className?: string;
}

/**
 * PriorityFilter component
 * Shows tappable priority pills (P0-P3) with story counts
 * Multiple priorities can be selected at once
 * Selected priorities are highlighted with a colored border
 *
 * @param stories - All stories (used to calculate counts)
 * @param className - Additional CSS classes
 */
export function PriorityFilter({ stories, className = '' }: PriorityFilterProps) {
  const { priorityFilter, togglePriorityFilter } = useBoardStore();

  // Calculate story count per priority (exclude done/cancelled)
  const activeStories = stories.filter((s) => s.status !== 'done' && s.status !== 'cancelled');
  const priorityCounts = PRIORITIES.reduce(
    (acc, priority) => {
      acc[priority] = activeStories.filter((s) => s.priority === priority).length;
      return acc;
    },
    {} as Record<Priority, number>
  );

  return (
    <div className={`overflow-x-auto scrollbar-hide ${className}`}>
      <div className="flex gap-2 px-4 py-2">
        {PRIORITIES.map((priority) => {
          const isSelected = priorityFilter.has(priority);
          const count = priorityCounts[priority];

          return (
            <button
              key={priority}
              onClick={() => togglePriorityFilter(priority)}
              className={`
                flex items-center gap-2
                px-3 py-2
                rounded-full
                border-2 transition-all
                flex-shrink-0
                min-h-[44px]
                ${
                  isSelected
                    ? 'bg-gray-100 dark:bg-gray-800 border-gray-900 dark:border-gray-100'
                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                }
                hover:shadow-md active:scale-95
              `}
              title={PRIORITY_NAMES[priority]}
            >
              <span
                className={`
                  text-sm font-semibold
                  ${
                    isSelected
                      ? 'text-gray-900 dark:text-gray-100'
                      : 'text-gray-600 dark:text-gray-400'
                  }
                `}
              >
                {priority}
              </span>
              <span
                className={`
                  text-xs font-medium
                  px-1.5 py-0.5
                  rounded-full
                  ${
                    isSelected
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500'
                  }
                `}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
