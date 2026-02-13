// Agent filter component with tappable agent chips

import type { Agent } from '../../types';
import { AgentAvatar } from '../shared/AgentAvatar';
import { useBoardStore } from '../../stores/boardStore';

interface AgentFilterProps {
  agents: Agent[];
  className?: string;
}

/**
 * AgentFilter component
 * Shows tappable agent chips that toggle filtering
 * Multiple agents can be selected at once
 * Selected agents are highlighted with a colored border
 *
 * @param agents - All agents to display
 * @param className - Additional CSS classes
 */
export function AgentFilter({ agents, className = '' }: AgentFilterProps) {
  const { agentFilter, toggleAgentFilter } = useBoardStore();

  if (agents.length === 0) return null;

  return (
    <div className={`overflow-x-auto scrollbar-hide ${className}`}>
      <div className="flex gap-2 px-4 py-2">
        {agents.map((agent) => {
          const isSelected = agentFilter.has(agent.id);

          return (
            <button
              key={agent.id}
              onClick={() => toggleAgentFilter(agent.id)}
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
              title={agent.displayName}
            >
              <AgentAvatar agentId={agent.id} size="sm" />
              <span
                className={`
                  text-sm font-medium
                  ${
                    isSelected
                      ? 'text-gray-900 dark:text-gray-100'
                      : 'text-gray-600 dark:text-gray-400'
                  }
                `}
              >
                {agent.displayName}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
