// Cost-per-complexity analysis component with outlier detection

import type { Story, Complexity } from '../../types';

interface CostComplexityAnalysisProps {
  stories: Story[];
}

interface TierStats {
  complexity: Complexity;
  average: number;
  min: number;
  max: number;
  count: number;
  total: number;
}

interface StoryWithRatio {
  story: Story;
  cost: number;
  tierAverage: number;
  ratio: number;
  isOutlier: boolean;
}

/**
 * CostComplexityAnalysis component
 * Shows expected vs actual cost per complexity tier
 * Highlights outliers that cost significantly more or less than tier average
 */
export function CostComplexityAnalysis({ stories }: CostComplexityAnalysisProps) {
  const complexities: Complexity[] = ['S', 'M', 'L', 'XL'];

  // Calculate statistics per tier
  const tierStats: TierStats[] = complexities.map((complexity) => {
    const tierStories = stories.filter(
      (s) => s.complexity === complexity && s.tokenUsage
    );
    const costs = tierStories.map((s) => s.tokenUsage!.estimatedCostUsd);

    if (costs.length === 0) {
      return {
        complexity,
        average: 0,
        min: 0,
        max: 0,
        count: 0,
        total: 0
      };
    }

    const total = costs.reduce((sum, c) => sum + c, 0);
    const average = total / costs.length;
    const min = Math.min(...costs);
    const max = Math.max(...costs);

    return {
      complexity,
      average,
      min,
      max,
      count: costs.length,
      total
    };
  });

  // Create map for fast tier average lookup
  const tierAverageMap = new Map<Complexity, number>(
    tierStats.map((t) => [t.complexity, t.average])
  );

  // Calculate stories with cost-to-average ratio
  const storiesWithRatio: StoryWithRatio[] = stories
    .filter((s) => s.tokenUsage)
    .map((story) => {
      const cost = story.tokenUsage!.estimatedCostUsd;
      const tierAverage = tierAverageMap.get(story.complexity) || 1;
      const ratio = tierAverage > 0 ? cost / tierAverage : 0;
      const isOutlier = ratio > 2.0; // More than 2x the tier average

      return {
        story,
        cost,
        tierAverage,
        ratio,
        isOutlier
      };
    })
    .sort((a, b) => b.ratio - a.ratio); // Sort by ratio descending

  const formatCost = (num: number) => `$${num.toFixed(2)}`;

  // Color intensity by tier
  const tierColors: Record<Complexity, string> = {
    S: 'bg-blue-400',
    M: 'bg-blue-500',
    L: 'bg-blue-600',
    XL: 'bg-blue-700'
  };

  const hasData = tierStats.some((t) => t.count > 0);

  if (!hasData) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Cost-per-Complexity Analysis
        </h3>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
          No token usage data available
        </div>
      </div>
    );
  }

  const outlierCount = storiesWithRatio.filter((s) => s.isOutlier).length;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Cost-per-Complexity Analysis
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Expected vs actual effort per tier
          </p>
        </div>
        {outlierCount > 0 && (
          <span className="px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium">
            {outlierCount} outlier{outlierCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Tier statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {tierStats.map(({ complexity, average, min, max, count }) => {
          if (count === 0) {
            return (
              <div
                key={complexity}
                className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 opacity-50"
              >
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 text-center">
                  {complexity}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 text-center italic">
                  No data
                </div>
              </div>
            );
          }

          return (
            <div
              key={complexity}
              className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3"
            >
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 text-center">
                {complexity}
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100 text-center">
                {formatCost(average)}
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 text-center mt-1">
                avg
              </div>
              <div className="flex items-center justify-between mt-2 text-[10px] text-gray-400 dark:text-gray-500">
                <span>min: {formatCost(min)}</span>
                <span>max: {formatCost(max)}</span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
                {count} {count === 1 ? 'story' : 'stories'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Grouped bar chart comparing tiers */}
      <div className="mb-4">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
          Cost Range by Tier
        </div>
        <div className="space-y-2">
          {tierStats
            .filter((t) => t.count > 0)
            .map(({ complexity, min, max, average }) => {
              const maxCost = Math.max(...tierStats.map((t) => t.max));
              const minPct = (min / maxCost) * 100;
              const avgPct = (average / maxCost) * 100;
              const maxPct = (max / maxCost) * 100;

              return (
                <div key={complexity} className="flex items-center gap-2">
                  <div className="w-6 flex-shrink-0 text-xs font-semibold text-gray-500 dark:text-gray-400">
                    {complexity}
                  </div>
                  <div className="flex-1 h-8 bg-gray-100 dark:bg-gray-800 rounded-md relative">
                    {/* Min to Max range (light bar) */}
                    <div
                      className="absolute h-full bg-blue-200 dark:bg-blue-900/30 rounded-md transition-all duration-500"
                      style={{
                        left: `${minPct}%`,
                        width: `${maxPct - minPct}%`
                      }}
                    />
                    {/* Average marker (dark bar) */}
                    <div
                      className={`absolute h-full ${tierColors[complexity]} rounded-md transition-all duration-500`}
                      style={{
                        left: `${avgPct}%`,
                        width: '2px'
                      }}
                    />
                    <div
                      className="absolute h-full flex items-center transition-all duration-500"
                      style={{ left: `${avgPct}%` }}
                    >
                      <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 ml-1.5">
                        {formatCost(average)}
                      </span>
                    </div>
                  </div>
                  <div className="w-16 flex-shrink-0 text-[10px] text-gray-400 dark:text-gray-500 text-right">
                    {formatCost(min)}–{formatCost(max)}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Outlier stories table */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Cost-to-Average Ratio
          </div>
          <div className="text-[10px] text-gray-400 dark:text-gray-500">
            Showing top 10 by ratio
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  ID
                </th>
                <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide min-w-[150px]">
                  Title
                </th>
                <th className="text-center px-3 py-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Size
                </th>
                <th className="text-right px-3 py-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Cost
                </th>
                <th className="text-right px-3 py-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Tier Avg
                </th>
                <th className="text-right px-3 py-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Ratio
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {storiesWithRatio.slice(0, 10).map(({ story, cost, tierAverage, ratio, isOutlier }) => (
                <tr
                  key={story.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                    isOutlier ? 'bg-amber-50 dark:bg-amber-900/10' : ''
                  }`}
                >
                  <td className="px-3 py-2">
                    <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                      {story.shortId}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                        {story.title}
                      </span>
                      {isOutlier && (
                        <span className="flex-shrink-0 text-amber-500 dark:text-amber-400">
                          ⚠
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                      {story.complexity}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                      {formatCost(cost)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatCost(tierAverage)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span
                      className={`text-xs font-semibold ${
                        isOutlier
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {ratio.toFixed(2)}x
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
