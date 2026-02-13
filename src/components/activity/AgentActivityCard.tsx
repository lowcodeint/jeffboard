// Per-agent expandable activity card

import { useState } from 'react';
import { AgentAvatar } from '../shared/AgentAvatar';
import { STATUS_NAMES } from '../../utils/constants';
import { formatRelativeTime } from '../../utils/formatting';
import type { StoryStatus } from '../../types';

interface AgentStats {
  agentId: string;
  storiesTouched: number;
  statusChanges: number;
  notesPosted: number;
  statusBreakdown: Record<StoryStatus, number>;
  recentActivity: Array<{
    type: 'status-change' | 'note';
    storyShortId: string;
    storyTitle: string;
    fromStatus?: StoryStatus | null;
    toStatus?: StoryStatus;
    note?: string | null;
    timestamp: Date;
  }>;
}

interface AgentActivityCardProps {
  agent: AgentStats;
}

const STATUS_BAR_COLORS: Record<StoryStatus, string> = {
  'ideas': 'bg-teal-400',
  'done': 'bg-green-500',
  'in-review': 'bg-purple-500',
  'in-progress': 'bg-yellow-500',
  'in-design': 'bg-blue-500',
  'backlog': 'bg-gray-400',
  'blocked': 'bg-red-500',
  'cancelled': 'bg-slate-400',
};

function formatAgentName(agentId: string): string {
  return agentId
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function AgentActivityCard({ agent }: AgentActivityCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const totalStatusItems = Object.values(agent.statusBreakdown).reduce(
    (sum, count) => sum + count,
    0
  );

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      {/* Card header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
      >
        <AgentAvatar agentId={agent.agentId} size="lg" />

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {formatAgentName(agent.agentId)}
          </h3>

          {/* Inline stats */}
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
            <span>{agent.storiesTouched} stories</span>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <span>{agent.statusChanges} transitions</span>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <span>{agent.notesPosted} notes</span>
          </div>

          {/* Status breakdown bar */}
          {totalStatusItems > 0 && (
            <div className="flex mt-2 h-2 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
              {(Object.entries(agent.statusBreakdown) as [StoryStatus, number][])
                .filter(([, count]) => count > 0)
                .sort((a, b) => {
                  // Order: done, in-review, in-progress, in-design, backlog, blocked, cancelled
                  const order: StoryStatus[] = [
                    'done',
                    'in-review',
                    'in-progress',
                    'in-design',
                    'backlog',
                    'blocked',
                    'cancelled',
                  ];
                  return order.indexOf(a[0]) - order.indexOf(b[0]);
                })
                .map(([status, count]) => (
                  <div
                    key={status}
                    className={`${STATUS_BAR_COLORS[status]} transition-all`}
                    style={{
                      width: `${(count / totalStatusItems) * 100}%`,
                    }}
                    title={`${STATUS_NAMES[status]}: ${count}`}
                  />
                ))}
            </div>
          )}
        </div>

        {/* Expand/collapse chevron */}
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Status legend (compact) */}
      {totalStatusItems > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-x-3 gap-y-1">
          {(Object.entries(agent.statusBreakdown) as [StoryStatus, number][])
            .filter(([, count]) => count > 0)
            .sort((a, b) => b[1] - a[1])
            .map(([status, count]) => (
              <span key={status} className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <span className={`w-2 h-2 rounded-full ${STATUS_BAR_COLORS[status]}`} />
                {STATUS_NAMES[status]} ({count})
              </span>
            ))}
        </div>
      )}

      {/* Expandable timeline */}
      {isExpanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Recent Activity
          </h4>
          {agent.recentActivity.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">
              No recent activity
            </p>
          ) : (
            <div className="space-y-3">
              {agent.recentActivity.slice(0, 10).map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  {/* Timeline dot */}
                  <div className="mt-1.5 w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" />

                  <div className="flex-1 min-w-0">
                    {item.type === 'status-change' ? (
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-medium">{item.storyShortId}</span>
                        {' '}
                        {item.fromStatus ? (
                          <>
                            <span className="text-gray-400">{STATUS_NAMES[item.fromStatus]}</span>
                            {' → '}
                            <span className="font-medium">{STATUS_NAMES[item.toStatus!]}</span>
                          </>
                        ) : (
                          <>
                            Created as{' '}
                            <span className="font-medium">{STATUS_NAMES[item.toStatus!]}</span>
                          </>
                        )}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-medium">{item.storyShortId}</span>
                        {' '}
                        <span className="text-gray-500 dark:text-gray-400">
                          {item.note
                            ? item.note.length > 80
                              ? item.note.slice(0, 80) + '...'
                              : item.note
                            : 'Posted a note'}
                        </span>
                      </p>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {formatRelativeTime(item.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export type { AgentStats };
