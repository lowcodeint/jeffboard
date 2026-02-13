// Schedule command: Analyze backlog and determine which stories can be assigned in parallel

import { Command } from 'commander';
import { minimatch } from 'minimatch';
import { listStories, COLLECTIONS } from '../lib/firestore.js';
import { getProjectId } from '../lib/config.js';
import { getDb } from '../lib/firebase.js';

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
 * Priority comparison for sorting
 * P0 = 0 (highest), P1 = 1, P2 = 2, P3 = 3 (lowest)
 */
function priorityValue(priority: string): number {
  if (priority === 'P0') return 0;
  if (priority === 'P1') return 1;
  if (priority === 'P2') return 2;
  if (priority === 'P3') return 3;
  return 99; // Unknown priority goes last
}

export function createScheduleCommand() {
  return new Command('schedule')
    .description('Analyze backlog and determine which stories can be assigned in parallel')
    .option('-p, --project <projectId>', 'Project ID (auto-detected from .claude/jeffboard.json)')
    .option('--check', 'Analyze backlog and return assignable stories')
    .option('--max-parallel <n>', 'Override default max parallel stories (default: 3)', parseInt)
    .action(async (options) => {
      try {
        if (!options.check) {
          console.error('Error: Must specify --check flag to analyze backlog');
          process.exit(1);
        }

        // Get project ID
        const projectId = getProjectId(options.project);

        // Get project settings
        const db = getDb();
        const projectRef = db.collection(COLLECTIONS.PROJECTS).doc(projectId);
        const projectDoc = await projectRef.get();

        if (!projectDoc.exists) {
          throw new Error(`Project not found: ${projectId}`);
        }

        const projectData = projectDoc.data();
        const burstMode = projectData?.burstMode || false;
        const maxParallel = options.maxParallel || projectData?.maxParallelStories || 3;

        console.log(`\nProject: ${projectData?.name || projectId}`);
        console.log(`Burst Mode: ${burstMode ? 'Enabled' : 'Disabled'}`);
        console.log(`Max Parallel Stories: ${maxParallel}\n`);

        // Get all stories
        const allStories = await listStories(projectId);

        // Separate in-progress, in-design, and backlog stories
        const inProgress = allStories.filter(s => s.status === 'in-progress');
        const inDesign = allStories.filter(s => s.status === 'in-design');
        const backlog = allStories.filter(s => s.status === 'backlog');

        // Sort backlog by priority (P0 first, then P1, P2, P3)
        backlog.sort((a, b) => priorityValue(a.priority) - priorityValue(b.priority));

        console.log(`Stories in progress: ${inProgress.length}`);
        console.log(`Stories in design: ${inDesign.length}`);
        console.log(`Stories in backlog: ${backlog.length}\n`);

        if (backlog.length === 0) {
          console.log('✓ No stories in backlog to assign\n');
          return;
        }

        // If burst mode is OFF, only consider the highest priority story
        if (!burstMode) {
          console.log('Serial mode (burst mode disabled):\n');
          const nextStory = backlog[0];
          console.log(`Next story to assign:`);
          console.log(`  ${nextStory.shortId}  ${nextStory.priority}  ${nextStory.title}`);
          console.log('');
          return;
        }

        // Burst mode is ON - check for parallel assignment opportunities
        console.log('Parallel mode (burst mode enabled):\n');

        // Get reserved files from all active stories (in-progress + in-design)
        const activeStories = [...inProgress, ...inDesign];
        const activeReservations = new Map<string, string[]>();

        activeStories.forEach(story => {
          if (story.reservedFiles && story.reservedFiles.length > 0) {
            activeReservations.set(story.shortId, story.reservedFiles);
          }
        });

        console.log(`Active stories with file reservations: ${activeReservations.size}\n`);

        // Analyze each backlog story in priority order
        const assignableStories: any[] = [];
        const queuedStories: { story: any; conflicts: string[] }[] = [];

        for (const story of backlog) {
          const storyFiles = story.reservedFiles || [];

          // If story has no reserved files, it's always assignable
          if (storyFiles.length === 0) {
            console.log(`${story.shortId} (${story.priority}): No file reservations - ASSIGNABLE`);
            assignableStories.push(story);

            // Stop if we've reached max parallel limit
            if (assignableStories.length >= maxParallel) {
              console.log(`\nReached max parallel limit (${maxParallel})\n`);
              break;
            }
            continue;
          }

          // Check for overlaps with active stories
          let hasConflicts = false;
          const conflictingStories: string[] = [];

          for (const [activeShortId, activeFiles] of activeReservations) {
            const overlaps = findFileOverlaps(storyFiles, activeFiles);
            if (overlaps.length > 0) {
              hasConflicts = true;
              conflictingStories.push(`${activeShortId} (${overlaps.join(', ')})`);
            }
          }

          // Also check against already-assigned stories in this batch
          for (const assigned of assignableStories) {
            const assignedFiles = assigned.reservedFiles || [];
            if (assignedFiles.length > 0) {
              const overlaps = findFileOverlaps(storyFiles, assignedFiles);
              if (overlaps.length > 0) {
                hasConflicts = true;
                conflictingStories.push(`${assigned.shortId} (${overlaps.join(', ')})`);
              }
            }
          }

          if (hasConflicts) {
            console.log(`${story.shortId} (${story.priority}): File conflicts detected - QUEUED`);
            conflictingStories.forEach(conflict => {
              console.log(`  - ${conflict}`);
            });
            queuedStories.push({ story, conflicts: conflictingStories });
          } else {
            console.log(`${story.shortId} (${story.priority}): No conflicts - ASSIGNABLE`);
            assignableStories.push(story);

            // Add this story's reservations to the active set for subsequent checks
            if (storyFiles.length > 0) {
              activeReservations.set(story.shortId, storyFiles);
            }

            // Stop if we've reached max parallel limit
            if (assignableStories.length >= maxParallel) {
              console.log(`\nReached max parallel limit (${maxParallel})\n`);
              break;
            }
          }
        }

        // Summary
        console.log('\n=== SCHEDULING SUMMARY ===\n');

        if (assignableStories.length > 0) {
          console.log(`${assignableStories.length} story(ies) ready to assign:\n`);
          assignableStories.forEach(story => {
            const files = story.reservedFiles || [];
            const filesInfo = files.length > 0 ? ` (${files.length} files)` : ' (no reservations)';
            console.log(`  ${story.shortId}  ${story.priority}  ${story.title}${filesInfo}`);
          });
          console.log('');
        } else {
          console.log('No stories can be assigned (all have conflicts or max parallel reached)\n');
        }

        if (queuedStories.length > 0) {
          console.log(`${queuedStories.length} story(ies) queued due to conflicts:\n`);
          queuedStories.forEach(({ story, conflicts }) => {
            console.log(`  ${story.shortId}  ${story.priority}  ${story.title}`);
            console.log(`    Conflicts with: ${conflicts.join(', ')}`);
          });
          console.log('');
        }

      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}
