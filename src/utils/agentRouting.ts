// Agent routing logic based on story tags
// Implementation of the scoring model from docs/agent-routing-taxonomy.md

import type { AgentId } from '../types';

/**
 * Scoring weights for tag matches
 */
const TAG_WEIGHTS = {
  PRIMARY: 3,
  SECONDARY: 1,
  NONE: 0,
  FALLBACK_BONUS: 0.5,
} as const;

/**
 * Agent capability mapping
 * Each agent has primary tags (core expertise) and secondary tags (competence)
 */
const AGENT_CAPABILITIES: Record<AgentId, { primary: string[]; secondary: string[] }> = {
  'product-manager': {
    primary: ['documentation'],
    secondary: ['ui-design', 'testing'],
  },
  'solution-architect': {
    primary: ['database', 'infrastructure', 'documentation'],
    secondary: ['backend', 'api', 'security'],
  },
  'lead-engineer': {
    primary: ['frontend', 'backend', 'api', 'database'],
    secondary: ['infrastructure', 'testing', 'devops'],
  },
  'security-reviewer': {
    primary: ['security'],
    secondary: ['backend', 'api', 'database'],
  },
  'designer': {
    primary: ['ui-design', 'frontend'],
    secondary: ['documentation', 'testing'],
  },
  'quality-inspector': {
    primary: ['testing'],
    secondary: ['documentation', 'security', 'frontend', 'backend'],
  },
};

/**
 * Tie-breaking priority order
 * When agents have the same score, prefer earlier agents in this list
 */
const TIE_BREAK_ORDER: AgentId[] = [
  'lead-engineer',
  'solution-architect',
  'security-reviewer',
  'designer',
  'quality-inspector',
  'product-manager',
];

/**
 * Agent ranking with score and explanation
 */
export interface AgentRanking {
  agentId: AgentId;
  score: number;
  primaryMatches: string[];
  secondaryMatches: string[];
}

/**
 * Calculate the score for a single agent based on story tags
 */
function calculateAgentScore(agentId: AgentId, tags: string[]): AgentRanking {
  const capabilities = AGENT_CAPABILITIES[agentId];
  const primaryMatches: string[] = [];
  const secondaryMatches: string[] = [];
  let score = 0;

  for (const tag of tags) {
    if (capabilities.primary.includes(tag)) {
      score += TAG_WEIGHTS.PRIMARY;
      primaryMatches.push(tag);
    } else if (capabilities.secondary.includes(tag)) {
      score += TAG_WEIGHTS.SECONDARY;
      secondaryMatches.push(tag);
    }
  }

  // Apply fallback bonus to lead-engineer when total score is 0
  if (score === 0 && agentId === 'lead-engineer') {
    score += TAG_WEIGHTS.FALLBACK_BONUS;
  }

  return {
    agentId,
    score,
    primaryMatches,
    secondaryMatches,
  };
}

/**
 * Rank all agents based on story tags
 * Returns agents sorted by score (descending), with tie-breaks by priority order
 *
 * @param tags - Story tags
 * @returns Ranked list of agents with scores and match explanations
 */
export function rankAgents(tags: string[]): AgentRanking[] {
  const rankings = TIE_BREAK_ORDER.map((agentId) =>
    calculateAgentScore(agentId, tags)
  );

  // Sort by score descending, with tie-breaks by TIE_BREAK_ORDER position
  rankings.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return TIE_BREAK_ORDER.indexOf(a.agentId) - TIE_BREAK_ORDER.indexOf(b.agentId);
  });

  return rankings;
}

/**
 * Get the recommended agent for a story based on its tags
 *
 * @param tags - Story tags
 * @returns The top-ranked agent or null if no tags provided
 */
export function getRecommendedAgent(tags: string[]): AgentRanking | null {
  if (!tags || tags.length === 0) {
    return null;
  }

  const rankings = rankAgents(tags);
  return rankings[0] || null;
}

/**
 * Format an agent ranking as a human-readable explanation
 *
 * @param ranking - Agent ranking
 * @returns Formatted explanation string
 */
export function formatRankingExplanation(ranking: AgentRanking): string {
  const parts: string[] = [];

  if (ranking.primaryMatches.length > 0) {
    parts.push(`primary: ${ranking.primaryMatches.join(', ')}`);
  }

  if (ranking.secondaryMatches.length > 0) {
    parts.push(`secondary: ${ranking.secondaryMatches.join(', ')}`);
  }

  if (parts.length === 0) {
    return 'fallback (no tag matches)';
  }

  return parts.join('; ');
}
