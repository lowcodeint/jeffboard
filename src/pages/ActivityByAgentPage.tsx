// Activity By Agent Page

import { useMemo, useState } from 'react';
import { useStories } from '../hooks/useStories';
import { useProjects } from '../hooks/useProjects';
import { useAllActivity } from '../hooks/useAllActivity';
import { useBoardStore } from '../stores/boardStore';
import { AppHeader } from '../components/layout/AppHeader';
import { AppLoadingSpinner } from '../components/shared/AppLoadingSpinner';
import { ActivitySummaryCards } from '../components/activity/ActivitySummaryCards';
import { AgentActivityCard } from '../components/activity/AgentActivityCard';
import type { AgentStats } from '../components/activity/AgentActivityCard';

type TimeRange = '7d' | '30d' | '90d' | 'all';

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  all: 'All time',
};

function getTimeRangeCutoff(range: TimeRange): Date | null {
  if (range === 'all') return null;
  const now = new Date();
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export function ActivityByAgentPage() {
  const { activeProjectId, setActiveProjectId } = useBoardStore();
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  const { projects, loading: projectsLoading } = useProjects();
  const { stories, loading: storiesLoading } = useStories(activeProjectId);
  const { allActivity, loading: activityLoading } = useAllActivity(stories);

  const cutoff = getTimeRangeCutoff(timeRange);

  // Compute per-agent statistics
  const agentStatsMap = useMemo(() => {
    const map = new Map<string, AgentStats>();

    const getOrCreate = (agentId: string): AgentStats => {
      if (!map.has(agentId)) {
        map.set(agentId, {
          agentId,
          storiesTouched: 0,
          statusChanges: 0,
          notesPosted: 0,
          statusBreakdown: {
            ideas: 0,
            backlog: 0,
            'in-design': 0,
            'in-progress': 0,
            'in-review': 0,
            done: 0,
            blocked: 0,
            cancelled: 0,
          },
          recentActivity: [],
        });
      }
      return map.get(agentId)!;
    };

    // Process activity subcollections (status transitions)
    const storyTouchedByAgent = new Map<string, Set<string>>();

    for (const storyAct of allActivity) {
      for (const act of storyAct.activity) {
        const ts = act.timestamp?.toDate?.();
        if (!ts) continue;
        if (cutoff && ts < cutoff) continue;

        const agent = act.agent || 'unknown';
        const stats = getOrCreate(agent);
        stats.statusChanges++;
        stats.statusBreakdown[act.toStatus] =
          (stats.statusBreakdown[act.toStatus] || 0) + 1;

        // Track stories touched
        if (!storyTouchedByAgent.has(agent)) {
          storyTouchedByAgent.set(agent, new Set());
        }
        storyTouchedByAgent.get(agent)!.add(storyAct.storyId);

        stats.recentActivity.push({
          type: 'status-change',
          storyShortId: storyAct.shortId,
          storyTitle: storyAct.storyTitle,
          fromStatus: act.fromStatus,
          toStatus: act.toStatus,
          timestamp: ts,
        });
      }
    }

    // Process notes from stories
    for (const story of stories) {
      for (const note of story.notes || []) {
        const ts = note.createdAt?.toDate?.();
        if (!ts) continue;
        if (cutoff && ts < cutoff) continue;

        const agent = note.author || 'unknown';
        const stats = getOrCreate(agent);
        stats.notesPosted++;

        if (!storyTouchedByAgent.has(agent)) {
          storyTouchedByAgent.set(agent, new Set());
        }
        storyTouchedByAgent.get(agent)!.add(story.id);

        stats.recentActivity.push({
          type: 'note',
          storyShortId: story.shortId,
          storyTitle: story.title,
          note: note.text,
          timestamp: ts,
        });
      }
    }

    // Set stories touched counts
    for (const [agentId, storyIds] of storyTouchedByAgent) {
      const stats = map.get(agentId);
      if (stats) {
        stats.storiesTouched = storyIds.size;
      }
    }

    // Sort each agent's recent activity by timestamp (newest first)
    for (const stats of map.values()) {
      stats.recentActivity.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      );
    }

    return map;
  }, [allActivity, stories, cutoff?.getTime()]);

  // Sort agents by total activity (descending)
  const sortedAgents = useMemo(() => {
    return Array.from(agentStatsMap.values()).sort(
      (a, b) =>
        b.statusChanges + b.notesPosted - (a.statusChanges + a.notesPosted)
    );
  }, [agentStatsMap]);

  // Summary stats
  const summaryStats = useMemo(() => {
    let storiesDone = 0;
    let statusChanges = 0;
    let notesPosted = 0;

    for (const stats of agentStatsMap.values()) {
      storiesDone += stats.statusBreakdown.done || 0;
      statusChanges += stats.statusChanges;
      notesPosted += stats.notesPosted;
    }

    return {
      storiesDone,
      statusChanges,
      notesPosted,
      activeAgents: agentStatsMap.size,
    };
  }, [agentStatsMap]);

  const loading = projectsLoading || storiesLoading;
  const activeProject =
    projects.find((p) => p.id === activeProjectId) || null;

  if (!stories.length && loading) {
    return <AppLoadingSpinner />;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 animate-fade-in">
      <AppHeader
        projects={projects}
        stories={stories}
        activeProjectId={activeProjectId}
        activeProject={activeProject}
        onProjectSelect={setActiveProjectId}
      />

      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
          {/* Page title + time range dropdown */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Activity By Agent
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Board activity breakdown grouped by agent
              </p>
            </div>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {(Object.entries(TIME_RANGE_LABELS) as [TimeRange, string][]).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                )
              )}
            </select>
          </div>

          {/* Summary cards */}
          <ActivitySummaryCards {...summaryStats} />

          {/* Agent cards */}
          {activityLoading ? (
            <div className="flex items-center justify-center py-12">
              <svg
                className="animate-spin h-8 w-8 text-blue-600 dark:text-blue-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          ) : sortedAgents.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                No activity found for the selected time range.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedAgents.map((agent) => (
                <AgentActivityCard key={agent.agentId} agent={agent} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
