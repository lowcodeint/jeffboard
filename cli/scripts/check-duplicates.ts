#!/usr/bin/env node
/**
 * One-time migration script to detect duplicate story shortIds
 *
 * Usage:
 *   npx tsx scripts/check-duplicates.ts --service-account path/to/service-account.json
 *
 * This script scans all stories in Firestore and reports any duplicate shortIds.
 * It groups duplicates together and shows their creation timestamps and statuses.
 */

import { initializeFirebase, getDb } from '../src/lib/firebase.js';
import { COLLECTIONS } from '../src/lib/firestore.js';

interface StoryData {
  id: string;
  shortId: string;
  title: string;
  status: string;
  projectId: string;
  createdAt: any;
}

async function checkDuplicates() {
  // Parse command line args
  const args = process.argv.slice(2);
  const serviceAccountIndex = args.indexOf('--service-account');

  if (serviceAccountIndex === -1 || !args[serviceAccountIndex + 1]) {
    console.error('Error: --service-account flag is required');
    console.error('Usage: npx tsx scripts/check-duplicates.ts --service-account path/to/service-account.json');
    process.exit(1);
  }

  const serviceAccountPath = args[serviceAccountIndex + 1];

  try {
    // Initialize Firebase Admin
    initializeFirebase(serviceAccountPath);
    console.log('');

    const db = getDb();
    const storiesRef = db.collection(COLLECTIONS.STORIES);

    // Fetch all stories
    console.log('Fetching all stories...');
    const snapshot = await storiesRef.get();
    console.log(`Found ${snapshot.size} total stories\n`);

    // Group by shortId
    const shortIdMap: Map<string, StoryData[]> = new Map();

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const storyData: StoryData = {
        id: doc.id,
        shortId: data.shortId,
        title: data.title,
        status: data.status,
        projectId: data.projectId,
        createdAt: data.createdAt
      };

      const existing = shortIdMap.get(storyData.shortId) || [];
      existing.push(storyData);
      shortIdMap.set(storyData.shortId, existing);
    });

    // Find duplicates
    const duplicates: Array<[string, StoryData[]]> = [];
    shortIdMap.forEach((stories, shortId) => {
      if (stories.length > 1) {
        duplicates.push([shortId, stories]);
      }
    });

    // Report results
    if (duplicates.length === 0) {
      console.log('✓ No duplicate shortIds found!');
      console.log('All story IDs are unique.');
      process.exit(0);
    }

    console.log(`\n⚠️  Found ${duplicates.length} duplicate shortId(s):\n`);
    console.log('═'.repeat(80));

    duplicates.forEach(([shortId, stories]) => {
      console.log(`\nShortId: ${shortId} (${stories.length} stories)`);
      console.log('─'.repeat(80));

      // Sort by creation date
      stories.sort((a, b) => {
        const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return aTime - bTime;
      });

      stories.forEach((story, index) => {
        const createdAt = story.createdAt?.toDate
          ? story.createdAt.toDate().toISOString()
          : 'unknown';

        console.log(`  ${index + 1}. ID: ${story.id}`);
        console.log(`     Title: ${story.title}`);
        console.log(`     Status: ${story.status}`);
        console.log(`     Project: ${story.projectId}`);
        console.log(`     Created: ${createdAt}`);
        console.log();
      });
    });

    console.log('═'.repeat(80));
    console.log(`\nTotal duplicates: ${duplicates.length}`);
    console.log('\nAction Required:');
    console.log('1. Review the duplicate stories above');
    console.log('2. Manually resolve duplicates by updating or deleting incorrect stories');
    console.log('3. Use the CLI to update story status or add notes to clarify which is correct');
    console.log('4. Re-run this script to verify duplicates are resolved\n');

    process.exit(1);
  } catch (error) {
    console.error('Error checking for duplicates:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run the check
checkDuplicates();
