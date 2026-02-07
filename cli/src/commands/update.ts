// Update command: Update story status

import { Command } from 'commander';
import { updateStoryStatus } from '../lib/firestore.js';
import { validateStatus, validateRequired } from '../lib/validators.js';

export function createUpdateCommand() {
  return new Command('update')
    .description('Update a story status')
    .requiredOption('-s, --story <storyId>', 'Story ID or short ID (e.g., KB-14)')
    .requiredOption('--status <status>', 'New status (backlog|in-design|in-progress|in-review|done|blocked)')
    .requiredOption('-a, --agent <agent>', 'Agent making the change')
    .option('-r, --reason <reason>', 'Blocked reason (required if status is blocked)')
    .option('-n, --note <note>', 'Optional note about the change')
    .action(async (options) => {
      try {
        validateRequired(options.story, 'Story ID');
        validateRequired(options.status, 'Status');
        validateRequired(options.agent, 'Agent');
        validateStatus(options.status);

        // If setting to blocked, require a reason
        if (options.status === 'blocked' && !options.reason) {
          throw new Error('--reason is required when setting status to blocked');
        }

        const shortId = await updateStoryStatus(
          options.story,
          options.status,
          options.agent,
          options.reason,
          options.note
        );

        console.log(`✓ Updated ${shortId} to ${options.status} (${options.agent})`);
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}
