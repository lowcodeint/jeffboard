// Route command: Recommend the best agent for a story based on tags

import { Command } from 'commander';
import { findStoryByShortId } from '../lib/firestore.js';
import { rankAgents, validateTags, type RankedAgent } from '../lib/routing.js';

/**
 * Format score breakdown for display
 */
function formatBreakdown(result: RankedAgent): string[] {
  const lines: string[] = [];

  if (result.breakdown.length > 0) {
    lines.push('  Tag matches:');
    for (const { tag, weight, reason } of result.breakdown) {
      if (reason !== 'none') {
        const label = reason === 'primary' ? 'PRIMARY' : 'SECONDARY';
        lines.push(`    ${tag}: ${weight} (${label})`);
      }
    }
  }

  if (result.fallbackBonus > 0) {
    lines.push(`  Fallback bonus: ${result.fallbackBonus}`);
  }

  if (lines.length === 0) {
    lines.push('  No matching capabilities');
  }

  return lines;
}

/**
 * Format the full ranking table
 */
function formatRankingTable(ranked: RankedAgent[]): string[] {
  const lines: string[] = [];
  lines.push('');
  lines.push('Agent Rankings:');
  lines.push('─'.repeat(60));

  for (let i = 0; i < ranked.length; i++) {
    const result = ranked[i];
    const rank = i + 1;
    const marker = rank === 1 ? '→ ' : '  ';
    lines.push(`${marker}${rank}. ${result.agentId.padEnd(25)} Score: ${result.score.toFixed(1)}`);
    lines.push(...formatBreakdown(result).map((line) => `   ${line}`));
    lines.push('');
  }

  return lines;
}

export function createRouteCommand() {
  return new Command('route')
    .description('Recommend the best agent for a story based on tags')
    .option('-s, --story <shortId>', 'Story short ID (e.g., JB-23)')
    .option('-t, --tags <tags>', 'Comma-separated tags (e.g., "frontend,api")')
    .action(async (options) => {
      try {
        let tags: string[] = [];
        let storyId: string | null = null;

        // Get tags from story or direct input
        if (options.story) {
          storyId = options.story;
          const doc = await findStoryByShortId(options.story);
          if (!doc) {
            console.error(`Story not found: ${options.story}`);
            process.exit(1);
          }

          const story = doc.data() as Record<string, any>;
          tags = story.tags || [];

          console.log(`\nStory: ${story.shortId} — ${story.title}`);
          console.log(`Tags: ${tags.length > 0 ? tags.join(', ') : '(none)'}`);
        } else if (options.tags) {
          tags = options.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
          console.log(`\nTags: ${tags.join(', ')}`);
        } else {
          console.error('Error: Must provide either --story or --tags');
          process.exit(1);
        }

        // Validate tags and warn on unknown
        const unknownTags = validateTags(tags);
        if (unknownTags.length > 0) {
          console.log(`\n⚠️  Warning: Unknown tags (not in taxonomy): ${unknownTags.join(', ')}`);
        }

        // Rank agents
        const ranked = rankAgents(tags);
        const recommended = ranked[0];

        // Display recommendation
        console.log('');
        console.log('═'.repeat(60));
        console.log(`RECOMMENDED AGENT: ${recommended.agentId}`);
        console.log(`Score: ${recommended.score.toFixed(1)}`);
        console.log('═'.repeat(60));
        console.log(...formatBreakdown(recommended));

        // Display full ranking
        console.log(...formatRankingTable(ranked));

        // Note about ties
        const ties = ranked.filter((r) => r.score === recommended.score);
        if (ties.length > 1) {
          console.log('Note: Multiple agents tied with the same score.');
          console.log(`Winner selected by tie-break order: ${ties.map((r) => r.agentId).join(' > ')}`);
          console.log('');
        }

        // Fallback note
        if (recommended.score === 0 || recommended.fallbackBonus > 0) {
          console.log('Note: No strong tag matches. Defaulting to lead-engineer (generalist).');
          console.log('');
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}
