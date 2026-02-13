// Cost per story horizontal bar chart component

import type { Story } from '../../types';

interface CostPerStoryChartProps {
  stories: Story[];
}

/**
 * CostPerStoryChart component
 * Horizontal bar chart showing top stories by cost
 */
export function CostPerStoryChart({ stories }: CostPerStoryChartProps) {
  // Get stories with token data and sort by cost
  const storiesWithCost = stories
    .filter((s) => s.tokenUsage && s.tokenUsage.estimatedCostUsd > 0)
    .sort((a, b) => (b.tokenUsage?.estimatedCostUsd || 0) - (a.tokenUsage?.estimatedCostUsd || 0))
    .slice(0, 10); // Top 10

  const maxCost = storiesWithCost.length > 0
    ? storiesWithCost[0].tokenUsage?.estimatedCostUsd || 1
    : 1;

  const formatCost = (num: number) => `$${num.toFixed(2)}`;

  if (storiesWithCost.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Cost per Story
          </h3>
        </div>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
          No token usage data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Cost per Story
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Top {storiesWithCost.length} by cost
        </span>
      </div>
      <div className="space-y-2.5">
        {storiesWithCost.map((story) => {
          const cost = story.tokenUsage?.estimatedCostUsd || 0;
          const percentage = (cost / maxCost) * 100;

          return (
            <div key={story.id} className="flex items-center gap-3">
              <div className="w-16 flex-shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400 text-right">
                {story.shortId}
              </div>
              <div className="flex-1 h-7 bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden relative">
                <div
                  className="h-full bg-blue-500 rounded-md transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
                <span
                  className={`absolute top-0 h-full flex items-center text-xs font-medium ${
                    percentage > 15
                      ? 'text-white pl-2 left-0'
                      : 'text-gray-700 dark:text-gray-300 pl-1'
                  }`}
                  style={percentage <= 15 ? { left: `${percentage}%` } : undefined}
                >
                  {formatCost(cost)}
                </span>
              </div>
              <div className="w-8 flex-shrink-0 text-xs text-gray-400 dark:text-gray-500 text-right">
                {story.complexity}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
