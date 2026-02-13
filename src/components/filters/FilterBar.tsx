// Filter bar combining agent filter, priority filter, search, and clear button

import { useRef, useEffect, useState, useCallback } from 'react';
import type { Story } from '../../types';
import { useBoardStore } from '../../stores/boardStore';
import { storyMatchesSearch } from '../../utils/sorting';
import { PriorityFilter } from './PriorityFilter';

interface FilterBarProps {
  stories: Story[];
}

/**
 * FilterBar component
 * Container for all filters with search input and clear button
 * Shows active filter count badge
 *
 * @param agents - All agents
 * @param stories - All stories (for priority counts and search match count)
 */
export function FilterBar({ stories }: FilterBarProps) {
  const { agentFilter, priorityFilter, searchQuery, setSearchQuery, clearFilters } = useBoardStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const debounceRef = useRef<number | null>(null);

  // Sync local state when store changes (e.g. clearFilters)
  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  // Debounced update to store
  const handleInputChange = useCallback((value: string) => {
    setLocalQuery(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      setSearchQuery(value);
    }, 150);
  }, [setSearchQuery]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClearSearch = () => {
    setLocalQuery('');
    setSearchQuery('');
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClearSearch();
    }
  };

  const hasSearchQuery = searchQuery.length > 0;
  const activeFilterCount = agentFilter.size + priorityFilter.size + (hasSearchQuery ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;

  // Count matches for badge
  const matchCount = hasSearchQuery
    ? stories.filter(s => storyMatchesSearch(s, searchQuery)).length
    : 0;

  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      {/* Filter header with search and clear button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-800 gap-2">
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Filters
            </span>
            {hasActiveFilters && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-500 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </div>

          {/* Match count badge - mobile: right of Filters label */}
          {hasSearchQuery && (
            <span className="sm:hidden inline-flex items-center px-2 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900 rounded-full whitespace-nowrap">
              {matchCount} {matchCount === 1 ? 'match' : 'matches'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Search input */}
          <div className="relative flex-1 sm:flex-none">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search stories..."
              value={localQuery}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full sm:w-56 pl-8 pr-8 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-700 outline-none transition-all"
            />
            {localQuery ? (
              <button
                onClick={handleClearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                aria-label="Clear search"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ) : (
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 dark:text-gray-500 font-medium pointer-events-none hidden sm:inline">
                {isMac ? '⌘K' : 'Ctrl+K'}
              </span>
            )}
          </div>

          {/* Match count badge - desktop */}
          {hasSearchQuery && (
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900 rounded-full whitespace-nowrap">
              {matchCount} {matchCount === 1 ? 'match' : 'matches'}
            </span>
          )}

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="
                text-xs font-medium
                text-blue-600 dark:text-blue-400
                hover:text-blue-700 dark:hover:text-blue-300
                px-2 py-1
                rounded
                hover:bg-blue-50 dark:hover:bg-blue-950
                transition-colors
                min-h-[32px]
                whitespace-nowrap
              "
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Priority filter section */}
      <div>
        <div className="px-4 py-1 bg-gray-50 dark:bg-gray-950">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Priority
          </span>
        </div>
        <PriorityFilter stories={stories} />
      </div>
    </div>
  );
}
