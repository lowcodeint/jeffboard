// Note command: Add a note to a story

import { existsSync } from 'fs';
import { Command } from 'commander';
import { addStoryNote } from '../lib/firestore.js';
import { uploadNoteImage } from '../lib/storage.js';
import { validateRequired } from '../lib/validators.js';
import { randomUUID } from 'crypto';

export function createNoteCommand() {
  return new Command('note')
    .description('Add a note to a story')
    .requiredOption('-s, --story <storyId>', 'Story ID or short ID (e.g., KB-14)')
    .requiredOption('-t, --text <text>', 'Note text')
    .option('-a, --author <author>', 'Note author (defaults to "user")', 'user')
    .option('--image <path>', 'Path to an image file to attach to the note')
    .action(async (options) => {
      try {
        validateRequired(options.story, 'Story ID');
        validateRequired(options.text, 'Note text');

        let imageUrl: string | undefined;

        if (options.image) {
          if (!existsSync(options.image)) {
            throw new Error(`Image file not found: ${options.image}`);
          }
          const noteId = randomUUID();
          console.log('Uploading image...');
          imageUrl = await uploadNoteImage(options.image, options.story, noteId);
          console.log('Image uploaded successfully');
        }

        const shortId = await addStoryNote(options.story, options.text, options.author, imageUrl);

        console.log(`✓ Added note to ${shortId}${imageUrl ? ' (with image)' : ''}`);
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}
