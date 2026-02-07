// Utility functions for sorting stories within columns

import type { Story, Priority } from '../types';

// Priority order for sorting (P0 first, P3 last)
const PRIORITY_ORDER: Record<Priority, number> = {
  'P0': 0,
  'P1': 1,
  'P2': 2,
  'P3': 3
};

/**
 * Sort stories within a column
 * Priority: blocked items first (if they have blockedReason), then by priority (P0 first), then by last updated (most recent first)
 * @param stories Array of stories to sort
 * @returns Sorted array of stories
 */
export function sortStoriesInColumn(stories: Story[]): Story[] {
  return [...stories].sort((a, b) => {
    // If one is blocked and the other isn't, blocked comes first
    const aBlocked = !!a.blockedReason;
    const bBlocked = !!b.blockedReason;

    if (aBlocked && !bBlocked) return -1;
    if (!aBlocked && bBlocked) return 1;

    // Sort by priority (P0 first)
    const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // Sort by most recently updated first
    const aTime = a.updatedAt.toMillis();
    const bTime = b.updatedAt.toMillis();
    return bTime - aTime;
  });
}

/**
 * Filter stories by agent
 * @param stories Array of stories
 * @param agentId Agent ID to filter by, or null for all
 * @returns Filtered stories
 */
export function filterByAgent(stories: Story[], agentId: string | null): Story[] {
  if (!agentId) return stories;
  return stories.filter(story => story.assignedAgent === agentId);
}

/**
 * Filter stories by priority
 * @param stories Array of stories
 * @param priorities Set of priorities to include, or empty set for all
 * @returns Filtered stories
 */
export function filterByPriority(stories: Story[], priorities: Set<Priority>): Story[] {
  if (priorities.size === 0) return stories;
  return stories.filter(story => priorities.has(story.priority));
}

/**
 * Group stories by status
 * @param stories Array of stories
 * @returns Map of status to stories
 */
export function groupByStatus(stories: Story[]): Map<string, Story[]> {
  const grouped = new Map<string, Story[]>();

  stories.forEach(story => {
    const existing = grouped.get(story.status) || [];
    grouped.set(story.status, [...existing, story]);
  });

  return grouped;
}
