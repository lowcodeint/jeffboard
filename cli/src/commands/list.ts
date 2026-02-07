// List command: List stories

import { Command } from 'commander';
import { listStories } from '../lib/firestore.js';
import { validateStatus } from '../lib/validators.js';

export function createListCommand() {
  return new Command('list')
    .description('List stories')
    .option('-p, --project <projectId>', 'Filter by project ID')
    .option('-s, --status <status>', 'Filter by status')
    .action(async (options) => {
      try {
        if (options.status) {
          validateStatus(options.status);
        }

        const stories = await listStories(options.project, options.status);

        if (stories.length === 0) {
          console.log('No stories found');
          return;
        }

        console.log(`\nFound ${stories.length} stories:\n`);

        stories.forEach((story: any) => {
          const status = story.status || 'unknown';
          const priority = story.priority || '?';
          const agent = story.assignedAgent || 'unassigned';
          const blocked = story.blockedReason ? ' [BLOCKED]' : '';

          console.log(`  ${story.shortId}  ${priority}  ${status.padEnd(12)}  ${agent}${blocked}`);
          console.log(`    ${story.title}`);
          console.log('');
        });
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}
