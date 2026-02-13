// Agent recommendation component
// Shows recommended agent based on story tags

import { getRecommendedAgent, formatRankingExplanation } from '../../utils/agentRouting';
import type { Agent } from '../../types';

interface AgentRecommendationProps {
  tags: string[];
  agents: Agent[];
}

/**
 * AgentRecommendation component
 * Displays the recommended agent for a story based on its tags
 *
 * @param tags - Story tags
 * @param agents - Available agents for display name lookup
 */
export function AgentRecommendation({ tags, agents }: AgentRecommendationProps) {
  const recommendation = getRecommendedAgent(tags);

  if (!recommendation) {
    return (
      <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3">
        <div className="flex items-start gap-2">
          <span className="text-lg" aria-hidden="true">💡</span>
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Add tags for agent recommendation
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
              Select tags above to see which agent is best suited for this work
            </p>
          </div>
        </div>
      </div>
    );
  }

  const agent = agents.find((a) => a.id === recommendation.agentId);
  const displayName = agent?.displayName || recommendation.agentId;
  const explanation = formatRankingExplanation(recommendation);

  return (
    <div className="rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3">
      <div className="flex items-start gap-2">
        <span className="text-lg" aria-hidden="true">🎯</span>
        <div className="flex-1">
          <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
            Recommended: <span className="font-bold">{displayName}</span>
            <span className="ml-1 text-blue-600 dark:text-blue-400">(score: {recommendation.score.toFixed(1)})</span>
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
            {explanation}
          </p>
        </div>
      </div>
    </div>
  );
}
