// Utility functions for sorting stories within columns

import type { Story, StoryStatus, Priority } from '../types';

// Priority order for sorting (P0 first, P3 last)
const PRIORITY_ORDER: Record<Priority, number> = {
  'P0': 0,
  'P1': 1,
  'P2': 2,
  'P3': 3
};

// Statuses that sort by last activity date DESC only (no priority sorting)
const ACTIVITY_SORTED_STATUSES: Set<StoryStatus> = new Set(['done', 'cancelled']);

/**
 * Sort stories within a column
 * For active columns: blocked items first, then by priority (P0 first), then by last updated
 * For done/cancelled columns: by last updated DESC (most recent first)
 * @param stories Array of stories to sort
 * @param status Column status (determines sort strategy)
 * @returns Sorted array of stories
 */
export function sortStoriesInColumn(stories: Story[], status?: StoryStatus): Story[] {
  if (status && ACTIVITY_SORTED_STATUSES.has(status)) {
    return [...stories].sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis());
  }

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
 * Filter stories by agent (supports multiple agents)
 * @param stories Array of stories
 * @param agentIds Set of agent IDs to filter by, or empty set for all
 * @returns Filtered stories
 */
export function filterByAgent(stories: Story[], agentIds: Set<string>): Story[] {
  if (agentIds.size === 0) return stories;
  return stories.filter(story => story.assignedAgent && agentIds.has(story.assignedAgent));
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
 * Check if a story matches a search query (case-insensitive substring match)
 * Searches: shortId, title, description, epicName, tags
 * @param story Story to check
 * @param query Search query string
 * @returns Whether the story matches
 */
export function storyMatchesSearch(story: Story, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    story.shortId.toLowerCase().includes(q) ||
    story.title.toLowerCase().includes(q) ||
    story.description.toLowerCase().includes(q) ||
    story.epicName.toLowerCase().includes(q) ||
    (story.tags?.some(tag => tag.toLowerCase().includes(q)) ?? false)
  );
}

/**
 * Get a set of story IDs that match the search query
 * @param stories Array of stories
 * @param query Search query string
 * @returns Set of matching story IDs (empty set means no search active)
 */
export function getSearchMatchIds(stories: Story[], query: string): Set<string> {
  if (!query) return new Set();
  return new Set(stories.filter(s => storyMatchesSearch(s, query)).map(s => s.id));
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
