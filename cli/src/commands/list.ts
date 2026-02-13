// List command: List stories

import { Command } from 'commander';
import { listStories } from '../lib/firestore.js';
import { validateStatus } from '../lib/validators.js';
import { findConfig } from '../lib/config.js';

export function createListCommand() {
  return new Command('list')
    .description('List stories')
    .option('-p, --project <projectId>', 'Filter by project ID (auto-detected from .claude/jeffboard.json if not provided)')
    .option('-s, --status <status>', 'Filter by status')
    .option('--active', 'Only show actionable stories (excludes done, cancelled, blocked)')
    .option('-a, --agent <agent>', 'Agent name (shows unread note counts)')
    .action(async (options) => {
      try {
        if (options.status) {
          validateStatus(options.status);
        }

        // Use explicit --project or try to auto-detect from config
        let projectId = options.project;
        if (!projectId) {
          const config = findConfig();
          if (config) {
            projectId = config.projectId;
          }
        }

        let stories = await listStories(projectId, options.status);

        // Filter out done/cancelled/blocked when --active is used
        if (options.active) {
          stories = stories.filter((s: any) => !['done', 'cancelled', 'blocked'].includes(s.status));
        }

        if (stories.length === 0) {
          console.log('No stories found');
          return;
        }

        console.log(`\nFound ${stories.length} stories:\n`);

        stories.forEach((story: any) => {
          const status = story.status || 'unknown';
          const priority = story.priority || '?';
          const agent = story.assignedAgent || 'unassigned';
          const blocked = story.status === 'cancelled' && story.blockedReason
            ? ' [CANCELLED]'
            : story.blockedReason ? ' [BLOCKED]' : '';

          // Compute unread note count when --agent is provided
          let unreadTag = '';
          if (options.agent) {
            const notes: any[] = story.notes || [];
            const reactions: any[] = story.noteReactions || [];
            const unreadCount = notes.filter((note: any) => {
              if (!note.id || note.author === options.agent) return false;
              return !reactions.some(
                (r: any) => r.noteId === note.id && r.author === options.agent
              );
            }).length;
            if (unreadCount > 0) {
              unreadTag = ` [${unreadCount} UNREAD]`;
            }
          }

          console.log(`  ${story.shortId}  ${priority}  ${status.padEnd(12)}  ${agent}${blocked}${unreadTag}`);
          console.log(`    ${story.title}`);
          console.log('');
        });
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}
