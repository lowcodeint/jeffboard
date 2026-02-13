// Token filter bar component

import type { Priority, Complexity } from '../../types';

interface TokenFilterBarProps {
  epics: string[];
  epicFilter: string;
  onEpicChange: (epic: string) => void;
  priorityFilter: Set<Priority>;
  onTogglePriority: (priority: Priority) => void;
  complexityFilter: Set<Complexity>;
  onToggleComplexity: (complexity: Complexity) => void;
  activeFilterCount: number;
  onClearFilters: () => void;
}

/**
 * TokenFilterBar component
 * Filter controls for epic, priority, and complexity
 */
export function TokenFilterBar({
  epics,
  epicFilter,
  onEpicChange,
  priorityFilter,
  onTogglePriority,
  complexityFilter,
  onToggleComplexity,
  activeFilterCount,
  onClearFilters
}: TokenFilterBarProps) {
  const priorities: Priority[] = ['P0', 'P1', 'P2', 'P3'];
  const complexities: Complexity[] = ['S', 'M', 'L', 'XL'];

  const priorityColors: Record<Priority, string> = {
    P0: 'bg-red-500 text-white',
    P1: 'bg-orange-500 text-white',
    P2: 'bg-yellow-500 text-white',
    P3: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Filters
          </span>
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-500 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={onClearFilters}
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            Clear All
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        {/* Epic filter */}
        <div className="relative">
          <select
            value={epicFilter}
            onChange={(e) => onEpicChange(e.target.value)}
            className="appearance-none rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 pl-3 pr-8 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Epics</option>
            {epics.map((epic) => (
              <option key={epic} value={epic}>
                {epic}
              </option>
            ))}
          </select>
          <svg
            className="w-3 h-3 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>

        {/* Priority filter pills */}
        <div className="flex items-center gap-1">
          {priorities.map((priority) => {
            const isActive = priorityFilter.has(priority);
            const baseColors = priorityColors[priority];
            const inactiveColors =
              'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700';

            return (
              <button
                key={priority}
                onClick={() => onTogglePriority(priority)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  isActive ? baseColors : inactiveColors
                }`}
              >
                {priority}
              </button>
            );
          })}
        </div>

        {/* Complexity filter pills */}
        <div className="flex items-center gap-1">
          {complexities.map((complexity) => {
            const isActive = complexityFilter.has(complexity);

            return (
              <button
                key={complexity}
                onClick={() => onToggleComplexity(complexity)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {complexity}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
