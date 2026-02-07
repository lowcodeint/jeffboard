// Constants for agent colors, status colors, and other configuration

import type { StoryStatus, Priority, AgentId } from '../types';

// Column order for the Kanban board
export const COLUMN_ORDER: StoryStatus[] = [
  'backlog',
  'in-design',
  'in-progress',
  'in-review',
  'done',
  'blocked'
];

// Status display names
export const STATUS_NAMES: Record<StoryStatus, string> = {
  'backlog': 'Backlog',
  'in-design': 'In Design',
  'in-progress': 'In Progress',
  'in-review': 'In Review',
  'done': 'Done',
  'blocked': 'Blocked'
};

// Status background colors (Tailwind classes)
export const STATUS_COLORS: Record<StoryStatus, string> = {
  'backlog': 'bg-gray-50 dark:bg-gray-900',
  'in-design': 'bg-blue-50 dark:bg-blue-950',
  'in-progress': 'bg-yellow-50 dark:bg-yellow-950',
  'in-review': 'bg-purple-50 dark:bg-purple-950',
  'done': 'bg-green-50 dark:bg-green-950',
  'blocked': 'bg-red-50 dark:bg-red-950'
};

// Priority colors (Tailwind classes)
export const PRIORITY_COLORS: Record<Priority, string> = {
  'P0': 'bg-red-500 text-white',
  'P1': 'bg-orange-500 text-white',
  'P2': 'bg-yellow-500 text-white',
  'P3': 'bg-gray-500 text-white'
};

// Agent color configuration
export const AGENT_COLORS: Record<string, { name: string; hex: string; tailwind: string }> = {
  'product-manager': {
    name: 'yellow',
    hex: '#FACC15',
    tailwind: 'bg-yellow-400'
  },
  'solution-architect': {
    name: 'orange',
    hex: '#FB923C',
    tailwind: 'bg-orange-400'
  },
  'lead-engineer': {
    name: 'cyan',
    hex: '#22D3EE',
    tailwind: 'bg-cyan-400'
  },
  'security-reviewer': {
    name: 'red',
    hex: '#F87171',
    tailwind: 'bg-red-400'
  },
  'ui-consistency-reviewer': {
    name: 'blue',
    hex: '#60A5FA',
    tailwind: 'bg-blue-400'
  },
  'mendix-code-explainer': {
    name: 'green',
    hex: '#4ADE80',
    tailwind: 'bg-green-400'
  }
};

// Get agent color by ID
export function getAgentColor(agentId: string | null): string {
  if (!agentId) return 'bg-gray-400';
  return AGENT_COLORS[agentId]?.tailwind || 'bg-gray-400';
}

// Get agent initials for avatar
export function getAgentInitials(agentName: string | null): string {
  if (!agentName) return '?';

  const words = agentName.split('-');
  if (words.length === 1) {
    return agentName.charAt(0).toUpperCase();
  }

  return words
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Priority display names
export const PRIORITY_NAMES: Record<Priority, string> = {
  'P0': 'Critical',
  'P1': 'High',
  'P2': 'Medium',
  'P3': 'Low'
};
