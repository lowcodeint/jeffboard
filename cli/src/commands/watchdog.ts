// Watchdog command: Detect stale stories in active queues

import { Command } from 'commander';
import { Timestamp } from 'firebase-admin/firestore';
import { getDb } from '../lib/firebase.js';
import { COLLECTIONS, addStoryNote, type StoryDocument } from '../lib/firestore.js';
import { getProjectId } from '../lib/config.js';

const ACTIVE_STATUSES = ['in-design', 'in-progress', 'in-review'];
const DEFAULT_STALE_THRESHOLD_MINUTES = 30;
const SCHEDULER_CONFIG_DOC = 'scheduler';

interface StaleStory {
  shortId: string;
  title: string;
  status: string;
  assignedAgent: string | null;
  minutesSinceActivity: number;
  lastActivitySource: string; // 'heartbeat' | 'note' | 'updatedAt'
}

/**
 * Get the most recent activity timestamp for a story.
 * Checks lastHeartbeat, last note createdAt, and updatedAt.
 * Returns the most recent one along with its source label.
 */
function getLastActivity(story: StoryDocument): { timestamp: Date; source: string } {
  let latest: Date | null = null;
  let source = 'updatedAt';

  // Check updatedAt
  if (story.updatedAt) {
    const d = story.updatedAt.toDate ? story.updatedAt.toDate() : new Date(story.updatedAt);
    if (!latest || d > latest) {
      latest = d;
      source = 'updatedAt';
    }
  }

  // Check lastHeartbeat
  if (story.lastHeartbeat) {
    const d = story.lastHeartbeat.toDate ? story.lastHeartbeat.toDate() : new Date(story.lastHeartbeat);
    if (!latest || d > latest) {
      latest = d;
      source = 'heartbeat';
    }
  }

  // Check last note timestamp
  const notes: any[] = story.notes || [];
  if (notes.length > 0) {
    const lastNote = notes[notes.length - 1];
    if (lastNote?.createdAt) {
      const d = lastNote.createdAt.toDate ? lastNote.createdAt.toDate() : new Date(lastNote.createdAt);
      if (!latest || d > latest) {
        latest = d;
        source = 'note';
      }
    }
  }

  return { timestamp: latest || new Date(0), source };
}

/**
 * Read the staleness threshold from config/scheduler doc.
 * Falls back to DEFAULT_STALE_THRESHOLD_MINUTES if not set.
 */
async function getStaleThresholdMinutes(): Promise<number> {
  try {
    const db = getDb();
    const doc = await db.collection(COLLECTIONS.CONFIG).doc(SCHEDULER_CONFIG_DOC).get();
    if (doc.exists) {
      const data = doc.data();
      if (data?.staleThresholdMinutes && typeof data.staleThresholdMinutes === 'number') {
        return data.staleThresholdMinutes;
      }
    }
  } catch {
    // Fall through to default
  }
  return DEFAULT_STALE_THRESHOLD_MINUTES;
}

export function createWatchdogCommand() {
  return new Command('watchdog')
    .description('Detect stale stories in active queues (in-design, in-progress, in-review)')
    .option('-p, --project <projectId>', 'Project ID (auto-detected from .claude/jeffboard.json)')
    .option('-t, --threshold <minutes>', 'Staleness threshold in minutes (overrides config)', parseInt)
    .option('--flag', 'Add a note to stale stories flagging them')
    .option('--json', 'Output results as JSON')
    .action(async (options) => {
      try {
        const projectId = getProjectId(options.project);
        const db = getDb();

        // Determine threshold
        const configThreshold = await getStaleThresholdMinutes();
        const thresholdMinutes = options.threshold ?? configThreshold;
        const thresholdMs = thresholdMinutes * 60 * 1000;
        const now = Date.now();

        // Query all stories for the project
        const snapshot = await db.collection(COLLECTIONS.STORIES)
          .where('projectId', '==', projectId)
          .get();

        const allStories = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as StoryDocument));

        // Filter to active statuses
        const activeStories = allStories.filter(s => ACTIVE_STATUSES.includes(s.status));

        if (activeStories.length === 0) {
          if (options.json) {
            console.log(JSON.stringify({ stale: [], thresholdMinutes, activeCount: 0 }));
          } else {
            console.log('No active stories found.');
          }
          return;
        }

        // Check each story for staleness
        const staleStories: StaleStory[] = [];

        for (const story of activeStories) {
          const { timestamp, source } = getLastActivity(story);
          const elapsedMs = now - timestamp.getTime();

          if (elapsedMs > thresholdMs) {
            staleStories.push({
              shortId: story.shortId,
              title: story.title,
              status: story.status,
              assignedAgent: story.assignedAgent,
              minutesSinceActivity: Math.round(elapsedMs / 60000),
              lastActivitySource: source
            });
          }
        }

        // Sort by staleness (most stale first)
        staleStories.sort((a, b) => b.minutesSinceActivity - a.minutesSinceActivity);

        // Output results
        if (options.json) {
          console.log(JSON.stringify({
            stale: staleStories,
            thresholdMinutes,
            activeCount: activeStories.length
          }));
        } else {
          console.log(`\nWatchdog Report (threshold: ${thresholdMinutes} min)`);
          console.log(`Active stories: ${activeStories.length}`);
          console.log(`Stale stories:  ${staleStories.length}\n`);

          if (staleStories.length === 0) {
            console.log('All active stories have recent activity. No action needed.');
          } else {
            for (const s of staleStories) {
              const agent = s.assignedAgent || 'unassigned';
              console.log(`  ${s.shortId}  ${s.status.padEnd(12)}  ${agent}`);
              console.log(`    ${s.title}`);
              console.log(`    Last activity: ${s.minutesSinceActivity} min ago (${s.lastActivitySource})`);
              console.log('');
            }
          }
        }

        // Flag stale stories with notes if --flag is set
        if (options.flag && staleStories.length > 0) {
          let flagged = 0;
          for (const s of staleStories) {
            try {
              await addStoryNote(
                s.shortId,
                `[WATCHDOG] This story has been inactive for ${s.minutesSinceActivity} minutes (threshold: ${thresholdMinutes} min). ` +
                `Last activity was from ${s.lastActivitySource}. Agent: ${s.assignedAgent || 'unassigned'}. ` +
                `Please check if the assigned agent has stalled or crashed.`,
                'watchdog'
              );
              flagged++;
            } catch (err) {
              console.error(`  Failed to flag ${s.shortId}:`, err instanceof Error ? err.message : err);
            }
          }

          if (!options.json) {
            console.log(`Flagged ${flagged} stale stories with watchdog notes.`);
          }
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}
