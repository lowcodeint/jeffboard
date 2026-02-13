// Heartbeat command: Update story heartbeat timestamp

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { Command } from 'commander';
import { FieldValue } from 'firebase-admin/firestore';
import { findStoryByShortId } from '../lib/firestore.js';
import { validateRequired } from '../lib/validators.js';
import { getDb } from '../lib/firebase.js';

// Debounce threshold: skip write if called within 30 seconds
const DEBOUNCE_MS = 30 * 1000;

// Directory for tracking heartbeat debounce state
const HEARTBEAT_DIR = join(tmpdir(), 'jeffboard-heartbeats');

interface HeartbeatState {
  [storyId: string]: number; // storyId -> lastHeartbeatTimestamp
}

/**
 * Get the last heartbeat timestamp for a story from local temp file
 * @param storyId Story short ID
 * @returns Last heartbeat timestamp in milliseconds, or 0 if never sent
 */
function getLastHeartbeatTime(storyId: string): number {
  const stateFile = join(HEARTBEAT_DIR, 'state.json');

  if (!existsSync(stateFile)) {
    return 0;
  }

  try {
    const data = readFileSync(stateFile, 'utf-8');
    const state: HeartbeatState = JSON.parse(data);
    return state[storyId] || 0;
  } catch {
    return 0;
  }
}

/**
 * Update the last heartbeat timestamp for a story in local temp file
 * @param storyId Story short ID
 * @param timestamp Heartbeat timestamp in milliseconds
 */
function updateLastHeartbeatTime(storyId: string, timestamp: number): void {
  // Ensure directory exists
  if (!existsSync(HEARTBEAT_DIR)) {
    mkdirSync(HEARTBEAT_DIR, { recursive: true });
  }

  const stateFile = join(HEARTBEAT_DIR, 'state.json');
  let state: HeartbeatState = {};

  if (existsSync(stateFile)) {
    try {
      const data = readFileSync(stateFile, 'utf-8');
      state = JSON.parse(data);
    } catch {
      // Corrupt file, start fresh
      state = {};
    }
  }

  state[storyId] = timestamp;
  writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf-8');
}

export function createHeartbeatCommand() {
  return new Command('heartbeat')
    .description('Update story heartbeat timestamp (debounced to prevent excessive writes)')
    .requiredOption('-s, --story <storyId>', 'Story ID or short ID (e.g., JB-14)')
    .requiredOption('-a, --agent <agent>', 'Agent sending the heartbeat')
    .option('-m, --message <message>', 'Optional heartbeat message')
    .action(async (options) => {
      try {
        validateRequired(options.story, 'Story ID');
        validateRequired(options.agent, 'Agent');

        const now = Date.now();
        const lastHeartbeat = getLastHeartbeatTime(options.story);

        // Debounce: skip if called within 30 seconds
        if (now - lastHeartbeat < DEBOUNCE_MS) {
          const remainingSeconds = Math.ceil((DEBOUNCE_MS - (now - lastHeartbeat)) / 1000);
          console.log(`⏭ Skipped (debounce: ${remainingSeconds}s remaining)`);
          return;
        }

        const db = getDb();

        // Find story by short ID
        const storyDoc = await findStoryByShortId(options.story);
        if (!storyDoc) {
          throw new Error(`Story not found: ${options.story}`);
        }

        const storyRef = storyDoc.ref;

        // Update heartbeat fields
        const updateData: Record<string, unknown> = {
          lastHeartbeat: FieldValue.serverTimestamp(),
          heartbeatAgent: options.agent,
          updatedAt: FieldValue.serverTimestamp()
        };

        if (options.message) {
          updateData.heartbeatMessage = options.message;
        } else {
          // Clear message if not provided (allows removing old messages)
          updateData.heartbeatMessage = null;
        }

        await storyRef.update(updateData);

        // Update local debounce state
        updateLastHeartbeatTime(options.story, now);

        const message = options.message ? ` (${options.message})` : '';
        console.log(`✓ Heartbeat sent for ${options.story}${message}`);
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}
