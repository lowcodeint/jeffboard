// Agent routing logic based on story tags
// See: docs/agent-routing-taxonomy.md

/**
 * Tag weight constants for scoring
 */
export const TAG_WEIGHTS = {
  PRIMARY: 3,
  SECONDARY: 1,
  NONE: 0,
  FALLBACK_BONUS: 0.5,
} as const;

/**
 * Agent capabilities mapping (primary and secondary tags)
 */
export const AGENT_CAPABILITIES: Record<string, { primary: string[]; secondary: string[] }> = {
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
 * Tie-break order when agents have equal scores
 */
export const TIE_BREAK_ORDER: string[] = [
  'lead-engineer',
  'solution-architect',
  'security-reviewer',
  'designer',
  'quality-inspector',
  'product-manager',
];

/**
 * Valid story tags from taxonomy
 */
export const VALID_TAGS = [
  'frontend',
  'backend',
  'api',
  'database',
  'security',
  'ui-design',
  'infrastructure',
  'testing',
  'documentation',
  'devops',
] as const;

/**
 * Ranked agent result with score breakdown
 */
export interface RankedAgent {
  agentId: string;
  score: number;
  breakdown: {
    tag: string;
    weight: number;
    reason: 'primary' | 'secondary' | 'none';
  }[];
  fallbackBonus: number;
}

/**
 * Calculate score for a single agent based on story tags
 */
function calculateAgentScore(agentId: string, tags: string[]): RankedAgent {
  const capabilities = AGENT_CAPABILITIES[agentId];
  if (!capabilities) {
    throw new Error(`Unknown agent: ${agentId}`);
  }

  const breakdown: RankedAgent['breakdown'] = [];
  let score = 0;

  for (const tag of tags) {
    if (capabilities.primary.includes(tag)) {
      breakdown.push({ tag, weight: TAG_WEIGHTS.PRIMARY, reason: 'primary' });
      score += TAG_WEIGHTS.PRIMARY;
    } else if (capabilities.secondary.includes(tag)) {
      breakdown.push({ tag, weight: TAG_WEIGHTS.SECONDARY, reason: 'secondary' });
      score += TAG_WEIGHTS.SECONDARY;
    } else {
      breakdown.push({ tag, weight: TAG_WEIGHTS.NONE, reason: 'none' });
    }
  }

  // Apply fallback bonus to lead-engineer if score is 0
  const fallbackBonus = agentId === 'lead-engineer' && score === 0 ? TAG_WEIGHTS.FALLBACK_BONUS : 0;
  score += fallbackBonus;

  return {
    agentId,
    score,
    breakdown,
    fallbackBonus,
  };
}

/**
 * Rank all agents by score for the given tags
 * Returns sorted list: highest score first, ties broken by TIE_BREAK_ORDER
 */
export function rankAgents(tags: string[]): RankedAgent[] {
  const agents = Object.keys(AGENT_CAPABILITIES);
  const ranked = agents.map((agentId) => calculateAgentScore(agentId, tags));

  // Sort by score descending, then by tie-break order
  ranked.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // Tie-break: lower index in TIE_BREAK_ORDER wins
    const aIndex = TIE_BREAK_ORDER.indexOf(a.agentId);
    const bIndex = TIE_BREAK_ORDER.indexOf(b.agentId);
    return aIndex - bIndex;
  });

  return ranked;
}

/**
 * Get the recommended agent for a set of tags (top-ranked agent)
 */
export function recommendAgent(tags: string[]): RankedAgent {
  const ranked = rankAgents(tags);
  return ranked[0];
}

/**
 * Validate tags and return warnings for unknown tags
 */
export function validateTags(tags: string[]): string[] {
  const validSet = new Set(VALID_TAGS);
  return tags.filter((tag) => !validSet.has(tag as any));
}
