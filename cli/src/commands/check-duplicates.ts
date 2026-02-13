// Check-duplicates command: Detect and report duplicate story IDs

import { Command } from 'commander';
import { getDb } from '../lib/firebase.js';
import { COLLECTIONS } from '../lib/firestore.js';

export function createCheckDuplicatesCommand() {
  return new Command('check-duplicates')
    .description('Detect duplicate story short IDs and optionally fix the counter')
    .option('--fix', 'Fix the counter to the highest existing short ID number per project')
    .action(async (options) => {
      try {
        const db = getDb();

        // Fetch all stories
        const storiesSnapshot = await db.collection(COLLECTIONS.STORIES).get();
        const stories = storiesSnapshot.docs.map((doc) => ({
          docId: doc.id,
          shortId: doc.data().shortId as string,
          title: doc.data().title as string,
          status: doc.data().status as string,
          projectId: doc.data().projectId as string,
          createdAt: doc.data().createdAt
        }));

        // Group by shortId to find duplicates
        const shortIdMap = new Map<string, typeof stories>();
        for (const story of stories) {
          const existing = shortIdMap.get(story.shortId) || [];
          existing.push(story);
          shortIdMap.set(story.shortId, existing);
        }

        // Report duplicates
        const duplicates = [...shortIdMap.entries()].filter(([, group]) => group.length > 1);

        if (duplicates.length === 0) {
          console.log('No duplicate story IDs found.');
        } else {
          console.log(`Found ${duplicates.length} duplicate short ID(s):\n`);
          for (const [shortId, group] of duplicates) {
            console.log(`  ${shortId} (${group.length} stories):`);
            for (const story of group) {
              console.log(`    - [${story.status}] "${story.title}" (doc: ${story.docId})`);
            }
            console.log();
          }
        }

        // Check counter sync
        console.log('--- Counter Sync Check ---\n');
        const counterDoc = await db.collection(COLLECTIONS.COUNTERS).doc('stories').get();
        const counterData = counterDoc.exists ? counterDoc.data() || {} : {};

        // Group stories by project short code prefix
        const projectCodes = new Map<string, number>();
        for (const story of stories) {
          const match = story.shortId.match(/^([A-Z0-9]+)-(\d+)$/);
          if (match) {
            const code = match[1];
            const num = parseInt(match[2], 10);
            const currentMax = projectCodes.get(code) || 0;
            if (num > currentMax) {
              projectCodes.set(code, num);
            }
          }
        }

        let counterIssues = 0;
        for (const [code, maxNum] of projectCodes) {
          const counterValue = (counterData[code] as number) || 0;
          if (counterValue < maxNum) {
            console.log(`  ${code}: counter=${counterValue}, max existing=${maxNum} -- BEHIND by ${maxNum - counterValue}`);
            counterIssues++;
          } else if (counterValue > maxNum) {
            console.log(`  ${code}: counter=${counterValue}, max existing=${maxNum} -- ahead (OK, ${counterValue - maxNum} gap(s))`);
          } else {
            console.log(`  ${code}: counter=${counterValue}, max existing=${maxNum} -- in sync`);
          }
        }

        // Check for counter entries with no stories
        for (const [code, value] of Object.entries(counterData)) {
          if (!projectCodes.has(code)) {
            console.log(`  ${code}: counter=${value}, no stories found -- orphaned counter`);
          }
        }

        if (counterIssues > 0 && options.fix) {
          console.log('\n--- Fixing Counters ---\n');
          const updates: Record<string, number> = {};
          for (const [code, maxNum] of projectCodes) {
            const counterValue = (counterData[code] as number) || 0;
            if (counterValue < maxNum) {
              updates[code] = maxNum;
              console.log(`  ${code}: ${counterValue} -> ${maxNum}`);
            }
          }

          if (Object.keys(updates).length > 0) {
            await db.collection(COLLECTIONS.COUNTERS).doc('stories').set(updates, { merge: true });
            console.log('\nCounters fixed successfully.');
          }
        } else if (counterIssues > 0) {
          console.log(`\n${counterIssues} counter(s) are behind. Run with --fix to correct them.`);
        }

        // Summary
        console.log(`\nTotal stories: ${stories.length}`);
        console.log(`Duplicate short IDs: ${duplicates.length}`);
        console.log(`Counter issues: ${counterIssues}`);
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}
