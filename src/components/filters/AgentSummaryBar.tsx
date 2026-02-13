// Compact agent workload summary bar

import type { Agent, Story } from '../../types';
import { AgentAvatar } from '../shared/AgentAvatar';

interface AgentSummaryBarProps {
  agents: Agent[];
  stories: Story[];
  onAgentClick?: (agentId: string) => void;
}

/**
 * AgentSummaryBar component
 * Shows which agents are active with story counts
 * Clicking an agent avatar filters the board to that agent's stories
 *
 * @param agents - All agents
 * @param stories - All stories (to calculate workload)
 * @param onAgentClick - Optional handler when an agent is clicked
 */
export function AgentSummaryBar({
  agents,
  stories,
  onAgentClick
}: AgentSummaryBarProps) {
  // Calculate story count per agent (exclude done/cancelled)
  const activeStories = stories.filter((s) => s.status !== 'done' && s.status !== 'cancelled');
  const agentWorkload = agents.map((agent) => ({
    ...agent,
    storyCount: activeStories.filter((s) => s.assignedAgent === agent.id).length
  }));

  // Filter to only agents with active stories
  const activeAgents = agentWorkload.filter((a) => a.storyCount > 0);

  if (activeAgents.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
      <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex-shrink-0">
          Active:
        </span>
        {activeAgents.map((agent) => (
          <button
            key={agent.id}
            onClick={() => onAgentClick?.(agent.id)}
            className="flex items-center gap-2 flex-shrink-0 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={`${agent.displayName}: ${agent.storyCount} ${agent.storyCount === 1 ? 'story' : 'stories'}`}
          >
            <AgentAvatar agentId={agent.id} size="sm" />
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              {agent.storyCount}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
