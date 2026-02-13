// Token story table with sorting and pagination

import type { Story } from '../../types';

interface TokenStoryTableProps {
  stories: Story[];
  sortColumn: 'id' | 'title' | 'complexity' | 'tokens' | 'cost' | 'sessions';
  sortDirection: 'asc' | 'desc';
  onSort: (column: TokenStoryTableProps['sortColumn']) => void;
  currentPage: number;
  totalPages: number;
  totalStories: number;
  onPageChange: (page: number) => void;
}

/**
 * TokenStoryTable component
 * Sortable table with pagination showing story-level token usage
 */
export function TokenStoryTable({
  stories,
  sortColumn,
  sortDirection,
  onSort,
  currentPage,
  totalPages,
  totalStories,
  onPageChange
}: TokenStoryTableProps) {
  const formatTokens = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toFixed(0);
  };

  const formatCost = (num: number) => `$${num.toFixed(2)}`;

  const SortIcon = ({ column }: { column: typeof sortColumn }) => {
    if (sortColumn !== column) {
      return (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      );
    }

    if (sortDirection === 'asc') {
      return (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 11l5-5m0 0l5 5m-5-5v12"
          />
        </svg>
      );
    }

    return (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 14l-7 7m0 0l-7-7m7 7V3"
        />
      </svg>
    );
  };

  // Generate page numbers
  const pageNumbers: (number | string)[] = [];
  if (totalPages <= 7) {
    // Show all pages
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i);
    }
  } else {
    // Show first, last, current, and neighbors
    pageNumbers.push(1);
    if (currentPage > 3) pageNumbers.push('...');
    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(totalPages - 1, currentPage + 1);
      i++
    ) {
      pageNumbers.push(i);
    }
    if (currentPage < totalPages - 2) pageNumbers.push('...');
    if (totalPages > 1) pageNumbers.push(totalPages);
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <th
                onClick={() => onSort('id')}
                className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <div className="flex items-center gap-1">
                  ID
                  <SortIcon column="id" />
                </div>
              </th>
              <th
                onClick={() => onSort('title')}
                className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 transition-colors min-w-[200px]"
              >
                <div className="flex items-center gap-1">
                  Title
                  <SortIcon column="title" />
                </div>
              </th>
              <th
                onClick={() => onSort('complexity')}
                className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <div className="flex items-center justify-center gap-1">
                  Size
                  <SortIcon column="complexity" />
                </div>
              </th>
              <th
                onClick={() => onSort('tokens')}
                className={`text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 transition-colors ${
                  sortColumn === 'tokens'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <div className="flex items-center justify-end gap-1">
                  Tokens
                  <SortIcon column="tokens" />
                </div>
              </th>
              <th
                onClick={() => onSort('cost')}
                className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  Cost
                  <SortIcon column="cost" />
                </div>
              </th>
              <th
                onClick={() => onSort('sessions')}
                className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <div className="flex items-center justify-center gap-1">
                  Sessions
                  <SortIcon column="sessions" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {stories.map((story) => {
              const hasTokenData = !!story.tokenUsage;

              return (
                <tr
                  key={story.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer ${
                    !hasTokenData ? 'opacity-50' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {story.shortId}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {story.title}
                      </span>
                      {story.epicName && (
                        <span className="px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-medium flex-shrink-0">
                          {story.epicName}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                      {story.complexity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {hasTokenData ? (
                      <>
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {formatTokens(story.tokenUsage!.totalTokens)}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          {formatTokens(story.tokenUsage!.inputTokens)} in /{' '}
                          {formatTokens(story.tokenUsage!.outputTokens)} out
                        </div>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                        No data
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {hasTokenData ? (
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {formatCost(story.tokenUsage!.estimatedCostUsd)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-500 italic">--</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {hasTokenData ? (
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {story.tokenUsage!.sessions}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-500 italic">--</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Showing {stories.length} of {totalStories} stories
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          {pageNumbers.map((page, idx) => {
            if (page === '...') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 text-xs text-gray-400 dark:text-gray-500"
                >
                  ...
                </span>
              );
            }

            return (
              <button
                key={page}
                onClick={() => onPageChange(page as number)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  currentPage === page
                    ? 'text-white bg-blue-600 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {page}
              </button>
            );
          })}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || totalPages === 0}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
