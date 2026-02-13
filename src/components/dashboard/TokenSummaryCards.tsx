// Token summary cards component

import type { Story } from '../../types';

interface TokenSummaryCardsProps {
  stories: Story[];
}

/**
 * TokenSummaryCards component
 * Displays 4 summary metrics: Total Tokens, Total Cost, Avg/Story, Sessions
 */
export function TokenSummaryCards({ stories }: TokenSummaryCardsProps) {
  // Calculate summary metrics
  const storiesWithTokens = stories.filter((s) => s.tokenUsage);

  const totalInputTokens = storiesWithTokens.reduce(
    (sum, s) => sum + (s.tokenUsage?.inputTokens || 0),
    0
  );
  const totalOutputTokens = storiesWithTokens.reduce(
    (sum, s) => sum + (s.tokenUsage?.outputTokens || 0),
    0
  );
  const totalTokens = totalInputTokens + totalOutputTokens;

  const totalCost = storiesWithTokens.reduce(
    (sum, s) => sum + (s.tokenUsage?.estimatedCostUsd || 0),
    0
  );

  const avgCostPerStory = storiesWithTokens.length > 0 ? totalCost / storiesWithTokens.length : 0;
  const avgTokensPerStory = storiesWithTokens.length > 0 ? totalTokens / storiesWithTokens.length : 0;

  const totalSessions = storiesWithTokens.reduce(
    (sum, s) => sum + (s.tokenUsage?.sessions || 0),
    0
  );

  // Format numbers
  const formatTokens = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
  };

  const formatCost = (num: number) => `$${num.toFixed(2)}`;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Tokens */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-blue-600 dark:text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
          </div>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Total Tokens
          </span>
        </div>
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {formatTokens(totalTokens)}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {formatTokens(totalInputTokens)} input / {formatTokens(totalOutputTokens)} output
        </div>
      </div>

      {/* Total Cost */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-green-600 dark:text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Total Cost
          </span>
        </div>
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {formatCost(totalCost)}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {storiesWithTokens.length} stories with usage data
        </div>
      </div>

      {/* Avg Cost per Story */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-purple-600 dark:text-purple-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Avg / Story
          </span>
        </div>
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {formatCost(avgCostPerStory)}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {formatTokens(avgTokensPerStory)} tokens average
        </div>
      </div>

      {/* Total Sessions */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-orange-600 dark:text-orange-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Sessions
          </span>
        </div>
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {totalSessions}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Across {storiesWithTokens.length} stories
        </div>
      </div>
    </div>
  );
}
