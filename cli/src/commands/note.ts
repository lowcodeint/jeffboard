// Note command: Add a note to a story

import { Command } from 'commander';
import { addStoryNote } from '../lib/firestore.js';
import { validateRequired } from '../lib/validators.js';

export function createNoteCommand() {
  return new Command('note')
    .description('Add a note to a story')
    .requiredOption('-s, --story <storyId>', 'Story ID or short ID (e.g., KB-14)')
    .requiredOption('-t, --text <text>', 'Note text')
    .option('-a, --author <author>', 'Note author (defaults to "user")', 'user')
    .action(async (options) => {
      try {
        validateRequired(options.story, 'Story ID');
        validateRequired(options.text, 'Note text');

        const shortId = await addStoryNote(options.story, options.text, options.author);

        console.log(`✓ Added note to ${shortId}`);
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}
