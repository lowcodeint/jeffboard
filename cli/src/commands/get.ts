// Get command: Show full details and notes for a single story

import { Command } from 'commander';
import { findStoryByShortId } from '../lib/firestore.js';
import { validateRequired } from '../lib/validators.js';

export function createGetCommand() {
  return new Command('get')
    .description('Get full details of a story including notes')
    .requiredOption('-s, --story <storyId>', 'Story short ID (e.g., STRUX-3)')
    .option('-a, --agent <agent>', 'Agent name (marks unread notes)')
    .action(async (options) => {
      try {
        validateRequired(options.story, 'Story ID');

        const doc = await findStoryByShortId(options.story);
        if (!doc) {
          console.error(`Story not found: ${options.story}`);
          process.exit(1);
        }

        const story = doc.data() as Record<string, any>;
        const notes: any[] = story.notes || [];
        const reactions: any[] = story.noteReactions || [];

        // Story header
        console.log(`\n${'─'.repeat(60)}`);
        console.log(`${story.shortId}  ${story.title}`);
        console.log(`${'─'.repeat(60)}`);
        console.log(`  Status:     ${story.status || 'unknown'}`);
        console.log(`  Priority:   ${story.priority || '?'}`);
        console.log(`  Complexity: ${story.complexity || '?'}`);
        console.log(`  Agent:      ${story.assignedAgent || 'unassigned'}`);
        if (story.epicName) {
          console.log(`  Epic:       ${story.epicName}`);
        }
        if (story.blockedReason) {
          console.log(`  Blocked:    ${story.blockedReason}`);
        }

        // Description
        if (story.description) {
          console.log(`\n## Description\n`);
          console.log(story.description);
        }

        // Acceptance criteria
        const criteria: string[] = story.acceptanceCriteria || [];
        if (criteria.length > 0) {
          console.log(`\n## Acceptance Criteria\n`);
          criteria.forEach((item: string) => {
            console.log(`  - ${item}`);
          });
        }

        // Notes
        if (notes.length > 0) {
          console.log(`\n## Notes (${notes.length})\n`);
          notes.forEach((note: any) => {
            const time = note.createdAt
              ? new Date(note.createdAt._seconds * 1000).toISOString().replace('T', ' ').slice(0, 19)
              : '?';

            // Determine unread status for this agent
            let unreadMarker = '';
            if (options.agent && note.id && note.author !== options.agent) {
              const acked = reactions.some(
                (r: any) => r.noteId === note.id && r.author === options.agent
              );
              if (!acked) {
                unreadMarker = ' [UNREAD]';
              }
            }

            console.log(`  [${time}] ${note.author}${unreadMarker}`);
            if (note.id) {
              console.log(`  id: ${note.id}`);
            }
            console.log(`  ${note.text}`);
            if (note.imageUrl) {
              console.log(`  📎 ${note.imageUrl}`);
            }
            console.log('');
          });
        } else {
          console.log(`\n  No notes.\n`);
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}
