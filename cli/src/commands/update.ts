// Update command: Update story status and other fields

import { Command } from 'commander';
import { updateStoryStatus, updateStoryTags, getUnacknowledgedNotes } from '../lib/firestore.js';
import { validateStatus, validateRequired } from '../lib/validators.js';

// Valid tag taxonomy (from docs/agent-routing-taxonomy.md)
const VALID_TAGS = [
  'frontend',
  'backend',
  'api',
  'database',
  'security',
  'ui-design',
  'infrastructure',
  'testing',
  'documentation',
  'devops'
] as const;

/**
 * Validate and warn about unknown tags
 * @param tags Array of tag strings
 * @returns Array of tags (unchanged - warnings only)
 */
function validateTags(tags: string[]): string[] {
  const unknownTags = tags.filter(tag => !VALID_TAGS.includes(tag as any));

  if (unknownTags.length > 0) {
    console.warn(`\nWARNING: Unknown tags: ${unknownTags.join(', ')}`);
    console.warn(`Valid tags: ${VALID_TAGS.join(', ')}\n`);
  }

  return tags;
}

export function createUpdateCommand() {
  return new Command('update')
    .description('Update a story status or tags')
    .requiredOption('-s, --story <storyId>', 'Story ID or short ID (e.g., KB-14)')
    .option('--status <status>', 'New status (ideas|backlog|in-design|in-progress|in-review|done|blocked|cancelled)')
    .option('-a, --agent <agent>', 'Agent making the change')
    .option('-r, --reason <reason>', 'Reason (required if status is blocked or cancelled)')
    .option('-n, --note <note>', 'Optional note about the change')
    .option('--tags <tags>', 'Comma-separated tags to replace existing tags (e.g., frontend,api)')
    .action(async (options) => {
      try {
        validateRequired(options.story, 'Story ID');

        // Handle status update
        if (options.status) {
          validateRequired(options.agent, 'Agent');
          validateStatus(options.status);

          // If setting to blocked or cancelled, require a reason
          if ((options.status === 'blocked' || options.status === 'cancelled') && !options.reason) {
            throw new Error(`--reason is required when setting status to ${options.status}`);
          }

          // Warn about unacknowledged notes
          try {
            const unread = await getUnacknowledgedNotes(options.story, options.agent);
            if (unread.length > 0) {
              console.log(`\nWARNING: ${unread.length} unacknowledged note(s) on this story.`);
              console.log(`  Use: jeffboard ack -s ${options.story} --all -a ${options.agent}\n`);
            }
          } catch {
            // Non-blocking: don't let ack check failure prevent status update
          }

          const shortId = await updateStoryStatus(
            options.story,
            options.status,
            options.agent,
            options.reason,
            options.note
          );

          console.log(`✓ Updated ${shortId} to ${options.status} (${options.agent})`);
        }

        // Handle tags update
        if (options.tags !== undefined) {
          const tags = options.tags
            .split(',')
            .map((t: string) => t.trim())
            .filter(Boolean);
          validateTags(tags);

          const shortId = await updateStoryTags(options.story, tags);
          console.log(`✓ Updated ${shortId} tags: ${tags.join(', ') || '(none)'}`);
        }

        // Ensure at least one update type was provided
        if (!options.status && options.tags === undefined) {
          throw new Error('Must provide either --status or --tags to update');
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}
