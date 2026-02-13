// Reserve command: Manage file reservations for stories

import { Command } from 'commander';
import { minimatch } from 'minimatch';
import { findStoryByShortId, listStories, COLLECTIONS, addStoryNote, updateStoryStatus } from '../lib/firestore.js';
import { validateRequired } from '../lib/validators.js';
import { getDb } from '../lib/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';
import { findConfig } from '../lib/config.js';

// High-conflict shared files that get special warnings
const HIGH_CONFLICT_FILES = [
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'vite.config.ts',
  'firebase.json',
  'firestore.rules',
  'firestore.indexes.json',
  'src/App.tsx',
  'src/routes.tsx',
  'src/index.tsx',
  'src/main.tsx',
  'src/types/index.ts',
  'cli/src/index.ts',
  'functions/src/index.ts'
];

/**
 * Check if a file path matches a pattern (with glob support)
 */
function fileMatchesPattern(filePath: string, pattern: string): boolean {
  // Normalize paths for comparison (forward slashes)
  const normalizedFile = filePath.replace(/\\/g, '/');
  const normalizedPattern = pattern.replace(/\\/g, '/');

  // Direct match
  if (normalizedFile === normalizedPattern) {
    return true;
  }

  // Glob match using minimatch
  return minimatch(normalizedFile, normalizedPattern);
}

/**
 * Check if any reserved files from two arrays overlap
 */
function findFileOverlaps(files1: string[], files2: string[]): string[] {
  const overlaps: string[] = [];

  for (const file1 of files1) {
    for (const file2 of files2) {
      if (fileMatchesPattern(file1, file2) || fileMatchesPattern(file2, file1)) {
        overlaps.push(file1);
        break;
      }
    }
  }

  return overlaps;
}

/**
 * Check if a file is in the high-conflict list
 */
function isHighConflictFile(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  return HIGH_CONFLICT_FILES.some(hcf =>
    normalized === hcf || minimatch(normalized, hcf)
  );
}

export function createReserveCommand() {
  return new Command('reserve')
    .description('Manage file reservations for stories (supports wildcards like src/components/*)')
    .requiredOption('-s, --story <shortId>', 'Story ID (e.g., JB-14)')
    .option('--files <files>', 'Comma-separated file paths to reserve')
    .option('--check', 'Check for overlaps with other in-progress/in-design stories')
    .option('--clear', 'Clear all file reservations for this story')
    .option('--request', 'Request a file currently reserved by another story')
    .option('--file <file>', 'Single file path (required with --request)')
    .option('--release', 'Release reservations and unblock waiting stories')
    .action(async (options) => {
      try {
        validateRequired(options.story, 'Story ID');

        // Get project ID from config
        const config = findConfig();
        if (!config) {
          throw new Error('No .claude/jeffboard.json found. Run: jeffboard init');
        }

        const db = getDb();

        // Find the story
        const storyDoc = await findStoryByShortId(options.story);
        if (!storyDoc) {
          throw new Error(`Story not found: ${options.story}`);
        }

        const storyRef = storyDoc.ref;
        const storyData = storyDoc.data();

        // Handle --clear flag
        if (options.clear) {
          await storyRef.update({
            reservedFiles: FieldValue.delete(),
            updatedAt: FieldValue.serverTimestamp()
          });
          console.log(`✓ Cleared file reservations for ${options.story}`);
          return;
        }

        // Handle --release flag
        if (options.release) {
          const currentReservedFiles: string[] = storyData?.reservedFiles || [];

          if (currentReservedFiles.length === 0) {
            console.log(`${options.story} has no file reservations to release`);
            return;
          }

          // Find all blocked stories waiting for files from this story
          const allStories = await listStories(config.projectId);
          const blockedStories = allStories.filter((s) =>
            s.status === 'blocked' &&
            s.blockedReason &&
            s.blockedReason.includes(`(held by ${options.story})`)
          );

          console.log(`Releasing ${currentReservedFiles.length} file reservation(s) from ${options.story}...`);

          // Clear the reservations
          await storyRef.update({
            reservedFiles: FieldValue.delete(),
            updatedAt: FieldValue.serverTimestamp()
          });

          // Unblock waiting stories
          for (const blocked of blockedStories) {
            // Extract the file path from blockedReason
            const match = blocked.blockedReason?.match(/Waiting for file: (.+?) \(held by/);
            const requestedFile = match ? match[1] : null;

            if (requestedFile && currentReservedFiles.some(rf => fileMatchesPattern(requestedFile, rf))) {
              // Determine the agent to assign (use current assignedAgent or system)
              const agent = blocked.assignedAgent || 'system';

              // Unblock the story (restore to previous status or in-progress)
              const previousStatus = blocked.previousStatus || 'in-progress';
              await updateStoryStatus(
                blocked.shortId,
                previousStatus,
                agent,
                undefined,
                `File ${requestedFile} released by ${options.story}`
              );

              console.log(`  ✓ Unblocked ${blocked.shortId} (file: ${requestedFile})`);
            }
          }

          console.log(`\n✓ Released file reservations and unblocked ${blockedStories.length} story/stories`);
          return;
        }

        // Handle --request flag
        if (options.request) {
          if (!options.file) {
            throw new Error('--file is required when using --request');
          }

          const requestedFile = options.file.trim();

          // Find which in-progress story holds this file
          const activeStories = await listStories(config.projectId);
          const holdingStory = activeStories.find((s) =>
            s.id !== storyData?.id &&
            (s.status === 'in-progress' || s.status === 'in-design') &&
            s.reservedFiles &&
            s.reservedFiles.some((rf: string) => fileMatchesPattern(requestedFile, rf))
          );

          if (!holdingStory) {
            console.log(`✓ File ${requestedFile} is not reserved by any active story`);
            console.log('You can proceed with your work on this file.');
            return;
          }

          console.log(`File ${requestedFile} is currently reserved by ${holdingStory.shortId}`);
          console.log(`Requesting file and blocking ${options.story}...\n`);

          // Add note to requesting story (this story)
          await addStoryNote(
            options.story,
            `Blocked: Waiting for file ${requestedFile} to be released by ${holdingStory.shortId}`,
            'system'
          );

          // Add note to holding story
          await addStoryNote(
            holdingStory.shortId,
            `File conflict: ${options.story} is waiting for file ${requestedFile}. Please complete or release this file reservation.`,
            'system'
          );

          // Determine the agent to assign the blocked status to
          const agent = storyData?.assignedAgent || 'system';

          // Move requesting story to blocked
          await updateStoryStatus(
            options.story,
            'blocked',
            agent,
            `Waiting for file: ${requestedFile} (held by ${holdingStory.shortId})`
          );

          console.log(`✓ ${options.story} moved to blocked`);
          console.log(`✓ Notes added to both ${options.story} and ${holdingStory.shortId}`);
          console.log(`\nWhen ${holdingStory.shortId} completes, run:`);
          console.log(`  jeffboard reserve -s ${holdingStory.shortId} --release\n`);
          return;
        }

        // Handle --check flag
        if (options.check) {
          const currentReservedFiles: string[] = storyData?.reservedFiles || [];

          if (currentReservedFiles.length === 0) {
            console.log(`\n${options.story} has no file reservations`);
            return;
          }

          console.log(`\n${options.story} has ${currentReservedFiles.length} file reservation(s):`);
          currentReservedFiles.forEach(file => {
            const isHighConflict = isHighConflictFile(file);
            const marker = isHighConflict ? ' [HIGH-CONFLICT]' : '';
            console.log(`  - ${file}${marker}`);
          });

          // Get all in-progress and in-design stories
          const activeStories = await listStories(config.projectId);
          const conflictingStories = activeStories.filter((s) =>
            s.id !== storyData?.id &&
            (s.status === 'in-progress' || s.status === 'in-design') &&
            s.reservedFiles &&
            s.reservedFiles.length > 0
          );

          if (conflictingStories.length === 0) {
            console.log('\n✓ No conflicts found');
            return;
          }

          // Check for overlaps
          let hasConflicts = false;
          console.log('\nChecking for conflicts with active stories:\n');

          for (const other of conflictingStories) {
            const otherFiles = other.reservedFiles || [];
            const overlaps = findFileOverlaps(currentReservedFiles, otherFiles);
            if (overlaps.length > 0) {
              hasConflicts = true;
              console.log(`  ${other.shortId} (${other.status})`);
              overlaps.forEach((file: string) => {
                const isHighConflict = isHighConflictFile(file);
                const marker = isHighConflict ? ' [HIGH-CONFLICT]' : '';
                console.log(`    - ${file}${marker}`);
              });
              console.log('');
            }
          }

          if (!hasConflicts) {
            console.log('  ✓ No conflicts found\n');
          } else {
            console.log('❌ File conflicts detected. Parallel execution may cause merge conflicts.\n');
            process.exit(1);
          }

          return;
        }

        // Handle --files flag (set reservations)
        if (!options.files) {
          throw new Error('Must specify --files, --check, --clear, --request, or --release');
        }

        const filePaths = options.files.split(',').map((f: string) => f.trim()).filter(Boolean);

        if (filePaths.length === 0) {
          throw new Error('No files specified');
        }

        // Check for high-conflict files
        const highConflictFiles = filePaths.filter(isHighConflictFile);
        if (highConflictFiles.length > 0) {
          console.log('\n⚠️  WARNING: High-conflict shared files detected:');
          highConflictFiles.forEach((file: string) => console.log(`  - ${file}`));
          console.log('\nThese files are frequently modified and may cause merge conflicts.\n');
        }

        // Update the story with reserved files
        await storyRef.update({
          reservedFiles: filePaths,
          updatedAt: FieldValue.serverTimestamp()
        });

        console.log(`✓ Reserved ${filePaths.length} file(s) for ${options.story}:`);
        filePaths.forEach((file: string) => console.log(`  - ${file}`));

        // Auto-check for conflicts after setting
        const activeStories = await listStories(config.projectId);
        const conflictingStories = activeStories.filter((s) =>
          s.id !== storyData?.id &&
          (s.status === 'in-progress' || s.status === 'in-design') &&
          s.reservedFiles &&
          s.reservedFiles.length > 0
        );

        if (conflictingStories.length > 0) {
          let hasConflicts = false;
          console.log('\nChecking for conflicts with active stories:\n');

          for (const other of conflictingStories) {
            const otherFiles = other.reservedFiles || [];
            const overlaps = findFileOverlaps(filePaths, otherFiles);
            if (overlaps.length > 0) {
              hasConflicts = true;
              console.log(`  ${other.shortId} (${other.status})`);
              overlaps.forEach((file: string) => {
                const isHighConflict = isHighConflictFile(file);
                const marker = isHighConflict ? ' [HIGH-CONFLICT]' : '';
                console.log(`    - ${file}${marker}`);
              });
              console.log('');
            }
          }

          if (hasConflicts) {
            console.log('⚠️  File conflicts detected. Consider delaying parallel execution.\n');
          }
        }

      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}
