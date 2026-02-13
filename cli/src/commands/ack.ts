// Ack command: Acknowledge notes on a story

import { Command } from 'commander';
import { acknowledgeNote, getUnacknowledgedNotes } from '../lib/firestore.js';
import { validateRequired } from '../lib/validators.js';

export function createAckCommand() {
  return new Command('ack')
    .description('Acknowledge notes on a story')
    .requiredOption('-s, --story <storyId>', 'Story ID or short ID (e.g., KB-14)')
    .option('-n, --note-id <noteId>', 'Specific note ID to acknowledge')
    .option('--all', 'Acknowledge all unread notes')
    .requiredOption('-a, --agent <agent>', 'Agent name acknowledging the notes')
    .action(async (options) => {
      try {
        validateRequired(options.story, 'Story ID');
        validateRequired(options.agent, 'Agent');

        if (!options.noteId && !options.all) {
          throw new Error('Either --note-id <id> or --all is required');
        }

        if (options.all) {
          // Acknowledge all unread notes
          const unread = await getUnacknowledgedNotes(options.story, options.agent);

          if (unread.length === 0) {
            console.log(`No unacknowledged notes on ${options.story}`);
            return;
          }

          let acked = 0;
          for (const note of unread) {
            const result = await acknowledgeNote(options.story, note.id, options.agent);
            if (!result.alreadyAcked) acked++;
          }

          console.log(`✓ Acknowledged ${acked} note(s) on ${options.story}`);
        } else {
          // Acknowledge a specific note
          const result = await acknowledgeNote(options.story, options.noteId, options.agent);

          if (result.alreadyAcked) {
            console.log(`Note already acknowledged on ${result.shortId}`);
          } else {
            console.log(`✓ Acknowledged note on ${result.shortId}`);
          }
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}
