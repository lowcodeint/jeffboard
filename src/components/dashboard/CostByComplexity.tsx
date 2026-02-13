// Cost by complexity tier component

import type { Story, Complexity } from '../../types';

interface CostByComplexityProps {
  stories: Story[];
}

/**
 * CostByComplexity component
 * Shows cost breakdown by S/M/L/XL tiers with progress bars
 */
export function CostByComplexity({ stories }: CostByComplexityProps) {
  const complexities: Complexity[] = ['S', 'M', 'L', 'XL'];

  // Calculate cost per tier
  const tierData = complexities.map((complexity) => {
    const tierStories = stories.filter(
      (s) => s.complexity === complexity && s.tokenUsage
    );
    const cost = tierStories.reduce(
      (sum, s) => sum + (s.tokenUsage?.estimatedCostUsd || 0),
      0
    );
    return {
      complexity,
      cost,
      count: tierStories.length
    };
  });

  const maxCost = Math.max(...tierData.map((t) => t.cost), 1);

  const formatCost = (num: number) => `$${num.toFixed(2)}`;

  // Color intensity by tier
  const colors: Record<Complexity, string> = {
    S: 'bg-blue-400',
    M: 'bg-blue-500',
    L: 'bg-blue-600',
    XL: 'bg-blue-700'
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Cost by Complexity
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {tierData.map(({ complexity, cost, count }) => (
          <div
            key={complexity}
            className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center"
          >
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
              {complexity}
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {formatCost(cost)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {count} {count === 1 ? 'story' : 'stories'}
            </div>
            <div className="mt-2 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${colors[complexity]} rounded-full transition-all duration-500`}
                style={{ width: `${(cost / maxCost) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
