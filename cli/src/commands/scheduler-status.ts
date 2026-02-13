// Scheduler status command: Write/read scheduler status to/from Firestore

import { Command } from 'commander';
import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from '../lib/firebase.js';
import { COLLECTIONS } from '../lib/firestore.js';

const SCHEDULER_CONFIG_DOC = 'scheduler';

interface RunningSessionData {
  storyShortId: string;
  agentType: string;
  startedAt: string;
}

export function createSchedulerStatusCommand() {
  const cmd = new Command('scheduler-status')
    .description('Read or write scheduler status to Firestore');

  cmd
    .command('write')
    .description('Write current scheduler status')
    .requiredOption('--running <count>', 'Number of running sessions', parseInt)
    .requiredOption('--max <count>', 'Max concurrent sessions', parseInt)
    .requiredOption('--slots <count>', 'Available slots', parseInt)
    .option('--sessions <json>', 'JSON array of running session info')
    .action(async (options) => {
      try {
        const db = getDb();
        const docRef = db.collection(COLLECTIONS.CONFIG).doc(SCHEDULER_CONFIG_DOC);

        const data: Record<string, unknown> = {
          runningCount: options.running,
          maxConcurrentSessions: options.max,
          slotsAvailable: options.slots,
          lastUpdated: FieldValue.serverTimestamp(),
        };

        if (options.sessions) {
          try {
            data.runningSessions = JSON.parse(options.sessions) as RunningSessionData[];
          } catch {
            console.error('Warning: Invalid sessions JSON, skipping');
          }
        }

        await docRef.set(data, { merge: true });
        console.log('Scheduler status updated');
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  cmd
    .command('read')
    .description('Read current scheduler config from Firestore')
    .action(async () => {
      try {
        const db = getDb();
        const docRef = db.collection(COLLECTIONS.CONFIG).doc(SCHEDULER_CONFIG_DOC);
        const doc = await docRef.get();

        if (!doc.exists) {
          // Return defaults as JSON
          console.log(JSON.stringify({ maxConcurrentSessions: 3 }));
          return;
        }

        const data = doc.data();
        console.log(JSON.stringify({
          maxConcurrentSessions: data?.maxConcurrentSessions ?? 3,
        }));
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  return cmd;
}
